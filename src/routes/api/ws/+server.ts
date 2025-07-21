import { Server } from 'ws';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This is a minimal WebSocket server for SvelteKit (Node.js only)
// You must run your app with an adapter that supports Node HTTP server (not static hosting)

let wss: Server | null = null;
let sockets: Set<any> = new Set();

export const GET: RequestHandler = async ({ request }) => {
  // @ts-ignore
  if (!request.socket?.server) {
    return json({ error: 'WebSocket server not available' }, { status: 500 });
  }

  if (!wss) {
    // @ts-ignore
    wss = new Server({ noServer: true });
    // @ts-ignore
    request.socket.server.on('upgrade', (req, socket, head) => {
      if (req.url === '/api/ws') {
        wss!.handleUpgrade(req, socket, head, (ws) => {
          wss!.emit('connection', ws, req);
        });
      }
    });
    wss.on('connection', (ws) => {
      sockets.add(ws);
      ws.on('close', () => sockets.delete(ws));
    });
  }

  return new Response(null, { status: 101 });
};

// Helper to broadcast to all clients
export function broadcastCallEvent(event: any) {
  for (const ws of sockets) {
    try {
      ws.send(JSON.stringify(event));
    } catch {}
  }
}
