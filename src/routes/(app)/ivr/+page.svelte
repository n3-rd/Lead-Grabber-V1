<script lang="ts">
	import { goto } from '$app/navigation';
	import { Eye, Pencil, Trash2 } from 'lucide-svelte';

	// Mock data for call flows
	const callFlows = [
		{
			id: '1',
			title: 'Business Hours Call Flow',
			ruleName: 'Weekdays — use this flow',
			schedule: 'Monday 9:00pm → Friday 5:00am'
		},
		{
			id: '2',
			title: 'Business Hours Call Flow',
			ruleName: 'Weekend— use this flow',
			schedule: 'Afterhours and Weekends'
		},
		{
			id: '3',
			title: 'Custom Call Flow',
			ruleName: 'Christmas day - Holiday',
			schedule: 'December 25, 2026'
		}
	];

	function handleCreate() {
		goto('/ivr/create');
	}

	function handleView(id: string) {
		goto(`/ivr/${id}`);
	}

	function handleEdit(id: string) {
		goto(`/ivr/${id}/edit`);
	}

	function handleDelete(id: string) {
		// TODO: Implement delete
		console.log('Delete:', id);
	}
</script>

<div class="min-h-screen bg-[#ECEFF3] p-4">
	<!-- Main Content Card -->
	<div class="mx-auto max-w-[1370px] rounded-lg bg-white p-6">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<h1 class="font-['Poppins'] text-2xl font-bold leading-[28px] text-[#777777]">
				Call Flow List
			</h1>
			<button
				onclick={handleCreate}
				class="h-[37px] w-[193px] rounded-[4px] border border-[#577AB7] bg-[#577AB7] font-['Poppins'] text-base font-semibold leading-[19px] text-white transition-colors hover:bg-[#4a6ba5]"
			>
				Create new Call flow
			</button>
		</div>

		<!-- Call Flow Cards -->
		{#if callFlows.length === 0}
			<!-- Empty State -->
			<div class="flex min-h-[400px] items-center justify-center">
				<div class="text-center">
					<div class="mb-6 rounded-lg border border-[#C3C3C3] bg-[rgba(236,239,243,0.74)] p-12 shadow-[0px_0px_4px_rgba(0,0,0,0.25)]">
						<h2 class="mb-2 font-['Poppins'] text-2xl font-semibold leading-[28px] text-[#808080]">
							No Call Flows Yet
						</h2>
						<p class="mb-6 font-['Poppins'] text-lg font-light leading-[21px] text-[#808080]">
							Start by creating your own call flow and set up your rules.
						</p>
						<button
							onclick={handleCreate}
							class="h-[45px] rounded-[4px] bg-[#577AB7] px-4 font-['Poppins'] text-base font-semibold leading-[19px] text-white transition-colors hover:bg-[#4a6ba5]"
						>
							Create new Call flow
						</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each callFlows as flow}
					<div class="rounded-xl bg-[#f1f4f8] p-6 shadow-[0_2px_4px_rgba(0,0,0,0.05)] flex flex-col">
						<h2 class="mb-5 font-['Poppins'] text-[1.75rem] font-semibold leading-normal text-[#666]">
							{flow.title}
						</h2>

						<div class="mb-6 flex flex-wrap gap-2 leading-[1.4]">
							<span class="font-['Poppins'] text-[1.2rem] font-bold text-[#5c7cb8]">
								Active rule:
							</span>
							<span class="font-['Poppins'] text-[1.2rem] italic text-[#777]">
								{flow.ruleName}
								<span class="not-italic">({flow.schedule})</span>
							</span>
						</div>

						<div class="mt-auto flex gap-3">
							<button
								onclick={() => handleView(flow.id)}
								class="rounded px-5 py-1.5 font-['Poppins'] text-base font-semibold text-white transition-opacity hover:opacity-90"
								style="background-color: #6384c1;"
							>
								View Full Details
							</button>
							<button
								onclick={() => handleEdit(flow.id)}
								class="rounded px-5 py-1.5 font-['Poppins'] text-base font-semibold text-white transition-opacity hover:opacity-90"
								style="background-color: #6384c1;"
							>
								Edit
							</button>
							<button
								onclick={() => handleDelete(flow.id)}
								class="rounded px-5 py-1.5 font-['Poppins'] text-base font-semibold text-white transition-opacity hover:opacity-90"
								style="background-color: #d65b5b;"
							>
								Delete
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
