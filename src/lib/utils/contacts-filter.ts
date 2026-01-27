/**
 * Pure client-safe filter for contacts by search query (name, phone).
 * Use this in browser code. For server/Prisma-backed utils see $lib/utils/contacts.
 */
export function filterContacts(contacts: Array<{ name?: string | null; phone?: string | null }>, query: string) {
  if (!query) return contacts
  const lowerQuery = query.toLowerCase()
  return contacts.filter(
    (c) => c.name?.toLowerCase().includes(lowerQuery) || (c.phone ?? '').toString().includes(query)
  )
}
