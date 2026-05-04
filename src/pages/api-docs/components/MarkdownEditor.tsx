/**
 * MarkdownEditor — Write/Preview tabs with a tiny formatting toolbar.
 *
 * The toolbar wraps/prefixes the current selection inside the underlying
 * <textarea>. We track the textarea via a window-scoped ref pointer
 * (`__mdEditorEl`) because the toolbar buttons live in a sibling node and
 * we want zero React re-renders on every keystroke.
 */
import { useState } from 'react';
import {
  Bold, Italic, Code, Link as LinkIcon, List, Heading2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { renderMarkdown } from './_shared';

interface Props {
  value: string;
  onChange: (s: string) => void;
  helperHint?: string;
}

export const MarkdownEditor = ({ value, onChange, helperHint }: Props) => {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const ref = (node: HTMLTextAreaElement | null) => { (window as any).__mdEditorEl = node; };

  const wrap = (before: string, after = before) => {
    const ta = (window as any).__mdEditorEl as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = value.substring(start, end);
    const next = value.substring(0, start) + before + sel + after + value.substring(end);
    onChange(next);
    setTimeout(() => { ta.focus(); ta.selectionStart = start + before.length; ta.selectionEnd = end + before.length; }, 0);
  };
  const linePrefix = (prefix: string) => {
    const ta = (window as any).__mdEditorEl as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    onChange(value.substring(0, lineStart) + prefix + value.substring(lineStart));
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + prefix.length; }, 0);
  };

  const Btn = ({ icon: I, label, onClick, testId }: { icon: any; label: string; onClick: () => void; testId: string }) => (
    <button type="button" onClick={onClick} title={label} aria-label={label} data-testid={testId}
      className="grid h-7 w-7 place-items-center rounded text-text-muted transition-colors hover:bg-hover hover:text-text-primary">
      <I className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="block" data-testid="api-doc-md-editor">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex items-center gap-0.5 rounded-md border border-border bg-probestack-bg p-0.5">
          {(['write', 'preview'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} data-testid={`api-doc-md-tab-${t}`}
              className={cn('rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                tab === t ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary')}>
              {t}
            </button>
          ))}
        </span>
        <span className="ml-auto text-[10px] text-text-muted">{value.length} chars</span>
      </div>
      {tab === 'write' && (
        <div className="rounded-md border border-border bg-probestack-bg shadow-inner">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1" data-testid="api-doc-md-toolbar">
            <Btn icon={Heading2}  label="Heading"  onClick={() => linePrefix('## ')}     testId="md-tb-h2" />
            <Btn icon={Bold}      label="Bold"     onClick={() => wrap('**')}            testId="md-tb-bold" />
            <Btn icon={Italic}    label="Italic"   onClick={() => wrap('_')}             testId="md-tb-italic" />
            <Btn icon={Code}      label="Inline code" onClick={() => wrap('`')}          testId="md-tb-code" />
            <Btn icon={LinkIcon}  label="Link"     onClick={() => wrap('[', '](url)')}   testId="md-tb-link" />
            <Btn icon={List}      label="List"     onClick={() => linePrefix('- ')}      testId="md-tb-list" />
            <button type="button" onClick={() => wrap('\n```\n', '\n```\n')} title="Code block" data-testid="md-tb-code-block"
              className="ml-1 rounded px-1.5 py-1 font-mono text-[10px] text-text-muted hover:bg-hover hover:text-text-primary">```</button>
          </div>
          <textarea data-testid="api-doc-edit-content" ref={ref} rows={18} value={value}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-[11px] leading-relaxed focus:outline-none" />
        </div>
      )}
      {tab === 'preview' && (
        <article data-testid="api-doc-md-preview"
          className="prose prose-invert prose-sm max-w-none rounded-md border border-border bg-probestack-bg/40 p-4"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || '<p class="text-text-muted">— nothing to preview —</p>' }} />
      )}
      {helperHint && <p className="mt-1 text-[10px] text-text-muted">{helperHint}</p>}
    </div>
  );
};
