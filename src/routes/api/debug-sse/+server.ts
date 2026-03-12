import { json } from '@sveltejs/kit';
import { broadcastCallEvent, getActiveSSEConnectionCount } from '$lib/utils/sse';

export const GET = async () => {
	const connectionCount = getActiveSSEConnectionCount();

	console.log(`📡 Debug SSE - Active connections: ${connectionCount}`);

	if (connectionCount === 0) {
		return json({
			success: false,
			error: 'No active SSE connections',
			connections: connectionCount,
			solution: 'Make sure a browser is connected to /api/events'
		});
	}

	// Broadcast a test incoming call
	broadcastCallEvent({
		type: 'incoming_call',
		name: 'Debug Test Caller',
		phone: '+15551234567',
		callId: 'debug-test-' + Date.now()
	});

	return json({
		success: true,
		message: 'Debug call event broadcasted',
		connections: connectionCount,
		event: {
			type: 'incoming_call',
			name: 'Debug Test Caller',
			phone: '+15551234567'
		},
		instructions: [
			'1. Check browser console for SSE messages',
			'2. Call dialog should appear if SSE is working',
			'3. If no dialog, check browser Network tab for /api/events'
		]
	});
};
