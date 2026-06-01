/**
 * Terminal store — open/closed flag, drawer position (bottom | right),
 * size, and command history. Persisted to localStorage so toggle &
 * position survive page reloads. Command history is per-tab only
 * (sessionStorage equivalent in-memory).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TerminalPosition = 'bottom' | 'right';

export interface TerminalScrollLine {
  prompt?: string;
  level?: string;
  text: string;
  actionable?: { kind: string; raw: string; suggestion?: string };
  data?: Record<string, unknown>;
}

interface TerminalState {
  open: boolean;
  position: TerminalPosition;
  bottomHeight: number;   // px
  rightWidth: number;     // px

  /** session-only command history (newest last). */
  history: string[];
  lines: TerminalScrollLine[];

  toggle: () => void;
  setOpen: (v: boolean) => void;
  setPosition: (p: TerminalPosition) => void;
  setBottomHeight: (h: number) => void;
  setRightWidth: (w: number) => void;
  pushHistory: (line: string) => void;
  clearHistory: () => void;
  setLines: (lines: TerminalScrollLine[]) => void;
  appendLine: (line: TerminalScrollLine) => void;
  clearLines: () => void;
}

export const useTerminal = create<TerminalState>()(
  persist(
    (set, get) => ({
      open: false,
      position: 'bottom',
      bottomHeight: 320,
      rightWidth: 520,
      history: [],
      lines: [],
      toggle:           () => set({ open: !get().open }),
      setOpen:          (v) => set({ open: v }),
      setPosition:      (p) => set({ position: p }),
      setBottomHeight:  (h) => set({ bottomHeight: Math.max(160, Math.min(800, h)) }),
      setRightWidth:    (w) => set({ rightWidth: Math.max(320, Math.min(900, w)) }),
      pushHistory: (line) => {
        const h = get().history;
        if (!line.trim()) return;
        if (h[h.length - 1] === line) return;
        const next = [...h, line].slice(-200);
        set({ history: next });
      },
      clearHistory: () => set({ history: [] }),
      setLines: (lines) => set({ lines }),
      appendLine: (line) => set((state) => ({ lines: [...state.lines, line] })),
      clearLines: () => set({ lines: [] }),
    }),
    {
      name: 'forgeq:terminal',
      // History and live terminal state stay in memory only; size/position persist.
      partialize: (s) => ({
        open: s.open, position: s.position,
        bottomHeight: s.bottomHeight, rightWidth: s.rightWidth,
      }) as Partial<TerminalState>,
    },
  ),
);
