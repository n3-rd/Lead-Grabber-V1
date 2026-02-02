import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/db';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user?.company?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const id = params.id;
	if (!id) {
		return json({ error: 'Missing id' }, { status: 400 });
	}
	try {
		await prisma.companyPhoneNumber.deleteMany({
			where: { id, companyId: locals.user.company.id }
		});
		return json({ success: true });
	} catch (e) {
		console.error('Company numbers unassign:', e);
		return json({ success: false, error: 'Failed to unassign number' }, { status: 500 });
	}
};
