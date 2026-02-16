<script lang="ts">
	import { ArrowLeft, Download, Trash2, Reply, MoreVertical, Mail, User, Send, Type, Paperclip, Link, Image, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Indent, Outdent, Undo, Redo, Smile, Lock, PenTool, ChevronDown } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import EmptyState from "$lib/components/EmptyState.svelte";

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

	interface ConversationMessage {
		id: string;
		sender: string;
		senderIsYou: boolean;
		message: string;
		date: string;
		time: string;
	}

	// Mock notifications data - in real app, fetch from server using $page.params.id
	const notifications: Notification[] = [
		{
			id: "1",
			type: "email",
			name: "Maria Lopez",
			message: "[Urgent] Interview – HR Position Please confirm your attendance...",
			time: "11:45 AM",
			isBold: true,
			fullMessage: "[Urgent] Interview – HR Position Please confirm your attendance for the interview scheduled on November 15, 2025 at 2:00 PM.",
			date: "Fri, Oct 17, 2025"
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

	let conversationMessages = $state<ConversationMessage[]>([]);
	let replyMessage = $state("");
	let editorRef: HTMLDivElement | null = $state(null);
	let threadContainerRef: HTMLDivElement | null = $state(null);

	const notificationId = $derived($page.params.id);
	const selectedNotification = $derived(notifications.find(n => n.id === notificationId) || null);

	$effect(() => {
		if (selectedNotification) {
			initializeConversation(selectedNotification);
		}
	});

	function initializeConversation(notification: Notification) {
		conversationMessages = [
			{
				id: "1",
				sender: notification.name,
				senderIsYou: false,
				message: notification.fullMessage || notification.message,
				date: notification.date || "Fri, Oct 17, 2025",
				time: notification.time || "11:29 PM"
			}
		];
	}

	function formatRichText(command: string, value?: string) {
		document.execCommand(command, false, value);
		if (editorRef) {
			editorRef.focus();
		}
	}

	function handleSend() {
		if (editorRef && selectedNotification) {
			const textContent = editorRef.innerText || editorRef.textContent || '';
			if (textContent.trim()) {
				const newMessage: ConversationMessage = {
					id: Date.now().toString(),
					sender: "You",
					senderIsYou: true,
					message: editorRef.innerHTML,
					date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
					time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
				};
				conversationMessages = [...conversationMessages, newMessage];
				replyMessage = "";
				editorRef.innerHTML = "";
				
				// Scroll to bottom after sending
				setTimeout(() => {
					if (threadContainerRef) {
						threadContainerRef.scrollTop = threadContainerRef.scrollHeight;
					}
				}, 0);
			}
		}
	}

	function getInitials(name: string): string {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}

	function handleBack() {
		goto('/notifications');
	}
</script>

<div class="w-full p-4 min-w-0">
	{#if selectedNotification}
		<!-- Conversation View -->
		<div class="w-[1117px] bg-white rounded-sm flex flex-col h-[calc(100vh-200px)]">
			<!-- Header -->
			<div class="w-[1117px] h-[61px] bg-white rounded-sm flex items-center px-4 gap-4 border-b border-[#E0E0E0] flex-shrink-0">
				<button
					onclick={handleBack}
					class="w-[36px] h-[18px] text-[#7D7D7D] hover:text-[#555555] transition-colors"
					aria-label="Back"
				>
					<ArrowLeft class="w-[36px] h-[18px]" />
				</button>
				<h1 class="font-sans font-semibold text-2xl leading-[1.29] text-[#747474]">
					{selectedNotification.name}
				</h1>
			</div>

			<!-- Content -->
			<div class="w-[1117px] bg-white rounded-sm flex flex-col flex-1 min-h-0">
				<!-- Metadata Bar -->
				<div class="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] flex-shrink-0">
					<div class="flex items-center gap-3">
						<Mail class="w-5 h-5 text-[#848484]" />
						<span class="font-sans font-medium text-sm leading-[26px] text-[#717171]">
							Fri, November 5, 2025 – 9:00 AM
						</span>
					</div>
					<div class="flex items-center gap-4">
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

				<!-- Conversation Thread -->
				<div bind:this={threadContainerRef} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
					{#each conversationMessages as msg}
						<div class="flex items-start gap-3 mb-6">
							<!-- Avatar -->
							<div class="w-[34px] h-[34px] rounded-full {msg.senderIsYou ? 'bg-[#7D7D7D]' : 'bg-[#E0E0E0]'} flex items-center justify-center flex-shrink-0">
								{#if msg.senderIsYou}
									<User class="w-5 h-5 text-white" />
								{:else}
									<span class="font-sans font-semibold text-xs text-[#848484]">
										{getInitials(msg.sender)}
									</span>
								{/if}
							</div>

							<!-- Message Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-3 mb-2">
									<span class="font-sans font-medium text-sm leading-[1.29] tracking-normal text-[#696969]">
										{msg.sender}
									</span>
									<span class="font-sans font-normal text-sm leading-[26px] text-[#717171]">
										{msg.date} – {msg.time}
									</span>
								</div>
								<div class="w-full min-h-[60px] bg-[#F9F9F9] rounded-sm p-4">
									<div class="font-sans font-normal text-sm leading-[26px] text-[#717171] whitespace-pre-wrap">
										{@html msg.message}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Reply Composer -->
				<div class="border-t border-[#E0E0E0] px-6 py-4 flex-shrink-0">
					<div class="flex gap-4">
						<!-- Profile Icon -->
						<div class="w-[34px] h-[34px] rounded-full bg-[#7D7D7D] flex items-center justify-center flex-shrink-0">
							<User class="w-5 h-5 text-white" />
						</div>

						<!-- Composer Box -->
						<div class="flex-1 bg-white border border-[#E0E0E0] rounded-sm relative">
							<!-- Recipient Header -->
							<div class="flex items-center gap-2 px-4 py-2 border-b border-[#E0E0E0]">
								<ArrowLeft class="w-4 h-4 text-[#848484]" />
								<Reply class="w-4 h-4 text-[#848484]" />
								<span class="font-sans font-medium text-sm text-[#848484]">
									{selectedNotification.name}
								</span>
							</div>

							<!-- Rich Text Editor -->
							<div class="relative">
								<div
									bind:this={editorRef}
									contenteditable="true"
									class="min-h-[120px] p-4 outline-none font-sans font-normal text-sm leading-[26px] text-[#717171]"
									oninput={(e) => {
										const html = e.currentTarget.innerHTML;
										if (html === '<div><br></div>' || html === '<br>' || html === '<div></div>') {
											replyMessage = '';
											if (editorRef) {
												editorRef.innerHTML = '';
											}
										} else {
											replyMessage = html;
										}
									}}
								></div>
								{#if !replyMessage || replyMessage === '<div><br></div>' || replyMessage === '<br>' || replyMessage === '<div></div>'}
									<div class="absolute top-4 left-4 pointer-events-none text-gray-400 font-sans font-normal text-sm leading-[26px]">
										Type your message here...
									</div>
								{/if}
							</div>

							<!-- Rich Text Formatting Toolbar -->
							<div class="flex items-center gap-2 px-4 py-2 border-t border-[#E0E0E0] bg-[#F9F9F9] flex-wrap">
								<button onclick={() => formatRichText('undo')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Undo">
									<Undo class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('redo')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Redo">
									<Redo class="w-4 h-4 text-[#717171]" />
								</button>
								<div class="w-px h-4 bg-[#E0E0E0]"></div>
								<button class="px-2 py-1 text-xs text-[#717171] hover:bg-gray-200 rounded flex items-center gap-1">
									Sans Serif <ChevronDown class="w-3 h-3" />
								</button>
								<div class="w-px h-4 bg-[#E0E0E0]"></div>
								<button class="px-2 py-1 text-xs text-[#717171] hover:bg-gray-200 rounded flex items-center gap-1">
									TT <ChevronDown class="w-3 h-3" />
								</button>
								<button onclick={() => formatRichText('bold')} class="p-1.5 hover:bg-gray-200 rounded font-bold" aria-label="Bold">
									<Bold class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('italic')} class="p-1.5 hover:bg-gray-200 rounded italic" aria-label="Italic">
									<Italic class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('underline')} class="p-1.5 hover:bg-gray-200 rounded underline" aria-label="Underline">
									<Underline class="w-4 h-4 text-[#717171]" />
								</button>
								<button class="p-1.5 hover:bg-gray-200 rounded flex items-center gap-1" aria-label="Text Color">
									<span class="text-xs text-[#717171]">A</span>
									<ChevronDown class="w-3 h-3" />
								</button>
								<button onclick={() => formatRichText('justifyLeft')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Align Left">
									<AlignLeft class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('justifyCenter')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Align Center">
									<AlignCenter class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('justifyRight')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Align Right">
									<AlignRight class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('justifyFull')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Justify">
									<AlignJustify class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('insertOrderedList')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Numbered List">
									<ListOrdered class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('insertUnorderedList')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Bullet List">
									<List class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('outdent')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Decrease Indent">
									<Outdent class="w-4 h-4 text-[#717171]" />
								</button>
								<button onclick={() => formatRichText('indent')} class="p-1.5 hover:bg-gray-200 rounded" aria-label="Increase Indent">
									<Indent class="w-4 h-4 text-[#717171]" />
								</button>
							</div>

							<!-- Action Toolbar -->
							<div class="flex items-center justify-between px-4 py-2 border-t border-[#E0E0E0] bg-white">
								<div class="flex items-center gap-2">
									<button
										onclick={handleSend}
										class="h-9 px-4 bg-[#0C58D1] rounded-lg flex items-center gap-2 font-sans font-medium text-sm text-white hover:bg-[#0C58D1]/90 transition-colors"
									>
										<Send class="w-4 h-4" />
										Send
									</button>
									<button class="w-8 h-8 bg-[#0C58D1] rounded flex items-center justify-center">
										<ChevronDown class="w-4 h-4 text-white" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="AI">
										<span class="text-lg">*</span>
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Text Case">
										<Type class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Attach">
										<Paperclip class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Link">
										<Link class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Emoji">
										<Smile class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Drive">
										<Image class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Image">
										<Image class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Lock">
										<Lock class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="Pen">
										<PenTool class="w-4 h-4 text-[#717171]" />
									</button>
									<button class="p-1.5 hover:bg-gray-100 rounded" aria-label="More">
										<MoreVertical class="w-4 h-4 text-[#717171]" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<EmptyState
			title="Notification not found"
			variant="compact"
			class="min-h-0"
			primaryAction={{ label: 'Go back', onclick: handleBack }}
		/>
	{/if}
</div>
