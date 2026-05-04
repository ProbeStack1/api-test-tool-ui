/**
 * HistoryTab — full audit log of MCP calls.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Trash2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { listHistory, clearHistory, deleteHistoryEntry } from '@/services/mcp.service';
import { cn } from '@/utils/cn';

export const HistoryTab = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['mcp-history'],
    queryFn: () => listHistory(undefined, 200),
    refetchInterval: 15_000,
  });
  const filtered = (Array.isArray(entries) ? entries : []).filter((e) => e.kind?.toLowerCase().includes(filter.toLowerCase()));

  const clr = useMutation({
    mutationFn: () => clearHistory(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mcp-history'] });
      toast.success('History cleared');
    },
  });

  return (
    <div className="space-y-3 p-4" data-testid="mcp-history-tab">
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="h-3.5 w-3.5 text-primary" /> MCP History
          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{entries.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          <input
            data-testid="mcp-history-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by kind…"
            className="h-7 w-44 rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary"
          />
          <Button variant="outline" data-testid="mcp-history-refresh"
                  onClick={() => qc.invalidateQueries({ queryKey: ['mcp-history'] })}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" data-testid="mcp-history-clear"
                  disabled={entries.length === 0 || clr.isPending}
                  onClick={() => { if (confirm('Clear ALL MCP history? Cannot be undone.')) clr.mutate(); }}>
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </Button>
        </div>
      </header>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface/30 p-12 text-center text-xs text-text-muted" data-testid="mcp-history-empty">
          No history yet — connect to a server in <strong>Inspector</strong> and start calling tools.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border" data-testid="mcp-history-list">
          <div className="grid grid-cols-[140px_140px_70px_60px_1fr_24px] gap-2 border-b border-border bg-surface/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            <span>Kind</span><span>Time</span><span className="text-right">Latency</span><span className="text-center">OK</span><span>Detail</span><span></span>
          </div>
          {filtered.map((e) => (
            <details key={e.id} data-testid={`mcp-history-entry-${e.id}`} className="border-b border-border/60 last:border-b-0">
              <summary className="grid cursor-pointer grid-cols-[140px_140px_70px_60px_1fr_24px] items-center gap-2 px-3 py-1.5 text-xs hover:bg-hover/30">
                <span className="font-mono text-[11px] text-text-secondary">{e.kind ?? '—'}</span>
                <span className="font-mono text-[10px] text-text-muted">
                  {e.createdAt ? new Date(e.createdAt).toLocaleTimeString() : '—'}
                </span>
                <span className="text-right font-mono text-[10px] text-text-muted">{e.ms ?? 0}ms</span>
                <span className="text-center">
                  {e.success
                    ? <CheckCircle2 className="mx-auto h-3 w-3 text-success" />
                    : <AlertTriangle className="mx-auto h-3 w-3 text-danger" />}
                </span>
                <span className="truncate font-mono text-[10px] text-text-muted">
                  {summarizeHistory(e)}
                </span>
                <Tooltip content="Delete entry">
                  <button
                    data-testid={`mcp-history-del-${e.id}`}
                    onClick={async (ev) => {
                      ev.preventDefault();
                      await deleteHistoryEntry(e.id);
                      qc.invalidateQueries({ queryKey: ['mcp-history'] });
                    }}
                    className="rounded p-0.5 text-text-muted hover:bg-hover hover:text-danger"
                  ><Trash2 className="h-3 w-3" /></button>
                </Tooltip>
              </summary>
              <pre className="border-t border-border/60 bg-elevated/40 p-3 font-mono text-[10px] leading-relaxed text-text-secondary" data-testid={`mcp-history-payload-${e.id}`}>
                {JSON.stringify(e.payload, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

/** Defensive summary builder — when an old history row was persisted
 * with a null payload or an action that didn't carry tool/uri (e.g.
 * `breaker_open`, `connect_failed`), the previous code threw on
 * `JSON.stringify(undefined).slice(...)`. This helper keeps the row
 * readable instead of showing literal "undefined" / crashing. */
const summarizeHistory = (e: any): string => {
  if (e?.error) return String(e.error);
  const p = e?.payload;
  if (!p || typeof p !== 'object') return e?.kind ? `[${e.kind}]` : '—';
  if (typeof p.toolName === 'string') return p.toolName;
  if (typeof p.uri === 'string') return p.uri;
  try { return JSON.stringify(p).slice(0, 80); } catch { return '[unserialisable]'; }
};
