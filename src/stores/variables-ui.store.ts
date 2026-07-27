/**
 * Variables workspace store — keeps the user-selected precedence scope and
 * the list of open env tabs within `/projects/variables`. Persisted to
 * IndexedDB so navigating away and back keeps the same tab open.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { useAuth } from './auth.store'; 

export type VarScope = 'GLOBAL' | 'WORKSPACE' | 'ENVIRONMENT' | 'COLLECTION' | 'LOCAL';

export interface OpenEnvTab {
  /** environment id */
  id: string;
  /** display name (cached for fast rendering even before query loads) */
  name: string;
  /** scope so we can route back to the right list when closed */
  scope: VarScope;
}

interface VariablesUiState {
  scope: VarScope;
  openTabs: OpenEnvTab[];
  /** id of the currently focused tab — null means we show the scope's list. */
  activeTabId: string | null;
  userId: string | null; 
  setScope: (s: VarScope) => void;
  openTab: (t: OpenEnvTab) => void;
  closeTab: (id: string) => void;
  focusTab: (id: string | null) => void;
  renameTab: (id: string, name: string) => void;
  /** Optional column toggles for the env list table. */
  columns: { createdAt: boolean; updatedAt: boolean };
  toggleColumn: (key: 'createdAt' | 'updatedAt') => void;
  clear: () => void;
  snapshotTabEnvId: string | null;
  snapshotTabEnvName: string | null;
  openSnapshotsTab: (envId: string, envName: string) => void;
  closeSnapshotsTab: () => void;
}

export const useVariablesUi = create<VariablesUiState>()(
  persist(
    (set) => ({
      scope: 'ENVIRONMENT',
      openTabs: [],
      activeTabId: null,
      userId: null, 
      snapshotTabEnvId: null,
      snapshotTabEnvName: null,

      setScope: (scope) => set({ scope, activeTabId: null }),

      openTab: (t) => {
        const userId = useAuth.getState().user?.userId ?? null; 
        set((s) => ({
          openTabs: s.openTabs.find((x) => x.id === t.id) ? s.openTabs : [...s.openTabs, t],
          activeTabId: t.id,
          scope: t.scope,
          userId, 
        }));
      },

      closeTab: (id) =>
        set((s) => {
          const tabs = s.openTabs.filter((x) => x.id !== id);
          const next = s.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId;
          return { openTabs: tabs, activeTabId: next };
        }),

      focusTab: (activeTabId) => set({ activeTabId }),

      renameTab: (id, name) =>
        set((s) => ({ openTabs: s.openTabs.map((t) => (t.id === id ? { ...t, name } : t)) })),

      columns: { createdAt: false, updatedAt: false },
      toggleColumn: (key) =>
        set((s) => ({ columns: { ...s.columns, [key]: !s.columns[key] } })),

      clear: () => { 
        set({ scope: 'ENVIRONMENT', openTabs: [], activeTabId: null, userId: null, columns: { createdAt: false, updatedAt: false } });
        useVariablesUi.persist.clearStorage();
      },
openSnapshotsTab: (envId, envName) =>
  set({ snapshotTabEnvId: envId, snapshotTabEnvName: envName, activeTabId: 'snapshots' }),
closeSnapshotsTab: () =>
  set({ snapshotTabEnvId: null, snapshotTabEnvName: null, activeTabId: null }),
    }),
    {
      name: 'forgeq-variables-ui',
      storage: createJSONStorage(() => ({
        getItem: async (n) => (await idbGet<string>(n)) ?? null,
        setItem: async (n, v) => { await idbSet(n, v); },
        removeItem: async (n) => { await idbDel(n); },
      })),
    },
  ),
);
