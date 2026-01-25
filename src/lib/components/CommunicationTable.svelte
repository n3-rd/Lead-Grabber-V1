<script lang="ts">
	import { Search, Mic, Mail, MessageSquare, Phone, Globe, Facebook, Bot, FileText, Square, MessageCircle } from 'lucide-svelte';

	export interface Communication {
		id: string;
		date: string;
		time: string;
		type?: "email" | "sms" | "voice" | "web" | "facebook" | "chatbot" | "leadform" | "leadbox";
		typeIcon?: string; // For communication-log page compatibility
		direction: "In" | "Out";
		source: string;
		endpoint: string;
		purpose: string | null;
		summary: string | null;
		commId: string | null;
		status: "red" | "green" | "blue" | "in" | "out";
		assignedMemberNames?: string[];
		raw?: any; // For storing original data
	}

	interface Props {
		communications: Communication[];
		filters?: string[];
		onSummaryClick?: (comm: Communication) => void;
		onActionClick?: (action: string, comm: Communication) => void;
		onAssignClick?: (comm: Communication) => void;
		showFilters?: boolean;
		showSearch?: boolean;
		showAssignButton?: boolean;
	}

	let {
		communications = $bindable(),
		filters = $bindable(['All', 'Email', 'SMS', 'Voice', 'Web', 'Facebook', 'Chatbot', 'Leadform', 'Leadbox']),
		onSummaryClick,
		onActionClick,
		onAssignClick,
		showFilters = true,
		showSearch = true,
		showAssignButton = false
	}: Props = $props();

	let activeFilter = $state('All');
	let searchQuery = $state('');
	let openOptionsMenu = $state<string | null>(null);

	const filteredCommunications = $derived(() => {
		let filtered = communications;

		// Apply type filter
		if (activeFilter !== 'All') {
			const filterType = activeFilter.toLowerCase();
			filtered = filtered.filter((comm) => {
				const commType = (comm.type || comm.typeIcon || '').toLowerCase();
				return commType === filterType;
			});
		}

		// Apply search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((comm) =>
				comm.source?.toLowerCase().includes(query) ||
				comm.endpoint?.toLowerCase().includes(query) ||
				comm.summary?.toLowerCase().includes(query) ||
				comm.commId?.toLowerCase().includes(query) ||
				comm.type?.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	function getStatusColor(status: string) {
		switch (status) {
			case "red": return "bg-[#FB2C36]";
			case "green": return "bg-[#00C951]";
			case "blue": return "bg-[#0077FE]";
			case "in": return "bg-[#00C951]";
			case "out": return "bg-[#FB2C36]";
			default: return "bg-[#4A4A4A]";
		}
	}

	function getTypeIcon(type: string | undefined) {
		const typeToCheck = type?.toLowerCase();
		switch (typeToCheck) {
			case "email": return Mail;
			case "sms": return MessageSquare;
			case "voice": return Phone;
			case "web": return Globe;
			case "facebook": return Facebook;
			case "chatbot": return Bot;
			case "leadform": return FileText;
			case "leadbox": return MessageCircle;
			default: return Mail;
		}
	}

	function getTypeDisplay(comm: Communication) {
		return comm.type || comm.typeIcon || 'email';
	}

	function handleSummaryClick(comm: Communication) {
		if (onSummaryClick) {
			onSummaryClick(comm);
		}
	}

	function handleActionClick(action: string, comm: Communication) {
		if (onActionClick) {
			onActionClick(action, comm);
		}
		openOptionsMenu = null;
	}
</script>

<div class="bg-white border border-[#ABABAB] rounded overflow-hidden">
	<!-- Filter Tabs & Search -->
	{#if showFilters || showSearch}
		<div class="flex items-center justify-between p-4 border-b border-[#ABABAB]">
			{#if showFilters}
				<div class="flex items-center gap-2">
					{#each filters as filter}
						<button
							class="px-4 py-2 rounded font-sans font-medium text-base leading-[1.29] transition-colors {activeFilter === filter ? 'bg-[#0F172A] text-white font-bold' : 'text-[#555555] hover:bg-gray-100'}"
							onclick={() => activeFilter = filter}
						>
							{filter}
						</button>
					{/each}
				</div>
			{/if}
			{#if showSearch}
				<div class="w-[349px] h-[43px] bg-white border border-[#ADADAD] rounded flex items-center px-4 gap-2">
					<Search class="w-4 h-4 text-[#555555]" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search communications..."
						class="flex-1 outline-none font-sans font-light text-sm leading-[1.29] text-[rgba(85,85,85,0.53)] placeholder:text-[rgba(85,85,85,0.53)]"
					/>
					<Mic class="w-4 h-4 text-[#555555]" />
				</div>
			{/if}
		</div>
	{/if}

	<!-- Communications Table -->
	<div class="w-full">
		<!-- Table Header -->
		<div class="h-[46px] bg-[#F3F3F3] rounded-t-[4px] flex items-center px-4">
			<div class="w-[30px]"></div>
			<div class="w-[100px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">DATE</div>
			<div class="w-[80px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">TYPE</div>
			<div class="w-[130px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">SOURCE</div>
			<div class="w-[150px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">ENDPOINT</div>
			<div class="w-[110px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">PURPOSE</div>
			<div class="w-[90px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">SUMMARY</div>
			<div class="w-[100px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">COMM ID</div>
			<div class="flex-1 font-sans font-semibold text-xs leading-[1.29] text-[#555555] text-right">ACTIONS</div>
		</div>

		<!-- Table Body -->
		{#if filteredCommunications().length === 0}
			<div class="h-[80px] bg-[#FBFCFD] border-b border-[#C6C6C6] flex items-center justify-center px-4">
				<p class="font-sans font-normal text-sm text-[#555555]">No communications found</p>
			</div>
		{:else}
			{#each filteredCommunications() as comm, index}
				{@const commType = getTypeDisplay(comm)}
				{@const IconComponent = getTypeIcon(commType)}
				<div class="h-[80px] bg-[#FBFCFD] border-b border-[#C6C6C6] flex items-center px-4">
					<div class="w-[30px]">
						<div class="w-[18px] h-[18px] rounded-full {getStatusColor(comm.status)}"></div>
					</div>
					<div class="w-[100px]">
						<p class="font-sans font-semibold text-sm leading-[1.29] text-[#555555]">{comm.date}</p>
						<p class="font-sans font-normal text-xs leading-[1.29] text-[#555555]">{comm.time}</p>
					</div>
					<div class="w-[80px] flex items-center gap-1">
						<IconComponent class="w-[23px] h-4 text-black" />
						<span class="font-sans font-medium text-sm leading-[1.29] text-[#555555]">{comm.direction}</span>
					</div>
					<div class="w-[130px] font-sans font-medium text-sm leading-[1.29] text-[#555555] truncate">{comm.source}</div>
					<div class="w-[150px]">
						{#if showAssignButton && onAssignClick}
							<div class="flex flex-col gap-1">
								<span class="font-sans font-medium text-sm leading-[1.29] text-[#555555] truncate">{comm.endpoint}</span>
								<button
									class="text-left font-sans text-xs font-normal leading-[1.29] text-[#0023D7] underline hover:no-underline"
									onclick={() => onAssignClick(comm)}
								>
									assign
								</button>
							</div>
						{:else}
							<span class="font-sans font-medium text-sm leading-[1.29] text-[#555555] truncate">{comm.endpoint}</span>
						{/if}
					</div>
					<div class="w-[110px]">
						{#if comm.purpose}
							{#if comm.purpose === "Confirm"}
								<button class="px-4 py-1.5 bg-[#577AB7] rounded text-white font-sans font-medium text-sm">Confirm</button>
							{:else}
								<span class="font-sans font-medium text-sm leading-[1.29] text-[#555555]">{comm.purpose}</span>
							{/if}
						{/if}
					</div>
					<div class="w-[90px]">
						{#if comm.summary}
							<button
								onclick={() => handleSummaryClick(comm)}
								class="font-sans font-normal text-sm leading-[1.29] text-[#0023D7] underline cursor-pointer hover:text-[#001ba3]"
							>
								{comm.summary.length > 20 ? comm.summary.substring(0, 20) + '...' : comm.summary}
							</button>
						{/if}
					</div>
					<div class="w-[100px] font-sans font-normal text-sm leading-[1.29] text-[#555555] truncate">{comm.commId || ''}</div>
					<div class="flex-1 flex justify-end relative">
						<button 
							class="w-6 h-6 rounded-full border border-[#515151] flex items-center justify-center gap-0.5 hover:bg-gray-100"
							aria-label="More actions"
							onclick={(e) => { e.stopPropagation(); openOptionsMenu = openOptionsMenu === comm.id ? null : comm.id; }}
						>
							<span class="w-1 h-1 rounded-full bg-[#515151]"></span>
							<span class="w-1 h-1 rounded-full bg-[#515151]"></span>
							<span class="w-1 h-1 rounded-full bg-[#515151]"></span>
						</button>
						
						{#if openOptionsMenu === comm.id}
							<div class="absolute right-0 top-8 w-[200px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] border border-[#E5E5E5] z-50">
							<button 
								class="w-full px-4 py-2 text-left font-sans text-sm text-[#555555] hover:bg-[#F5F5F5] border-b border-[#E5E5E5]"
								onclick={() => handleActionClick('view', comm)}
							>
								View Details
							</button>
							<button 
								class="w-full px-4 py-2 text-left font-sans text-sm text-[#555555] hover:bg-[#F5F5F5] border-b border-[#E5E5E5]"
								onclick={() => handleActionClick('call', comm)}
							>
								Call
							</button>
							<button 
								class="w-full px-4 py-2 text-left font-sans text-sm text-[#555555] hover:bg-[#F5F5F5] border-b border-[#E5E5E5]"
								onclick={() => handleActionClick('sms', comm)}
							>
								SMS
							</button>
							<button 
								class="w-full px-4 py-2 text-left font-sans text-sm text-red-500 hover:bg-[#F5F5F5]"
								onclick={() => handleActionClick('email', comm)}
							>
								Email
							</button>
						</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
