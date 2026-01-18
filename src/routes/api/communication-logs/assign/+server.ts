import { pb } from '$lib/pocketbase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        const { logIds, endpoint, memberIds } = data;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return json({ success: false, error: 'Member IDs are required' }, { status: 400 });
        }

        // Verify all members belong to the user's company
        const memberFilter = memberIds.map((id: string) => `user = "${id}"`).join(' || ');
        const members = await pb.collection('company_members').getList(1, 50, {
            filter: `company = "${locals.user.company}" && status = "active" && (${memberFilter})`
        });

        const validMemberIds = members.items.map(m => m.user).filter((id): id is string => Boolean(id));
        if (validMemberIds.length === 0) {
            return json({ success: false, error: 'No valid members found' }, { status: 400 });
        }

        // If logIds provided, assign to specific logs
        if (logIds && Array.isArray(logIds) && logIds.length > 0) {
            const logFilter = logIds.map((id: string) => `id = "${id}"`).join(' || ');
            const logs = await pb.collection('communication_logs').getList(1, 100, {
                filter: `company_id = "${locals.user.company}" && (${logFilter})`
            });

            if (logs.items.length === 0) {
                return json({ success: false, error: 'No logs found' }, { status: 404 });
            }

            // Extract thread_ids from logs metadata to find related messages
            const threadIds = logs.items
                .map(log => {
                    const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                    return metadata?.thread_id;
                })
                .filter((id): id is string => Boolean(id));

            // Update each log with assigned members
            const logUpdatePromises = logs.items.map(log =>
                pb.collection('communication_logs').update(log.id, {
                    assigned_members: validMemberIds
                })
            );

            // Update related messages (use first member for single assignment)
            const firstMemberId = validMemberIds[0];
            let messagesUpdated = 0;
            if (firstMemberId && threadIds.length > 0) {
                try {
                    const messageUpdatePromises = threadIds.map(async (threadId) => {
                        try {
                            const message = await pb.collection('messages').getFirstListItem(
                                `thread_id = "${threadId}" && company_id = "${locals.user.company}"`
                            );
                            await pb.collection('messages').update(message.id, {
                                assigned_to: firstMemberId,
                                status: 'assigned'
                            });
                            return true;
                        } catch (err) {
                            // Message might not exist or already assigned, skip
                            return false;
                        }
                    });

                    const results = await Promise.all(messageUpdatePromises);
                    messagesUpdated = results.filter(Boolean).length;
                } catch (err) {
                    console.error('Error updating related messages:', err);
                    // Continue even if message updates fail
                }
            }

            await Promise.all(logUpdatePromises);

            const messageMsg = messagesUpdated > 0 ? ` and ${messagesUpdated} message(s)` : '';
            return json({ 
                success: true, 
                updated: logs.items.length,
                messagesUpdated,
                message: `Assigned ${validMemberIds.length} member(s) to ${logs.items.length} log(s)${messageMsg}`
            });
        }

        // If endpoint provided, assign to all logs with that endpoint
        if (endpoint) {
            const logs = await pb.collection('communication_logs').getList(1, 500, {
                filter: `company_id = "${locals.user.company}" && destination = "${endpoint}"`
            });

            if (logs.items.length === 0) {
                return json({ success: false, error: 'No logs found for endpoint' }, { status: 404 });
            }

            // Extract thread_ids from logs metadata to find related messages
            const threadIds = logs.items
                .map(log => {
                    const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                    return metadata?.thread_id;
                })
                .filter((id): id is string => Boolean(id));

            // Update all logs with the endpoint
            const logUpdatePromises = logs.items.map(log =>
                pb.collection('communication_logs').update(log.id, {
                    assigned_members: validMemberIds
                })
            );

            // Update related messages (use first member for single assignment)
            const firstMemberId = validMemberIds[0];
            let messagesUpdated = 0;
            if (firstMemberId && threadIds.length > 0) {
                try {
                    // Get unique thread_ids
                    const uniqueThreadIds = [...new Set(threadIds)];
                    const messageUpdatePromises = uniqueThreadIds.map(async (threadId) => {
                        try {
                            const message = await pb.collection('messages').getFirstListItem(
                                `thread_id = "${threadId}" && company_id = "${locals.user.company}"`
                            );
                            await pb.collection('messages').update(message.id, {
                                assigned_to: firstMemberId,
                                status: 'assigned'
                            });
                            return true;
                        } catch (err) {
                            // Message might not exist or already assigned, skip
                            return false;
                        }
                    });

                    const results = await Promise.all(messageUpdatePromises);
                    messagesUpdated = results.filter(Boolean).length;
                } catch (err) {
                    console.error('Error updating related messages:', err);
                    // Continue even if message updates fail
                }
            }

            await Promise.all(logUpdatePromises);

            const messageMsg = messagesUpdated > 0 ? ` and ${messagesUpdated} message(s)` : '';
            return json({ 
                success: true, 
                updated: logs.items.length,
                messagesUpdated,
                message: `Assigned ${validMemberIds.length} member(s) to ${logs.items.length} log(s) with endpoint "${endpoint}"${messageMsg}`
            });
        }

        return json({ success: false, error: 'Either logIds or endpoint must be provided' }, { status: 400 });

    } catch (error) {
        console.error('Error assigning members:', error);
        return json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to assign members' 
        }, { status: 500 });
    }
};
