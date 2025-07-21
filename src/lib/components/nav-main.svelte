<script lang="ts">
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import { Home, Users, ChartColumnBig, Smartphone, BookOpen, Settings, ChevronDown, ChevronUp, SquareSlash, Reply, Building, Phone, LayoutDashboard, MessageCircle, ChartLineIcon } from "lucide-svelte";
	import { page } from "$app/stores";
    import { Button } from "$lib/components/ui/button/index";
	import { slide } from "svelte/transition";
	const { user } = $props();
	let isCompany = $state(user?.company_id && user?.company_id !== '');

	let items = $state([
		{ title: "Dashboard", url: "/inbox", icon: LayoutDashboard, href: "/d" },
		{ title: "Communication Hub", url: "/communication-hub", icon: MessageCircle, href: "/communication-hub" },
		{ title: "Inbox", url: "/inbox", icon: Home, href: "/" },
		{ title: "Contacts", url: "/contacts", icon: Users, href: "/contacts" },
		{ title: "Dialer", url: "/dialer", icon: Phone, href: "/dialer" },
		{ title: "Analytics", url: "/analytics", icon: ChartLineIcon, href: "/analytics" },
		{ title: "Settings", url: "/settings", icon: Settings, href: "/settings", 
			subItems: [
						{ title: "Leadbox", url: "/leadbox", icon: Smartphone, href: "/leadbox" },
		{ title: "Leadform", url: "/leadform", icon: BookOpen, href: "/leadform" },
				{ title: "Auto Replies", url: "/settings/auto-replies", icon: Reply, href: "/settings/auto-replies" },
				{ title: "Shortcuts", url: "/settings/shortcuts", icon: SquareSlash, href: "/settings/shortcuts" },
				...(isCompany ? [] : [{ title: "Create Company", url: "/create-company", icon: Building, href: "/create-company" }]),
				...(isCompany ? [{ title: "Company", url: "/settings/company", icon: Building, href: "/settings/company" }] : []),
			]
		 },
	]);

	const sidebar = useSidebar();
	let expanded = $state(false);
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		{#each items as mainItem (mainItem.title)}
			<Sidebar.MenuItem class="gap-4 !text-5xl">
				<a 
					href={mainItem.href}
					class="w-full"
					onclick={(e) => {
						if (mainItem.subItems) {
							e.preventDefault();
							e.stopPropagation();
							expanded = !expanded;
						}
					}}
				>
					<Sidebar.MenuButton 
						class="!py-7 flex items-center gap-3 hover:bg-primary-300 hover:text-white text-white font-medium w-full {$page.url.pathname === mainItem.href ? 'bg-primary-300 text-white' : ''}"
					>
						<mainItem.icon class="!w-6 !h-6" />
						{mainItem.title}
						{#if mainItem.subItems}
							<Button variant="ghost" class="ml-auto hover:bg-transparent hover:text-white">
								{#if expanded}
									<ChevronUp class="w-5 h-5 ml-auto" />
								{:else}
									<ChevronDown class="w-5 h-5 ml-auto" />
								{/if}
							</Button>
						{/if}
					</Sidebar.MenuButton>
				</a>
			</Sidebar.MenuItem>

			{#if mainItem.subItems && expanded}
			<div transition:slide>
				{#each mainItem.subItems as subItem}
				
						<Sidebar.MenuItem class="gap-4 !text-5xl" >
							<a href={subItem.href} class="w-full">
							<Sidebar.MenuButton class="!py-7 flex items-center gap-3 pl-14 hover:bg-primary-300 hover:text-white text-white font-medium w-full {$page.url.pathname === subItem.href ? 'bg-primary-300 text-white' : ''}">
								<!-- <subItem.icon class="!w-6 !h-6" /> -->
								{subItem.title}
							</Sidebar.MenuButton>
							</a>
						</Sidebar.MenuItem>
					
				{/each}
				</div>
			{/if}
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
