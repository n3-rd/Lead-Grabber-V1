// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

// Function to add an SSE connection
export function addSSEConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

// Function to remove an SSE connection
export function removeSSEConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
}

// Function to broadcast events to all connected clients
export function broadcastCallEvent(event: { type: string; name?: string; phone?: string; callId?: string }) {
  const data = JSON.stringify(event);
  console.log('Broadcasting SSE event:', event);
  
  for (const controller of connections) {
    try {
      controller.enqueue(`data: ${data}\n\n`);
    } catch {
      // Remove failed connections
      connections.delete(controller);
    }
  }
}

// Function to get the count of active connections
export function getActiveSSEConnectionCount(): number {
  return connections.size;
} 