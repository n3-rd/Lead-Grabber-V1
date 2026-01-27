<script lang="ts">
	import HeaderClose from '$lib/components/header-close.svelte';
	import HeaderReminder from '$lib/components/header-reminder.svelte';
	import HeaderShuffle from '$lib/components/header-shuffle.svelte';
	import HeaderTag from '$lib/components/header-tag.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
	import {
		Bell,
		CheckCircle2,
		Images,
		MessageSquareText,
		Plus,
		Shuffle,
		Smile,
		Tag,
		UserPlus
	} from 'lucide-svelte';
	import { onMount } from 'svelte';

	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import type { Message } from '$lib/types/message';

	let { data } = $props();
	let { user } = data;
	if (user == null) {
		goto('/login');
	}
	if (
		(user !== null && user?.company === null) ||
		(user?.company && typeof user.company === 'object' && !user.company.id)
	) {
		goto('/create-company');
	}

	// Add message data store
	let messages = $state<Message[]>([]);
	let selectedMessage = $state<{
		thread_id: string;
		[key: string]: any;
	} | null>(null);
	let showMessages = $state(true);
	let chatMessages = $state<
		{
			sender: string;
			message: string;
			phone?: string;
			email?: string;
			time: string;
			isYou: boolean;
			timestamp: string;
		}[]
	>([]);

	// Add these state variables near the top with other state declarations
	let isLoadingMessages = $state(true);
	let isLoadingChat = $state(false);

	// Add this state variable with the other state declarations
	let companyMembers = $state<{ id: string; name: string }[]>([]);

	// Add a new state variable for initial load
	let initialLoad = $state(true);

	let selectedTab = $state('all');
	let filteredMessages = $state<typeof messages>([]);

	// Replace the existing filteredMessages with memoized version
	$effect(() => {
		const filterFn = (msg: any) => {
			switch (selectedTab) {
				case 'unassigned':
					return !msg.assigned_to;
				case 'me':
					return msg.assigned_to === user?.id;
				default:
					return true;
			}
		};

		filteredMessages = messages.filter(filterFn);
	});

	// Add pagination state
	let page = $state(1);
	const PER_PAGE = 20;

	onMount(async () => {
		try {
			await loadMessages();
			await loadCompanyMembers();
		} catch (err) {
			console.error('Error in onMount:', err);
		}
	});

	// Add loadMessages function
	async function loadMessages() {
		if (initialLoad) {
			isLoadingMessages = true;
		}

		try {
			if (!user?.company) {
				console.log('No company ID available');
				messages = [];
				isLoadingMessages = false;
				initialLoad = false;
				return;
			}

			const response = await fetch(`/api/messages?page=${page}&perPage=${PER_PAGE}`);
			if (!response.ok) throw new Error('Failed to fetch messages');
			const data = await response.json();

			// For initial load, replace all messages. For pagination, append new ones (avoiding duplicates)
			if (initialLoad) {
				messages = data.items.map(formatMessage);
			} else {
				// Only append messages that don't already exist
				const existingIds = new Set(messages.map((m) => m.id));
				const newMessages = data.items
					.filter((item: any) => !existingIds.has(item.id))
					.map(formatMessage);
				messages = [...messages, ...newMessages];
			}

			// Update chat messages only if needed
			if (selectedMessage && initialLoad) {
				isLoadingChat = true;
				await loadChatMessages(selectedMessage.thread_id);
			}
		} catch (err) {
			console.error('Error loading messages:', err);
		} finally {
			isLoadingMessages = false;
			initialLoad = false;
		}
	}

	// Separate chat messages loading
	async function loadChatMessages(threadId: string) {
		try {
			const response = await fetch(`/api/messages?threadId=${encodeURIComponent(threadId)}`);
			if (!response.ok) throw new Error('Failed to fetch thread');
			const thread = await response.json();

			if (!thread.messages || thread.messages.length === 0) {
				console.error('No messages found in thread');
				chatMessages = [];
				return;
			}

			// Parse messages if it's a string
			const messagesArray =
				typeof thread.messages === 'string'
					? JSON.parse(thread.messages)
					: Array.isArray(thread.messages)
						? thread.messages
						: [];

			chatMessages = messagesArray
				.map((msg: any) => ({
					sender: msg.is_agent_reply
						? msg.agent_name || 'Agent'
						: thread.customerName || 'Customer',
					message: msg.content,
					phone: thread.customerPhone,
					email: thread.customerEmail,
					time: new Date(msg.timestamp).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit'
					}),
					isYou: msg.is_agent_reply,
					timestamp: msg.timestamp
				}))
				.sort(sortByTimestamp);
		} catch (err) {
			console.error('Error loading chat messages:', err);
			chatMessages = [];
		} finally {
			isLoadingChat = false;
		}
	}

	// Helper function to format message consistently
	function formatMessage(msg: any): Message & { name: string; message: string; time: string } {
		// Parse messages if it's a string
		const messagesArray =
			typeof msg.messages === 'string'
				? JSON.parse(msg.messages)
				: Array.isArray(msg.messages)
					? msg.messages
					: [];

		const lastMessage = messagesArray[messagesArray.length - 1];
		const customerName = msg.customerName || 'Unknown';
		const initials =
			customerName
				?.split(' ')
				.map((n: string) => n[0])
				.join('') || '??';
		const name = customerName;
		const messageText = lastMessage?.content || '';
		const time = new Date(lastMessage?.timestamp || msg.created).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
		const color = 'bg-primary';

		return {
			id: msg.id,
			thread_id: msg.threadId,
			customer_name: customerName,
			customer_phone: msg.customerPhone || null,
			customer_email: msg.customerEmail || null,
			company_id: msg.companyId || '',
			messages: messagesArray,
			status: msg.status || 'new',
			created: msg.created,
			updated: msg.updated || msg.created,
			assigned_to: msg.assignedToId,
			initials,
			color,
			urgency: msg.urgency,
			// Additional properties for UI display
			name,
			message: messageText,
			time
		};
	}

	// Update the sort function to use proper types
	function sortByTimestamp(a: { timestamp: string }, b: { timestamp: string }): number {
		return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
	}

	// Function to select a message and load its chat history
	async function selectMessage(msg: { thread_id: string; [key: string]: any }) {
		selectedMessage = msg;
		showMessages = true;
		isLoadingChat = true;

		try {
			await loadChatMessages(msg.thread_id);
		} catch (err) {
			console.error('Error loading chat history:', err);
			chatMessages = [];
		} finally {
			isLoadingChat = false;
		}
	}

	// Function to send a new message
	async function sendMessage(e: Event) {
		e.preventDefault(); // Prevent form submission
		const form = e.target as HTMLFormElement;
		const input = form.querySelector('input') as HTMLInputElement;
		const message = input.value.trim();

		if (!message || !selectedMessage) return;

		// Clear input immediately for better UX
		input.value = '';

		try {
			const threadResponse = await fetch(
				`/api/messages?threadId=${encodeURIComponent(selectedMessage.thread_id)}`
			);
			if (!threadResponse.ok) throw new Error('Failed to fetch thread');
			const existingThread = await threadResponse.json();

			// Parse existing messages
			const existingMessages =
				typeof existingThread.messages === 'string'
					? JSON.parse(existingThread.messages)
					: Array.isArray(existingThread.messages)
						? existingThread.messages
						: [];

			// First attempt to send via Telnyx if there's a phone number
			if (existingThread.customerPhone) {
				try {
					console.log('Sending SMS to:', existingThread.customerPhone);
					const telnyxResponse = await fetch('/api/telnyx', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							message,
							phoneNumber: existingThread.customerPhone,
							threadId: existingThread.threadId
						})
					});

					const telnyxResult = await telnyxResponse.json();
					if (!telnyxResult.success) {
						console.error('Failed to send SMS:', telnyxResult.error);
						toast.error('Failed to send SMS: ' + telnyxResult.error);
						return;
					}

					console.log('SMS sent successfully');
				} catch (telnyxError) {
					console.error('Error sending SMS:', telnyxError);
					toast.error('Failed to send SMS: Network error');
					return;
				}
			}

			// Update the database
			const updatedMessages = [
				...existingMessages,
				{
					content: message,
					timestamp: new Date().toISOString(),
					is_agent_reply: true,
					agent_id: user.id,
					agent_name: user.name
				}
			];

			const updateResponse = await fetch('/api/messages', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: existingThread.id,
					messages: updatedMessages,
					status: 'replied'
				})
			});

			if (!updateResponse.ok) throw new Error('Failed to update message');
			const updatedThread = await updateResponse.json();

			// Update the messages list with the new thread
			messages = messages.map((msg) =>
				msg.thread_id === updatedThread.threadId ? formatMessage(updatedThread) : msg
			);

			// Update chat messages
			await loadChatMessages(selectedMessage.thread_id);

			toast.success('Message sent successfully');
		} catch (err) {
			console.error('Error sending message:', err);
			toast.error('Failed to send message');
		}
	}

	// Add this function to load company members
	async function loadCompanyMembers() {
		try {
			if (!user?.company) {
				console.log('No company ID available');
				return;
			}

			const response = await fetch('/api/company-members');
			if (!response.ok) throw new Error('Failed to fetch company members');
			const data = await response.json();

			companyMembers = data.items.map((member: any) => ({
				id: member.user,
				name: member.expand?.user?.name || member.expand?.user?.email || 'Unknown'
			}));
		} catch (err) {
			console.error('Error loading company members:', err);
		}
	}

	// Add function to assign message
	async function assignMessage(messageId: string, userId: string) {
		try {
			const response = await fetch('/api/messages', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: messageId,
					assigned_to: userId,
					status: 'assigned'
				})
			});

			if (response.ok) {
				const updated = await response.json();
				// Update the specific message in place
				messages = messages.map((msg) => (msg.id === messageId ? formatMessage(updated) : msg));
				toast.success('Message assigned successfully');
			} else {
				throw new Error('Failed to assign message');
			}
		} catch (err) {
			console.error('Error assigning message:', err);
			toast.error('Failed to assign message');
		}
	}

	// Add function for quick self-assignment
	async function assignToMe(messageId: string) {
		if (!messageId) return;

		try {
			await fetch('/api/messages', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: messageId,
					assigned_to: user.id
				})
			});

			// Update the local messages array by modifying the specific message
			messages = messages.map((msg) =>
				msg.id === messageId ? { ...msg, assigned_to: user.id } : msg
			);

			toast.success('Message assigned to you');
		} catch (err) {
			console.error('Error assigning message:', err);
			toast.error('Failed to assign message');
		}
	}

	// Add function for assigning message to a member
	async function assignToMember(messageId: string, memberId: string) {
		if (!messageId || !memberId) return;

		try {
			const response = await fetch('/api/messages', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: messageId,
					assigned_to: memberId
				})
			});

			if (response.ok) {
				const updated = await response.json();
				// Update the specific message in place
				messages = messages.map((msg) => (msg.id === messageId ? formatMessage(updated) : msg));
				toast.success('Message assigned successfully');
			} else {
				throw new Error('Failed to assign message');
			}
		} catch (err) {
			console.error('Error assigning message:', err);
			toast.error('Failed to assign message');
		}
	}

	// Handle transfer (same as assign but for communication logs)
	async function handleTransferMessage(selectedAgentNames: string[]) {
		if (!selectedMessage || !companyMembers) return;

		// Map agent names back to member IDs
		const selectedMemberIds = companyMembers
			.filter((m) => selectedAgentNames.includes(m.name))
			.map((m) => m.id);

		if (selectedMemberIds.length === 0) {
			toast.error('No members selected');
			return;
		}

		try {
			// Update the message
			await fetch('/api/messages', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: selectedMessage.id,
					assigned_to: selectedMemberIds[0],
					status: 'assigned'
				})
			});

			// Note: Communication log updates would need a separate API endpoint
			// For now, we'll skip that part as it's not critical for basic functionality

			// Reload messages to reflect changes
			await loadMessages();
			toast.success('Message transferred successfully');
		} catch (error) {
			console.error('Error transferring message:', error);
			toast.error('Failed to transfer message');
		}
	}

	// Add infinite scroll
	let messagesContainer: HTMLElement;
	function handleScroll(e: Event) {
		const target = e.target as HTMLElement;
		if (target.scrollHeight - target.scrollTop === target.clientHeight && !isLoadingMessages) {
			page++;
			loadMessages();
		}
	}
</script>

<div class="flex h-[90vh] flex-col gap-3 bg-gray-100 p-4">
	<div class="h1 text-2xl font-semibold">Inbox</div>

	<div class="flex h-[61px] w-full items-center justify-between rounded-lg bg-white px-8">
		<div class="flex items-center gap-14">
			<button
				class="text-xl font-normal leading-8 {selectedTab === 'all'
					? 'font-medium text-primary'
					: 'text-gray-600 hover:text-gray-900'}"
				onclick={() => (selectedTab = 'all')}
			>
				All
			</button>
			<button
				class="text-xl font-normal leading-8 {selectedTab === 'unassigned'
					? 'font-medium text-primary'
					: 'text-gray-600 hover:text-gray-900'}"
				onclick={() => (selectedTab = 'unassigned')}
			>
				Unassigned
			</button>
			<button
				class="text-xl font-normal leading-8 {selectedTab === 'me'
					? 'font-medium text-primary'
					: 'text-gray-600 hover:text-gray-900'}"
				onclick={() => (selectedTab = 'me')}
			>
				Me
			</button>
		</div>

		<div class="actions flex items-center gap-2">
			<HeaderTag />
			<HeaderShuffle {selectedMessage} {companyMembers} onTransfer={handleTransferMessage} />
			<HeaderReminder />
			<HeaderClose />
		</div>
	</div>

	<div class="flex min-h-0 flex-1 gap-5">
		<div class="flex w-1/2 flex-col rounded-xl bg-white">
			<div class="flex-1 overflow-y-auto">
				<div class="flex flex-col divide-y px-5">
					{#if initialLoad && isLoadingMessages}
						{#each Array(5) as _}
							<div class="flex items-center gap-4 py-4">
								<div class="flex-shrink-0">
									<div class="h-14 w-14 animate-pulse rounded-full bg-gray-200"></div>
								</div>
								<div class="flex-grow">
									<div class="flex items-center justify-between">
										<div class="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
										<div class="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
									</div>
									<div class="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
								</div>
							</div>
						{/each}
					{:else}
						{#each filteredMessages as msg}
							<div
								class="flex cursor-pointer items-center gap-4 py-4 hover:bg-gray-50"
								onclick={() => selectMessage(msg)}
							>
								<div class="flex-shrink-0">
									<div
										class="h-14 w-14 rounded-full {msg.color} flex items-center justify-center text-xl text-white"
									>
										{msg.initials}
									</div>
								</div>
								<div class="flex-grow">
									<div class="flex items-center gap-2">
										<h4 class="text-lg font-medium">{(msg as any).name}</h4>
										{#if msg.urgency === 'red'}
											<span
												class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
												>Urgent</span
											>
										{:else if msg.urgency === 'yellow'}
											<span
												class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
												>Medium</span
											>
										{:else if msg.urgency === 'green'}
											<span
												class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
												>Low</span
											>
										{:else if msg.urgency}
											<!-- Fallback for other values just in case -->
											<span
												class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
												>{msg.urgency}</span
											>
										{/if}
									</div>
									<span class="font-medium">{(msg as any).time}</span>
								</div>
								<p class="line-clamp-2 font-light">{(msg as any).message}</p>
								{#if msg.assigned_to}
									<div class="mt-1 text-sm text-gray-500">
										Assigned to:
										<button
											class="text-blue-600 hover:text-blue-800 hover:underline"
											onclick={(e) => {
												e.stopPropagation();
												goto(`/users/${msg.assigned_to}`);
											}}
										>
											{companyMembers.find((m) => m.id === msg.assigned_to)?.name || 'Unknown'}
										</button>
									</div>
								{/if}
							</div>
						{/each}

						{#if filteredMessages.length === 0}
							<div class="py-8 text-center text-gray-500">
								{#if selectedTab === 'unassigned'}
									No unassigned messages
								{:else if selectedTab === 'me'}
									No messages assigned to you
								{:else}
									No messages found
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>

		<div class="flex w-1/2 flex-col rounded-xl bg-white">
			<div class="flex-1 overflow-y-auto" bind:this={messagesContainer} onscroll={handleScroll}>
				{#if selectedMessage && showMessages}
					{#if isLoadingChat}
						<div class="flex flex-col gap-4 p-4">
							{#each Array(3) as _}
								<div class="rounded-lg border border-dashed border-gray-200 p-4">
									<div class="mb-4 h-4 w-32 animate-pulse rounded bg-gray-200"></div>
									<div class="space-y-3">
										<div class="h-3 w-3/4 animate-pulse rounded bg-gray-200"></div>
										<div class="h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
										<div class="h-3 w-2/3 animate-pulse rounded bg-gray-200"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex-1 space-y-4 overflow-y-auto p-4">
							{#if isLoadingChat}
								<div class="flex justify-center">
									<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
								</div>
							{:else}
								{#each chatMessages as message, i}
									{#if i === 0}
										<!-- Initial message with all details -->
										<div class="mb-6 rounded-lg bg-gray-50 p-4">
											<h3 class="mb-2 text-sm font-medium">Initial Message</h3>
											<div class="space-y-2 text-sm">
												<div><span class="text-gray-500">From:</span> {message.sender}</div>
												{#if message.phone}<div>
														<span class="text-gray-500">Phone:</span>
														{message.phone}
													</div>{/if}
												{#if message.email}<div>
														<span class="text-gray-500">Email:</span>
														{message.email}
													</div>{/if}
												<div class="mt-3 rounded bg-white p-3">
													<span class="text-gray-500">Message:</span>
													<div class="mt-1">{message.message}</div>
												</div>
												<div class="mt-2 text-xs text-gray-500">{message.time}</div>
											</div>
										</div>
									{:else}
										<!-- Regular chat message -->
										<div class="flex {message.isYou ? 'justify-end' : 'justify-start'}">
											<div
												class="max-w-[70%] {message.isYou
													? 'bg-primary text-white'
													: 'bg-gray-100'} rounded-lg p-3"
											>
												<div
													class="text-xs {message.isYou ? 'text-blue-100' : 'text-gray-500'} mb-1"
												>
													{message.sender}
												</div>
												<div class="text-sm">{message.message}</div>
												<div
													class="text-xs {message.isYou ? 'text-blue-100' : 'text-gray-500'} mt-1"
												>
													{message.time}
												</div>
											</div>
										</div>
									{/if}
								{/each}
							{/if}
						</div>
					{/if}
				{:else}
					<div class="flex h-full flex-1 items-center justify-center">
						<div class="text-center">
							<div class="mb-2">
								<MessageSquareText class="mx-auto h-16 w-16 opacity-50" />
							</div>
							<p>No conversation selected.</p>
						</div>
					</div>
				{/if}
			</div>

			<form
				class="border-t p-4"
				onsubmit={(e) => {
					e.preventDefault();
					sendMessage(e);
				}}
			>
				<div class="mb-4 flex gap-4">
					<button class="border-b-2 border-primary pb-2 text-primary">Message</button>
					<button class="pb-2">Note</button>
				</div>
				<div class="w-full">
					<input
						type="text"
						placeholder="Type a message..."
						class="w-full flex-1 bg-transparent py-3 focus:outline-none"
						disabled={!selectedMessage}
					/>
				</div>
				<div class="flex gap-2">
					<div class="flex w-full items-center justify-between gap-2 rounded-lg">
						<div class="flex items-center gap-6">
							<Smile class="h-5 w-5" />
							<Images class="h-5 w-5" />
						</div>
						<Button
							type="submit"
							class="bg-primary px-6 text-sm font-semibold text-white hover:bg-blue-700"
							disabled={!selectedMessage}
						>
							SEND
						</Button>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
