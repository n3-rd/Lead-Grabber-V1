<script lang="ts">
	import {
		Search,
		Mic,
		MapPin,
		Mail,
		Phone,
		ChevronDown,
		X,
		SquarePen,
		MessageSquare,
		Globe,
		Facebook,
		Bot,
		FileText,
		Trash2
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import CommunicationTable from '$lib/components/CommunicationTable.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';

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
		type: 'email' | 'sms' | 'voice' | 'web' | 'facebook' | 'chatbot' | 'leadform';
		direction: 'In' | 'Out';
		source: string;
		endpoint: string;
		purpose: string | null;
		summary: string | null;
		commId: string | null;
		status: 'red' | 'green' | 'blue';
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
		{ commId: 'COM-00124', summaryLink: 'Open Summary for COM- 000124' },
		{ commId: 'COM-00125', summaryLink: 'Open Summary for COM- 000125' },
		{ commId: 'COM-00126', summaryLink: 'Open Summary for COM- 000126' },
		{ commId: 'COM-00127', summaryLink: 'Open Summary for COM- 000127' },
		{ commId: 'COM-00128', summaryLink: 'Open Summary for COM- 000128' }
	];

	const filters = [
		'All',
		'Email',
		'SMS',
		'Voice',
		'Web',
		'Facebook',
		'Chatbot',
		'Leadform',
		'Leadbox'
	];

	const profileId = $derived($page.params.id);
	const selectedProfile = $derived(
		data.profile
			? {
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
				}
			: null
	);

	let connectionsExpanded = $state(true);
	let selectedSummary = $state<Communication | null>(null);
	let showEditDialog = $state(false);
	let editForm = $state({ name: '', email: '', phone: '' });

	function openEdit() {
		if (data.profile) {
			editForm = {
				name: data.profile.name ?? '',
				email: data.profile.email ?? '',
				phone: data.profile.phone ?? ''
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
	<div class="flex min-h-full w-full">
		<!-- Left Sidebar -->
		<div class="w-[325px] min-w-[325px] border-r border-[#7E7E7E] bg-[#EDF2FA] p-6">
			<!-- Profile Name -->
			<h1 class="mb-2 font-sans text-3xl font-semibold leading-[1.29] text-[#555555]">
				{selectedProfile.name}
			</h1>

			<!-- Address -->
			{#if selectedProfile.address}
				<div class="mb-4 flex items-start gap-2">
					<MapPin class="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0F172A]" />
					<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]">
						{selectedProfile.address}
					</span>
				</div>
			{/if}

			<!-- Contact Info -->
			<div class="mb-4 space-y-2">
				<div class="flex items-center">
					<span class="w-[82px] font-sans text-base font-medium leading-[1.29] text-[#565656]"
						>Landline:</span
					>
					<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
						>{selectedProfile.landline}</span
					>
				</div>
				<div class="flex items-center">
					<span class="w-[82px] font-sans text-base font-medium leading-[1.29] text-[#565656]"
						>Cell #:</span
					>
					<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
						>{selectedProfile.cell}</span
					>
				</div>
				<div class="flex items-center">
					<span class="w-[82px] font-sans text-base font-medium leading-[1.29] text-[#565656]"
						>Email:</span
					>
					<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
						>{selectedProfile.email}</span
					>
				</div>
				{#if selectedProfile.past_names && Array.isArray(selectedProfile.past_names) && selectedProfile.past_names.length > 0}
					<div class="flex items-start">
						<span class="w-[82px] font-sans text-base font-medium leading-[1.29] text-[#565656]"
							>Past names:</span
						>
						<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]">
							{selectedProfile.past_names.join(', ')}
						</span>
					</div>
				{/if}
			</div>

			<!-- SMS Permission -->
			<div class="mb-6 flex items-center gap-2">
				<div
					class="flex h-5 w-5 items-center justify-center rounded border border-[#7B2E17] {selectedProfile.smsPermission
						? 'bg-[#7B2E17]'
						: 'bg-white'}"
				>
					{#if selectedProfile.smsPermission}
						<svg class="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
							<path
								d="M2 6L5 9L10 3"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{:else}
						<X class="h-3 w-3 text-[#7B2E17]" />
					{/if}
				</div>
				<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
					>Permission to send SMS</span
				>
			</div>

			<!-- Divider -->
			<div class="mb-4 h-px w-full bg-[#565656]"></div>

			<!-- Connections -->
			<button
				class="mb-4 flex w-full items-center justify-between"
				onclick={() => (connectionsExpanded = !connectionsExpanded)}
			>
				<span class="font-sans text-lg font-medium leading-[1.29] text-[#565656]">Connections</span>
				<ChevronDown
					class="h-3 w-4 text-[#565656] transition-transform {connectionsExpanded
						? 'rotate-180'
						: ''}"
				/>
			</button>

			{#if connectionsExpanded && selectedProfile.connections.length > 0}
				{#each selectedProfile.connections as connection}
					<div class="mb-4">
						<h3 class="mb-2 font-sans text-xl font-semibold leading-[1.29] text-[#555555]">
							{connection.name}
						</h3>
						<div class="mb-2 flex items-start gap-2">
							<MapPin class="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0F172A]" />
							<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
								>{connection.address}</span
							>
						</div>
						<div class="space-y-1">
							<div class="flex items-center">
								<span class="w-[82px] font-sans text-base font-medium leading-[1.29] text-[#565656]"
									>Landline:</span
								>
								<span
									class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
									>{connection.landline}</span
								>
							</div>
							<div class="flex items-center">
								<span class="w-[82px] font-sans text-base font-medium leading-[1.29] text-[#565656]"
									>Cell #:</span
								>
								<span
									class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
									>{connection.cell}</span
								>
							</div>
							<div class="flex items-center">
								<span class="w-[82px] font-sans text-base font-medium leading-[1.29] text-[#565656]"
									>Email:</span
								>
								<span
									class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
									>{connection.email}</span
								>
							</div>
						</div>
						<div class="mt-2 flex items-center gap-2">
							<div
								class="flex h-5 w-5 items-center justify-center rounded border border-[#7B2E17] {connection.smsPermission
									? 'bg-[#7B2E17]'
									: 'bg-white'}"
							>
								{#if connection.smsPermission}
									<svg class="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
										<path
											d="M2 6L5 9L10 3"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								{:else}
									<X class="h-3 w-3 text-[#7B2E17]" />
								{/if}
							</div>
							<span class="font-sans text-base font-normal leading-[1.29] text-[rgba(86,86,86,0.8)]"
								>Permission to send SMS</span
							>
						</div>
					</div>
				{/each}
			{/if}

			<!-- Edit | Add | Delete -->
			<div class="mb-4 flex items-center justify-end gap-3 text-right">
				<button
					type="button"
					class="cursor-pointer font-sans text-lg font-normal leading-[1.29] text-[#565656] underline hover:text-[#333]"
					onclick={openEdit}>Edit</button
				>
				<span class="font-sans text-lg font-normal leading-[1.29] text-[#565656]">|</span>
				<span
					class="cursor-pointer font-sans text-lg font-normal leading-[1.29] text-[#565656] underline hover:text-[#333]"
					>Add</span
				>
				<span class="font-sans text-lg font-normal leading-[1.29] text-[#565656]">|</span>
				<button
					type="button"
					class="flex cursor-pointer items-center gap-1 font-sans text-lg font-normal leading-[1.29] text-red-600 underline hover:text-red-700"
					onclick={handleDelete}
				>
					<Trash2 class="h-4 w-4" /> Delete
				</button>
			</div>

			<!-- Divider -->
			<div class="mb-4 h-px w-full bg-[#565656]"></div>

			<!-- Playbook Results -->
			<h3 class="mb-3 font-sans text-base font-semibold leading-[21px] text-[#555555]">
				Playbook Results
			</h3>
			<div class="mb-4 space-y-1">
				<p class="font-sans text-base font-normal leading-[21px] text-[#747577]">Results</p>
				<p class="font-sans text-base font-normal leading-[21px] text-[#747577]">Top[ of Funnel</p>
				<p class="font-sans text-base font-normal leading-[21px] text-[#747577]">
					Mid-funnel (sales outcomes)
				</p>
				<p class="font-sans text-base font-normal leading-[21px] text-[#747577]">
					Bottom-of-funnel (business outcomes
				</p>
			</div>

			<!-- Playbook Engine Placeholder -->
			<div class="flex h-[230px] w-full items-center justify-center rounded bg-[#949494]">
				<span class="font-sans text-base font-normal leading-[21px] text-white"
					>Playbook Engine</span
				>
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 bg-white p-6">
			<!-- Back button -->
			<button
				onclick={() => goto('/profiles')}
				class="mb-4 flex items-center gap-1 font-sans text-sm text-[#577AB7] hover:text-[#3d5a8a]"
			>
				← Back to Profiles
			</button>

			<!-- Top Section: Latest Comm ID & Action Buttons -->
			<div class="mb-6 flex w-fit gap-6">
				<!-- Latest Comm ID Card -->
				<div class="w-[870px] rounded-lg bg-white p-6 shadow-[0px_0px_4px_rgba(0,0,0,0.41)]">
					<h2 class="mb-4 font-sans text-base font-semibold leading-[21px] text-[#555555]">
						Latest Comm ID
					</h2>
					<div class="flex gap-24">
						<div>
							<h4 class="mb-3 font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
								COMM ID
							</h4>
							<div class="space-y-3">
								{#each commSummaries as summary}
									<p class="font-sans text-sm font-normal leading-[1.29] text-[#555555]">
										{summary.commId}
									</p>
								{/each}
							</div>
						</div>
						<div>
							<h4 class="mb-3 font-sans text-xs font-semibold leading-[1.29] text-[#555555]">
								SUMMARY
							</h4>
							<div class="space-y-3">
								{#each commSummaries as summary}
									<p
										class="cursor-pointer font-sans text-sm font-normal leading-[1.29] text-[#0023D7] underline hover:text-[#001ba3]"
									>
										{summary.summaryLink}
									</p>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Action Buttons Card -->
				<div class="w-[391px] rounded-lg bg-white p-4 shadow-[0px_0px_4px_rgba(0,0,0,0.25)]">
					<div class="grid grid-cols-2 gap-3">
						<button
							class="flex h-[63px] items-center justify-center gap-2 rounded-sm bg-[#577AB7] transition-colors hover:bg-[#4a6aa0]"
						>
							<Mail class="h-4 w-4 text-white" />
							<span class="font-sans text-xs font-semibold leading-[16px] text-white"
								>New Email</span
							>
						</button>
						<button
							class="flex h-[63px] items-center justify-center gap-2 rounded-sm bg-[#F2AE5E] transition-colors hover:bg-[#e09d4d]"
						>
							<Phone class="h-4 w-4 text-white" />
							<span class="font-sans text-xs font-semibold leading-[16px] text-white">New Call</span
							>
						</button>
						<button
							class="flex h-[63px] items-center justify-center gap-2 rounded-sm bg-[#B5C2DA] transition-colors hover:bg-[#a3b3cf]"
						>
							<svg
								class="h-5 w-5 text-[#577AB7]"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
							<span class="font-sans text-xs font-semibold leading-[16px] text-[#577AB7]"
								>New SMS</span
							>
						</button>
						<button
							class="flex h-[63px] items-center justify-center gap-2 rounded-sm bg-[#B5C2DA] transition-colors hover:bg-[#a3b3cf]"
						>
							<SquarePen class="h-5 w-5 text-[#577AB7]" />
							<span class="font-sans text-xs font-semibold leading-[16px] text-[#577AB7]"
								>Add Task</span
							>
						</button>
					</div>
				</div>
			</div>

			<!-- Communications Container -->
			<div class="min-w-[1282px]">
				<CommunicationTable
					bind:communications
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
			class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
			onclick={() => (selectedSummary = null)}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Escape') selectedSummary = null;
			}}
		>
			{#if selectedSummary.type === 'voice' && selectedSummary.direction === 'In'}
				<!-- Incoming Call Modal -->
				<div
					class="relative h-[452px] w-[742px] rounded bg-white p-6 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
					onclick={(e) => e.stopPropagation()}
				>
					<!-- Close button -->
					<button
						onclick={() => (selectedSummary = null)}
						class="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="h-5 w-5" />
					</button>

					<!-- Header -->
					<div class="mb-4 flex items-start justify-between">
						<div>
							<p
								class="mb-1 font-sans text-lg font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
							>
								AI Summary:
							</p>
							<p
								class="font-sans text-lg font-normal leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
							>
								{selectedSummary.date} | {selectedSummary.time}
							</p>
						</div>
						<div class="text-right">
							<p
								class="mb-1 font-sans text-lg font-bold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
							>
								Comm ID - {selectedSummary.commId || 'N/A'}
							</p>
							<p
								class="font-sans text-lg font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
							>
								Category: Sales
							</p>
							<p
								class="text-right font-sans text-lg font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
							>
								Sub-Category: Inquiry/Demo
							</p>
						</div>
					</div>

					<!-- Summary Section -->
					<div class="mb-4">
						<p
							class="mb-3 font-sans text-lg font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
						>
							Summary:
						</p>
						<div class="h-[133px] w-full rounded border-b border-[#BEBEBE] bg-[#F7F7F7] p-4">
							<p
								class="font-sans text-lg font-normal leading-[131%] tracking-normal text-[rgba(86,86,86,0.78)]"
							>
								Sarah Lee called regarding the new AI-powered roofing estimator. Mark explained the
								features and offered to send a demo link. and will send a appointment time fo early
								Friday morning.
							</p>
						</div>
					</div>

					<!-- Tasks -->
					<div class="space-y-2">
						<p
							class="font-sans text-lg font-normal leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
						>
							1st Task: Check Mark's Schedule for opening Friday morning
						</p>
						<p
							class="font-sans text-lg font-normal leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
						>
							2nd Task: Book appointment
						</p>
						<p
							class="font-sans text-lg font-normal leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
						>
							3rd Task: Send email demo link and appointment time
						</p>
					</div>
				</div>
			{:else if selectedSummary.type === 'email'}
				<!-- Email Modal (Scaled Down) -->
				<div
					class="relative w-[600px] rounded bg-white p-5 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
					onclick={(e) => e.stopPropagation()}
				>
					<!-- Close button -->
					<button
						onclick={() => (selectedSummary = null)}
						class="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="h-5 w-5" />
					</button>

					<!-- Header -->
					<div class="mb-3 flex items-start justify-between">
						<div>
							<p
								class="mb-1 font-sans text-base font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
							>
								AI Summary:
							</p>
							<p
								class="font-sans text-base font-normal leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
							>
								{selectedSummary.date} | {selectedSummary.time}
							</p>
						</div>
						<div class="text-right">
							<p
								class="mb-1 font-sans text-base font-bold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
							>
								Comm ID - {selectedSummary.commId || 'N/A'}
							</p>
							<p
								class="font-sans text-base font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
							>
								Category: Sales
							</p>
							<p
								class="text-right font-sans text-base font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
							>
								Sub-Category: Book/Demo
							</p>
						</div>
					</div>

					<!-- Summary Section -->
					<div class="mb-3">
						<p
							class="mb-2 font-sans text-base font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
						>
							Summary:
						</p>
						<div class="w-full rounded border-b border-[#BEBEBE] bg-[#F7F7F7] p-3">
							<div class="space-y-2">
								<div>
									<span
										class="font-sans text-sm font-normal leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]"
									>
										Email Address:
									</span>
									<span
										class="font-sans text-sm font-medium leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]"
									>
										sarahlee@gmail.com
									</span>
								</div>
								<div>
									<span
										class="font-sans text-sm font-normal leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]"
									>
										Subject Line:
									</span>
									<span
										class="font-sans text-sm font-medium leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]"
									>
										Demo Link and Appointment time
									</span>
								</div>
								<div>
									<span
										class="font-sans text-sm font-normal leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]"
									>
										Body:
									</span>
									<div class="mt-2 w-full rounded border-b border-[#BEBEBE] bg-[#FFFDFD] p-3">
										<p
											class="mb-2 font-sans text-sm font-medium leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]"
										>
											Hello Sarah,<br />
											As per our conversation see demo link and as we discuss i book a appointment at
											10am at the office.
										</p>
										<p
											class="mb-2 font-sans text-sm font-normal italic leading-[141%] tracking-normal text-[rgba(123,132,249,0.78)] underline"
										>
											httpss://demolink1344/csag.com
										</p>
										<p
											class="font-sans text-sm font-medium leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]"
										>
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
						<p
							class="font-sans text-base font-normal leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
						>
							Task: AI has to update the CRM & Engagement Score
						</p>
					</div>
				</div>
			{:else}
				<!-- Default Modal for other types -->
				<div
					class="relative w-[600px] rounded bg-white p-5 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
					onclick={(e) => e.stopPropagation()}
				>
					<button
						onclick={() => (selectedSummary = null)}
						class="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="h-5 w-5" />
					</button>
					<div class="mb-3">
						<p
							class="mb-1 font-sans text-base font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
						>
							AI Summary:
						</p>
						<p
							class="font-sans text-base font-normal leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
						>
							{selectedSummary.date} | {selectedSummary.time}
						</p>
					</div>
					<div class="mb-3 text-right">
						<p
							class="mb-1 font-sans text-base font-bold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]"
						>
							Comm ID - {selectedSummary.commId || 'N/A'}
						</p>
						<p
							class="font-sans text-base font-semibold leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]"
						>
							Category: Sales
						</p>
					</div>
					<div class="w-full rounded border-b border-[#BEBEBE] bg-[#F7F7F7] p-3">
						<p
							class="font-sans text-sm font-normal leading-[131%] tracking-normal text-[rgba(86,86,86,0.78)]"
						>
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
