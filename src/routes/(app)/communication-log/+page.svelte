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
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
	import CommunicationSummaryDialog from '$lib/components/communication-summary-dialog.svelte';
	import NotificationsDialog from '$lib/components/notifications/notifications-dialog.svelte';
	import AssignAgentDialog from '$lib/components/assign-agent-dialog.svelte';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let selectedFilter = $state('All');
	const filters = ['All', 'Email', 'SMS', 'Voice', 'Web', 'Facebook', 'Chatbot', 'Leadform'];

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

	let filteredCommunications = $derived(
		selectedFilter === 'All'
			? communications
			: communications.filter(
					(c: any) => c.typeIcon?.toLowerCase() === selectedFilter.toLowerCase()
				)
	);

	function getStatusColor(status: string): string {
		switch (status) {
			case 'out':
				return '#FB2C36';
			case 'in':
				return '#00C951';
			default:
				return '#4A4A4A';
		}
	}
</script>

<div class="w-full min-w-0 overflow-x-auto">
	<!-- Main Container -->
	<div class="m-4 min-w-[1282px] rounded border border-[#ABABAB] bg-white p-0">
		<!-- Top Section: Filters and Search -->
		<div class="flex items-center justify-between border-b border-[#ABABAB] px-4 py-4">
			<!-- Filter Buttons -->
			<div class="flex flex-shrink-0 items-center gap-4">
				{#each filters as filter}
					<button
						onclick={() => (selectedFilter = filter)}
						class="whitespace-nowrap rounded px-4 py-2.5 font-sans text-base font-medium leading-[1.29] transition-colors {selectedFilter ===
						filter
							? 'bg-[#0F172A] font-bold text-white'
							: 'text-[#555555] hover:bg-gray-50'}"
					>
						{filter}
					</button>
				{/each}
			</div>

			<!-- Search Bar -->
			<div
				class="relative flex h-[43px] w-[349px] flex-shrink-0 items-center gap-2 rounded border-[0.5px] border-[#ADADAD] bg-white px-3"
			>
				<Search class="h-[18px] w-[18px] flex-shrink-0 text-[#555555]" />
				<input
					type="text"
					placeholder="Search communications..."
					class="flex-1 font-sans text-sm font-light leading-[1.29] text-[rgba(85,85,85,0.53)] outline-none placeholder:text-[rgba(85,85,85,0.53)]"
				/>
				<div class="h-4 w-px bg-[#ADADAD]"></div>
				<button class="flex h-4 w-3 items-center justify-center" aria-label="Filter">
					<svg
						width="12"
						height="16"
						viewBox="0 0 12 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path d="M6 0L11.1962 4H8V14H4V4H0.803848L6 0Z" fill="#555555" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Table -->
		<div class="w-full">
			<!-- Table Header -->
			<div
				class="flex h-[46px] w-full min-w-[1280px] items-center rounded-t-[4px] border-b border-[#ABABAB] bg-[#F3F3F3] px-4"
			>
				<div class="flex w-[140px] items-center gap-2">
					<Info class="h-4 w-4 text-[#555555]" />
					<span class="font-sans text-xs font-semibold leading-[1.29] text-[#555555]">DATE</span>
				</div>
				<div class="w-[120px] font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
					TYPE
				</div>
				<div class="w-[160px] font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
					SOURCE
				</div>
				<div class="w-[160px] font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
					ENDPOINT
				</div>
				<div class="w-[140px] font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
					PURPOSE
				</div>
				<div class="w-[120px] font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
					SUMMARY
				</div>
				<div class="w-[120px] font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
					COMM ID
				</div>
				<div class="flex-1 font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
					ACTIONS
				</div>
			</div>

			<!-- Table Body -->
			<div class="w-full min-w-[1280px]">
				{#each filteredCommunications as comm, index}
					<div
						class="flex h-[80px] w-full items-center border-b-[0.7px] border-[#C6C6C6] bg-[#FBFCFD] px-4"
					>
						<!-- DATE -->
						<div class="flex w-[140px] items-center gap-2">
							<div
								class="h-[18px] w-[18px] flex-shrink-0 rounded-full"
								style="background-color: {getStatusColor(comm.status)}"
							></div>
							<div class="flex flex-col">
								<span class="font-sans text-sm font-semibold leading-[1.29] text-[#555555]">
									{comm.date}
								</span>
								<span class="font-sans text-xs font-normal leading-[1.29] text-[#555555]">
									{comm.time}
								</span>
							</div>
						</div>

						<!-- TYPE -->
						<div class="flex w-[120px] items-center gap-2">
							{#if comm.typeIcon === 'email'}
								<Mail class="h-4 w-[23px] text-[#555555]" />
							{:else if comm.typeIcon === 'sms'}
								<MessageSquare class="h-4 w-[23px] text-[#555555]" />
							{:else if comm.typeIcon === 'voice'}
								<Phone class="h-4 w-[23px] text-[#555555]" />
							{:else if comm.typeIcon === 'web'}
								<Globe class="h-4 w-[23px] text-[#555555]" />
							{:else if comm.typeIcon === 'facebook'}
								<Facebook class="h-4 w-[23px] text-[#555555]" />
							{:else if comm.typeIcon === 'chatbot'}
								<Bot class="h-4 w-[23px] text-[#555555]" />
							{:else if comm.typeIcon === 'leadform'}
								<FileText class="h-4 w-[23px] text-[#555555]" />
							{:else}
								<Info class="h-4 w-[23px] text-[#555555]" />
							{/if}
							<span class="font-sans text-sm font-medium capitalize leading-[1.29] text-[#555555]">
								{comm.typeIcon}
							</span>
						</div>

						<!-- SOURCE -->
						<div
							class="w-[160px] truncate font-sans text-sm font-medium leading-[1.29] text-[#555555]"
						>
							{comm.source}
						</div>

						<!-- ENDPOINT -->
						<div class="flex w-[160px] flex-col gap-1">
							<span class="truncate font-sans text-sm font-medium leading-[1.29] text-[#555555]">
								{comm.endpoint}
							</span>
							<button
								class="text-left font-sans text-xs font-normal leading-[1.29] text-[#0023D7] underline hover:no-underline"
								onclick={() => {
									selectedEndpoint = comm.endpoint;
									selectedCommId = comm.commId;
									// Get assigned members only for this specific log
									preSelectedAgents = comm.assignedMemberNames || [];
									assignDialogOpen = true;
								}}
							>
								assign
							</button>
						</div>

						<!-- PURPOSE -->
						<div class="w-[140px]">
							{#if comm.purposeIsButton}
								<button
									class="rounded bg-[#577AB7] px-3 py-1.5 font-sans text-sm font-medium leading-[1.29] text-white transition-colors hover:bg-[#577AB7]/90"
									onclick={() => {
										notificationsDialogOpen = true;
									}}
								>
									{comm.purpose}
								</button>
							{:else}
								<span class="font-sans text-sm font-medium leading-[1.29] text-[#555555]">
									{comm.purpose}
								</span>
							{/if}
						</div>

						<!-- SUMMARY -->
						<div class="w-[120px]">
							<button
								class="font-sans text-sm font-normal leading-[1.29] text-[#0023D7] underline hover:no-underline truncate block w-full text-left"
								onclick={() => {
									selectedComm = comm;
									summaryDialogOpen = true;
								}}
								title={comm.summary}
							>
								{comm.summary}
							</button>
						</div>

						<!-- COMM ID -->
						<div class="w-[120px] font-sans text-sm font-normal leading-[1.29] text-[#555555]">
							{comm.commId}
						</div>

						<!-- ACTIONS -->
						<div class="flex flex-1 justify-end">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<button
										class="relative flex h-[24.67px] w-[24.67px] items-center justify-center rounded-full border border-[#515151] hover:bg-gray-100"
										aria-label="Actions menu"
									>
										<div class="absolute inset-0 flex items-center justify-center gap-[2px]">
											<div class="h-[4.11px] w-[4.11px] rounded-full bg-[#515151]"></div>
											<div class="h-[4.11px] w-[4.11px] rounded-full bg-[#515151]"></div>
											<div class="h-[4.11px] w-[4.11px] rounded-full bg-[#515151]"></div>
										</div>
									</button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Item>View Details</DropdownMenu.Item>
									<DropdownMenu.Item>Edit</DropdownMenu.Item>
									<DropdownMenu.Item>Delete</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

{#if selectedComm}
	<CommunicationSummaryDialog
		bind:open={summaryDialogOpen}
		commId={selectedComm.commId}
		date={selectedComm.date}
		time={selectedComm.time}
		category={selectedComm.purpose.split(' | ')[0] || 'Sales'}
		subCategory={selectedComm.purpose.split(' | ')[1] || 'Inquiry'}
		email={selectedComm.source}
		subject={selectedComm.raw?.metadata?.subject || selectedComm.raw?.subject || 'No subject'}
		body={selectedComm.raw?.content || ''}
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
