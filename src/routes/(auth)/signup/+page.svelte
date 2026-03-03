<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import OtpInput from '$lib/components/ui/otp-input.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let loading = $state(false);
	let step = $state<'form' | 'otp'>('form');
	let formData = $state({ name: '', email: '', password: '', passwordConfirm: '' });
	let otpCode = $state('');

	const passwordPatternAttr = '(?=.*[A-Za-z])(?=.*[0-9]).{8,}';

	async function sendOtp(e: Event) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value?.trim();
		const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value?.trim().toLowerCase();
		const password = (form.querySelector('[name="password"]') as HTMLInputElement)?.value ?? '';
		const passwordConfirm = (form.querySelector('[name="passwordConfirm"]') as HTMLInputElement)?.value ?? '';

		if (!name || !email) {
			toast.error('Name and email are required');
			return;
		}
		if (password.length < 8) {
			toast.error('Password must be at least 8 characters');
			return;
		}
		if (password !== passwordConfirm) {
			toast.error('Passwords do not match');
			return;
		}
		if (!new RegExp(passwordPatternAttr).test(password)) {
			toast.error('Password needs at least one letter and one number');
			return;
		}

		formData = { name, email, password, passwordConfirm };
		loading = true;
		try {
			const res = await fetch('/api/auth/otp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, intent: 'signup', name, password })
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? 'Failed to send code');
				return;
			}
			step = 'otp';
			otpCode = '';
			toast.success('Check your email for the code');
		} catch {
			toast.error('Something went wrong');
		} finally {
			loading = false;
		}
	}

	async function verifyOtp() {
		if (otpCode.length !== 5) {
			toast.error('Enter the 5-digit code');
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/auth/otp/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: formData.email, code: otpCode, intent: 'signup' })
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? 'Invalid or expired code');
				return;
			}
			toast.success('Account created');
			goto(data.redirect ?? '/create-company');
		} catch {
			toast.error('Something went wrong');
		} finally {
			loading = false;
		}
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

			{#if step === 'otp'}
				<div class="space-y-6">
					<p class="text-sm text-gray-600">
						We sent a 5-digit code to <strong>{formData.email}</strong>
					</p>
					<OtpInput bind:value={otpCode} disabled={loading} onsubmit={verifyOtp} />
					<Button
						type="button"
						disabled={loading || otpCode.length !== 5}
						class="w-full py-3 px-4 bg-primary hover:bg-primary/80 text-white font-medium rounded-lg flex items-center justify-center gap-2"
						onclick={verifyOtp}
					>
						{loading ? 'Verifying...' : 'Verify and create account'}
					</Button>
					<button
						type="button"
						class="w-full text-sm text-gray-500 hover:text-gray-700"
						onclick={() => { step = 'form'; otpCode = ''; }}
					>
						Use a different email
					</button>
				</div>
			{:else}
				<form class="space-y-6" onsubmit={sendOtp}>
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
						<input
							name="passwordConfirm"
							type="password"
							placeholder="Confirm Password"
							required
							class="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary/60 focus:bg-white focus:ring-0"
						/>
					</div>

					<Button type="submit" class="w-full" disabled={loading}>
						{loading ? 'Sending code...' : 'Sign Up'}
					</Button>
				</form>
			{/if}

			<div class="text-center text-sm mt-6">
				<a href="/login" class="text-primary hover:underline">
					Already have an account? Log in
				</a>
			</div>
		</div>
	</div>
</div>
