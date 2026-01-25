import { pb } from '$lib/pocketbase';
import { normalizePhoneNumber } from '$lib/utils/phone';

interface ContactData {
  company_id: string;
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Fetches contacts for a company
 * @param companyId - The company ID to fetch contacts for
 * @param limit - Maximum number of contacts to fetch (default: 50)
 * @returns Array of contacts
 */
export async function getContactsByCompany(companyId: string, limit: number = 50) {
  try {
    const contacts = await pb.collection('contacts').getList(1, limit, {
      filter: `company = "${companyId}"`,
      sort: '-updated'
    });
    return contacts.items;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
}

/**
 * Filters contacts by search query (searches name and phone)
 * @param contacts - Array of contacts to filter
 * @param query - Search query string
 * @returns Filtered array of contacts
 */
export function filterContacts(contacts: Array<any>, query: string): typeof contacts {
  if (!query) return contacts;
  const lowerQuery = query.toLowerCase();
  return contacts.filter(
    (c: any) =>
      c.name?.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query)
  );
}

export async function createOrUpdateContact(data: ContactData) {
  if (!data.name && !data.email && !data.phone) {
    return null;
  }

  try {
    const now = new Date().toISOString().split('.')[0] + "Z";
    let contact = null;

    // Normalize phone number if provided
    const normalizedPhone = data.phone ? normalizePhoneNumber(data.phone) : null;

    // Priority 1: Match by phone number (normalized) - this is the most reliable identifier
    if (normalizedPhone) {
      try {
        // Fetch all contacts for this company that have phone numbers
        const allContacts = await pb.collection('contacts').getFullList({
          filter: `company = "${data.company_id}" && phone != ""`,
        });

        // Find contact with matching normalized phone number
        for (const c of allContacts) {
          if (c.phone) {
            const existingNormalized = normalizePhoneNumber(c.phone);
            if (existingNormalized === normalizedPhone) {
              contact = c;
              break;
            }
          }
        }
      } catch (err) {
        // No contacts found or error - continue
      }
    }

    // Priority 2: Match by email (if no phone match found)
    if (!contact && data.email) {
      try {
        contact = await pb.collection('contacts').getFirstListItem(
          `email="${data.email}" && company="${data.company_id}"`
        );
      } catch (err) {
        // Contact not found
      }
    }

    // Update existing or create new contact
    if (contact) {
      // Merge into existing contact - keep original name, add new name to past_names
      const updates: any = {
        updated: now
      };
      
      // Handle name merging: keep original name, add new name to past_names if different
      if (data.name && data.name !== contact.name && data.name !== 'Anonymous') {
        // Only add to past_names if the existing contact has a name and it's different
        if (contact.name && contact.name !== 'Anonymous' && contact.name !== data.name) {
          // Get existing past_names array or initialize empty array
          let pastNames: string[] = [];
          if (contact.past_names) {
            try {
              pastNames = Array.isArray(contact.past_names) 
                ? contact.past_names 
                : typeof contact.past_names === 'string' 
                  ? JSON.parse(contact.past_names) 
                  : [];
            } catch (e) {
              pastNames = [];
            }
          }
          
          // Add new name to past_names if it's not already there and not the current name
          if (!pastNames.includes(data.name) && data.name !== contact.name) {
            pastNames.push(data.name);
            updates.past_names = pastNames;
          }
        } else if ((!contact.name || contact.name === 'Anonymous') && data.name) {
          // If existing contact has no name or is Anonymous, update the name
          updates.name = data.name;
        }
        // Otherwise, keep the original name (don't update)
      }
      
      // Update email if provided and different
      if (data.email && data.email !== contact.email) {
        updates.email = data.email;
      }
      
      // Update phone if normalized version is different
      if (normalizedPhone && contact.phone) {
        const existingNormalized = normalizePhoneNumber(contact.phone);
        if (existingNormalized !== normalizedPhone) {
          // Keep the more complete format (with + if available)
          updates.phone = normalizedPhone.startsWith('+') ? normalizedPhone : contact.phone;
        }
      } else if (normalizedPhone && !contact.phone) {
        updates.phone = normalizedPhone;
      }

      if (Object.keys(updates).length > 1) { // More than just 'updated'
        return await pb.collection('contacts').update(contact.id, updates);
      }
      return contact;
    } else {
      // Create new contact
      const contactData = {
        company: data.company_id,
        name: data.name || 'Anonymous',
        email: data.email || '',
        phone: normalizedPhone || data.phone || '',
        created: now,
        updated: now
      };

      console.log('Creating new contact:', contactData);
      return await pb.collection('contacts').create(contactData);
    }
  } catch (err) {
    console.error('Error in createOrUpdateContact:', err);
    throw err;
  }
} 