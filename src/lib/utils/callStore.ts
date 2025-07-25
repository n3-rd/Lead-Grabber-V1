interface PendingCall {
  id: string;
  name: string;
  phone: string;
  callId: string;
  timestamp: number;
}

// In-memory store for pending calls
const pendingCalls = new Map<string, PendingCall>();

export function addPendingCall(call: Omit<PendingCall, 'id' | 'timestamp'>) {
  const id = Math.random().toString(36).substring(7);
  const pendingCall: PendingCall = {
    ...call,
    id,
    timestamp: Date.now()
  };
  
  pendingCalls.set(id, pendingCall);
  console.log('📞 Added pending call:', id, call);
  
  // Auto-cleanup after 30 seconds if not handled
  setTimeout(() => {
    if (pendingCalls.has(id)) {
      pendingCalls.delete(id);
      console.log('🗑️ Auto-cleaned up pending call:', id);
    }
  }, 30000);
  
  return id;
}

export function getPendingCall(): PendingCall | null {
  // Get the oldest pending call
  const entries = Array.from(pendingCalls.entries());
  if (entries.length === 0) return null;
  
  // Sort by timestamp to get oldest first
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  return entries[0][1];
}

export function removePendingCall(id: string): boolean {
  const removed = pendingCalls.delete(id);
  if (removed) {
    console.log('📞 Removed pending call:', id);
  }
  return removed;
}

export function clearAllPendingCalls() {
  const count = pendingCalls.size;
  pendingCalls.clear();
  console.log('🗑️ Cleared all pending calls:', count);
  return count;
} 