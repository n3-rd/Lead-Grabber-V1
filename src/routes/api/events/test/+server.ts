import { json } from '@sveltejs/kit';
import { broadcastCallEvent } from '$lib/utils/sse';

export const GET = async () => {
  // Test SSE broadcasting
  broadcastCallEvent({
    type: 'incoming_call',
    name: 'Test Caller',
    phone: '+15551234567',
    callId: 'test-manual-trigger'
  });

  return json({
    success: true,
    message: 'Test incoming call event broadcasted',
    instructions: 'Check your browser console and UI for the call dialog'
  });
}; 