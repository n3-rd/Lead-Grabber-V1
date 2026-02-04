<script lang="ts">
	import { ChevronDown, Search, Pencil, Trash2, Phone, MessageSquare, Mail, Image as ImageIcon, Play, FileText, Settings, User, Plus, Download, Copy } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';

	let activeTab = $state<'myNumber' | 'messaging' | 'voice'>('myNumber');
	let messagingSubTab = $state<'numbers' | 'orders'>('numbers');
	let searchQuery = $state('');
	let verifiedSearchQuery = $state('');
	let selectedNumbers = $state<Set<string>>(new Set());
	let numbers = $state<any[]>([]);
	let verifiedNumbers = $state<any[]>([]);
	let companyNumbers = $state<{ id: string; phoneNumber: string }[]>([]);
	let numberOrders = $state<any[]>([]);
	let isLoading = $state(false);

	// Mock data for numbers (fallback)
	const mockNumbers = [
		{ number: '+1 705 243 8416', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8417', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8418', status: 'Active', connection: 'ClearSky Software', messagingProfile: '-' },
		{ number: '+1 705 243 8419', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8420', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8421', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8422', status: 'Active', connection: 'ClearSky Software', messagingProfile: '-' },
		{ number: '+1 705 243 8423', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8424', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8425', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8426', status: 'Active', connection: 'ClearSky Software', messagingProfile: '-' },
		{ number: '+1 705 243 8427', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8428', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8429', status: 'Active', connection: 'ClearSky Software', messagingProfile: 'ClearSky Software' },
		{ number: '+1 705 243 8430', status: 'Active', connection: 'ClearSky Software', messagingProfile: '-' }
	];

	function toggleNumber(number: string) {
		const newSelected = new Set(selectedNumbers);
		if (newSelected.has(number)) {
			newSelected.delete(number);
		} else {
			newSelected.add(number);
		}
		selectedNumbers = newSelected;
	}

	function toggleAllNumbers() {
		if (selectedNumbers.size === numbers.length) {
			selectedNumbers = new Set();
		} else {
			selectedNumbers = new Set(numbers.map(n => n.number));
		}
	}

	function handleBuyNumbers() {
		goto('/buy-number');
	}

	function handleBulkUpdate() {
		// TODO: Implement bulk update
		console.log('Bulk update:', Array.from(selectedNumbers));
	}

	function handleExport() {
		// TODO: Implement export
		console.log('Export');
	}

	async function loadNumbers() {
		isLoading = true;
		try {
			const [listRes, companyRes] = await Promise.all([
				fetch(`/api/telnyx/numbers/list?${new URLSearchParams(searchQuery ? { search: searchQuery } : {}).toString()}`),
				fetch('/api/company-numbers')
			]);
			const listResult = await listRes.json();
			const companyResult = await companyRes.json();
			if (listResult.success) numbers = listResult.numbers;
			else toast.error(listResult.error || 'Failed to load numbers');
			if (companyResult.success) companyNumbers = companyResult.numbers;
		} catch (error) {
			console.error('Error loading numbers:', error);
			toast.error('Error loading numbers');
		} finally {
			isLoading = false;
		}
	}

	function isAssigned(phoneNumber: string): { id: string } | null {
		const n = phoneNumber.replace(/\D/g, '');
		const match = companyNumbers.find((c) => (c.phoneNumber || '').replace(/\D/g, '') === n);
		return match ? { id: match.id } : null;
	}

	async function handleAssign(num: { number: string; id: string }) {
		try {
			const res = await fetch('/api/company-numbers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phoneNumber: num.number, telnyxPhoneNumberId: num.id })
			});
			const result = await res.json();
			if (result.success) {
				toast.success('Number assigned to your company');
				companyNumbers = [...companyNumbers, { id: result.number.id, phoneNumber: result.number.phoneNumber }];
			} else {
				toast.error(result.error || 'Failed to assign');
			}
		} catch (e) {
			toast.error('Failed to assign number');
		}
	}

	async function handleUnassign(cpId: string) {
		try {
			const res = await fetch(`/api/company-numbers/${cpId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.success) {
				toast.success('Number unassigned');
				companyNumbers = companyNumbers.filter((c) => c.id !== cpId);
			} else {
				toast.error(result.error || 'Failed to unassign');
			}
		} catch (e) {
			toast.error('Failed to unassign number');
		}
	}

	async function loadVerifiedNumbers() {
		try {
			const params = new URLSearchParams();
			if (verifiedSearchQuery) {
				params.append('search', verifiedSearchQuery);
			}
			const response = await fetch(`/api/telnyx/verified-numbers?${params.toString()}`);
			const result = await response.json();
			if (result.success) {
				verifiedNumbers = result.numbers;
			}
		} catch (error) {
			console.error('Error loading verified numbers:', error);
		}
	}

	async function loadOrders() {
		try {
			const response = await fetch('/api/telnyx/numbers/orders');
			const result = await response.json();
			if (result.success) numberOrders = result.orders;
			else toast.error(result.error || 'Failed to load orders');
		} catch (error) {
			console.error('Error loading orders:', error);
			toast.error('Error loading orders');
		}
	}

	function truncateId(id: string) {
		if (!id) return '-';
		return id.length > 12 ? id.slice(0, 8) + '…' : id;
	}
	function copyOrderId(id: string) {
		navigator.clipboard.writeText(id);
		toast.success('Order ID copied');
	}

	$effect(() => {
		if (activeTab === 'myNumber') {
			loadNumbers();
		} else if (activeTab === 'messaging') {
			if (messagingSubTab === 'numbers') loadNumbers();
			else if (messagingSubTab === 'orders') loadOrders();
		} else if (activeTab === 'voice') {
			loadVerifiedNumbers();
		}
	});

	$effect(() => {
		if (activeTab === 'myNumber' && searchQuery) {
			const timeout = setTimeout(() => {
				loadNumbers();
			}, 500);
			return () => clearTimeout(timeout);
		}
	});

	$effect(() => {
		if (activeTab === 'voice' && verifiedSearchQuery) {
			const timeout = setTimeout(() => {
				loadVerifiedNumbers();
			}, 500);
			return () => clearTimeout(timeout);
		}
	});

	async function handleDelete(numberId: string, phoneNumber: string) {
		if (!confirm(`Are you sure you want to delete ${phoneNumber}?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/telnyx/numbers/${numberId}`, {
				method: 'DELETE'
			});
			const result = await response.json();

			if (result.success) {
				toast.success('Number deleted successfully');
				await loadNumbers();
			} else {
				toast.error(result.error || 'Failed to delete number');
			}
		} catch (error) {
			console.error('Error deleting number:', error);
			toast.error('Error deleting number');
		}
	}

	function handleEdit(number: any) {
		// TODO: Open edit modal/dialog
		console.log('Edit:', number);
		toast.info('Edit functionality coming soon');
	}
</script>

<div class="min-h-screen bg-[#ECEEF3] p-4">
	{#if $page.url.searchParams.get('buy_number_first') === '1'}
		<div class="mb-4 rounded-[3px] border border-amber-500 bg-amber-50 px-4 py-3 font-['Poppins'] text-[15px] leading-[22px] text-amber-900">
			<strong>IVR requires a phone number.</strong> You must buy or assign at least one phone number to your company before using Call Flows (IVR). Buy or assign a number below, then return to IVR.
		</div>
	{/if}
	<!-- Header -->
	<div class="mb-4 rounded-[3px] bg-white px-4 py-3">
		<h1 class="font-['Poppins'] text-[23px] font-semibold leading-[30px] text-[#747474]">
			My Numbers
		</h1>
	</div>

	<!-- Main Content Card -->
	<div class="rounded-lg bg-white p-6">
		<!-- Tabs -->
		<div class="mb-6 border-b border-[#949494]">
			<div class="flex gap-6">
				<button
					class="relative pb-2 font-['Poppins'] text-lg font-medium leading-[21px] transition-colors {activeTab === 'myNumber'
						? 'text-[#577AB7]'
						: 'text-[#A0A0A0]'}"
					onclick={() => activeTab = 'myNumber'}
				>
					My Number
					{#if activeTab === 'myNumber'}
						<div class="absolute bottom-0 left-0 h-[6px] w-[122px] bg-[#577AB7]"></div>
					{/if}
				</button>
				<button
					class="relative pb-2 font-['Poppins'] text-lg font-medium leading-[21px] transition-colors {activeTab === 'messaging'
						? 'text-[#577AB7]'
						: 'text-[#A0A0A0]'}"
					onclick={() => activeTab = 'messaging'}
				>
					Messaging
					{#if activeTab === 'messaging'}
						<div class="absolute bottom-0 left-0 h-[6px] w-[122px] bg-[#577AB7]"></div>
					{/if}
				</button>
				<button
					class="relative pb-2 font-['Poppins'] text-lg font-medium leading-[21px] transition-colors {activeTab === 'voice'
						? 'text-[#577AB7]'
						: 'text-[#A0A0A0]'}"
					onclick={() => activeTab = 'voice'}
				>
					Voice
					{#if activeTab === 'voice'}
						<div class="absolute bottom-0 left-0 h-[6px] w-[122px] bg-[#577AB7]"></div>
					{/if}
				</button>
			</div>
		</div>

		{#if activeTab === 'messaging'}
			<!-- Hosted Messaging Numbers Content -->
			<div class="space-y-6">
				<!-- Title -->
				<h2 class="font-['Poppins'] text-[23px] font-semibold leading-[30px] text-[#747474]">
					Hosted Messaging Numbers
				</h2>

				<!-- Description -->
				<p class="font-['Poppins'] text-lg font-light leading-[24px] text-[#808080]">
					Hosted SMS allows you to enable SMS/MMS services on numbers that have existing voice services from another provider. The numbers that could also be for landlines that traditionally have never had SMS capabilities.
				</p>

				<!-- Sub-tabs and Create Button -->
				<div class="flex items-center justify-between border-b border-[#949494] pb-2">
					<div class="flex gap-6">
						<button
							class="relative font-['Poppins'] text-lg font-medium leading-[21px] transition-colors {messagingSubTab === 'numbers'
								? 'text-[#577AB7]'
								: 'text-[#A0A0A0]'}"
							onclick={() => messagingSubTab = 'numbers'}
						>
							Numbers
							{#if messagingSubTab === 'numbers'}
								<div class="absolute -bottom-2 left-0 h-[6px] w-full bg-[#577AB7]"></div>
							{/if}
						</button>
						<button
							class="relative font-['Poppins'] text-lg font-medium leading-[21px] transition-colors {messagingSubTab === 'orders'
								? 'text-[#577AB7]'
								: 'text-[#A0A0A0]'}"
							onclick={() => messagingSubTab = 'orders'}
						>
							Orders
							{#if messagingSubTab === 'orders'}
								<div class="absolute -bottom-2 left-0 h-[6px] w-full bg-[#577AB7]"></div>
							{/if}
						</button>
					</div>
					<button
						onclick={() => goto('/manage-numbers/create-order')}
						class="h-[31px] rounded-[4px] bg-[#577AB7] px-4 font-['Poppins'] text-base font-medium leading-[19px] text-white transition-colors hover:bg-[#4a6ba5]"
					>
						Create New Order
					</button>
				</div>

				<!-- Table Container -->
				<div class="rounded-b border border-[#BEBEBE] bg-white">
					{#if messagingSubTab === 'numbers'}
						<div class="border-b border-[#949494] px-4 py-3">
							<div class="grid grid-cols-4 gap-4 font-['Poppins'] text-[15px] font-medium leading-[18px] text-[#757575]">
								<div>Number</div>
								<div>Messaging Profile</div>
								<div>Features</div>
								<div>Created At</div>
							</div>
						</div>
						{#if isLoading}
							<div class="flex h-[200px] items-center justify-center text-[#808080]">Loading...</div>
						{:else if numbers.length === 0}
							<div class="flex h-[200px] items-center justify-center">
								<p class="font-['Poppins'] text-xl font-medium leading-[24px] text-[#808080]">No numbers found.</p>
							</div>
						{:else}
							<div class="divide-y divide-[rgba(193,193,193,0.4)]">
								{#each numbers as num}
									<div class="grid grid-cols-4 gap-4 px-4 py-3">
										<div class="font-['Poppins'] text-sm text-[#808080]">{num.number}</div>
										<div class="font-['Poppins'] text-sm text-[#808080]">{num.messagingProfile}</div>
										<div class="flex gap-1.5">
											{#if num.features?.sms}<MessageSquare class="h-3.5 w-3.5 text-[#577AB7]" />{/if}
											{#if num.features?.voice}<Phone class="h-3.5 w-3.5 text-[#577AB7]" />{/if}
										</div>
										<div class="font-['Poppins'] text-sm text-[#808080]">-</div>
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<!-- Orders sub-tab -->
						<div class="max-h-[400px] overflow-y-auto overflow-x-auto">
							<table class="w-full min-w-[800px]">
								<thead class="sticky top-0 bg-white z-10">
									<tr class="border-b border-[rgba(193,193,193,0.96)]">
										<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold text-[#757575]">Date</th>
										<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold text-[#757575]">Status</th>
										<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold text-[#757575]">Country</th>
										<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold text-[#757575]">Order ID</th>
										<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold text-[#757575]">SubOrder ID</th>
										<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold text-[#757575]">Actor</th>
										<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold text-[#757575]">Number Typ</th>
									</tr>
								</thead>
								<tbody>
									{#if numberOrders.length === 0}
										<tr>
											<td colspan="7" class="py-8 text-center font-['Poppins'] text-[#808080]">No orders found.</td>
										</tr>
									{:else}
										{#each numberOrders as order}
											<tr class="border-b border-[rgba(193,193,193,0.4)]">
												<td class="py-3 font-['Poppins'] text-[15px] text-[#808080]">{order.date}</td>
												<td class="py-3">
													<div class="flex items-center gap-2">
														<div class="h-[6px] w-[5px] rounded-full bg-[#04CB15]"></div>
														<span class="font-['Poppins'] text-[15px] text-[#808080]">{order.status}</span>
													</div>
												</td>
												<td class="py-3 font-['Poppins'] text-[15px] text-[#808080]">{order.country}</td>
												<td class="py-3">
													<div class="flex items-center gap-2">
														<span class="font-['Poppins'] text-[15px] text-[#808080]">{truncateId(order.orderId)}</span>
														<button type="button" onclick={() => copyOrderId(order.orderId)} class="cursor-pointer text-[#6C6C6C] hover:text-[#808080]">
															<Copy class="h-4 w-4" />
														</button>
													</div>
												</td>
												<td class="py-3">
													<div class="flex items-center gap-2">
														<span class="font-['Poppins'] text-[15px] text-[#808080]">{truncateId(order.subOrderId)}</span>
														<button type="button" onclick={() => copyOrderId(order.subOrderId)} class="cursor-pointer text-[#6C6C6C] hover:text-[#808080]">
															<Copy class="h-4 w-4" />
														</button>
													</div>
												</td>
												<td class="py-3 font-['Poppins'] text-[15px] text-[#808080]">{order.actor}</td>
												<td class="py-3 font-['Poppins'] text-[15px] text-[#808080]">{order.numberType}</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'voice'}
			<!-- Verified Numbers Content -->
			<div class="space-y-6">
				<!-- Title -->
				<h2 class="font-['Poppins'] text-[23px] font-semibold leading-[30px] text-[#747474]">
					Verified Numbers
				</h2>

				<!-- Description -->
				<p class="font-['Poppins'] text-base font-light leading-[21px] text-[#808080]">
					Verified Numbers enable you to use that number as a Calling Line Identity (CLI) on your outbound calls done through Telnyx.
				</p>

				<!-- Search and Verify Button -->
				<div class="flex items-center gap-4">
					<div class="relative flex-1">
						<input
							type="text"
							bind:value={verifiedSearchQuery}
							placeholder="Search numbers starting with....."
							class="h-[38px] w-full rounded-[2px] border border-[#787878] bg-white px-3 pr-10 font-['Poppins'] text-base font-normal leading-[19px] text-[#B6B6B6] outline-none placeholder:text-[#B6B6B6]"
						/>
						<Search class="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[#999999]" />
					</div>
					<button
						onclick={() => goto('/manage-numbers/verify')}
						class="h-[38px] rounded-[4px] bg-[#577AB7] px-4 font-['Poppins'] text-base font-medium leading-[19px] text-white transition-colors hover:bg-[#4a6ba5]"
					>
						Verify Number
					</button>
				</div>

				<!-- Table Container -->
				<div class="rounded-b border border-[#BEBEBE] bg-white">
					<!-- Table Headers -->
					<div class="border-b border-[rgba(193,193,193,0.96)] px-4 py-3">
						<div class="grid grid-cols-2 gap-4 font-['Poppins'] text-[15px] font-medium leading-[18px] text-[#757575]">
							<div>Phone Number</div>
							<div>Verified At</div>
						</div>
					</div>

					<!-- Table Rows -->
					<div class="divide-y divide-[rgba(193,193,193,0.96)]">
						{#if verifiedNumbers.length === 0}
							<div class="px-4 py-8 text-center text-gray-500">
								No verified numbers found.
							</div>
						{:else}
						{#each verifiedNumbers as verified}
							<div class="grid grid-cols-2 gap-4 px-4 py-3">
								<div class="font-['Poppins'] text-sm font-normal leading-[17px] text-[#808080]">
									{verified.number}
								</div>
								<div class="flex items-center justify-between">
									<span class="font-['Poppins'] text-sm font-normal leading-[17px] text-[#808080]">
										{verified.verifiedAt}
									</span>
									<button class="text-[#808080] hover:text-red-500 transition-colors">
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</div>
						{/each}
						{/if}
					</div>
				</div>
			</div>
		{:else}

			<!-- Search and Buy Numbers Button -->
			<div class="mb-4 flex items-center gap-4">
				<div class="relative flex-1">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Enter full or partial number (e.g last 4 digital)"
						class="h-[29px] w-full rounded-[2px] border border-[#787878] bg-white px-3 pr-10 font-['Poppins'] text-base font-normal leading-[19px] text-[#B6B6B6] outline-none placeholder:text-[#B6B6B6]"
					/>
					<Search class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808080]" />
				</div>
				<button
					onclick={handleBuyNumbers}
					class="h-[27px] w-[138px] rounded-[4px] bg-[#577AB7] font-['Poppins'] text-base font-medium leading-[19px] text-white transition-colors hover:bg-[#4a6ba5]"
				>
					Buy Numbers
				</button>
			</div>

			<!-- Filter Dropdowns and Action Buttons -->
			<div class="mb-4 flex items-center justify-between gap-4">
			<div class="flex items-center gap-2 flex-wrap">
				<!-- Status -->
				<div class="relative">
					<select class="py-1 min-w-[78px] appearance-none rounded-[2px] border-[0.5px] border-black bg-white px-2 pr-6 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] outline-none">
						<option>Status</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" />
				</div>

				<!-- Tags -->
				<div class="relative">
					<select class="py-1 min-w-[67px] appearance-none rounded-[2px] border-[0.5px] border-black bg-white px-2 pr-6 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] outline-none">
						<option>Tags</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" />
				</div>

				<!-- Connection -->
				<div class="relative">
					<select class="py-1 min-w-[111px] appearance-none rounded-[2px] border-[0.5px] border-black bg-white px-2 pr-6 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] outline-none">
						<option>Connection</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" />
				</div>

				<!-- Messaging Profile -->
				<div class="relative">
					<select class="py-1 min-w-[148px] appearance-none rounded-[2px] border-[0.5px] border-black bg-white px-2 pr-6 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] outline-none">
						<option>Messaging Profile</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" />
				</div>

				<!-- Voice Billing Method -->
				<div class="relative">
					<select class="py-1 min-w-[163px] appearance-none rounded-[2px] border-[0.5px] border-black bg-white px-2 pr-6 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] outline-none">
						<option>Voice Billing Method</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" />
				</div>

				<!-- Emergency Status -->
				<div class="relative">
					<select class="py-1 min-w-[151px] appearance-none rounded-[2px] border-[0.5px] border-black bg-white px-2 pr-6 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] outline-none">
						<option>Emergency Status</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" />
				</div>

				<!-- Countries -->
				<div class="relative">
					<select class="py-1 min-w-[97px] appearance-none rounded-[2px] border-[0.5px] border-black bg-white px-2 pr-6 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] outline-none">
						<option>Countries</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" />
				</div>
			</div>

			<div class="flex items-center gap-2">
				<button
					onclick={handleBulkUpdate}
					class="flex h-[23px] items-center gap-2 rounded-[3px] border-[0.5px] border-black bg-[#ECEFF3] px-3 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] transition-colors hover:bg-[#E0E5EA]"
				>
					Bulk Update
				</button>
				<button
					onclick={handleExport}
					class="flex h-[23px] items-center gap-2 rounded-[3px] border-[0.5px] border-black bg-[#ECEFF3] px-3 font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#757575] transition-colors hover:bg-[#E0E5EA]"
				>
					<Download class="h-3.5 w-3.5" />
					Export
				</button>
			</div>
		</div>

			<!-- Table -->
			<div class="rounded-b border border-t-0 border-[#BEBEBE]">
			<div class="max-h-[391px] overflow-y-auto overflow-x-auto">
				<table class="w-full min-w-[1069px]">
					<thead class="sticky top-0 bg-white z-10">
						<tr class="border-b border-[rgba(193,193,193,0.96)]">
							<th class="pb-3 pl-4 pr-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								<input
									type="checkbox"
									checked={selectedNumbers.size === numbers.length && numbers.length > 0}
									onchange={toggleAllNumbers}
									class="h-[18px] w-[17px] rounded-[1px] border-[0.8px] border-[#949494] bg-[rgba(217,217,217,0.08)]"
								/>
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Number
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Status
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Connection/Application
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Messaging Profile
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Services
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Tags
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Company
							</th>
							<th class="pb-3 text-left font-['Poppins'] text-[15px] font-semibold leading-[18px] text-[#757575]">
								Action
							</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="9" class="py-8 text-center text-gray-500">
									Loading...
								</td>
							</tr>
						{:else if numbers.length === 0}
							<tr>
								<td colspan="9" class="py-8 text-center text-gray-500">
									No numbers found.
								</td>
							</tr>
						{:else}
						{#each numbers as num}
							{@const assigned = isAssigned(num.number)}
							<tr class="border-b border-[rgba(193,193,193,0.4)]">
								<td class="py-3 pl-4 pr-3">
									<input
										type="checkbox"
										checked={selectedNumbers.has(num.number)}
										onchange={() => toggleNumber(num.number)}
										class="h-[18px] w-[17px] rounded-[1px] border-[0.8px] border-[#949494] bg-[rgba(217,217,217,0.08)]"
									/>
								</td>
								<td class="py-3 font-['Poppins'] text-[14px] font-normal leading-[17px] text-[#808080]">
									{num.number}
								</td>
								<td class="py-3">
									<div class="flex items-center gap-2">
										<div class="h-[6px] w-[5px] rounded-full bg-[#04CB15]"></div>
										<span class="font-['Poppins'] text-[14px] font-normal leading-[17px] text-[#808080]">
											- {num.status}
										</span>
									</div>
								</td>
								<td class="py-3 font-['Poppins'] text-[14px] font-normal leading-[17px] text-[#808080]">
									{num.connection}
								</td>
								<td class="py-3 font-['Poppins'] text-[14px] font-normal leading-[17px] text-[#808080]">
									{num.messagingProfile}
								</td>
								<td class="py-3">
									<div class="flex gap-1.5">
										{#if num.features?.sms}
											<MessageSquare class="h-3.5 w-3.5 text-[#577AB7]" />
										{/if}
										{#if num.features?.voice}
											<Phone class="h-3.5 w-3.5 text-[#577AB7]" />
										{/if}
									</div>
								</td>
								<td class="py-3">
									<button class="text-[#808080] hover:text-[#577AB7] transition-colors">
										<Plus class="h-4 w-4" />
									</button>
								</td>
								<td class="py-3 font-['Poppins'] text-[14px] text-[#808080]">
									{#if assigned}
										<span class="text-green-600">Assigned</span>
										<button
											type="button"
											onclick={() => handleUnassign(assigned.id)}
											class="ml-2 text-xs text-[#577AB7] hover:underline"
										>
											Unassign
										</button>
									{:else}
										<button
											type="button"
											onclick={() => handleAssign(num)}
											class="rounded bg-[#577AB7] px-2 py-1 text-xs text-white hover:bg-[#4a6ba5]"
										>
											Assign to company
										</button>
									{/if}
								</td>
								<td class="py-3">
									<div class="flex items-center gap-2">
										<button
											onclick={() => handleEdit(num)}
											class="text-[#666666] hover:text-[#577AB7] transition-colors"
											aria-label="Edit"
										>
											<Pencil class="h-4 w-4" />
										</button>
										<button
											onclick={() => handleDelete(num.id, num.number)}
											class="text-[#666666] hover:text-red-500 transition-colors"
											aria-label="Delete"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
		{/if}
	</div>
</div>
