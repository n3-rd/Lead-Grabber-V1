<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft } from 'lucide-svelte';

	type FlowData = {
		id?: string;
		title?: string;
		greetingAudioUrl?: string | null;
		queueHoldAudioUrl?: string | null;
		allUnavailableAudioUrl?: string | null;
		backupCellAudioUrl?: string | null;
	};
	let { data }: { data: { flow?: FlowData } } = $props();
	const flow = $derived(data?.flow ?? null);
	const flowId = $derived(flow?.id ?? '');

	let callFlowTitle = $state('');
	let greetingFile = $state<File | null>(null);
	let allOnCallFile = $state<File | null>(null);
	let unavailableFile = $state<File | null>(null);
	let backupCellFile = $state<File | null>(null);
	let saving = $state(false);
	let error = $state('');

	$effect(() => {
		const f = data?.flow;
		if (f) {
			if (f.title != null) callFlowTitle = f.title;
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

	function handleBack() {
		goto(`/ivr/${flowId}`);
	}

	function handleFileUpload(event: Event, type: string) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			if (type === 'greeting') greetingFile = file;
			else if (type === 'allOnCall') allOnCallFile = file;
			else if (type === 'unavailable') unavailableFile = file;
			else if (type === 'backupCell') backupCellFile = file;
		}
	}

	async function handleSave() {
		error = '';
		if (!callFlowTitle.trim()) {
			error = 'Call Flow Title is required';
			return;
		}
		saving = true;
		try {
			const body: Record<string, unknown> = { title: callFlowTitle.trim() };
			if (greetingFile) body.greetingAudioUrl = await uploadFile(greetingFile, 'greeting');
			if (allOnCallFile) body.queueHoldAudioUrl = await uploadFile(allOnCallFile, 'queue');
			if (unavailableFile) body.allUnavailableAudioUrl = await uploadFile(unavailableFile, 'unavailable');
			if (backupCellFile) body.backupCellAudioUrl = await uploadFile(backupCellFile, 'backup');
			const res = await fetch(`/api/ivr/flows/${flowId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to update');
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
			<h1 class="font-['Poppins'] text-[23px] font-semibold leading-[30px] text-[#747474]">Edit Call Flow</h1>
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
				<label for="edit-flow-title" class="block font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">Call Flow Title:</label>
				<input
					id="edit-flow-title"
					type="text"
					bind:value={callFlowTitle}
					placeholder="Enter your Call Flow Title"
					class="h-[56px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-medium leading-[19px] text-[#808080] outline-none"
				/>
			</div>
			<div class="space-y-2">
				<span class="block font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">Greeting:</span>
				<div class="rounded-[2px] border border-[#969696] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<p class="mb-2 font-['Poppins'] text-base text-[#969696]">Drag a file to upload or</p>
						<label class="inline-block">
							<input type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'greeting')} class="hidden" />
							<button type="button" class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base text-white">
								Browse...
							</button>
						</label>
						{#if flow?.greetingAudioUrl}
							<p class="mt-2 font-['Poppins'] text-sm text-[#808080]">Current: {flow.greetingAudioUrl}</p>
							<audio src={flow.greetingAudioUrl} controls class="mt-2 max-w-full"></audio>
						{/if}
					</div>
				</div>
			</div>
			<div class="space-y-2">
				<p class="font-['Poppins'] text-lg font-semibold text-[#808080]">All representatives on call (hold music):</p>
				<div class="rounded border border-[#808080] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<label class="inline-block">
							<input type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'allOnCall')} class="hidden" />
							<button type="button" class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base text-white">
								Browse...
							</button>
						</label>
						{#if flow?.queueHoldAudioUrl}
							<p class="mt-2 font-['Poppins'] text-sm text-[#808080]">Current: {flow.queueHoldAudioUrl}</p>
							<audio src={flow.queueHoldAudioUrl} controls class="mt-2 max-w-full"></audio>
						{/if}
					</div>
				</div>
			</div>
			<div class="space-y-2">
				<p class="font-['Poppins'] text-lg font-semibold text-[#808080]">All unavailable:</p>
				<div class="rounded border border-[#808080] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<label class="inline-block">
							<input type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'unavailable')} class="hidden" />
							<button type="button" class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base text-white">
								Browse (unavailable)
							</button>
						</label>
						{#if flow?.allUnavailableAudioUrl}
							<p class="mt-2 font-['Poppins'] text-sm text-[#808080]">Current: {flow.allUnavailableAudioUrl}</p>
							<audio src={flow.allUnavailableAudioUrl} controls class="mt-2 max-w-full"></audio>
						{/if}
					</div>
				</div>
			</div>
			<div class="space-y-2">
				<p class="font-['Poppins'] text-lg font-semibold text-[#808080]">Backup cell audio:</p>
				<div class="rounded border border-[#808080] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						<label class="inline-block">
							<input type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'backupCell')} class="hidden" />
							<button type="button" class="h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base text-white">
								Browse (backup)
							</button>
						</label>
						{#if flow?.backupCellAudioUrl}
							<p class="mt-2 font-['Poppins'] text-sm text-[#808080]">Current: {flow.backupCellAudioUrl}</p>
							<audio src={flow.backupCellAudioUrl} controls class="mt-2 max-w-full"></audio>
						{/if}
					</div>
				</div>
			</div>
			{#if error}
				<p class="font-['Poppins'] text-base text-red-600">{error}</p>
			{/if}
			<div class="flex justify-end gap-3">
				<button
					onclick={handleBack}
					disabled={saving}
					class="h-[39px] rounded-[3px] border border-black bg-[#ECEFF3] px-4 font-['Poppins'] text-lg text-[#757575] disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={saving}
					class="h-[39px] rounded-[3px] border border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-lg font-medium text-white disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</div>
</div>
