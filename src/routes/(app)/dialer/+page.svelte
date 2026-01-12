<script lang="ts">
	import { Phone, Clock, Voicemail, ChevronDown, X, MicOff, Volume2, Delete } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';

	let phoneNumber = $state('');
	let isDialing = $state(false);
	let isCallActive = $state(false);
	let callId = $state('');
	let callStatus = $state('');

	// Optional client ID for tracking purposes
	let clientId = 'test-client';

	// Read phone number from URL params
	$effect(() => {
		const phoneParam = $page.url.searchParams.get('phone');
		if (phoneParam) {
			dialInput = phoneParam;
			phoneNumber = phoneParam;
		}
	});

	async function initiateCall() {
		if (!phoneNumber || phoneNumber.length < 10) {
			toast.error('Please enter a valid phone number');
			return;
		}

		isDialing = true;
		callStatus = 'Dialing...';

		try {
			const response = await fetch('/api/telnyx/dial', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: phoneNumber,
					from: '+17059800835', // Your Telnyx number
					clientId: clientId
				})
			});

			const result = await response.json();

			if (result.success) {
				toast.success('Call initiated');
				callId = result.callId;
				isCallActive = true;
				callStatus = 'Connected';
			} else {
				toast.error('Failed to place call: ' + result.error);
				callStatus = 'Failed';
			}
		} catch (error) {
			console.error('Call error:', error);
			toast.error('Error placing call');
			callStatus = 'Error';
		} finally {
			isDialing = false;
		}
	}

	function hangup() {
		if (!callId) return;

		callStatus = 'Hanging up...';

		fetch('/api/telnyx/hangup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ callId })
		})
			.then((response) => response.json())
			.then((result) => {
				if (result.success) {
					toast.success('Call ended');
				} else {
					toast.error('Failed to hang up: ' + result.error);
				}
			})
			.catch((error) => {
				console.error('Hangup error:', error);
				toast.error('Error hanging up call');
			})
			.finally(() => {
				isCallActive = false;
				callId = '';
				callStatus = '';
			});
	}

	function appendDigit(digit: string) {
		phoneNumber += digit;
	}

	function deleteDigit() {
		phoneNumber = phoneNumber.slice(0, -1);
	}

	let contacts = [
		{ name: 'Sarah Lee', phone: '705-4123-6346' },
		{ name: 'Peter Griffin', phone: '705-6433-2564' },
		{ name: 'Michael Scofield', phone: '705-9755-1953' },
		{ name: 'Joe Swanson', phone: '705-9012-0124' },
		{ name: 'Adam West', phone: '705-7812-3321' },
		{ name: 'Cleveland Brown', phone: '705-0091-7542' },
		{ name: 'Sarah Lee', phone: '705-4123-6346' },
		{ name: 'Peter Griffin', phone: '705-6433-2564' },
		{ name: 'Michael Scofield', phone: '705-9755-1953' },
		{ name: 'Joe Swanson', phone: '705-9012-0124' }
	];

	let dialInput = $state('');
	let callerId = '(406) 555-1234';
	function appendDialInput(d: string) {
		dialInput += d;
	}
	function deleteDialInput() {
		dialInput = dialInput.slice(0, -1);
	}
	function call() {
		phoneNumber = dialInput;
		initiateCall();
	}
</script>

<div class="min-h-screen bg-[#F5F7FF] p-0">
	<div class="mx-auto max-w-6xl py-8">
		<h1 class="mb-6 text-2xl font-semibold text-gray-700">Dialer</h1>
		<div class="flex gap-6">
			<!-- Contacts List -->
			<div class="max-w-md flex-1">
				<div class="rounded-xl bg-white p-0 shadow">
					<div class="flex border-b px-6 py-4 text-lg font-semibold text-gray-600">
						<div class="flex-1">Name</div>
						<div class="flex-1">Phone</div>
					</div>
					<div>
						{#each contacts as c}
							<div
								class="flex items-center border-b px-6 py-3 text-base text-gray-700 transition last:border-b-0 hover:bg-gray-50"
							>
								<div class="flex-1">{c.name}</div>
								<div class="flex-1">{c.phone}</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Dialer Section -->
			<div class="flex flex-1 flex-col gap-6">
				<!-- Tabs -->
				<div class="flex items-center gap-8 rounded-xl bg-white px-6 py-3 shadow">
					<div class="flex items-center gap-2 font-semibold text-[#6B7FC9]">
						<Phone class="h-5 w-5" /> Phone
					</div>
					<div class="flex items-center gap-2 font-semibold text-gray-400">
						<Clock class="h-5 w-5" /> Calls
					</div>
					<div class="flex items-center gap-2 font-semibold text-gray-400">
						<Voicemail class="h-5 w-5" /> Voicemail
					</div>
				</div>
				<!-- Dialer Card -->
				<div class="flex flex-col items-center rounded-xl bg-white px-8 py-8 shadow">
					<div class="mb-2 flex items-center gap-2 font-medium text-gray-600">
						My Caller ID: <span class="font-semibold text-gray-800">{callerId}</span>
						<ChevronDown class="h-4 w-4" />
					</div>
					<input
						class="mb-4 w-full border-0 bg-transparent text-center text-base text-gray-500 outline-none"
						placeholder="Enter a name or number"
						bind:value={dialInput}
						type="number"
					/>
					<div class="mb-4 w-full border-t"></div>
					<!-- Keypad -->
					<div class="mb-6 grid grid-cols-3 gap-6">
						{#each [[1, 2, 3], [4, 5, 6], [7, 8, 9], ['*', 0]] as row}
							{#each row as digit}
								<button
									class="h-16 w-16 rounded-full text-2xl text-gray-600 transition hover:bg-gray-100"
									onclick={() => appendDialInput(digit.toString())}
									type="button">{digit}</button
								>
							{/each}
						{/each}
						<!-- Backspace button -->
						<button
							class="h-16 w-16 rounded-full text-2xl text-gray-600 transition hover:bg-gray-100"
							onclick={deleteDialInput}
							type="button"
						>
							<Delete class="h-6 w-6" />
						</button>
					</div>
					<button
						class="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-2xl text-white transition hover:bg-green-700"
						onclick={call}
						type="button"
					>
						<Phone class="h-7 w-7" />
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
