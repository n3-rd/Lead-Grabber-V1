<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index';
	import { Button } from '$lib/components/ui/button/index';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Bell, LogOut } from 'lucide-svelte';
	import { requestNotificationPermission } from '$lib/utils/browser-notifications';

	let { data } = $props();
	let { user } = data;
	const isCommunicationLog = $derived($page.url.pathname === '/communication-log');

	onMount(() => {
		requestNotificationPermission();
	});

	function handleLogout() {
		goto('/logout');
	}

	// Dynamically import heavy components
	const AppSidebar = browser
		? import('$lib/components/app-sidebar.svelte').then((m) => m.default)
		: null;
</script>

<Sidebar.Provider class="!h-full !min-h-0 !flex-1">
	{#await AppSidebar then Sidebar}
		{#if Sidebar}
			<svelte:component this={Sidebar} {user} />
		{/if}
	{/await}

	<Sidebar.Inset class="flex !h-full !min-h-0 min-w-0 flex-col overflow-hidden">
		<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto bg-background px-4">
			<div class="mb-4 flex flex-shrink-0 items-center gap-4 pt-4">
				<Sidebar.Trigger />
			</div>
			{#if !isCommunicationLog}
				<div class="flex w-full flex-shrink-0 justify-between bg-white px-9 py-5">
					<div class="flex items-center gap-4">
						<img
							src={user?.avatar || '/img/profile.png'}
							alt=""
							class="profile h-12 w-12 rounded-full object-cover"
						/>
						<div class="flex-col">
							<h2 class="text-lg font-semibold">Good Morning, {user?.name || 'User'}!</h2>
							<p class="text-sm text-gray-500">Simplify how you manage calls and messages.</p>
						</div>
					</div>

					<div class="flex items-center gap-5">
						<Bell
							class="h-6 w-6 cursor-pointer text-gray-500 transition-colors hover:text-primary"
						/>
						<Separator orientation="vertical" />
						<Button
							class="rounded-xl bg-root-background text-foreground"
							onclick={() => {
								handleLogout();
							}}
						>
							Logout
							<LogOut />
						</Button>
					</div>
				</div>
			{/if}
			<div class="min-h-0 flex-1 overflow-y-auto">
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
	:global([data-sidebar='sidebar']) {
		height: 100% !important;
		min-height: 0 !important;
	}

	:global([data-sidebar='inset']) {
		height: 100% !important;
		min-height: 0 !important;
		display: flex !important;
		flex-direction: column !important;
		overflow: hidden !important;
	}
</style>
