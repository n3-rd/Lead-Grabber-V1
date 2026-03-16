import { prisma } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ cookies, locals }) => {
	const user = await getSessionUser(cookies, locals);
	if (!user) {
		return new Response(
			JSON.stringify({ success: false, message: 'Not authenticated.' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		// Delete user and cascade related data
		await prisma.user.delete({ where: { id: user.id } });
		// Optionally: delete related contacts, logs, etc. (if not cascaded)
		cookies.delete('app_session');
		return new Response(
			JSON.stringify({ success: true, message: 'Account deleted successfully.' }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('Account deletion error:', err);
		return new Response(
			JSON.stringify({ success: false, message: 'Account deletion failed.' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
