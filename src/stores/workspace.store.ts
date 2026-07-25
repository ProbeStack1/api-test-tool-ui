/**
 * Workspace store — currently selected workspace id + cached workspace list.
 * Persisted to IndexedDB so user's choice survives reload.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Workspace } from '@/services/workspace.service';
import { useAuth } from './auth.store'; 

interface WorkspaceState {
  currentId: string | null;
  current: Workspace | null;
  userId: string | null; 
  setCurrent: (ws: Workspace | null) => void;
  clear: () => void; 
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentId: null,
      current: null,
      userId: null, 

      setCurrent: (ws) => {
        const userId = useAuth.getState().user?.userId ?? null; 
        set({ current: ws, currentId: ws?.id ?? null, userId }); // ADD userId
      },

      clear: () => { 
        set({ current: null, currentId: null, userId: null });
        useWorkspaceStore.persist.clearStorage();
      },
    }),
    {
      name: 'forgeq-workspace',
      storage: createJSONStorage(() => ({
        getItem: async (n) => (await idbGet<string>(n)) ?? null,
        setItem: async (n, v) => { await idbSet(n, v); },
        removeItem: async (n) => { await idbDel(n); },
      })),
    },
  ),
);
