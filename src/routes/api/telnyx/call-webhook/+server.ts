import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPublicKey, verify } from 'crypto';
import { pb } from '$lib/pocketbase';
import { TELNYX_API_KEY } from '$env/static/private';
import { addPendingCall } from '$lib/utils/callStore';
import { prisma } from '$lib/db';
import { getActiveCallFlow, toAbsoluteAudioUrl } from '$lib/ivr';
import { getCompanyIdByPhoneNumber } from '$lib/company-numbers';
import { PUBLIC_BASE_URL } from '$env/static/public';

const TELNYX_PUBLIC_KEY = process.env.TELNYX_PUBLIC_KEY;

/** Verify Telnyx webhook signature (Ed25519). Signed payload = timestamp|rawBody. Skip if TELNYX_PUBLIC_KEY not set. */
function verifyTelnyxSignature(rawBody: string, timestamp: string, signatureB64: string): boolean {
	if (!TELNYX_PUBLIC_KEY) return true;
	try {
		const payload = `${timestamp}|${rawBody}`;
		const sig = Buffer.from(signatureB64, 'base64');
		const key =
			TELNYX_PUBLIC_KEY.includes('-----BEGIN')
				? createPublicKey({ key: TELNYX_PUBLIC_KEY, format: 'pem' })
				: createPublicKey({
						key: Buffer.from(TELNYX_PUBLIC_KEY, 'base64'),
						format: 'raw',
						type: 'ed25519'
					});
		return verify(null, Buffer.from(payload, 'utf8'), key, sig);
	} catch {
		return false;
	}
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get('telnyx-timestamp') ?? '';
    const signature = request.headers.get('telnyx-signature-ed25519') ?? '';
    if (TELNYX_PUBLIC_KEY && (!timestamp || !signature)) {
      return json({ error: 'Missing webhook signature headers' }, { status: 401 });
    }
    if (TELNYX_PUBLIC_KEY && !verifyTelnyxSignature(rawBody, timestamp, signature)) {
      return json({ error: 'Invalid webhook signature' }, { status: 401 });
    }
    const body = JSON.parse(rawBody);
    
    // Detect webhook format: Event API (wrapped) vs Call Control (direct)
    const isEventAPI = body.data?.event_type;
    const isCallControl = body.call_control_id;
    
    let eventType: string;
    let callControlId: string;
    let payload: Record<string, unknown>;
    
    if (isEventAPI) {
      // Event API format (test webhooks)
      eventType = body.data.event_type;
      callControlId = body.data.payload.call_control_id;
      payload = body.data.payload;
      console.log('📞 Event API webhook:', eventType, callControlId);
    } else if (isCallControl) {
      // Call Control format (production webhooks) – use explicit event_type when present
      callControlId = body.call_control_id;
      payload = body;
      const explicitEventType = body.event_type as string | undefined;
      if (explicitEventType) {
        eventType = explicitEventType;
      } else {
        if (body.state === 'parked' && !body.hangup_cause) {
          eventType = 'call.initiated';
        } else if (body.hangup_cause) {
          eventType = 'call.hangup';
        } else if (body.start_time && !body.hangup_cause) {
          eventType = 'call.answered';
        } else {
          eventType = 'call.unknown';
        }
      }
      console.log('📞 Call Control webhook:', eventType, callControlId, 'state:', body.state);
    } else {
      console.log('❓ Unknown webhook format:', body);
      return json({ success: true }); // Acknowledge unknown format
    }
    
    // For answering machine detection result
    let detectionResult: string | undefined;
    
    // Process different call events
    switch (eventType) {
      case 'call.initiated': {
        console.log('Call initiated:', callControlId);
        await logCallEvent(callControlId, 'initiated', payload);
        
        // Incoming: "to" is the number that received the call. Resolve company by that number.
        const toRaw = (payload?.to as string) || '';
        const fromNumber = (payload?.from as string) || '';
        const callerName = (payload?.caller_id_name as string) || 'Unknown Caller';
        const isIncomingCall = payload?.direction === 'incoming';

        if (isIncomingCall) {
          const companyId = await getCompanyIdByPhoneNumber(prisma, toRaw);
          console.log('🔔 Incoming call to:', toRaw, 'from:', fromNumber, 'companyId:', companyId ?? 'none');

          if (companyId) {
            const active = await getActiveCallFlow(prisma, companyId, new Date());
            if (active) {
              const clientState = Buffer.from(
                JSON.stringify({ ivrFlowId: active.flow.id, ivrRuleId: active.rule.id })
              ).toString('base64');
              try {
                await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TELNYX_API_KEY}`
                  },
                  body: JSON.stringify({
                    record: 'record-from-answer',
                    client_state: clientState
                  })
                });
                console.log('✅ IVR flow answered:', active.flow.title, active.rule.ruleTitle);
              } catch (err) {
                console.error('❌ IVR answer failed:', err);
                addPendingCall({ name: callerName, phone: fromNumber, callId: callControlId });
              }
            } else {
              addPendingCall({ name: callerName, phone: fromNumber, callId: callControlId });
              console.log('📞 No active IVR rule for this time - stored in pending calls');
            }
          } else {
            addPendingCall({ name: callerName, phone: fromNumber, callId: callControlId });
            console.log('📞 Number not assigned to a company - stored in pending calls');
          }
        } else {
          // For outbound calls, we can still auto-answer
          if (callControlId) {
            try {
              await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${TELNYX_API_KEY}`
                },
                body: JSON.stringify({ record: 'record-from-answer' })
              });
              console.log('✅ Outbound call answered and recording started');
            } catch (error) {
              console.error('❌ Error answering/recording outbound call:', error);
            }
          }
        }
        break;
      }

      case 'call.answered': {
        console.log('✅ Call answered:', callControlId);
        await logCallEvent(callControlId, 'answered', payload);
        let ivrFlowId: string | null = null;
        let ivrRuleId: string | null = null;
        if (payload?.client_state) {
          try {
            const decoded = JSON.parse(
              Buffer.from(payload.client_state as string, 'base64').toString('utf8')
            );
            ivrFlowId = decoded.ivrFlowId ?? null;
            ivrRuleId = decoded.ivrRuleId ?? null;
          } catch (_) {}
        }
        if (ivrFlowId && ivrRuleId && callControlId) {
          const baseUrl = PUBLIC_BASE_URL || 'https://example.com';
          const flow = await prisma.callFlow.findUnique({
            where: { id: ivrFlowId },
            include: { rules: { where: { id: ivrRuleId } } }
          });
          const rule = flow?.rules?.[0];
          if (flow && rule) {
            const greetingUrl = toAbsoluteAudioUrl(flow.greetingAudioUrl, baseUrl);
            const promptsUrl = toAbsoluteAudioUrl(rule.promptsAudioUrl, baseUrl);
            try {
              if (greetingUrl) {
                await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/playback_start`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TELNYX_API_KEY}`
                  },
                  body: JSON.stringify({ audio_url: greetingUrl })
                });
              }
              if (promptsUrl) {
                await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TELNYX_API_KEY}`
                  },
                  body: JSON.stringify({
                    audio_url: promptsUrl,
                    minimum_digits: 1,
                    maximum_digits: 1,
                    timeout_millis: 10000,
                    terminating_digit: '#',
                    ...(payload.client_state && { client_state: payload.client_state })
                  })
                });
              }
            } catch (err) {
              console.error('❌ IVR playback/gather failed:', err);
            }
          }
        }
        break;
      }

      case 'call.gather.ended': {
        const digits = (payload?.digits as string) ?? '';
        const status = (payload?.status as string) ?? '';
        let ivrFlowId: string | null = null;
        let ivrRuleId: string | null = null;
        let ivrRetry = 0;
        if (payload?.client_state) {
          try {
            const decoded = JSON.parse(
              Buffer.from(payload.client_state as string, 'base64').toString('utf8')
            );
            ivrFlowId = decoded.ivrFlowId ?? null;
            ivrRuleId = decoded.ivrRuleId ?? null;
            ivrRetry = Number(decoded.ivrRetry) || 0;
          } catch (_) {}
        }
        if (!callControlId || !ivrFlowId || !ivrRuleId) {
          console.log('📞 gather.ended missing callControlId or IVR state, ignoring');
          break;
        }
        const baseUrl = PUBLIC_BASE_URL || 'https://example.com';
        const flow = await prisma.callFlow.findUnique({
          where: { id: ivrFlowId },
          include: { rules: { where: { id: ivrRuleId } } }
        });
        const rule = flow?.rules?.[0];
        if (!flow || !rule) {
          console.log('📞 gather.ended flow/rule not found');
          break;
        }
        const keyPrompts = (rule.keyPrompts as { key: string; name?: string; extension?: string; transferAudioUrl?: string }[]) ?? [];
        const failoverCount = rule.failoverCount ?? 2;
        const failoverUrl = toAbsoluteAudioUrl(rule.failoverAudioUrl, baseUrl);
        const hangupUrl = toAbsoluteAudioUrl(rule.hangupAudioUrl, baseUrl);
        const promptsUrl = toAbsoluteAudioUrl(rule.promptsAudioUrl, baseUrl);

        const encodeClientState = (extra: Record<string, unknown>) =>
          Buffer.from(JSON.stringify({ ivrFlowId, ivrRuleId, ...extra })).toString('base64');

        // Timeout or no digits: failover or hangup
        if (status !== 'valid' || !digits.trim()) {
          if (ivrRetry >= failoverCount) {
            if (hangupUrl) {
              const hangupState = Buffer.from(JSON.stringify({ afterPlaybackHangup: true })).toString('base64');
              await telnyxPlayback(callControlId, hangupUrl, hangupState);
            } else {
              await telnyxHangup(callControlId);
            }
            console.log('📞 IVR failover exhausted, playing hangup then hangup');
          } else {
            if (failoverUrl) {
              const nextState = encodeClientState({
                ivrRetry: ivrRetry + 1,
                afterPlaybackGather: true
              });
              await telnyxPlayback(callControlId, failoverUrl, nextState);
            } else {
              const nextState = encodeClientState({ ivrRetry: ivrRetry + 1 });
              await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TELNYX_API_KEY}` },
                body: JSON.stringify({
                  audio_url: promptsUrl,
                  minimum_digits: 1,
                  maximum_digits: 1,
                  timeout_millis: 10000,
                  terminating_digit: '#',
                  client_state: nextState
                })
              });
            }
            console.log('📞 IVR failover retry', ivrRetry + 1);
          }
          break;
        }

        const digit = digits.trim().charAt(0);

        // # = leave message / hangup
        if (digit === '#') {
          if (hangupUrl) {
            const hangupState = Buffer.from(JSON.stringify({ afterPlaybackHangup: true })).toString('base64');
            await telnyxPlayback(callControlId, hangupUrl, hangupState);
          } else {
            await telnyxHangup(callControlId);
          }
          console.log('📞 IVR user chose hangup (#)');
          break;
        }

        const match = keyPrompts.find((p) => String(p.key).trim() === digit);
        if (match?.extension) {
          const to = String(match.extension).trim();
          const transferAudioUrl = match.transferAudioUrl ? toAbsoluteAudioUrl(match.transferAudioUrl, baseUrl) : null;
          await telnyxTransfer(callControlId, to, transferAudioUrl);
          console.log('📞 IVR transfer to', to, match.name ?? digit);
        } else {
          // Unknown key: treat like timeout, failover or hangup
          if (ivrRetry >= failoverCount) {
            if (hangupUrl) {
              const hangupState = Buffer.from(JSON.stringify({ afterPlaybackHangup: true })).toString('base64');
              await telnyxPlayback(callControlId, hangupUrl, hangupState);
            } else {
              await telnyxHangup(callControlId);
            }
          } else {
            if (failoverUrl) {
              const nextState = encodeClientState({
                ivrRetry: ivrRetry + 1,
                afterPlaybackGather: true
              });
              await telnyxPlayback(callControlId, failoverUrl, nextState);
            } else {
              const nextState = encodeClientState({ ivrRetry: ivrRetry + 1 });
              await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TELNYX_API_KEY}` },
                body: JSON.stringify({
                  audio_url: promptsUrl,
                  minimum_digits: 1,
                  maximum_digits: 1,
                  timeout_millis: 10000,
                  terminating_digit: '#',
                  client_state: nextState
                })
              });
            }
          }
        }
        break;
      }

      case 'call.playback.ended': {
        if (!callControlId || !payload?.client_state) break;
        try {
          const decoded = JSON.parse(
            Buffer.from(payload.client_state as string, 'base64').toString('utf8')
          );
          if (decoded.afterPlaybackHangup) {
            await telnyxHangup(callControlId);
            console.log('📞 IVR playback (hangup) ended, hanging up');
            break;
          }
          if (decoded.afterPlaybackGather && decoded.ivrFlowId && decoded.ivrRuleId) {
            const flow = await prisma.callFlow.findUnique({
              where: { id: decoded.ivrFlowId },
              include: { rules: { where: { id: decoded.ivrRuleId } } }
            });
            const rule = flow?.rules?.[0];
            if (rule?.promptsAudioUrl) {
              const baseUrl = PUBLIC_BASE_URL || 'https://example.com';
              const promptsUrl = toAbsoluteAudioUrl(rule.promptsAudioUrl, baseUrl);
              const nextState = Buffer.from(
                JSON.stringify({
                  ivrFlowId: decoded.ivrFlowId,
                  ivrRuleId: decoded.ivrRuleId,
                  ivrRetry: Number(decoded.ivrRetry) || 0
                })
              ).toString('base64');
              await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TELNYX_API_KEY}` },
                body: JSON.stringify({
                  audio_url: promptsUrl,
                  minimum_digits: 1,
                  maximum_digits: 1,
                  timeout_millis: 10000,
                  terminating_digit: '#',
                  client_state: nextState
                })
              });
              console.log('📞 IVR failover playback ended, re-gathering');
            }
          }
        } catch (_) {}
        break;
      }

      case 'call.hangup': {
        console.log('📞 Call hangup:', callControlId);
        await logCallEvent(callControlId, 'ended', payload);
        
        // Broadcast call ended event
        // Removed SSE broadcasting as per edit hint
        break;
      }

      case 'call.machine.detection.ended': {
        // Handle answering machine detection
        detectionResult = (payload?.result as string) || (isEventAPI ? (body.data?.payload?.result as string) : undefined);
        console.log('🤖 Answering machine detection:', detectionResult);

        if (detectionResult === 'machine') {
          console.log('📞 Answering machine detected, leaving a message');
          await logCallEvent(callControlId, 'machine-detection-machine', payload);

          if (callControlId) {
            await playAudio(callControlId, "This is an automated message from Clearsky. Please call us back at your convenience.");
          }
        } else if (detectionResult === 'human') {
          console.log('👤 Human answered, connecting call');
          await logCallEvent(callControlId, 'machine-detection-human', payload);
        }
        break;
      }

      case 'call.machine.premium.detection.ended': {
        // Handle premium answering machine detection
        detectionResult = (payload?.result as string) || (isEventAPI ? (body.data?.payload?.result as string) : undefined);
        console.log('🤖 Premium answering machine detection:', detectionResult);

        if (detectionResult === 'machine') {
          console.log('📞 Premium: Answering machine detected, leaving a message');
          await logCallEvent(callControlId, 'premium-machine-detection-machine', payload);

          if (callControlId) {
            await playAudio(callControlId, "This is an automated message from Clearsky. Please call us back at your convenience.");
          }
        } else if (detectionResult === 'human') {
          console.log('👤 Premium: Human answered, connecting call');
          await logCallEvent(callControlId, 'premium-machine-detection-human', payload);
        }
        break;
      }

      case 'call.machine.premium.greeting.ended': {
        // Handle when machine greeting ends (beep detected)
        console.log('📞 Premium: Machine greeting ended, beep detected');
        await logCallEvent(callControlId, 'premium-greeting-ended', payload);
        
        if (callControlId) {
          await playAudio(callControlId, "Hello, this is an automated message from Clearsky. We tried to reach you regarding your inquiry. Please call us back at your earliest convenience. Thank you.");
        }
        break;
      }

      case 'call.recording.saved': {
        // Recording is available, save the URL(s)
        const recUrls = payload?.recording_urls;
        const recId = payload?.recording_id;
        console.log('🎥 Call recording saved:', recId, recUrls);
        if (callControlId && recUrls) {
          await pb.collection('call_recordings').create({
            call_id: callControlId,
            recording_id: recId as string,
            urls: JSON.stringify(recUrls),
            timestamp: new Date().toISOString()
          });
        }
        break;
      }

      default: {
        console.log('❓ Unhandled event:', eventType);
        break;
      }
    }
    
    // Always respond with a 200 OK to acknowledge receipt
    return json({ success: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};

async function playAudio(callControlId: string, message: string = ''): Promise<void> {
  try {
    await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TELNYX_API_KEY}`
      },
      body: JSON.stringify({
        payload: message || "Hello, this is an automated call. Please hold for an important message.",
        voice: "female",
        language: "en-US"
      })
    });
  } catch (error) {
    console.error('Error playing audio:', error);
  }
}

const TELNYX_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TELNYX_API_KEY}`
};

async function telnyxPlayback(
  callControlId: string,
  audioUrl: string,
  clientState?: string
): Promise<void> {
  await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/playback_start`, {
    method: 'POST',
    headers: TELNYX_HEADERS,
    body: JSON.stringify({
      audio_url: audioUrl,
      ...(clientState && { client_state: clientState })
    })
  });
}

async function telnyxHangup(callControlId: string): Promise<void> {
  await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {
    method: 'POST',
    headers: TELNYX_HEADERS,
    body: JSON.stringify({})
  });
}

async function telnyxTransfer(
  callControlId: string,
  to: string,
  audioUrl?: string | null
): Promise<void> {
  await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/transfer`, {
    method: 'POST',
    headers: TELNYX_HEADERS,
    body: JSON.stringify({
      to,
      ...(audioUrl && { audio_url: audioUrl })
    })
  });
}

// Log call events to your database
async function logCallEvent(callId: string, status: string, payload: Record<string, unknown>): Promise<void> {
  try {
    // Extract client state if available
    let clientId = null;
    if (payload.client_state) {
      try {
        const clientState = JSON.parse(atob(payload.client_state as string));
        clientId = clientState.clientId;
      } catch (err) {
        console.error('Error parsing client state:', err);
      }
    }
    
    // Log the call event to PocketBase or your preferred database
    await pb.collection('call_logs').create({
      call_id: callId,
      status: status,
      to: payload.to || '',
      from: payload.from || '',
      client_id: clientId || '',
      duration: payload.duration || 0,
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(payload)
    });
    
  } catch (dbError) {
    console.error('Error logging call event to database:', dbError);
  }
}

// Also add this for PUT, GET, OPTIONS methods for Telnyx webhook validation
export const GET: RequestHandler = () => json({ success: true });
export const PUT: RequestHandler = async (event) => {
  return await POST(event);
};
export const OPTIONS: RequestHandler = () => json({ success: true }); 