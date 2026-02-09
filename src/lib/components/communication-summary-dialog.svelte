<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index";

	interface Props {
		open?: boolean;
		commId?: string;
		date?: string;
		time?: string;
		category?: string;
		subCategory?: string;
		email?: string;
		subject?: string;
		body?: string;
		summary?: string;
		tasks?: string[];
		/** For voice: phone number shown as source */
		sourceLabel?: string;
		/** For voice: call recording playback URL (mp3/m4a from metadata.recording_urls) */
		recordingUrl?: string | null;
	}

	let {
		open = $bindable(false),
		commId = "001234",
		date = "06-01-25",
		time = "02:12:03",
		category = "Sales",
		subCategory = "Inquiry",
		email = "sarahlee@gmail.com",
		subject = "Book Appointment time",
		body = "",
		summary = "Sarah wants an appointment to test drive the Ford 150 2026. between 2:00 and 3:30 on Friday Dec 12th.",
		tasks = [],
		sourceLabel = "Email Address",
		recordingUrl = null
	}: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="!w-[605px] !h-[567px] !p-0 bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] [&>button]:hidden overflow-hidden"
	>
		<div class="relative w-full h-full p-6 flex flex-col overflow-hidden">
			<!-- Header Section -->
			<div class="flex items-start justify-between mb-4">
				<!-- Left side: AI Summary and Date/Time -->
				<div class="flex items-center gap-2">
					<span
						class="font-sans font-semibold text-base leading-[1.29] text-[rgba(86,86,86,0.94)]"
					>
						AI Summary:
					</span>
					<span
						class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.78)]"
					>
						{date} | {time}
					</span>
				</div>

				<!-- Right side: Comm ID, Category, Sub-Category -->
				<div class="flex flex-col items-end gap-1">
					<span
						class="font-sans font-medium text-base leading-[1.29] text-[rgba(86,86,86,0.78)]"
					>
						Comm ID - {commId}
					</span>
					<span
						class="font-sans font-medium text-base leading-[1.29] text-[rgba(86,86,86,0.88)]"
					>
						Category: {category}
					</span>
					<span
						class="font-sans font-medium text-base leading-[1.29] text-right text-[rgba(86,86,86,0.88)]"
					>
						Sub-Category: {subCategory}
					</span>
				</div>
			</div>

			<!-- Main Content Area -->
			<div
				class="flex-1 min-h-0 bg-[#F7F7F7] rounded border-b border-[#BEBEBE] p-4 flex flex-col gap-4 overflow-y-auto"
			>
				<!-- Summary Heading -->
				<span
					class="font-sans font-semibold text-base leading-[1.29] text-[rgba(86,86,86,0.88)]"
				>
					Summary:
				</span>

				<!-- Inner White Box -->
				<div class="bg-[#FFFDFD] rounded p-4 flex flex-col gap-3 min-h-0 overflow-y-auto">
					<!-- Email, Subject, Body Labels and Values -->
					<div class="flex flex-col gap-2">
						<div class="flex items-start gap-4">
							<span
								class="font-sans font-normal text-[15px] leading-[141%] text-[rgba(86,86,86,0.78)] whitespace-nowrap flex-shrink-0"
							>
								{sourceLabel}:
							</span>
							<span
								class="font-sans font-medium text-[15px] leading-[141%] text-[rgba(86,86,86,0.78)] break-words min-w-0"
							>
								{email}
							</span>
						</div>
						{#if recordingUrl}
							<div class="flex flex-col gap-1">
								<span
									class="font-sans font-normal text-[15px] leading-[141%] text-[rgba(86,86,86,0.78)] whitespace-nowrap flex-shrink-0"
								>
									Call recording:
								</span>
								<audio
									controls
									class="w-full max-w-sm h-9"
									src={recordingUrl}
									preload="metadata"
								>
									Your browser does not support the audio element.
								</audio>
							</div>
						{/if}
						<div class="flex items-start gap-4">
							<span
								class="font-sans font-normal text-[15px] leading-[141%] text-[rgba(86,86,86,0.78)] whitespace-nowrap flex-shrink-0"
							>
								Subject Line:
							</span>
							<span
								class="font-sans font-medium text-[15px] leading-[141%] text-[rgba(86,86,86,0.78)] break-words min-w-0"
							>
								{subject}
							</span>
						</div>
						{#if body}
							<div class="flex items-start gap-4">
								<span
									class="font-sans font-normal text-[15px] leading-[141%] text-[rgba(86,86,86,0.78)] whitespace-nowrap flex-shrink-0"
								>
									Body:
								</span>
								<span
									class="font-sans font-normal text-[15px] leading-[141%] text-[rgba(86,86,86,0.78)] break-words min-w-0"
								>
									{body}
								</span>
							</div>
						{/if}
					</div>

					<!-- Summary Text -->
					<div class="flex flex-col gap-1">
						<span
							class="font-sans font-medium text-[15px] leading-[141%] text-[#797979]"
						>
							Summary
						</span>
						<p
							class="font-sans font-normal text-xs leading-[141%] text-[rgba(86,86,86,0.78)] break-words whitespace-pre-wrap"
						>
							{summary}
						</p>
					</div>

					<!-- Separator Line -->
					<div class="w-full h-px bg-[#979797] my-1"></div>

					<!-- Tasks to Complete -->
					<div class="flex flex-col gap-2">
						<span
							class="font-sans font-semibold text-[15px] leading-[141%] text-[#797979]"
						>
							Tasks to complete
						</span>
						<ul class="flex flex-col gap-1 list-disc list-inside">
							{#each tasks as task}
								<li
									class="font-sans font-normal text-xs leading-[141%] text-[#7B7B7B]"
								>
									{task}
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>

			<!-- Footer: Close Button -->
			<div class="flex justify-end mt-4 flex-shrink-0">
				<Dialog.Close>
					<button
						class="w-[85px] h-[33px] bg-[#577AB7] rounded flex items-center justify-center font-sans font-medium text-lg leading-[141%] text-white hover:bg-[#577AB7]/90 transition-colors"
					>
						Close
					</button>
				</Dialog.Close>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
