import { Pool } from 'pg'
import { env } from '$env/dynamic/private'

// Create a pool for sending NOTIFY events
const notifyPool = new Pool({
  connectionString: env.DATABASE_URL,
})

/**
 * Send a PostgreSQL NOTIFY event for message updates
 */
export async function notifyMessageUpdate(
  companyId: string,
  action: 'create' | 'update' | 'delete',
  messageId: string,
  threadId?: string
) {
  try {
    const client = await notifyPool.connect()
    const channel = `messages_${companyId.replace(/-/g, '_')}`
    const payload = JSON.stringify({
      action,
      messageId,
      threadId,
      timestamp: new Date().toISOString(),
    })

    await client.query(`NOTIFY ${channel}, '${payload.replace(/'/g, "''")}'`)
    client.release()
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}
