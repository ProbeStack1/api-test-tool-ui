/**
 * SpecContentTab — read-only viewer for the raw spec content fetched
 * via `GET /api/v1/test-specs/{id}/content`.
 *
 * Renders inside a scrollable mono panel with a copy button and a
 * subtle line gutter. Heavy editors are deliberately avoided to keep
 * the UI fast and consistent with the rest of the app.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getTestSpecContent } from '@/services/testSpec.service';
import { FormatBadge } from '../../shared/Badges';

interface Props { specId: string }

export const SpecContentTab = ({ specId }: Props) => {
  const [copied, setCopied] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['testSpec', 'content', specId],
    queryFn: () => getTestSpecContent(specId),
  });

  const onCopy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onDownload = () => {
    if (!data) return;
    const ext = data.format === 'OPENAPI' || data.format === 'YAML' ? 'yaml'
              : data.format === 'POSTMAN' ? 'postman_collection.json'
              : data.format === 'HAR' ? 'har'
              : 'txt';
    const blob = new Blob([data.content], { type: data.contentType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${specId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col p-6" data-testid="spec-content-tab">
      <div className="mb-3 flex items-center gap-2">
        {data && (
          <>
            <FormatBadge format={data.format} />
            <span className="text-[11px] text-text-muted">{data.contentType}</span>
            <span className="text-[11px] text-text-muted">· {(data.content.length / 1024).toFixed(1)} KB</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onDownload} disabled={!data} data-testid="spec-content-download">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button size="sm" variant="ghost" onClick={onCopy} disabled={!data} data-testid="spec-content-copy">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-probestack-bg">
        {isLoading ? (
          <div className="space-y-2 p-4" data-testid="spec-content-loading">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-xs text-danger">
            <span>Failed to load content: {(error as Error)?.message}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <Loader2 className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : (
          <pre
            data-testid="spec-content-pre"
            className="h-full overflow-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-[11px] leading-relaxed text-text-secondary"
          >
            {data?.content}
          </pre>
        )}
      </div>
    </div>
  );
};
