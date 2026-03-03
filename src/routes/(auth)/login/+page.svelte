<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import Spinner from '$lib/components/ui/spinner.svelte';
	import OtpInput from '$lib/components/ui/otp-input.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let loading = $state(false);
	let mode = $state<'password' | 'otp'>('password');
	let otpSent = $state(false);
	let otpEmail = $state('');
	let otpCode = $state('');

	async function sendOtp() {
		const emailEl = document.querySelector<HTMLInputElement>('input[name="email"]');
		const email = emailEl?.value?.trim();
		if (!email) {
			toast.error('Enter your email');
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/auth/otp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, intent: 'login' })
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? 'Failed to send code');
				return;
			}
			otpEmail = email;
			otpSent = true;
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
				body: JSON.stringify({ email: otpEmail, code: otpCode, intent: 'login' })
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? 'Invalid or expired code');
				return;
			}
			toast.success('Login successful');
			goto(data.redirect ?? '/dashboard');
		} catch {
			toast.error('Something went wrong');
		} finally {
			loading = false;
		}
	}

	function handleEnhance() {
		return async ({ result }: { result: any }) => {
			loading = false;
			if (result.type === 'redirect') {
				toast.success('Login successful');
				await applyAction(result);
			} else {
				toast.error(result.data?.message ?? 'Invalid email or password');
			}
		};
	}
</script>

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-[1000px] w-full flex gap-6 bg-dialog">
		<div class="flex-1 hidden lg:block">
			<img
				src="/img/login.png"
				alt="Person working on laptop"
				class="w-full h-full object-cover rounded-lg"
				loading="lazy"
			/>
		</div>

		<div class="w-full lg:w-[460px] flex flex-col justify-center">
			<div class="mx-auto">
				<img src="/img/logo.png" alt="ClearSky Software" class="h-[88px] w-[189px]" />
			</div>

			<div class="w-full lg:w-[460px] bg-white rounded-lg p-8">
				<div class="flex justify-between items-center mb-8">
					<h2 class="text-2xl font-semibold text-gray-900">Login</h2>
				</div>

				{#if otpSent}
					<div class="space-y-6">
						<p class="text-sm text-gray-600">
							We sent a 5-digit code to <strong>{otpEmail}</strong>
						</p>
						<OtpInput bind:value={otpCode} disabled={loading} onsubmit={verifyOtp} />
						<Button
							type="button"
							disabled={loading || otpCode.length !== 5}
							class="w-full py-3 px-4 bg-primary hover:bg-primary/80 text-white font-medium rounded-lg flex items-center justify-center gap-2"
							onclick={verifyOtp}
						>
							{#if loading}
								<Spinner />
								Verifying...
							{:else}
								Verify and log in
							{/if}
						</Button>
						<button
							type="button"
							class="w-full text-sm text-gray-500 hover:text-gray-700"
							onclick={() => { otpSent = false; otpCode = ''; }}
						>
							Use a different email
						</button>
					</div>
				{:else if mode === 'otp'}
					<div class="space-y-6">
						<div>
							<input
								name="email"
								type="email"
								placeholder="Email"
								required
								class="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary/60 focus:bg-white focus:ring-0"
							/>
						</div>
						<Button
							type="button"
							disabled={loading}
							class="w-full py-3 px-4 bg-primary hover:bg-primary/80 text-white font-medium rounded-lg flex items-center justify-center gap-2"
							onclick={sendOtp}
						>
							{#if loading}
								<Spinner />
								Sending code...
							{:else}
								Email me a code
							{/if}
						</Button>
						<button
							type="button"
							class="w-full text-sm text-gray-500 hover:text-gray-700"
							onclick={() => (mode = 'password')}
						>
							Log in with password instead
						</button>
					</div>
				{:else}
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
								autocomplete="current-password"
								placeholder="Password"
								required
								class="w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary/60 focus:bg-white focus:ring-0"
							/>
						</div>
						<Button
							type="submit"
							disabled={loading}
							class="w-full py-3 px-4 bg-primary hover:bg-primary/80 text-white font-medium rounded-lg flex items-center justify-center gap-2"
						>
							{#if loading}
								<Spinner />
								Logging in...
							{:else}
								Login
							{/if}
						</Button>
						<button
							type="button"
							class="w-full text-sm text-primary hover:underline"
							onclick={() => (mode = 'otp')}
						>
							Email me a code instead
						</button>
					</form>
				{/if}

				{#if !otpSent && mode === 'password'}
					<div class="relative mt-6">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-300"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<span class="px-2 bg-white text-gray-500">Or login with</span>
						</div>
					</div>
					<button
						type="button"
						class="w-full mt-4 py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center justify-center gap-2"
					>
						Log in with Google
					</button>
				{/if}

				<p class="text-center text-sm text-gray-600 mt-6">
					Don't have an account?
					<a href="/signup" class="text-primary hover:underline">Sign up</a>
				</p>
			</div>
		</div>
	</div>
</div>
