<script lang="ts">
	import { Search, Mic, MoreVertical, Pencil, Trash2 } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { invalidateAll } from "$app/navigation";
	import { filterContacts } from '$lib/utils/contacts-filter';
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { toast } from "svelte-sonner";

	let { data } = $props();
	let searchQuery = $state("");

	const profiles = $derived(data.profiles || []);
	const filteredProfiles = $derived(filterContacts(profiles, searchQuery));

	let showEditDialog = $state(false);
	let editingProfile = $state({ id: '', name: '', email: '', phone: '' });

	function handleProfileClick(profile: { id: string }) {
		goto(`/profiles/${profile.id}`);
	}

	function handleEditProfile(profile: { id: string; name?: string | null; email?: string | null; phone?: string | null }, e: Event) {
		e.stopPropagation();
		editingProfile = {
			id: profile.id,
			name: profile.name ?? '',
			email: profile.email ?? '',
			phone: profile.phone ?? '',
		};
		showEditDialog = true;
	}

	async function handleUpdateProfile() {
		const form = new FormData();
		form.set('profileId', editingProfile.id);
		form.set('name', editingProfile.name);
		form.set('email', editingProfile.email);
		form.set('phone', editingProfile.phone);
		const res = await fetch('?/updateProfile', { method: 'POST', body: form });
		if (res.ok) {
			showEditDialog = false;
			toast.success('Profile updated');
			await invalidateAll();
		} else {
			toast.error('Failed to update profile');
		}
	}

	async function handleDelete(profileId: string, e: Event) {
		e.stopPropagation();
		if (!confirm('Are you sure you want to delete this profile?')) return;
		const form = new FormData();
		form.set('profileId', profileId);
		const res = await fetch('?/deleteProfile', { method: 'POST', body: form });
		if (res.ok) {
			toast.success('Profile deleted');
			await invalidateAll();
		} else {
			toast.error('Failed to delete profile');
		}
	}
</script>

<div class="w-full p-4 min-w-0">
	<h1 class="font-sans font-semibold text-xl leading-[1.29] text-[#747474] mb-5">Profiles</h1>

	<div class="max-w-lg h-10 bg-white rounded flex items-center px-4 gap-3 mb-5">
		<Search class="w-4.5 h-4.5 text-[#577AB7]" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search"
			class="flex-1 outline-none font-sans font-normal text-base leading-[1.29] text-[rgba(120,120,120,0.54)] placeholder:text-[rgba(120,120,120,0.54)]"
		/>
		<Mic class="w-4 h-4.5 text-[#577AB7]" />
		<button type="button" class="w-4 h-4 text-[#848484] hover:text-[#555555] transition-colors" aria-label="More">
			<MoreVertical class="w-4 h-4" />
		</button>
	</div>

	<div class="bg-white rounded-lg overflow-hidden">
		<div class="h-12 bg-white rounded-t-lg flex items-center px-4 border-b border-[#BEBEBE]">
			<div class="w-[200px] font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656]">Name</div>
			<div class="w-[200px] font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656]">Phone</div>
			<div class="flex-1 font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656]">Email</div>
			<div class="w-[150px] font-sans font-medium text-base leading-[1.29] tracking-normal text-[#565656] text-right">Actions</div>
		</div>

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
						{profile.name ?? '—'}
					</div>
					<div class="w-[200px] font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
						{profile.phone ?? '—'}
					</div>
					<div class="flex-1 font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
						{profile.email ?? '—'}
					</div>
					<div class="w-[150px] flex items-center justify-end gap-3">
						<button
							type="button"
							class="w-4.5 h-4.5 text-[#7B7B7B] hover:text-[#555555] transition-colors"
							aria-label="Edit"
							onclick={(e) => handleEditProfile(profile, e)}
						>
							<Pencil class="w-4.5 h-4.5" />
						</button>
						<button
							type="button"
							class="w-5 h-5 text-red-500 hover:text-red-700 transition-colors"
							aria-label="Delete"
							onclick={(e) => handleDelete(profile.id, e)}
						>
							<Trash2 class="w-5 h-5" />
						</button>
						<button type="button" class="w-4.5 h-4.5 text-[#848484] hover:text-[#555555] transition-colors" aria-label="More" onclick={(e) => e.stopPropagation()}>
							<MoreVertical class="w-4.5 h-4.5" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Edit Profile</Dialog.Title>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="edit-name">Name</Label>
				<Input id="edit-name" bind:value={editingProfile.name} />
			</div>
			<div class="grid gap-2">
				<Label for="edit-email">Email</Label>
				<Input id="edit-email" type="email" bind:value={editingProfile.email} />
			</div>
			<div class="grid gap-2">
				<Label for="edit-phone">Phone</Label>
				<Input id="edit-phone" type="tel" bind:value={editingProfile.phone} />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showEditDialog = false)}>Cancel</Button>
			<Button onclick={handleUpdateProfile}>Save changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
