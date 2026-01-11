<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import * as Sidebar from '$lib/components/ui/sidebar/index';
	import Button from '@//components/ui/button/button.svelte';
	import Separator from '@//components/ui/separator/separator.svelte';
	import { pb } from '@//pocketbase';
	import { Bell, LogOut } from 'lucide-svelte';

	let { data } = $props();
	let { user } = data;

		function handleLogout() {
		pb.authStore.clear();
		goto('/login');
	}

	// Dynamically import heavy components
	const AppSidebar = browser
		? import('$lib/components/app-sidebar.svelte').then((m) => m.default)
		: null;
</script>

<Sidebar.Provider>
	{#await AppSidebar then Sidebar}
		{#if Sidebar}
			<svelte:component this={Sidebar} {user} />
		{/if}
	{/await}

	<Sidebar.Inset>
		<main class="bg-background px-4">
			<div class="flex items-center gap-4 mb-4 pt-4">
				<Sidebar.Trigger />
			</div>
			<div class="flex w-full justify-between bg-white px-9 py-5">
				<div class="flex items-center gap-4">
					<img src="/img/profile.png" alt="" class="profile h-12 w-12" />
					<div class="flex-col">
						<h2 class="text-lg font-semibold">Good Morning, {user.name}!</h2>
						<p class="text-sm text-gray-500">Simplify how you manage calls and messages.</p>
					</div>
				</div>

				<div class="flex items-center gap-5">
					<Bell class="h-6 w-6 cursor-pointer text-gray-500 transition-colors hover:text-primary" />
					<Separator orientation="vertical" />
					<Button class="rounded-xl bg-root-background text-foreground"
					onclick={()=>{
						handleLogout()
					}}
					>
						Logout
						<LogOut />
					</Button>
				</div>
			</div>
			<slot />
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>

<style>
	main {
		@apply bg-root-background;
	}
</style>
