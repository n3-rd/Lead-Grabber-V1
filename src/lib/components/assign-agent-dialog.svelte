<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index";
	import { X } from "lucide-svelte";

	interface Props {
		open?: boolean;
		endpointName?: string;
		agents?: string[];
		onAssign?: (selectedAgents: string[]) => void;
	}

	let {
		open = $bindable(false),
		endpointName = "Kurt Ravioli Builder",
		agents = ["Marcus George", "Betty Mcgregor", "Gregory Malonzo", "Jared YU"],
		onAssign
	}: Props = $props();

	let selectedAgents = $state<Set<string>>(new Set());

	function toggleAgent(agent: string) {
		if (selectedAgents.has(agent)) {
			selectedAgents.delete(agent);
		} else {
			selectedAgents.add(agent);
		}
		selectedAgents = new Set(selectedAgents);
	}

	function handleSelect() {
		if (onAssign) {
			onAssign(Array.from(selectedAgents));
		}
		open = false;
		selectedAgents = new Set();
	}

	function handleCancel() {
		open = false;
		selectedAgents = new Set();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="!w-[462px] !h-[290px] !p-0 bg-white rounded-[3px] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] [&>button]:hidden"
	>
		<div class="w-full h-full p-6 flex flex-col relative">
			<!-- Close Button -->
			<button
				class="absolute top-4 right-4 w-[17px] h-[17px] text-[#717171] hover:text-[#3D3D3D] transition-colors"
				onclick={() => open = false}
				aria-label="Close"
			>
				<X class="w-[17px] h-[17px]" />
			</button>

			<!-- Title -->
			<h2
				class="font-['Poppins'] font-semibold text-xl leading-[24px] text-[#717171] mb-4"
			>
				Assigning {endpointName} to:
			</h2>

			<!-- All Sales Agents Label -->
			<p
				class="font-['Poppins'] font-medium italic text-base leading-[19px] text-[#577AB7] mb-3"
			>
				All Sales Agents:
			</p>

			<!-- Agent List -->
			<div class="flex-1 overflow-y-auto min-h-0 mb-4">
				<div class="flex flex-col gap-3">
					{#each agents as agent}
						<label
							class="flex items-center gap-3 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={selectedAgents.has(agent)}
								onchange={() => toggleAgent(agent)}
								class="w-[21px] h-[21px] border-[1.4px] border-[#717171] rounded-[2px] cursor-pointer accent-[#577AB7]"
							/>
							<span
								class="font-['Poppins'] font-medium text-[17px] leading-[21px] text-[#717171]"
							>
								{agent}
							</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex items-center justify-end gap-3 flex-shrink-0">
				<button
					class="w-[77px] h-[33px] bg-white border border-[#577AB7] rounded-[4px] flex items-center justify-center font-['Poppins'] font-medium text-base leading-[19px] text-[#577AB7] hover:bg-gray-50 transition-colors"
					onclick={handleCancel}
				>
					Cancel
				</button>
				<button
					class="w-[123px] h-[33px] bg-[#577AB7] rounded-[4px] flex items-center justify-center font-['Poppins'] font-medium text-base leading-[19px] text-white hover:bg-[#577AB7]/90 transition-colors"
					onclick={handleSelect}
				>
					Select Agent
				</button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
