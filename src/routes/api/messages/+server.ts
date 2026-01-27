import { prisma } from '$lib/db'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { notifyMessageUpdate } from '$lib/utils/realtime'
import { getLogsForMessage } from '$lib/utils/inbox-log-link'
import { logCommunication } from '$lib/utils/communication-log'
import { createOrUpdateContact } from '$lib/utils/contacts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/** Leadbox/leadform embed submit — no auth, validated by company_id. */
export const POST: RequestHandler = async ({ request }) => {
  if (request.headers.get('content-type')?.includes('application/json') === false) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
  try {
    const body = await request.json()
    const companyId = body.company_id ?? body.company?.id
    const threadId = String(body.thread_id ?? '').trim() || `leadbox-${crypto.randomUUID()}`
    const customerName = body.customer_name ?? 'Anonymous'
    const customerPhone = body.customer_phone ?? null
    const customerEmail = body.customer_email ?? null
    const messageContent = typeof body.message === 'string' ? body.message : ''
    const source = body.source ?? 'leadbox'

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'company_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return new Response(JSON.stringify({ error: 'Invalid company or user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const newItem = {
      content: messageContent,
      timestamp: new Date().toISOString(),
      is_agent_reply: false,
    }
    const existing = await prisma.message.findUnique({ where: { threadId } })
    let message
    if (existing && existing.companyId === companyId) {
      const prev = Array.isArray(existing.messages) ? existing.messages : []
      message = await prisma.message.update({
        where: { id: existing.id },
        data: {
          messages: [...prev, newItem],
          status: 'new',
          customerName: customerName || existing.customerName,
          customerPhone: customerPhone ?? existing.customerPhone,
          customerEmail: customerEmail ?? existing.customerEmail,
          updated: new Date(),
        },
      })
    } else {
      message = await prisma.message.create({
        data: {
          threadId,
          companyId,
          customerName: customerName || null,
          customerPhone,
          customerEmail,
          status: 'new',
          messages: [newItem],
        },
      })
    }

    const contact =
      customerPhone || customerEmail || customerName !== 'Anonymous'
        ? await createOrUpdateContact({
            company_id: companyId,
            name: customerName !== 'Anonymous' ? customerName : undefined,
            phone: customerPhone ?? undefined,
            email: customerEmail ?? undefined,
          })
        : null

    await logCommunication({
      type: source === 'leadform' ? 'leadform' : 'leadbox',
      direction: 'inbound',
      status: 'success',
      source: customerPhone || customerEmail || threadId,
      destination: null,
      company_id: companyId,
      customer_id: contact?.id ?? undefined,
      summary: messageContent.slice(0, 80) + (messageContent.length > 80 ? '...' : ''),
      content: messageContent,
      metadata: { thread_id: threadId },
    })

    await notifyMessageUpdate(companyId, 'update', message.id, message.threadId)

    return new Response(JSON.stringify(message), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (e) {
    console.error('POST /api/messages error:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Failed to create message' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }
}

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user || !locals.user.company) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const page = parseInt(url.searchParams.get('page') || '1')
  const perPage = parseInt(url.searchParams.get('perPage') || '20')
  const threadId = url.searchParams.get('threadId')

  try {
    if (threadId) {
      // Get specific thread
      const thread = await prisma.message.findUnique({
        where: { threadId },
      })

      if (!thread || thread.companyId !== locals.user.company.id) {
        return json({ error: 'Thread not found' }, { status: 404 })
      }

      return json(thread)
    } else {
      // Get list of messages
      const skip = (page - 1) * perPage
      const messages = await prisma.message.findMany({
        where: {
          companyId: locals.user.company.id,
        },
        skip,
        take: perPage,
        orderBy: {
          updated: 'desc',
        },
      })

      const total = await prisma.message.count({
        where: {
          companyId: locals.user.company.id,
        },
      })

      return json({
        items: messages,
        page,
        perPage,
        totalItems: total,
        totalPages: Math.ceil(total / perPage),
      })
    }
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return json({ error: error.message || 'Failed to fetch messages' }, { status: 500 })
  }
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || !locals.user.company) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Verify message belongs to user's company
    const existing = await prisma.message.findUnique({
      where: { id },
    })

    if (!existing || existing.companyId !== locals.user.company.id) {
      return json({ error: 'Message not found' }, { status: 404 })
    }

    const newAssignedToId = updateData.assigned_to !== undefined ? updateData.assigned_to : existing.assignedToId
    const companyId = locals.user.company!.id

    async function syncLogAssignment(msg: typeof existing, assignedToId: string | undefined) {
      const logs = await getLogsForMessage(prisma, msg, companyId)
      const memberIds = assignedToId ? [assignedToId] : []
      for (const log of logs) {
        await prisma.communicationLogAssignedMember.deleteMany({
          where: { communicationLogId: log.id },
        })
        if (memberIds.length > 0) {
          await prisma.communicationLogAssignedMember.createMany({
            data: memberIds.map((userId) => ({ communicationLogId: log.id, userId })),
            skipDuplicates: true,
          })
        }
      }
    }

    // Handle messages array update
    if (updateData.messages) {
      const updated = await prisma.message.update({
        where: { id },
        data: {
          messages: updateData.messages,
          status: updateData.status || existing.status,
          assignedToId: newAssignedToId,
          urgency: updateData.urgency || existing.urgency,
        },
      })
      await syncLogAssignment(updated, newAssignedToId ?? undefined)
      await notifyMessageUpdate(existing.companyId, 'update', id, updated.threadId)
      return json(updated)
    } else {
      const updated = await prisma.message.update({
        where: { id },
        data: {
          status: updateData.status,
          assignedToId: updateData.assigned_to,
          urgency: updateData.urgency,
        },
      })
      await syncLogAssignment(updated, updated.assignedToId ?? undefined)
      await notifyMessageUpdate(existing.companyId, 'update', id, updated.threadId)
      return json(updated)
    }
  } catch (error: any) {
    console.error('Error updating message:', error)
    return json({ error: error.message || 'Failed to update message' }, { status: 500 })
  }
}
