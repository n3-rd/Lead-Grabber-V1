import { prisma } from '$lib/db'
import { createNotification } from '$lib/utils/notifications'

export type CommunicationType = 'email' | 'sms' | 'voice' | 'web' | 'facebook' | 'chatbot' | 'leadform' | 'leadbox'
export type CommunicationDirection = 'inbound' | 'outbound'
export type CommunicationStatus = 'success' | 'failed' | 'pending' | 'missed' | 'completed'

export interface CommunicationLogEntry {
  type: CommunicationType
  direction: CommunicationDirection
  status: CommunicationStatus
  source?: string
  destination?: string
  customer_id?: string
  company_id?: string
  user_id?: string
  summary?: string
  content?: string
  duration?: number
  metadata?: Record<string, any>
  assigned_members?: string[]
}

/**
 * Logs a communication event to the database.
 * @param entry The communication log entry details
 * @returns The created record or null if logging failed
 */
export async function logCommunication(entry: CommunicationLogEntry) {
  try {
    // Convert assigned_members array to relation if provided
    const data: any = {
      type: entry.type,
      direction: entry.direction,
      status: entry.status,
      source: entry.source || null,
      destination: entry.destination || null,
      customerId: entry.customer_id || null,
      companyId: entry.company_id || null,
      userId: entry.user_id || null,
      summary: entry.summary || null,
      content: entry.content || null,
      duration: entry.duration || null,
      metadata: entry.metadata || null,
    }

    const record = await prisma.communicationLog.create({
      data,
    })

    // Handle assigned members if provided
    if (entry.assigned_members && entry.assigned_members.length > 0) {
      await prisma.communicationLogAssignedMember.createMany({
        data: entry.assigned_members.map((userId) => ({
          communicationLogId: record.id,
          userId,
        })),
        skipDuplicates: true,
      })
    }

    // Show notification for every communication log
    if (entry.company_id) {
      await createNotification({
        company_id: entry.company_id,
        type: entry.type,
        direction: entry.direction,
        source_name: entry.source ?? undefined,
        source_identifier: entry.destination ?? undefined,
        message_preview: (entry.summary ?? entry.content ?? '').slice(0, 120) + ((entry.summary ?? entry.content ?? '').length > 120 ? '...' : ''),
        content: entry.content ?? undefined,
        communication_log_id: record.id,
        thread_id: (entry.metadata as { thread_id?: string })?.thread_id,
      })
    }

    return record
  } catch (err) {
    console.error('Failed to log communication:', err)
    // We don't want to throw here to prevent disrupting the main flow
    return null
  }
}
