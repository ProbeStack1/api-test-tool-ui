
import { useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import Editor, { type OnMount, type OnChange, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { useSettings } from '@/stores/settings.store';
import { useVariableIndex } from '@/utils/variables';
import { fetchInlineCompletion } from '@/services/inlineCompletion.service';
import type { CodeLanguage } from './CodeEditor';

/**
 * Wire Monaco's web workers via Vite's `?worker` import so the whole
 * editor bundle ships from our own static assets — no CDN hop, works
 * offline, and survives proxies that block jsdelivr.
 */
if (typeof window !== 'undefined' && !(window as any).__monacoWorkersInstalled) {
  (window as any).MonacoEnvironment = {
    getWorker: (_id: string, label: string) => {
      if (label === 'json')                                return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };
  (window as any).__monacoWorkersInstalled = true;
}
// Register the locally-bundled Monaco instance with @monaco-editor/react so
// it doesn't try to pull from the AMD/CDN loader.
loader.config({ monaco });

/** Map our app language → Monaco language id. */
const LANG_MAP: Record<CodeLanguage, string> = {
  json: 'json', text: 'plaintext', javascript: 'javascript',
  xml: 'xml', html: 'html', yaml: 'yaml', shell: 'shell',
  graphql: 'graphql',
};

/** Resolve a CSS variable from `:root` to a hex/colour string Monaco can read. */
const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** Define both themes once globally so React.StrictMode double-mounts don't redefine. */
let themesRegistered = false;
const ensureThemes = (monaco: typeof import('monaco-editor'), forceReregister = false) => {
  if (themesRegistered && !forceReregister) return;
  themesRegistered = true;

  // Inject CSS once for the {{var}} inline decorations. Hex colours mirror
  // the palette used by VariableInput and CodeEditor (orange / yellow / red).
  if (typeof document !== 'undefined' && !document.getElementById('monaco-var-styles')) {
    const style = document.createElement('style');
    style.id = 'monaco-var-styles';
    style.textContent = `
      .mvar-active   { background-color: rgba(255,91,31,0.18) !important; color: #ff7a3a !important; border-radius: 2px; }
      .mvar-inactive { background-color: rgba(234,179,8,0.18) !important; color: #facc15 !important; border-radius: 2px; }
      .mvar-missing  { background-color: rgba(239,68,68,0.18) !important; color: #f87171 !important; border-radius: 2px; }
      /* Ensure background-color wins over Monaco's default token rule. */
      .monaco-editor .mvar-active,
      .monaco-editor .mvar-inactive,
      .monaco-editor .mvar-missing { padding: 0 1px; }
    `;
    document.head.appendChild(style);
  }

  monaco.editor.defineTheme('forgeq-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background':            cssVar('--color-probestack-bg', '#0b0e14'),
      'editor.foreground':            cssVar('--color-text-primary',  '#e2e8f0'),
      'editorLineNumber.foreground':  cssVar('--color-text-muted',    '#64748b'),
      'editorLineNumber.activeForeground': cssVar('--color-primary',  '#ff5b1f'),
      'editorCursor.foreground':      cssVar('--color-primary',       '#ff5b1f'),
      /* Selection — soft tinted highlight (not a saturated primary block). */
      'editor.selectionBackground':           '#ff5b1f24',
      'editor.inactiveSelectionBackground':   '#ff5b1f12',
      'editor.selectionHighlightBackground':  '#ff5b1f14',
      'editor.wordHighlightBackground':       '#ff5b1f14',
      'editor.wordHighlightStrongBackground': '#ff5b1f1a',
      'editor.findMatchBackground':           '#ff5b1f33',
      'editor.findMatchHighlightBackground':  '#ff5b1f1a',
      'editor.lineHighlightBackground': cssVar('--color-hover',        '#1a1f29'),
      'editorIndentGuide.background1':cssVar('--color-border',        '#252a35'),
      'editorBracketMatch.background':cssVar('--color-elevated',      '#1f242e'),
      'editorBracketMatch.border':    cssVar('--color-primary',       '#ff5b1f'),
      'editorGutter.background':      cssVar('--color-probestack-bg', '#0b0e14'),
      'scrollbarSlider.background':   cssVar('--color-border',        '#252a35'),
      'scrollbarSlider.hoverBackground': cssVar('--color-text-muted', '#64748b'),
    },
  });
  monaco.editor.defineTheme('forgeq-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background':            cssVar('--color-probestack-bg', '#ffffff'),
      'editor.foreground':            cssVar('--color-text-primary',  '#0f172a'),
      'editorLineNumber.foreground':  cssVar('--color-text-muted',    '#94a3b8'),
      'editorLineNumber.activeForeground': cssVar('--color-primary',  '#ff5b1f'),
      'editorCursor.foreground':      cssVar('--color-primary',       '#ff5b1f'),
      /* Selection — soft tinted highlight in light mode too. */
      'editor.selectionBackground':           '#ff5b1f33',
      'editor.inactiveSelectionBackground':   '#ff5b1f1a',
      'editor.selectionHighlightBackground':  '#ff5b1f1f',
      'editor.wordHighlightBackground':       '#ff5b1f1f',
      'editor.wordHighlightStrongBackground': '#ff5b1f29',
      'editor.findMatchBackground':           '#ff5b1f4d',
      'editor.findMatchHighlightBackground':  '#ff5b1f29',
      'editor.lineHighlightBackground': cssVar('--color-hover',        '#f1f5f9'),
      'editorIndentGuide.background1':cssVar('--color-border',        '#e2e8f0'),
      'editorBracketMatch.background':cssVar('--color-elevated',      '#f8fafc'),
      'editorBracketMatch.border':    cssVar('--color-primary',       '#ff5b1f'),
      'editorGutter.background':      cssVar('--color-probestack-bg', '#ffffff'),
      'scrollbarSlider.background':   cssVar('--color-border',        '#e2e8f0'),
      'scrollbarSlider.hoverBackground': cssVar('--color-text-muted', '#64748b'),
    },
  });
};

// Tell Monaco to load its workers via Vite's bundler — keeps everything offline.
// `loader.config({ monaco })` above already wires the local Monaco instance.


const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

/**
 * Convert a string like `"mod+Enter"` / `"mod+Shift+Enter"` / `"mod+G"`
 * into a Monaco keybinding bitmask. `mod` resolves to ⌘ on macOS and
 * Ctrl elsewhere. Used for the `// generate: …` shortcut.
 */
const parseShortcutToKeybinding = (
  shortcut: string,
  m: typeof import('monaco-editor'),
): number => {
  const parts = shortcut.toLowerCase().split('+').map((p) => p.trim());
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac');
  let mask = 0;
  for (const p of parts) {
    if (p === 'mod')          mask |= isMac ? m.KeyMod.CtrlCmd : m.KeyMod.CtrlCmd;
    else if (p === 'ctrl')    mask |= m.KeyMod.WinCtrl;
    else if (p === 'shift')   mask |= m.KeyMod.Shift;
    else if (p === 'alt')     mask |= m.KeyMod.Alt;
    else if (p === 'enter')   mask |= m.KeyCode.Enter;
    else if (p.length === 1)  mask |= m.KeyCode[`Key${p.toUpperCase()}` as keyof typeof m.KeyCode] as number;
  }
  return mask;
};

interface MonacoEditorProps {
  value: string;
  onChange: (v: string) => void;
  language?: CodeLanguage;
  readOnly?: boolean;
  testId?: string;
  /** Hide line numbers for compact contexts. */
  minimap?: boolean;
  /** Inline AI completion intent — "body" / "pre-request" / "tests" /
   *  "url" / "header". When supplied, the editor enables ghost-text
   *  suggestions powered by the Java AI service. */
  aiCopilotIntent?: 'body' | 'pre-request' | 'tests' | 'url' | 'header';
  /** Enables the `// generate: …` comment-driven body generator. */
  aiGenerateEnabled?: boolean;
  /** Keyboard shortcut that fires the generator (e.g. `mod+Enter`). */
  aiGenerateShortcut?: string;
  /** Called with the comment text when the user fires the shortcut. */
  onAiGenerate?: (commentText: string) => void;
  /** Placeholder shown when the editor is empty (rendered as ghost text
   *  via Monaco's view-zone API so it never participates in the actual
   *  document content). */
  placeholder?: string;
  /** Called once the Monaco editor instance is mounted. Lets callers
   *  register custom languages (e.g. GraphQL Monarch tokens) without
   *  having to wrap a second `Editor`. */
  onMount?: (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => void;
}

export interface MonacoEditorHandle {
  /** Access the underlying Monaco editor instance — used by callers
   *  that need to do imperative things like `executeEdits` or `focus`. */
  getEditor: () => MonacoEditorNS.IStandaloneCodeEditor | null;
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(({
  value, onChange, language = 'json', readOnly = false, testId, minimap = false,
  aiCopilotIntent, aiGenerateEnabled, aiGenerateShortcut, onAiGenerate, placeholder,
  onMount: onMountProp,
}, ref) => {
  const theme = useSettings((s) => s.theme);
  const aiCopilotEnabled = useSettings((s) => s.aiCopilotEnabled ?? true);
  const { lookup, activeNames } = useVariableIndex();

  // Latest lookup ref for the decoration callback (closes over stale otherwise).
  const lookupRef = useRef(lookup);
  useEffect(() => { lookupRef.current = lookup; }, [lookup]);

  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationCollectionRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null);
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);
  const inlineProviderRef = useRef<{ dispose: () => void } | null>(null);

  const repaintVarDecorations = useCallback(() => {
    const editor = editorRef.current; const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel(); if (!model) return;
    const text = model.getValue();
    const decos: MonacoEditorNS.IModelDeltaDecoration[] = [];
    let m: RegExpExecArray | null;
    VAR_RE.lastIndex = 0;
    while ((m = VAR_RE.exec(text)) !== null) {
      const start = model.getPositionAt(m.index);
      const end = model.getPositionAt(m.index + m[0].length);
      const status = lookupRef.current(m[1]).status;
      decos.push({
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: {
          inlineClassName: `mvar-${status}`,
          hoverMessage: { value: status === 'missing'
            ? `**\`${m[1]}\`** — variable not found in any environment.`
            : `**\`${m[1]}\`** — ${status} variable.` },
        },
      });
    }
    if (!decorationCollectionRef.current) {
      decorationCollectionRef.current = editor.createDecorationsCollection(decos);
    } else {
      decorationCollectionRef.current.set(decos);
    }
  }, []);

  // Re-paint decorations whenever the active variables list changes, so a
  // newly-added env var lights up immediately without a re-mount.
  useEffect(() => { repaintVarDecorations(); }, [activeNames, repaintVarDecorations]);

  // Expose the editor instance to parent refs so callers can run
  // imperative ops (executeEdits, focus, etc) without us having to
  // mirror every Monaco API.
  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
  }), []);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Allow consumers to register custom languages / providers before
    // any other Monaco wiring kicks in.
    onMountProp?.(editor, monaco);
    // `forceReregister=true` ensures the theme picks up live CSS-variable
    // values whenever the wrapper is remounted (e.g. after a theme switch).
    ensureThemes(monaco, true);
    monaco.editor.setTheme(theme === 'dark' ? 'forgeq-dark' : 'forgeq-light');

    // Register a `{{var}}` autocomplete provider — typing `{{` shows all
    // currently-active variable names with a one-tab insert.
    completionProviderRef.current = monaco.languages.registerCompletionItemProvider(
      ['json', 'plaintext', 'javascript', 'xml', 'html'],
      {
        triggerCharacters: ['{', ' '],
        provideCompletionItems: (model: MonacoEditorNS.ITextModel, position: import('monaco-editor').Position) => {
          const word = model.getWordUntilPosition(position);
          const range = new monaco.Range(
            position.lineNumber, word.startColumn,
            position.lineNumber, word.endColumn,
          );
          // Only suggest right after `{{` (or while typing inside one).
          const lineToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
          if (!/\{\{[\w.-]*$/.test(lineToCursor)) return { suggestions: [] };
          return {
            suggestions: activeNames.map((name) => ({
              label: name,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: `${name}}}`,
              range,
              detail: 'Active variable',
            })),
          };
        },
      },
    );

    // Be tolerant of empty bodies — JSON validator otherwise paints "{}" red.
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
      trailingCommas: 'warning',
    });

    // ── Inline AI completion (Postbot) — only when an intent was supplied
    //    by the parent. Body / scripts / URL bar pass distinct intents so
    //    the model can steer its style.  The provider is debounced via
    //    AbortController + a 350 ms idle timer so we don't fire on every
    //    keystroke.
    if (aiCopilotIntent && aiCopilotEnabled) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let inflight: AbortController | null = null;
      const langs = ['json', 'plaintext', 'javascript', 'xml', 'html', 'typescript'];
      inlineProviderRef.current = monaco.languages.registerInlineCompletionsProvider(langs, {
        provideInlineCompletions: async (
          model: MonacoEditorNS.ITextModel,
          position: import('monaco-editor').Position,
        ) => {
          // Cancel any in-flight call from a previous keystroke.
          inflight?.abort();
          // Coalesce rapid keystrokes — wait 350 ms of "idle".
          await new Promise<void>((resolve) => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(resolve, 350);
          });
          const ac = new AbortController();
          inflight = ac;
          const offset = model.getOffsetAt(position);
          const text = model.getValue();
          const prefix = text.slice(0, offset);
          const suffix = text.slice(offset);
          // Skip if we have nothing meaningful yet (avoids hallucinated
          // greetings on an empty document).
          if (prefix.trim().length < 2) return { items: [] };
          const completion = await fetchInlineCompletion(
            { prefix, suffix, language: model.getLanguageId(), intent: aiCopilotIntent },
            ac.signal,
          );
          if (!completion) return { items: [] };
          return {
            items: [{
              insertText: completion,
              range: new monaco.Range(
                position.lineNumber, position.column,
                position.lineNumber, position.column,
              ),
            }],
          };
        },
        // Required no-ops — Monaco hands us back the completion list when
        // the user accepts/dismisses; we don't track lifecycle state.
        freeInlineCompletions: () => {},
      });
    }

    repaintVarDecorations();

    // ── `// generate: …` shortcut handler ──────────────────────────────
    if (aiGenerateEnabled && onAiGenerate && aiGenerateShortcut) {
      const km = parseShortcutToKeybinding(aiGenerateShortcut, monaco);
      editor.addAction({
        id: 'forgeq.aiGenerateFromComment',
        label: 'AI: Generate body from comment',
        keybindings: [km],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 0,
        run: () => {
          const text = editor.getValue();
          // Find the FIRST `// generate: …` comment in the buffer.
          const m = /\/\/\s*generate\s*:\s*([^\n]+)/i.exec(text);
          if (!m) return;
          onAiGenerate(m[1].trim());
        },
      });
    }

    // ── Empty-state placeholder via a content widget ───────────────────
    if (placeholder) {
      const node = document.createElement('div');
      node.className = 'monaco-placeholder';
      node.style.cssText = 'pointer-events:none;color:var(--color-text-muted);opacity:0.55;white-space:pre;font-family:inherit;font-size:13px;line-height:20px;padding-left:2px;';
      node.textContent = placeholder;
      const widget: MonacoEditorNS.IContentWidget = {
        getId: () => 'forgeq.placeholder',
        getDomNode: () => node,
        getPosition: () => ({
          position: { lineNumber: 1, column: 1 },
          preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
        }),
      };
      editor.addContentWidget(widget);
      const sync = () => {
        const empty = (editor.getValue() ?? '').length === 0;
        node.style.display = empty ? 'block' : 'none';
      };
      sync();
      const sub = editor.onDidChangeModelContent(sync);
      editor.onDidDispose(() => { sub.dispose(); editor.removeContentWidget(widget); });
    }
  };

  const onChangeHandler: OnChange = (v) => {
    onChange(v ?? '');
    // Repaint synchronously so decorations don't lag behind the cursor.
    repaintVarDecorations();
  };

  // Switch theme dynamically.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.setTheme(theme === 'dark' ? 'forgeq-dark' : 'forgeq-light');
  }, [theme]);

  // Cleanup the global completion + inline providers on unmount.
  useEffect(() => () => {
    completionProviderRef.current?.dispose();
    inlineProviderRef.current?.dispose();
  }, []);

  const monacoLang = LANG_MAP[language] ?? 'plaintext';
  const options = useMemo<MonacoEditorNS.IStandaloneEditorConstructionOptions>(() => ({
    readOnly,
    minimap: { enabled: minimap },
    fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
    fontSize: 13,
    lineHeight: 20,
    fontLigatures: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    matchBrackets: 'always',
    formatOnPaste: true,
    formatOnType: false,
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'mouseover',
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    padding: { top: 8, bottom: 8 },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    fixedOverflowWidgets: true,
    suggest: { showVariables: true, showSnippets: true, insertMode: 'replace' },
    quickSuggestions: { other: true, comments: false, strings: true },
    'semanticHighlighting.enabled': true,
    inlineSuggest: { enabled: true, mode: 'subword' },
  }), [readOnly, minimap]);

  return (
    <div data-testid={testId} className="relative h-full w-full overflow-hidden bg-probestack-bg">
      <Editor
        // Hard remount on theme switch so Monaco picks up the colour
        // tokens from `:root` again — softer than a full SPA reload but
        // sharper than `monaco.editor.setTheme` (which sometimes leaves
        // gutter / minimap fragments stuck on the old palette).
        key={`monaco-${theme}`}
        value={value}
        onChange={onChangeHandler}
        language={monacoLang}
        theme={theme === 'dark' ? 'forgeq-dark' : 'forgeq-light'}
        onMount={onMount}
        options={options}
        loading={
          <div className="grid h-full w-full place-items-center text-[11px] text-text-muted">
            Loading editor…
          </div>
        }
      />
    </div>
  );
});
MonacoEditor.displayName = 'MonacoEditor';
