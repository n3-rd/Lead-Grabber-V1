<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Clock, Pencil, Play } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { page } from '$app/stores';

	type KeyPrompt = { key: string; name: string; extension: string; transferAudioUrl?: string };
	type RuleData = {
		ruleTitle?: string;
		schedule?: Record<string, { start?: string; end?: string } | null>;
		keyPrompts?: KeyPrompt[];
		failoverCount?: number;
		failoverDelayMinutes?: number;
		promptsAudioUrl?: string | null;
		failoverAudioUrl?: string | null;
		hangupAudioUrl?: string | null;
	};
	type PageData = { flow?: { title?: string }; rule?: RuleData; flowId?: string; ruleId?: string };
	let { data: propsData }: { data: PageData } = $props();
	const pageData = $derived(($page as unknown as { data?: PageData })?.data);
	// Prefer page store so we get this route's load (flow, rule); props can lag on client nav
	const data = $derived((pageData?.rule != null ? pageData : propsData) ?? pageData ?? propsData ?? {});
	const flowId = $derived(data?.flowId ?? '');
	const ruleId = $derived(data?.ruleId ?? '');
	const flowTitle = $derived(data?.flow?.title ?? 'Call Flow');
	const rule = $derived(data?.rule);

	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	function scheduleFromRule(r: { schedule?: Record<string, { start?: string; end?: string } | null> } | null) {
		const def: Record<string, { start1: string; end1: string; start2: string; end2: string }> = {};
		for (const d of days) {
			const v = r?.schedule?.[d];
			if (v && typeof v === 'object' && 'start' in v && 'end' in v) {
				def[d] = { start1: (v as { start: string }).start ?? '', end1: (v as { end: string }).end ?? '', start2: '', end2: '' };
			} else {
				def[d] = { start1: '', end1: '', start2: '', end2: '' };
			}
		}
		return def;
	}

	const defaultKeyPrompts = (): KeyPrompt[] => [
		{ key: '1', name: 'Sales', extension: '0001' },
		{ key: '2', name: 'Support', extension: '0002' },
		{ key: '3', name: 'Repeat Option', extension: '0003' }
	];
	const emptySchedule = scheduleFromRule(null);
	const initialSchedule = $derived(scheduleFromRule(rule ?? null));
	const initialKeyPrompts = $derived(
		Array.isArray(rule?.keyPrompts) && rule.keyPrompts.length
			? rule.keyPrompts.map((p) => ({
					key: String(p.key ?? ''),
					name: String(p.name ?? ''),
					extension: String(p.extension ?? ''),
					transferAudioUrl: p.transferAudioUrl ? String(p.transferAudioUrl) : undefined
				}))
			: defaultKeyPrompts()
	);

	let callFlowRuleTitle = $state('');
	let promptsFile = $state<File | null>(null);
	let failoverFile = $state<File | null>(null);
	let hangupFile = $state<File | null>(null);
	let saving = $state(false);
	let error = $state('');
	let schedule = $state<Record<string, { start1: string; end1: string; start2: string; end2: string }>>(emptySchedule);
	let keyPrompts = $state<KeyPrompt[]>(defaultKeyPrompts());
	let promptTransferFiles = $state<(File | null)[]>([]);
	let failoverCount = $state(2);
	let failoverDelayMinutes = $state(2);
	let showPromptsEditDialog = $state(false);
	let promptsFileInput: HTMLInputElement | undefined;
	let failoverFileInput: HTMLInputElement | undefined;
	let hangupFileInput: HTMLInputElement | undefined;

	$effect(() => {
		if (promptTransferFiles.length < keyPrompts.length) {
			while (promptTransferFiles.length < keyPrompts.length) promptTransferFiles = [...promptTransferFiles, null];
		}
	});

	$effect(() => {
		const r = rule;
		if (r) {
			callFlowRuleTitle = r.ruleTitle ?? '';
			schedule = scheduleFromRule(r);
			failoverCount = r.failoverCount ?? 2;
			failoverDelayMinutes = r.failoverDelayMinutes ?? 2;
			keyPrompts =
				Array.isArray(r.keyPrompts) && r.keyPrompts.length
					? r.keyPrompts.map((pk) => ({
							key: String(pk.key ?? ''),
							name: String(pk.name ?? ''),
							extension: String(pk.extension ?? ''),
							transferAudioUrl: pk.transferAudioUrl ? String(pk.transferAudioUrl) : undefined
						}))
					: defaultKeyPrompts();
		} else {
			schedule = initialSchedule;
			keyPrompts = initialKeyPrompts;
		}
	});

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
			if (!s?.start1?.trim()) {
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

	function handlePromptTransferFile(event: Event, index: number) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0] ?? null;
		const next = [...promptTransferFiles];
		while (next.length <= index) next.push(null);
		next[index] = file;
		promptTransferFiles = next;
	}

	function playPromptAudio(url: string) {
		const audio = new Audio(url);
		audio.play().catch(() => {});
	}

	function toggleEdit(_index: number) {
		// Optional: expand key edit UI
	}

	function addKeyPrompt() {
		keyPrompts = [...keyPrompts, { key: '', name: '', extension: '' }];
		promptTransferFiles = [...promptTransferFiles, null];
	}

	async function handleSave() {
		error = '';
		if (!callFlowRuleTitle.trim()) {
			error = 'Rule title is required';
			return;
		}
		saving = true;
		try {
			const keyPromptsPayload = (
				await Promise.all(
					keyPrompts.map(async (p, i) => {
						if (!p.key.trim()) return null;
						const transferFile = promptTransferFiles[i] ?? null;
						const transferAudioUrl = transferFile
							? await uploadFile(transferFile, `transfer-${p.key}`)
							: p.transferAudioUrl;
						return {
							key: p.key.trim(),
							name: p.name.trim(),
							extension: p.extension.trim(),
							...(transferAudioUrl && { transferAudioUrl })
						};
					})
				)
			).filter((x): x is NonNullable<typeof x> => x != null);
			const body: Record<string, unknown> = {
				ruleTitle: callFlowRuleTitle.trim(),
				schedule: scheduleToPayload(),
				keyPrompts: keyPromptsPayload,
				failoverCount,
				failoverDelayMinutes,
				leaveMessageOnHash: true
			};
			if (promptsFile) body.promptsAudioUrl = await uploadFile(promptsFile, 'prompts');
			if (failoverFile) body.failoverAudioUrl = await uploadFile(failoverFile, 'failover');
			if (hangupFile) body.hangupAudioUrl = await uploadFile(hangupFile, 'hangup');
			const res = await fetch(`/api/ivr/flows/${flowId}/rules/${ruleId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to update rule');
			goto(`/ivr/${flowId}`, { invalidateAll: true });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-[#ECEEF3] p-4">
	<div class="mb-4 rounded-[3px] bg-white px-4 py-3">
		<div class="flex items-center justify-between">
			<h1 class="font-['Poppins'] text-[23px] font-semibold leading-[30px] text-[#747474]">{flowTitle} – Edit Rule</h1>
			<button
				onclick={handleBack}
				class="flex items-center gap-2 font-['Poppins'] text-base font-medium leading-[19px] text-[#757575] transition-colors hover:text-[#577AB7]"
			>
				<ArrowLeft class="h-4 w-4" />
				Back
			</button>
		</div>
	</div>
	<div class="max-h-[calc(100vh-120px)] overflow-y-auto rounded-lg bg-white p-6">
		<div class="space-y-8">
			<div class="space-y-2">
				<label class="block font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">Call Flow Rule Title:</label>
				<input
					type="text"
					bind:value={callFlowRuleTitle}
					placeholder="Enter Call Rule Title"
					class="h-[46px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-lg font-medium leading-[24px] text-[#808080] outline-none"
				/>
			</div>
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">Set Schedule Rule:</h2>
				<div class="grid grid-cols-7 gap-4">
					{#each days as day}
						{#if schedule[day]}
							<div class="space-y-2">
								<div class="font-['Poppins'] text-[22px] font-semibold leading-[26px] text-[#808080]">{day}</div>
								<div class="space-y-2">
									<div class="relative">
										<input type="time" bind:value={schedule[day].start1} class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg text-[#808080] outline-none" />
										<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
									</div>
									<div class="relative">
										<input type="time" bind:value={schedule[day].end1} class="h-[40px] w-full rounded-[3px] border border-black bg-white px-3 pr-10 font-['Poppins'] text-lg text-[#808080] outline-none" />
										<Clock class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">Upload your audio file for prompts</h2>
					<button
						type="button"
						onclick={() => (showPromptsEditDialog = true)}
						class="flex items-center gap-2 rounded border border-[#577AB7] bg-white px-3 py-1.5 font-['Poppins'] text-sm text-[#577AB7] transition-colors hover:bg-[#f0f4ff]"
					>
						<Pencil class="h-4 w-4" />
						Edit
					</button>
				</div>
				<div class="rounded border border-[#808080] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<input
							type="file"
							accept="audio/*"
							bind:this={promptsFileInput}
							onchange={(e) => handleFileUpload(e, 'prompts')}
							class="hidden"
						/>
						<button
							type="button"
							onclick={() => promptsFileInput?.click()}
							class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base text-white"
						>
							Browse...
						</button>
						{#if promptsFile}
							<p class="mt-2 font-['Poppins'] text-sm text-[#577AB7]">Selected: {promptsFile.name}</p>
						{/if}
						{#if rule?.promptsAudioUrl}
							<p class="mt-2 font-['Poppins'] text-sm text-[#808080]">Current: {rule.promptsAudioUrl}</p>
							<audio src={rule.promptsAudioUrl} controls class="mt-2 max-w-full"></audio>
						{/if}
					</div>
				</div>
			</div>

			<Dialog.Root bind:open={showPromptsEditDialog}>
				<Dialog.Content class="sm:max-w-[425px]">
					<Dialog.Header>
						<Dialog.Title>Replace prompts audio</Dialog.Title>
						<Dialog.Description>Choose a new audio file to replace the current prompts.</Dialog.Description>
					</Dialog.Header>
					<div class="py-4">
						<label class="block cursor-pointer">
							<input
								type="file"
								accept="audio/*"
								onchange={(e) => {
									handleFileUpload(e, 'prompts');
									showPromptsEditDialog = false;
								}}
								class="hidden"
							/>
							<span
								class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base leading-[36px] text-white"
								role="button"
								tabindex="0"
								onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}
							>
								Choose file...
							</span>
						</label>
					</div>
					<Dialog.Footer>
						<button
							type="button"
							onclick={() => (showPromptsEditDialog = false)}
							class="h-[36px] rounded border border-[#577AB7] bg-white px-4 font-['Poppins'] text-base text-[#577AB7]"
						>
							Cancel
						</button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">Configure your prompts</h2>
				<div class="space-y-4">
					{#each keyPrompts as prompt, index}
						<div class="rounded border border-[#969696] bg-white p-4">
							<div class="grid grid-cols-3 gap-4">
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg text-[#808080]">Select one key (0-9)</label>
									<input type="text" bind:value={prompt.key} placeholder="Key" class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base text-[#808080] outline-none" />
								</div>
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg font-semibold text-[#808080]">Give a Name</label>
									<input type="text" bind:value={prompt.name} placeholder="Name" class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base text-[#808080] outline-none" />
								</div>
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg text-[#808080]">Extension</label>
									<input type="text" bind:value={prompt.extension} class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base text-[#808080] outline-none" />
								</div>
							</div>
							<div class="mt-3 flex flex-wrap items-center gap-3 border-t border-[#e5e5e5] pt-3">
								<span class="font-['Poppins'] text-sm text-[#808080]">Audio for key {prompt.key}:</span>
								<label class="inline-flex cursor-pointer items-center gap-2 rounded border border-[#577AB7] bg-white px-3 py-1.5 font-['Poppins'] text-sm text-[#577AB7] hover:bg-[#f0f4ff]">
									<input type="file" accept="audio/*" onchange={(e) => handlePromptTransferFile(e, index)} class="hidden" />
									{promptTransferFiles[index] ? promptTransferFiles[index]?.name ?? 'Change' : 'Upload audio'}
								</label>
								{#if prompt.transferAudioUrl}
									<button
										type="button"
										onclick={() => playPromptAudio(prompt.transferAudioUrl!)}
										class="flex items-center gap-2 rounded border border-[#577AB7] bg-[#577AB7] px-3 py-1.5 font-['Poppins'] text-sm text-white hover:bg-[#4a6ba5]"
										title="Play audio for {prompt.name}"
									>
										<Play class="h-4 w-4" />
										Play
									</button>
								{/if}
							</div>
						</div>
					{/each}
					<button onclick={addKeyPrompt} class="h-[45px] rounded-[4px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-base font-semibold text-white hover:bg-[#4a6ba5]">Add Another Key Prompts</button>
				</div>
			</div>
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">No Response Fail Over</h2>
				<div class="rounded border border-[#808080] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<input type="file" accept="audio/*" bind:this={failoverFileInput} onchange={(e) => handleFileUpload(e, 'failover')} class="hidden" />
						<button type="button" onclick={() => failoverFileInput?.click()} class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base text-white">Browse...</button>
						{#if failoverFile}
							<p class="mt-2 font-['Poppins'] text-sm text-[#577AB7]">Selected: {failoverFile.name}</p>
						{/if}
						{#if rule?.failoverAudioUrl}
							<p class="mt-2 font-['Poppins'] text-sm text-[#808080]">Current: {rule.failoverAudioUrl}</p>
							<audio src={rule.failoverAudioUrl} controls class="mt-2 max-w-full"></audio>
						{/if}
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label class="block font-['Poppins'] text-xl text-[#808080]">How many times Failover</label>
						<input type="number" min="1" max="5" bind:value={failoverCount} class="h-[29px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-xl text-[#808080] outline-none" />
					</div>
					<div class="space-y-2">
						<label class="block font-['Poppins'] text-xl text-[#808080]">Time before failovers (min)</label>
						<input type="number" min="1" bind:value={failoverDelayMinutes} class="h-[29px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-xl text-[#808080] outline-none" />
					</div>
				</div>
			</div>
			<div class="space-y-4">
				<h2 class="font-['Poppins'] text-xl font-semibold leading-[26px] text-[#808080]">Hang Up Audio</h2>
				<div class="rounded border border-[#808080] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<input type="file" accept="audio/*" bind:this={hangupFileInput} onchange={(e) => handleFileUpload(e, 'hangup')} class="hidden" />
						<button type="button" onclick={() => hangupFileInput?.click()} class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base text-white">Browse...</button>
						{#if hangupFile}
							<p class="mt-2 font-['Poppins'] text-sm text-[#577AB7]">Selected: {hangupFile.name}</p>
						{/if}
						{#if rule?.hangupAudioUrl}
							<p class="mt-2 font-['Poppins'] text-sm text-[#808080]">Current: {rule.hangupAudioUrl}</p>
							<audio src={rule.hangupAudioUrl} controls class="mt-2 max-w-full"></audio>
						{/if}
					</div>
				</div>
			</div>
			{#if error}
				<p class="font-['Poppins'] text-base text-red-600">{error}</p>
			{/if}
			<div class="flex justify-end gap-3">
				<button onclick={handleBack} disabled={saving} class="h-[52px] rounded-[2px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-xl font-medium text-white disabled:opacity-50">Cancel</button>
				<button onclick={handleSave} disabled={saving} class="h-[52px] rounded-[2px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-xl font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save All Changes'}</button>
			</div>
		</div>
	</div>
</div>
