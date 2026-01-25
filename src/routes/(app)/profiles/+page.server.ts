import { pb } from '$lib/pocketbase';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getContactsByCompany } from '$lib/utils/contacts';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user) {
        throw redirect(303, '/login');
    }

    const profiles = await getContactsByCompany(user.company);

    return {
        profiles
    };
};

export const actions: Actions = {
    deleteProfile: async ({ request, locals }) => {
        const user = locals.user;
        if (!user?.company) {
            return fail(401, { error: 'Unauthorized' });
        }

        try {
            const data = await request.formData();
            const profileId = data.get('profileId')?.toString();

            if (!profileId) {
                return fail(400, { error: 'Profile ID is required' });
            }

            await pb.collection('contacts').delete(profileId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting profile:', error);
            return fail(500, { error: 'Failed to delete profile' });
        }
    }
};
