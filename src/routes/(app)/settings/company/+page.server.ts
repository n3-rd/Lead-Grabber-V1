import { pb } from '$lib/pocketbase';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sendInviteEmail } from '$lib/server/brevo';
import { PUBLIC_BASE_URL, PUBLIC_ENV } from '$env/static/public';
import { TWILIO_PHONE_NUMBER } from '$env/static/private';

function normalizeUrl(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        throw redirect(303, '/login');
    }

    try {
        // First check if user has a company_id
        if (!user.company) {
            console.error('User has no company_id:', user);
            throw redirect(303, '/create-company');
        }

        // Get user's company directly using their company_id
        const company = await pb.collection('companies').getOne(user.company, {
            expand: 'team_members'
        });

        // Get company members with expanded user data
        const members = await pb.collection('company_members').getList(1, 50, {
            filter: `company = "${user.company}" && status = "active"`,
            expand: 'user',
            sort: '-created'
        });

        console.log('members', members);

        if (!members.items.length) {
            console.warn('No members found for company:', user.company);
        }

        // Get current user's role from company_members
        const currentUserMember = members.items.find(m => m.user === user.id);
        const userRole = currentUserMember?.role || 'member';
        const isAdminOrOwner = userRole === 'admin' || userRole === 'owner' || company.owner === user.id;

        return {
            company: {
                ...company,
                settings: typeof company.settings === 'string'
                    ? JSON.parse(company.settings)
                    : company.settings || {
                        branding: { primary_color: '#000000' },
                        notifications: { email: true, web: true }
                    }
            },
            members: members.items.map(member => ({
                id: member.id,
                user: member.expand?.user,
                role: member.role,
                joined_at: member.joined_at
            })),
            userRole,
            isAdminOrOwner
        };
    } catch (error) {
        console.error('Error loading company:', error);
        // If company not found or other error, clear the company_id and redirect
        if (error.status === 404 || !user.company) {
            await pb.collection('users').update(user.id, {
                company: null
            });
            throw redirect(303, '/create-company');
        }
        return {
            company: null,
            members: [],
            error: 'Failed to load company'
        };
    }
};

export const actions: Actions = {
    updateCompany: async ({ request, locals }) => {
        const user = locals.user;
        if (!user?.company) {
            return fail(401, { error: 'Unauthorized' });
        }

        try {
            const formData = await request.formData();
            const name = formData.get('name') as string;
            const website = formData.get('website') as string;
            const primaryColor = formData.get('primaryColor') as string;
            const logo = formData.get('logo') as File;
            const emailNotifications = formData.get('emailNotifications') === 'true';
            const webNotifications = formData.get('webNotifications') === 'true';

            // Get current company
            const company = await pb.collection('companies').getOne(user.company);

            // Check if user is owner or admin
            const userMember = await pb.collection('company_members').getFirstListItem(
                `user = "${user.id}" && company = "${user.company}" && status = "active"`
            ).catch(() => null);

            const isOwner = company.owner === user.id;
            const isAdmin = userMember?.role === 'admin';

            if (!isOwner && !isAdmin) {
                return fail(403, { error: 'Only company owners and admins can update company settings' });
            }

            const updateData: any = {
                name,
                website,
                settings: JSON.stringify({
                    branding: { primary_color: primaryColor },
                    notifications: {
                        email: emailNotifications,
                        web: webNotifications
                    },
                    twilio_phone_number: TWILIO_PHONE_NUMBER,
                    webhook_url: `${PUBLIC_BASE_URL}/api/twilio/webhook`
                })
            };

            if (logo instanceof File && logo.size > 0) {
                updateData.logo = logo;
            }

            await pb.collection('companies').update(company.id, updateData);
            return { success: true };
        } catch (error) {
            console.error('Error updating company:', error);
            return fail(500, { error: 'Failed to update company' });
        }
    },

    inviteMember: async ({ request, locals }) => {
        const user = locals.user;
        if (!user?.company) {
            return fail(401, { error: 'Unauthorized' });
        }

        try {
            const data = await request.formData();
            const email = data.get('email')?.toString();
            const role = data.get('role')?.toString() || 'member';

            // Validate role
            if (!['admin', 'member'].includes(role)) {
                return fail(400, { error: 'Invalid role. Only admin and member roles are allowed.' });
            }

            if (!email) {
                return fail(400, { error: 'Email is required' });
            }

            // Get company and check if user has permission to invite
            const company = await pb.collection('companies').getOne(user.company, {
                expand: 'team_members'
            });

            if (company.owner !== user.id) {
                return fail(403, { error: 'Only company owners can invite members' });
            }

            // Check if user already exists
            const existingUser = await pb.collection('users').getFirstListItem(`email="${email}"`).catch(() => null);

            // Create invite record
            const invite = await pb.collection('invites').create({
                email,
                company: user.company,
                role,
                status: 'pending',
                invited_by: user.id,
                user_id: existingUser?.id || null, // Make user_id optional
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });

            // Send invite email using Brevo
            if (PUBLIC_ENV === 'production') {
                await sendInviteEmail({
                    email,
                    inviteId: invite.id,
                    companyName: company.name,
                    invitedByName: user.name || user.email
                });
            } else {
                const inviteLink = normalizeUrl(PUBLIC_BASE_URL, `/invite/accept/${invite.id}`);
                console.log(`[DEV] Invite link for ${email}: ${inviteLink}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Error sending invite:', error);
            return fail(500, { error: 'Failed to send invitation' });
        }
    }
}; 