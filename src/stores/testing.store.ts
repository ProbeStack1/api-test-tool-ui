/**
 * Testing-tab navigation state — replaces React-Router children for
 * everything under `/projects/testing` so the URL stays stable while
 * the user moves between Specs · Cases · Library · Functional · Load
 * · Monitors and within Functional between
 * Dashboard / Runs / Schedules / Analytics.
 *
 * Persisted across reloads in IndexedDB so the user re-lands on
 * exactly the same view.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export type TestingSection = 'specs' | 'cases' | 'library' | 'functional' | 'load' | 'security' | 'monitors';
export type FunctionalTab  = 'dashboard' | 'runner' | 'runs' | 'schedules' | 'analytics';
export type LoadTab        = 'dashboard' | 'runner' | 'runs' | 'schedules' | 'analytics';
export type MonitorTab     = 'overview' | 'runs' | 'incidents' | 'maintenance' | 'settings';

interface TestingState {
  section: TestingSection;
  functionalTab: FunctionalTab;
  loadTab: LoadTab;
  /** When set, the Specs section shows the Spec Detail view instead of the list. */
  selectedSpecId: string | null;
  /** When set, the Functional section shows the Run Detail view instead of the tab strip. */
  selectedRunId: string | null;
  /** When set, the Load section shows the Load Run Detail view instead of the tab strip. */
  selectedLoadRunId: string | null;
  /** When set, the Monitors section shows the Monitor Detail view instead of the list. */
  selectedMonitorId: string | null;
  monitorTab: MonitorTab;
  /** When set, the Functional Runs tab shows the live-stream panel instead of the configure form. */
  liveFunctionalRunId: string | null;
  /** When set, the Load Runs tab shows the live-stream panel instead of the configure form. */
  liveLoadRunId: string | null;

  setSection: (s: TestingSection) => void;
  setFunctionalTab: (t: FunctionalTab) => void;
  setLoadTab: (t: LoadTab) => void;
  setMonitorTab: (t: MonitorTab) => void;
  openSpec: (id: string) => void;
  closeSpec: () => void;
  openRun: (id: string) => void;
  closeRun: () => void;
  openLoadRun: (id: string) => void;
  closeLoadRun: () => void;
  openMonitor: (id: string) => void;
  closeMonitor: () => void;
  setLiveFunctionalRun: (id: string | null) => void;
  setLiveLoadRun: (id: string | null) => void;
}

const DEFAULTS = {
  section: 'specs' as TestingSection,
  functionalTab: 'runner' as FunctionalTab,
  loadTab: 'runner' as LoadTab,
  monitorTab: 'overview' as MonitorTab,
  selectedSpecId: null as string | null,
  selectedRunId: null as string | null,
  selectedLoadRunId: null as string | null,
  selectedMonitorId: null as string | null,
  liveFunctionalRunId: null as string | null,
  liveLoadRunId: null as string | null,
};

export const useTestingStore = create<TestingState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setSection: (section) => set({ section, selectedSpecId: null, selectedRunId: null, selectedLoadRunId: null, selectedMonitorId: null }),
      setFunctionalTab: (functionalTab) => set({ functionalTab, selectedRunId: null }),
      setLoadTab: (loadTab) => set({ loadTab, selectedLoadRunId: null }),
      setMonitorTab: (monitorTab) => set({ monitorTab }),
      openSpec: (id) => set({ selectedSpecId: id, section: 'specs' }),
      closeSpec: () => set({ selectedSpecId: null }),
      openRun: (id) => set({ selectedRunId: id, section: 'functional' }),
      closeRun: () => set({ selectedRunId: null }),
      openLoadRun: (id) => set({ selectedLoadRunId: id, section: 'load' }),
      closeLoadRun: () => set({ selectedLoadRunId: null }),
      openMonitor: (id) => set({ selectedMonitorId: id, section: 'monitors', monitorTab: 'overview' }),
      closeMonitor: () => set({ selectedMonitorId: null }),
      setLiveFunctionalRun: (liveFunctionalRunId) => set({ liveFunctionalRunId }),
      setLiveLoadRun: (liveLoadRunId) => set({ liveLoadRunId }),
    }),
    {
      name: 'forgeq-testing-nav',
      storage: createJSONStorage(() => ({
        getItem: async (n) => (await idbGet<string>(n)) ?? null,
        setItem: async (n, v) => { await idbSet(n, v); },
        removeItem: async (n) => { await idbDel(n); },
      })),
    },
  ),
);
