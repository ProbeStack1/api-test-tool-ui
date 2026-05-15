/**
 * Settings Page — spacious Postman-style preferences.
 *
 * Layout:
 *   ┌──────────────────────┬────────────────────────────────────────┐
 *   │ [←] Settings         │   <selected section, full-width card>   │
 *   │  Appearance          │                                         │
 *   │  Colors              │                                         │
 *   │  Layout              │                                         │
 *   │  Editor              │                                         │
 *   │  Request             │                                         │
 *   │  Shortcuts           │                                         │
 *   │  Data                │                                         │
 *   └──────────────────────┴────────────────────────────────────────┘
 *
 * All toggles use the reusable <Toggle /> primitive.
 * Colors tab lets the user pick primary/secondary brand colors per theme.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Palette, Paintbrush, Layout as LayoutIcon,
  Code2, Send, Keyboard, Database, Plug, Globe2,
} from 'lucide-react';
import { useSettings } from '@/stores/settings.store';
import { useLayout } from '@/stores/layout.store';
import { useTheme } from '@/stores/theme.store';
import { Button } from '@/components/ui/Button';
import { Fieldset } from '@/components/ui/Fieldset';
import { Toggle } from '@/components/ui/Toggle';
import { SettingsTab as McpStudioSettingsPanel } from '@/components/integrations/tabs/SettingsTab';
import { COMMON_TIMEZONES, fmtDateTime } from '@/lib/timezone';
import { useGlobalTimezone } from '@/hooks/useGlobalTimezone';
import { cn } from '@/utils/cn';
import { formatCombo } from '@/hooks/useShortcut';

type TabKey =
  | 'appearance'
  | 'colors'
  | 'layout'
  | 'editor'
  | 'request'
  | 'shortcuts'
  | 'data'
  | 'display'
  | 'mcp';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'colors',     label: 'Colors',     icon: Paintbrush },
  { key: 'layout',     label: 'Layout',     icon: LayoutIcon },
  { key: 'display',    label: 'Display',    icon: Globe2 },
  { key: 'editor',     label: 'Editor',     icon: Code2 },
  { key: 'request',    label: 'Request',    icon: Send },
  { key: 'shortcuts',  label: 'Shortcuts',  icon: Keyboard },
  { key: 'data',       label: 'Data',       icon: Database },
  { key: 'mcp',        label: 'MCP',        icon: Plug },
];

export const SettingsPage = () => {
  const [tab, setTab] = useState<TabKey>('appearance');
  const nav = useNavigate();

  return (
    <div data-testid="settings-page" className="flex h-full min-h-0">
      {/* Left sidebar rail — w-72 to match other pages */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-sm font-semibold text-text-primary">Settings</h1>
          <button
            data-testid="settings-back"
            onClick={() => nav(-1)}
            title="Back"
            aria-label="Back"
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav className="flex-1 p-2">
          <ul className="space-y-0.5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <li key={key}>
                <button
                  data-testid={`settings-tab-${key}`}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                    tab === key
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main panel — spacious, no artificial max-width */}
      <section className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-8 py-8">
          {tab === 'appearance' && <AppearancePanel />}
          {tab === 'colors'     && <ColorsPanel />}
          {tab === 'layout'     && <LayoutPanel />}
          {tab === 'editor'     && <EditorPanel />}
          {tab === 'request'    && <RequestPanel />}
          {tab === 'shortcuts'  && <ShortcutsPanel />}
          {tab === 'data'       && <DataPanel />}
          {tab === 'display'    && <DisplayPanel />}
          {tab === 'mcp'        && <McpPanel />}
        </div>
      </section>
    </div>
  );
};

/* ───── Primitives ───── */

const Row = ({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-6 py-2">
    <div>
      <div className="text-sm text-text-primary">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-text-secondary">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

function Seg<T extends string>({
  value, options, onChange, testIdPrefix,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-probestack-bg p-0.5">
      {options.map((o) => (
        <button
          key={o}
          data-testid={`${testIdPrefix}-${o}-btn`}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-[5px] px-3 py-1 text-xs font-medium transition-colors capitalize',
            value === o ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ───── Panels ───── */

const AppearancePanel = () => {
  const s = useSettings();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Appearance</h2>
        <p className="mt-1 text-xs text-text-secondary">Theme, density, and base typography.</p>
      </header>
      <Fieldset label="Theme" testId="settings-fs-theme">
        <Row label="Theme mode" hint="Light or dark base theme. Individual brand colors are in the Colors tab.">
          <Seg value={s.theme} options={['dark', 'light'] as const} onChange={s.setTheme} testIdPrefix="theme" />
        </Row>
      </Fieldset>
      <Fieldset label="Density" testId="settings-fs-density">
        <Row label="Interface density" hint="Affects paddings and row heights.">
          <Seg value={s.density} options={['compact', 'cozy', 'spacious'] as const} onChange={s.setDensity} testIdPrefix="density" />
        </Row>
      </Fieldset>
      <Fieldset label="Typography" testId="settings-fs-typography">
        <Row label="Base font size" hint="Drives every text size in the app — xs · sm · base · lg · xl · 2xl scale proportionally. Range 12–16 is the sweet spot.">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="font-size-dec"
              disabled={s.fontSize <= 12}
              onClick={() => s.update('fontSize', Math.max(12, s.fontSize - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-probestack-bg text-text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease font size"
            >−</button>
            <span data-testid="font-size-value" className="w-16 rounded border border-border bg-probestack-bg px-2 py-1 text-center font-mono text-sm">
              {s.fontSize}px
            </span>
            <button
              type="button"
              data-testid="font-size-inc"
              disabled={s.fontSize >= 16}
              onClick={() => s.update('fontSize', Math.min(16, s.fontSize + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-probestack-bg text-text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase font size"
            >+</button>
            <button
              type="button"
              data-testid="font-size-reset"
              onClick={() => s.update('fontSize', 14)}
              className="ml-2 h-8 rounded-md border border-border bg-transparent px-2 text-[11px] text-text-secondary hover:bg-hover hover:text-text-primary"
            >Reset</button>
          </div>
        </Row>
        <div className="border-t border-border/60" />
        <div className="rounded-md border border-border bg-probestack-bg/40 p-3" data-testid="font-size-preview">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Live preview</div>
          <div className="text-2xl font-bold">Heading — H1 (text-2xl)</div>
          <div className="text-lg font-semibold">Sub-heading (text-lg)</div>
          <div className="text-base">Body text (text-base) — the quick brown fox jumps over the lazy dog.</div>
          <div className="text-sm text-text-secondary">Secondary (text-sm)</div>
          <div className="text-xs text-text-muted">Caption / micro-label (text-xs)</div>
        </div>
      </Fieldset>
    </div>
  );
};

const ColorsPanel = () => {
  const theme = useSettings((s) => s.theme);
  const { primary, secondary, setPrimary, setSecondary, reset } = useTheme();
  const active = theme === 'dark' ? 'dark' : 'light';
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Colors</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Customize the primary &amp; secondary brand colors for the <b className="capitalize">{active}</b> theme.
          Changes are applied instantly across the whole app.
        </p>
      </header>
      <Fieldset label={`Primary — ${active} theme`} testId="settings-fs-primary">
        <Row label="Primary color" hint="Drives buttons, active tabs, focus rings, and brand accents.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primary[active]}
              data-testid={`color-primary-${active}`}
              onChange={(e) => setPrimary(active, e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <code className="rounded border border-border bg-probestack-bg px-2 py-1 font-mono text-xs uppercase">
              {primary[active]}
            </code>
          </div>
        </Row>
      </Fieldset>
      <Fieldset label={`Secondary — ${active} theme`} testId="settings-fs-secondary">
        <Row label="Secondary color" hint="Used for muted highlights, chart accents, and hover overlays.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={secondary[active]}
              data-testid={`color-secondary-${active}`}
              onChange={(e) => setSecondary(active, e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <code className="rounded border border-border bg-probestack-bg px-2 py-1 font-mono text-xs uppercase">
              {secondary[active]}
            </code>
          </div>
        </Row>
      </Fieldset>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={reset} data-testid="colors-reset-btn">
          Reset to defaults
        </Button>
      </div>
    </div>
  );
};

const LayoutPanel = () => {
  const l = useLayout();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Layout</h2>
        <p className="mt-1 text-xs text-text-secondary">Panel visibility, widths, and overall shell configuration.</p>
      </header>
      <Fieldset label="Panels" testId="settings-fs-panels">
        <Row label="Left sidebar" hint="Collections / History / MCP / Mock / Testing / Dashboard">
          <Toggle value={l.showLeftSidebar} onChange={() => l.toggleLeft()} data-testid="toggle-left-sidebar" />
        </Row>
        <div className="border-t border-border/60" />
        <Row label="Right sidebar" hint="Project / Variables / cURL / AI">
          <Toggle value={l.showRightSidebar} onChange={() => l.toggleRight()} data-testid="toggle-right-sidebar" />
        </Row>
      </Fieldset>
      <Fieldset label="Widths" testId="settings-fs-widths">
        <Row label="Left sidebar width" hint={`${l.leftSidebarWidth}px`}>
          <input
            type="range" min={220} max={520} step={10}
            value={l.leftSidebarWidth}
            onChange={(e) => l.setLeftSidebarWidth(Number(e.target.value))}
            data-testid="left-width-range"
            className="w-48 accent-[var(--color-primary)]"
          />
        </Row>
        <div className="border-t border-border/60" />
        <Row label="Right panel width" hint={`${l.rightPanelWidth}px`}>
          <input
            type="range" min={280} max={640} step={10}
            value={l.rightPanelWidth}
            onChange={(e) => l.setRightPanelWidth(Number(e.target.value))}
            data-testid="right-width-range"
            className="w-48 accent-[var(--color-primary)]"
          />
        </Row>
      </Fieldset>
    </div>
  );
};

const EditorPanel = () => {
  const s = useSettings();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Editor</h2>
        <p className="mt-1 text-xs text-text-secondary">Monaco-based editor options.</p>
      </header>
      <Fieldset label="Display" testId="settings-fs-editor-display">
        <Row label="Word wrap"><Toggle value={s.editorWordWrap} onChange={(v) => s.update('editorWordWrap', v)} data-testid="toggle-wordwrap" /></Row>
        <div className="border-t border-border/60" />
        <Row label="Line numbers"><Toggle value={s.editorLineNumbers} onChange={(v) => s.update('editorLineNumbers', v)} data-testid="toggle-linenum" /></Row>
        <div className="border-t border-border/60" />
        <Row label="Minimap"><Toggle value={s.editorMinimap} onChange={(v) => s.update('editorMinimap', v)} data-testid="toggle-minimap" /></Row>
      </Fieldset>
      <Fieldset label="Formatting" testId="settings-fs-editor-format">
        <Row label="Tab size" hint={`${s.editorTabSize} spaces`}>
          <input
            type="range" min={2} max={8} step={2}
            value={s.editorTabSize}
            onChange={(e) => s.update('editorTabSize', Number(e.target.value))}
            data-testid="tabsize-range"
            className="w-48 accent-[var(--color-primary)]"
          />
        </Row>
        <div className="border-t border-border/60" />
        <Row label="Editor font size" hint={`${s.editorFontSize}px`}>
          <input
            type="range" min={11} max={18} step={1}
            value={s.editorFontSize}
            onChange={(e) => s.update('editorFontSize', Number(e.target.value))}
            data-testid="editor-font-size-range"
            className="w-48 accent-[var(--color-primary)]"
          />
        </Row>
      </Fieldset>
      <Fieldset label="AI Copilot" testId="settings-fs-editor-ai">
        <Row
          label="Inline suggestions"
          hint="Ghost-text completions while you type in body / scripts. Press Tab to accept."
        >
          <Toggle
            value={s.aiCopilotEnabled}
            onChange={(v) => s.update('aiCopilotEnabled', v)}
            data-testid="toggle-ai-copilot"
          />
        </Row>
        <div className="border-t border-border/60" />
        <Row
          label="Generate from comment"
          hint={`Type "// generate: <intent>" then ${s.aiGenerateShortcut.replace('mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')} to draft a body. Lets you describe the request in plain English.`}
        >
          <Toggle
            value={s.aiGenerateFromCommentEnabled}
            onChange={(v) => s.update('aiGenerateFromCommentEnabled', v)}
            data-testid="toggle-ai-generate-comment"
          />
        </Row>
        <div className="border-t border-border/60" />
        <Row
          label="Generate shortcut"
          hint="Pressed inside the body editor to fire the AI generator."
        >
          <Seg
            value={s.aiGenerateShortcut}
            options={['mod+Enter', 'mod+Shift+Enter', 'mod+G'] as const}
            onChange={(v) => s.update('aiGenerateShortcut', v)}
            testIdPrefix="ai-shortcut"
          />
        </Row>
      </Fieldset>
    </div>
  );
};

const RequestPanel = () => {
  const s = useSettings();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Request</h2>
        <p className="mt-1 text-xs text-text-secondary">Auto-save and sidebar behaviour for the request builder.</p>
      </header>
      <Fieldset label="Editor behaviour" testId="settings-fs-req-behaviour">
        <Row label="Auto-save edits" hint="Save the active request a few seconds after the last edit.">
          <Toggle value={s.autoSaveEnabled} onChange={(v) => s.update('autoSaveEnabled', v)} data-testid="toggle-autosave" />
        </Row>
        <div className="border-t border-border/60" />
        <Row label="Auto-save delay" hint={`${(s.autoSaveDelayMs / 1000).toFixed(1)}s after the last keystroke`}>
          <input
            type="range" min={1000} max={5000} step={250}
            value={s.autoSaveDelayMs}
            onChange={(e) => s.update('autoSaveDelayMs', Number(e.target.value))}
            disabled={!s.autoSaveEnabled}
            data-testid="autosave-delay-range"
            className="w-48 accent-[var(--color-primary)] disabled:opacity-50"
          />
        </Row>
        <div className="border-t border-border/60" />
        <Row label="Auto-expand sidebar" hint="When a request opens, expand its parent collection and folder.">
          <Toggle value={s.autoExpandSidebar} onChange={(v) => s.update('autoExpandSidebar', v)} data-testid="toggle-auto-expand" />
        </Row>
      </Fieldset>
      <Fieldset label="History" testId="settings-fs-req-history">
        <Row label="Max history items" hint="Older entries are pruned in IndexedDB">
          <input
            type="number" min={50} max={5000} step={50}
            value={s.maxHistoryItems}
            onChange={(e) => s.update('maxHistoryItems', Number(e.target.value))}
            data-testid="max-history-input"
            className="h-9 w-32 rounded-md border border-border bg-probestack-bg px-2 text-sm"
          />
        </Row>
      </Fieldset>
    </div>
  );
};

/** Editable shortcuts. Only the four actions wired to GlobalShortcuts are
 *  rebindable today; the rest are display-only until they get a hook. */
const REBINDABLE_SHORTCUTS: { actionId: string; label: string; testId: string }[] = [
  { actionId: 'command-palette',  label: 'Command palette',  testId: 'palette' },
  { actionId: 'focus-url',        label: 'Focus URL bar',    testId: 'focus-url' },
  { actionId: 'open-settings',    label: 'Open settings',    testId: 'settings' },
  { actionId: 'toggle-left-bar',  label: 'Toggle left sidebar', testId: 'toggle-left' },
  { actionId: 'send-request',     label: 'Send request',     testId: 'send' },
  { actionId: 'save-request',     label: 'Save request',     testId: 'save' },
];

const READONLY_SHORTCUTS = [
  { action: 'New tab', keys: '⌘/Ctrl + T', testId: 'new-tab' },
  { action: 'Close tab', keys: '⌘/Ctrl + W', testId: 'close-tab' },
  { action: 'Next tab', keys: '⌘/Ctrl + →', testId: 'next-tab' },
  { action: 'Previous tab', keys: '⌘/Ctrl + ←', testId: 'prev-tab' },
  { action: 'Toggle right sidebar', keys: '⌘/Ctrl + Alt + B', testId: 'toggle-right' },
  { action: 'Toggle bottom panel', keys: '⌘/Ctrl + J', testId: 'toggle-bottom' },
];

/** Captures the next keypress and returns the canonical "mod+Shift+K" form. */
const ShortcutCapture = ({
  value, onChange, testId,
}: { value: string; onChange: (combo: string) => void; testId: string }) => {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore lone modifier keys.
      if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Shift' || e.key === 'Alt') return;
      e.preventDefault();
      e.stopPropagation();
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('mod');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      // Use single-char keys as-is (lower); named keys get capitalized.
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      parts.push(k);
      onChange(parts.join('+'));
      setRecording(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [recording, onChange]);

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => setRecording((v) => !v)}
      className={cn(
        'inline-flex min-w-[110px] items-center justify-center rounded border px-2 py-0.5 font-mono text-[11px] transition-colors',
        recording
          ? 'border-warning bg-warning-muted text-warning animate-pulse'
          : 'border-border bg-probestack-bg text-text-secondary hover:border-accent hover:text-accent',
      )}
    >
      {recording ? 'Press keys…' : formatCombo(value)}
    </button>
  );
};

const ShortcutsPanel = () => {
  const shortcuts = useSettings((s) => s.shortcuts);
  const setShortcut = useSettings((s) => s.setShortcut);
  const resetShortcut = useSettings((s) => s.resetShortcut);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Keyboard shortcuts</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Click a shortcut to rebind. <kbd className="font-mono">mod</kbd> resolves to ⌘ on macOS, Ctrl elsewhere.
        </p>
      </header>

      <Fieldset label="Editable" testId="settings-fs-shortcuts-editable">
        <div className="divide-y divide-border/60">
          {REBINDABLE_SHORTCUTS.map((s) => (
            <div
              key={s.actionId}
              data-testid={`shortcut-${s.testId}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <span className="text-text-primary">{s.label}</span>
              <div className="flex items-center gap-2">
                <ShortcutCapture
                  value={shortcuts[s.actionId] ?? ''}
                  onChange={(combo) => setShortcut(s.actionId, combo)}
                  testId={`shortcut-capture-${s.testId}`}
                />
                <button
                  type="button"
                  onClick={() => resetShortcut(s.actionId)}
                  data-testid={`shortcut-reset-${s.testId}`}
                  className="text-[11px] text-text-muted hover:text-accent"
                  title="Reset to default"
                >
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      </Fieldset>

      <Fieldset label="Coming soon" testId="settings-fs-shortcuts-readonly">
        <div className="divide-y divide-border/60">
          {READONLY_SHORTCUTS.map((s) => (
            <div
              key={s.testId}
              data-testid={`shortcut-${s.testId}`}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-text-primary">{s.action}</span>
              <kbd className="rounded border border-border bg-probestack-bg px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </Fieldset>
    </div>
  );
};

const DataPanel = () => {
  const s = useSettings();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Data &amp; privacy</h2>
        <p className="mt-1 text-xs text-text-secondary">Telemetry and reset options.</p>
      </header>
      <Fieldset label="Privacy" testId="settings-fs-data-privacy">
        <Row label="Telemetry" hint="Anonymous usage data to improve the product.">
          <Toggle value={s.telemetryEnabled} onChange={(v) => s.update('telemetryEnabled', v)} data-testid="toggle-telemetry" />
        </Row>
      </Fieldset>
      <Fieldset label="Reset" testId="settings-fs-data-reset">
        <Row label="Reset all preferences" hint="Restores settings to defaults (does not affect requests).">
          <Button variant="destructive" size="sm" onClick={s.reset} data-testid="settings-reset-btn">
            Reset
          </Button>
        </Row>
      </Fieldset>
    </div>
  );
};

/* ─── MCP Studio settings (moved out of the MCP page so all preferences live here). */
const McpPanel = () => (
  <div className="space-y-4" data-testid="settings-mcp-panel">
    <header>
      <h2 className="text-xl font-bold tracking-tight">MCP Studio</h2>
      <p className="mt-1 text-xs text-text-secondary">
        LLM provider, auto-connect, fallback banner, and telemetry consent for the MCP Studio.
      </p>
    </header>
    {/* Reuse the existing MCP Studio settings panel — it already handles
        load / save against /api/v1/requests/mcp/settings. We strip its
        outer max-w padding by wrapping in a no-margin shell. */}
    <div className="-mx-6 -my-6 [&_[data-testid=mcp-settings-tab]]:max-w-none [&_[data-testid=mcp-settings-tab]]:p-0">
      <McpStudioSettingsPanel />
    </div>
  </div>
);

/* ───── Display panel ───────────────────────────────────────────────
 * Global UX preferences that affect how data is rendered across the
 * whole app. Today we only host the timezone picker here, which feeds
 * every `fmtDateTime / fmtRelative / fmtDate` call.
 * ────────────────────────────────────────────────────────────────── */
const DisplayPanel = () => {
  const [zone, setZone] = useGlobalTimezone();
  const now = new Date();
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-6" data-testid="settings-display-panel">
      <header className="mb-5 border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight">Display</h2>
        <p className="mt-1 text-xs text-text-secondary">
          How dates, times, and units are rendered throughout the app.
        </p>
      </header>

      <Fieldset label="Timezone">
        <p className="mb-3 text-[11px] text-text-secondary">
          All run history, audit logs and KPIs across the app respect this setting. Defaults to your browser's local time.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            data-testid="settings-timezone-select"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="h-9 rounded-md border border-border bg-probestack-bg px-3 text-sm outline-none focus:border-primary"
          >
            {/* If the user is already on a non-listed zone (e.g. their browser
                returned `America/Toronto` and that's not in COMMON_TIMEZONES),
                show it as the first option so the select still reflects reality. */}
            {!COMMON_TIMEZONES.some((z) => z.id === zone) && (
              <option value={zone}>{zone} (current)</option>
            )}
            {COMMON_TIMEZONES.map((z) => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </select>
          <span className="rounded-md border border-border bg-elevated/40 px-3 py-1.5 font-mono text-xs text-text-secondary">
            Preview: <b data-testid="settings-timezone-preview">{fmtDateTime(now, zone)}</b>
          </span>
        </div>
      </Fieldset>
    </div>
  );
};

