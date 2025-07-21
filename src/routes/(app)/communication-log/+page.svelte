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

	function icon(type: string) {
		switch (type) {
			case 'email': return '✉️';
			case 'sms': return '💬';
			case 'voice': return '📞';
			case 'web': return '🌐';
			case 'facebook': return '📘';
			case 'linkedin': return '🔗';
			default: return '';
		}
	}

	function directionIcon(direction: string) {
		return direction === 'In' ? '⬅️' : '➡️';
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
</script>

<style>
	.page-header {
		font-size: 1.2rem;
		color: #8a8fa7;
		margin-bottom: 1rem;
	}
	.filter-bar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.filter-btn {
		padding: 0.5rem 1.2rem;
		border-radius: 8px;
		border: none;
		background: #e7eaf6;
		color: #5a5f7d;
		cursor: pointer;
		font-weight: 500;
	}
	.filter-btn.selected {
		background: #5a5f7d;
		color: #fff;
	}
	.search-bar {
		margin-left: auto;
		display: flex;
		align-items: center;
		background: #f4f6fb;
		border-radius: 8px;
		padding: 0.3rem 0.8rem;
	}
	.search-bar input {
		border: none;
		background: transparent;
		outline: none;
		padding: 0.4rem 0.5rem;
		font-size: 1rem;
	}
	.table-container {
		background: #f4f6fb;
		border-radius: 12px;
		padding: 1rem;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th, td {
		padding: 0.7rem 0.6rem;
		text-align: left;
		font-size: 1rem;
	}
	th {
		color: #8a8fa7;
		font-weight: 600;
		background: #f4f6fb;
	}
	tr {
		background: #fff;
		border-bottom: 1px solid #e7eaf6;
	}
	tr:last-child {
		border-bottom: none;
	}
	.type-cell {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	@media (max-width: 900px) {
		.table-container {
			padding: 0.2rem;
		}
		th, td {
			padding: 0.4rem 0.2rem;
			font-size: 0.95rem;
		}
	}
</style>

<div class="page-header">
	Instant updates to keep you informed and in control.
</div>

<div style="display: flex; align-items: center; gap: 1rem;">
	<div class="filter-bar">
		{#each filters as filter}
			<button
				class="filter-btn {selectedFilter === filter.key ? 'selected' : ''}"
				on:click={() => selectedFilter = filter.key}
			>
				{filter.label}
			</button>
		{/each}
	</div>
	<div class="search-bar">
		<span style="color: #8a8fa7; margin-right: 0.3rem;">🔍</span>
		<input
			type="text"
			placeholder="Search"
			bind:value={search}
		/>
	</div>
</div>

<div class="table-container" style="margin-top: 1rem;">
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Type</th>
				<th>Source ID</th>
				<th>End Point</th>
				<th>Ext.</th>
				<th>Company</th>
				<th>Disposition</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredRows as row}
				<tr>
					<td>{row.date}</td>
					<td class="type-cell">
						<span>{icon(row.type)}</span>
						<span>{directionIcon(row.direction)}</span>
						<span style="text-transform: capitalize;">{row.direction}</span>
					</td>
					<td>{row.source}</td>
					<td>{row.endpoint}</td>
					<td>{row.ext}</td>
					<td>{row.company}</td>
					<td>{row.disposition}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
