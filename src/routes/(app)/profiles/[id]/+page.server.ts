import { prisma } from '$lib/db';
import { redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	if (!user.company) {
		throw redirect(303, '/create-company');
	}

	const companyId = user.company.id;

	try {
		const profile = await prisma.contact.findFirst({
			where: { id: params.id, companyId }
		});

		if (!profile) {
			throw error(404, 'Profile not found');
		}

		const profilePhoneDigits = profile.phone ? profile.phone.replace(/\D/g, '') : '';

		// Fetch communications by customerId first
		let communications = await prisma.communicationLog.findMany({
			where: {
				customerId: params.id,
				companyId
			},
			orderBy: { created: 'desc' },
			take: 200,
			include: { customer: true }
		});

		// If no communications by customerId and we have a phone, fetch all and filter by phone
		if (communications.length === 0 && profilePhoneDigits) {
			const allComms = await prisma.communicationLog.findMany({
				where: { companyId },
				orderBy: { created: 'desc' },
				take: 500,
				include: { customer: true }
			});

			const profileLast10 = profilePhoneDigits.slice(-10);
			const profileLast7 = profilePhoneDigits.slice(-7);

			communications = allComms.filter((log) => {
				const source = log.source ?? '';
				const dest = log.destination ?? '';
				if (!source && !dest) return false;

				const sourceDigits = source.replace(/\D/g, '');
				const destDigits = dest.replace(/\D/g, '');
				if (!sourceDigits && !destDigits) return false;

				const sourceLast10 = sourceDigits.slice(-10);
				const destLast10 = destDigits.slice(-10);
				const sourceLast7 = sourceDigits.slice(-7);
				const destLast7 = destDigits.slice(-7);

				const exactMatch = sourceDigits === profilePhoneDigits || destDigits === profilePhoneDigits;
				const last10Match =
					(sourceLast10 && sourceLast10 === profileLast10) ||
					(destLast10 && destLast10 === profileLast10);
				const last7Match =
					profileLast7.length >= 7 &&
					((sourceLast7 && sourceLast7 === profileLast7) ||
						(destLast7 && destLast7 === profileLast7));

				return exactMatch || last10Match || last7Match;
			});
		}

		const metadata = (val: unknown): Record<string, unknown> | null =>
			val && typeof val === 'object' && !Array.isArray(val)
				? (val as Record<string, unknown>)
				: null;

		const comms = communications.map((log) => {
			const dateObj = new Date(log.created);
			const date = dateObj.toLocaleDateString('en-US', {
				month: 'short',
				day: '2-digit',
				year: 'numeric'
			});
			const time = dateObj.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});

			let status: 'red' | 'green' | 'blue' = 'blue';
			if (log.status === 'success' || log.status === 'completed') {
				status = log.direction === 'inbound' ? 'green' : 'blue';
			} else if (log.status === 'failed' || log.status === 'missed') {
				status = 'red';
			}

			const meta = metadata(log.metadata);
			const purpose = meta?.urgency ?? meta?.purpose ?? null;

			return {
				id: log.id,
				date,
				time,
				type: log.type as 'email' | 'sms' | 'voice' | 'web' | 'facebook' | 'chatbot' | 'leadform',
				direction: (log.direction === 'inbound' ? 'In' : 'Out') as 'In' | 'Out',
				source: log.source ?? 'Unknown',
				endpoint: log.destination ?? log.customer?.name ?? 'Unknown',
				purpose: purpose != null ? String(purpose) : null,
				summary: log.summary ?? (log.content ? log.content.substring(0, 50) : null),
				commId: log.id,
				status
			};
		});

		return {
			profile: {
				...profile,
				past_names: Array.isArray(profile.pastNames) ? profile.pastNames : []
			},
			communications: comms
		};
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) {
			throw e;
		}
		console.error('Error fetching profile:', e);
		throw error(500, 'Failed to fetch profile');
	}
};

export const actions: Actions = {
	updateProfile: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user?.company) return { success: false };
		const form = await request.formData();
		const id = params.id;
		const name = form.get('name')?.toString() ?? null;
		const email = form.get('email')?.toString() ?? null;
		const phone = form.get('phone')?.toString() ?? null;
		try {
			await prisma.contact.updateMany({
				where: { id, companyId: user.company.id },
				data: { name, email, phone, updated: new Date() }
			});
			return { success: true };
		} catch (e) {
			console.error('Error updating profile:', e);
			return { success: false };
		}
	},
	deleteProfile: async ({ params, locals }) => {
		const user = locals.user;
		if (!user?.company) return { success: false };
		try {
			await prisma.contact.deleteMany({
				where: { id: params.id, companyId: user.company.id }
			});
			return { success: true };
		} catch (e) {
			console.error('Error deleting profile:', e);
			return { success: false };
		}
	}
};
