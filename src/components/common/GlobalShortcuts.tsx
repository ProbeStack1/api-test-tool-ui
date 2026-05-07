/**
 * GlobalShortcuts — listens for app-wide hotkeys and triggers the
 * corresponding action. Mounted once at the app shell so the bindings
 * are live everywhere.
 *
 * Wires (defaults; user-rebindable in Settings → Shortcuts):
 *   command-palette  → ⌘K   focus the inline command-palette input
 *   focus-url        → ⌘L   focus the URL bar of the active request tab
 *   open-settings    → ⌘,   navigate to /projects/settings
 *   toggle-left-bar  → ⌘B   toggle the collections sidebar
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShortcut } from '@/hooks/useShortcut';
import { useLayout } from '@/stores/layout.store';

const focusBySelector = (selector: string) => {
  const el = document.querySelector<HTMLElement>(selector);
  if (el) {
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }
};

export const GlobalShortcuts = () => {
  const navigate = useNavigate();
  const toggleLeft = useLayout((s) => s.toggleLeft);

  useShortcut('command-palette', useCallback(() => {
    focusBySelector('[data-testid="command-palette-input"]');
  }, []));

  useShortcut('focus-url', useCallback(() => {
    focusBySelector('[data-testid="url-input"]');
  }, []));

  useShortcut('open-settings', useCallback(() => {
    navigate('/projects/settings');
  }, [navigate]));

  useShortcut('toggle-left-bar', useCallback(() => {
    toggleLeft();
  }, [toggleLeft]));

  return null;
};
