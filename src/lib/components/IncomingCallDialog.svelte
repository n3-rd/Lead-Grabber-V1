<script lang="ts">
import * as Dialog from "$lib/components/ui/dialog/index";
import { Phone, X } from "lucide-svelte";
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
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-6">
    <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-600" on:click={decline}>
      <X class="w-6 h-6" />
    </button>
    <div class="flex flex-col items-center gap-2">
      <div class="bg-[#E3E9FF] rounded-full w-20 h-20 flex items-center justify-center mb-2">
        <Phone class="w-10 h-10 text-[#6B7FC9]" />
      </div>
      <div class="text-lg font-semibold text-gray-700">Incoming Call</div>
      <div class="text-xl font-bold text-[#6B7FC9]">{caller.name || 'Unknown Caller'}</div>
      <div class="text-gray-500 text-base">{caller.phone}</div>
    </div>
    <div class="flex gap-6 mt-4">
      <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-semibold text-lg shadow" on:click={answer}>
        Answer
      </button>
      <button class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-semibold text-lg shadow" on:click={decline}>
        Decline
      </button>
    </div>
  </Dialog.Content>
</Dialog.Root>
