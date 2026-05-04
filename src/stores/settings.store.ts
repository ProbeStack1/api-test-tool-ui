/**
 * Settings store — user-controllable preferences (Postman-grade).
 * What : Holds every toggle the Settings page exposes.
 * Why  : Single slice, IndexedDB persisted, reactive across the whole app.
 * Usage: `const theme = useSettings(s => s.theme)`
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type PersistStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'cozy' | 'spacious';

export interface SettingsState {
  // Appearance
  theme: Theme;
  density: Density;
  fontSize: number; // 12–18
  editorFontSize: number;
  editorFontFamily: string;
  // Layout
  sidebarWidth: number;
  bottomPanelHeight: number;
  showSideRail: boolean;
  showStatusBar: boolean;
  // Editor
  editorWordWrap: boolean;
  editorLineNumbers: boolean;
  editorMinimap: boolean;
  editorTabSize: number;
  editorFormatOnSave: boolean;
  // Request defaults
  requestTimeout: number;
  followRedirects: boolean;
  verifySsl: boolean;
  maxHistoryItems: number;
  // Onboarding
  onboardingCompleted: boolean;
  // Privacy
  telemetryEnabled: boolean;
  // Request builder behaviour
  autoSaveEnabled: boolean;
  /** Auto-save delay after last edit (ms, 1000–5000). */
  autoSaveDelayMs: number;
  /** Auto-expand sidebar to the active request's collection/folder. */
  autoExpandSidebar: boolean;
  /** Active environment id (Postman-parity — picker in header reads this). */
  activeEnvId: string | null;
  /** Code-snippet panel: show `{{var}}` placeholders vs resolve them. */
  snippetVariableMode: 'show' | 'resolve';
  /** When true, Monaco surfaces inline AI ghost-text suggestions while
   *  the user is typing in body / scripts / URL. Defaults to true. */
  aiCopilotEnabled: boolean;
  /** When true, the body editor turns `// generate: …` comments + a
   *  shortcut press into a full body via the AI service. */
  aiGenerateFromCommentEnabled: boolean;
  /** Keyboard shortcut that fires the AI generator. `mod` resolves to
   *  ⌘ on Mac and Ctrl elsewhere. */
  aiGenerateShortcut: 'mod+Enter' | 'mod+Shift+Enter' | 'mod+G';

  // Actions
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  setActiveEnvId: (id: string | null) => void;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
}

const DEFAULTS = {
  theme: 'dark' as Theme,
  density: 'cozy' as Density,
  fontSize: 14,
  editorFontSize: 13,
  editorFontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
  sidebarWidth: 280,
  bottomPanelHeight: 320,
  showSideRail: true,
  showStatusBar: true,
  editorWordWrap: true,
  editorLineNumbers: true,
  editorMinimap: false,
  editorTabSize: 2,
  editorFormatOnSave: true,
  requestTimeout: 30_000,
  followRedirects: true,
  verifySsl: true,
  maxHistoryItems: 500,
  onboardingCompleted: false,
  telemetryEnabled: true,
  autoSaveEnabled: false,
  autoSaveDelayMs: 2000,
  autoExpandSidebar: true,
  activeEnvId: null as string | null,
  aiCopilotEnabled: true,
  aiGenerateFromCommentEnabled: true,
  aiGenerateShortcut: 'mod+Enter' as 'mod+Enter' | 'mod+Shift+Enter' | 'mod+G',
  snippetVariableMode: 'show' as 'show' | 'resolve',
};

// Custom storage adapter backed by IndexedDB (via idb-keyval).
const idbStorage: PersistStorage<SettingsState> = {
  getItem: async (name) => {
    const value = await idbGet<string>(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: async (name, value) => {
    await idbSet(name, JSON.stringify(value));
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setActiveEnvId: (activeEnvId) => set({ activeEnvId }),
      update: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'forgeq-settings',
      storage: createJSONStorage(() => ({
        getItem: async (n) => (await idbGet<string>(n)) ?? null,
        setItem: async (n, v) => {
          await idbSet(n, v);
        },
        removeItem: async (n) => {
          await idbDel(n);
        },
      })),
    },
  ),
);

// Apply theme + font-size to <html> whenever settings change.
if (typeof document !== 'undefined') {
  const apply = (s: SettingsState) => {
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--font-size-base', `${s.fontSize}px`);
    document.documentElement.setAttribute('data-density', s.density);
  };
  apply(useSettings.getState());
  useSettings.subscribe(apply);
}

// Silences the unused storage adapter (kept in file for future migration).
void idbStorage;
