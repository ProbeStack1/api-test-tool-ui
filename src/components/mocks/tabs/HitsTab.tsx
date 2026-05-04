/**
 * HitsTab — premium hit-log viewer. Auto-refreshes every 4 s while
 * mounted; displays method + path + status + matched flag + relative
 * time. Click a row to expand its raw JSON.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, RefreshCcw, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { listMockHits, type MockHit } from '@/services/mock.service';
import { MethodBadge } from '../parts/MethodBadge';
import { StatusBadge } from '../parts/StatusBadge';
import { cn } from '@/utils/cn';

export const HitsTab = ({ mockId }: { mockId: string }) => {
  const { data: hits = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['mock', mockId, 'hits'],
    queryFn: () => listMockHits(mockId, 100),
    refetchInterval: 4000,
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3 p-4" data-testid="mock-hits-tab">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <HistoryIcon className="h-3.5 w-3.5 text-primary" />
          Recent hits
          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{hits.length}</span>
        </h3>
        <Button
          variant="outline"
          data-testid="mock-hits-refresh"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          <RefreshCcw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> Refresh
        </Button>
      </header>
      {isLoading ? (
        <div className="space-y-1.5" data-testid="mock-hits-skeleton">
          {[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
        </div>
      ) : hits.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface/40 p-8 text-center" data-testid="mock-hits-empty">
          <HistoryIcon className="mx-auto mb-2 h-7 w-7 text-text-muted" />
          <div className="text-sm font-medium">No hits yet</div>
          <div className="mt-1 text-xs text-text-muted">Send a request to the mock URL to see it appear here.</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[24px_60px_1fr_60px_70px_80px] items-center gap-2 border-b border-border bg-surface/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            <span></span>
            <span>Method</span>
            <span>Path</span>
            <span>Status</span>
            <span>Match</span>
            <span>When</span>
          </div>
          <ul className="divide-y divide-border/40">
            {hits.map((h) => {
              const open = expanded === h.id;
              const Chev = open ? ChevronDown : ChevronRight;
              return (
                <li key={h.id} data-testid={`mock-hit-${h.id}`}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : h.id)}
                    className={cn(
                      'grid w-full grid-cols-[24px_60px_1fr_60px_70px_80px] items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-hover/50',
                      open && 'bg-hover/30',
                    )}
                  >
                    <Chev className="h-3 w-3 shrink-0 text-text-muted" />
                    <MethodBadge method={h.method} size="xs" />
                    <span className="min-w-0 truncate font-mono text-text-secondary" title={h.path}>{h.path}</span>
                    <StatusBadge status={h.status_code ?? h.statusCode} />
                    <span className={cn('font-semibold text-[10px]', h.matched ? 'text-success' : 'text-danger')}>
                      {h.matched ? 'matched' : 'no rule'}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">{relTime(h.hit_at ?? h.hitAt)}</span>
                  </button>
                  {open && (
                    <div className="border-t border-border/30 bg-elevated/40 px-7 py-3 text-[11px]" data-testid={`mock-hit-detail-${h.id}`}>
                      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
                        <dt className="text-text-muted">Hit ID</dt>
                        <dd className="font-mono text-text-secondary">{h.id}</dd>
                        <dt className="text-text-muted">Endpoint matched</dt>
                        <dd className="font-mono text-text-secondary">{h.endpoint_id ?? '— no rule matched'}</dd>
                        <dt className="text-text-muted">Method</dt>
                        <dd className="font-mono text-text-primary">{h.method}</dd>
                        <dt className="text-text-muted">Path</dt>
                        <dd className="break-all font-mono text-text-primary">{h.path}</dd>
                        <dt className="text-text-muted">Response status</dt>
                        <dd className="font-mono text-text-primary">{h.status_code}</dd>
                        <dt className="text-text-muted">Matched rule?</dt>
                        <dd className={cn('font-semibold', h.matched ? 'text-success' : 'text-danger')}>
                          {h.matched ? 'Yes' : 'No — request fell through'}
                        </dd>
                        <dt className="text-text-muted">Hit at</dt>
                        <dd className="font-mono text-text-secondary">{h.hit_at}</dd>
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const relTime = (iso?: string) => {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return new Date(iso).toLocaleDateString();
  } catch { return '—'; }
};
