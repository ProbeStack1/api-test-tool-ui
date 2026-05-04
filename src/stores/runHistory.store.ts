/**
 * Run history store — every Send a user fires lands here.
 *
 * Why a dedicated store (instead of relying on `apiListRuns`):
 *   • The History page wants "everything across every request, ad-hoc
 *     and saved alike", and the per-request /runs endpoint only knows
 *     about saved-request executions on the server.
 *   • We want history to be instantly visible (no round trip) the
 *     moment Send finishes — so the right place to capture it is the
 *     same callsite that already gets the `ExecutionResult`.
 *
 * Storage:
 *   IndexedDB via idb-keyval (re-used from settings.store) so we don't
 *   blow the 5 MB localStorage budget on response bodies. Capped to 500
 *   entries — older ones are evicted in FIFO order.
 *
 * Each entry stores BOTH the request snapshot (to re-execute via "Try"
 *   without going back to the server) AND the response (so the History
 *   page can render the response panel with zero latency).
 */
import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { ExecutionResult } from '@/services/request.service';

export type HistoryKind = 'request' | 'mock' | 'mcp' | 'loadtest' | 'functional' | 'monitors';

export interface RequestSnapshot {
  /** Tab / request id at execution time (may be a transient ad-hoc id). */
  tabId?: string;
  /** Saved-request id, if the user pressed Send on an item in a collection. */
  requestId?: string;
  /** Saved-request name; for ad-hoc the URL itself is the title. */
  name?: string;
  method: string;
  url: string;
  /** Raw header rows as the user had them. */
  headers?: Array<{ key: string; value: string; enabled?: boolean }>;
  /** Raw query rows. */
  params?: Array<{ key: string; value: string; enabled?: boolean }>;
  /** Auth payload (free-shape — VariableInput-aware). */
  auth?: unknown;
  /** Body payload as our internal RequestBody type. */
  body?: unknown;
  /** Pre-request / tests scripts captured at send time. */
  preScript?: string;
  testScript?: string;
}

export interface HistoryEntry {
  /** Unique id for this history row. Distinct from `runId` because Try
   *  may produce multiple `runId`s for the same snapshot. */
  id: string;
  kind: HistoryKind;
  /** ISO timestamp the user pressed Send. */
  at: string;
  snapshot: RequestSnapshot;
  /** The execution result that was served — null if the request errored
   *  before reaching the response phase. */
  result: ExecutionResult | null;
}

interface HistoryState {
  entries: HistoryEntry[];
  selectedId: string | null;
  /** True once the IndexedDB-persisted state has been rehydrated into the store.
   *  Consumers (e.g. `<HistoryPage>`) should show a loading state while this is
   *  false so a cold page load doesn't flash the "No history yet" empty state. */
  hasHydrated: boolean;
  push: (kind: HistoryKind, snapshot: RequestSnapshot, result: ExecutionResult | null) => void;
  remove: (id: string) => void;
  clear: () => void;
  select: (id: string | null) => void;
}

const MAX_ENTRIES = 500;

const idbStorage: PersistStorage<HistoryState> = {
  getItem: async (name) => {
    const v = await idbGet<string>(name);
    return v ? JSON.parse(v) : null;
  },
  setItem: async (name, value) => { await idbSet(name, JSON.stringify(value)); },
  removeItem: async (name) => { await idbDel(name); },
};

export const useRunHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      selectedId: null,
      hasHydrated: false,
      push: (kind, snapshot, result) => set((s) => {
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          kind,
          at: new Date().toISOString(),
          snapshot,
          result,
        };
        return { entries: [entry, ...s.entries].slice(0, MAX_ENTRIES) };
      }),
      remove: (id) => set((s) => ({
        entries: s.entries.filter((e) => e.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      })),
      clear: () => set({ entries: [], selectedId: null }),
      select: (id) => set({ selectedId: id }),
    }),
    {
      name: 'forgeq.run-history',
      storage: idbStorage,
      // Zustand persist reads asynchronously; flip `hasHydrated` once the
      // merge is done so UIs can avoid showing "empty" before rehydration.
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);
