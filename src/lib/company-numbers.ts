import type { PrismaClient } from '@prisma/client';
import { normalizePhoneNumber } from '$lib/utils/phone';

/** Normalize to E.164 for DB lookup (digits with + prefix). */
export function toE164(phone: string): string {
	const n = normalizePhoneNumber(phone);
	if (!n) return '';
	// Ensure + prefix
	return n.startsWith('+') ? n : `+${n}`;
}

/** Get company id that owns this number (for incoming call/SMS). */
export async function getCompanyIdByPhoneNumber(
	prisma: PrismaClient,
	phoneNumber: string
): Promise<string | null> {
	const e164 = toE164(phoneNumber);
	if (!e164) return null;
	const row = await prisma.companyPhoneNumber.findUnique({
		where: { phoneNumber: e164 },
		select: { companyId: true }
	});
	return row?.companyId ?? null;
}

/** Get first number assigned to company (for outbound dial/SMS). */
export async function getFirstCompanyNumber(
	prisma: PrismaClient,
	companyId: string
): Promise<{ phoneNumber: string; id: string } | null> {
	const row = await prisma.companyPhoneNumber.findFirst({
		where: { companyId },
		select: { phoneNumber: true, id: true }
	});
	return row ?? null;
}
