<script lang="ts">
import { onMount } from 'svelte';
let isOwner = false;
let loading = true;

onMount(async () => {
  // Fetch current user info to determine if owner
  const res = await fetch('/api/me');
  const data = await res.json();
  // Assume role === 'owner' means company owner
  isOwner = data?.data?.role === 'owner';
  loading = false;
});

async function deleteAccount() {
  if (isOwner) {
    if (!confirm('WARNING: You are the company owner. Deleting your account will permanently delete your user, your company, and ALL associated data (contacts, logs, numbers, flows, etc.) for ALL users. This cannot be undone. Are you absolutely sure?')) return;
  } else {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
  }
  const res = await fetch('/api/account', { method: 'DELETE', headers: { 'Accept': 'application/json' } });
  const data = await res.json();
  if (data.success) {
    alert('Account deleted successfully. You will be logged out.');
    window.location.href = '/login';
  } else {
    alert(data.message || 'Account deletion failed.');
  }
}
</script>

<div class="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
  <h2 class="text-2xl font-bold mb-4">Manage Account</h2>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="mb-6">
      <p class="mb-2 text-gray-700">Delete your account and all associated data.</p>
      {#if isOwner}
        <div class="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Warning:</strong> You are the company owner. Deleting your account will <b>permanently delete your company and ALL data for all users</b> (contacts, logs, numbers, flows, etc.). This cannot be undone.
        </div>
      {/if}
      <form on:submit|preventDefault={deleteAccount}>
        <button type="submit" class="bg-red-600 text-white px-4 py-2 rounded">Delete Account</button>
      </form>
    </div>
  {/if}
</div>
