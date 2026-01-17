<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, ChevronDown, Upload, Check } from 'lucide-svelte';

	let callFlowTitle = $state('');
	let greetingFile = $state<File | null>(null);
	let scheduleRule = $state('noRules');
	let addFailover = $state(false);
	let failoverKey = $state('');
	let failoverName = $state('');
	let failoverDuration = $state('');
	let failoverFile = $state<File | null>(null);

	// Files for general rules
	let allOnCallFile = $state<File | null>(null);
	let unavailableFile = $state<File | null>(null);
	let backupCellFile = $state<File | null>(null);

	function handleScheduleRuleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		if (target.value === 'createNew') {
			// Navigate to the edit page (Given Call Flow Title page)
			// Using 'new' as the ID since we're creating a new rule
			goto(`/ivr/new/edit?title=${encodeURIComponent(callFlowTitle)}`);
		}
	}

	function handleBack() {
		goto('/ivr');
	}

	function handleFileUpload(event: Event, type: string) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			if (type === 'greeting') greetingFile = file;
			else if (type === 'failover') failoverFile = file;
			else if (type === 'allOnCall') allOnCallFile = file;
			else if (type === 'unavailable') unavailableFile = file;
			else if (type === 'backupCell') backupCellFile = file;
		}
	}

	function handleSave() {
		// TODO: Save call flow
		console.log('Save call flow');
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
						<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
							Drag a file to upload
						</p>
						<span class="font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#969696]">or</span>
						<div class="mt-4">
							<label class="inline-block">
								<input
									type="file"
									accept="audio/*"
									onchange={(e) => handleFileUpload(e, 'greeting')}
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
							<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
								Drag a file to upload
							</p>
							<span class="font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#969696]">or</span>
							<div class="mt-4">
								<label class="inline-block">
									<input
										type="file"
										accept="audio/*"
										onchange={(e) => handleFileUpload(e, 'allOnCall')}
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

				<!-- All representatives are currently unavailable -->
				<div class="space-y-2">
					<p class="font-['Poppins'] text-lg font-semibold leading-[21px] text-[#808080]">
						All representatives are currently unavailable (offline or no active forwarding number).
					</p>
					<div class="rounded border border-[#808080] bg-white p-4">
						<div class="rounded-[4px] border-2 border-dashed border-[#4F4F4F] bg-[#ECF3FF] p-8 text-center">
							<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
								Drag a file to upload
							</p>
							<span class="font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#969696]">or</span>
							<div class="mt-4">
								<label class="inline-block">
									<input
										type="file"
										accept="audio/*"
										onchange={(e) => handleFileUpload(e, 'unavailable')}
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
									<input
										type="text"
										bind:value={failoverKey}
										placeholder="Select Key"
										class="h-[45px] w-full rounded-[2px] border border-[#969696] bg-white px-3 font-['Poppins'] text-base font-normal leading-[19px] text-[rgba(128,128,128,0.47)] outline-none placeholder:text-[rgba(128,128,128,0.47)]"
									/>
								</div>
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
										<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
											Drag a file to upload
										</p>
										<span class="font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#969696]">or</span>
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
								<p class="mb-2 font-['Poppins'] text-base font-normal leading-[19px] text-[#969696]">
									Drag a file to upload
								</p>
								<span class="font-['Poppins'] text-[13px] font-normal leading-[15px] text-[#969696]">or</span>
								<div class="mt-4">
									<label class="inline-block">
										<input
											type="file"
											accept="audio/*"
											onchange={(e) => handleFileUpload(e, 'backupCell')}
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
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-3">
				<button
					onclick={handleBack}
					class="h-[39px] rounded-[3px] border-[0.5px] border-black bg-[#ECEFF3] px-4 font-['Poppins'] text-lg font-normal leading-[21px] text-[#757575] transition-colors hover:bg-[#E0E5EA]"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					class="h-[39px] rounded-[3px] border-[0.5px] border-[#577AB7] bg-[#577AB7] px-4 font-['Poppins'] text-lg font-medium leading-[21px] text-white transition-colors hover:bg-[#4a6ba5]"
				>
					Save
				</button>
			</div>
		</div>
	</div>
</div>
