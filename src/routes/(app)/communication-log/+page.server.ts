import { pb } from '$lib/pocketbase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
    depends('app:communication-log');

    if (!locals.user) {
        return { logs: [], members: [] };
    }

    try {
        const logs = await pb.collection('communication_logs').getList(1, 50, {
            sort: '-created',
            expand: 'user_id,customer_id,assigned_members',
            filter: `company_id = "${locals.user.company}"`
        });

        // Load company members for assignment
        const members = await pb.collection('company_members').getList(1, 50, {
            filter: `company = "${locals.user.company}" && status = "active"`,
            expand: 'user',
            sort: '-created'
        });

        return {
            logs: logs.items.map(log => {
                // Safe access to expanded relations
                const user = log.expand?.user_id;
                const customer = log.expand?.customer_id;
                // assigned_members can be an array (multi-relation)
                const assignedMembers = Array.isArray(log.expand?.assigned_members) 
                    ? log.expand.assigned_members 
                    : (log.expand?.assigned_members ? [log.expand.assigned_members] : []);

                return {
                    ...log,
                    expand: { 
                        user, 
                        customer,
                        assigned_members: assignedMembers
                    }
                };
            }),
            members: members.items.map(member => ({
                id: member.user,
                name: member.expand?.user?.name || member.expand?.user?.email || 'Unknown',
                email: member.expand?.user?.email || '',
                role: member.role
            }))
        };
    } catch (err) {
        console.error('Error loading communication logs:', err);
        return { logs: [], members: [] };
    }
};
