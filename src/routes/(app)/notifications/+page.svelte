<script lang="ts">
	import { Search, Mail, MoreVertical, Mic, ArrowLeft, Download, Trash2, Reply, Phone, MessageSquare, User } from "lucide-svelte";
	import { goto } from "$app/navigation";

	let selectedFilter = $state("All");
	const filters = ["All", "Email", "SMS", "Voice", "Facebook"];
	let searchQuery = $state("");
	let selectedNotification = $state<Notification | null>(null);

	interface Notification {
		id: string;
		type: "email" | "sms" | "voice" | "facebook";
		name: string;
		message: string;
		time: string;
		isBold?: boolean;
		fullMessage?: string;
		date?: string;
		phone?: string;
	}


	const notifications: Notification[] = [
		{
			id: "1",
			type: "email",
			name: "Maria Lopez",
			message: "[Urgent] Interview – HR Position Please confirm your attendance...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "[Urgent] Interview – HR Position Please confirm your attendance for the interview scheduled on November 15, 2025 at 2:00 PM.",
			date: "Fri, Oct 17, 2025",
			phone: "70541236346"
		},
		{
			id: "2",
			type: "email",
			name: "Ella Santos",
			message: "Demo Room Launch Webinar on Nov 2, 2025, at 10:00 AM. Join u...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "Demo Room Launch Webinar on Nov 2, 2025, at 10:00 AM. Join us for an exclusive preview of our new features.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "3",
			type: "email",
			name: "Angela Torres",
			message: "Your dedicated support session is confirmed for Nov 6, 2025, a...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "Your dedicated support session is confirmed for Nov 6, 2025, at 3:00 PM. We'll discuss your microsite optimization.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "4",
			type: "email",
			name: "Jasmine Cruz",
			message: "Your Supplier - is ready for review. Kindly check the layout and...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "Your Supplier - is ready for review. Kindly check the layout and provide your feedback by end of week.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "5",
			type: "email",
			name: "Sophie Lim",
			message: "Your current logo file is slightly outdated. If you'd like, upload a...",
			time: "11:45 AM",
			isBold: false,
			fullMessage: "Congratulations! Your Founder Benefit Package has been successfully activated. As one of our early partners, you're now entitled to 50% off banner advertising for five years and two hours of dedicated monthly support for your microsite. Thank you for being part of our early innovation phase — your input helps shape the platform's future.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "6",
			type: "email",
			name: "Liam Garcia",
			message: "HR Module setup on your microsite isn't complete yet. Please fi...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "HR Module setup on your microsite isn't complete yet. Please finish the configuration to enable all features.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "7",
			type: "email",
			name: "Kevin Tan",
			message: "Just a quick reminder — the Microsite Deployment Report is due..",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "Just a quick reminder — the Microsite Deployment Report is due by Friday. Please submit it at your earliest convenience.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "8",
			type: "email",
			name: "Ryan Kim",
			message: "Prospector Microsite are now live. Please review the event and...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "Prospector Microsite are now live. Please review the event and provide feedback on the new features.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "9",
			type: "email",
			name: "HR Department",
			message: "[Urgent] Interview – HR Position Please confirm your attendance...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "[Urgent] Interview – HR Position Please confirm your attendance for the interview scheduled on November 15, 2025 at 2:00 PM.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "10",
			type: "email",
			name: "Nathan James",
			message: "A new client has reached out regarding your AI Design & Demo...",
			time: "11:45 AM",
			isBold: false,
			fullMessage: "A new client has reached out regarding your AI Design & Demo Room. They're interested in scheduling a consultation.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "11",
			type: "email",
			name: "Daniel Cruz",
			message: "Founder Benefit Package is now active. Enjoy 50% off banner a...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "Founder Benefit Package is now active. Enjoy 50% off banner advertising and exclusive monthly support sessions.",
			date: "Fri, Oct 17, 2025"
		},
		{
			id: "12",
			type: "email",
			name: "Chloe Reyes",
			message: "We've upgraded the Viewroom feature to include note-taking...",
			time: "11:45 AM",
			isBold: false,
			fullMessage: "We've upgraded the Viewroom feature to include note-taking capabilities. Check it out and let us know what you think!",
			date: "Fri, Oct 17, 2025"
		}
	];

	let selectedNotifications = $state<Set<string>>(new Set());
	let selectAll = $state(false);

	function toggleSelectAll() {
		if (selectAll) {
			selectedNotifications = new Set();
		} else {
			selectedNotifications = new Set(notifications.map(n => n.id));
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
		selectedFilter === "All"
			? notifications
			: notifications.filter(n => n.type.toLowerCase() === selectedFilter.toLowerCase())
	);

	function handleNotificationClick(notification: Notification) {
		selectedNotification = notification;
	}

	function handleReplyClick() {
		if (selectedNotification) {
			goto(`/notifications/${selectedNotification.id}/conversation`);
		}
	}

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
						{selectedNotification.name}
					</h1>
				</div>

			<!-- Content -->
			<div class="bg-white rounded-sm p-5">
				<!-- Metadata Bar -->
				<div class="flex items-center justify-between mb-5">
					<div class="flex items-center gap-2.5">
						<Mail class="w-4.5 h-4.5 text-[#848484]" />
						<span class="font-sans font-medium text-sm leading-[22px] text-[#717171]">
							{selectedNotification.date || "Fri, Oct 17, 2025"} {selectedNotification.time || "11:29 PM"}
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
						{selectedNotification.name}
					</span>
				</div>

				<!-- Message Body -->
				<div class="min-h-[120px] bg-[#F9F9F9] rounded-sm p-4 mb-5">
					<p class="font-normal text-sm leading-[22px] text-[#717171]">
						{selectedNotification.fullMessage || selectedNotification.message}
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
							if (selectedNotification?.phone) {
								goto(`/dialer?phone=${encodeURIComponent(selectedNotification.phone)}`);
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
			{#each filteredNotifications as notification, index}
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
						<Mail class="w-5 h-4 text-[#B7B7B7]" />
					</div>
					<div class="w-36 font-sans font-medium text-sm leading-[1.29] text-[#787878]">
						{notification.name}
					</div>
					<div
						class="flex-1 font-sans text-sm leading-[1.29] text-[#717171] truncate {notification.isBold
							? 'font-semibold'
							: 'font-normal'}"
					>
						{notification.message}
					</div>
					<div class="w-24 font-sans font-normal text-sm leading-[1.29] text-[rgba(86,86,86,0.78)]">
						{notification.time}
					</div>
				</div>
			{/each}
		</div>
	</div>
	{/if}
</div>
