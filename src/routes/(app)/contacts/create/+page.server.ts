import { pb } from '$lib/pocketbase';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Get phone number from URL params if provided
	const phone = url.searchParams.get('phone') || '';

	return {
		phone
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user?.company) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const name = data.get('name')?.toString() || '';
		const email = data.get('email')?.toString() || '';
		const phone = data.get('phone')?.toString() || '';

		if (!name && !email && !phone) {
			return fail(400, { error: 'At least one field (name, email, or phone) is required' });
		}

		try {
			const contactData = {
				company: user.company,
				name: name || 'Anonymous',
				email: email || '',
				phone: phone || ''
			};

			await pb.collection('contacts').create(contactData);
		} catch (error) {
			console.error('Error creating contact:', error);
			return fail(500, { error: 'Failed to create contact' });
		}

		throw redirect(303, '/contacts');
	}
};
