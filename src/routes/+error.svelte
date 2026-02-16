<script lang="ts">
	import { page } from '$app/stores';

	const statusCode = $derived($page.status ?? 404);
	const errorMessage = $derived($page.error?.message ?? 'Something went wrong');

	const is404 = $derived(statusCode === 404);
	const title = $derived(is404 ? 'Page not found' : 'Something went wrong');
	const description = $derived(
		is404 ? "The page you're looking for doesn't exist or was moved." : errorMessage
	);
</script>

<svelte:head>
	<title>{statusCode} – {title}</title>
</svelte:head>

<div class="error-page min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
	<div class="text-center max-w-md">
		<div class="mb-8 text-8xl font-bold tabular-nums text-slate-200 select-none">
			{statusCode}
		</div>
		<h1 class="font-['Poppins'] text-2xl font-semibold text-slate-800 mb-2">
			{title}
		</h1>
		<p class="font-['Poppins'] text-slate-600 mb-8 leading-relaxed">
			{description}
		</p>
		<div class="flex flex-col sm:flex-row gap-3 justify-center">
			<button
				type="button"
				onclick={() => typeof window !== 'undefined' && window.history.back()}
				class="font-['Poppins'] font-medium rounded-lg px-5 py-2.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
			>
				← Go back
			</button>
			<a
				href="/"
				class="font-['Poppins'] font-medium rounded-lg px-5 py-2.5 bg-[#577AB7] text-white hover:bg-[#4a6ba5] transition-colors text-center"
			>
				Home
			</a>
		</div>
	</div>
</div>
