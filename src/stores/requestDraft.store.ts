/**
 * Current-request draft snapshot store — a thin, serialisable mirror of
 * whatever request the RequestBuilder (or any adhoc editor) currently has
 * open. The right-rail CodeSnippetPanel subscribes to it so the generated
 * cURL / language snippet stays in sync with the live editor — edit the
 * URL in the builder, watch the snippet regenerate instantly.
 *
 * Design:
 *  - The BUILDER writes (via `setSnapshot`) on every keystroke (debounced
 *    at the caller's discretion).
 *  - The SIDEBAR reads, generates code via httpsnippet-lite, and displays
 *    it with CodeMirror syntax highlighting.
 *  - When the user edits the cURL inside the sidebar, `setSnapshot` is
 *    called back with a parsed HAR so the builder reflects the change.
 *    Other languages are regenerate-only (parsing-back is too unreliable).
 *
 * The shape mirrors an HAR-like subset so httpsnippet-lite can consume it
 * directly without further transformation.
 */
import { create } from 'zustand';

export interface DraftKV { name: string; value: string; enabled?: boolean }
export interface DraftSnapshot {
  /** Surface id — e.g. 'request-builder' / 'mock' / 'mcp' / null = none open. */
  source: 'request-builder' | 'mock' | 'mcp' | 'public-hub' | null;
  id: string | null;           // request id (persisted or adhoc 't…')
  name?: string;
  method: string;              // GET / POST / ...
  url: string;                 // full URL with unresolved {{vars}} is OK
  queryParams: DraftKV[];
  headers: DraftKV[];
  /** "none" | "json" | "text" | "form-urlencoded" | "multipart" | "raw" */
  bodyKind: 'none' | 'json' | 'text' | 'form-urlencoded' | 'multipart' | 'raw';
  bodyText?: string;           // for json/text/raw
  bodyForm?: DraftKV[];        // for form-urlencoded / multipart
}

interface DraftState {
  current: DraftSnapshot;
  /** One-shot handoff bucket — a *different* surface (e.g. the History
   * page's "Edit & Try") drops a full snapshot here before navigating
   * to the request-builder. The builder picks it up on mount, applies
   * it to its local state, then clears the slot so a later tab-switch
   * doesn't re-apply stale data. Without this bucket the builder's own
   * per-keystroke `setSnapshot` was clobbering the handoff before the
   * page could read it — visible as "try flashes for a moment then
   * lands on empty builder". */
  pendingHandoff: Partial<DraftSnapshot> | null;
  setSnapshot: (patch: Partial<DraftSnapshot>) => void;
  clear: () => void;
  stashHandoff: (snap: Partial<DraftSnapshot>) => void;
  consumeHandoff: () => Partial<DraftSnapshot> | null;
}

const empty: DraftSnapshot = {
  source: null, id: null, method: 'GET', url: '',
  queryParams: [], headers: [], bodyKind: 'none',
};

export const useRequestDraftStore = create<DraftState>((set, get) => ({
  current: empty,
  pendingHandoff: null,
  setSnapshot: (patch) => set((s) => ({ current: { ...s.current, ...patch } })),
  clear: () => set({ current: empty }),
  stashHandoff: (snap) => set({ pendingHandoff: snap }),
  consumeHandoff: () => {
    const p = get().pendingHandoff;
    if (p) set({ pendingHandoff: null });
    return p;
  },
}));

/** Convenience selector — returns `null` when there's nothing to show. */
export const selectActiveDraft = (s: DraftState): DraftSnapshot | null =>
  s.current.source ? s.current : null;
