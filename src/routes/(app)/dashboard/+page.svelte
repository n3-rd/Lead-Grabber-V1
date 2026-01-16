<script lang="ts">
	let { data } = $props();
	let { user } = data;
	
	let selectedChannel = $state('sms');
</script>

<div class="flex flex-col gap-4 p-4 bg-gray-100 min-h-screen">
	<!-- Header -->
	<div class="bg-gray-200 py-4 px-6">
		<h1 class="text-2xl font-bold text-center">Dashboard</h1>
	</div>

	<!-- Communication Channel Filters -->
	<div class="bg-white rounded-lg px-6 py-4 flex items-center gap-8">
		<button 
			class="text-base font-normal {selectedChannel === 'sms' ? 'text-primary font-medium' : 'text-gray-600 hover:text-gray-900'}"
			onclick={() => selectedChannel = 'sms'}
		>
			sms
		</button>
		<button 
			class="text-base font-normal {selectedChannel === 'email' ? 'text-primary font-medium' : 'text-gray-600 hover:text-gray-900'}"
			onclick={() => selectedChannel = 'email'}
		>
			email
		</button>
		<button 
			class="text-base font-normal {selectedChannel === 'phonecall' ? 'text-primary font-medium' : 'text-gray-600 hover:text-gray-900'}"
			onclick={() => selectedChannel = 'phonecall'}
		>
			phonecall
		</button>
	</div>

	<!-- Cards Grid -->
	<div class="grid grid-cols-2 gap-4 flex-1">
		<!-- Upper Row - Left: latest communications -->
		<div class="bg-white rounded-lg shadow-sm p-6">
			<h2 class="text-base font-normal mb-4">latest communications</h2>
			<!-- Empty placeholder for content -->
		</div>

		<!-- Upper Row - Right: site visitors -->
		<div class="bg-white rounded-lg shadow-sm p-6">
			<h2 class="text-base font-normal mb-4">site visitors</h2>
			<div class="space-y-2 text-sm mb-4">
				<div>session id</div>
				<div>name</div>
				<div>history</div>
				<div>web views</div>
				<div>profile</div>
			</div>
			<!-- Empty placeholder for content -->
		</div>

		<!-- Lower Row - Left: upcoming appointments -->
		<div class="bg-white rounded-lg shadow-sm p-6">
			<h2 class="text-base font-normal mb-4">upcoming appointments</h2>
			<!-- Empty placeholder for content -->
		</div>

		<!-- Lower Row - Middle-Left: assigned -->
		<div class="bg-white rounded-lg shadow-sm p-6">
			<h2 class="text-base font-normal mb-4">assigned</h2>
			<!-- Empty placeholder for content -->
		</div>

		<!-- Lower Row - Middle-Right: Empty card -->
		<div class="bg-white rounded-lg shadow-sm p-6">
			<!-- Empty placeholder -->
		</div>

		<!-- Lower Row - Right: Empty card -->
		<div class="bg-white rounded-lg shadow-sm p-6">
			<!-- Empty placeholder -->
		</div>
	</div>
</div>
