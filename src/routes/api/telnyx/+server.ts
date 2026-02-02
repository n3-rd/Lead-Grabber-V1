import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TELNYX_API_KEY, TELNYX_PHONE_NUMBER, TELNYX_MESSAGING_PROFILE_ID } from '$env/static/private';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { normalizePhoneNumber } from '$lib/utils/phone';
import { logCommunication } from '$lib/utils/communication-log';
import { getFirstCompanyNumber } from '$lib/company-numbers';
import { prisma } from '$lib/db';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { message, phoneNumber } = await request.json();

  try {
    const companyId = locals.user?.company?.id;
    let fromNumber: string;
    if (companyId) {
      const companyNumber = await getFirstCompanyNumber(prisma, companyId);
      fromNumber = companyNumber?.phoneNumber ?? TELNYX_PHONE_NUMBER;
    } else {
      fromNumber = TELNYX_PHONE_NUMBER;
    }

    // Normalize phone number
    const formattedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Log the request being sent to Telnyx
    console.log('Sending to Telnyx:', {
      from: fromNumber,
      to: formattedPhoneNumber,
      profileId: TELNYX_MESSAGING_PROFILE_ID,
      apiKeyLength: TELNYX_API_KEY?.length || 0 // Don't log the actual key, just its length for debugging
    });

    // Call Telnyx API to send SMS
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TELNYX_API_KEY}`
      },
      body: JSON.stringify({
        from: fromNumber,
        to: formattedPhoneNumber,
        text: message,
        messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID, // Required for SMS/MMS
        webhook_url: `${PUBLIC_BASE_URL}/api/telnyx/webhook`,
        webhook_failover_url: `${PUBLIC_BASE_URL}/api/telnyx/webhook-backup`,
        use_profile_webhooks: false, // Use our custom webhooks instead of profile defaults
        type: 'SMS' // Explicitly set message type
      })
    });

    // Log the full response for debugging
    const responseText = await response.text();
    console.log('Telnyx API raw response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Telnyx response as JSON:', e);
      throw new Error('Invalid response from Telnyx API');
    }

    console.log('Telnyx API parsed response:', result);

    if (!response.ok) {
      const errorDetail = result.errors?.[0]?.detail || 'Failed to send message';
      console.error('Telnyx API error:', errorDetail, result);
      throw new Error(errorDetail);
    }

    await logCommunication({
      type: 'sms',
      direction: 'outbound',
      status: 'success',
      source: fromNumber,
      destination: formattedPhoneNumber,
      company_id: companyId ?? undefined,
      summary: message.substring(0, 50) + '...',
      content: message,
      metadata: {
        telnyx_id: result.data?.id
      }
    });

    return json({
      success: true,
      telnyxId: result.data?.id,
      threadId: formattedPhoneNumber
    });
  } catch (error) {
    console.error('Telnyx API error:', error);

    // Log failed attempt if we have enough info
    try {
      await logCommunication({
        type: 'sms',
        direction: 'outbound',
        status: 'failed',
        source: TELNYX_PHONE_NUMBER,
        destination: normalizePhoneNumber(phoneNumber),
        content: message,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    } catch (e) { console.error('Failed to log error', e) }

    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};