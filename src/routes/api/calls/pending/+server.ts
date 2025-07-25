import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPendingCall, removePendingCall } from '$lib/utils/callStore';

export const GET: RequestHandler = async () => {
  const pendingCall = getPendingCall();
  
  if (pendingCall) {
    // Return the call and mark it as retrieved (but don't remove yet)
    return json({
      hasCall: true,
      call: {
        id: pendingCall.id,
        name: pendingCall.name,
        phone: pendingCall.phone,
        callId: pendingCall.callId
      }
    });
  }
  
  return json({ hasCall: false });
};

export const DELETE: RequestHandler = async ({ url }) => {
  const callId = url.searchParams.get('id');
  
  if (callId) {
    const removed = removePendingCall(callId);
    return json({ success: removed });
  }
  
  return json({ success: false, error: 'Missing call ID' });
}; 