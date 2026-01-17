import { pb } from '$lib/pocketbase';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getContactsByCompany } from '$lib/utils/contacts';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user) {
        throw redirect(303, '/login');
    }

    const contacts = await getContactsByCompany(user.company);

    return {
        contacts
    };
};

export const actions: Actions = {
    deleteContact: async ({ request, locals }) => {
        const user = locals.user;
        if (!user?.company) {
            return fail(401, { error: 'Unauthorized' });
        }

        try {
            const data = await request.formData();
            const contactId = data.get('contactId')?.toString();

            if (!contactId) {
                return fail(400, { error: 'Contact ID is required' });
            }

            await pb.collection('contacts').delete(contactId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting contact:', error);
            return fail(500, { error: 'Failed to delete contact' });
        }
    }
}; 