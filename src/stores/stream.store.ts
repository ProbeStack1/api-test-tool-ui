/**
 * Live execution stream store — collects phase events while a request
 * is in-flight so the Debug Info tab and the inline strip stepper can
 * paint a real-time timeline.  Each tab keeps its own stream state so
 * switching tabs doesn't blow away the live progress of others.
 */
import { create } from 'zustand';

export type LivePhase = {
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  durationMs?: number;
  startedAtMs?: number;
  error?: string;
};

export type LiveExecution = {
  active: boolean;
  phases: LivePhase[];
  network: Record<string, any>;
  error?: { kind: string; message: string } | null;
  startedAt?: number;
};

const EMPTY: LiveExecution = { active: false, phases: [], network: {} };

export const PHASE_ORDER = [
  'Prepare',
  'Socket Initialization',
  'DNS Lookup',
  'TCP Handshake',
  'SSL Handshake',
  'Send',
  'Waiting (TTFB)',
  'Download',
  'Process',
];

interface StreamStore {
  byTab: Record<string, LiveExecution>;
  start: (tabId: string, isHttps: boolean) => void;
  phase: (tabId: string, e: { name: string; status: 'running' | 'done'; durationMs?: number; startedAtMs?: number }) => void;
  meta: (tabId: string, network: Record<string, any>) => void;
  error: (tabId: string, e: { kind: string; message: string }) => void;
  done: (tabId: string) => void;
  clear: (tabId: string) => void;
  get: (tabId: string) => LiveExecution;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  byTab: {},
  get: (tabId) => get().byTab[tabId] ?? EMPTY,
  start: (tabId, isHttps) => set((s) => ({
    byTab: {
      ...s.byTab,
      [tabId]: {
        active: true,
        phases: PHASE_ORDER.filter((n) => isHttps || n !== 'SSL Handshake').map((name) => ({ name, status: 'pending' })),
        network: {},
        error: null,
        startedAt: Date.now(),
      },
    },
  })),
  phase: (tabId, e) => set((s) => {
    const cur = s.byTab[tabId] ?? { ...EMPTY, active: true, phases: [] };
    const idx = cur.phases.findIndex((p) => p.name === e.name);
    const nextStatus: LivePhase['status'] = e.status === 'done' ? 'done' : 'running';
    const updated: LivePhase = idx >= 0
      ? { ...cur.phases[idx], status: nextStatus, durationMs: e.durationMs ?? cur.phases[idx].durationMs, startedAtMs: e.startedAtMs ?? cur.phases[idx].startedAtMs }
      : { name: e.name, status: nextStatus, durationMs: e.durationMs, startedAtMs: e.startedAtMs };
    const phases = idx >= 0 ? cur.phases.map((p, i) => i === idx ? updated : p) : [...cur.phases, updated];
    return { byTab: { ...s.byTab, [tabId]: { ...cur, phases } } };
  }),
  meta: (tabId, network) => set((s) => {
    const cur = s.byTab[tabId] ?? EMPTY;
    return { byTab: { ...s.byTab, [tabId]: { ...cur, network: { ...cur.network, ...network } } } };
  }),
  error: (tabId, e) => set((s) => {
    const cur = s.byTab[tabId] ?? EMPTY;
    /* Mark the most recent running phase as failed. */
    const phases = cur.phases.map((p) => p.status === 'running' ? { ...p, status: 'failed' as const, error: e.message } : p);
    return { byTab: { ...s.byTab, [tabId]: { ...cur, phases, error: e, active: false } } };
  }),
  done: (tabId) => set((s) => {
    const cur = s.byTab[tabId] ?? EMPTY;
    return { byTab: { ...s.byTab, [tabId]: { ...cur, active: false } } };
  }),
  clear: (tabId) => set((s) => {
    const next = { ...s.byTab };
    delete next[tabId];
    return { byTab: next };
  }),
}));
