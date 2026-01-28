<script lang="ts">
	import { Search, Mail, MoreVertical, Mic, ArrowLeft, Download, Trash2, Reply, Phone, MessageSquare, User } from "lucide-svelte";
	import { goto } from "$app/navigation";

	type NotificationRow = {
		id: string;
		type: string;
		direction: string;
		sourceName: string | null;
		sourceIdentifier: string | null;
		messagePreview: string;
		content: string | null;
		read: boolean;
		threadId: string | null;
		messageId: string | null;
		createdAt: Date;
	};

	let { data } = $props();
	let notifications = $derived(data?.notifications ?? []) as NotificationRow[];
	let selectedFilter = $state("All");
	const filters = ["All", "Email", "SMS", "Voice", "Facebook", "Web", "Leadform", "Leadbox"];
	let searchQuery = $state("");
	let selectedNotification = $state<NotificationRow | null>(null);

	function formatTime(d: Date) {
		const date = typeof d === 'string' ? new Date(d) : d;
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	}
	function formatDate(d: Date) {
		const date = typeof d === 'string' ? new Date(d) : d;
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
	}

	let selectedNotifications = $state<Set<string>>(new Set());
	let selectAll = $state(false);

	function toggleSelectAll() {
		if (selectAll) {
			selectedNotifications = new Set();
		} else {
			selectedNotifications = new Set(notifications.map((n) => n.id));
		}
		selectAll = !selectAll;
	}

	function toggleNotification(id: string) {
		if (selectedNotifications.has(id)) {
			selectedNotifications.delete(id);
		} else {
			selectedNotifications.add(id);
		}
		selectedNotifications = new Set(selectedNotifications);
		selectAll = selectedNotifications.size === notifications.length;
	}

	const filteredNotifications = $derived(
		notifications.filter((n) => {
			const matchFilter = selectedFilter === "All" || n.type.toLowerCase() === selectedFilter.toLowerCase();
			const matchSearch = !searchQuery.trim() || (n.sourceName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) || n.messagePreview.toLowerCase().includes(searchQuery.toLowerCase());
			return matchFilter && matchSearch;
		})
	);

	function handleNotificationClick(notification: NotificationRow) {
		selectedNotification = notification;
	}

	function handleReplyClick() {
		if (selectedNotification?.threadId) {
			goto(`/inbox?threadId=${encodeURIComponent(selectedNotification.threadId)}`);
		} else {
			goto(`/notifications/${selectedNotification?.id}/conversation`);
		}
	}

	function typeIcon(type: string) {
		switch (type) {
			case 'sms':
				return MessageSquare;
			case 'voice':
				return Phone;
			case 'email':
				return Mail;
			default:
				return Mail;
		}
	}

	// Realtime: layout subscribes globally and invalidates 'app:notifications'; this page just uses the data
</script>

<div class="w-full p-4 min-w-0 overflow-x-auto">
	{#if selectedNotification}
			<!-- Notification Detail View -->
			<div class="max-w-5xl bg-white rounded-sm">
				<!-- Header -->
				<div class="h-[52px] bg-white rounded-sm flex items-center px-4 gap-3 border-b border-[#E0E0E0]">
					<button
						onclick={() => selectedNotification = null}
						class="w-7 h-5 text-[#7D7D7D] hover:text-[#555555] transition-colors"
						aria-label="Back"
					>
						<ArrowLeft class="w-7 h-5" />
					</button>
				<h1 class="font-sans font-semibold text-xl leading-[1.29] text-[#747474]">
					{selectedNotification.sourceName ?? 'Unknown'}
				</h1>
				</div>

			<!-- Content -->
			<div class="bg-white rounded-sm p-5">
				<!-- Metadata Bar -->
				<div class="flex items-center justify-between mb-5">
					<div class="flex items-center gap-2.5">
						<Mail class="w-4.5 h-4.5 text-[#848484]" />
						<span class="font-sans font-medium text-sm leading-[22px] text-[#717171]">
							{formatDate(selectedNotification.createdAt)} {formatTime(selectedNotification.createdAt)}
						</span>
					</div>
					<div class="flex items-center gap-3.5">
						<button class="w-4 h-4 text-[#848484] hover:text-[#555555] transition-colors" aria-label="Download">
							<Download class="w-4 h-4" />
						</button>
						<button class="w-4 h-4 text-[#848484] hover:text-[#555555] transition-colors" aria-label="Delete">
							<Trash2 class="w-4 h-4" />
						</button>
						<button class="w-4 h-4 text-[#848484] hover:text-[#555555] transition-colors" aria-label="Reply">
							<Reply class="w-4 h-4" />
						</button>
						<button class="w-4 h-4 text-[#848484] hover:text-[#555555] transition-colors" aria-label="More">
							<MoreVertical class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Sender Info -->
				<div class="flex items-center gap-2.5 mb-5">
					<div class="w-8 h-8 rounded-full bg-[#E0E0E0] flex items-center justify-center">
						<User class="w-4.5 h-4.5 text-[#848484]" />
					</div>
				<span class="font-sans font-medium text-sm leading-[1.29] tracking-normal text-[#696969]">
					{selectedNotification.sourceName ?? 'Unknown'}
				</span>
				</div>

				<!-- Message Body -->
				<div class="min-h-[120px] bg-[#F9F9F9] rounded-sm p-4 mb-5">
					<p class="font-normal text-sm leading-[22px] text-[#717171]">
						{selectedNotification.content ?? selectedNotification.messagePreview}
					</p>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center gap-2.5 flex-wrap">
					<button onclick={handleReplyClick} class="relative h-7 px-3 border border-[#7F7F7F] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
						<span class="font-sans font-medium text-xs leading-[1.29] tracking-normal text-[#787878]">
							Reply Now
						</span>
						<Reply class="w-3.5 h-3 text-[#787878] rotate-180" />
					</button>
					<button 
						onclick={() => {
							if (selectedNotification?.sourceIdentifier) {
								goto(`/dialer?phone=${encodeURIComponent(selectedNotification.sourceIdentifier)}`);
							} else {
								goto('/dialer');
							}
						}}
						class="relative h-7 px-3 border border-[#7F7F7F] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
					>
						<span class="font-sans font-medium text-xs leading-[1.29] tracking-normal text-[#787878]">
							Call this Contact
						</span>
						<Phone class="w-3.5 h-3 text-[#787878] rotate-180" />
					</button>
					<button class="relative h-7 px-3 border border-[#7F7F7F] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
						<span class="font-sans font-medium text-xs leading-[1.29] tracking-normal text-[#787878]">
							Reply via SMS
						</span>
						<MessageSquare class="w-3.5 h-3 text-[#787878] rotate-180" />
					</button>
					<button class="relative h-7 px-3 border border-[#7F7F7F] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
						<span class="font-sans font-medium text-xs leading-[1.29] tracking-normal text-[#787878]">
							Reply via Email
						</span>
						<Mail class="w-3.5 h-3 text-[#787878] rotate-180" />
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Title -->
		<h1 class="font-sans font-semibold text-xl leading-[1.29] text-[#747474] mb-5">
			Important Notifications
		</h1>

	<!-- Filters and Search -->
	<div class="flex items-center justify-between mb-5 gap-4">
		<!-- Filter Buttons -->
		<div class="flex items-center gap-2.5">
			{#each filters as filter}
				<button
					onclick={() => selectedFilter = filter}
					class="h-9 px-3.5 rounded-lg font-sans font-normal text-sm leading-[1.29] transition-colors {selectedFilter === filter
						? 'bg-[#577AB7] text-white'
						: 'bg-[#D7DFEB] text-[#577AB7]'}"
				>
					{filter}
				</button>
			{/each}
			<button class="h-9 w-9 rounded-lg bg-[#D7DFEB] flex items-center justify-center">
				<MoreVertical class="w-4.5 h-4.5 text-[#577AB7]" />
			</button>
		</div>

		<!-- Search Bar -->
		<div class="relative max-w-lg flex-1 h-9 bg-white rounded-lg flex items-center px-3.5 gap-2.5">
			<Search class="w-4.5 h-4.5 text-[#577AB7]" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search"
				class="flex-1 outline-none font-sans font-normal text-sm leading-[1.29] text-[rgba(120,120,120,0.54)] placeholder:text-[rgba(120,120,120,0.54)]"
			/>
			<Mic class="w-4 h-4.5 text-[#577AB7]" />
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white border-[0.5px] border-[#9A9A9A] rounded-lg overflow-hidden">
		<!-- Table Header -->
		<div class="h-12 bg-[#F3F3F3] border-b border-[#9A9A9A] rounded-t-lg flex items-center px-4 gap-3">
			<input
				type="checkbox"
				checked={selectAll}
				onchange={toggleSelectAll}
				class="w-4.5 h-4.5 bg-[rgba(217,217,217,0.15)] border-[1.5px] border-[#4B4B4B] rounded-sm cursor-pointer"
			/>
			<div class="w-20 font-sans font-medium text-sm leading-[1.29] text-[#565656]">
				Type
			</div>
			<div class="w-36 font-sans font-medium text-sm leading-[1.29] text-[#565656]">
				Name
			</div>
			<div class="flex-1 font-sans font-medium text-sm leading-[1.29] text-[#565656]">
				Message
			</div>
			<div class="w-24 font-sans font-medium text-sm leading-[1.29] text-[#565656]">
				Time
			</div>
		</div>

		<!-- Table Body -->
		<div class="max-h-[550px] overflow-y-auto">
			{#if filteredNotifications.length === 0}
				<div class="h-24 flex items-center justify-center text-[#717171] font-sans text-sm">
					{searchQuery.trim() || selectedFilter !== "All" ? "No matching notifications." : "No notifications yet. New messages and communication logs will appear here."}
				</div>
			{:else}
			{#each filteredNotifications as notification, index}
				{@const Icon = typeIcon(notification.type)}
				<div
					role="button"
					tabindex="0"
					class="h-12 border-b border-[#BEBEBE] flex items-center px-4 gap-3 hover:bg-gray-50 transition-colors cursor-pointer {index === filteredNotifications.length - 1 ? 'border-b-0' : ''} {index % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}"
					onclick={() => handleNotificationClick(notification)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleNotificationClick(notification);
						}
					}}
				>
					<input
						type="checkbox"
						checked={selectedNotifications.has(notification.id)}
						onchange={() => toggleNotification(notification.id)}
						onclick={(e) => e.stopPropagation()}
						class="w-4.5 h-4.5 bg-[rgba(217,217,217,0.15)] border-[1.5px] border-[#919191] rounded-sm cursor-pointer"
					/>
					<div class="w-20 flex items-center">
						<Icon class="w-5 h-4 text-[#B7B7B7]" />
					</div>
					<div class="w-36 font-sans font-medium text-sm leading-[1.29] text-[#787878]">
						{notification.sourceName ?? 'Unknown'}
					</div>
					<div
						class="flex-1 font-sans text-sm leading-[1.29] text-[#717171] truncate {!notification.read
							? 'font-semibold'
							: 'font-normal'}"
					>
						{notification.messagePreview}
					</div>
					<div class="w-24 font-sans font-normal text-sm leading-[1.29] text-[rgba(86,86,86,0.78)]">
						{formatTime(notification.createdAt)}
					</div>
				</div>
			{/each}
			{/if}
		</div>
	</div>
	{/if}
</div>
