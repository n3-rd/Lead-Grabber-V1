<script lang="ts">
	import { Search, Mic, MapPin, Mail, Phone, ChevronDown, X, SquarePen, MessageSquare, Globe, Facebook, Bot, FileText } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	interface Connection {
		id: string;
		name: string;
		address: string;
		landline: string;
		cell: string;
		email: string;
		smsPermission: boolean;
	}

	interface Profile {
		id: string;
		name: string;
		phone: string;
		email: string;
		address: string;
		landline: string;
		cell: string;
		smsPermission: boolean;
		connections: Connection[];
	}

	interface Communication {
		id: string;
		date: string;
		time: string;
		type: "email" | "sms" | "voice" | "web" | "facebook" | "chatbot" | "leadform";
		direction: "In" | "Out";
		source: string;
		endpoint: string;
		purpose: string | null;
		summary: string | null;
		commId: string | null;
		status: "red" | "green" | "blue";
	}

	interface CommSummary {
		commId: string;
		summaryLink: string;
	}

	// Mock profiles data - in real app, fetch from server using $page.params.id
	const profiles: Profile[] = [
		{
			id: "1",
			name: "George Washington",
			phone: "706-451-5344",
			email: "georgewas@email.com",
			address: "123 Pine St. Timmins P4N 6A2",
			landline: "706-231-3142",
			cell: "706-451-5344",
			smsPermission: false,
			connections: [
				{
					id: "conn1",
					name: "Peter Griffin",
					address: "123 Pine St. Timmins P4N 6A2",
					landline: "706-231-3142",
					cell: "706-451-5344",
					email: "georgewas@email.com",
					smsPermission: false
				}
			]
		},
		{
			id: "2",
			name: "Sarah Lee",
			phone: "705-4123-6346",
			email: "sarahlee@gmail.com",
			address: "456 Oak Ave. Toronto M5V 2K1",
			landline: "705-321-9876",
			cell: "705-4123-6346",
			smsPermission: true,
			connections: []
		},
		{
			id: "3",
			name: "Peter Griffin",
			phone: "705-6433-2564",
			email: "petergriffin@gmail.com",
			address: "31 Spooner St. Quahog RI 02907",
			landline: "705-555-0123",
			cell: "705-6433-2564",
			smsPermission: true,
			connections: []
		},
		{
			id: "4",
			name: "Michael Scofield",
			phone: "705-9755-1953",
			email: "michaelscofield@gmail.com",
			address: "789 Elm St. Chicago IL 60601",
			landline: "705-444-7890",
			cell: "705-9755-1953",
			smsPermission: true,
			connections: []
		},
		{
			id: "5",
			name: "Joe Swanson",
			phone: "705-9012-0124",
			email: "joeswanson@gmail.com",
			address: "33 Spooner St. Quahog RI 02907",
			landline: "705-555-0456",
			cell: "705-9012-0124",
			smsPermission: false,
			connections: []
		},
		{
			id: "6",
			name: "Adam West",
			phone: "705-7812-3321",
			email: "adamwest@gmail.com",
			address: "1 Mayor Lane, Quahog RI 02907",
			landline: "705-555-0789",
			cell: "705-7812-3321",
			smsPermission: true,
			connections: []
		}
	];

	const communications: Communication[] = [
		{ id: "1", date: "Dec 01 2024", time: "9:33 PM", type: "email", direction: "In", source: "markdoe@clear...", endpoint: "Sarah Lee", purpose: null, summary: null, commId: null, status: "red" },
		{ id: "2", date: "Dec 01 2024", time: "2:15 PM", type: "sms", direction: "Out", source: "Sarah Lee", endpoint: "705-4123-6346", purpose: "Follow-up", summary: "Summary", commId: "COM-00124", status: "green" },
		{ id: "3", date: "Nov 30 2024", time: "11:45 AM", type: "voice", direction: "In", source: "Unknown", endpoint: "705-4123-6346", purpose: "Sales | Inquiry", summary: "Summary", commId: "COM-00125", status: "blue" },
		{ id: "4", date: "Nov 30 2024", time: "10:22 AM", type: "email", direction: "Out", source: "sarahlee@gmail.com", endpoint: "johnlee@clearsky.c...", purpose: "Sales | Inquiry", summary: "Summary", commId: "COM-00126", status: "green" },
		{ id: "5", date: "Nov 29 2024", time: "4:08 PM", type: "web", direction: "In", source: "Website Form", endpoint: "Contact Form", purpose: "Support | Issue", summary: "Summary", commId: "COM-00127", status: "red" },
		{ id: "6", date: "Nov 29 2024", time: "1:30 PM", type: "facebook", direction: "In", source: "Facebook Messenger", endpoint: "John Smith", purpose: "Marketing | Lead", summary: "Summary", commId: "COM-00128", status: "green" },
		{ id: "7", date: "Nov 28 2024", time: "3:45 PM", type: "chatbot", direction: "In", source: "Chatbot", endpoint: "Website Visitor", purpose: "Support | Question", summary: "Summary", commId: "COM-00129", status: "blue" },
		{ id: "8", date: "Nov 28 2024", time: "9:15 AM", type: "leadform", direction: "In", source: "Lead Form", endpoint: "New Lead", purpose: "Sales | Lead", summary: "Summary", commId: "COM-00130", status: "red" },
		{ id: "9", date: "Nov 27 2024", time: "5:20 PM", type: "sms", direction: "In", source: "705-4123-6346", endpoint: "Sarah Lee", purpose: "Confirm", summary: null, commId: "COM-00131", status: "green" },
		{ id: "10", date: "Nov 27 2024", time: "2:10 PM", type: "email", direction: "In", source: "markdoe@clear...", endpoint: "johnlee@clearsky.c...", purpose: "Sales | Inquiry", summary: "Summary", commId: "COM-00132", status: "blue" }
	];

	const commSummaries: CommSummary[] = [
		{ commId: "COM-00124", summaryLink: "Open Summary for COM- 000124" },
		{ commId: "COM-00125", summaryLink: "Open Summary for COM- 000125" },
		{ commId: "COM-00126", summaryLink: "Open Summary for COM- 000126" },
		{ commId: "COM-00127", summaryLink: "Open Summary for COM- 000127" },
		{ commId: "COM-00128", summaryLink: "Open Summary for COM- 000128" }
	];

	const filters = ["All", "Email", "SMS", "Voice", "Web", "Facebook", "Chatbot", "Leadform"];

	const profileId = $derived($page.params.id);
	const selectedProfile = $derived(profiles.find(p => p.id === profileId) || null);
	
	let commSearchQuery = $state("");
	let activeFilter = $state("All");
	let connectionsExpanded = $state(true);
	let selectedSummary = $state<Communication | null>(null);
	let openOptionsMenu = $state<string | null>(null);

	const filteredCommunications = $derived(
		communications.filter((comm) => {
			if (activeFilter === "All") return true;
			return comm.type.toLowerCase() === activeFilter.toLowerCase();
		})
	);

	function getStatusColor(status: string) {
		switch (status) {
			case "red": return "bg-[#FB2C36]";
			case "green": return "bg-[#00C951]";
			case "blue": return "bg-[#0077FE]";
			default: return "bg-[#4A4A4A]";
		}
	}

</script>

{#if selectedProfile}
	<!-- Profile Detail View -->
	<div class="w-full min-h-full flex" onclick={() => openOptionsMenu = null}>
		<!-- Left Sidebar -->
		<div class="w-[325px] min-w-[325px] bg-[#EDF2FA] border-r border-[#7E7E7E] p-6">
			<!-- Profile Name -->
			<h1 class="font-sans font-semibold text-3xl leading-[1.29] text-[#555555] mb-2">
				{selectedProfile.name}
			</h1>

			<!-- Address -->
			<div class="flex items-start gap-2 mb-4">
				<MapPin class="w-5 h-5 text-[#0F172A] mt-0.5 flex-shrink-0" />
				<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">
					{selectedProfile.address}
				</span>
			</div>

			<!-- Contact Info -->
			<div class="space-y-2 mb-4">
				<div class="flex items-center">
					<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Landline:</span>
					<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{selectedProfile.landline}</span>
				</div>
				<div class="flex items-center">
					<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Cell #:</span>
					<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{selectedProfile.cell}</span>
				</div>
				<div class="flex items-center">
					<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Email:</span>
					<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{selectedProfile.email}</span>
				</div>
			</div>

			<!-- SMS Permission -->
			<div class="flex items-center gap-2 mb-6">
				<div class="w-5 h-5 border border-[#7B2E17] rounded flex items-center justify-center {selectedProfile.smsPermission ? 'bg-[#7B2E17]' : 'bg-white'}">
					{#if selectedProfile.smsPermission}
						<svg class="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
							<path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{:else}
						<X class="w-3 h-3 text-[#7B2E17]" />
					{/if}
				</div>
				<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">Permission to send SMS</span>
			</div>

			<!-- Divider -->
			<div class="w-full h-px bg-[#565656] mb-4"></div>

			<!-- Connections -->
			<button
				class="flex items-center justify-between w-full mb-4"
				onclick={() => connectionsExpanded = !connectionsExpanded}
			>
				<span class="font-sans font-medium text-lg leading-[1.29] text-[#565656]">Connections</span>
				<ChevronDown class="w-4 h-3 text-[#565656] transition-transform {connectionsExpanded ? 'rotate-180' : ''}" />
			</button>

			{#if connectionsExpanded && selectedProfile.connections.length > 0}
				{#each selectedProfile.connections as connection}
					<div class="mb-4">
						<h3 class="font-sans font-semibold text-xl leading-[1.29] text-[#555555] mb-2">{connection.name}</h3>
						<div class="flex items-start gap-2 mb-2">
							<MapPin class="w-5 h-5 text-[#0F172A] mt-0.5 flex-shrink-0" />
							<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.address}</span>
						</div>
						<div class="space-y-1">
							<div class="flex items-center">
								<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Landline:</span>
								<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.landline}</span>
							</div>
							<div class="flex items-center">
								<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Cell #:</span>
								<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.cell}</span>
							</div>
							<div class="flex items-center">
								<span class="font-sans font-medium text-base leading-[1.29] text-[#565656] w-[82px]">Email:</span>
								<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">{connection.email}</span>
							</div>
						</div>
						<div class="flex items-center gap-2 mt-2">
							<div class="w-5 h-5 border border-[#7B2E17] rounded flex items-center justify-center {connection.smsPermission ? 'bg-[#7B2E17]' : 'bg-white'}">
								{#if connection.smsPermission}
									<svg class="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
										<path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								{:else}
									<X class="w-3 h-3 text-[#7B2E17]" />
								{/if}
							</div>
							<span class="font-sans font-normal text-base leading-[1.29] text-[rgba(86,86,86,0.8)]">Permission to send SMS</span>
						</div>
					</div>
				{/each}
			{/if}

			<!-- Edit | Add -->
			<div class="text-right mb-4">
				<span class="font-sans font-normal text-lg leading-[1.29] text-[#565656] underline cursor-pointer hover:text-[#333]">Edit</span>
				<span class="font-sans font-normal text-lg leading-[1.29] text-[#565656]"> | </span>
				<span class="font-sans font-normal text-lg leading-[1.29] text-[#565656] underline cursor-pointer hover:text-[#333]">Add</span>
			</div>

			<!-- Divider -->
			<div class="w-full h-px bg-[#565656] mb-4"></div>

			<!-- Playbook Results -->
			<h3 class="font-sans font-semibold text-base leading-[21px] text-[#555555] mb-3">Playbook Results</h3>
			<div class="space-y-1 mb-4">
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Results</p>
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Top[ of Funnel</p>
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Mid-funnel (sales outcomes)</p>
				<p class="font-sans font-normal text-base leading-[21px] text-[#747577]">Bottom-of-funnel (business outcomes</p>
			</div>

			<!-- Playbook Engine Placeholder -->
			<div class="w-full h-[230px] bg-[#949494] rounded flex items-center justify-center">
				<span class="font-sans font-normal text-base leading-[21px] text-white">Playbook Engine</span>
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 p-6 bg-white">
			<!-- Back button -->
			<button
				onclick={() => goto('/profiles')}
				class="mb-4 text-[#577AB7] hover:text-[#3d5a8a] font-sans text-sm flex items-center gap-1"
			>
				← Back to Profiles
			</button>

			<!-- Top Section: Latest Comm ID & Action Buttons -->
			<div class="flex gap-6 mb-6 w-fit">
				<!-- Latest Comm ID Card -->
				<div class="w-[870px] bg-white rounded-lg shadow-[0px_0px_4px_rgba(0,0,0,0.41)] p-6">
					<h2 class="font-sans font-semibold text-base leading-[21px] text-[#555555] mb-4">Latest Comm ID</h2>
					<div class="flex gap-24">
						<div>
							<h4 class="font-sans font-semibold text-xs leading-[1.29] text-[#555555] mb-3">COMM ID</h4>
							<div class="space-y-3">
								{#each commSummaries as summary}
									<p class="font-sans font-normal text-sm leading-[1.29] text-[#555555]">{summary.commId}</p>
								{/each}
							</div>
						</div>
						<div>
							<h4 class="font-sans font-semibold text-xs leading-[1.29] text-[#555555] mb-3">SUMMARY</h4>
							<div class="space-y-3">
								{#each commSummaries as summary}
									<p class="font-sans font-normal text-sm leading-[1.29] text-[#0023D7] underline cursor-pointer hover:text-[#001ba3]">{summary.summaryLink}</p>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Action Buttons Card -->
				<div class="w-[391px] bg-white rounded-lg shadow-[0px_0px_4px_rgba(0,0,0,0.25)] p-4">
					<div class="grid grid-cols-2 gap-3">
						<button class="h-[63px] bg-[#577AB7] rounded-sm flex items-center justify-center gap-2 hover:bg-[#4a6aa0] transition-colors">
							<Mail class="w-4 h-4 text-white" />
							<span class="font-sans font-semibold text-xs leading-[16px] text-white">New Email</span>
						</button>
						<button class="h-[63px] bg-[#F2AE5E] rounded-sm flex items-center justify-center gap-2 hover:bg-[#e09d4d] transition-colors">
							<Phone class="w-4 h-4 text-white" />
							<span class="font-sans font-semibold text-xs leading-[16px] text-white">New Call</span>
						</button>
						<button class="h-[63px] bg-[#B5C2DA] rounded-sm flex items-center justify-center gap-2 hover:bg-[#a3b3cf] transition-colors">
							<svg class="w-5 h-5 text-[#577AB7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
							</svg>
							<span class="font-sans font-semibold text-xs leading-[16px] text-[#577AB7]">New SMS</span>
						</button>
						<button class="h-[63px] bg-[#B5C2DA] rounded-sm flex items-center justify-center gap-2 hover:bg-[#a3b3cf] transition-colors">
							<SquarePen class="w-5 h-5 text-[#577AB7]" />
							<span class="font-sans font-semibold text-xs leading-[16px] text-[#577AB7]">Add Task</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Communications Container -->
			<div class="bg-white border border-[#ABABAB] rounded overflow-hidden min-w-[1282px]">
				<!-- Filter Tabs & Search -->
				<div class="flex items-center justify-between p-4 border-b border-[#ABABAB]">
					<div class="flex items-center gap-2">
						{#each filters as filter}
							<button
								class="px-4 py-2 rounded font-sans font-medium text-base leading-[1.29] transition-colors {activeFilter === filter ? 'bg-[#0F172A] text-white font-bold' : 'text-[#555555] hover:bg-gray-100'}"
								onclick={() => activeFilter = filter}
							>
								{filter}
							</button>
						{/each}
					</div>
					<div class="w-[349px] h-[43px] bg-white border border-[#ADADAD] rounded flex items-center px-4 gap-2">
						<Search class="w-4 h-4 text-[#555555]" />
						<input
							type="text"
							bind:value={commSearchQuery}
							placeholder="Search communications..."
							class="flex-1 outline-none font-sans font-light text-sm leading-[1.29] text-[rgba(85,85,85,0.53)] placeholder:text-[rgba(85,85,85,0.53)]"
						/>
						<Mic class="w-4 h-4 text-[#555555]" />
					</div>
				</div>

				<!-- Communications Table -->
				<div class="w-full">
					<!-- Table Header -->
					<div class="h-[46px] bg-[#F3F3F3] rounded-t-[4px] flex items-center px-4">
						<div class="w-[30px]"></div>
						<div class="w-[100px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">DATE</div>
						<div class="w-[80px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">TYPE</div>
						<div class="w-[130px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">SOURCE</div>
						<div class="w-[150px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">ENDPOINT</div>
						<div class="w-[110px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">PURPOSE</div>
						<div class="w-[90px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">SUMMARY</div>
						<div class="w-[100px] font-sans font-semibold text-xs leading-[1.29] text-[#555555]">COMM ID</div>
						<div class="flex-1 font-sans font-semibold text-xs leading-[1.29] text-[#555555] text-right">ACTIONS</div>
					</div>

					<!-- Table Body -->
					{#each filteredCommunications as comm, index}
						<div class="h-[80px] bg-[#FBFCFD] border-b border-[#C6C6C6] flex items-center px-4 {index % 2 === 0 ? '' : ''}">
							<div class="w-[30px]">
								<div class="w-[18px] h-[18px] rounded-full {getStatusColor(comm.status)}"></div>
							</div>
							<div class="w-[100px]">
								<p class="font-sans font-semibold text-sm leading-[1.29] text-[#555555]">{comm.date}</p>
								<p class="font-sans font-normal text-xs leading-[1.29] text-[#555555]">{comm.time}</p>
							</div>
							<div class="w-[80px] flex items-center gap-1">
								{#if comm.type === "email"}
									<Mail class="w-[23px] h-4 text-black" />
								{:else if comm.type === "sms"}
									<MessageSquare class="w-[23px] h-4 text-black" />
								{:else if comm.type === "voice"}
									<Phone class="w-[23px] h-4 text-black" />
								{:else if comm.type === "web"}
									<Globe class="w-[23px] h-4 text-black" />
								{:else if comm.type === "facebook"}
									<Facebook class="w-[23px] h-4 text-black" />
								{:else if comm.type === "chatbot"}
									<Bot class="w-[23px] h-4 text-black" />
								{:else if comm.type === "leadform"}
									<FileText class="w-[23px] h-4 text-black" />
								{:else}
									<Mail class="w-[23px] h-4 text-black" />
								{/if}
								<span class="font-sans font-medium text-sm leading-[1.29] text-[#555555]">{comm.direction}</span>
							</div>
							<div class="w-[130px] font-sans font-medium text-sm leading-[1.29] text-[#555555]">{comm.source}</div>
							<div class="w-[150px] font-sans font-medium text-sm leading-[1.29] text-[#555555]">{comm.endpoint}</div>
							<div class="w-[110px]">
								{#if comm.purpose}
									{#if comm.purpose === "Confirm"}
										<button class="px-4 py-1.5 bg-[#577AB7] rounded text-white font-sans font-medium text-sm">Confirm</button>
									{:else}
										<span class="font-sans font-medium text-sm leading-[1.29] text-[#555555]">{comm.purpose}</span>
									{/if}
								{/if}
							</div>
							<div class="w-[90px]">
								{#if comm.summary}
									<button
										onclick={() => selectedSummary = comm}
										class="font-sans font-normal text-sm leading-[1.29] text-[#0023D7] underline cursor-pointer hover:text-[#001ba3]"
									>
										{comm.summary}
									</button>
								{/if}
							</div>
							<div class="w-[100px] font-sans font-normal text-sm leading-[1.29] text-[#555555]">{comm.commId || ''}</div>
							<div class="flex-1 flex justify-end relative">
								<button 
									class="w-6 h-6 rounded-full border border-[#515151] flex items-center justify-center gap-0.5 hover:bg-gray-100"
									aria-label="More actions"
									onclick={(e) => { e.stopPropagation(); openOptionsMenu = openOptionsMenu === comm.id ? null : comm.id; }}
								>
									<span class="w-1 h-1 rounded-full bg-[#515151]"></span>
									<span class="w-1 h-1 rounded-full bg-[#515151]"></span>
									<span class="w-1 h-1 rounded-full bg-[#515151]"></span>
								</button>
								
								{#if openOptionsMenu === comm.id}
									<div class="absolute right-0 top-8 w-[200px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] border border-[#E5E5E5] z-50">
										<button 
											class="w-full px-4 py-2 text-left font-sans text-sm text-[#555555] hover:bg-[#F5F5F5] border-b border-[#E5E5E5]"
											onclick={() => { selectedSummary = comm; openOptionsMenu = null; }}
										>
											View Details
										</button>
										<button 
											class="w-full px-4 py-2 text-left font-sans text-sm text-[#555555] hover:bg-[#F5F5F5] border-b border-[#E5E5E5]"
											onclick={() => openOptionsMenu = null}
										>
											Call
										</button>
										<button 
											class="w-full px-4 py-2 text-left font-sans text-sm text-[#555555] hover:bg-[#F5F5F5] border-b border-[#E5E5E5]"
											onclick={() => openOptionsMenu = null}
										>
											SMS
										</button>
										<button 
											class="w-full px-4 py-2 text-left font-sans text-sm text-red-500 hover:bg-[#F5F5F5]"
											onclick={() => openOptionsMenu = null}
										>
											Email
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Summary Modal -->
	{#if selectedSummary}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
			onclick={() => selectedSummary = null}
			role="button"
			tabindex="0"
			onkeydown={(e) => { if (e.key === 'Escape') selectedSummary = null; }}
		>
			{#if selectedSummary.type === "voice" && selectedSummary.direction === "In"}
				<!-- Incoming Call Modal -->
				<div
					class="w-[742px] h-[452px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-6 relative"
					onclick={(e) => e.stopPropagation()}
				>
					<!-- Close button -->
					<button
						onclick={() => selectedSummary = null}
						class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>

					<!-- Header -->
					<div class="flex justify-between items-start mb-4">
						<div>
							<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-1">
								AI Summary:
							</p>
							<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
								{selectedSummary.date} | {selectedSummary.time}
							</p>
						</div>
						<div class="text-right">
							<p class="font-sans font-bold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)] mb-1">
								Comm ID - {selectedSummary.commId || 'N/A'}
							</p>
							<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]">
								Category: Sales
							</p>
							<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-right text-[rgba(86,86,86,0.88)]">
								Sub-Category: Inquiry/Demo
							</p>
						</div>
					</div>

					<!-- Summary Section -->
					<div class="mb-4">
						<p class="font-sans font-semibold text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-3">
							Summary:
						</p>
						<div class="w-full h-[133px] bg-[#F7F7F7] rounded border-b border-[#BEBEBE] p-4">
							<p class="font-sans font-normal text-lg leading-[131%] tracking-normal text-[rgba(86,86,86,0.78)]">
								Sarah Lee called regarding the new AI-powered roofing estimator. Mark explained the features and offered to send a demo link. and will send a appointment time fo early Friday morning.
							</p>
						</div>
					</div>

					<!-- Tasks -->
					<div class="space-y-2">
						<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							1st Task: Check Mark's Schedule for opening Friday morning
						</p>
						<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							2nd Task: Book appointment
						</p>
						<p class="font-sans font-normal text-lg leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							3rd Task: Send email demo link and appointment time
						</p>
					</div>
				</div>
			{:else if selectedSummary.type === "email"}
				<!-- Email Modal (Scaled Down) -->
				<div
					class="w-[600px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-5 relative"
					onclick={(e) => e.stopPropagation()}
				>
					<!-- Close button -->
					<button
						onclick={() => selectedSummary = null}
						class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>

					<!-- Header -->
					<div class="flex justify-between items-start mb-3">
						<div>
							<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-1">
								AI Summary:
							</p>
							<p class="font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
								{selectedSummary.date} | {selectedSummary.time}
							</p>
						</div>
						<div class="text-right">
							<p class="font-sans font-bold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)] mb-1">
								Comm ID - {selectedSummary.commId || 'N/A'}
							</p>
							<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]">
								Category: Sales
							</p>
							<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-right text-[rgba(86,86,86,0.88)]">
								Sub-Category: Book/Demo
							</p>
						</div>
					</div>

					<!-- Summary Section -->
					<div class="mb-3">
						<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-2">
							Summary:
						</p>
						<div class="w-full bg-[#F7F7F7] rounded border-b border-[#BEBEBE] p-3">
							<div class="space-y-2">
								<div>
									<span class="font-sans font-normal text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Email Address: 
									</span>
									<span class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										sarahlee@gmail.com
									</span>
								</div>
								<div>
									<span class="font-sans font-normal text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Subject Line: 
									</span>
									<span class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Demo Link and Appointment time
									</span>
								</div>
								<div>
									<span class="font-sans font-normal text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
										Body:
									</span>
									<div class="mt-2 w-full bg-[#FFFDFD] rounded border-b border-[#BEBEBE] p-3">
										<p class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)] mb-2">
											Hello Sarah,<br />
											As per our conversation see demo link and as we discuss i book a appointment at 10am at the office.
										</p>
										<p class="font-sans font-normal italic text-sm leading-[141%] tracking-normal text-[rgba(123,132,249,0.78)] underline mb-2">
											httpss://demolink1344/csag.com
										</p>
										<p class="font-sans font-medium text-sm leading-[141%] tracking-normal text-[rgba(86,86,86,0.78)]">
											Looking forward to see you<br />
											if you have any question just five me a shout
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div>
						<p class="font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							Task: AI has to update the CRM & Engagement Score
						</p>
					</div>
				</div>
			{:else}
				<!-- Default Modal for other types -->
				<div
					class="w-[600px] bg-white rounded shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-5 relative"
					onclick={(e) => e.stopPropagation()}
				>
					<button
						onclick={() => selectedSummary = null}
						class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>
					<div class="mb-3">
						<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)] mb-1">
							AI Summary:
						</p>
						<p class="font-sans font-normal text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)]">
							{selectedSummary.date} | {selectedSummary.time}
						</p>
					</div>
					<div class="text-right mb-3">
						<p class="font-sans font-bold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.78)] mb-1">
							Comm ID - {selectedSummary.commId || 'N/A'}
						</p>
						<p class="font-sans font-semibold text-base leading-[1.29] tracking-normal text-[rgba(86,86,86,0.88)]">
							Category: Sales
						</p>
					</div>
					<div class="w-full bg-[#F7F7F7] rounded border-b border-[#BEBEBE] p-3">
						<p class="font-sans font-normal text-sm leading-[131%] tracking-normal text-[rgba(86,86,86,0.78)]">
							Summary content for {selectedSummary.type} communication.
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
{:else}
	<div class="w-full p-4">
		<p class="text-[#555555]">Profile not found</p>
		<button
			onclick={() => goto('/profiles')}
			class="mt-4 text-[#577AB7] hover:text-[#3d5a8a] font-sans text-sm"
		>
			← Back to Profiles
		</button>
	</div>
{/if}
