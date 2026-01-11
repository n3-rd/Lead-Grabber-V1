<script lang="ts">
	import { Search, Mail, Info } from "lucide-svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index";
	import CommunicationSummaryDialog from "$lib/components/communication-summary-dialog.svelte";
	import NotificationsDialog from "$lib/components/notifications/notifications-dialog.svelte";
	import AssignAgentDialog from "$lib/components/assign-agent-dialog.svelte";

	let selectedFilter = $state("All");
	const filters = ["All", "Email", "SMS", "Voice", "Web", "Facebook", "Chatbot", "Leadform"];

	let summaryDialogOpen = $state(false);
	let selectedComm = $state<typeof communications[0] | null>(null);
	let notificationsDialogOpen = $state(false);
	let assignDialogOpen = $state(false);
	let selectedEndpoint = $state<string | null>(null);

	// Sample data - replace with real data from your API
	const communications = [
		{
			date: "Dec 01 2024",
			time: "9:33 PM",
			type: "out",
			typeIcon: "email",
			source: "markdoe@clear...",
			endpoint: "Sarah Lee",
			purpose: "Confirm",
			purposeIsButton: true,
			summary: "Summary",
			commId: "COM-00123",
			status: "out" // "out", "in", "pending"
		},
		{
			date: "Dec 01 2024",
			time: "9:33 PM",
			type: "In",
			typeIcon: "email",
			source: "markdoe@clear...",
			endpoint: "Sarah Lee",
			purpose: "Sales | Inquiry",
			purposeIsButton: false,
			summary: "Summary",
			commId: "COM-00123",
			status: "in"
		},
		{
			date: "Dec 01 2024",
			time: "9:33 PM",
			type: "In",
			typeIcon: "email",
			source: "markdoe@clear...",
			endpoint: "johnlee@clearsky.c...",
			purpose: "Sales | Inquiry",
			purposeIsButton: false,
			summary: "Summary",
			commId: "COM-00123",
			status: "in"
		},
		{
			date: "Dec 01 2024",
			time: "9:33 PM",
			type: "In",
			typeIcon: "email",
			source: "markdoe@clear...",
			endpoint: "Sarah Lee",
			purpose: "Sales | Inquiry",
			purposeIsButton: false,
			summary: "Summary",
			commId: "COM-00123",
			status: "in"
		},
		{
			date: "Dec 01 2024",
			time: "9:33 PM",
			type: "In",
			typeIcon: "email",
			source: "markdoe@clear...",
			endpoint: "johnlee@clearsky.c...",
			purpose: "Sales | Inquiry",
			purposeIsButton: false,
			summary: "Summary",
			commId: "COM-00123",
			status: "in"
		},
		{
			date: "Dec 01 2024",
			time: "9:33 PM",
			type: "In",
			typeIcon: "email",
			source: "markdoe@clear...",
			endpoint: "sarah lee",
			purpose: "Sales | Inquiry",
			purposeIsButton: false,
			summary: "Summary",
			commId: "COM-00123",
			status: "in"
		}
	];

	function getStatusColor(status: string): string {
		switch (status) {
			case "out":
				return "#FB2C36";
			case "in":
				return "#00C951";
			default:
				return "#4A4A4A";
		}
	}
</script>

<div class="min-w-0 w-full overflow-x-auto">
	<!-- Main Container -->
	<div class="min-w-[1282px] bg-white border border-[#ABABAB] rounded-[5px] p-0 m-4">
		<!-- Top Section: Filters and Search -->
		<div class="flex items-center justify-between px-4 py-4 border-b border-[#ABABAB]">
			<!-- Filter Buttons -->
			<div class="flex items-center gap-4 flex-shrink-0">
				{#each filters as filter}
					<button
						onclick={() => selectedFilter = filter}
						class="px-4 py-2.5 rounded-[5px] transition-colors font-['Poppins'] font-medium text-base leading-[128.67%] whitespace-nowrap {selectedFilter === filter
							? 'bg-[#0F172A] text-white font-bold'
							: 'text-[#555555] hover:bg-gray-50'}"
					>
						{filter}
					</button>
				{/each}
			</div>

			<!-- Search Bar -->
			<div class="relative w-[349px] h-[43px] bg-white border-[0.5px] border-[#ADADAD] rounded-[5px] flex items-center px-3 gap-2 flex-shrink-0">
				<Search class="w-[18px] h-[18px] text-[#555555] flex-shrink-0" />
				<input
					type="text"
					placeholder="Search communications..."
					class="flex-1 outline-none font-['Poppins'] font-light text-sm leading-[128.67%] text-[rgba(85,85,85,0.53)] placeholder:text-[rgba(85,85,85,0.53)]"
				/>
				<div class="w-[1px] h-4 bg-[#ADADAD]"></div>
				<button class="w-3 h-4 flex items-center justify-center" aria-label="Filter">
					<svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M6 0L11.1962 4H8V14H4V4H0.803848L6 0Z" fill="#555555" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Table -->
		<div class="w-full">
			<!-- Table Header -->
			<div class="w-full min-w-[1280px] bg-[#F3F3F3] rounded-t-[4px] h-[46px] flex items-center px-4 border-b border-[#ABABAB]">
				<div class="flex items-center gap-2 w-[140px]">
					<Info class="w-4 h-4 text-[#555555]" />
					<span class="font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">DATE</span>
				</div>
				<div class="w-[120px] font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">
					TYPE
				</div>
				<div class="w-[160px] font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">
					SOURCE
				</div>
				<div class="w-[160px] font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">
					ENDPOINT
				</div>
				<div class="w-[140px] font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">
					PURPOSE
				</div>
				<div class="w-[120px] font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">
					SUMMARY
				</div>
				<div class="w-[120px] font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">
					COMM ID
				</div>
				<div class="flex-1 font-['Poppins'] font-semibold text-[13px] leading-[128.67%] text-[#555555]">
					ACTIONS
				</div>
			</div>

			<!-- Table Body -->
			<div class="w-full min-w-[1280px]">
				{#each communications as comm, index}
					<div
						class="w-full h-[80px] bg-[#FBFCFD] border-b-[0.7px] border-[#C6C6C6] flex items-center px-4"
					>
						<!-- DATE -->
						<div class="flex items-center gap-2 w-[140px]">
							<div
								class="w-[18px] h-[18px] rounded-full flex-shrink-0"
								style="background-color: {getStatusColor(comm.status)}"
							></div>
							<div class="flex flex-col">
								<span class="font-['Poppins'] font-semibold text-sm leading-[128.67%] text-[#555555]">
									{comm.date}
								</span>
								<span class="font-['Poppins'] font-normal text-xs leading-[128.67%] text-[#555555]">
									{comm.time}
								</span>
							</div>
						</div>

						<!-- TYPE -->
						<div class="flex items-center gap-2 w-[120px]">
							<Mail class="w-[23px] h-4 text-[#555555]" />
							<span class="font-['Poppins'] font-medium text-sm leading-[128.67%] text-[#555555]">
								{comm.type}
							</span>
						</div>

						<!-- SOURCE -->
						<div class="w-[160px] font-['Poppins'] font-medium text-sm leading-[128.67%] text-[#555555] truncate">
							{comm.source}
						</div>

						<!-- ENDPOINT -->
						<div class="w-[160px] flex flex-col gap-1">
							<span class="font-['Poppins'] font-medium text-sm leading-[128.67%] text-[#555555] truncate">
								{comm.endpoint}
							</span>
							<button
								class="font-['Poppins'] font-normal text-xs leading-[128.67%] text-[#0023D7] underline hover:no-underline text-left"
								onclick={() => {
									selectedEndpoint = comm.endpoint;
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
									class="bg-[#577AB7] rounded-[4px] px-3 py-1.5 font-['Poppins'] font-medium text-sm leading-[128.67%] text-white hover:bg-[#577AB7]/90 transition-colors"
									onclick={() => {
										notificationsDialogOpen = true;
									}}
								>
									{comm.purpose}
								</button>
							{:else}
								<span class="font-['Poppins'] font-medium text-sm leading-[128.67%] text-[#555555]">
									{comm.purpose}
								</span>
							{/if}
						</div>

						<!-- SUMMARY -->
						<div class="w-[120px]">
							<button
								class="font-['Poppins'] font-normal text-sm leading-[128.67%] text-[#0023D7] underline hover:no-underline"
								onclick={() => {
									selectedComm = comm;
									summaryDialogOpen = true;
								}}
							>
								{comm.summary}
							</button>
						</div>

						<!-- COMM ID -->
						<div class="w-[120px] font-['Poppins'] font-normal text-sm leading-[128.67%] text-[#555555]">
							{comm.commId}
						</div>

						<!-- ACTIONS -->
						<div class="flex-1 flex justify-end">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<button
										class="w-[24.67px] h-[24.67px] rounded-full border border-[#515151] flex items-center justify-center hover:bg-gray-100 relative"
										aria-label="Actions menu"
									>
										<div class="absolute inset-0 flex items-center justify-center gap-[2px]">
											<div class="w-[4.11px] h-[4.11px] rounded-full bg-[#515151]"></div>
											<div class="w-[4.11px] h-[4.11px] rounded-full bg-[#515151]"></div>
											<div class="w-[4.11px] h-[4.11px] rounded-full bg-[#515151]"></div>
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
		category={selectedComm.purpose.split(" | ")[0] || "Sales"}
		subCategory={selectedComm.purpose.split(" | ")[1] || "Inquiry"}
		email={selectedComm.source}
		subject="Book Appointment time"
		summary="Sarah wants an appointment to test drive the Ford 150 2026. between 2:00 and 3:30 on Friday Dec 12th."
		tasks={[
			"Confirm Mark's Doe schedule availability",
			"Send email appointment accept to Sarah",
			"Update Mark Doe's appointment book",
			"Update Sarah's profile",
			"Send reminder to Sarah",
			"Following appointment send CRM update request."
		]}
	/>
{/if}

<NotificationsDialog bind:open={notificationsDialogOpen} />

<AssignAgentDialog
	bind:open={assignDialogOpen}
	endpointName={selectedEndpoint || ""}
	onAssign={(selectedAgents) => {
		console.log("Assigned agents:", selectedAgents, "to endpoint:", selectedEndpoint);
		// Handle assignment logic here
	}}
/>

