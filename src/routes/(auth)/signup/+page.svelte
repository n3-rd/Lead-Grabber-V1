<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let loading = $state(false);

	// HTML pattern (no { } in attribute - Svelte treats {} as template)
	const passwordPatternAttr = '(?=.*[A-Za-z])(?=.*[0-9]).{8,}';

	function handleEnhance() {
		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			loading = false;
			if (result.type === 'failure') {
				toast.error(result.data?.message ?? 'Failed to create account');
				await update();
				return;
			}
			if (result.type === 'redirect') {
				await goto('/create-company');
			}
		};
	}

</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="w-full lg:w-[460px] flex flex-col justify-center">
		<div class="mx-auto">
			<img src="/img/logo.png" alt="ClearSky Software" class="h-[88px] w-[189px]" />
		</div>

		<div class="w-full lg:w-[460px] bg-white rounded-lg p-8">
			<div class="flex justify-between items-center mb-8">
				<h2 class="text-2xl font-semibold text-gray-900">Sign Up</h2>
			</div>

			<form
				method="POST"
				use:enhance={() => {
					const form = document.querySelector('form');
					if (form && !form.checkValidity()) {
						form.reportValidity();
						return;
					}
					loading = true;
					return handleEnhance();
				}}
				class="space-y-6"
			>
				<div>
					<input
						name="name"
						type="text"
						placeholder="Full Name"
						required
						class="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary/60 focus:bg-white focus:ring-0"
					/>
				</div>
				<div>
					<input
						name="email"
						type="email"
						placeholder="Email"
						required
						class="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary/60 focus:bg-white focus:ring-0"
					/>
				</div>
				<div>
					<input
						name="password"
						type="password"
						placeholder="Password"
						required
						minlength="8"
						pattern={passwordPatternAttr}
						title="At least 8 characters, one letter and one number"
						class="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary/60 focus:bg-white focus:ring-0"
					/>
				</div>
				<div>
					<Input
						name="passwordConfirm"
						type="password"
						placeholder="Confirm Password"
						required
						class="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary/60 focus:bg-white focus:ring-0"
					/>
				</div>

				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Creating Account...' : 'Sign Up'}
				</Button>

				<div class="text-center text-sm">
					<a href="/login" class="text-primary hover:underline">
						Already have an account? Log in
					</a>
				</div>
			</form>
		</div>
	</div>
</div>
