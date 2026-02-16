import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/db';
import { requireAuth, unauthorized } from '$lib/api/spec';
import { logCommunication } from '$lib/utils/communication-log';

/** Stub: logs email as outbound comm; actual sending would use SendGrid/SES/Mailgun. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const auth = requireAuth(locals);
	if (!auth) return unauthorized();

	const body = await request.json().catch(() => ({}));
	const recipients = Array.isArray(body.recipients) ? body.recipients : [];
	const subject = typeof body.subject === 'string' ? body.subject : '';
	const bodyText = typeof body.body === 'string' ? body.body : '';
	const fromName = typeof body.fromName === 'string' ? body.fromName : '';

	if (!recipients.length || !subject || !bodyText) {
		return json({ success: false, error: 'recipients, subject, and body are required', code: 400 }, { status: 400 });
	}

	const results: { recipient: string; emailId: string; status: string }[] = [];
	for (const to of recipients) {
		const emailId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		try {
			await logCommunication({
				type: 'email',
				direction: 'outbound',
				status: 'success',
				source: fromName || undefined,
				destination: to,
				company_id: auth.companyId,
				summary: subject,
				content: bodyText,
				metadata: { emailId, subject },
			});
			results.push({ recipient: to, emailId, status: 'sent' });
		} catch {
			results.push({ recipient: to, emailId, status: 'failed' });
		}
	}

	const failed = results.filter((r) => r.status === 'failed').length;
	return json({
		success: failed === 0,
		data: { results },
		message: failed === 0
			? `Email sent to ${results.length} recipient(s)`
			: `Failed to send to ${failed} recipient(s)`,
	});
};
