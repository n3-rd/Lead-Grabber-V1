<script lang="ts">
import '../app.css';
import { browser } from '$app/environment';
import { applyAction, enhance } from '$app/forms';
import { setUserContext } from '$lib/contexts/user';
import { pb } from '$lib/pocketbase';
import { onDestroy, onMount, type Snippet } from 'svelte';
import { writable } from 'svelte/store';
import LoadingBar from '@//components/loading-bar.svelte';
import { Toaster } from 'svelte-sonner';
import IncomingCallDialog from '$lib/components/IncomingCallDialog.svelte';
import { callDialog } from '$lib/stores/callDialog';

interface Props {
  data: any;
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

// --- Incoming Call SSE Logic ---
let eventSource: EventSource | null = null;
onMount(() => {
  if (!browser) return;
  
  console.log('🔌 Connecting to SSE events...');
  
  // Connect to Server-Sent Events for call events
  eventSource = new EventSource('/api/events');
  
  eventSource.onopen = () => {
    console.log('✅ SSE connection opened');
    if (typeof document !== 'undefined') {
      const statusEl = document.getElementById('sse-status');
      if (statusEl) statusEl.textContent = 'Connected ✅';
    }
  };
  
  eventSource.onmessage = (event) => {
    console.log('📨 SSE message received:', event.data);
    try {
      const data = JSON.parse(event.data);
      console.log('📞 Parsed SSE data:', data);
      
      if (data.type === 'incoming_call') {
        console.log('🚨 INCOMING CALL - Opening dialog!', data);
        callDialog.set({ 
          open: true, 
          call: { 
            name: data.name || 'Unknown Caller',
            phone: data.phone,
            callId: data.callId 
          }
        });
      }
      if (data.type === 'call_ended') {
        console.log('📴 CALL ENDED - Closing dialog');
        callDialog.set({ open: false, call: null });
      }
      if (data.type === 'connected') {
        console.log('🔗 SSE connection confirmed');
        if (typeof document !== 'undefined') {
          const statusEl = document.getElementById('sse-status');
          if (statusEl) statusEl.textContent = 'Connected ✅';
        }
      }
      if (data.type === 'heartbeat') {
        console.log('💓 SSE heartbeat');
      }
    } catch (e) {
      console.error('❌ Error parsing SSE data:', e, event.data);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('❌ SSE connection error:', error);
    console.log('🔄 SSE will reconnect automatically');
    if (typeof document !== 'undefined') {
      const statusEl = document.getElementById('sse-status');
      if (statusEl) statusEl.textContent = 'Error ❌';
    }
  };
  
  return () => {
    console.log('🔌 Closing SSE connection');
    if (eventSource) {
      eventSource.close();
    }
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
    {#if children}
      {@render children()}
    {/if}
    
    <!-- Debug Section - Remove in production -->
    {#if import.meta.env.DEV}
      <div class="fixed top-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg text-sm">
        <div>🔌 SSE Status: <span id="sse-status">Connecting...</span></div>
        <div>📞 Call Dialog Open: {$callDialog.open}</div>
        <div>📱 Call Data: {JSON.stringify($callDialog.call)}</div>
        <button 
          class="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs"
          onclick={() => {
            console.log('🧪 Testing call dialog...');
            callDialog.set({ 
              open: true, 
              call: { 
                name: 'Test Caller',
                phone: '+15551234567',
                callId: 'test-123' 
              }
            });
          }}
        >
          Test Call Dialog
        </button>
        <button 
          class="mt-1 bg-red-600 text-white px-3 py-1 rounded text-xs"
          onclick={() => {
            callDialog.set({ open: false, call: null });
          }}
        >
          Close Dialog
        </button>
      </div>
    {/if}
    
    {#if $callDialog.open && $callDialog.call}
      <IncomingCallDialog
        open={$callDialog.open}
        caller={{ 
          name: $callDialog.call.name || 'Unknown Caller', 
          phone: $callDialog.call.phone 
        }}
        on:answer={async () => { 
          console.log('📞 User clicked ANSWER');
          try {
            // Answer the call via API
            const response = await fetch('/api/telnyx/answer-call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callId: $callDialog.call?.callId })
            });
            
            if (response.ok) {
              console.log('✅ Call answered successfully');
            } else {
              console.error('❌ Failed to answer call');
            }
          } catch (error) {
            console.error('❌ Error answering call:', error);
          }
          
          // Close dialog
          callDialog.set({ open: false, call: null }); 
        }}
        on:decline={async () => { 
          console.log('📞 User clicked DECLINE');
          try {
            // Hang up the call via API
            const response = await fetch('/api/telnyx/hangup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callId: $callDialog.call?.callId })
            });
            
            if (response.ok) {
              console.log('✅ Call declined successfully');
            } else {
              console.error('❌ Failed to decline call');
            }
          } catch (error) {
            console.error('❌ Error declining call:', error);
          }
          
          // Close dialog
          callDialog.set({ open: false, call: null }); 
        }}
      />
    {/if}
</div>
