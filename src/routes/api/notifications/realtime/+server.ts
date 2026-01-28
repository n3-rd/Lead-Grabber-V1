import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { Pool } from 'pg'
import { env } from '$env/dynamic/private'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 1,
  ssl: env.DATABASE_SSL_NO_VERIFY === 'true' ? { rejectUnauthorized: false } : undefined,
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user?.company) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = locals.user.company.id
  const channel = `notifications_${companyId.replace(/-/g, '_')}`

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  let cleanup: (() => Promise<void>) | null = null
  const stream = new ReadableStream({
    async start(controller) {
      const client = await pool.connect()
      await client.query(`LISTEN ${channel}`)

      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      client.on('notification', (msg) => {
        try {
          const payload = JSON.parse(msg.payload || '{}')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch (err) {
          console.error('Error parsing notification payload:', err)
        }
      })

      cleanup = async () => {
        try {
          client.removeAllListeners('notification')
          await client.query(`UNLISTEN ${channel}`)
          client.release()
        } catch (err) {
          console.error('Error cleaning up notifications realtime:', err)
          client.release()
        }
      }
    },
    cancel() {
      return cleanup?.() ?? Promise.resolve()
    },
  })

  return new Response(stream, { headers })
}
