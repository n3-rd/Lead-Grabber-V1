<script lang="ts">
import '../app.css';
import { browser } from '$app/environment';
import { applyAction, enhance } from '$app/forms';
import { setUserContext } from '$lib/contexts/user';
import { pb } from '$lib/pocketbase';
import { onDestroy, onMount, type Snippet } from 'svelte';
import { writable } from 'svelte/store';
import type { PageData } from './$types';
import LoadingBar from '@//components/loading-bar.svelte';
import { Toaster } from 'svelte-sonner';
import IncomingCallDialog from '$lib/components/IncomingCallDialog.svelte';
import { callDialog } from '$lib/stores/callDialog';

interface Props {
  data: PageData;
  children?: Snippet;
}

let { data, children }: Props = $props();

// Initialize user store
const user = writable(data.user);
setUserContext(user);

if (browser) {
  // Load user from cookie (client-side only)
  pb.authStore.loadFromCookie(document.cookie);

  // Update user store when auth store changes
  const unsubscribe = pb.authStore.onChange(() => {
    user.set(pb.authStore.record);
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
  }, true);
  onDestroy(unsubscribe);
}

// --- Incoming Call WebSocket Logic ---
let ws: WebSocket | null = null;
onMount(() => {
  if (!browser) return;
  // Use the local SvelteKit WebSocket endpoint for call events
  ws = new WebSocket('ws://' + window.location.host + '/api/ws');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'incoming_call') {
        callDialog.set({ open: true, call: { name: data.name, phone: data.phone, callId: data.callId } });
      }
      if (data.type === 'call_ended') {
        callDialog.set({ open: false, call: null });
      }
    } catch (e) {
      // ignore
    }
  };
  ws.onerror = () => {};
  ws.onclose = () => {};
  return () => {
    ws?.close();
  };
});
</script>

<LoadingBar class="bg-primary" />

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
</svelte:head>
<Toaster richColors/>
<div class="root-layout overflow-hidden">
 
    {@render children()}
    {#if $callDialog.open && $callDialog.call}
      <IncomingCallDialog
        open={$callDialog.open}
        caller={$callDialog.call}
        on:answer={() => { /* TODO: implement answer logic */ callDialog.set({ open: false, call: null }); }}
        on:decline={() => { /* TODO: implement decline logic */ callDialog.set({ open: false, call: null }); }}
      />
    {/if}
</div>
