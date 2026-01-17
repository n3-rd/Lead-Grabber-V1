<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, ChevronDown, Clock, Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { page } from '$app/stores';

	// Get title from query parameter if it exists
	const titleParam = $page.url.searchParams.get('title');
	let callFlowRuleTitle = $state(titleParam || 'Business Hours IVR');
	let promptsFile = $state<File | null>(null);
	let failoverFile = $state<File | null>(null);
	let hangupFile = $state<File | null>(null);

	// Schedule for each day
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	let schedule = $state<Record<string, { start1: string; end1: string; start2: string; end2: string }>>({
		Mon: { start1: '09:00 am', end1: '05:00 pm', start2: '-- : --', end2: '-- : --' },
		Tue: { start1: '09:00 am', end1: '05:00 pm', start2: '-- : --', end2: '-- : --' },
		Wed: { start1: '09:00 am', end1: '05:00 pm', start2: '-- : --', end2: '-- : --' },
		Thu: { start1: '09:00 am', end1: '05:00 pm', start2: '-- : --', end2: '-- : --' },
		Fri: { start1: '09:00 am', end1: '05:00 pm', start2: '-- : --', end2: '-- : --' },
		Sat: { start1: '-- : --', end1: '-- : --', start2: '-- : --', end2: '-- : --' },
		Sun: { start1: '-- : --', end1: '-- : --', start2: '-- : --', end2: '-- : --' }
	});

	// Key prompts
	let keyPrompts = $state([
		{ key: '1', name: 'Sales', extension: '0001', editing: false },
		{ key: '2', name: 'Support', extension: '0002', editing: false },
		{ key: '3', name: 'Billing', extension: '0003', editing: false }
	]);

	let failoverCount = $state('1-3 Failover');
	let failoverTime = $state('1sec - 30sec');

	function handleBack() {
		goto('/ivr');
	}

	function handleFileUpload(event: Event, type: string) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			if (type === 'prompts') promptsFile = file;
			else if (type === 'failover') failoverFile = file;
			else if (type === 'hangup') hangupFile = file;
		}
	}

	function toggleEdit(index: number) {
		keyPrompts[index].editing = !keyPrompts[index].editing;
		keyPrompts = [...keyPrompts];
	}

	function addKeyPrompt() {
		keyPrompts = [...keyPrompts, { key: '', name: '', extension: '', editing: false }];
	}

	function handleSave() {
		// TODO: Save changes
		console.log('Save all changes');
	}
</script>

<div class="min-h-screen bg-[#ECEEF3] p-4">
	<!-- Header -->
	<div class="mb-4 rounded-[3px] bg-white px-4 py-3">
		<div class="flex items-center justify-between">
			<h1 class="font-['Poppins'] text-[23px] font-semibold leading-[30px] text-[#747474]">
				Business Hours Call Flow
			</h1>
			<button
				onclick={handleBack}
				class="flex items-center gap-2 font-['Poppins'] text-base font-medium leading-[19px] text-[#757575] hover:text-[#577AB7] transition-colors"
			>
				<ArrowLeft class="h-4 w-4" />
				Back
			</button>
		</div>
	</div>

	<!-- Main Content Card -->
	<div class="max-h-[calc(100vh-120px)] overflow-y-auto rounded-lg bg-white p-6">
		<div class="space-y-8">
			<!-- Call Flow Rule Title -->
			<div class="space-y-2">
				<p class="font-['Poppins'] text-xl font-normal leading-[24px] text-[#808080]">
					Building the rules for business hours IVR
				</p>
				<label class="block font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">
					Call Flow Rule Title:
				</label>
				<input
					type="text"
					bind:value={callFlowRuleTitle}
					placeholder="Enter Call Rule Title"
					class="h-[46px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-lg font-medium leading-[24px] text-[rgba(128,128,128,0.54)] outline-none placeholder:text-[rgba(128,128,128,0.54)]"
				/>
			</div>

			<!-- Set Schedule Rule -->
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">
					Set Schedule Rule:
				</h2>
				<div class="grid grid-cols-7 gap-4">
					{#each days as day}
						<div class="space-y-2">
							<div class="font-['Poppins'] text-[22px] font-semibold leading-[26px] text-[#808080]">
								{day}
							</div>
							<div class="space-y-2">
								<div class="relative">
									<input
										type="text"
										bind:value={schedule[day].start1}
										class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080] outline-none"
									/>
									<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								</div>
								<div class="relative">
									<input
										type="text"
										bind:value={schedule[day].end1}
										class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080] outline-none"
									/>
									<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								</div>
								<div class="relative">
									<input
										type="text"
										bind:value={schedule[day].start2}
										class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080] outline-none"
									/>
									<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								</div>
								<div class="relative">
									<input
										type="text"
										bind:value={schedule[day].end2}
										class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080] outline-none"
									/>
									<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Upload your audio file for prompts -->
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">
					Upload your audio file for prompts
				</h2>
				<div class="rounded border border-[#808080] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
							Drag a file to upload or
						</p>
						<div class="mt-4">
							<label class="inline-block">
								<input
									type="file"
									accept="audio/*"
									onchange={(e) => handleFileUpload(e, 'prompts')}
									class="hidden"
								/>
								<button
									type="button"
									class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white"
								>
									Browse...
								</button>
							</label>
						</div>
					</div>
				</div>
			</div>

			<!-- Configure your prompts base on audio file -->
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">
					Configure your prompts base on audio file
				</h2>
				<div class="space-y-4">
					{#each keyPrompts as prompt, index}
						<div class="rounded border border-[#969696] bg-white p-4">
							<div class="mb-4 grid grid-cols-3 gap-4">
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg font-normal leading-[29px] text-[#808080]">
										Select one key (0-9)
									</label>
									<input
										type="text"
										bind:value={prompt.key}
										placeholder="Select Key"
										class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-normal leading-[19px] text-[rgba(128,128,128,0.47)] outline-none placeholder:text-[rgba(128,128,128,0.47)]"
									/>
								</div>
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg font-semibold leading-[29px] text-[#808080]">
										Give a Name
									</label>
									<input
										type="text"
										bind:value={prompt.name}
										placeholder="Enter Name Key"
										class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-normal leading-[19px] text-[rgba(128,128,128,0.47)] outline-none placeholder:text-[rgba(128,128,128,0.47)]"
									/>
								</div>
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg font-normal leading-[29px] text-[#808080]">
										Auto generate ext. number
									</label>
									<input
										type="text"
										bind:value={prompt.extension}
										class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-normal leading-[19px] text-[#808080] outline-none"
									/>
								</div>
							</div>
							{#if prompt.editing}
								<div class="mt-4 space-y-4">
									<p class="font-['Poppins'] text-lg font-medium leading-[29px] text-[#808080]">
										Add Extension Connect to {prompt.name}
									</p>
									<!-- Extension configuration would go here -->
									<div class="flex gap-2">
										<button
											onclick={() => toggleEdit(index)}
											class="h-[44px] rounded-[2px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-xl font-medium leading-[24px] text-white"
										>
											Save Changes
										</button>
										<button
											onclick={() => toggleEdit(index)}
											class="h-[44px] rounded-[2px] bg-[#EB3223] px-4 font-['Poppins'] text-xl font-medium leading-[24px] text-white"
										>
											Delete
										</button>
									</div>
								</div>
							{:else}
								<button
									onclick={() => toggleEdit(index)}
									class="mt-4 flex items-center gap-2 font-['Poppins'] text-lg font-normal leading-[21px] text-[#808080]"
								>
									<Pencil class="h-4 w-4" />
									Edit Key {prompt.key}
								</button>
							{/if}
						</div>
					{/each}
					<button
						onclick={addKeyPrompt}
						class="h-[45px] rounded-[4px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-base font-semibold leading-[19px] text-white transition-colors hover:bg-[#4a6ba5]"
					>
						Add Another Key Prompts
					</button>
				</div>
			</div>

			<!-- No Response Fail Over -->
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">
					No Response Fail Over
				</h2>
				<div class="space-y-4">
					<p class="font-['Poppins'] text-lg font-normal leading-[21px] text-[#808080]">
						Upload Failover audio file below.
					</p>
					<div class="rounded border border-[#808080] bg-white p-4">
						<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
							<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
								Drag a file to upload or
							</p>
							<div class="mt-4">
								<label class="inline-block">
									<input
										type="file"
										accept="audio/*"
										onchange={(e) => handleFileUpload(e, 'failover')}
										class="hidden"
									/>
									<button
										type="button"
										class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white"
									>
										Browse...
									</button>
								</label>
							</div>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<label class="block font-['Poppins'] text-xl font-normal leading-[24px] text-[#808080]">
								How many times Failover
							</label>
							<input
								type="text"
								bind:value={failoverCount}
								class="h-[29px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-xl font-normal leading-[29px] text-[rgba(63,63,63,0.22)] outline-none"
							/>
						</div>
						<div class="space-y-2">
							<label class="block font-['Poppins'] text-xl font-normal leading-[24px] text-[#808080]">
								Time between each failovers
							</label>
							<input
								type="text"
								bind:value={failoverTime}
								class="h-[29px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-xl font-normal leading-[29px] text-[rgba(63,63,63,0.22)] outline-none"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Hang Up Audio -->
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">
					Hang Up Audio
				</h2>
				<div>
					<p class="mb-2 font-['Poppins'] text-lg font-normal leading-[21px] text-[#808080]">
						Upload Hangup audio file below.
					</p>
					<div class="rounded border border-[#808080] bg-white p-4">
						<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
							<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
								Drag a file to upload or
							</p>
							<div class="mt-4">
								<label class="inline-block">
									<input
										type="file"
										accept="audio/*"
										onchange={(e) => handleFileUpload(e, 'hangup')}
										class="hidden"
									/>
									<button
										type="button"
										class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white"
									>
										Browse...
									</button>
								</label>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-3">
				<button
					onclick={handleBack}
					class="h-[52px] rounded-[2px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-xl font-medium leading-[24px] text-white transition-colors hover:bg-[#4a6ba5]"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					class="h-[52px] rounded-[2px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-xl font-medium leading-[24px] text-white transition-colors hover:bg-[#4a6ba5]"
				>
					Save All Changes
				</button>
			</div>
		</div>
	</div>
</div>
