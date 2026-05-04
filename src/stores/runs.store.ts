/**
 * Run store — keyed by tabId, persists the latest ExecutionResult AND the
 * "is sending" flag across component remounts.  Without this store, when
 * the user switches the primary tab (Collection → Mock → back), the
 * RequestBuilderPage unmounts and the in-flight Promise's `setResult` /
 * `setSending` writes are lost, so the user sees an empty response panel.
 *
 * The actual fetch promise still runs to completion (Promises don't care
 * about React lifecycle); we just need somewhere outside the component
 * to store the result so a fresh mount can pick it up.
 */
import { create } from 'zustand';
import type { ExecutionResult } from '@/services/request.service';

interface TabRun {
  sending: boolean;
  result: ExecutionResult | null;
  /** wall-clock ms when the current send started — used for "running for X s" */
  startedAt?: number;
}

interface RunsStore {
  byTab: Record<string, TabRun>;
  startSend: (tabId: string) => void;
  setResult: (tabId: string, result: ExecutionResult | null) => void;
  finishSend: (tabId: string) => void;
  clear: (tabId: string) => void;
  get: (tabId: string) => TabRun;
}

const EMPTY: TabRun = { sending: false, result: null };

export const useRunsStore = create<RunsStore>((set, get) => ({
  byTab: {},
  get: (tabId) => get().byTab[tabId] ?? EMPTY,
  startSend: (tabId) => set((s) => ({
    byTab: { ...s.byTab, [tabId]: { ...(s.byTab[tabId] ?? EMPTY), sending: true, startedAt: Date.now() } },
  })),
  setResult: (tabId, result) => set((s) => ({
    byTab: { ...s.byTab, [tabId]: { ...(s.byTab[tabId] ?? EMPTY), result } },
  })),
  finishSend: (tabId) => set((s) => ({
    byTab: { ...s.byTab, [tabId]: { ...(s.byTab[tabId] ?? EMPTY), sending: false } },
  })),
  clear: (tabId) => set((s) => {
    const next = { ...s.byTab };
    delete next[tabId];
    return { byTab: next };
  }),
}));
