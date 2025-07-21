<script lang="ts">
	// Static data for demonstration
	const filters = [
		{ label: 'All', key: 'all' },
		{ label: 'Email', key: 'email' },
		{ label: 'SMS', key: 'sms' },
		{ label: 'Voice', key: 'voice' },
		{ label: 'Web', key: 'web' },
		{ label: 'Facebook', key: 'facebook' },
		{ label: 'Linkedin', key: 'linkedin' }
	];
	let selectedFilter = 'all';
	let search = '';

	const rows = [
		{
			date: '06-01, 09:33PM',
			type: 'email',
			direction: 'Out',
			source: 'markdoe@clear..',
			endpoint: 'Sarah Lee',
			ext: '',
			company: 'Greenbuild Inc.',
			disposition: 'Delivered'
		},
		{
			date: '06-01, 09:30PM',
			type: 'voice',
			direction: 'In',
			source: 'Sarah Lee',
			endpoint: 'Mark Doe',
			ext: '',
			company: 'Sarah Cell',
			disposition: 'Connect'
		},
		{
			date: '06-02, 11:10PM',
			type: 'email',
			direction: 'Out',
			source: '(416) 555-1199',
			endpoint: 'AI Agent',
			ext: '',
			company: '',
			disposition: 'Msg After Hours'
		},
		{
			date: '06-05, 12:16AM',
			type: 'sms',
			direction: 'In',
			source: 'Emily Cruz',
			endpoint: 'AI Agent',
			ext: '',
			company: '',
			disposition: 'Msg & Route'
		},
		{
			date: '06-09, 02:19PM',
			type: 'voice',
			direction: 'In',
			source: 'Daniel Kwan',
			endpoint: 'AI Agent',
			ext: '',
			company: 'PureBuild Inc.',
			disposition: 'AI Resolved'
		},
		{
			date: '06-11, 09:25AM',
			type: 'voice',
			direction: 'In',
			source: 'Carla Santos',
			endpoint: 'Bobby deck',
			ext: '',
			company: 'EcoHomes Ltd.',
			disposition: 'Transfer + VM'
		},
		{
			date: '06-13, 08:46PM',
			type: 'voice',
			direction: 'In',
			source: 'Patrick Lee',
			endpoint: 'Lisa Reyes',
			ext: '',
			company: 'NovaConstruct',
			disposition: 'Avail Agent + VM'
		},
		{
			date: '06-16, 10:54PM',
			type: 'voice',
			direction: 'In',
			source: 'Rory Chavez',
			endpoint: 'Tom Sy / Cell',
			ext: '',
			company: 'BuildCore Ltd.',
			disposition: 'Agent + Cell Fwd'
		},
		{
			date: '06-21, 07:37PM',
			type: 'voice',
			direction: 'In',
			source: '(587) 444-8899',
			endpoint: 'AI Agent',
			ext: '',
			company: '',
			disposition: 'Hung Up'
		},
		{
			date: '06-01, 09:30PM',
			type: 'email',
			direction: 'Out',
			source: 'markdoe@clear..',
			endpoint: 'Sarah Lee',
			ext: '',
			company: 'Greenbuild Inc.',
			disposition: 'Delivered'
		},
		{
			date: '06-01, 09:30PM',
			type: 'facebook',
			direction: 'Out',
			source: 'You',
			endpoint: 'Joe Swanson',
			ext: '',
			company: '',
			disposition: 'Delivered'
		}
	];

	import { Mail, MessageSquare, Phone, Globe, Facebook, Linkedin, Icon, Search, Mic } from 'lucide-svelte';

	const iconMap = {
		email: Mail,
		sms: MessageSquare,
		voice: Phone,
		web: Globe,
		facebook: Facebook,
		linkedin: Linkedin
	};

	function icon(type: string) {
		return iconMap[type] || null;
	}

	// Filtered and searched rows
	$: filteredRows = rows.filter(row =>
		(selectedFilter === 'all' || row.type === selectedFilter) &&
		(
			row.date.toLowerCase().includes(search.toLowerCase()) ||
			row.type.toLowerCase().includes(search.toLowerCase()) ||
			row.source.toLowerCase().includes(search.toLowerCase()) ||
			row.endpoint.toLowerCase().includes(search.toLowerCase()) ||
			row.company.toLowerCase().includes(search.toLowerCase()) ||
			row.disposition.toLowerCase().includes(search.toLowerCase())
		)
	);

	let selectedLog: typeof rows[0] | null = null;

	// Example summary data for demonstration
	const summaryData = {
		commId: "001234",
		category: "Sales",
		subCategory: "Book/Demo",
		date: "06-01-25",
		time: "02:12:03",
		email: "sarahlee@gmail.com",
		subject: "Demo Link and Appointment time",
		body: `Hello Sarah,
As per our conversation see demo link and as we discuss i book a appointment at 10am at the office.

https://demolink1344/csag.com

Looking forward to see you
if you have any question just five me a shout`,
		task: "AI has to update the CRM & Engagement Score"
	};

	function openSummary(log) {
		selectedLog = log;
	}
	function closeSummary() {
		selectedLog = null;
	}
</script>

<!-- Header -->
<div class="flex flex-col gap-2 my-4">
	<h1 class="text-2xl font-semibold">Communication Log</h1>
	<p class="text-base text-muted-foreground text-[#8a8fa7]">
		Instant updates to keep you informed and in control.
	</p>
</div>

<!-- Filters & Search -->
<div class="flex items-center gap-4 flex-wrap">
	<div class="flex gap-2 flex-wrap">
		{#each filters as filter}
			<button
				class="px-4 py-2 rounded-lg border-none font-medium transition-colors
					{selectedFilter === filter.key
						? 'bg-primary text-white'
						: 'bg-[#e7eaf6] text-primary hover:bg-[#d6d9e6]'}"
				on:click={() => selectedFilter = filter.key}
			>
				{filter.label}
			</button>
		{/each}
	</div>
	<div class="ml-auto flex items-center justify-between bg-white rounded-xl px-3 py-1">
		<Search class="text-primary mr-2" />
		<input
			type="text"
			placeholder="Search"
			bind:value={search}
			class="bg-transparent outline-none border-none py-2 px-2 text-base"
		/>
		<Mic class="text-primary mr-2" />
	</div>
</div>

<!-- Table -->
<div class="bg-[#f4f6fb] rounded-xl py-4 mt-4 overflow-x-auto">
	<!-- Apply min-w-[1000px] or max-content to force potential overflow -->
	<table class="w-full min-w-[1000px] border-collapse">
		<thead>
			<tr>
				<th class="py-3 px-2 text-left text-[#8a8fa7] font-semibold bg-[#f4f6fb]">Date</th>
				<th class="py-3 px-2 text-left text-[#8a8fa7] font-semibold bg-[#f4f6fb]">Type</th>
				<th class="py-3 px-2 text-left text-[#8a8fa7] font-semibold bg-[#f4f6fb]">Source ID</th>
				<th class="py-3 px-2 text-left text-[#8a8fa7] font-semibold bg-[#f4f6fb]">End Point</th>
				<th class="py-3 px-2 text-left text-[#8a8fa7] font-semibold bg-[#f4f6fb]">Ext.</th>
				<th class="py-3 px-2 text-left text-[#8a8fa7] font-semibold bg-[#f4f6fb]">Company</th>
				<th class="py-3 px-2 text-left text-[#8a8fa7] font-semibold bg-[#f4f6fb]">Disposition</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredRows as row}
				<tr class="bg-white border-b last:border-b-0 border-[#e7eaf6] cursor-pointer hover:bg-[#f0f2f8] transition"
					on:click={() => openSummary(row)}>
					<td class="py-3 px-2">{row.date}</td>
					<td class="py-3 px-2">
						<div class="flex items-center gap-2">
							{#if icon(row.type)}
								<svelte:component this={icon(row.type)} class="w-5 h-5 " />
							{/if}
							<span class="capitalize">{row.direction}</span>
						</div>
					</td>
					<td class="py-3 px-2">{row.source}</td>
					<td class="py-3 px-2">{row.endpoint}</td>
					<td class="py-3 px-2">{row.ext}</td>
					<td class="py-3 px-2">{row.company}</td>
					<td class="py-3 px-2">{row.disposition}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if selectedLog}
	<!-- Overlay -->
	<div class="fixed inset-0 bg-black/30 z-40 flex items-center justify-center" on:click={closeSummary}>
		<!-- Popup Card -->
		<div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative z-50" on:click|stopPropagation>
			<button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600" on:click={closeSummary} aria-label="Close">
				&times;
			</button>
			<div class="flex justify-between items-start mb-2">
				<div>
					<div class="text-sm text-[#8a8fa7] font-semibold">AI Summary:</div>
					<div class="text-xs text-[#8a8fa7] mt-1">{summaryData.date} | <span class="font-mono">{summaryData.time}</span></div>
				</div>
				<div class="text-right">
					<div class="text-xs text-[#8a8fa7] font-semibold">Comm ID - {summaryData.commId}</div>
					<div class="text-xs"><span class="font-semibold text-[#8a8fa7]">Category:</span> <span class="text-gray-700">{summaryData.category}</span></div>
					<div class="text-xs"><span class="font-semibold text-[#8a8fa7]">Sub-Category:</span> <span class="text-gray-700">{summaryData.subCategory}</span></div>
				</div>
			</div>
			<div class="font-semibold mt-2 mb-1 text-[#8a8fa7]">Summary:</div>
			<div class="bg-[#f4f6fb] rounded-md p-4 text-sm mb-3">
				<div><span class="font-semibold text-[#8a8fa7]">Email Address:</span> <span class="font-mono">{summaryData.email}</span></div>
				<div><span class="font-semibold text-[#8a8fa7]">Subject Line:</span> <span class="font-semibold">{summaryData.subject}</span></div>
				<div><span class="font-semibold text-[#8a8fa7]">Body:</span></div>
				<div class="bg-white rounded p-3 mt-2 whitespace-pre-line">
					Hello Sarah,<br>
					As per our conversation see demo link and as we discuss i book a appointment at 10am at the office.<br><br>
					<a href="https://demolink1344/csag.com" class="text-purple-600 underline break-all" target="_blank">https://demolink1344/csag.com</a><br><br>
					Looking forward to see you<br>
					if you have any question just five me a shout
				</div>
			</div>
			<div class="text-sm mt-2">
				<span class="font-semibold text-[#8a8fa7]">Task:</span>
				<span class="font-semibold">AI has to update the CRM & Engagement Score</span>
			</div>
		</div>
	</div>
{/if}


