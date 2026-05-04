/**
 * Theme color store — user-customizable primary & secondary colors per base theme.
 *
 * How it works:
 *  - We persist { primary: { dark, light }, secondary: { dark, light } } to IndexedDB.
 *  - On every change (and on app boot) we derive a small palette from the
 *    chosen color (hover, muted) and push CSS variables onto <html>.
 *  - Because the shell already consumes `var(--color-primary)` everywhere,
 *    the whole app re-colors instantly.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { useSettings } from './settings.store';

type Mode = 'dark' | 'light';

const DEFAULTS = {
  primary: {
    dark: '#ff5b1f',
    light: '#ff5b1f',
  } as Record<Mode, string>,
  secondary: {
    dark: '#1fbf9a',
    light: '#0ea5e9',
  } as Record<Mode, string>,
};

export interface ThemeState {
  primary: Record<Mode, string>;
  secondary: Record<Mode, string>;
  setPrimary: (mode: Mode, hex: string) => void;
  setSecondary: (mode: Mode, hex: string) => void;
  reset: () => void;
}

/* ── color helpers ── */
const hexToRgb = (hex: string) => {
  const m = hex.replace('#', '');
  const h = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const mix = (hex: string, amount: number) => {
  // amount > 0 lightens, < 0 darkens
  const { r, g, b } = hexToRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const nr = Math.round((t - r) * p + r);
  const ng = Math.round((t - g) * p + g);
  const nb = Math.round((t - b) * p + b);
  return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const applyPalette = (mode: Mode, primary: string, secondary: string) => {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  // Only apply variables matching the currently-active theme.
  if (el.getAttribute('data-theme') !== mode) return;
  el.style.setProperty('--color-primary', primary);
  el.style.setProperty('--color-primary-hover', mix(primary, 0.15));
  el.style.setProperty('--color-primary-light', mix(primary, 0.3));
  el.style.setProperty('--color-primary-muted', rgba(primary, mode === 'dark' ? 0.12 : 0.08));
  el.style.setProperty('--color-input-focus', primary);
  el.style.setProperty('--color-secondary', secondary);
  el.style.setProperty('--color-secondary-muted', rgba(secondary, 0.12));
};

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setPrimary: (mode, hex) =>
        set((s) => ({ primary: { ...s.primary, [mode]: hex } })),
      setSecondary: (mode, hex) =>
        set((s) => ({ secondary: { ...s.secondary, [mode]: hex } })),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'forgeq-theme',
      storage: createJSONStorage(() => ({
        getItem: async (n) => (await idbGet<string>(n)) ?? null,
        setItem: async (n, v) => { await idbSet(n, v); },
        removeItem: async (n) => { await idbDel(n); },
      })),
    },
  ),
);

/* Re-apply palette whenever the user toggles theme OR changes a color. */
if (typeof document !== 'undefined') {
  const apply = () => {
    const theme = useSettings.getState().theme;
    const { primary, secondary } = useTheme.getState();
    applyPalette(theme, primary[theme], secondary[theme]);
  };
  // apply once the theme variable (data-theme) has been set by settings store
  queueMicrotask(apply);
  useTheme.subscribe(apply);
  useSettings.subscribe(apply);
}
