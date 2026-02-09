import { prisma } from '$lib/db';
import type { PageServerLoad } from './$types';
import { isA2pCommLogEnabled } from '$lib/server/a2p-client';

export const load: PageServerLoad = async ({ locals, depends, fetch }) => {
  depends('app:communication-log');

  if (!locals.user || !locals.user.company) {
    return { logs: [], members: [], useA2pCommLog: false };
  }

  try {
    // A2P: fetch from our API (uses A2P_COMMLOG_API_URL if set, else A2P_DATABASE_URL)
    if (isA2pCommLogEnabled()) {
      const res = await fetch('/api/a2p/communication-log?limit=50');
      if (!res.ok) {
        console.error('A2P communication-log API failed:', res.status);
        return { logs: [], members: [], useA2pCommLog: true };
      }
      const data = await res.json();
      return {
        logs: Array.isArray(data.logs) ? data.logs : [],
        members: [],
        useA2pCommLog: true,
      };
    }

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
    });

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
    });

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
      useA2pCommLog: false,
    };
  } catch (err) {
    console.error('Error loading communication logs:', err);
    return { logs: [], members: [], useA2pCommLog: false };
  }
};
