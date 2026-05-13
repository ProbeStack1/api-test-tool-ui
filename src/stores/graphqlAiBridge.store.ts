/**
 * graphqlAiBridge.store — small singleton that hands GraphQL prompts
 * from the body-toolbar's "AI Build" button to the right-rail AI tab.
 *
 *   - body toolbar calls `requestBuild({ schemaSdl, onInsert })`
 *   - the right-rail AI tab subscribes to this store, detects the
 *     `pending` flag, switches its own UI into "GraphQL mode", prefills
 *     a starter prompt, and on every assistant reply offers an
 *     "Insert into editor" button that calls back into `onInsert`.
 *
 * Keeping this tiny + UI-agnostic means the same bridge can power
 * other surfaces (e.g. the URL bar's AI Compose, the Tests tab's AI
 * Generate) without ever opening a modal.
 */
import { create } from 'zustand';

interface BridgeState {
  /** Set to `true` while the AI tab should treat itself as GraphQL-focused. */
  pending: boolean;
  /** SDL summary of the active request's introspected schema (if any). */
  schemaSdl: string;
  /** Called with the chosen GraphQL operation string when the user
   *  clicks "Insert into editor" on an assistant message. */
  onInsert: ((query: string) => void) | null;
  /** Bumped whenever a new request is opened — used by the AI tab to
   *  reset its scratch prompt when the body editor swaps. */
  cycle: number;
  requestBuild: (args: { schemaSdl: string; onInsert: (q: string) => void }) => void;
  clear: () => void;
}

export const useGraphqlAiBridge = create<BridgeState>((set) => ({
  pending: false,
  schemaSdl: '',
  onInsert: null,
  cycle: 0,
  requestBuild: ({ schemaSdl, onInsert }) =>
    set((s) => ({ pending: true, schemaSdl, onInsert, cycle: s.cycle + 1 })),
  clear: () => set({ pending: false, schemaSdl: '', onInsert: null }),
}));
