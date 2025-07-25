<script lang="ts">
import * as Dialog from "$lib/components/ui/dialog/index";
import { X } from "lucide-svelte";
import { createEventDispatcher } from "svelte";

export let open = false;
export let caller = { name: '', phone: '' };
const dispatch = createEventDispatcher();

function answer() {
  dispatch('answer');
}
function decline() {
  dispatch('decline');
}
function hold() {
  // For now, just decline the call - you can implement hold logic later
  dispatch('decline');
}
function transfer() {
  // For now, just decline the call - you can implement transfer logic later  
  dispatch('decline');
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-sm w-full bg-white rounded-xl shadow-lg p-6 flex flex-col items-center gap-4">
    <button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600" on:click={decline}>
      <X class="w-5 h-5" />
    </button>
    
    <div class="flex flex-col items-center gap-3">
      <!-- Gray avatar circle -->
      <div class="bg-gray-300 rounded-full w-16 h-16 flex items-center justify-center">
        <div class="w-8 h-8 bg-gray-400 rounded-full"></div>
      </div>
      
      <!-- Caller name with "is Calling..." -->
      <div class="text-center">
        <div class="text-lg font-medium text-gray-800">
          {caller.name || 'Unknown Caller'} is Calling...
        </div>
      </div>
    </div>
    
    <!-- 2x2 Button Grid -->
    <div class="grid grid-cols-2 gap-3 w-full mt-2">
      <!-- Top row: Answer and Hold -->
      <button 
        class="bg-[#f6b253] hover:bg-[#f6b253]/80 text-white px-4 py-2.5 rounded-lg font-medium text-sm"
        on:click={answer}
      >
        Answer
      </button>
      <button 
        class="bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-lg font-medium text-sm"
        on:click={hold}
      >
        Hold
      </button>
      
      <!-- Bottom row: Dismiss and Transfer -->
      <button 
        class="bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-lg font-medium text-sm"
        on:click={decline}
      >
        Dismiss
      </button>
      <button 
        class="bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-lg font-medium text-sm"
        on:click={transfer}
      >
        Transfer
      </button>
    </div>
  </Dialog.Content>
</Dialog.Root>
