import { prisma } from '$lib/db'
import { Pool } from 'pg'
import { env } from '$env/dynamic/private'

const notifyPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL_NO_VERIFY === 'true' ? { rejectUnauthorized: false } : undefined,
})

export type NotificationType =
  | 'email'
  | 'sms'
  | 'voice'
  | 'web'
  | 'facebook'
  | 'chatbot'
  | 'leadform'
  | 'leadbox'
export type NotificationDirection = 'inbound' | 'outbound'

export interface CreateNotificationInput {
  company_id: string
  type: NotificationType
  direction: NotificationDirection
  source_name?: string
  source_identifier?: string // phone, email, threadId
  message_preview: string
  content?: string
  communication_log_id?: string
  message_id?: string
  thread_id?: string
}

/**
 * Create a notification and broadcast it to SSE/realtime listeners for the company.
 * Call this whenever a communication is logged or an inbox message is sent/received.
 * Requires: run `pnpm prisma migrate deploy` so the `notifications` table exists.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    if (!prisma?.notification) return null
    const notification = await prisma.notification.create({
      data: {
        companyId: input.company_id,
        type: input.type,
        direction: input.direction,
        sourceName: input.source_name ?? null,
        sourceIdentifier: input.source_identifier ?? null,
        messagePreview: input.message_preview,
        content: input.content ?? null,
        communicationLogId: input.communication_log_id ?? null,
        messageId: input.message_id ?? null,
        threadId: input.thread_id ?? null,
      },
    })
    await broadcastNotification(input.company_id, notification.id, {
      sourceName: input.source_name ?? input.source_identifier ?? null,
      messagePreview: input.message_preview,
    })
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.log('Notification created:', notification.id, input.type, input.source_name ?? input.source_identifier ?? '')
    }
    return notification
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
    if (code !== 'P2021') console.error('Failed to create notification:', err)
    return null
  }
}

/**
 * Broadcast a new notification to company's realtime channel (PG NOTIFY).
 * Used so the notifications page can LISTEN and append new items.
 */
export async function broadcastNotification(
  companyId: string,
  notificationId: string,
  extra?: { sourceName?: string | null; messagePreview?: string }
) {
  try {
    const client = await notifyPool.connect()
    const channel = `notifications_${companyId.replace(/-/g, '_')}`
    const payload = JSON.stringify({
      type: 'notification',
      notificationId,
      timestamp: new Date().toISOString(),
      ...(extra && { sourceName: extra.sourceName ?? undefined, messagePreview: extra.messagePreview }),
    })
    await client.query(`NOTIFY ${channel}, '${payload.replace(/'/g, "''")}'`)
    client.release()
  } catch (error) {
    console.error('Error broadcasting notification:', error)
  }
}
