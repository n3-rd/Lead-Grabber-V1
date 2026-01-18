import { pb } from '$lib/pocketbase';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    try {
        const userId = params.id;

        // Get user details
        const user = await pb.collection('users').getOne(userId);

        // Verify user is in the same company
        if (user.company !== locals.user.company) {
            throw error(403, 'Access denied');
        }

        // Get company member info
        const member = await pb.collection('company_members').getFirstListItem(
            `user = "${userId}" && company = "${locals.user.company}" && status = "active"`
        ).catch(() => null);

        // Get messages assigned to this user
        const assignedMessages = await pb.collection('messages').getList(1, 50, {
            filter: `assigned_to = "${userId}" && company_id = "${locals.user.company}"`,
            sort: '-updated'
        });

        // Get communication logs assigned to this user
        // Note: assigned_members is a relation array, so we need to check if userId is in the array
        // PocketBase doesn't have a direct "contains" filter for relations, so we'll fetch and filter
        const allLogs = await pb.collection('communication_logs').getList(1, 200, {
            filter: `company_id = "${locals.user.company}"`,
            sort: '-created',
            expand: 'assigned_members'
        });
        
        const assignedLogs = allLogs.items.filter(log => {
            const assignedMembers = log.assigned_members || [];
            return Array.isArray(assignedMembers) 
                ? assignedMembers.includes(userId)
                : assignedMembers === userId;
        });

        return {
            user: {
                id: user.id,
                name: user.name || user.email || 'Unknown',
                email: user.email || '',
                avatar: user.avatar || null,
                created: user.created
            },
            member: member ? {
                id: member.id,
                role: member.role,
                joined_at: member.joined_at
            } : null,
            assignedMessages: assignedMessages.items,
            assignedLogs: assignedLogs
        };
    } catch (err: any) {
        if (err.status === 403 || err.status === 404) {
            throw error(err.status, err.message || 'User not found');
        }
        console.error('Error loading user profile:', err);
        throw error(500, 'Failed to load user profile');
    }
};
