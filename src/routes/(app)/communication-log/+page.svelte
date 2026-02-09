<script lang="ts">
	import {
		Search,
		Mail,
		Info,
		MessageSquare,
		Phone,
		Globe,
		Facebook,
		Bot,
		FileText
	} from 'lucide-svelte';
	import CommunicationTable from '$lib/components/CommunicationTable.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
	import CommunicationSummaryDialog from '$lib/components/communication-summary-dialog.svelte';
	import NotificationsDialog from '$lib/components/notifications/notifications-dialog.svelte';
	import AssignAgentDialog from '$lib/components/assign-agent-dialog.svelte';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let selectedFilter = $state('All');
	const filters = ['All', 'Email', 'SMS', 'Voice', 'Web', 'Facebook', 'Chatbot', 'Leadform', 'Leadbox'];
	let searchQuery = $state('');

	let summaryDialogOpen = $state(false);
	let selectedComm = $state<(typeof communications)[0] | null>(null);
	let notificationsDialogOpen = $state(false);
	let assignDialogOpen = $state(false);
	let selectedEndpoint = $state<string | null>(null);
	let selectedCommId = $state<string | null>(null);
	let preSelectedAgents = $state<string[]>([]);

	let { data } = $props<{
		data: {
			logs: any[];
			members?: Array<{
				id: string;
				name: string;
				email: string;
				role: string;
			}>;
			useA2pCommLog?: boolean;
		};
	}>();

	// Transform API data to UI format
	let communications = $derived(
		data.logs?.map((log: any) => {
			const dateObj = new Date(log.created);
			const date = dateObj.toLocaleDateString('en-US', {
				month: 'short',
				day: '2-digit',
				year: 'numeric'
			});
			const time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

			// Get assigned member names from expanded assigned_members
			// assigned_members is a relation to users, so when expanded we get user objects
			const assignedMembers = Array.isArray(log.expand?.assigned_members) 
				? log.expand.assigned_members 
				: (log.expand?.assigned_members ? [log.expand.assigned_members] : []);
			const assignedMemberNames = assignedMembers
				.map((user: any) => user?.name || user?.email || '')
				.filter(Boolean);

			// Urgency: use urgency_gpt (1–5) only; high → red, mid → blue, low → green
			const meta = log.metadata || {};
			const urgencyGpt = typeof meta.urgency_gpt === 'number' ? meta.urgency_gpt : null;
			const status: string =
				urgencyGpt !== null
					? urgencyGpt >= 4
						? 'red'
						: urgencyGpt >= 3
							? 'blue'
							: 'green'
					: log.direction === 'inbound'
						? 'in'
						: 'out';
			// Purpose: category_gpt or legacy intent/sentiment; prefix "Urgent " when urgency_gpt >= 4
			const cap = (s: string) => (s ?? '').charAt(0).toUpperCase() + (s ?? '').slice(1).toLowerCase();
			const urgentPrefix = urgencyGpt !== null && urgencyGpt >= 4 ? 'Urgent ' : '';
			let purpose: string;
			if (meta.category_gpt) {
				purpose = urgentPrefix + cap(meta.category_gpt);
			} else if (meta.intent || meta.sentiment) {
				const word = meta.intent ? cap(meta.intent) : meta.sentiment ? cap(meta.sentiment) : 'General';
				purpose = urgentPrefix + word;
			} else {
				purpose = log.summary ? urgentPrefix + 'See Summary' : urgentPrefix + 'General';
			}

			return {
				date,
				time,
				type: log.direction === 'inbound' ? 'In' : 'Out',
				typeIcon: log.type,
				source: log.source,
				endpoint: log.destination,
				purpose,
				purposeIsButton: false,
				summary: log.summary || log.content || 'No content',
				commId: log.id,
				status,
				assignedMemberNames,
				raw: log
			};
		}) || []
	);

	// Transform to CommunicationTable format
	let tableCommunications = $derived(
		communications.map((c: any) => ({
			id: c.commId || c.raw?.id || '',
			date: c.date,
			time: c.time,
			type: c.typeIcon as any,
			typeIcon: c.typeIcon,
			direction: c.type as "In" | "Out",
			source: c.source,
			endpoint: c.endpoint,
			purpose: c.purpose,
			summary: c.summary,
			commId: c.commId,
			status: c.status as any,
			assignedMemberNames: c.assignedMemberNames,
			raw: c.raw
		}))
	);

	function handleSummaryClick(comm: any) {
		// Use the transformed comm object, not raw, so we have all the formatted fields
		selectedComm = comm;
		summaryDialogOpen = true;
	}

	function handleActionClick(action: string, comm: any) {
		console.log('Action:', action, 'for comm:', comm);
		// Handle actions
	}

	function handleAssignClick(comm: any) {
		selectedEndpoint = comm.endpoint;
		selectedCommId = comm.commId;
		preSelectedAgents = comm.assignedMemberNames || [];
		assignDialogOpen = true;
	}
</script>

<div class="w-full min-w-0 p-4">
	<div class="min-w-0">
		<CommunicationTable
			communications={tableCommunications}
			{filters}
			onSummaryClick={handleSummaryClick}
			onActionClick={handleActionClick}
			onAssignClick={handleAssignClick}
			showAssignButton={!data.useA2pCommLog}
		/>
	</div>
</div>

{#if selectedComm}
	{@const meta = selectedComm.raw?.metadata ?? {}}
	{@const hasRecordingId = selectedComm.raw?.type === 'voice' && meta.recording_id}
	{@const recordingUrl = hasRecordingId
		? `/api/recording/${selectedComm.commId || selectedComm.raw?.id}`
		: (typeof meta.recording_urls === 'object' && meta.recording_urls !== null
			? (meta.recording_urls.mp3 ?? meta.recording_urls.m4a ?? Object.values(meta.recording_urls).find((v) => typeof v === 'string' && v.startsWith('http')))
			: meta.voicemail_url ?? null)}
	<CommunicationSummaryDialog
		bind:open={summaryDialogOpen}
		commId={selectedComm.commId || selectedComm.raw?.id || ''}
		date={selectedComm.date}
		time={selectedComm.time}
		category={meta.category_gpt ? (meta.category_gpt as string).charAt(0).toUpperCase() + (meta.category_gpt as string).slice(1) : (meta.sentiment ?? 'sales').charAt(0).toUpperCase() + (meta.sentiment ?? 'sales').slice(1)}
		subCategory={meta.subcat_gpt ? (meta.subcat_gpt as string).charAt(0).toUpperCase() + (meta.subcat_gpt as string).slice(1) : ((meta.intent as string) ?? 'Inquiry').charAt(0).toUpperCase() + ((meta.intent as string) ?? 'Inquiry').slice(1)}
		sourceLabel={selectedComm.raw?.type === 'voice' ? 'Phone' : 'Email Address'}
		email={selectedComm.source ?? ''}
		subject={selectedComm.raw?.metadata?.subject || selectedComm.raw?.subject || 'No subject'}
		body={selectedComm.raw?.content || selectedComm.summary || ''}
		summary={selectedComm.summary}
		tasks={meta.actionItems ?? meta.tasks ?? []}
		recordingUrl={recordingUrl}
	/>
{/if}

<NotificationsDialog bind:open={notificationsDialogOpen} />

<AssignAgentDialog
	bind:open={assignDialogOpen}
	endpointName={selectedEndpoint || ''}
	agents={data.members?.map((m: { name: string }) => m.name) || []}
	preSelectedAgents={preSelectedAgents}
	onAssign={async (selectedAgentNames) => {
		if (!data.members) return;

		const selectedMemberIds = data.members
			.filter((m: { name: string }) => selectedAgentNames.includes(m.name))
			.map((m: { id: string }) => m.id);

		if (selectedMemberIds.length === 0) {
			toast.error('No members selected');
			return;
		}

		try {
			// If a specific log ID is selected, assign only that log
			// Otherwise, fall back to endpoint-based assignment
			const requestBody = selectedCommId
				? { logIds: [selectedCommId], memberIds: selectedMemberIds }
				: selectedEndpoint
					? { endpoint: selectedEndpoint, memberIds: selectedMemberIds }
					: null;

			if (!requestBody) {
				toast.error('No log or endpoint selected');
				return;
			}

			const response = await fetch('/api/communication-logs/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message || 'Members assigned successfully');
				await invalidateAll();
			} else {
				toast.error(result.error || 'Failed to assign members');
			}
		} catch (error) {
			console.error('Error assigning members:', error);
			toast.error('Failed to assign members');
		}
	}}
/>
