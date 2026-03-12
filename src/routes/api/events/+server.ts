import { addSSEConnection, removeSSEConnection } from '$lib/utils/sse';

export const GET = async () => {
	const stream = new ReadableStream({
		start(controller) {
			// Add this connection to our set
			addSSEConnection(controller);

			// Send initial connection message
			controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

			// Keep connection alive with periodic heartbeat
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
				} catch {
					clearInterval(heartbeat);
					removeSSEConnection(controller);
				}
			}, 30000);

			// Cleanup when connection is closed
			return () => {
				clearInterval(heartbeat);
				removeSSEConnection(controller);
			};
		},
		cancel() {
			// Connection was closed by client
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Cache-Control'
		}
	});
};
