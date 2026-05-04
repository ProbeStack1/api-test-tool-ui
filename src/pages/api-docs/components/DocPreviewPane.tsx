/**
 * DocPreviewPane — right column of the doc detail editor. Hosts two tabs:
 *   • Preview — rendered HTML for the saved doc (or live Markdown preview
 *     of the unsaved editor buffer when the doc has no html yet).
 *   • Try It  — Mintlify/Stripe-style endpoint runner backed by the
 *     structured requests baked into AUTO/HYBRID-format docs.
 */
import { useState } from 'react';
import { Eye, PlayCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DocView } from '@/services/apiDocs.service';
import { renderMarkdown } from './_shared';
import { TryItPanel } from './TryItPanel';

interface Props {
  doc: DocView;
  markdown: string;
  workspaceId: string;
}

export const DocPreviewPane = ({ doc: d, markdown, workspaceId }: Props) => {
  const [tab, setTab] = useState<'preview' | 'tryit'>('preview');
  const html = d.html || renderMarkdown(markdown);
  const requests = (d.structuredRequests ?? []) as Array<Record<string, unknown>>;

  return (
    <section className="flex h-full flex-col overflow-hidden bg-surface/10" data-testid="api-doc-preview">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="flex items-center gap-0.5 rounded-md border border-border bg-probestack-bg p-0.5">
          {(['preview', 'tryit'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} data-testid={`api-doc-pane-${t}`}
              className={cn('flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                tab === t ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary')}>
              {t === 'preview' ? <Eye className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
              {t === 'preview' ? 'Preview' : 'Try It'}
              {t === 'tryit' && requests.length > 0 && <span className="rounded-full bg-primary/20 px-1 text-[9px] text-primary">{requests.length}</span>}
            </button>
          ))}
        </span>
        <span className="ml-auto text-[10px] text-text-muted">v{d.version ?? 1} · {d.viewCount ?? 0} views</span>
      </div>
      <div className="flex-1 overflow-auto">
        {tab === 'preview' ? (
          <article data-testid="api-doc-preview-html"
            className="prose prose-invert prose-sm max-w-none p-6"
            dangerouslySetInnerHTML={{ __html: html || '<p>— content will render here once you save —</p>' }} />
        ) : (
          <TryItPanel requests={requests} workspaceId={workspaceId} />
        )}
      </div>
    </section>
  );
};
