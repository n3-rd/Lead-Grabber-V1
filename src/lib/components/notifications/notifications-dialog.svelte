<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index";
	import { Download, Trash2, Mail, Clock } from "lucide-svelte";
	import NotificationDetailDialog from "./notification-detail-dialog.svelte";

	interface Notification {
		date: string;
		time: string;
		sender: string;
		commId: string;
		message: string;
		senderInitials?: string;
		recipient?: string;
		recipientEmail?: string;
		signature?: string;
	}

	interface Props {
		open?: boolean;
		notifications?: Notification[];
	}

	let {
		open = $bindable(false),
		notifications = [
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Sarah Lee",
				commId: "COM-00123",
				message: "I am interested in purchasing a new car. Can I test drive the Ford F150 2026. I would like to visit your dealership this coming Friday between 2:00 pm and 3:30 pm.",
				recipient: "Mark Doe"
			},
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Rory Dredhart",
				commId: "COM-00123",
				message: "Would like to meet you. Hello good day I am interested in purchasing a new car..."
			},
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Rory Dredhart",
				commId: "COM-00123",
				message: "Would like to meet you. Hello good day I am interested in purchasing a new car..."
			},
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Rory Dredhart",
				commId: "COM-00123",
				message: "Would like to meet you. Hello good day I am interested in purchasing a new car..."
			},
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Rory Dredhart",
				commId: "COM-00123",
				message: "Would like to meet you. Hello good day I am interested in purchasing a new car..."
			},
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Rory Dredhart",
				commId: "COM-00123",
				message: "Would like to meet you. Hello good day I am interested in purchasing a new car..."
			},
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Rory Dredhart",
				commId: "COM-00123",
				message: "Would like to meet you. Hello good day I am interested in purchasing a new car..."
			},
			{
				date: "Dec 01 2024",
				time: "9:33 PM",
				sender: "Rory Dredhart",
				commId: "COM-00123",
				message: "Would like to meet you. Hello good day I am interested in purchasing a new car..."
			}
		]
	}: Props = $props();

	let detailDialogOpen = $state(false);
	let selectedNotification = $state<Notification | null>(null);

	function openDetail(notification: Notification) {
		selectedNotification = notification;
		detailDialogOpen = true;
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="!w-[1430px] max-w-[95vw] !max-h-[700px] !p-0 bg-white overflow-hidden [&>button]:hidden"
	>
		<div class="w-full h-full flex flex-col overflow-hidden">
			<!-- Header: Your Notifications -->
			<div class="px-6 py-4 border-b border-[#C6C6C6] flex-shrink-0">
				<h2
					class="font-sans font-normal text-2xl leading-[1.29] text-[#555555]"
				>
					Your Notifications
				</h2>
			</div>

			<!-- Notifications List -->
			<div class="flex-1 overflow-y-auto min-h-0">
				{#each notifications as notification, index}
					<div
						class="w-full h-[80px] border-b-[0.7px] border-[#C6C6C6] flex items-center px-6 gap-6 {index % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'} cursor-pointer hover:bg-gray-100 transition-colors"
						onclick={() => openDetail(notification)}
					>
						<!-- Date and Time -->
						<div class="flex flex-col gap-1 flex-shrink-0">
							<span
								class="font-sans font-normal text-lg leading-[1.29] text-[#727272]"
							>
								{notification.date}
							</span>
							<span
								class="font-sans font-normal text-[15px] leading-[1.29] text-[#727272]"
							>
								{notification.time}
							</span>
						</div>

						<!-- Sender and Comm ID -->
						<div class="flex flex-col gap-1 flex-shrink-0">
							<span
								class="font-sans font-normal text-lg leading-[1.29] text-[#727272]"
							>
								{notification.sender}
							</span>
							<span
								class="font-sans font-normal text-sm leading-[1.29] text-[#555555]"
							>
								{notification.commId}
							</span>
						</div>

						<!-- Message -->
						<div class="flex-1 min-w-0">
							<p
								class="font-sans font-normal text-lg leading-[1.29] text-[#727272] truncate"
							>
								{notification.message}
							</p>
						</div>

						<!-- Action Icons -->
						<div class="flex items-center gap-4 flex-shrink-0" onclick={(e) => e.stopPropagation()}>
							<button
								class="w-5 h-5 text-[#818181] hover:text-[#555555] transition-colors"
								aria-label="Download"
							>
								<Download class="w-5 h-5" />
							</button>
							<button
								class="w-5 h-5 text-[#818181] hover:text-[#555555] transition-colors"
								aria-label="Delete"
							>
								<Trash2 class="w-5 h-5" />
							</button>
							<button
								class="w-5 h-5 text-[#818181] hover:text-[#555555] transition-colors"
								aria-label="Email"
							>
								<Mail class="w-5 h-5" />
							</button>
							<button
								class="w-5 h-5 text-[#818181] hover:text-[#555555] transition-colors"
								aria-label="Reminder"
							>
								<Clock class="w-5 h-5" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

{#if selectedNotification}
	<NotificationDetailDialog
		bind:open={detailDialogOpen}
		onCloseNotifications={() => {
			open = false;
		}}
		notification={{
			sender: selectedNotification.sender,
			senderInitials: selectedNotification.senderInitials || getInitials(selectedNotification.sender),
			recipient: selectedNotification.recipient || 'Mark Doe',
			recipientEmail: selectedNotification.recipientEmail || `${selectedNotification.sender.toLowerCase().replace(' ', '')}@email.com`,
			date: selectedNotification.date,
			time: selectedNotification.time,
			message: selectedNotification.message.includes('...') 
				? 'I am interested in purchasing a new car. Can I test drive the Ford F150 2026. I would like to visit your dealership this coming Friday between 2:00 pm and 3:30 pm.'
				: selectedNotification.message,
			signature: selectedNotification.signature || `-- Best Wishes, ${selectedNotification.sender.split(' ')[0]}`
		}}
	/>
{/if}
