/**
 * CodeEditor — CodeMirror 6 wrapper that matches our app theme.
 *
 *  Eagerly imports CM6 (no Suspense flash) so responses display the
 *  moment they arrive. Theme honours `settings.theme`:
 *    • dark  → CM `oneDark` extension on top of our `bg-probestack-bg`
 *    • light → default light theme on top of `bg-probestack-bg`
 *
 *  Inline `{{variable}}` tokens are decorated with hard-coded hex
 *  colours (orange/yellow/red) so they show up regardless of CSS scope.
 *  Code folding, JSON lint gutters, bracket matching, autocompletion
 *  and per-language syntax highlighting are all on.
 */
import { useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { html as cmHtml } from '@codemirror/lang-html';
import { xml as cmXml } from '@codemirror/lang-xml';
import { EditorView, Decoration, ViewPlugin } from '@codemirror/view';
import { foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { lintGutter, linter } from '@codemirror/lint';
import { keymap } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { useSettings } from '@/stores/settings.store';
import { useVariableIndex } from '@/utils/variables';

/* Module-level mutable lookup so the long-lived CM ViewPlugin always
 * sees the latest env-aware lookup at decoration time. */
type VarLookup = (n: string) => { status: 'active' | 'inactive' | 'missing' };
const NULL_LOOKUP: VarLookup = () => ({ status: 'missing' });
const lookupRef: { current: VarLookup } = { current: NULL_LOOKUP };

const themeOverride = EditorView.theme({
  '&': { fontSize: 'var(--font-size-base, 13px)', height: '100%', backgroundColor: 'var(--color-probestack-bg) !important' },
  '.cm-editor': { backgroundColor: 'var(--color-probestack-bg) !important' },
  '.cm-scroller': { fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace', overflow: 'auto', backgroundColor: 'transparent' },
  '.cm-content':  { padding: '8px 4px', caretColor: 'var(--color-text-primary)' },
  '.cm-gutters':  { backgroundColor: 'transparent !important', borderRight: '1px solid var(--color-border)', color: 'var(--color-text-muted)' },
  '.cm-activeLineGutter, .cm-activeLine': { backgroundColor: 'var(--color-hover) !important' },
  '.cm-lineNumbers .cm-gutterElement': { color: 'var(--color-text-muted)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-foldGutter .cm-gutterElement':   { color: 'var(--color-text-muted)' },
  '.cm-tooltip':  { backgroundColor: 'var(--color-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--color-primary-muted) !important' },
});

/* Variable-token palette — same as VariableInput (orange/yellow/red). */
const PALETTE = {
  active:   { bg: 'rgba(255,91,31,0.18)', fg: '#ff7a3a' },
  inactive: { bg: 'rgba(234,179,8,0.18)', fg: '#facc15' },
  missing:  { bg: 'rgba(239,68,68,0.18)', fg: '#f87171' },
} as const;

const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;
const buildVarDecorations = (view: any) => {
  const builder: any[] = [];
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let m: RegExpExecArray | null;
    VAR_RE.lastIndex = 0;
    while ((m = VAR_RE.exec(text)) !== null) {
      const start = from + m.index;
      const end = start + m[0].length;
      const status = lookupRef.current(m[1]).status;
      const p = PALETTE[status];
      builder.push(
        Decoration.mark({
          attributes: {
            style: `background-color:${p.bg};color:${p.fg};border-radius:2px;`,
            'data-var-status': status,
          },
        }).range(start, end),
      );
    }
  }
  return Decoration.set(builder, true);
};
const varHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: any;
    constructor(view: any) { this.decorations = buildVarDecorations(view); }
    update(u: any) {
      if (u.docChanged || u.viewportChanged) this.decorations = buildVarDecorations(u.view);
    }
  },
  { decorations: (v: any) => v.decorations },
);

export type CodeLanguage = 'json' | 'text' | 'javascript' | 'xml' | 'html' | 'yaml' | 'shell';

const langExt = (l: CodeLanguage) => {
  if (l === 'javascript') return javascript({ jsx: false });
  if (l === 'json')       return json();
  if (l === 'html')       return cmHtml();
  if (l === 'xml')        return cmXml();
  return null;
};

export const CodeEditor = ({
  value, onChange, language = 'json', readOnly = false, testId, wrap = true,
}: {
  value: string;
  onChange: (v: string) => void;
  language?: CodeLanguage;
  height?: string | number;
  readOnly?: boolean;
  testId?: string;
  wrap?: boolean;
}) => {
  const theme = useSettings((s) => s.theme);
  const { lookup } = useVariableIndex();
  useEffect(() => { lookupRef.current = lookup; });

  const exts = useMemo(() => {
    const out: any[] = [foldGutter(), keymap.of(foldKeymap), indentOnInput(), varHighlightPlugin];
    if (wrap) out.push(EditorView.lineWrapping);
    if (theme === 'dark') out.push(oneDark);
    /* themeOverride is added LAST so its `!important` rules win against
     * oneDark's editor / gutter background colours. */
    out.push(themeOverride);
    const l = langExt(language);
    if (l) out.unshift(l);
    if (language === 'json') {
      // Don't paint a red lint marker for an empty body — empty is a
      // perfectly valid "no body yet" state, not a parse error. Only
      // delegate to the real JSON linter once the user has typed
      // something non-whitespace.
      const tolerantJsonLinter = linter((view) => {
        const text = view.state.doc.toString();
        if (!text.trim()) return [];
        return jsonParseLinter()(view);
      });
      out.push(tolerantJsonLinter, lintGutter());
    }
    return out;
  }, [language, theme, wrap]);

  return (
    <div data-testid={testId} className="h-full w-full overflow-hidden bg-probestack-bg">
      <CodeMirror
        value={value}
        onChange={onChange}
        height="100%"
        theme={theme === 'dark' ? 'dark' : 'light'}
        extensions={exts}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: false,
          dropCursor: true,
          allowMultipleSelections: false,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          autocompletion: true,
        }}
      />
    </div>
  );
};
