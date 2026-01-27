import { prisma } from '$lib/db'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, depends }) => {
  depends('app:communication-log')

  if (!locals.user || !locals.user.company) {
    return { logs: [], members: [] }
  }

  try {
    const logs = await prisma.communicationLog.findMany({
      where: {
        companyId: locals.user.company.id,
      },
      take: 50,
      orderBy: {
        created: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Load company members for assignment
    const members = await prisma.companyMember.findMany({
      where: {
        companyId: locals.user.company.id,
        status: 'active',
      },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created: 'desc',
      },
    })

    return {
      logs: logs.map((log) => ({
        id: log.id,
        type: log.type,
        direction: log.direction,
        status: log.status,
        source: log.source,
        destination: log.destination,
        summary: log.summary,
        content: log.content,
        duration: log.duration,
        metadata: log.metadata,
        created: log.created,
        updated: log.updated,
        expand: {
          user_id: log.user,
          customer_id: log.customer,
          assigned_members: log.assignedMembers.map((am) => am.user),
        },
      })),
      members: members.map((member) => ({
        id: member.user.id,
        name: member.user.name || member.user.email || 'Unknown',
        email: member.user.email || '',
        role: member.role,
      })),
    }
  } catch (err) {
    console.error('Error loading communication logs:', err)
    return { logs: [], members: [] }
  }
}
