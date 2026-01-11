<script lang="ts">
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import { Home, Users, ChartColumnBig, Smartphone, BookOpen, Settings, ChevronDown, ChevronUp, SquareSlash, Reply, Building, Phone, LayoutDashboard, MessageCircle, ChartLineIcon, FileText, Bell, UserCircle, ShoppingCart, Headphones, UserCheck, MapPin } from "lucide-svelte";
	import { page } from "$app/stores";
    import { Button } from "$lib/components/ui/button/index";
	import { slide } from "svelte/transition";
	const { user } = $props();
	let isCompany = $state(user?.company_id && user?.company_id !== '');

	let items = $state([
		{ title: "Dashboard", url: "/inbox", icon: LayoutDashboard, href: "/" },
		{ title: "Communication Log", url: "/communication-hub", icon: FileText, href: "/communication-hub" },
		{ title: "Communication Hub", url: "/communication-hub", icon: MessageCircle, href: "/communication-hub" },
		{ title: "Important Notifications", url: "/notifications", icon: Bell, href: "/notifications" },
		{ title: "Inbox", url: "/inbox", icon: Home, href: "/inbox" },
		{ title: "Profiles", url: "/profiles", icon: UserCircle, href: "/profiles" },
		{ title: "Contacts", url: "/contacts", icon: Users, href: "/contacts" },
		{ title: "Dialer", url: "/dialer", icon: Phone, href: "/dialer" },
		{ title: "Buy Number", url: "/buy-number", icon: ShoppingCart, href: "/buy-number" },
		{ title: "IVR", url: "/ivr", icon: Headphones, href: "/ivr" },
		{ title: "Representatives", url: "/representatives", icon: UserCheck, href: "/representatives" },
		{ title: "Locations", url: "/locations", icon: MapPin, href: "/locations" },
		{ title: "Analytics", url: "/analytics", icon: ChartLineIcon, href: "/analytics" },
		{ title: "Settings", url: "/settings", icon: Settings, href: "/settings", 
			subItems: [
				{ title: "Lead Box", url: "/leadbox", icon: Smartphone, href: "/leadbox" },
				{ title: "Lead Form", url: "/leadform", icon: BookOpen, href: "/leadform" },
				{ title: "Auto Replies", url: "/settings/auto-replies", icon: Reply, href: "/settings/auto-replies" },
				{ title: "Shortcuts", url: "/settings/shortcuts", icon: SquareSlash, href: "/settings/shortcuts" },
				...(isCompany ? [] : [{ title: "Create Company", url: "/create-company", icon: Building, href: "/create-company" }]),
				...(isCompany ? [{ title: "Company", url: "/settings/company", icon: Building, href: "/settings/company" }] : []),
				{ title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen, href: "/knowledge-base" },
			]
		 },
	]);

	const sidebar = useSidebar();
	let expanded = $state(false);
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		{#each items as mainItem (mainItem.title)}
			<Sidebar.MenuItem class="gap-4">
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
						class="hover:bg-primary-300 hover:text-white text-white font-medium {$page.url.pathname === mainItem.href ? 'bg-primary-300 text-white' : ''}"
						isActive={$page.url.pathname === mainItem.href}
					>
						{#snippet tooltipContent()}
							{mainItem.title}
						{/snippet}
						<mainItem.icon class="w-5 h-5" />
						<span class="group-data-[collapsible=icon]:hidden">{mainItem.title}</span>
						{#if mainItem.subItems}
							<Button variant="ghost" class="ml-auto hover:bg-transparent hover:text-white group-data-[collapsible=icon]:hidden">
								{#if expanded}
									<ChevronUp class="w-5 h-5" />
								{:else}
									<ChevronDown class="w-5 h-5" />
								{/if}
							</Button>
						{/if}
					</Sidebar.MenuButton>
				</a>
			</Sidebar.MenuItem>

			{#if mainItem.subItems && expanded}
			<div transition:slide class="group-data-[collapsible=icon]:hidden">
				{#each mainItem.subItems as subItem}
					<Sidebar.MenuItem>
						<a href={subItem.href} class="w-full">
							<Sidebar.MenuButton 
								class="pl-14 hover:bg-primary-300 hover:text-white text-white font-medium {$page.url.pathname === subItem.href ? 'bg-primary-300 text-white' : ''}"
								isActive={$page.url.pathname === subItem.href}
							>
								<span>{subItem.title}</span>
							</Sidebar.MenuButton>
						</a>
					</Sidebar.MenuItem>
				{/each}
			</div>
			{/if}
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
