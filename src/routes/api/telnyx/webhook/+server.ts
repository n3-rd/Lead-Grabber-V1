// src/routes/api/telnyx/webhook/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/db';
import { normalizePhoneNumber } from '$lib/utils/phone';
import { logCommunication } from '$lib/utils/communication-log';
import { createOrUpdateContact } from '$lib/utils/contacts';
import { getCompanyIdByPhoneNumber } from '$lib/company-numbers';
import { isA2pEnabled, forwardSmsWebhook } from '$lib/server/a2p-client';

async function handleWebhook(request: Request) {
	return await POST({ request } as Parameters<typeof POST>[0]);
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const rawBody = await request.text();
		console.log('Webhook raw body:', rawBody);

		// Forward to A2P backend when configured (replaces local SMS/messages/comm-log handling)
		if (isA2pEnabled()) {
			const { ok, status, body: a2pBody } = await forwardSmsWebhook(rawBody);
			return json(a2pBody ?? { ok }, { status: status >= 200 && status < 300 ? 200 : status });
		}

		// Parse the webhook payload
		const payload = JSON.parse(rawBody);
		console.log('Webhook payload:', payload);

		let messageData;

		if (payload.data?.event_type === 'message.received') {
			messageData = payload.data.payload;
		} else if (payload.record_type === 'message' && payload.direction === 'inbound') {
			messageData = payload;
		} else {
			console.log('Unknown webhook format or not an inbound message:', payload);
			return json({ success: true });
		}

		const phoneNumber = messageData.from?.phone_number || messageData.from;
		const content = messageData.text;
		const media = messageData.media || [];

		if (!phoneNumber) {
			console.error('Missing phone number in webhook:', messageData);
			return json({ success: false, error: 'Missing phone number' });
		}

		const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
		const toNumber = messageData.to?.phone_number || messageData.to;
		const companyId = toNumber ? await getCompanyIdByPhoneNumber(prisma, toNumber) : null;
		console.log(
			'Normalized phone:',
			normalizedPhoneNumber,
			'to (our number):',
			toNumber,
			'companyId:',
			companyId ?? 'none'
		);

		const threadId = normalizedPhoneNumber;

		try {
			// Find existing message by threadId or customerPhone
			const existingMessage = await prisma.message.findFirst({
				where: {
					OR: [{ threadId: normalizedPhoneNumber }, { customerPhone: normalizedPhoneNumber }]
				}
			});

			let customerName: string;

			if (existingMessage) {
				customerName = existingMessage.customerName ?? 'Unknown Customer';
				const companyIdForThread = companyId ?? existingMessage.companyId;
				const prevMessages = (existingMessage.messages as Array<Record<string, unknown>>) ?? [];
				const newMsg = {
					content,
					timestamp: new Date().toISOString(),
					is_agent_reply: false,
					...(media.length > 0 && { media })
				};

				await prisma.message.update({
					where: { id: existingMessage.id },
					data: {
						...(companyIdForThread && { companyId: companyIdForThread }),
						messages: [...prevMessages, newMsg],
						status: 'new'
					}
				});
			} else {
				if (!companyId) {
					console.log('Inbound SMS to unassigned number, skipping thread creation');
					return json({ success: true });
				}
				const nameMatch = content.match(/(?:I'm|I am)\s+(?:new\s+customer,\s+)?([A-Za-z]+)/i);
				customerName = nameMatch?.[1] ?? 'Unknown Customer';

				await prisma.message.create({
					data: {
						threadId,
						companyId,
						customerPhone: phoneNumber,
						customerName,
						messages: [
							{
								content,
								timestamp: new Date().toISOString(),
								is_agent_reply: false,
								...(media.length > 0 && { media })
							}
						],
						status: 'new'
					}
				});
			}

			const effectiveCompanyId = companyId ?? existingMessage?.companyId ?? null;
			const contact = effectiveCompanyId
				? await createOrUpdateContact({
						company_id: effectiveCompanyId,
						phone: normalizedPhoneNumber,
						name: customerName !== 'Unknown Customer' ? customerName : undefined
					})
				: undefined;

			await logCommunication({
				type: 'sms',
				direction: 'inbound',
				status: 'success',
				source: phoneNumber,
				destination: toNumber || 'Inbox',
				company_id: companyId ?? undefined,
				customer_id: contact?.id ?? undefined,
				summary: content.substring(0, 50) + '...',
				content,
				metadata: {
					thread_id: threadId,
					telnyx_event: payload.data?.event_type
				}
			});

			return json({ success: true });
		} catch (dbError) {
			console.error('Database error:', dbError);
			return json(
				{ success: false, error: dbError instanceof Error ? dbError.message : String(dbError) },
				{ status: 500 }
			);
		}
	} catch (err) {
		console.error('Webhook processing error:', err);
		return json(
			{ success: false, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = () => json({ success: true });
export const PUT: RequestHandler = async ({ request }) => handleWebhook(request);
export const OPTIONS: RequestHandler = () => json({ success: true });
