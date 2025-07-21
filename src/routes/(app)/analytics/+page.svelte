<script lang="ts">
  import { Phone, RefreshCw, MessageCircle, Mail, Search, Mic, LogOut, User } from "lucide-svelte";
  let dateRange = "This Month";
  let search = "";
  let activeTab = "Incoming Calls";
  let stats = [
    { label: "Total Interactions", value: "3,425", icon: RefreshCw },
    { label: "Incoming Calls", value: "1,230", icon: Phone },
    { label: "Outgoing Calls", value: "1,020", icon: Phone },
    { label: "SMS Messages", value: "540", icon: MessageCircle },
    { label: "Emails Sent/Receive", value: "420", icon: Mail },
    { label: "WhatsApp Interactions", value: "210", icon: MessageCircle }
  ];
  let tabs = ["Incoming Calls", "Outgoing Calls", "SMS", "Email", "WhatsApp"];
</script>

<div class="bg-[#F5F7FF] min-h-screen">

  <div class="max-w-7xl mx-auto px-8 py-8">
    <div class="text-2xl font-semibold text-gray-700 mb-6">Analytics</div>
    <div class="flex gap-6 mb-6 justify-between items-center">
      <!-- Date Range -->
      <div class="flex items-center gap-4 bg-white px-4">
        <label class="block text-sm text-gray-500 mb-1">Date Range:</label>
        <button class="flex items-center gap-2 rounded px-4 py-2 text-primary font-medium shadow-sm">
          {dateRange}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <!-- Search -->
      <div class=" flex flex-col w-96">
        <label class="block text-sm text-gray-500 mb-1 invisible">Search</label>
        <div class="relative">
          <input
            class="w-full bg-white border rounded pl-10 pr-10 py-2 text-primary shadow-sm focus:outline-none"
            placeholder="Search"
            bind:value={search}
          />
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Mic class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
    <!-- Stat Cards -->
    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="bg-white rounded-xl p-6 flex flex-col gap-2 shadow" >
        <div class="flex items-center justify-between text-gray-500 text-sm font-medium">
          Total Interactions
          <RefreshCw class="w-5 h-5 text-gray-300" />
        </div>
        <div class="text-2xl font-bold text-primary">3,425</div>
      </div>
      <div class="bg-white rounded-xl p-6 flex flex-col gap-2 shadow" >
        <div class="flex items-center justify-between text-gray-500 text-sm font-medium">
          Incoming Calls
          <Phone class="w-5 h-5 text-gray-300" />
        </div>
        <div class="text-2xl font-bold text-primary">1,230</div>
      </div>
      <div class="bg-white rounded-xl p-6 flex flex-col gap-2 shadow" >
        <div class="flex items-center justify-between text-gray-500 text-sm font-medium">
          Outgoing Calls
          <Phone class="w-5 h-5 text-gray-300" />
        </div>
        <div class="text-2xl font-bold text-primary">1,020</div>
      </div>
      <div class="bg-white rounded-xl p-6 flex flex-col gap-2 shadow" >
        <div class="flex items-center justify-between text-gray-500 text-sm font-medium">
          SMS Messages
          <MessageCircle class="w-5 h-5 text-gray-300" />
        </div>
        <div class="text-2xl font-bold text-primary">540</div>
      </div>
      <div class="bg-white rounded-xl p-6 flex flex-col gap-2 shadow" >
        <div class="flex items-center justify-between text-gray-500 text-sm font-medium">
          Emails Sent/Receive
          <Mail class="w-5 h-5 text-gray-300" />
        </div>
        <div class="text-2xl font-bold text-primary">420</div>
      </div>
      <div class="bg-white rounded-xl p-6 flex flex-col gap-2 shadow" >
        <div class="flex items-center justify-between text-gray-500 text-sm font-medium">
          WhatsApp Interactions
          <MessageCircle class="w-5 h-5 text-gray-300" />
        </div>
        <div class="text-2xl font-bold text-primary">210</div>
      </div>
    </div>
    <!-- Tabs -->
    <div class="flex gap-3 mb-6">
      {#each tabs as tab}
        <button
          class="px-5 py-2 rounded-lg  text-gray-500 font-medium border transition
            {activeTab === tab ? 'bg-primary text-white' : 'hover:bg-gray-100 bg-white'}"
          on:click={() => activeTab = tab}
        >
          {tab}
        </button>
      {/each}
    </div>
    <!-- Chart/Data Placeholders -->
    <div class="grid grid-cols-4 gap-6">
      <div class="bg-white rounded-xl h-48 shadow"></div>
      <div class="bg-white rounded-xl h-48 shadow"></div>
      <div class="bg-white rounded-xl h-48 shadow"></div>
      <div class="bg-white rounded-xl h-48 shadow"></div>
    </div>
  </div>
</div>
