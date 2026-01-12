<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index";
	import { ArrowLeft, Download, Trash2, Mail, Clock, Star, Eye, Reply, MoreVertical } from "lucide-svelte";
	import ReplyDialog from "./reply-dialog.svelte";

	interface NotificationDetail {
		sender: string;
		senderInitials: string;
		recipient: string;
		date: string;
		time: string;
		message: string;
		signature: string;
		recipientEmail?: string;
	}

	interface Props {
		open?: boolean;
		notification?: NotificationDetail | null;
		onCloseNotifications?: () => void;
	}

	let {
		open = $bindable(false),
		notification = null,
		onCloseNotifications
	}: Props = $props();

	let replyDialogOpen = $state(false);
	let useAI = $state(false);

	function formatDate(dateStr: string): string {
		// Convert "Dec 01 2024" to "December, 01 2024"
		const monthMap: Record<string, string> = {
			'Jan': 'January',
			'Feb': 'February',
			'Mar': 'March',
			'Apr': 'April',
			'May': 'May',
			'Jun': 'June',
			'Jul': 'July',
			'Aug': 'August',
			'Sep': 'September',
			'Oct': 'October',
			'Nov': 'November',
			'Dec': 'December'
		};
		const parts = dateStr.split(' ');
		if (parts.length >= 3 && monthMap[parts[0]]) {
			return `${monthMap[parts[0]]}, ${parts[1]} ${parts[2]}`;
		}
		return dateStr;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="!w-[1440px] max-w-[80vw] !max-h-[90vh] !p-0 bg-white overflow-hidden [&>button]:hidden"
	>
		<div class="w-full h-full flex flex-col overflow-hidden">
			<!-- Top Action Bar -->
			<div class="flex items-center justify-between px-6 py-3 bg-[#F9F9F9] border-b border-[#C6C6C6] flex-shrink-0">
				<div class="flex items-center gap-4">
					<button
						class="w-4 h-4 text-[#616161] hover:text-[#3D3D3D] transition-colors"
						onclick={() => open = false}
						aria-label="Back"
					>
						<ArrowLeft class="w-4 h-4 " />
					</button>
					<button
						class="w-5 h-5 text-[#818181] hover:text-[#616161] transition-colors"
						aria-label="Archive"
					>
						<Download class="w-5 h-5" />
					</button>
					<button
						class="w-5 h-5 text-[#818181] hover:text-[#616161] transition-colors"
						aria-label="Delete"
					>
						<Trash2 class="w-5 h-5" />
					</button>
					<button
						class="w-5 h-5 text-[#818181] hover:text-[#616161] transition-colors"
						aria-label="Mark as read"
					>
						<Mail class="w-5 h-5" />
					</button>
					<button
						class="w-5 h-5 text-[#818181] hover:text-[#616161] transition-colors"
						aria-label="Reminder"
					>
						<Clock class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Message Header -->
			<div class="px-6 py-4 flex-shrink-0">
				<div class="flex items-start gap-4 mb-4">
					<!-- Avatar -->
					<div class="w-[50px] h-12 rounded-full bg-[#59875F] flex items-center justify-center flex-shrink-0">
						<span class="font-sans font-semibold text-2xl leading-[28px] text-white">
							{notification?.senderInitials || 'SL'}
						</span>
					</div>

					<!-- Sender Info -->
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between mb-1">
							<div class="flex flex-col gap-1">
								<span class="font-sans font-semibold text-lg leading-[21px] text-[#3D3D3D]">
									{notification?.sender || 'Sarah Lee'}
								</span>
								<span class="font-sans font-normal text-[15px] leading-[18px] text-[#3F3F3F]">
									to me, {notification?.recipient || 'Mark Doe'}
								</span>
							</div>

							<div class="flex items-center gap-4 flex-shrink-0">
								<span class="font-sans font-normal text-lg leading-[21px] text-[#727272] whitespace-nowrap">
									{formatDate(notification?.date || 'Dec 01 2024')} {notification?.time || '9:33 PM'}
								</span>

								<!-- Action Icons -->
								<div class="flex items-center gap-3">
									<button
										class="w-[17.58px] h-[13.6px] text-[#616161] hover:text-[#3D3D3D] transition-colors"
										aria-label="Star"
									>
										<Star class="w-[17.58px] h-[13.6px]" />
									</button>
									<button
										class="w-[14px] h-[14px] text-[#616161] hover:text-[#3D3D3D] transition-colors"
										aria-label="Mark as read"
									>
										<Eye class="w-[14px] h-[14px]" />
									</button>
									<button
										class="w-[15px] h-[14px] text-[#616161] hover:text-[#3D3D3D] transition-colors"
										aria-label="Reply"
									>
										<Reply class="w-[15px] h-[14px]" />
									</button>
									<button
										class="w-4 h-4 text-[#616161] hover:text-[#3D3D3D] transition-colors"
										aria-label="More options"
									>
										<MoreVertical class="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Separator Line -->
				<div class="w-full h-px bg-[#868686] mb-4"></div>
			</div>

			<!-- Message Body -->
			<div class="flex-1 overflow-y-auto min-h-0 px-6">
				<div class="mb-4">
					<p class="font-sans font-normal text-base leading-[19px] text-black mb-4">
						{notification?.message || 'I am interested in purchasing a new car. Can I test drive the Ford F150 2026. I would like to visit your dealership this coming Friday between 2:00 pm and 3:30 pm.'}
					</p>
					<p class="font-sans font-normal text-lg leading-[21px] text-[#3F3F3F]">
						{notification?.signature || '-- Best Wishes, Sarah'}
					</p>
				</div>

				<!-- Separator Line -->
				<div class="w-full h-px bg-[#AAAAAA] mb-4"></div>
			</div>

			<!-- Action Buttons -->
			<div class="px-6 py-4 flex items-center gap-4 flex-shrink-0 border-t border-[#C6C6C6] bg-white">
				<button
					class="h-[41px] px-4 border border-black rounded-2xl flex items-center gap-2 font-sans font-normal text-lg leading-[21px] text-black hover:bg-gray-50 transition-colors"
					onclick={() => {
						useAI = true;
						replyDialogOpen = true;
					}}
				>
					<Reply class="w-5 h-[15px] text-[#474948]" />
					<span>Reply with AI</span>
				</button>
				<button
					class="h-[41px] px-4 border border-black rounded-2xl flex items-center gap-2 font-sans font-normal text-lg leading-[21px] text-black hover:bg-gray-50 transition-colors"
				>
					<Reply class="w-5 h-[15px] text-[#474948] rotate-180" />
					<span>Forward with AI</span>
				</button>
				<button
					class="h-[41px] px-4 border border-black rounded-xl flex items-center gap-2 font-sans font-normal text-lg leading-[21px] text-black hover:bg-gray-50 transition-colors"
					onclick={() => {
						useAI = false;
						replyDialogOpen = true;
					}}
				>
					<Reply class="w-5 h-[15px] text-[#474948]" />
					<span>Reply</span>
				</button>
				<button
					class="h-[41px] px-4 border border-black rounded-xl flex items-center gap-2 font-sans font-normal text-lg leading-[21px] text-black hover:bg-gray-50 transition-colors"
				>
					<Reply class="w-5 h-[15px] text-[#474948] rotate-180" />
					<span>Forward</span>
				</button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

{#if notification}
	<ReplyDialog
		bind:open={replyDialogOpen}
		useAI={useAI}
		onSend={() => {
			// Close the notification detail dialog when send is clicked
			open = false;
		}}
		onCloseAll={() => {
			// Close notifications dialog as well
			if (onCloseNotifications) {
				onCloseNotifications();
			}
		}}
		replyData={{
			sender: notification.sender,
			senderInitials: notification.senderInitials,
			recipient: notification.recipient,
			recipientEmail: notification.recipientEmail || `${notification.sender.toLowerCase().replace(' ', '')}@email.com`,
			date: notification.date,
			time: notification.time,
			originalMessage: notification.message,
			originalSignature: notification.signature
		}}
	/>
{/if}
