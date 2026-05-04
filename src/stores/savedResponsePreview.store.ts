/**
 * Saved-response preview store — when a user clicks a saved response
 * in the sidebar, we shove it here. The active RequestBuilderPage
 * subscribes and renders it inside the response panel without
 * disturbing the live runtime result.
 */
import { create } from 'zustand';
import type { SavedResponse } from '@/services/request.service';

interface State {
  preview: { requestId: string; saved: SavedResponse } | null;
  show: (requestId: string, saved: SavedResponse) => void;
  clear: () => void;
}

export const useSavedResponsePreview = create<State>((set) => ({
  preview: null,
  show: (requestId, saved) => set({ preview: { requestId, saved } }),
  clear: () => set({ preview: null }),
}));
