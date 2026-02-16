<script lang="ts">
	import { Search, Mic, MapPin, Mail, Phone, ChevronDown, X, SquarePen, MessageSquare, Globe, Facebook, Bot, FileText, Trash2 } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { invalidateAll } from "$app/navigation";
	import { page } from "$app/stores";
	import CommunicationTable from "$lib/components/CommunicationTable.svelte";
	import EmptyState from "$lib/components/EmptyState.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { toast } from "svelte-sonner";

	interface Connection {
		id: string;
		name: string;
		address: string;
		landline: string;
		cell: string;
		email: string;
		smsPermission: boolean;
	}

	interface Profile {
		id: string;
		name: string;
		phone: string;
		email: string;
		address: string;
		landline: string;
		cell: string;
		smsPermission: boolean;
		connections: Connection[];
	}

	interface Communication {
		id: string;
		date: string;
		time: string;
		type: "email" | "sms" | "voice" | "web" | "facebook" | "chatbot" | "leadform";
		direction: "In" | "Out";
		source: string;
		endpoint: string;
		purpose: string | null;
		summary: string | null;
		commId: string | null;
		status: "red" | "green" | "blue";
	}

	interface CommSummary {
		commId: string;
		summaryLink: string;
	}

	let { data } = $props();

	let communications = $state<Communication[]>(data.communications || []);
	
	// Update when data changes
	$effect(() => {
		communications = data.communications || [];
	});

	const commSummaries: CommSummary[] = [
		{ commId: "COM-00124", summaryLink: "Open Summary for COM- 000124" },
		{ commId: "COM-00125", summaryLink: "Open Summary for COM- 000125" },
		{ commId: "COM-00126", summaryLink: "Open Summary for COM- 000126" },
		{ commId: "COM-00127", summaryLink: "Open Summary for COM- 000127" },
		{ commId: "COM-00128", summaryLink: "Open Summary for COM- 000128" }
	];

	const filters = ["All", "Email", "SMS", "Voice", "Web", "Facebook", "Chatbot", "Leadform", "Leadbox"];

	const profileId = $derived($page.params.id);
	const selectedProfile = $derived(data.profile ? {
		id: data.profile.id,
		name: data.profile.name || 'Unknown',
		phone: data.profile.phone || '',
		email: data.profile.email || '',
		address: data.profile.address || '',
		landline: data.profile.landline || data.profile.phone || '',
		cell: data.profile.cell || data.profile.phone || '',
		smsPermission: data.profile.smsPermission ?? false,
		past_names: data.profile.past_names || [],
		connections: [] // Connections can be added later if needed
	} : null);
	
	let connectionsExpanded = $state(true);
	let selectedSummary = $state<Communication | null>(null);
	let showEditDialog = $state(false);
	let editForm = $state({ name: '', email: '', phone: '' });

	function openEdit() {
		if (data.profile) {
			editForm = {
				name: data.profile.name ?? '',
				email: data.profile.email ?? '',
				phone: data.profile.phone ?? '',
			};
			showEditDialog = true;
		}
	}

	async function submitEdit() {
		const form = new FormData();
		form.set('name', editForm.name);
		form.set('email', editForm.email);
		form.set('phone', editForm.phone);
		const res = await fetch('?/updateProfile', { method: 'POST', body: form });
		if (res.ok) {
			showEditDialog = false;
			toast.success('Profile updated');
			await invalidateAll();
		} else {
			toast.error('Failed to update profile');
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this profile?')) return;
		const res = await fetch('?/deleteProfile', { method: 'POST', body: new FormData() });
		if (res.ok) {
			toast.success('Profile deleted');
			goto('/profiles');
		} else {
			toast.error('Failed to delete profile');
		}
	}

	function handleSummaryClick(comm: Communication) {
		selectedSummary = comm;
	}

	function handleActionClick(action: string, comm: Communication) {
		console.log('Action:', action, 'for comm:', comm);
		// Handle actions like call, sms, email
	}

</script>

{#if selectedProfile}
	<!-- Profile Detail View -->
	<div class="w-full min-h-full flex">
		<!-- Left Sidebar -->
		<div class="w-[325px] min-w-[325px] bg-[#EDF2FA] border-r border-[#7E7E7E] p-6">
			<!-- Profile Name -->
			<h1 class="font-sans font-semibold text-3xl leading-[1.29] text-[#555555] mb-2">
				{selectedProfile.name}
			</h1>

			<!-- Address -->
			{#if selectedProfile.address}
				<div class="flex items-start gap-2 mb-4">
					<MapPin class="w-5 h-5 text-[#0F172A] mt-0.5 flex-shrink-0" />
					<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">
						{selectedProfile.address}
					</span>
				</div>
			{/if}

			<!-- Contact Info -->
			<div class="space-y-2 mb-4">
				<div class="flex items-center">
					<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Landline:</span>
					<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{selectedProfile.landline}</span>
				</div>
				<div class="flex items-center">
					<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Cell #:</span>
					<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{selectedProfile.cell}</span>
				</div>
				<div class="flex items-center">
					<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Email:</span>
					<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{selectedProfile.email}</span>
				</div>
				{#if selectedProfile.past_names && Array.isArray(selectedProfile.past_names) && selectedProfile.past_names.length > 0}
					<div class="flex items-start">
						<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Past names:</span>
						<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">
							{selectedProfile.past_names.join(', ')}
						</span>
					</div>
				{/if}
			</div>

			<!-- SMS Permission -->
			<div class="flex items-center gap-2 mb-6">
				<div class="w-5 h-5 border border-[#7B2E17] rounded flex items-center justify-center {selectedProfile.smsPermission ? 'bg-[#7B2E17]' : 'bg-white'}">
					{#if selectedProfile.smsPermission}
						<svg class="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
							<path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{:else}
						<X class="w-3 h-3 text-[#7B2E17]" />
					{/if}
				</div>
				<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">Permission to send SMS</span>
			</div>

			<!-- Divider -->
			<div class="w-full h-px bg-[#565656] mb-4"></div>

			<!-- Connections -->
			<button
				class="flex items-center justify-between w-full mb-4"
				onclick={() => connectionsExpanded = !connectionsExpanded}
			>
				<span class="font-sans font-medium text-lg leading-[1.29] text-[#565656]">Connections</span>
				<ChevronDown class="w-4 h-3 text-[#565656] transition-transform {connectionsExpanded ? 'rotate-180' : ''}" />
			</button>

			{#if connectionsExpanded && selectedProfile.connections.length > 0}
				{#each selectedProfile.connections as connection}
					<div class="mb-4">
						<h3 class="font-sans font-semibold text-xl leading-[1.29] text-[#555555] mb-2">{connection.name}</h3>
						<div class="flex items-start gap-2 mb-2">
							<MapPin class="w-5 h-5 text-[#0F172A] mt-0.5 flex-shrink-0" />
							<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.address}</span>
						</div>
						<div class="space-y-1">
							<div class="flex items-center">
								<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Landline:</span>
								<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.landline}</span>
							</div>
							<div class="flex items-center">
								<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Cell #:</span>
								<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.cell}</span>
							</div>
							<div class="flex items-center">
								<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Email:</span>
								<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.email}</span>
							</div>
						</div>
						<div class="flex items-center gap-2 mt-2">
							<div class="w-5 h-5 border border-[#7B2E17] rounded flex items-center justify-center {connection.smsPermission ? 'bg-[#7B2E17]' : 'bg-white'}">
								{#if connection.smsPermission}
									<svg class="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
										<path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								{:else}
									<X class="w-3 h-3 text-[#7B2E17]" />
								{/if}
							</div>
							<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">Permission to send SMS</span>
						</div>
					</div>
				{/each}
			{/if}

			<!-- Edit | Add | Delete -->
			<div class="text-right mb-4 flex items-center justify-end gap-3">
				<button type="button" class="font-sans font-normal text-lg leading-[1.29] text-[#565656] underline cursor-pointer hover:text-[#333]" onclick={openEdit}>Edit</button>
				<span class="font-sans font-normal text-lg leading-[1.29] text-[#565656]">|</span>
				<span class="font-sans font-normal text-lg leading-[1.29] text-[#565656] underline cursor-pointer hover:text-[#333]">Add</span>
				<span class="font-sans font-normal text-lg leading-[1.29] text-[#565656]">|</span>
				<button type="button" class="flex items-center gap-1 font-sans font-normal text-lg leading-[1.29] text-red-600 hover:text-red-700 underline cursor-pointer" onclick={handleDelete}>
					<Trash2 class="w-4 h-4" /> Delete
				</button>
			</div>

			<!-- Divider -->
			<div class="w-full h-px bg-[#565656] mb-4"></div>

			<!-- Playbook Results -->
			<h3 class="font-sans font-semibold text-base leading-[21px] text-[#555555] mb-3">Playbook Results</h3>
			<div class="space-y-1 mb-4">
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Results</p>
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Top[ of Funnel</p>
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Mid-funnel (sales outcomes)</p>
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Bottom-of-funnel (business outcomes</p>
			</div>

			<!-- Playbook Engine Placeholder -->
			<div class="w-full h-[230px] bg-[#949494] rounded flex items-center justify-center">
				<span class="font-sans font-normal text-base leading-[21px] text-white">Playbook Engine</span>
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 p-6 bg-white">
			<!-- Back button -->
			<button
				onclick={() => goto('/profiles')}
				class="mb-4 text-[#577AB7] hover:text-[#3d5a8a] font-sans text-sm flex items-center gap-1"
			>
				← Back to Profiles
			</button>

			<!-- Top Section: Latest Comm ID & Action Buttons -->
			<div class="flex gap-6 mb-6 w-fit">
				<!-- Latest Comm ID Card -->
				<div class="w-[870px] bg-white rounded-lg shadow-[0px_0px_4px_rgba(0,0,0,0.41)] p-6">
					<h2 class="font-sans font-semibold text-base leading-[21px] text-[#555555] mb-4">Latest Comm ID</h2>
					<div class="flex gap-24">
						<div>
							<h4 class="font-sans font-semibold text-xs leading-[1.29] text-[#555555] mb-3">COMM ID</h4>
							<div class="space-y-3">
								{#each commSummaries as summary}
									<p class="font-sans font-normal text-sm leading-[1.29] text-[#555555]">{summary.commId}</p>
								{/each}
							</div>
						</div>
						<div>
							<h4 class="font-sans font-semibold text-xs leading-[1.29] text-[#555555] mb-3">SUMMARY</h4>
							<div class="space-y-3">
								{#each commSummaries as summary}
									<p class="font-sans font-normal text-sm leading-[1.29] text-[#0023D7] underline cursor-pointer hover:text-[#001ba3]">{summary.summaryLink}</p>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Action Buttons Card -->
				<div class="w-[391px] bg-white rounded-lg shadow-[0px_0px_4px_rgba(0,0,0,0.25)] p-4">
					<div class="grid grid-cols-2 gap-3">
						<button class="h-[63px] bg-[#577AB7] rounded-sm flex items-center justify-center gap-2 hover:bg-[#4a6aa0] transition-colors">
							<Mail class="w-4 h-4 text-white" />
							<span class="font-sans font-semibold text-xs leading-[16px] text-white">New Email</span>
						</button>
						<button class="h-[63px] bg-[#F2AE5E] rounded-sm flex items-center justify-center gap-2 hover:bg-[#e09d4d] transition-colors">
							<Phone class="w-4 h-4 text-white" />
							<span class="font-sans font-semibold text-xs leading-[16px] text-white">New Call</span>
						</button>
						<button class="h-[63px] bg-[#B5C2DA] rounded-sm flex items-center justify-center gap-2 hover:bg-[#a3b3cf] transition-colors">
							<svg class="w-5 h-5 text-[#577AB7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
							</svg>
							<span class="font-sans font-semibold text-xs leading-[16px] text-[#577AB7]">New SMS</span>
						</button>
						<button class="h-[63px] bg-[#B5C2DA] rounded-sm flex items-center justify-center gap-2 hover:bg-[#a3b3cf] transition-colors">
							<SquarePen class="w-5 h-5 text-[#577AB7]" />
							<span class="font-sans font-semibold text-xs leading-[16px] text-[#577AB7]">Add Task</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Communications Container -->
			<div class="min-w-[1282px]">
				<CommunicationTable
					bind:communications={communications}
					{filters}
					onSummaryClick={handleSummaryClick}
					onActionClick={handleActionClick}
				/>
			</div>
		</div>
	</div>

	<!-- Edit Profile Dialog -->
	<Dialog.Root bind:open={showEditDialog}>
		<Dialog.Content class="sm:max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Edit Profile</Dialog.Title>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="edit-name">Name</Label>
					<Input id="edit-name" bind:value={editForm.name} />
				</div>
				<div class="grid gap-2">
					<Label for="edit-email">Email</Label>
					<Input id="edit-email" type="email" bind:value={editForm.email} />
				</div>
				<div class="grid gap-2">
					<Label for="edit-phone">Phone</Label>
					<Input id="edit-phone" type="tel" bind:value={editForm.phone} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showEditDialog = false)}>Cancel</Button>
				<Button onclick={submitEdit}>Save changes</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Summary Modal -->
	{#if selectedSummary}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
			onclick={() => selectedSummary = null}
			role="button"
			tabindex="0"
			onkeydown={(e) => { if (e.key === 'Escape') selectedSummary = null; }}
		>
			{#if selectedSummary.type === "voice" && selectedSummary.direction === "In"}
				<!-- Incoming Call Modal -->
				<div
					class="w-[742px] h-[452px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-6 relative"
					onclick={(e) => e.stopPropagation()}
				>
					<!-- Close button -->
					<button
						onclick={() => selectedSummary = null}
						class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>

					<!-- Header -->
					<div class="flex justify-between items-start mb-4">
						<div>
							<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-1">
								AI Summary:
							</p>
							<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
								{selectedSummary.date} | {selectedSummary.time}
							</p>
						</div>
						<div class="text-right">
							<p class="font-sans font-bold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)] mb-1">
								Comm ID - {selectedSummary.commId || 'N/A'}
							</p>
							<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]">
								Category: Sales
							</p>
							<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-right text-[rgba(86,86,86,0.88)]">
								Sub-Category: Inquiry/Demo
							</p>
						</div>
					</div>

					<!-- Summary Section -->
					<div class="mb-4">
						<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-3">
							Summary:
						</p>
						<div class="w-full h-[133px] bg-[#F7F7F7] rounded border-b border-[#BEBEBE] p-4">
							<p class="font-sans font-normal text-lg leading-[131%] tracking-normal text-[rgba(86,86,86,0.78)]">
								Sarah Lee called regarding the new AI-powered roofing estimator. Mark explained the features and offered to send a demo link. and will send a appointment time fo early Friday morning.
							</p>
						</div>
					</div>

					<!-- Tasks -->
					<div class="space-y-2">
						<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							1st Task: Check Mark's Schedule for opening Friday morning
						</p>
						<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							2nd Task: Book appointment
						</p>
						<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							3rd Task: Send email demo link and appointment time
						</p>
					</div>
				</div>
			{:else if selectedSummary.type === "email"}
				<!-- Email Modal (Scaled Down) -->
				<div
					class="w-[600px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-5 relative"
					onclick={(e) => e.stopPropagation()}
				>
					<!-- Close button -->
					<button
						onclick={() => selectedSummary = null}
						class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>

					<!-- Header -->
					<div class="flex justify-between items-start mb-3">
						<div>
							<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-1">
								AI Summary:
							</p>
							<p class="font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
								{selectedSummary.date} | {selectedSummary.time}
							</p>
						</div>
						<div class="text-right">
							<p class="font-sans font-bold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)] mb-1">
								Comm ID - {selectedSummary.commId || 'N/A'}
							</p>
							<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]">
								Category: Sales
							</p>
							<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-right text-[rgba(86,86,86,0.88)]">
								Sub-Category: Book/Demo
							</p>
						</div>
					</div>

					<!-- Summary Section -->
					<div class="mb-3">
						<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-2">
							Summary:
						</p>
						<div class="w-full bg-[#F7F7F7] rounded border-b border-[#BEBEBE] p-3">
							<div class="space-y-2">
								<div>
									<span class="font-sans font-normal text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Email Address: 
									</span>
									<span class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										sarahlee@gmail.com
									</span>
								</div>
								<div>
									<span class="font-sans font-normal text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Subject Line: 
									</span>
									<span class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Demo Link and Appointment time
									</span>
								</div>
								<div>
									<span class="font-sans font-normal text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Body:
									</span>
									<div class="mt-2 w-full bg-[#FFFDFD] rounded border-b border-[#BEBEBE] p-3">
										<p class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)] mb-2">
											Hello Sarah,<br />
											As per our conversation see demo link and as we discuss i book a appointment at 10am at the office.
										</p>
										<p class="font-sans font-normal italic text-sm leading-[141%] tracking-normal text-[rgba(123,132,249,0.78)] underline mb-2">
											httpss://demolink1344/csag.com
										</p>
										<p class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
											Looking forward to see you<br />
											if you have any question just five me a shout
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div>
						<p class="font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							Task: AI has to update the CRM & Engagement Score
						</p>
					</div>
				</div>
			{:else}
				<!-- Default Modal for other types -->
				<div
					class="w-[600px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-5 relative"
					onclick={(e) => e.stopPropagation()}
				>
					<button
						onclick={() => selectedSummary = null}
						class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>
					<div class="mb-3">
						<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-1">
							AI Summary:
						</p>
						<p class="font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							{selectedSummary.date} | {selectedSummary.time}
						</p>
					</div>
					<div class="text-right mb-3">
						<p class="font-sans font-bold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)] mb-1">
							Comm ID - {selectedSummary.commId || 'N/A'}
						</p>
						<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]">
							Category: Sales
						</p>
					</div>
					<div class="w-full bg-[#F7F7F7] rounded border-b border-[#BEBEBE] p-3">
						<p class="font-sans font-normal text-sm leading-[131%] tracking-normal text-[rgba(86,86,86,0.78)]">
							Summary content for {selectedSummary.type} communication.
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
{:else}
	<EmptyState
		title="Profile not found"
		variant="compact"
		class="min-h-0"
		primaryAction={{ label: '← Back to Profiles', href: '/profiles' }}
	/>
{/if}
