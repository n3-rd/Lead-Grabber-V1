<script lang="ts">
	import { Search, Mic, MoreVertical, Pencil, Trash2 } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { filterContacts } from '$lib/utils/contacts';
	import { enhance } from '$app/forms';

	let { data } = $props();
	let searchQuery = $state("");

	const profiles = $derived(data.profiles || []);

	const filteredProfiles = $derived(filterContacts(profiles, searchQuery));

	function handleProfileClick(profile: any) {
		goto(`/profiles/${profile.id}`);
	}

	async function handleDelete(profileId: string, e: Event) {
		e.stopPropagation();
		if (!confirm('Are you sure you want to delete this profile?')) {
			return;
		}

		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/deleteProfile';
		
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'profileId';
		input.value = profileId;
		form.appendChild(input);
		
		document.body.appendChild(form);
		await enhance(() => ({ result: { type: 'success' } }), { form });
		form.submit();
		document.body.removeChild(form);
	}
</script>

<!-- Profile List View -->
	<div class="w-full p-4 min-w-0">
		<!-- Title -->
		<h1 class="font-sans font-semibold text-xl leading-[1.29] text-[#747474] mb-5">
			Profile
		</h1>

		<!-- Search Bar -->
		<div class="max-w-lg h-10 bg-white rounded flex items-center px-4 gap-3 mb-5">
			<Search class="w-4.5 h-4.5 text-[#577AB7]" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search"
				class="flex-1 outline-none font-sans font-normal text-base leading-[1.29] text-[rgba(120,120,120,0.54)] placeholder:text-[rgba(120,120,120,0.54)]"
			/>
			<Mic class="w-4 h-4.5 text-[#577AB7]" />
			<button class="w-4 h-4 text-[#848484] hover:text-[#555555] transition-colors">
				<MoreVertical class="w-4 h-4" />
			</button>
		</div>

		<!-- Table -->
		<div class="bg-white rounded-lg overflow-hidden">
			<!-- Table Header -->
			<div class="h-12 bg-white rounded-t-lg flex items-center px-4 border-b border-[#BEBEBE]">
				<div class="w-[200px] font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656]">
					Name
				</div>
				<div class="w-[200px] font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656]">
					Phone
				</div>
				<div class="flex-1 font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656]">
					Email
				</div>
				<div class="w-[150px] font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656] text-right">
					Actions
				</div>
			</div>

			<!-- Table Body -->
			<div class="overflow-y-auto">
				{#each filteredProfiles as profile, index}
					<div
						role="button"
						tabindex="0"
						class="h-12 bg-[#FFFEFE] border-b border-[#BEBEBE] flex items-center px-4 cursor-pointer hover:bg-[#f5f5f5] transition-colors {index === filteredProfiles.length - 1 ? 'rounded-b-lg border-b-0' : ''}"
						onclick={() => handleProfileClick(profile)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProfileClick(profile); }}}
					>
						<div class="w-[200px] font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							{profile.name}
						</div>
						<div class="w-[200px] font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							{profile.phone}
						</div>
						<div class="flex-1 font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							{profile.email}
						</div>
						<div class="w-[150px] flex items-center justify-end gap-3">
							<button 
								class="w-4.5 h-4.5 text-[#7B7B7B] hover:text-[#555555] transition-colors" 
								aria-label="Edit"
								onclick={(e) => e.stopPropagation()}
							>
								<Pencil class="w-4.5 h-4.5" />
							</button>
							<button 
								class="w-5 h-5 text-red-500 hover:text-red-700 transition-colors" 
								aria-label="Delete"
								onclick={(e) => handleDelete(profile.id, e)}
							>
								<Trash2 class="w-5 h-5" />
							</button>
							<button 
								class="w-4.5 h-4.5 text-[#848484] hover:text-[#555555] transition-colors" 
								aria-label="More"
								onclick={(e) => e.stopPropagation()}
							>
								<MoreVertical class="w-4.5 h-4.5" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
