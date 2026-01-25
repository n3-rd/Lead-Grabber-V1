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

			return {
				date,
				time,
				type: log.direction === 'inbound' ? 'In' : 'Out',
				typeIcon: log.type, // email, sms, etc.
				source: log.source,
				endpoint: log.destination,
				purpose: log.metadata?.urgency
					? `Urgency: ${log.metadata.urgency}`
					: log.summary
						? 'See Summary'
						: 'General',
				purposeIsButton: false, // For now, just show text
				summary: log.summary || log.content || 'No content',
				commId: log.id,
				status: log.direction === 'inbound' ? 'in' : 'out',
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

<div class="w-full min-w-0 overflow-x-auto">
	<!-- Main Container -->
	<div class="m-4 min-w-[1282px]">
		<CommunicationTable
			communications={tableCommunications}
			{filters}
			onSummaryClick={handleSummaryClick}
			onActionClick={handleActionClick}
			onAssignClick={handleAssignClick}
			showAssignButton={true}
		/>
	</div>
</div>

{#if selectedComm}
	<CommunicationSummaryDialog
		bind:open={summaryDialogOpen}
		commId={selectedComm.commId || selectedComm.raw?.id || ''}
		date={selectedComm.date}
		time={selectedComm.time}
		category={selectedComm.purpose?.split(' | ')[0] || 'Sales'}
		subCategory={selectedComm.purpose?.split(' | ')[1] || 'Inquiry'}
		email={selectedComm.source}
		subject={selectedComm.raw?.metadata?.subject || selectedComm.raw?.subject || 'No subject'}
		body={selectedComm.raw?.content || selectedComm.summary || ''}
		summary={selectedComm.summary}
		tasks={selectedComm.raw?.metadata?.tasks || []}
	/>
{/if}

<NotificationsDialog bind:open={notificationsDialogOpen} />

<AssignAgentDialog
	bind:open={assignDialogOpen}
	endpointName={selectedEndpoint || ''}
	agents={data.members?.map(m => m.name) || []}
	preSelectedAgents={preSelectedAgents}
	onAssign={async (selectedAgentNames) => {
		if (!data.members) return;

		// Map agent names back to member IDs
		const selectedMemberIds = data.members
			.filter(m => selectedAgentNames.includes(m.name))
			.map(m => m.id);

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
