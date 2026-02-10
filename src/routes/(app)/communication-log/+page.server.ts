import { prisma } from '$lib/db';
import type { PageServerLoad } from './$types';
import { isA2pCommLogEnabled } from '$lib/server/a2p-client';

const PAGE_SIZES = [10, 20, 50, 100] as const;

export const load: PageServerLoad = async ({ locals, depends, fetch, url }) => {
  depends('app:communication-log');

  if (!locals.user || !locals.user.company) {
    return { logs: [], members: [], useA2pCommLog: false, totalCount: 0, limit: 20, page: 1 };
  }

  const limitParam = url.searchParams.get('limit');
  const limit = PAGE_SIZES.includes(Number(limitParam) as (typeof PAGE_SIZES)[number])
    ? Number(limitParam)
    : 20;
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const offset = (page - 1) * limit;

  try {
    // Company members for agent picker (same as settings/company)
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
    const membersForPicker = members.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email || 'Unknown',
      email: m.user.email || '',
      role: m.role,
    }));

    // A2P: fetch from our API (uses A2P_COMMLOG_API_URL if set, else A2P_DATABASE_URL)
    if (isA2pCommLogEnabled()) {
      const res = await fetch(`/api/a2p/communication-log?limit=${limit}&offset=${offset}`);
      if (!res.ok) {
        console.error('A2P communication-log API failed:', res.status);
        return { logs: [], members: membersForPicker, useA2pCommLog: true, totalCount: null, limit, page };
      }
      const data = await res.json();
      return {
        logs: Array.isArray(data.logs) ? data.logs : [],
        members: membersForPicker,
        useA2pCommLog: true,
        totalCount: data.totalCount ?? null,
        limit,
        page,
      };
    }

    const [totalCount, logs] = await Promise.all([
      prisma.communicationLog.count({
        where: { companyId: locals.user.company.id },
      }),
      prisma.communicationLog.findMany({
        where: {
          companyId: locals.user.company.id,
        },
        take: limit,
        skip: offset,
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
    }),
    ]);

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
      members: membersForPicker,
      useA2pCommLog: false,
      totalCount,
      limit,
      page,
    };
  } catch (err) {
    console.error('Error loading communication logs:', err);
    return { logs: [], members: [], useA2pCommLog: false, totalCount: 0, limit: 20, page: 1 };
  }
};
