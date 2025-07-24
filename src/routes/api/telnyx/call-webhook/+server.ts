import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pb } from '$lib/pocketbase';
import { TELNYX_API_KEY } from '$env/static/private';
import { TELNYX_RECEIVING_NUMBER } from '$env/static/private';

// The phone number that receives calls
const INCOMING_CALL_NUMBER = TELNYX_RECEIVING_NUMBER; // +17059986143

// Simple in-memory WebSocket connections storage
const wsConnections = new Set<WebSocket>();

// Function to broadcast events to connected WebSocket clients
function broadcastCallEvent(event: { type: string; name?: string; phone?: string; callId?: string }) {
  const message = JSON.stringify(event);
  for (const ws of wsConnections) {
    try {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    } catch {
      wsConnections.delete(ws);
    }
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Log the webhook event data
    console.log('Received Telnyx webhook:', body.data?.event_type, body.data?.payload?.call_control_id);
    
    // Extract the event type from the webhook payload
    const eventType = body.data?.event_type;
    const callControlId = body.data?.payload?.call_control_id;
    const payload = body.data?.payload;
    
    // For answering machine detection result
    let detectionResult: string | undefined;
    
    // Process different call events
    switch (eventType) {
      case 'call.initiated': {
        console.log('Call initiated:', callControlId);
        await logCallEvent(callControlId, 'initiated', payload);
        
        // Check if this is an incoming call to our specific number
        const toNumber = payload?.to?.replace(/\D/g, ''); // Remove non-digits
        const fromNumber = payload?.from;
        const isIncomingCall = payload?.direction === 'incoming' || 
                              (toNumber && toNumber.includes('7059986143'));
        
        if (isIncomingCall) {
          console.log('Incoming call detected to:', INCOMING_CALL_NUMBER, 'from:', fromNumber);
          
          // Broadcast incoming call event via WebSocket
          broadcastCallEvent({
            type: 'incoming_call',
            name: 'Unknown Caller',
            phone: fromNumber,
            callId: callControlId
          });
          
          // Automatically answer and start recording for incoming calls
          if (callControlId) {
            try {
              await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${TELNYX_API_KEY}`
                },
                body: JSON.stringify({ 
                  record: 'record-from-answer',
                  answering_machine_detection: 'premium',
                  answering_machine_detection_config: {
                    total_analysis_time_millis: 5000,
                    after_greeting_silence_millis: 1000,
                    between_words_silence_millis: 1000,
                    greeting_duration_millis: 1000,
                    initial_silence_millis: 1000,
                    maximum_number_of_words: 1000,
                    maximum_word_length_millis: 2000,
                    silence_threshold: 512,
                    greeting_total_analysis_time_millis: 50000,
                    greeting_silence_duration_millis: 2000
                  }
                })
              });
              console.log('Incoming call answered and recording started');
            } catch (error) {
              console.error('Error answering/recording incoming call:', error);
            }
          }
        } else {
          // This is an outbound call
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
              console.log('Outbound call answered and recording started');
            } catch (error) {
              console.error('Error answering/recording outbound call:', error);
            }
          }
        }
        break;
      }

      case 'call.answered': {
        console.log('Call answered:', callControlId);
        await logCallEvent(callControlId, 'answered', payload);
        break;
      }

      case 'call.hangup': {
        console.log('Call hangup:', callControlId);
        await logCallEvent(callControlId, 'ended', payload);
        
        // Broadcast call ended event
        broadcastCallEvent({
          type: 'call_ended',
          callId: callControlId
        });
        break;
      }

      case 'call.machine.detection.ended': {
        // Handle answering machine detection
        detectionResult = body.data?.payload?.result;
        console.log('Answering machine detection:', detectionResult);

        if (detectionResult === 'machine') {
          console.log('Answering machine detected, leaving a message');
          // Logic for leaving a voicemail
          await logCallEvent(callControlId, 'machine-detection-machine', body.data?.payload);

          // Optional: Leave a message for answering machine
          if (callControlId) {
            await playAudio(callControlId, "This is an automated message from Clearsky. Please call us back at your convenience.");
          }
        } else if (detectionResult === 'human') {
          console.log('Human answered, connecting call');
          // Logic for human answer
          await logCallEvent(callControlId, 'machine-detection-human', body.data?.payload);
        }
        break;
      }

      case 'call.machine.premium.detection.ended': {
        // Handle premium answering machine detection
        detectionResult = body.data?.payload?.result;
        console.log('Premium answering machine detection:', detectionResult);

        if (detectionResult === 'machine') {
          console.log('Premium: Answering machine detected, leaving a message');
          await logCallEvent(callControlId, 'premium-machine-detection-machine', body.data?.payload);

          // Leave a message for answering machine
          if (callControlId) {
            await playAudio(callControlId, "This is an automated message from Clearsky. Please call us back at your convenience.");
          }
        } else if (detectionResult === 'human') {
          console.log('Premium: Human answered, connecting call');
          await logCallEvent(callControlId, 'premium-machine-detection-human', body.data?.payload);
        }
        break;
      }

      case 'call.machine.premium.greeting.ended': {
        // Handle when machine greeting ends (beep detected)
        console.log('Premium: Machine greeting ended, beep detected');
        await logCallEvent(callControlId, 'premium-greeting-ended', body.data?.payload);
        
        // This is the optimal time to start leaving a voicemail message
        if (callControlId) {
          await playAudio(callControlId, "Hello, this is an automated message from Clearsky. We tried to reach you regarding your inquiry. Please call us back at your earliest convenience. Thank you.");
        }
        break;
      }

      case 'call.recording.saved': {
        // Recording is available, save the URL(s)
        const recUrls = body.data?.payload?.recording_urls;
        const recId = body.data?.payload?.recording_id;
        console.log('Call recording saved:', recId, recUrls);
        if (callControlId && recUrls) {
          await pb.collection('call_recordings').create({
            call_id: callControlId,
            recording_id: recId,
            urls: JSON.stringify(recUrls),
            timestamp: new Date().toISOString()
          });
        }
        break;
      }

      default: {
        console.log('Unhandled event:', eventType);
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