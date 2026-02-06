<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, ChevronDown, Clock, Pencil } from 'lucide-svelte';
	import DialerDialog from '$lib/components/DialerDialog.svelte';

	let { data }: { data: { flow?: { id: string; title?: string }; flowId?: string } } = $props();
	const flowId = $derived(data?.flowId ?? data?.flow?.id ?? '');
	const flow = $derived(data?.flow ?? null);
	const flowTitle = $derived(flow?.title ?? 'Call Flow');

	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let callFlowRuleTitle = $state('Call Flow Rule when Open');
	let promptsFile = $state<File | null>(null);
	let failoverFile = $state<File | null>(null);
	let hangupFile = $state<File | null>(null);
	let saving = $state(false);
	let error = $state('');

	let schedule = $state<Record<string, { start1: string; end1: string; start2: string; end2: string }>>({
		Mon: { start1: '09:00', end1: '17:00', start2: '', end2: '' },
		Tue: { start1: '09:00', end1: '17:00', start2: '', end2: '' },
		Wed: { start1: '09:00', end1: '17:00', start2: '', end2: '' },
		Thu: { start1: '09:00', end1: '17:00', start2: '', end2: '' },
		Fri: { start1: '09:00', end1: '17:00', start2: '', end2: '' },
		Sat: { start1: '', end1: '', start2: '', end2: '' },
		Sun: { start1: '', end1: '', start2: '', end2: '' }
	});

	let keyPrompts = $state<{ key: string; name: string; extension: string; transferAudioUrl?: string; editing?: boolean }[]>([
		{ key: '1', name: 'Sales', extension: '0001' },
		{ key: '2', name: 'Support', extension: '0002' },
		{ key: '3', name: 'Repeat Option', extension: '0003' }
	]);
	// Per-key transfer message audio (file picked, not yet uploaded)
	let promptTransferFiles = $state<(File | null)[]>([null, null, null]);

	let failoverCount = $state(2);
	let failoverDelayMinutes = $state(2);
	let backDigit = $state('');
	let backDigitDialerOpen = $state(false);
	let dialerOpen = $state(false);
	let dialerEditingIndex = $state(0);

	async function uploadFile(file: File, type: string): Promise<string | null> {
		const form = new FormData();
		form.set('file', file);
		form.set('type', type);
		const res = await fetch('/api/upload/ivr', { method: 'POST', body: form });
		if (!res.ok) throw new Error('Upload failed');
		const data = await res.json();
		return data.url ?? null;
	}

	function scheduleToPayload(): Record<string, { start: string; end: string } | null> {
		const out: Record<string, { start: string; end: string } | null> = {};
		for (const d of days) {
			const s = schedule[d];
			if (!s?.start1?.trim() || s.start1 === '-- : --') {
				out[d] = null;
				continue;
			}
			out[d] = { start: s.start1.trim(), end: (s.end1 || s.start1).trim() };
		}
		return out;
	}

	function handleBack() {
		goto(`/ivr/${flowId}`);
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
		const next = [...keyPrompts];
		next[index] = { ...next[index], editing: !next[index].editing };
		keyPrompts = next;
	}

	function addKeyPrompt() {
		keyPrompts = [...keyPrompts, { key: '', name: '', extension: '' }];
		promptTransferFiles = [...promptTransferFiles, null];
	}

	function handlePromptTransferFile(event: Event, index: number) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		promptTransferFiles = promptTransferFiles.slice();
		promptTransferFiles[index] = file ?? null;
		if (promptTransferFiles.length < keyPrompts.length) {
			while (promptTransferFiles.length < keyPrompts.length) promptTransferFiles.push(null);
		}
	}

	async function handleSave() {
		error = '';
		if (!callFlowRuleTitle.trim()) {
			error = 'Rule title is required';
			return;
		}
		if (!flowId) {
			error = 'Missing flow. Go back and try again.';
			return;
		}
		saving = true;
		try {
			let promptsAudioUrl: string | null = null;
			let failoverAudioUrl: string | null = null;
			let hangupAudioUrl: string | null = null;
			if (promptsFile) promptsAudioUrl = await uploadFile(promptsFile, 'prompts');
			if (failoverFile) failoverAudioUrl = await uploadFile(failoverFile, 'failover');
			if (hangupFile) hangupAudioUrl = await uploadFile(hangupFile, 'hangup');
			const keyPromptsPayload = await Promise.all(
				keyPrompts.map(async (p, i) => {
					if (!p.key.trim()) return null;
					const transferFile = promptTransferFiles[i] ?? null;
					const transferAudioUrl = transferFile
						? await uploadFile(transferFile, `transfer-${p.key}`)
						: p.transferAudioUrl ?? undefined;
					return {
						key: p.key.trim(),
						name: p.name.trim(),
						extension: p.extension.trim(),
						...(transferAudioUrl && { transferAudioUrl })
					};
				})
			).then((arr) => arr.filter(Boolean) as { key: string; name: string; extension: string; transferAudioUrl?: string }[]);
			const res = await fetch(`/api/ivr/flows/${flowId}/rules`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ruleTitle: callFlowRuleTitle.trim(),
					schedule: scheduleToPayload(),
					promptsAudioUrl,
					keyPrompts: keyPromptsPayload,
					failoverCount,
					failoverDelayMinutes,
					backDigit: backDigit.trim() || null,
					failoverAudioUrl,
					hangupAudioUrl,
					leaveMessageOnHash: true
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to save rule');
			goto(`/ivr/${flowId}`, { invalidateAll: true });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-[#ECEEF3] p-4">
	<!-- Header -->
	<div class="mb-4 rounded-[3px] bg-white px-4 py-3">
		<div class="flex items-center justify-between">
			<h1 class="font-['Poppins'] text-[23px] font-semibold leading-[30px] text-[#747474]">
				{flowTitle}
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
					Building the rules for this call flow IVR
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
										type="time"
										bind:value={schedule[day].start1}
										class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080] outline-none"
									/>
									<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								</div>
								<div class="relative">
									<input
										type="time"
										bind:value={schedule[day].end1}
										class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080] outline-none"
									/>
									<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								</div>
								<div class="relative">
									<input
										type="time"
										bind:value={schedule[day].start2}
										class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080] outline-none"
									/>
									<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								</div>
								<div class="relative">
									<input
										type="time"
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
							<label class="inline-block cursor-pointer">
								<input
									type="file"
									accept="audio/*"
									onchange={(e) => handleFileUpload(e, 'prompts')}
									class="hidden"
								/>
								<span class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[36px] text-white">
									Browse...
								</span>
							</label>
						</div>
						{#if promptsFile}
							<p class="mt-2 font-['Poppins'] text-sm text-green-600">Selected: {promptsFile.name}</p>
						{/if}
					</div>
				</div>
			</div>
			<div class="space-y-2">
				<label class="block font-['Poppins'] text-lg font-semibold text-[#808080]">Back / repeat menu digit</label>
				<button
					type="button"
					onclick={() => (backDigitDialerOpen = true)}
					class="flex h-[45px] w-24 items-center rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base text-[#808080] outline-none transition-colors hover:border-[#577AB7] hover:bg-[#ECF3FF]"
				>
					{backDigit || '—'}
				</button>
				<DialerDialog
					bind:open={backDigitDialerOpen}
					title="Back / repeat menu digit"
					keys={['*', '#']}
					onSelect={(k) => (backDigit = k)}
				/>
				<p class="font-['Poppins'] text-sm text-[#808080]">When the caller presses this key, the menu prompts are replayed. Leave unset to disable.</p>
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
									<button
										type="button"
										onclick={() => { dialerEditingIndex = index; dialerOpen = true; }}
										class="flex h-[45px] w-full items-center rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base text-[#808080] outline-none transition-colors hover:border-[#577AB7] hover:bg-[#ECF3FF]"
									>
										{prompt.key || 'Select key'}
									</button>
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
							<div class="mb-2 font-['Poppins'] text-sm text-[#808080]">
								Pre-recorded message for this key (optional, e.g. “Your call is being transferred to [name]…”)
							</div>
							<div class="mb-4">
								<label class="inline-block cursor-pointer">
									<input
										type="file"
										accept="audio/*"
										onchange={(e) => handlePromptTransferFile(e, index)} class="hidden"
									/>
									<span
										class="inline-block h-[32px] rounded border border-[#577AB7] bg-white px-3 font-['Poppins'] text-sm text-[#577AB7]"
										role="button"
										tabindex="0"
										onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}
									>
										{promptTransferFiles[index] ? promptTransferFiles[index]?.name ?? 'Change' : 'Upload audio'}
									</span>
								</label>
							</div>
							<button
								onclick={() => toggleEdit(index)}
								class="mt-4 flex items-center gap-2 font-['Poppins'] text-lg font-normal leading-[21px] text-[#808080]"
							>
								<Pencil class="h-4 w-4" />
								Edit Key {prompt.key}
							</button>
						</div>
					{/each}
					<DialerDialog
						bind:open={dialerOpen}
						title="Select one key (0-9)"
						onSelect={(k) => {
							const next = [...keyPrompts];
							if (next[dialerEditingIndex]) next[dialerEditingIndex] = { ...next[dialerEditingIndex], key: k };
							keyPrompts = next;
						}}
					/>
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
								<label class="inline-block cursor-pointer">
									<input type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'failover')} class="hidden" />
									<span class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[36px] text-white">Browse...</span>
								</label>
							</div>
							{#if failoverFile}
								<p class="mt-2 font-['Poppins'] text-sm text-green-600">Selected: {failoverFile.name}</p>
							{/if}
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<label class="block font-['Poppins'] text-xl font-normal leading-[24px] text-[#808080]">
								How many times Failover
							</label>
							<input
								type="number"
								min="1"
								max="5"
								bind:value={failoverCount}
								class="h-[29px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-xl font-normal leading-[29px] text-[rgba(63,63,63,0.22)] outline-none"
							/>
						</div>
						<div class="space-y-2">
							<label class="block font-['Poppins'] text-xl font-normal leading-[24px] text-[#808080]">
								Time before failovers (min)
							</label>
							<input
								type="number"
								min="1"
								bind:value={failoverDelayMinutes}
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
								<label class="inline-block cursor-pointer">
									<input type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'hangup')} class="hidden" />
									<span class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[36px] text-white">Browse...</span>
								</label>
							</div>
							{#if hangupFile}
								<p class="mt-2 font-['Poppins'] text-sm text-green-600">Selected: {hangupFile.name}</p>
							{/if}
						</div>
					</div>
				</div>
			</div>

			{#if error}
				<p class="font-['Poppins'] text-base text-red-600">{error}</p>
			{/if}
			<!-- Action Buttons -->
			<div class="flex justify-end gap-3">
				<button
					onclick={handleBack}
					disabled={saving}
					class="h-[52px] rounded-[2px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-xl font-medium leading-[24px] text-white transition-colors hover:bg-[#4a6ba5] disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={saving}
					class="h-[52px] rounded-[2px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-xl font-medium leading-[24px] text-white transition-colors hover:bg-[#4a6ba5] disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save All Changes'}
				</button>
			</div>
		</div>
	</div>
</div>
