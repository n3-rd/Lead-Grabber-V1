<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, ChevronDown, Check, X } from 'lucide-svelte';
	import DialerDialog from '$lib/components/DialerDialog.svelte';
	import AudioPreview from '$lib/components/AudioPreview.svelte';

	let callFlowTitle = $state('');
	let greetingFile = $state<File | null>(null);
	let scheduleRule = $state('noRules');
	let addFailover = $state(false);
	let failoverKey = $state('');
	let failoverDialerOpen = $state(false);
	let failoverName = $state('');
	let failoverDuration = $state('');
	let failoverFile = $state<File | null>(null);
	let saving = $state(false);
	let error = $state('');

	let allOnCallFile = $state<File | null>(null);
	let unavailableFile = $state<File | null>(null);
	let backupCellFile = $state<File | null>(null);

	// Preview URLs for playback (revoked when file changes)
	let greetingPreviewUrl = $state<string | null>(null);
	let allOnCallPreviewUrl = $state<string | null>(null);
	let unavailablePreviewUrl = $state<string | null>(null);
	let failoverPreviewUrl = $state<string | null>(null);
	let backupCellPreviewUrl = $state<string | null>(null);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function setFileWithPreview(
		file: File | null,
		setFile: (f: File | null) => void,
		setPreview: (u: string | null) => void,
		currentPreview: string | null
	) {
		if (currentPreview) URL.revokeObjectURL(currentPreview);
		setFile(file);
		setPreview(file ? URL.createObjectURL(file) : null);
	}

	function clearFile(
		type: 'greeting' | 'allOnCall' | 'unavailable' | 'failover' | 'backupCell',
		inputId: string
	) {
		if (type === 'greeting') setFileWithPreview(null, (f) => (greetingFile = f), (u) => (greetingPreviewUrl = u), greetingPreviewUrl);
		else if (type === 'allOnCall') setFileWithPreview(null, (f) => (allOnCallFile = f), (u) => (allOnCallPreviewUrl = u), allOnCallPreviewUrl);
		else if (type === 'unavailable') setFileWithPreview(null, (f) => (unavailableFile = f), (u) => (unavailablePreviewUrl = u), unavailablePreviewUrl);
		else if (type === 'failover') setFileWithPreview(null, (f) => (failoverFile = f), (u) => (failoverPreviewUrl = u), failoverPreviewUrl);
		else if (type === 'backupCell') setFileWithPreview(null, (f) => (backupCellFile = f), (u) => (backupCellPreviewUrl = u), backupCellPreviewUrl);
		const el = document.getElementById(inputId) as HTMLInputElement | null;
		if (el) el.value = '';
	}

	async function uploadFile(file: File, type: string): Promise<string | null> {
		const form = new FormData();
		form.set('file', file);
		form.set('type', type);
		const res = await fetch('/api/upload/ivr', { method: 'POST', body: form });
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.error || 'Upload failed');
		}
		const data = await res.json();
		return data.url ?? null;
	}

	function handleScheduleRuleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		if (target.value === 'createNew') {
			// After saving, user will be redirected to rule builder; keep selection for UX
			scheduleRule = 'createNew';
		}
	}

	function handleBack() {
		goto('/ivr');
	}

	function handleFileUpload(
		event: Event,
		type: 'greeting' | 'allOnCall' | 'unavailable' | 'failover' | 'backupCell'
	) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		if (type === 'greeting') setFileWithPreview(file, (f) => (greetingFile = f), (u) => (greetingPreviewUrl = u), greetingPreviewUrl);
		else if (type === 'allOnCall') setFileWithPreview(file, (f) => (allOnCallFile = f), (u) => (allOnCallPreviewUrl = u), allOnCallPreviewUrl);
		else if (type === 'unavailable') setFileWithPreview(file, (f) => (unavailableFile = f), (u) => (unavailablePreviewUrl = u), unavailablePreviewUrl);
		else if (type === 'failover') setFileWithPreview(file, (f) => (failoverFile = f), (u) => (failoverPreviewUrl = u), failoverPreviewUrl);
		else if (type === 'backupCell') setFileWithPreview(file, (f) => (backupCellFile = f), (u) => (backupCellPreviewUrl = u), backupCellPreviewUrl);
	}

	async function handleSave() {
		error = '';
		if (!callFlowTitle.trim()) {
			error = 'Call Flow Title is required';
			return;
		}
		saving = true;
		try {
			let greetingAudioUrl: string | null = null;
			let queueHoldAudioUrl: string | null = null;
			let allUnavailableAudioUrl: string | null = null;
			let backupCellAudioUrl: string | null = null;
			let failoverConfig: unknown = undefined;
			if (greetingFile) greetingAudioUrl = await uploadFile(greetingFile, 'greeting');
			if (allOnCallFile) queueHoldAudioUrl = await uploadFile(allOnCallFile, 'queue');
			if (unavailableFile) allUnavailableAudioUrl = await uploadFile(unavailableFile, 'unavailable');
			if (backupCellFile) backupCellAudioUrl = await uploadFile(backupCellFile, 'backup');
			if (addFailover && failoverFile) {
				const url = await uploadFile(failoverFile, 'failover');
				if (url)
					failoverConfig = [{ key: failoverKey || '4', name: failoverName, durationSec: 30, audioUrl: url }];
			}
			const res = await fetch('/api/ivr/flows', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: callFlowTitle.trim(),
					greetingAudioUrl,
					queueHoldAudioUrl,
					allUnavailableAudioUrl,
					backupCellAudioUrl,
					failoverConfig
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to create call flow');
			const flowId = data.flow?.id;
			if (flowId && scheduleRule === 'createNew') {
				goto(`/ivr/${flowId}/edit`);
			} else if (flowId) {
				goto('/ivr', { invalidateAll: true });
			}
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
				Create Call Flow
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
			<!-- Call Flow Title -->
			<div class="space-y-2">
				<label class="block font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">
					Call Flow Title:
				</label>
				<input
					type="text"
					bind:value={callFlowTitle}
					placeholder="Enter your Call Flow Title"
					class="h-[56px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-medium leading-[19px] text-[rgba(128,128,128,0.54)] outline-none placeholder:text-[rgba(128,128,128,0.54)]"
				/>
			</div>

			<!-- Greeting -->
			<div class="space-y-2">
				<label class="block font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">
					Greeting:
				</label>
				<div class="rounded-[2px] border border-[#969696] bg-white p-4">
					<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
						{#if greetingFile}
							<div class="space-y-3">
								<div class="flex items-center justify-center gap-2 font-['Poppins'] text-[#577AB7]">
									<Check class="h-5 w-5 shrink-0" />
									<span class="font-medium">{greetingFile.name}</span>
									<span class="text-sm text-[#808080]">({formatSize(greetingFile.size)})</span>
								</div>
								{#if greetingPreviewUrl}
									<AudioPreview src={greetingPreviewUrl} />
								{/if}
								<div class="flex items-center justify-center gap-2">
									<label class="inline-block cursor-pointer">
										<input
											id="input-greeting"
											type="file"
											accept="audio/*"
											onchange={(e) => handleFileUpload(e, 'greeting')}
											class="hidden"
										/>
										<span
											class="inline-block h-[32px] rounded border border-[#577AB7] bg-white px-3 font-['Poppins'] text-sm text-[#577AB7]"
											role="button"
											tabindex="0"
											onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}
										>
											Change
										</span>
									</label>
									<button
										type="button"
										onclick={() => clearFile('greeting', 'input-greeting')}
										class="inline-flex h-[32px] items-center gap-1 rounded border border-red-400 bg-white px-3 font-['Poppins'] text-sm text-red-600 hover:bg-red-50"
									>
										<X class="h-4 w-4" />
										Clear
									</button>
								</div>
							</div>
						{:else}
							<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
								Drag a file to upload
							</p>
							<span class="font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#969696]">or</span>
							<div class="mt-4">
								<label class="inline-block cursor-pointer">
									<input
										id="input-greeting"
										type="file"
										accept="audio/*"
										onchange={(e) => handleFileUpload(e, 'greeting')}
										class="hidden"
									/>
									<span
										class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white"
										role="button"
										tabindex="0"
										onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}
									>
										Browse...
									</span>
								</label>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Call Flow / Schedule Rule -->
			<div class="space-y-2">
				<label class="block font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">
					Call Flow / Schedule Rule:
				</label>
				<div class="relative">
					<select
						bind:value={scheduleRule}
						onchange={handleScheduleRuleChange}
						class="h-[56px] w-full appearance-none rounded-[2px] border border-[#969696] bg-white px-3 pr-10 font-['Poppins'] text-base font-medium leading-[19px] text-[rgba(128,128,128,0.54)] outline-none"
					>
						<option value="noRules">No Rules</option>
						<option value="createNew">Create New Set Rule</option>
					</select>
					<ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
				</div>
			</div>

			<!-- General Call Flow Rules -->
			<div class="space-y-6">
				<h2 class="font-['Poppins'] text-2xl font-semibold leading-[28px] text-[#808080]">
					General Call Flow Rules
				</h2>

				<!-- All representatives are currently on call -->
				<div class="space-y-2">
					<p class="font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">
						All representatives are currently on call.
					</p>
					<div class="rounded border border-[#808080] bg-white p-4">
						<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
							{#if allOnCallFile}
								<div class="space-y-3">
									<div class="flex items-center justify-center gap-2 font-['Poppins'] text-[#577AB7]">
										<Check class="h-5 w-5 shrink-0" />
										<span class="font-medium">{allOnCallFile.name}</span>
										<span class="text-sm text-[#808080]">({formatSize(allOnCallFile.size)})</span>
									</div>
									{#if allOnCallPreviewUrl}
										<AudioPreview src={allOnCallPreviewUrl} />
									{/if}
									<div class="flex items-center justify-center gap-2">
										<label class="inline-block cursor-pointer">
											<input id="input-allOnCall" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'allOnCall')} class="hidden" />
											<span class="inline-block h-[32px] rounded border border-[#577AB7] bg-white px-3 font-['Poppins'] text-sm text-[#577AB7]" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Change</span>
										</label>
										<button type="button" onclick={() => clearFile('allOnCall', 'input-allOnCall')} class="inline-flex h-[32px] items-center gap-1 rounded border border-red-400 bg-white px-3 font-['Poppins'] text-sm text-red-600 hover:bg-red-50">
											<X class="h-4 w-4" /> Clear
										</button>
									</div>
								</div>
							{:else}
								<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">Drag a file to upload</p>
								<span class="font-['Poppins'] text-[13px] text-[#969696]">or</span>
								<div class="mt-4">
									<label class="inline-block cursor-pointer">
										<input id="input-allOnCall" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'allOnCall')} class="hidden" />
										<span class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Browse...</span>
									</label>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- All representatives are currently unavailable -->
				<div class="space-y-2">
					<p class="font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">
						All representatives are currently unavailable (offline or no active forwarding number).
					</p>
					<div class="rounded border border-[#808080] bg-white p-4">
						<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
							{#if unavailableFile}
								<div class="space-y-3">
									<div class="flex items-center justify-center gap-2 font-['Poppins'] text-[#577AB7]">
										<Check class="h-5 w-5 shrink-0" />
										<span class="font-medium">{unavailableFile.name}</span>
										<span class="text-sm text-[#808080]">({formatSize(unavailableFile.size)})</span>
									</div>
									{#if unavailablePreviewUrl}
										<AudioPreview src={unavailablePreviewUrl} />
									{/if}
									<div class="flex items-center justify-center gap-2">
										<label class="inline-block cursor-pointer">
											<input id="input-unavailable" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'unavailable')} class="hidden" />
											<span class="inline-block h-[32px] rounded border border-[#577AB7] bg-white px-3 font-['Poppins'] text-sm text-[#577AB7]" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Change</span>
										</label>
										<button type="button" onclick={() => clearFile('unavailable', 'input-unavailable')} class="inline-flex h-[32px] items-center gap-1 rounded border border-red-400 bg-white px-3 font-['Poppins'] text-sm text-red-600 hover:bg-red-50">
											<X class="h-4 w-4" /> Clear
										</button>
									</div>
								</div>
							{:else}
								<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">Drag a file to upload</p>
								<span class="font-['Poppins'] text-[13px] text-[#969696]">or</span>
								<div class="mt-4">
									<label class="inline-block cursor-pointer">
										<input id="input-unavailable" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'unavailable')} class="hidden" />
										<span class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Browse...</span>
									</label>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Add Failover -->
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={addFailover}
							class="h-5 w-5 rounded border border-[#757575]"
						/>
						<label class="font-['Poppins'] text-lg font-semibold leading-[26px] text-[#808080]">
							Add Failover
						</label>
					</div>

					{#if addFailover}
						<div class="space-y-4 rounded border border-[#808080] bg-white p-4">
							<div class="grid grid-cols-3 gap-4">
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg font-semibold leading-[26px] text-[#808080]">
										Select one key (4-9)
									</label>
									<button
										type="button"
										onclick={() => (failoverDialerOpen = true)}
										class="flex h-[45px] w-full items-center rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base text-[#808080] outline-none transition-colors hover:border-[#577AB7] hover:bg-[#ECF3FF]"
									>
										{failoverKey || 'Select key'}
									</button>
								</div>
								<DialerDialog
									bind:open={failoverDialerOpen}
									title="Select one key (4-9)"
									keys={['4', '5', '6', '7', '8', '9']}
									onSelect={(k) => (failoverKey = k)}
								/>
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg font-semibold leading-[26px] text-[#808080]">
										Give a Name
									</label>
									<input
										type="text"
										bind:value={failoverName}
										placeholder="Enter Name Key"
										class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-normal leading-[19px] text-[rgba(128,128,128,0.47)] outline-none placeholder:text-[rgba(128,128,128,0.47)]"
									/>
								</div>
								<div class="space-y-2">
									<label class="block font-['Poppins'] text-lg font-semibold leading-[26px] text-[#808080]">
										Voice Message
									</label>
									<input
										type="text"
										bind:value={failoverDuration}
										placeholder="Duration 30s max"
										class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-light leading-[19px] text-[rgba(128,128,128,0.47)] outline-none placeholder:text-[rgba(128,128,128,0.47)]"
									/>
								</div>
							</div>
							<div>
								<p class="mb-2 font-['Poppins'] text-lg font-normal leading-[21px] text-[#808080]">
									Upload your audio file below.
								</p>
								<div class="rounded border border-[#808080] bg-white p-4">
									<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
										{#if failoverFile}
											<div class="space-y-3">
												<div class="flex items-center justify-center gap-2 font-['Poppins'] text-[#577AB7]">
													<Check class="h-5 w-5 shrink-0" />
													<span class="font-medium">{failoverFile.name}</span>
													<span class="text-sm text-[#808080]">({formatSize(failoverFile.size)})</span>
												</div>
												{#if failoverPreviewUrl}
													<AudioPreview src={failoverPreviewUrl} />
												{/if}
												<div class="flex items-center justify-center gap-2">
													<label class="inline-block cursor-pointer">
														<input id="input-failover" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'failover')} class="hidden" />
														<span class="inline-block h-[32px] rounded border border-[#577AB7] bg-white px-3 font-['Poppins'] text-sm text-[#577AB7]" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Change</span>
													</label>
													<button type="button" onclick={() => clearFile('failover', 'input-failover')} class="inline-flex h-[32px] items-center gap-1 rounded border border-red-400 bg-white px-3 font-['Poppins'] text-sm text-red-600 hover:bg-red-50">
														<X class="h-4 w-4" /> Clear
													</button>
												</div>
											</div>
										{:else}
											<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">Drag a file to upload</p>
											<span class="font-['Poppins'] text-[13px] text-[#969696]">or</span>
											<div class="mt-4">
												<label class="inline-block cursor-pointer">
													<input id="input-failover" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'failover')} class="hidden" />
													<span class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Browse...</span>
												</label>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- All representatives unavailable — forward calls to backup cell number -->
				<div class="space-y-4">
					<p class="font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">
						All representatives unavailable — forward calls to backup cell number
					</p>
					<!-- Flow Diagram -->
					<div class="flex items-center gap-4">
						<div class="flex flex-col items-center gap-2">
							<span class="font-['Poppins'] text-lg font-medium leading-[26px] text-[#808080]">
								Forward to available cell number
							</span>
							<div class="h-[2px] w-[93px] bg-[#577AB7]"></div>
							<span class="font-['Poppins'] text-lg font-medium leading-[26px] text-[#808080]">Connects</span>
						</div>
						<div class="flex flex-col items-center gap-2">
							<span class="font-['Poppins'] text-lg font-medium leading-[26px] text-[#808080]">
								Attempt 5 Rings
							</span>
							<div class="h-[2px] w-[93px] bg-[#577AB7]"></div>
							<span class="font-['Poppins'] text-lg font-medium leading-[26px] text-[#808080]">No Answer</span>
						</div>
					</div>
					<div>
						<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#808080]">
							Upload your audio file below.
						</p>
						<div class="rounded border border-[#808080] bg-white p-4">
							<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
								{#if backupCellFile}
									<div class="space-y-3">
										<div class="flex items-center justify-center gap-2 font-['Poppins'] text-[#577AB7]">
											<Check class="h-5 w-5 shrink-0" />
											<span class="font-medium">{backupCellFile.name}</span>
											<span class="text-sm text-[#808080]">({formatSize(backupCellFile.size)})</span>
										</div>
										{#if backupCellPreviewUrl}
											<AudioPreview src={backupCellPreviewUrl} />
										{/if}
										<div class="flex items-center justify-center gap-2">
											<label class="inline-block cursor-pointer">
												<input id="input-backupCell" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'backupCell')} class="hidden" />
												<span class="inline-block h-[32px] rounded border border-[#577AB7] bg-white px-3 font-['Poppins'] text-sm text-[#577AB7]" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Change</span>
											</label>
											<button type="button" onclick={() => clearFile('backupCell', 'input-backupCell')} class="inline-flex h-[32px] items-center gap-1 rounded border border-red-400 bg-white px-3 font-['Poppins'] text-sm text-red-600 hover:bg-red-50">
												<X class="h-4 w-4" /> Clear
											</button>
										</div>
									</div>
								{:else}
									<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">Drag a file to upload</p>
									<span class="font-['Poppins'] text-[13px] text-[#969696]">or</span>
									<div class="mt-4">
										<label class="inline-block cursor-pointer">
											<input id="input-backupCell" type="file" accept="audio/*" onchange={(e) => handleFileUpload(e, 'backupCell')} class="hidden" />
											<span class="inline-block h-[36px] rounded bg-[#577AB7] px-4 font-['Poppins'] text-base font-normal leading-[19px] text-white" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}>Browse...</span>
										</label>
									</div>
								{/if}
							</div>
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
					class="h-[39px] rounded-[3px] border-[0.5px] border-black bg-[#ECEFF3] px-4 font-['Poppins'] text-lg font-normal leading-[21px] text-[#757575] transition-colors hover:bg-[#E0E5EA] disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={saving}
					class="h-[39px] rounded-[3px] border-[0.5px] border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-lg font-medium leading-[21px] text-white transition-colors hover:bg-[#4a6ba5] disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</div>
</div>
