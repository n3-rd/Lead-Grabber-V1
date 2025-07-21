<script lang="ts">
  import { Phone, Clock, Voicemail, ChevronDown, X, MicOff, Volume2, Delete } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button/index";
  import { toast } from "svelte-sonner";
  
  let phoneNumber = $state('');
  let isDialing = $state(false);
  let isCallActive = $state(false);
  let callId = $state('');
  let callStatus = $state('');
  
  // Optional client ID for tracking purposes
  let clientId = "test-client";
  
  async function initiateCall() {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    isDialing = true;
    callStatus = 'Dialing...';
    
    try {
      const response = await fetch('/api/telnyx/dial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          from: '+17059800835', // Your Telnyx number
          clientId: clientId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Call initiated');
        callId = result.callId;
        isCallActive = true;
        callStatus = 'Connected';
      } else {
        toast.error('Failed to place call: ' + result.error);
        callStatus = 'Failed';
      }
    } catch (error) {
      console.error('Call error:', error);
      toast.error('Error placing call');
      callStatus = 'Error';
    } finally {
      isDialing = false;
    }
  }
  
  function hangup() {
    if (!callId) return;
    
    callStatus = 'Hanging up...';
    
    fetch('/api/telnyx/hangup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId })
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        toast.success('Call ended');
      } else {
        toast.error('Failed to hang up: ' + result.error);
      }
    })
    .catch(error => {
      console.error('Hangup error:', error);
      toast.error('Error hanging up call');
    })
    .finally(() => {
      isCallActive = false;
      callId = '';
      callStatus = '';
    });
  }
  
  function appendDigit(digit: string) {
    phoneNumber += digit;
  }
  
  function deleteDigit() {
    phoneNumber = phoneNumber.slice(0, -1);
  }
  
  let contacts = [
    { name: "Sarah Lee", phone: "705-4123-6346" },
    { name: "Peter Griffin", phone: "705-6433-2564" },
    { name: "Michael Scofield", phone: "705-9755-1953" },
    { name: "Joe Swanson", phone: "705-9012-0124" },
    { name: "Adam West", phone: "705-7812-3321" },
    { name: "Cleveland Brown", phone: "705-0091-7542" },
    { name: "Sarah Lee", phone: "705-4123-6346" },
    { name: "Peter Griffin", phone: "705-6433-2564" },
    { name: "Michael Scofield", phone: "705-9755-1953" },
    { name: "Joe Swanson", phone: "705-9012-0124" }
  ];

  let dialInput = "";
  let callerId = "(406) 555-1234";
  function appendDialInput(d: string) { dialInput += d; }
  function deleteDialInput() { dialInput = dialInput.slice(0, -1); }
  function call() { /* implement call logic */ }
</script>

<div class="bg-[#F5F7FF] min-h-screen p-0">
  <div class="max-w-6xl mx-auto py-8">
    <h1 class="text-2xl font-semibold text-gray-700 mb-6">Dialer</h1>
    <div class="flex gap-6">
      <!-- Contacts List -->
      <div class="flex-1 max-w-md">
        <div class="bg-white rounded-xl shadow p-0">
          <div class="flex px-6 py-4 border-b font-semibold text-gray-600 text-lg">
            <div class="flex-1">Name</div>
            <div class="flex-1">Phone</div>
          </div>
          <div>
            {#each contacts as c}
              <div class="flex px-6 py-3 border-b last:border-b-0 items-center text-gray-700 text-base hover:bg-gray-50 transition">
                <div class="flex-1">{c.name}</div>
                <div class="flex-1">{c.phone}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Dialer Section -->
      <div class="flex-1 flex flex-col gap-6">
        <!-- Tabs -->
        <div class="bg-white rounded-xl shadow flex items-center px-6 py-3 gap-8">
          <div class="flex items-center gap-2 text-[#6B7FC9] font-semibold">
            <Phone class="w-5 h-5" /> Phone
          </div>
          <div class="flex items-center gap-2 text-gray-400 font-semibold">
            <Clock class="w-5 h-5" /> Calls
          </div>
          <div class="flex items-center gap-2 text-gray-400 font-semibold">
            <Voicemail class="w-5 h-5" /> Voicemail
          </div>
        </div>
        <!-- Dialer Card -->
        <div class="bg-white rounded-xl shadow flex flex-col items-center px-8 py-8">
          <div class="flex items-center gap-2 mb-2 text-gray-600 font-medium">
            My Caller ID: <span class="font-semibold text-gray-800">{callerId}</span>
            <ChevronDown class="w-4 h-4" />
          </div>
          <input
            class="w-full text-center text-gray-500 text-base mb-4 outline-none border-0 bg-transparent"
            placeholder="Enter a name or number"
            bind:value={dialInput}
            readonly
          />
          <div class="w-full border-t mb-4"></div>
          <!-- Keypad -->
          <div class="grid grid-cols-3 gap-6 mb-6">
            {#each [[1,2,3],[4,5,6],[7,8,9],['*',0,'#']] as row}
              {#each row as digit}
                <button
                  class="w-16 h-16 rounded-full text-2xl text-gray-600 hover:bg-gray-100 transition"
                  on:click={() => appendDialInput(digit.toString())}
                  type="button"
                >{digit}</button>
              {/each}
            {/each}
          </div>
          <button
            class="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl hover:bg-green-700 transition"
            on:click={call}
            type="button"
          >
            <Phone class="w-7 h-7" />
          </button>
        </div>
      </div>
      </div>
      </div>
      </div>