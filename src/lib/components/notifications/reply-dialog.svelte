<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index";
	import { ArrowLeft, Download, Trash2, Mail, Clock, Star, Eye, Reply, MoreVertical, Send, Type, Paperclip, Link, Image } from "lucide-svelte";

	interface ReplyData {
		sender: string;
		senderInitials: string;
		recipient: string;
		recipientEmail: string;
		date: string;
		time: string;
		originalMessage: string;
		originalSignature: string;
	}

	interface Props {
		open?: boolean;
		replyData?: ReplyData | null;
		useAI?: boolean;
		onSend?: () => void;
		onCloseAll?: () => void;
	}

	let {
		open = $bindable(false),
		replyData = null,
		useAI = false,
		onSend,
		onCloseAll
	}: Props = $props();

	let replyMessage = $state('');
	let agent = $state('Mark Doe');
	let appointmentTime = $state('2:30pm - 3:15pm');
	let location = $state('123 Pine St N Timmins Ontario');
	let purpose = $state('Test Drive');

	$effect(() => {
		if (open && useAI && replyData) {
			// Pre-fill with AI-generated content
			replyMessage = `Hello ${replyData.sender.split(' ')[0]}, we have sent you a calendar invite to test drive the Ford F150 @ 2:30 pm - 3:15 pm. I enclosed the F150 brochure listing all of the features. Please confirm the appointment by clicking Yes. If this time is not acceptable or you need to cancel you can refer to this email.`;
		} else if (open && !useAI) {
			// Empty for manual reply
			replyMessage = '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="!w-[1200px] max-w-[75vw] !max-h-[90vh] !p-0 bg-white overflow-hidden [&>button]:hidden"
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
						<ArrowLeft class="w-4 h-4" />
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

			<!-- Scrollable Content Area -->
			<div class="flex-1 overflow-y-auto min-h-0">
				<!-- Original Email -->
				<div class="px-6 py-4">
					<div class="flex items-start gap-4 mb-4">
						<!-- Avatar -->
						<div class="w-[50px] h-12 rounded-full bg-[#59875F] flex items-center justify-center flex-shrink-0">
							<span class="font-sans font-semibold text-2xl leading-[28px] text-white">
								{replyData?.senderInitials || 'SL'}
							</span>
						</div>

						<!-- Sender Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between mb-1">
								<div class="flex flex-col gap-1">
									<span class="font-sans font-semibold text-lg leading-[21px] text-[#3D3D3D]">
										{replyData?.sender || 'Sarah Lee'}
									</span>
									<span class="font-sans font-normal text-[15px] leading-[18px] text-[#3F3F3F]">
										to me, {replyData?.recipient || 'Nate'}
									</span>
								</div>

								<div class="flex items-center gap-4 flex-shrink-0">
									<span class="font-sans font-normal text-lg leading-[21px] text-[#727272] whitespace-nowrap">
										{replyData?.date || 'December, 01 2024'} {replyData?.time || '9:33 PM'}
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

					<!-- Original Message -->
					<div class="mb-4">
						<p class="font-sans font-normal text-base leading-[19px] text-black mb-4">
							{replyData?.originalMessage || 'I am interested in purchasing a new car. Can I test drive the Ford F150 2026. I would like to visit your dealership this coming Friday between 2:00 pm and 3:30 pm.'}
						</p>
						<p class="font-sans font-normal text-lg leading-[21px] text-[#3F3F3F]">
							{replyData?.originalSignature || '-- Best Wishes, Rory'}
						</p>
					</div>

					<!-- Separator Line -->
					<div class="w-full h-px bg-[#868686] mb-4"></div>
				</div>

				<!-- Reply Card -->
				<div class="px-6 pb-4">
				<div class="bg-white rounded-lg shadow-[0px_0px_4.7px_2px_rgba(0,0,0,0.21)] p-6">
					<!-- Reply Header -->
					<div class="flex items-center gap-2 mb-4">
						<Reply class="w-5 h-[15px] text-[#474948]" />
						<span class="font-sans font-normal text-lg leading-[21px] text-black">
							{replyData?.sender || 'Sarah Lee'} ({replyData?.recipientEmail || 'sarahlee@email.com'})
						</span>
					</div>

					<!-- Reply Message Editor -->
					<div class="mb-4">
						{#if useAI}
							<!-- Pre-filled AI content -->
							<div class="mb-4">
								<p class="font-sans font-normal text-lg leading-[26px] text-[#3F3F3F] mb-4">
									{replyMessage}
								</p>
							</div>
						{:else}
							<!-- Empty textarea for manual reply -->
							<textarea
								bind:value={replyMessage}
								placeholder="Type your reply here..."
								class="w-full min-h-[130px] p-4 border border-gray-300 rounded-lg font-sans font-normal text-lg leading-[26px] text-[#3F3F3F] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
							></textarea>
						{/if}

						<!-- Appointment Details (shown on both) -->
						<div class="mb-4">
							<p class="font-sans font-semibold text-lg leading-[26px] text-[#3F3F3F] mb-2">
								<span class="font-semibold">Agent:</span> {agent}
							</p>
							<p class="font-sans font-semibold text-lg leading-[26px] text-[#3F3F3F] mb-2">
								<span class="font-semibold">Appointment:</span> {appointmentTime}
							</p>
							<p class="font-sans font-semibold text-lg leading-[26px] text-[#3F3F3F] mb-2">
								<span class="font-semibold">Location:</span> {location}
							</p>
							<p class="font-sans font-semibold text-lg leading-[26px] text-[#3F3F3F] mb-2">
								<span class="font-semibold">Purpose:</span> {purpose}
							</p>
							<div class="flex items-center gap-2 mb-2">
								<span class="font-sans font-semibold text-lg leading-[26px] text-[#3F3F3F]">
									<span class="font-semibold">Confirm Appointment:</span>
								</span>
								<button
									class="w-[53px] h-[26px] bg-[#57B76C] rounded flex items-center justify-center font-sans font-semibold text-lg leading-[26px] text-white hover:bg-[#57B76C]/90 transition-colors"
								>
									Yes
								</button>
								<button
									class="w-[53px] h-[26px] bg-[#DA3E3E] rounded flex items-center justify-center font-sans font-semibold text-lg leading-[26px] text-white hover:bg-[#DA3E3E]/90 transition-colors"
								>
									No
								</button>
							</div>
						</div>
					</div>

					<!-- Bottom Toolbar -->
					<div class="w-full h-[63px] bg-[#EBEBEB] rounded-2xl flex items-center justify-between px-4">
						<div class="flex items-center gap-4">
							<button
								class="h-[40px] px-6 bg-[#0C58D1] rounded-full flex items-center gap-2 font-sans font-semibold text-lg leading-[21px] text-white hover:bg-[#0C58D1]/90 transition-colors"
								onclick={() => {
									if (onSend) {
										onSend();
									}
									if (onCloseAll) {
										onCloseAll();
									}
									open = false;
								}}
							>
								<Send class="w-5 h-5" />
								<span>Send</span>
							</button>
							<div class="w-px h-10 bg-white"></div>
							<button
								class="w-5 h-5 text-[#3F3F3F] hover:text-[#3D3D3D] transition-colors"
								aria-label="Format text"
							>
								<Type class="w-5 h-5" />
							</button>
							<button
								class="w-5 h-5 text-[#3F3F3F] hover:text-[#3D3D3D] transition-colors"
								aria-label="Attach file"
							>
								<Paperclip class="w-5 h-5" />
							</button>
							<button
								class="w-5 h-5 text-[#3F3F3F] hover:text-[#3D3D3D] transition-colors"
								aria-label="Insert link"
							>
								<Link class="w-5 h-5" />
							</button>
							<button
								class="w-5 h-5 text-[#3F3F3F] hover:text-[#3D3D3D] transition-colors"
								aria-label="Insert image"
							>
								<Image class="w-5 h-5" />
							</button>
							<button
								class="w-5 h-5 text-[#3F3F3F] hover:text-[#3D3D3D] transition-colors"
								aria-label="More options"
							>
								<MoreVertical class="w-5 h-5" />
							</button>
						</div>
						<button
							class="w-5 h-5 text-[#818181] hover:text-[#616161] transition-colors"
							aria-label="Delete draft"
						>
							<Trash2 class="w-5 h-5" />
						</button>
					</div>
				</div>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
