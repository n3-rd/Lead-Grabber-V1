// src/routes/api/telnyx/webhook/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pb } from '$lib/pocketbase';
import { normalizePhoneNumber } from '$lib/utils/phone';
import { logCommunication } from '$lib/utils/communication-log';
import { createOrUpdateContact } from '$lib/utils/contacts';
import { getCompanyIdByPhoneNumber } from '$lib/company-numbers';
import { prisma } from '$lib/db';
import { isA2pEnabled, forwardSmsWebhook } from '$lib/server/a2p-client';

// Define the handleWebhook function used by PUT
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

    // Check if this is a Telnyx event webhook or direct inbound message
    let messageData;

    if (payload.data?.event_type === 'message.received') {
      // This is a webhook event format
      console.log('Processing webhook event:', payload.data.event_type);
      messageData = payload.data.payload;
    } else if (payload.record_type === 'message' && payload.direction === 'inbound') {
      // This is the direct message format you showed in your logs
      console.log('Processing direct inbound message');
      messageData = payload;
    } else {
      console.log('Unknown webhook format or not an inbound message:', payload);
      return json({ success: true }); // Always return success to Telnyx
    }

    // Now extract the message details regardless of format
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
    console.log('Normalized phone:', normalizedPhoneNumber, 'to (our number):', toNumber, 'companyId:', companyId ?? 'none');

    const threadId = normalizedPhoneNumber;

    try {
      let existingUser;
      try {
        try {
          existingUser = await pb.collection('messages').getFirstListItem(`thread_id="${normalizedPhoneNumber}"`);
        } catch {
          existingUser = await pb.collection('messages').getFirstListItem(`customer_phone="${normalizedPhoneNumber}"`);
        }
      } catch {
        existingUser = undefined;
      }

      let customerName: string;
      if (existingUser) {
        customerName = existingUser.customer_name ?? 'Unknown Customer';
        const companyIdForThread = companyId ?? existingUser.company_id;
        await pb.collection('messages').update(existingUser.id, {
          ...(companyIdForThread && { company_id: companyIdForThread }),
          messages: [...(Array.isArray(existingUser.messages) ? existingUser.messages : []), {
            content,
            timestamp: new Date().toISOString(),
            is_agent_reply: false,
            media: media.length > 0 ? media : undefined
          }],
          status: 'new'
        });
      } else {
        if (!companyId) {
          console.log('Inbound SMS to unassigned number, skipping thread creation');
          return json({ success: true });
        }
        const nameMatch = content.match(/(?:I'm|I am)\s+(?:new\s+customer,\s+)?([A-Za-z]+)/i);
        customerName = nameMatch?.[1] ?? 'Unknown Customer';
        await pb.collection('messages').create({
          thread_id: threadId,
          customer_phone: phoneNumber,
          customer_name: customerName,
          messages: [{
            content,
            timestamp: new Date().toISOString(),
            is_agent_reply: false,
            media: media.length > 0 ? media : undefined
          }],
          status: 'new',
          company_id: companyId,
          source: 'sms',
          color: 'bg-primary',
          initials: customerName.substring(0, 2).toUpperCase(),
          form_data: {},
          source_url: ''
        });
      }

      const effectiveCompanyId = companyId ?? (existingUser?.company_id as string | undefined);
      const contact = effectiveCompanyId
        ? await createOrUpdateContact({
            company_id: effectiveCompanyId,
            phone: normalizedPhoneNumber,
            name: customerName !== 'Unknown Customer' ? customerName : undefined,
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
        content: content,
        metadata: {
          thread_id: threadId,
          telnyx_event: payload.data?.event_type
        }
      });

      return json({ success: true });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return json({ success: false, error: dbError instanceof Error ? dbError.message : String(dbError) }, { status: 500 });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
};

// Also add this for PUT, GET, OPTIONS methods handling which Telnyx might use
export const GET: RequestHandler = () => json({ success: true });
export const PUT: RequestHandler = async ({ request }) => {
  return await handleWebhook(request);
};
export const OPTIONS: RequestHandler = () => json({ success: true });