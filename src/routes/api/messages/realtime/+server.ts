import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { Pool } from 'pg'
import { env } from '$env/dynamic/private'

// Create a separate connection pool for LISTEN/NOTIFY
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Use a separate connection for LISTEN/NOTIFY
  max: 1,
})

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user || !locals.user.company) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = locals.user.company.id

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const stream = new ReadableStream({
    async start(controller) {
      const client = await pool.connect()

      // Listen for notifications on a channel specific to this company
      await client.query(`LISTEN messages_${companyId.replace(/-/g, '_')}`)

      // Send initial connection message
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      // Handle notifications
      client.on('notification', (msg) => {
        try {
          const payload = JSON.parse(msg.payload || '{}')
          const data = `data: ${JSON.stringify(payload)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (err) {
          console.error('Error parsing notification:', err)
        }
      })

      // Handle client disconnect
      const cleanup = async () => {
        try {
          client.removeAllListeners('notification')
          await client.query(`UNLISTEN messages_${companyId.replace(/-/g, '_')}`)
          client.release()
        } catch (err) {
          console.error('Error cleaning up realtime connection:', err)
          client.release()
        }
      }

      // Clean up on stream close
      controller.close = cleanup
    },
  })

  return new Response(stream, { headers })
}
