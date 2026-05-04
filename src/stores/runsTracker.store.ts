/**
 * Background runs tracker — polls every tracked functional / load run
 * regardless of which page the user is on, and fires a sonner toast
 * the moment the run transitions into a terminal status.
 *
 * Mounted ONCE in `AppShell` via `useActiveRunsTracker` so polling
 * survives navigation away from the Testing tab.
 */
import { create } from 'zustand';

export type TrackedKind = 'functional' | 'load';

export interface TrackedRun {
  runId: string;
  kind: TrackedKind;
  name: string;
  /** Last status seen — used to detect transitions into a terminal state. */
  lastStatus: string;
  startedAt: number;
}

interface State {
  /** runId → tracked run record. */
  runs: Record<string, TrackedRun>;

  trackRun: (run: TrackedRun) => void;
  updateStatus: (runId: string, status: string) => void;
  untrack: (runId: string) => void;
  clear: () => void;
}

export const useRunsTracker = create<State>((set) => ({
  runs: {},
  trackRun: (run) =>
    set((s) => ({ runs: { ...s.runs, [run.runId]: run } })),
  updateStatus: (runId, status) =>
    set((s) => {
      const cur = s.runs[runId];
      if (!cur || cur.lastStatus === status) return s;
      return { runs: { ...s.runs, [runId]: { ...cur, lastStatus: status } } };
    }),
  untrack: (runId) =>
    set((s) => {
      const next = { ...s.runs };
      delete next[runId];
      return { runs: next };
    }),
  clear: () => set({ runs: {} }),
}));

export const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'ERROR', 'CANCELLED']);
