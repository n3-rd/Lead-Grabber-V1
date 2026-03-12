import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 });
	}

	const user = locals.user;
	let role: string | null = (user.role as string | null) ?? null;

	if (user.company?.id) {
		const membership = await locals.prisma.companyMember.findUnique({
			where: {
				userId_companyId: {
					userId: user.id,
					companyId: user.company.id
				}
			},
			select: { role: true }
		});
		role = (membership?.role as string | undefined) ?? role;
	}

	return json({
		success: true,
		data: {
			id: user.id,
			name: user.name ?? null,
			email: user.email,
			phone: null as string | null,
			company: user.company
				? {
						id: user.company.id,
						name: user.company.name ?? null
					}
				: null,
			role
		}
	});
};
