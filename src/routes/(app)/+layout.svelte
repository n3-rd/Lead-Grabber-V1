<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index';
	import Button from '@//components/ui/button/button.svelte';
	import Separator from '@//components/ui/separator/separator.svelte';
	import { pb } from '@//pocketbase';
	import { Bell, LogOut } from 'lucide-svelte';
	import { requestNotificationPermission } from '$lib/utils/browser-notifications';

	let { data } = $props();
	let { user } = data;

	onMount(() => {
		requestNotificationPermission();
	});

	function handleLogout() {
		pb.authStore.clear();
		goto('/login');
	}

	// Dynamically import heavy components
	const AppSidebar = browser
		? import('$lib/components/app-sidebar.svelte').then((m) => m.default)
		: null;
</script>

<Sidebar.Provider class="!h-full !flex-1 !min-h-0">
	{#await AppSidebar then Sidebar}
		{#if Sidebar}
			<svelte:component this={Sidebar} {user} />
		{/if}
	{/await}

	<Sidebar.Inset class="min-w-0 flex flex-col !h-full !min-h-0 overflow-hidden">
		<div class="bg-background px-4 overflow-x-auto min-w-0 flex-1 flex flex-col min-h-0">
			<div class="flex items-center gap-4 mb-4 pt-4 flex-shrink-0">
				<Sidebar.Trigger />
			</div>
			<div class="flex w-full justify-between bg-white px-9 py-5 flex-shrink-0">
				<div class="flex items-center gap-4">
					<img src="/img/profile.png" alt="" class="profile h-12 w-12" />
					<div class="flex-col">
						<h2 class="text-lg font-semibold">Good Morning, {user?.name || 'User'}!</h2>
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
			<div class="flex-1 overflow-y-auto min-h-0">
				<slot />
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<style>
	main {
		@apply bg-root-background;
	}
	
	:global(.root-layout > *),
	:global([data-sidebar="sidebar"]) {
		height: 100% !important;
		min-height: 0 !important;
	}
	
	:global([data-sidebar="inset"]) {
		height: 100% !important;
		min-height: 0 !important;
		display: flex !important;
		flex-direction: column !important;
		overflow: hidden !important;
	}
</style>
