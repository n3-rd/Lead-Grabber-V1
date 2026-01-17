<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus } from 'lucide-svelte';

	type Location = {
		name: string;
		address: string;
		city: string;
		phone: string;
		hours: {
			[key: string]: string;
		};
		created?: string;
	};

	let currentLocation: Location = $state({
		name: '',
		address: '',
		city: '',
		phone: '',
		hours: {
			Mon: '',
			Tue: '',
			Wed: '',
			Thurs: '',
			Fri: '',
			Sat: '',
			Sun: ''
		}
	});

	let showAddLocationDialog = $state(false);
	let editingLocation: Location | null = $state(null);

	// Mock data for locations
	let locations: Location[] = $state([
		{
			name: 'Thunder Bay Branch',
			address: '123 Main Street',
			city: 'Thunder Bay',
			phone: '705-123-4567',
			hours: {
				Mon: '9:00 am - 5:00 pm',
				Tue: '9:00 am - 5:00 pm',
				Wed: '9:00 am - 5:00 pm',
				Thurs: '9:00 am - 5:00 pm',
				Fri: '9:00 am - 5:00 pm',
				Sat: 'Closed',
				Sun: 'Closed'
			},
			created: '2024-01-15'
		}
	]);

	const commonHours = [
		{ label: '9-5', value: '9:00 am - 5:00 pm' },
		{ label: '8-4', value: '8:00 am - 4:00 pm' },
		{ label: '10-6', value: '10:00 am - 6:00 pm' },
		{ label: '11-7', value: '11:00 am - 7:00 pm' },
		{ label: '12-8', value: '12:00 pm - 8:00 pm' },
		{ label: 'Closed', value: 'Closed' }
	];

	function setHours(day: string, hours: string) {
		currentLocation.hours[day] = hours;
	}

	function resetForm() {
		currentLocation = {
			name: '',
			address: '',
			city: '',
			phone: '',
			hours: {
				Mon: '',
				Tue: '',
				Wed: '',
				Thurs: '',
				Fri: '',
				Sat: '',
				Sun: ''
			}
		};
		editingLocation = null;
	}

	function formatDate(date: string | undefined) {
		if (!date) return '';
		return new Date(date).toLocaleDateString('en-US', {
			month: '2-digit',
			day: '2-digit',
			year: '2-digit'
		});
	}

	function editLocation(location: Location) {
		editingLocation = location;
		currentLocation = {
			name: location.name,
			address: location.address,
			city: location.city,
			phone: location.phone,
			hours: { ...location.hours }
		};
		showAddLocationDialog = true;
	}

	function handleSave() {
		if (editingLocation) {
			// Update existing location
			const index = locations.findIndex((l) => l.name === editingLocation!.name);
			if (index !== -1) {
				locations[index] = { ...currentLocation, created: locations[index].created };
			}
		} else {
			// Add new location
			locations.push({
				...currentLocation,
				created: new Date().toISOString()
			});
		}
		resetForm();
		showAddLocationDialog = false;
	}

	function handleDelete(index: number) {
		locations.splice(index, 1);
		if (editingLocation && locations.indexOf(editingLocation) === -1) {
			showAddLocationDialog = false;
			resetForm();
		}
	}
</script>

<div class="min-h-screen bg-[#ECEEF3] p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="font-['Poppins'] text-2xl font-bold text-[#737373]">Locations</h1>
		<Button
			variant="default"
			onclick={() => {
				resetForm();
				showAddLocationDialog = true;
			}}
			class="bg-[#4B77BE] hover:bg-[#4B77BE]/90 text-white font-['Poppins']"
		>
			<Plus class="mr-2 h-4 w-4" />
			Add Location
		</Button>
	</div>

	<!-- Table Header -->
	<div class="mb-2 rounded-[8px] bg-[#F0F4FA] px-6 py-4">
		<div class="grid grid-cols-5 gap-4">
			<div class="font-['Poppins'] text-center text-[16px] font-semibold text-[#737373]">
				Date Added
			</div>
			<div class="font-['Poppins'] text-center text-[16px] font-semibold text-[#737373]">
				Location Name
			</div>
			<div class="font-['Poppins'] text-center text-[16px] font-semibold text-[#737373]">
				Address
			</div>
			<div class="font-['Poppins'] text-center text-[16px] font-semibold text-[#737373]">
				City
			</div>
			<div class="font-['Poppins'] text-center text-[16px] font-semibold text-[#737373]">
				Delete
			</div>
		</div>
	</div>

	<!-- Table Rows -->
	{#if locations.length > 0}
		{#each locations as location, index}
			<div class="mb-2 flex h-[73px] items-center rounded-[8px] bg-white px-6">
				<div class="grid w-full grid-cols-5 gap-4">
					<div class="font-['Poppins'] text-center text-[16px] font-normal text-[#808080]">
						{formatDate(location.created)}
					</div>
					<div class="font-['Poppins'] text-center text-[16px] font-medium text-[#7798D2]">
						<button
							class="hover:underline"
							onclick={() => editLocation(location)}
						>
							{location.name}
						</button>
					</div>
					<div class="font-['Poppins'] text-center text-[16px] font-normal text-[#808080]">
						{location.address}
					</div>
					<div class="font-['Poppins'] text-center text-[16px] font-normal text-[#808080]">
						{location.city}
					</div>
					<div class="flex items-center justify-center">
						<Button
							variant="ghost"
							size="sm"
							class="text-red-500 hover:text-red-700"
							onclick={() => handleDelete(index)}
						>
							Delete
						</Button>
					</div>
				</div>
			</div>
		{/each}
	{:else}
		<div class="rounded-[8px] bg-white p-8 text-center text-gray-500">
			No locations found. Click "Add Location" to create one.
		</div>
	{/if}
</div>

<!-- Add/Edit Location Dialog -->
<Dialog.Root bind:open={showAddLocationDialog}>
	<Dialog.Content class="max-w-5xl max-h-[80vh] p-0 flex flex-col overflow-hidden">
		<Dialog.Header class="px-6 pt-6 pb-4 flex-shrink-0">
			<Dialog.Title class="font-['Poppins'] text-2xl font-bold text-[#808080]">
				{editingLocation ? 'Edit Location' : 'Add Location'}
			</Dialog.Title>
		</Dialog.Header>

		<div class="px-6 flex-1 overflow-y-auto min-h-0">
			<div class="space-y-6 pb-4">
				<div class="grid gap-4">
					<div class="flex items-center justify-between gap-8">
						<div class="grid w-full gap-2">
							<Label for="locationName" class="font-['Poppins'] text-lg font-medium text-[#808080]">
								Name of Location
							</Label>
							<Input
								id="locationName"
								bind:value={currentLocation.name}
								placeholder="e.g. Timmins Branch"
								required
								class="h-10 rounded-lg bg-[#ECEFF3]"
							/>
						</div>

						<div class="grid w-full gap-2">
							<Label for="address" class="font-['Poppins'] text-lg font-medium text-[#808080]">
								Address
							</Label>
							<Input
								id="address"
								bind:value={currentLocation.address}
								placeholder="123 Street Name"
								required
								class="h-10 rounded-lg bg-[#ECEFF3]"
							/>
						</div>
					</div>

					<div class="flex items-center justify-between gap-8">
						<div class="grid w-full gap-2">
							<Label for="city" class="font-['Poppins'] text-lg font-medium text-[#808080]">City</Label>
							<Input
								id="city"
								bind:value={currentLocation.city}
								placeholder="Timmins"
								required
								class="h-10 rounded-lg bg-[#ECEFF3]"
							/>
						</div>

						<div class="grid w-full gap-2">
							<Label for="phone" class="font-['Poppins'] text-lg font-medium text-[#808080]">
								Phone Number
							</Label>
							<Input
								id="phone"
								bind:value={currentLocation.phone}
								placeholder="705-123-1234"
								type="tel"
								required
								class="h-10 rounded-lg bg-[#ECEFF3]"
							/>
						</div>
					</div>

					<div class="grid gap-4">
						<Label class="font-['Poppins'] text-lg font-medium text-[#808080]">Hours of Operation</Label>
						<div class="flex gap-6">
							<div class="flex w-1/2 flex-col gap-2 space-y-4 pt-1">
								{#each Object.entries(currentLocation.hours) as [day, hours]}
									<div class="flex items-start justify-between">
										<span class="font-['Poppins'] text-sm">{day}</span>
										<div class="flex flex-col gap-2">
											<Input
												id={day}
												bind:value={currentLocation.hours[day]}
												placeholder="9:00 am - 5:00 pm"
												class="h-6 rounded bg-[#E0E8F5] py-1 font-['Poppins'] text-sm text-[#777574]"
											/>
											<div class="flex flex-wrap gap-1">
												{#each commonHours as timeOption}
													<button
														type="button"
														onclick={() => setHours(day, timeOption.value)}
														class="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] hover:bg-gray-50"
													>
														{timeOption.label}
													</button>
												{/each}
											</div>
										</div>
									</div>
								{/each}
							</div>

							<div class="flex w-1/2 items-center justify-center rounded p-4 text-xl"></div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<Dialog.Footer class="px-6 pb-6 pt-4 flex-shrink-0 flex justify-between gap-4 border-t border-gray-200">
			<div>
				<Button
					variant="outline"
					class="border-gray-300 text-gray-500"
					onclick={() => {
						resetForm();
						showAddLocationDialog = false;
					}}
				>
					Cancel
				</Button>
			</div>
			<div class="flex gap-2">
				{#if editingLocation}
					<Button
						class="bg-red-500 font-medium text-white hover:bg-red-600"
						onclick={() => {
							const index = locations.findIndex((l) => l === editingLocation);
							if (index !== -1) {
								handleDelete(index);
							}
							showAddLocationDialog = false;
						}}
					>
						Delete
					</Button>
				{/if}
				<Button
					class="bg-[#4B77BE] font-medium text-white hover:bg-[#4B77BE]/80"
					onclick={handleSave}
				>
					{editingLocation ? 'Update' : 'Save'}
				</Button>
				{#if !editingLocation}
					<Button
						class="bg-[#4B77BE] font-medium text-white hover:bg-[#4B77BE]/80"
						onclick={() => {
							handleSave();
							setTimeout(() => {
								showAddLocationDialog = true;
							}, 100);
						}}
					>
						Add Another Location
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>