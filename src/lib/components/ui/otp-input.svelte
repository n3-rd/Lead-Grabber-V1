<script lang="ts">
	const LENGTH = 5;
	let { value = $bindable(''), disabled = false, class: className = '', onsubmit } = $props();

	let refs: HTMLInputElement[] = [];
	let local = $state(value.slice(0, LENGTH).padEnd(LENGTH, ''));

	$effect(() => {
		const v = value.replace(/\D/g, '').slice(0, LENGTH);
		if (v !== local.replace(/\s/g, '')) local = v.padEnd(LENGTH, '');
	});

	function syncValue() {
		const v = local.replace(/\s/g, '').slice(0, LENGTH);
		if (v !== value) value = v;
	}

	function handleInput(i: number, e: Event) {
		const el = e.target as HTMLInputElement;
		const v = el.value.replace(/\D/g, '').slice(-1);
		const arr = local.split('');
		arr[i] = v;
		local = arr.join('');
		syncValue();
		if (v && i < LENGTH - 1) refs[i + 1]?.focus();
	}

	function handleKeydown(i: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !local[i] && i > 0) {
			refs[i - 1]?.focus();
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const code = local.replace(/\s/g, '').slice(0, LENGTH);
			if (code.length === LENGTH && onsubmit) onsubmit();
		}
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const pasted = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, LENGTH);
		local = pasted.padEnd(LENGTH, '');
		syncValue();
		const next = Math.min(pasted.length, LENGTH - 1);
		refs[next]?.focus();
	}
</script>

<div class="flex gap-2 justify-center {className}" role="group" aria-label="Verification code">
	{#each Array(LENGTH) as _, i}
		<input
			bind:this={refs[i]}
			type="text"
			inputmode="numeric"
			autocomplete={i === 0 ? 'one-time-code' : undefined}
			maxlength="1"
			disabled={disabled}
			value={local[i] ?? ''}
			oninput={(e) => handleInput(i, e)}
			onkeydown={(e) => handleKeydown(i, e)}
			onpaste={handlePaste}
			class="w-11 h-12 text-center text-lg font-semibold rounded-lg bg-gray-100 border border-transparent focus:border-primary/60 focus:bg-white focus:ring-0 focus:outline-none disabled:opacity-50"
		/>
	{/each}
</div>
