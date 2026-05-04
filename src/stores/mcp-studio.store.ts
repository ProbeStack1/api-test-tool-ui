/**
 * mcp-studio.store.ts — Zustand store for the MCP Studio.
 *
 * Drives sidebar navigation and active server selection WITHOUT touching
 * the URL. The user wanted a clean `/projects/mcp` route that never
 * grows query params, so all studio state lives here and persists to
 * localStorage so reloads keep their place.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StudioTab =
  | 'servers' | 'inspector' | 'collections'
  | 'mocks'   | 'rest'      | 'aigen'
  | 'history';

export type CatalogLicense    = 'ANY' | 'OPEN_SOURCE' | 'PROPRIETARY';
export type CatalogPricing    = 'ANY' | 'FREE' | 'FREEMIUM' | 'PAID';
export type CatalogVisibility = 'ANY' | 'PUBLIC' | 'RESTRICTED';
export type CatalogOfficial   = 'ANY' | 'OFFICIAL' | 'COMMUNITY';

interface McpStudioState {
  activeTab: StudioTab;
  activeServerId: string | null; // server connected to in Inspector
  serversFilter: 'ALL' | 'MINE' | 'CATALOG' | 'MOCKS';
  serversSearch: string;
  /* catalog facet filters (Postman-style chips) */
  catalogLicense: CatalogLicense;
  catalogPricing: CatalogPricing;
  catalogVisibility: CatalogVisibility;
  catalogOfficial: CatalogOfficial;
  catalogCategory: string | 'ALL';
  setTab: (t: StudioTab) => void;
  setActiveServer: (id: string | null) => void;
  setServersFilter: (f: McpStudioState['serversFilter']) => void;
  setServersSearch: (q: string) => void;
  setCatalogLicense:    (v: CatalogLicense) => void;
  setCatalogPricing:    (v: CatalogPricing) => void;
  setCatalogVisibility: (v: CatalogVisibility) => void;
  setCatalogOfficial:   (v: CatalogOfficial) => void;
  setCatalogCategory:   (v: string | 'ALL') => void;
  resetCatalogFilters:  () => void;
}

export const useMcpStudioStore = create<McpStudioState>()(
  persist(
    (set) => ({
      activeTab: 'servers',
      activeServerId: null,
      serversFilter: 'ALL',
      serversSearch: '',
      catalogLicense: 'ANY',
      catalogPricing: 'ANY',
      catalogVisibility: 'ANY',
      catalogOfficial: 'ANY',
      catalogCategory: 'ALL',
      setTab: (t) => set({ activeTab: t }),
      setActiveServer: (id) => set({ activeServerId: id }),
      setServersFilter: (f) => set({ serversFilter: f }),
      setServersSearch: (q) => set({ serversSearch: q }),
      setCatalogLicense:    (v) => set({ catalogLicense: v }),
      setCatalogPricing:    (v) => set({ catalogPricing: v }),
      setCatalogVisibility: (v) => set({ catalogVisibility: v }),
      setCatalogOfficial:   (v) => set({ catalogOfficial: v }),
      setCatalogCategory:   (v) => set({ catalogCategory: v }),
      resetCatalogFilters: () => set({
        catalogLicense: 'ANY', catalogPricing: 'ANY',
        catalogVisibility: 'ANY', catalogOfficial: 'ANY', catalogCategory: 'ALL',
      }),
    }),
    { 
      name: 'forgeq.mcp.studio',
      // Only persist the active-tab + active-server selection. Catalog
      // filter chips (license, pricing, visibility, official, category)
      // and ad-hoc search are session-local — persisting them caused
      // user-reported bug "sirf 2 server dikh rahe": stale filters from
      // a previous session masked most of the catalog after reload.
      partialize: (state) => ({
        activeTab: state.activeTab,
        activeServerId: state.activeServerId,
      }),
    },
  ),
);
