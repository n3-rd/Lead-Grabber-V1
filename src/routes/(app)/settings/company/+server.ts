import { pb } from '$lib/pocketbase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendEmail } from '$lib/email'; // Create this utility
import { PUBLIC_BASE_URL, PUBLIC_ENV } from '$env/static/public';

function normalizeUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const email = data.email;
    const role = data.role || 'member';

    if (!email) {
      return json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await pb.collection('users').getFirstListItem(`email="${email}"`);
      console.log('Existing user found:', existingUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      return json({ success: false, error: 'User must create an account before being invited' }, { status: 400 });
    }

    if (!existingUser) {
      console.log('No user found with email:', email);
      return json({ success: false, error: 'User must create an account before being invited' }, { status: 400 });
    }

    // Ensure email visibility is true
    if (!existingUser.emailVisibility) {
      try {
        const updateData = { emailVisibility: true };
        await pb.collection('users').update(existingUser.id, updateData);
        console.log('Email visibility set to true for user:', existingUser.id);
      } catch (error) {
        console.error('Error updating email visibility:', error);
        return json({ success: false, error: 'Failed to update email visibility' }, { status: 500 });
      }
    }

    // Check if already a team member
    const company = await pb.collection('companies').getOne(user.company, {
      expand: 'team_members'
    });

    if (company.expand?.team_members?.some((m: Record<string, unknown>) => m.id === existingUser.id)) {
      return json({ success: false, error: 'User is already a team member' }, { status: 400 });
    }

    // Create invite record
    const invite = await pb.collection('invites').create({
      email,
      company: user.company,
      role,
      status: 'pending',
      invited_by: user.id,
      user_id: existingUser.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    const inviteLink = normalizeUrl(PUBLIC_BASE_URL, `/invite/accept/${invite.id}`);
    
    // Send invite email in production, log link in development
    if (PUBLIC_ENV === 'production') {
      await sendEmail({
        to: email,
        subject: `Invitation to join ${company.name}`,
        html: `
          <h1>You've been invited to join ${company.name}</h1>
          <p>${user.name} has invited you to join their team.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${inviteLink}">Accept Invitation</a>
        `
      });
    } else {
      console.log(`[DEV] Invite link for ${email}: ${inviteLink}`);
    }

    return json({ success: true });

  } catch (error) {
    console.error('Error sending invite:', error);
    return json({ success: false, error: 'Failed to send invitation' }, { status: 500 });
  }
}; 