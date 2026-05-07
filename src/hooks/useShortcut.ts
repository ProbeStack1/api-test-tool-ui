/**
 * useShortcut — bind a callback to a user-configurable keyboard combo.
 *
 * Usage:
 *   useShortcut('command-palette', () => openPalette());
 *
 * The combo string is read live from `useSettings().shortcuts[action]`.
 * Format: "mod+Shift+K" — `mod` resolves to ⌘ on macOS, Ctrl elsewhere.
 * Keys: single chars (a-z, 0-9, `,`, `.`), or named keys
 *       (Enter, Escape, Tab, ArrowUp/Down/Left/Right, Space, Backspace, …).
 *
 * The hook ignores the combo when focus is inside an input/textarea/
 * contenteditable, *unless* the combo includes `mod` (so ⌘+S works
 * even while typing).
 */
import { useEffect } from 'react';
import { useSettings } from '@/stores/settings.store';

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/i.test(navigator.platform);

export interface ParsedCombo {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  key: string; // lowercase, "enter" / "escape" / "k" / "," etc.
}

export function parseCombo(combo: string): ParsedCombo | null {
  if (!combo) return null;
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  let mod = false, shift = false, alt = false;
  let key = '';
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (lower === 'mod' || lower === 'ctrl' || lower === 'cmd' || lower === 'meta') mod = true;
    else if (lower === 'shift') shift = true;
    else if (lower === 'alt' || lower === 'option') alt = true;
    else key = lower;
  }
  if (!key) return null;
  return { mod, shift, alt, key };
}

const matches = (e: KeyboardEvent, c: ParsedCombo): boolean => {
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  if (c.mod !== modPressed) return false;
  if (c.shift !== e.shiftKey) return false;
  if (c.alt !== e.altKey) return false;
  // Map browser key value to our canonical lowercase. e.key is already
  // a character for printable keys ("k", ","), and "Enter"/"Escape"/etc.
  const evKey = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  return evKey === c.key;
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
};

/** Format a combo string for display: "mod+k" → "⌘ K" / "Ctrl+K". */
export function formatCombo(combo: string): string {
  const c = parseCombo(combo);
  if (!c) return '—';
  const parts: string[] = [];
  if (c.mod) parts.push(isMac ? '⌘' : 'Ctrl');
  if (c.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (c.alt) parts.push(isMac ? '⌥' : 'Alt');
  const keyMap: Record<string, string> = {
    enter: '↵', escape: 'Esc', arrowup: '↑', arrowdown: '↓',
    arrowleft: '←', arrowright: '→', ' ': 'Space', space: 'Space',
    backspace: '⌫', delete: 'Del',
  };
  parts.push((keyMap[c.key] ?? c.key).toUpperCase());
  return isMac ? parts.join(' ') : parts.join('+');
}

export function useShortcut(actionId: string, callback: (e: KeyboardEvent) => void): void {
  const combo = useSettings((s) => s.shortcuts[actionId]);

  useEffect(() => {
    const parsed = parseCombo(combo);
    if (!parsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (!matches(e, parsed)) return;
      if (!parsed.mod && isTypingTarget(e.target)) return;
      e.preventDefault();
      callback(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, callback]);
}
