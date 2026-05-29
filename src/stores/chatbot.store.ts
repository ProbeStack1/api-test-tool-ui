/**
 * Global state for the FloatingChatbot.
 *
 *   • {@code mode}             — 'guide' | 'error'
 *   • {@code isOpen}           — drawer expanded vs FAB collapsed
 *   • {@code errorPayload}     — captured request/response error context
 *                                 (auto-clears on close + on next send)
 *   • {@code messages}         — in-memory chat history; lives only as long
 *                                 as the user keeps the chatbot in view —
 *                                 navigating between routes preserves it,
 *                                 explicit Reset / Clear wipes it.
 *
 * The chatbot is intentionally NOT persisted to localStorage so that
 * error analyses don't haunt the user across sessions.
 */
import { create } from 'zustand';

export interface ErrorPayload {
  method?: string;
  url?: string;
  statusCode?: number;
  statusText?: string;
  durationMs?: number;
  headers?: Array<{ name: string; value: string }>;
  body?: string;
  errorMessage?: string;
  /** Where in the app the error happened. */
  location?: string;
}

export interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  error?: string;
}

interface ChatbotState {
  isOpen: boolean;
  mode: 'guide' | 'error';
  errorPayload: ErrorPayload | null;
  messages: ChatbotMessage[];

  open: () => void;
  close: () => void;
  toggle: () => void;

  /** Triggered when an HTTP error happens — auto-opens, switches mode. */
  triggerError: (p: ErrorPayload) => void;
  /** User dismissed / next request started — reset to guide mode. */
  clearError: () => void;

  /** Mutators for the chat history. */
  appendMessage: (m: ChatbotMessage) => void;
  patchMessage: (id: string, patch: Partial<ChatbotMessage>) => void;
  resetChat: () => void;
}

export const useChatbot = create<ChatbotState>((set) => ({
  isOpen: false,
  mode: 'guide',
  errorPayload: null,
  messages: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  triggerError: (p) =>
    set({
      isOpen: true,
      mode: 'error',
      errorPayload: p,
      /* New error → fresh transcript with a friendly, non-pushy prompt.
       * The UI will render a Yes/No pair below this bubble so the user
       * can opt-in to a full analysis instead of auto-sending one. */
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            `**An error was detected** — \`${(p.method ?? '').toString().toUpperCase()} ${p.url ?? ''}\`` +
            (p.statusCode ? ` → **${p.statusCode} ${p.statusText ?? ''}**` : '') +
            `.\n\nWould you like me to analyse the failure and suggest a fix?`,
        },
      ],
    }),
  clearError: () => set({ mode: 'guide', errorPayload: null, messages: [] }),

  appendMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  patchMessage: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  resetChat: () => set({ messages: [] }),
}));
