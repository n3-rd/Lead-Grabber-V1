import { pb } from '$lib/pocketbase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
    depends('app:communication-log');

    if (!locals.user) {
        return { logs: [] };
    }

    try {
        const logs = await pb.collection('communication_logs').getList(1, 50, {
            sort: '-created',
            expand: 'user_id,customer_id',
            filter: `company_id = "${locals.user.company}"`
        });

        return {
            logs: logs.items.map(log => {
                // Safe access to expanded relations
                const user = log.expand?.user_id;
                const customer = log.expand?.customer_id;

                return {
                    ...log,
                    expand: { user, customer }
                };
            })
        };
    } catch (err) {
        console.error('Error loading communication logs:', err);
        return { logs: [] };
    }
};
