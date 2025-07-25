import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pb } from '$lib/pocketbase';
import { TELNYX_API_KEY, TELNYX_RECEIVING_NUMBER } from '$env/static/private';
import { addPendingCall } from '$lib/utils/callStore';

// The phone number that receives calls
const INCOMING_CALL_NUMBER = TELNYX_RECEIVING_NUMBER;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
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
      // Call Control format (production webhooks)
      callControlId = body.call_control_id;
      payload = body;
      
      // Infer event type from payload state/properties
      if (body.state === 'parked' && !body.hangup_cause) {
        eventType = 'call.initiated';
      } else if (body.hangup_cause) {
        eventType = 'call.hangup';
      } else if (body.start_time && !body.hangup_cause) {
        eventType = 'call.answered';
      } else {
        eventType = 'call.unknown';
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
        
        // Check if this is an incoming call to our specific number
        const toNumber = (payload?.to as string)?.replace(/\D/g, '') || '';
        const fromNumber = (payload?.from as string) || '';
        const callerName = (payload?.caller_id_name as string) || 'Unknown Caller';
        const isIncomingCall = payload?.direction === 'incoming' || 
                              (toNumber && toNumber.includes('7059986143'));
        
        if (isIncomingCall) {
          console.log('🔔 Incoming call detected to:', INCOMING_CALL_NUMBER, 'from:', fromNumber);
          
          // Store the incoming call for polling
          addPendingCall({
            name: callerName,
            phone: fromNumber,
            callId: callControlId
          });
          
          console.log('📞 Call stored in pending calls - waiting for user to answer via dialog');
          
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