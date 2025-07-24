import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const body = await request.json();
    const fromNumber = body.from || '+15551234567';
    
    // Create a realistic Telnyx webhook payload for an incoming call
    const webhookPayload = {
      data: {
        event_type: 'call.initiated',
        id: `test-event-${Date.now()}`,
        occurred_at: new Date().toISOString(),
        payload: {
          call_control_id: `test-call-${Date.now()}`,
          call_leg_id: `test-leg-${Date.now()}`,
          call_session_id: `test-session-${Date.now()}`,
          direction: 'incoming',
          from: fromNumber,
          to: '+17059986143', // Your receiving number
          state: 'ringing',
          created_at: new Date().toISOString(),
          answered_at: null,
          bridged_at: null,
          hangup_at: null,
          hangup_cause: null,
          client_state: null
        },
        record_type: 'event'
      },
      meta: {
        attempt: 1,
        delivered_to: request.url
      }
    };
    
    console.log('🧪 Sending test call webhook:', webhookPayload);
    
    // Send the webhook to our call-webhook endpoint
    const webhookResponse = await fetch('/api/telnyx/call-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelnyxEvent/1.0'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const webhookResult = await webhookResponse.json();
    
    return json({
      success: true,
      message: 'Test call webhook sent successfully',
      testPayload: webhookPayload,
      webhookResponse: {
        status: webhookResponse.status,
        body: webhookResult
      },
      instructions: {
        description: 'This simulates an incoming call to +17059986143',
        expectedBehavior: [
          '1. Call dialog should appear in the UI',
          '2. Call should be auto-answered and recording started',
          '3. Premium answering machine detection should be enabled',
          '4. SSE event should be broadcasted to connected clients'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Test call error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, fetch }) => {
  // Allow GET requests for easy testing
  const fromNumber = url.searchParams.get('from') || '+15551234567';
  
  // Create a mock request object for the POST handler
  const mockRequest = {
    json: async () => ({ from: fromNumber }),
    url: url.toString()
  };
  
  // Call the POST handler with our mock request
  return await POST({
    request: mockRequest as Request,
    fetch
  } as Parameters<RequestHandler>[0]);
}; 