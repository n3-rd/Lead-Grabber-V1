import type { PrismaClient } from '@prisma/client';

const DAY_MAP: Record<number, string> = {
	0: 'Sun',
	1: 'Mon',
	2: 'Tue',
	3: 'Wed',
	4: 'Thu',
	5: 'Fri',
	6: 'Sat'
};

function parseTime(s: string): number | null {
	if (!s || typeof s !== 'string') return null;
	const trimmed = s.trim();
	const parts = trimmed.split(/[:\s]+/);
	if (parts.length < 2) return null;
	let h = parseInt(parts[0], 10);
	const m = parseInt(parts[1], 10);
	if (Number.isNaN(h) || Number.isNaN(m)) return null;
	const suffix = (parts[2] ?? '').toLowerCase();
	if (suffix === 'pm' || suffix === 'p') {
		if (h < 12) h += 12;
	} else if (suffix === 'am' || suffix === 'a') {
		if (h === 12) h = 0;
	}
	return h * 60 + m;
}

function isWithinSchedule(
	schedule: Record<string, { start?: string; end?: string } | null>,
	day: string,
	minutesSinceMidnight: number
): boolean {
	const daySchedule = schedule[day];
	if (daySchedule == null || typeof daySchedule !== 'object') return false;
	const start = daySchedule.start;
	const end = daySchedule.end;
	if (!start || !end) return false;
	const startMin = parseTime(start);
	const endMin = parseTime(end);
	if (startMin == null || endMin == null) return false;
	if (startMin <= endMin) return minutesSinceMidnight >= startMin && minutesSinceMidnight <= endMin;
	return minutesSinceMidnight >= startMin || minutesSinceMidnight <= endMin;
}

export async function getActiveCallFlow(
	prisma: PrismaClient,
	companyId: string,
	now: Date = new Date()
): Promise<{ flow: { id: string; title: string; greetingAudioUrl: string | null }; rule: { id: string; ruleTitle: string; promptsAudioUrl: string | null; keyPrompts: unknown; failoverCount: number; failoverDelayMinutes: number; failoverAudioUrl: string | null; hangupAudioUrl: string | null } } | null> {
	const flows = await prisma.callFlow.findMany({
		where: { companyId },
		include: { rules: true },
		orderBy: { updated: 'desc' }
	});
	const day = DAY_MAP[now.getDay()];
	const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
	for (const flow of flows) {
		for (const rule of flow.rules) {
			const schedule = rule.schedule as Record<string, { start?: string; end?: string } | null> | null;
			if (!schedule) continue;
			if (isWithinSchedule(schedule, day, minutesSinceMidnight)) {
				return {
					flow: {
						id: flow.id,
						title: flow.title,
						greetingAudioUrl: flow.greetingAudioUrl
					},
					rule: {
						id: rule.id,
						ruleTitle: rule.ruleTitle,
						promptsAudioUrl: rule.promptsAudioUrl,
						keyPrompts: rule.keyPrompts,
						failoverCount: rule.failoverCount,
						failoverDelayMinutes: rule.failoverDelayMinutes,
						failoverAudioUrl: rule.failoverAudioUrl,
						hangupAudioUrl: rule.hangupAudioUrl
					}
				};
			}
		}
	}
	return null;
}

export function toAbsoluteAudioUrl(path: string | null | undefined, baseUrl: string): string | null {
	if (!path) return null;
	if (path.startsWith('http')) return path;
	const base = baseUrl.replace(/\/$/, '');
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${base}${p}`;
}
