/**
 * Active-request store — persists which request is currently open across
 * sidebar nav and main area. Also remembers the ordered list of open tabs.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type TabSource = 'collection' | 'history';
export interface OpenRequest {
  id: string;
  method: RequestMethod;
  name: string;
  url?: string;
  dirty?: boolean;
  workspaceId?: string;
  collectionId?: string;
  folderId?: string | null;
  /** Which sidebar context this tab was opened from. Collection-opened
   *  requests stay visible only while the Collection tab is active; the
   *  same holds for History. Undefined → legacy / collection. */
  source?: TabSource;
}

interface RequestsState {
  open: OpenRequest[];
  activeId: string | null;
  setActive: (id: string) => void;
  openRequest: (r: OpenRequest) => void;
  closeRequest: (id: string) => void;
  newUntitled: (parent?: { workspaceId?: string; collectionId?: string; folderId?: string | null }) => string;
  rename: (id: string, name: string) => void;
  setMeta: (id: string, patch: Partial<OpenRequest>) => void;
}

export const useRequests = create<RequestsState>()(
  persist(
    (set, get) => ({
      open: [],
      activeId: null,
      setActive: (id) => set({ activeId: id }),
      openRequest: (r) => {
        const s = get();
        const exists = s.open.find((x) => x.id === r.id);
        set({
          open: exists ? s.open : [...s.open, r],
          activeId: r.id,
        });
      },
      closeRequest: (id) => {
        const s = get();
        const next = s.open.filter((x) => x.id !== id);
        set({
          open: next,
          activeId: s.activeId === id ? next[next.length - 1]?.id ?? null : s.activeId,
        });
      },
      newUntitled: (parent?: { workspaceId?: string; collectionId?: string; folderId?: string | null }) => {
        const id = `t${Date.now()}`;
        const r: OpenRequest = {
          id,
          method: 'GET',
          name: 'Untitled',
          dirty: true,
          workspaceId: parent?.workspaceId,
          collectionId: parent?.collectionId,
          folderId: parent?.folderId ?? null,
        };
        set((s) => ({ open: [...s.open, r], activeId: id }));
        return id;
      },
      rename: (id, name) =>
        set((s) => ({ open: s.open.map((x) => (x.id === id ? { ...x, name } : x)) })),
      setMeta: (id: string, patch: Partial<OpenRequest>) =>
        set((s) => ({ open: s.open.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    }),
    {
      name: 'forgeq-requests',
      storage: createJSONStorage(() => ({
        getItem: async (n) => (await idbGet<string>(n)) ?? null,
        setItem: async (n, v) => { await idbSet(n, v); },
        removeItem: async (n) => { await idbDel(n); },
      })),
    },
  ),
);
