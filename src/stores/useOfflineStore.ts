import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { v4 as uuid } from 'uuid';
import { toast } from 'sonner';
import type { InventoryLedgerEntry, Transaction } from '@shared/types';
import { api } from '@/lib/api-client';
interface OfflineState {
  pendingLedgerEntries: InventoryLedgerEntry[];
  pendingTransactions: Transaction[];
  isOnline: boolean;
  addLedgerEntry: (entry: Omit<InventoryLedgerEntry, 'is_synced' | 'created_at' | 'capture_timestamp'> & { id?: string }) => string;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'is_synced' | 'created_at' | 'transaction_timestamp'>) => void;
  syncAllPending: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  totalPending: () => number;
}
const storage = {
  getItem: async (name: string): Promise<string | null> => (await get(name)) || null,
  setItem: async (name: string, value: string): Promise<void> => { await set(name, value); },
  removeItem: async (name: string): Promise<void> => { await del(name); },
};
export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      pendingLedgerEntries: [],
      pendingTransactions: [],
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      totalPending: () => get().pendingLedgerEntries.length + get().pendingTransactions.length,
      addLedgerEntry: (entry) => {
        const newEntry: InventoryLedgerEntry = {
          ...entry,
          id: entry.id || uuid(),
          is_synced: false,
          created_at: Date.now(),
          capture_timestamp: Date.now(),
        };
        set((state) => ({ pendingLedgerEntries: [...state.pendingLedgerEntries, newEntry] }));
        toast.success('Weight captured locally', {
          description: `${newEntry.weight_kg.toFixed(2)}kg of ${newEntry.material_type} is queued for sync.`,
        });
        return newEntry.id;
      },
      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: uuid(),
          is_synced: false,
          created_at: Date.now(),
          transaction_timestamp: Date.now(),
        };
        set((state) => ({ pendingTransactions: [...state.pendingTransactions, newTransaction] }));
        toast.success('Transaction saved locally', { description: 'Queued for sync.' });
      },
      syncAllPending: async () => {
        const { isOnline, pendingLedgerEntries, pendingTransactions } = get();
        if (!isOnline || get().totalPending() === 0) return;
        let ledgerSynced = false;
        let transactionSynced = false;
        if (pendingLedgerEntries.length > 0) {
          const entriesToSync = [...pendingLedgerEntries];
          try {
            const res = await api<{ syncedIds: string[] }>('/api/sync/ledger', {
              method: 'POST', body: JSON.stringify({ pendingEntries: entriesToSync }),
            });
            if (res.syncedIds.length > 0) {
              set(state => ({
                pendingLedgerEntries: state.pendingLedgerEntries.filter(e => !res.syncedIds.includes(e.id)),
              }));
              ledgerSynced = true;
            }
          } catch (error) {
            toast.error('Ledger sync failed', { description: error instanceof Error ? error.message : 'Server error' });
          }
        }
        if (pendingTransactions.length > 0) {
          const transactionsToSync = [...pendingTransactions];
           try {
            const res = await api<{ syncedIds: string[] }>('/api/sync/transactions', {
              method: 'POST', body: JSON.stringify({ pendingTransactions: transactionsToSync }),
            });
            if (res.syncedIds.length > 0) {
              set(state => ({
                pendingTransactions: state.pendingTransactions.filter(t => !res.syncedIds.includes(t.id)),
              }));
              transactionSynced = true;
            }
          } catch (error) {
            toast.error('Transaction sync failed', { description: error instanceof Error ? error.message : 'Server error' });
          }
        }
        if (ledgerSynced || transactionSynced) {
          toast.success('Pending items synced successfully!');
          const queryClient = (window as any).queryClient;
          if (queryClient) {
            queryClient.invalidateQueries({ queryKey: ['ledger'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          }
        }
      },
      setOnlineStatus: (isOnline) => set({ isOnline }),
    }),
    {
      name: 'suitewaste-offline-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);
if (typeof window !== 'undefined') {
  const handleOnline = () => useOfflineStore.getState().setOnlineStatus(true);
  const handleOffline = () => useOfflineStore.getState().setOnlineStatus(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  useOfflineStore.subscribe((state, prevState) => {
    if (state.isOnline && !prevState.isOnline && state.totalPending() > 0) {
      toast.info("Back online! Attempting to sync pending items...");
      state.syncAllPending();
    }
  });
  window.addEventListener('focus', () => {
    const state = useOfflineStore.getState();
    if (state.isOnline && state.totalPending() > 0) {
      state.syncAllPending();
    }
  });
}