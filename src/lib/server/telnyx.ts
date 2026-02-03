import { TELNYX_API_KEY, TELNYX_CONNECTION_ID } from '$env/static/private';
import { prisma } from '$lib/db';

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

/** App (messaging profile) ID to assign company numbers to */
export const TELNYX_APP_ID = '2857574914418804336';

const TELNYX_HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TELNYX_API_KEY}`
};

/** Id in URL: UUID as-is, E.164 encode the + */
function phoneIdToPath(id: string): string {
    return id.startsWith('+') ? encodeURIComponent(id) : id;
}

/** PATCH phone number voice settings to assign to our Voice API connection. Id can be UUID or E.164. */
async function assignNumberVoice(phoneId: string): Promise<boolean> {
    const res = await fetch(`${TELNYX_API_BASE}/phone_numbers/${phoneIdToPath(phoneId)}/voice`, {
        method: 'PATCH',
        headers: TELNYX_HEADERS,
        body: JSON.stringify({ connection_id: String(TELNYX_CONNECTION_ID) })
    });
    if (!res.ok) {
        const errorBody = await res.json();
        console.error('assignNumberVoice failed:', res.status, phoneId, errorBody);
    }
    return res.ok;
}

/** Assign a Telnyx number to our voice connection (for use after buy). Voice only; messaging not used. */
export async function assignNumberToApp(telnyxPhoneNumberId: string): Promise<void> {
    await assignNumberVoice(telnyxPhoneNumberId);
}

interface TelnyxError {
    errors?: Array<{
        code?: string;
        title?: string;
        detail?: string;
        source?: {
            pointer?: string;
        };
    }>;
}

interface BillingGroup {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    record_type: string;
}

interface PhoneNumberOrder {
    id: string;
    status: string;
    phone_numbers?: Array<{
        id: string;
        phone_number: string;
        status: string;
    }>;
    created_at: string;
    updated_at: string;
}

interface BulkNumberOrder {
    id: string;
    status: string;
    ordering_groups: Array<{
        country_iso: string;
        phone_number_type: string;
        count_requested: number;
        count_fulfilled?: number;
    }>;
    created_at: string;
    updated_at: string;
}

/**
 * Generate unique billing group name using company name and ID
 */
export function generateBillingGroupName(companyName: string, companyId: string): string {
    // Sanitize company name (remove special chars, limit length)
    const sanitizedName = companyName
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim()
        .substring(0, 50);

    return `${sanitizedName}-${companyId}`;
}

/**
 * Make authenticated request to Telnyx API
 */
async function telnyxRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ data: T }> {
    const url = `${TELNYX_API_BASE}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${TELNYX_API_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        const error = data as TelnyxError;
        const errorMessage = error.errors?.[0]?.detail ||
            error.errors?.[0]?.title ||
            'Unknown Telnyx API error';
        throw new Error(`Telnyx API Error: ${errorMessage}`);
    }

    return data;
}

/**
 * List all billing groups
 */
export async function listBillingGroups(): Promise<BillingGroup[]> {
    const response = await telnyxRequest<BillingGroup[]>('/billing_groups', {
        method: 'GET'
    });
    return response.data;
}

/**
 * Find billing group by name
 */
export async function findBillingGroupByName(name: string): Promise<BillingGroup | null> {
    const billingGroups = await listBillingGroups();
    return billingGroups.find(bg => bg.name === name) || null;
}

/**
 * Create a new billing group for a company
 * Returns the billing group ID
 */
export async function createBillingGroup(
    companyName: string,
    companyId: string
): Promise<BillingGroup> {
    const billingGroupName = generateBillingGroupName(companyName, companyId);

    // Check if billing group already exists
    const existing = await findBillingGroupByName(billingGroupName);
    if (existing) {
        console.log(`Billing group already exists: ${billingGroupName}`);
        return existing;
    }

    console.log(`Creating billing group: ${billingGroupName}`);

    const response = await telnyxRequest<BillingGroup>('/billing_groups', {
        method: 'POST',
        body: JSON.stringify({
            name: billingGroupName
        })
    });

    console.log(`✓ Billing group created: ${response.data.id}`);
    return response.data;
}

/**
 * Get or create billing group for a company
 * This ensures the billing group exists before proceeding
 */
export async function ensureBillingGroup(
    companyName: string,
    companyId: string
): Promise<BillingGroup> {
    const billingGroupName = generateBillingGroupName(companyName, companyId);

    // Try to find existing billing group first
    const existing = await findBillingGroupByName(billingGroupName);
    if (existing) {
        console.log(`Using existing billing group: ${billingGroupName} (${existing.id})`);
        return existing;
    }

    // Create new billing group if it doesn't exist
    return await createBillingGroup(companyName, companyId);
}

/**
 * Order specific phone numbers and associate with billing group
 * IMPORTANT: Ensures billing group exists before ordering
 */
export async function orderPhoneNumbers(
    phoneNumbers: string[],
    companyName: string,
    companyId: string
): Promise<PhoneNumberOrder> {
    // STEP 1: Ensure billing group exists
    const billingGroup = await ensureBillingGroup(companyName, companyId);

    if (!billingGroup || !billingGroup.id) {
        throw new Error('Failed to create or retrieve billing group. Cannot proceed with order.');
    }

    // STEP 2: Order numbers with billing group
    console.log(`Ordering ${phoneNumbers.length} phone number(s) for billing group ${billingGroup.id}`);

    const response = await telnyxRequest<PhoneNumberOrder>('/number_orders', {
        method: 'POST',
        body: JSON.stringify({
            phone_numbers: phoneNumbers.map(number => ({
                phone_number: number,
                billing_group_id: billingGroup.id
            }))
        })
    });

    console.log(`✓ Number order created: ${response.data.id} (status: ${response.data.status})`);
    return response.data;
}

/**
 * Bulk order phone numbers (US/CA only)
 * Telnyx auto-selects available numbers
 * IMPORTANT: Ensures billing group exists before ordering
 */
export async function bulkOrderPhoneNumbers(
    orderingGroups: Array<{
        country_iso: string;
        phone_number_type: 'local' | 'toll_free' | 'national' | 'mobile';
        count_requested: number;
        area_code?: string;
        state?: string;
    }>,
    companyName: string,
    companyId: string
): Promise<BulkNumberOrder> {
    // STEP 1: Ensure billing group exists
    const billingGroup = await ensureBillingGroup(companyName, companyId);

    if (!billingGroup || !billingGroup.id) {
        throw new Error('Failed to create or retrieve billing group. Cannot proceed with bulk order.');
    }

    // STEP 2: Bulk order numbers with billing group
    const totalRequested = orderingGroups.reduce((sum, group) => sum + group.count_requested, 0);
    console.log(`Bulk ordering ${totalRequested} phone number(s) for billing group ${billingGroup.id}`);

    const response = await telnyxRequest<BulkNumberOrder>('/inexplicit_number_orders', {
        method: 'POST',
        body: JSON.stringify({
            ordering_groups: orderingGroups.map(group => ({
                ...group,
                billing_group_id: billingGroup.id
            }))
        })
    });

    console.log(`✓ Bulk order created: ${response.data.id} (status: ${response.data.status})`);
    return response.data;
}

/**
 * Get number order status
 */
export async function getNumberOrderStatus(orderId: string): Promise<PhoneNumberOrder> {
    const response = await telnyxRequest<PhoneNumberOrder>(`/number_orders/${orderId}`, {
        method: 'GET'
    });
    return response.data;
}

/**
 * List phone numbers in a billing group
 */
export async function listPhoneNumbersByBillingGroup(
    billingGroupId: string
): Promise<Array<{ id: string; phone_number: string; status: string }>> {
    const response = await telnyxRequest<Array<{ id: string; phone_number: string; status: string }>>(
        `/phone_numbers?filter[billing_group_id]=${billingGroupId}`,
        { method: 'GET' }
    );
    return response.data;
}

/**
 * Complete workflow: Setup company phone numbers
 * 1. Creates/retrieves billing group
 * 2. Bulk orders phone numbers
 * 3. Returns billing group and order details
 */
export async function setupCompanyPhoneNumbers(
    companyName: string,
    companyId: string,
    phoneCount: number,
    options: {
        country_iso?: string;
        phone_number_type?: 'local' | 'toll_free' | 'national' | 'mobile';
        area_code?: string;
        state?: string;
    } = {}
): Promise<{
    billingGroup: BillingGroup;
    order: BulkNumberOrder;
}> {
    const {
        country_iso = 'US',
        phone_number_type = 'local',
        area_code,
        state
    } = options;

    // Step 1: Ensure billing group exists
    console.log(`Setting up ${phoneCount} phone numbers for ${companyName} (${companyId})`);
    const billingGroup = await ensureBillingGroup(companyName, companyId);

    // Step 2: Bulk order phone numbers
    const orderingGroups = [{
        country_iso,
        phone_number_type,
        count_requested: phoneCount,
        ...(area_code && { area_code }),
        ...(state && { state })
    }];

    const order = await bulkOrderPhoneNumbers(orderingGroups, companyName, companyId);

    console.log(`✓ Setup complete for ${companyName}`);
    console.log(`  Billing Group: ${billingGroup.id}`);
    console.log(`  Order ID: ${order.id}`);
    console.log(`  Status: ${order.status}`);

    return {
        billingGroup,
        order
    };
}

/**
 * Ensure all company numbers in our DB are assigned to the voice app (connection).
 * Voice only: PATCH /phone_numbers/{id}/voice with connection_id. Only touches company numbers in DB.
 */
export async function ensureCompanyNumbersAssignedToApp(): Promise<{ assigned: number; skipped: number; failed: number }> {
    const companyNumbers = await prisma.companyPhoneNumber.findMany({
        where: { telnyxPhoneNumberId: { not: null } },
        select: { phoneNumber: true, telnyxPhoneNumberId: true }
    });

    let assigned = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of companyNumbers) {
        const telnyxId = row.telnyxPhoneNumberId!;
        const e164 = row.phoneNumber;
        try {
            // Voice only: PATCH /phone_numbers/{id}/voice. Id can be UUID or E.164; try UUID then E.164 on 404
            let ok = await assignNumberVoice(telnyxId);
            if (!ok && e164) {
                ok = await assignNumberVoice(e164);
            }
            if (ok) {
                assigned++;
            } else {
                console.error(`Failed to assign voice for ${e164}`);
                failed++;
            }
        } catch (e) {
            console.error(`Error ensuring voice for ${e164}:`, e);
            failed++;
        }
    }

    if (assigned > 0 || failed > 0) {
        console.log(`ensureCompanyNumbersAssignedToApp: assigned=${assigned} skipped=${skipped} failed=${failed}`);
    }
    return { assigned, skipped, failed };
}
