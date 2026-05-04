/**
 * Layout store — panel state + modes.
 *
 * sideRailMode:
 *   'left' → narrow icon rail on the far left (icons + tooltip) as primary tab selector.
 *           Header center shows a search input.
 *   'top'  → tabs in header center (no search input, no left icon rail).
 *
 * In BOTH modes, clicking a primary tab swaps the left sidebar content.
 * Clicking an item inside the sidebar updates the main area.
 *
 * Nudge methods accept a delta and update based on current state — use these
 * from resize handles to avoid stale-closure bugs while dragging.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export type PrimaryTab =
  | 'collection'
  | 'history'
  | 'variables'
  | 'mcp'
  | 'mock'
  | 'testing'
  | 'dashboard'
  | 'aiAssisted'
  | 'ai';

export type RightPanelTab = 'project' | 'variables' | 'curl' | 'ai';
export type SideRailMode = 'left' | 'top';

export interface LayoutState {
  sideRailMode: SideRailMode;
  primaryTab: PrimaryTab;
  /** Increments on every setPrimaryTab call so nav hooks fire even
   *  when the user re-clicks the same tab from a different route. */
  primaryTabStamp: number;

  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  rightPanelTab: RightPanelTab;

  leftSidebarWidth: number;
  rightPanelWidth: number;

  responseExpanded: boolean;
  responseHeight: number;

  isResizing: boolean;

  setPrimaryTab: (t: PrimaryTab) => void;
  toggleSideRailMode: () => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setRightTab: (t: RightPanelTab) => void;

  // Nudge = delta relative to current value (closure-safe during drag).
  nudgeLeftSidebar: (delta: number) => void;
  nudgeRightPanel: (delta: number) => void;
  nudgeResponseHeight: (delta: number) => void;

  setLeftSidebarWidth: (n: number) => void;
  setRightPanelWidth: (n: number) => void;

  expandResponse: () => void;
  collapseResponse: () => void;
  setResizing: (r: boolean) => void;
}

const DEFAULTS = {
  sideRailMode: 'left' as SideRailMode,
  primaryTab: 'collection' as PrimaryTab,
  primaryTabStamp: 0,
  showLeftSidebar: true,
  showRightSidebar: true,
  rightPanelTab: 'project' as RightPanelTab,
  leftSidebarWidth: 280,
  rightPanelWidth: 360,
  responseExpanded: false,
  responseHeight: 340,
  isResizing: false,
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export const useLayout = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setPrimaryTab: (primaryTab) =>
        set((s) => ({
          primaryTab,
          primaryTabStamp: s.primaryTabStamp + 1,
          showLeftSidebar: true,
        })),
      toggleSideRailMode: () =>
        set((s) => ({ sideRailMode: s.sideRailMode === 'left' ? 'top' : 'left' })),
      toggleLeft: () => set((s) => ({ showLeftSidebar: !s.showLeftSidebar })),
      toggleRight: () => set((s) => ({ showRightSidebar: !s.showRightSidebar })),
      setRightTab: (t) => set({ rightPanelTab: t }),

      nudgeLeftSidebar: (delta) =>
        set((s) => ({ leftSidebarWidth: clamp(s.leftSidebarWidth + delta, 220, 520) })),
      nudgeRightPanel: (delta) =>
        set((s) => ({ rightPanelWidth: clamp(s.rightPanelWidth + delta, 280, 640) })),
      nudgeResponseHeight: (delta) =>
        set((s) => ({ responseHeight: clamp(s.responseHeight + delta, 140, 720) })),

      setLeftSidebarWidth: (n) => set({ leftSidebarWidth: clamp(n, 220, 520) }),
      setRightPanelWidth: (n) => set({ rightPanelWidth: clamp(n, 280, 640) }),

      expandResponse: () => set({ responseExpanded: true }),
      collapseResponse: () => set({ responseExpanded: false }),
      setResizing: (isResizing) => set({ isResizing }),
    }),
    {
      name: 'forgeq-layout',
      storage: createJSONStorage(() => ({
        getItem: async (n) => (await idbGet<string>(n)) ?? null,
        setItem: async (n, v) => {
          await idbSet(n, v);
        },
        removeItem: async (n) => {
          await idbDel(n);
        },
      })),
      // Never persist transient drag flag.
      partialize: (s) => {
        const { isResizing: _ig, ...rest } = s;
        return rest as LayoutState;
      },
    },
  ),
);
