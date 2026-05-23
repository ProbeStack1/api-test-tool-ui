/**
 * Audit log tab — chronological feed of every action performed in AI
 * Testing. Workspace-scoped, paged.
 */
import { useEffect, useState } from 'react';
import {
  FileClock, Loader2, RefreshCw, Filter, AlertTriangle, Info,
} from 'lucide-react';
import { listAudit, type AuditLogEntry } from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';

export const AuditTab = ({ workspaceId }: { workspaceId: string }) => {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const reload = async () => {
    setLoading(true);
    try {
      const d = await listAudit(workspaceId);
      setItems(d?.items ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [workspaceId]);

  const filtered = filter
    ? items.filter((i) =>
        i.action?.toLowerCase().includes(filter.toLowerCase()) ||
        i.actorEmail?.toLowerCase().includes(filter.toLowerCase()) ||
        i.resourceType?.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <div className="mx-auto max-w-4xl p-6" data-testid="ai-testing-audit-page">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><FileClock className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Audit log</h2>
          </div>
          <p className="text-[11px] text-text-muted">
            Every action — including each LLM provider call — is recorded.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-text-muted" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter"
              className="w-48 rounded-md border border-border bg-surface pl-7 pr-2 py-1.5 text-[12px] outline-none focus:border-primary"
              data-testid="ai-testing-audit-filter"
            />
          </div>
          <button type="button" onClick={reload}
                  className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-muted hover:bg-elevated">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="grid place-items-center p-6 text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-[11px] text-text-muted">
            No audit entries{filter ? ' matching filter' : ' yet'}.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((e) => (
              <li key={e.id} className="rounded-md border border-border bg-surface px-3 py-2"
                  data-testid={`ai-testing-audit-row-${e.id}`}>
                <div className="flex items-start gap-3">
                  <SeverityIcon s={e.severity ?? 'info'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-semibold">{e.action}</span>
                      <span className="text-text-muted">on {e.resourceType ?? '?'}</span>
                      {e.resourceId && <span className="font-mono text-[10px] text-text-muted">{e.resourceId.slice(0, 8)}</span>}
                    </div>
                    <div className="mt-0.5 text-[10px] text-text-muted">
                      {new Date(e.createdAt).toLocaleString()}
                      {e.actorEmail && <> · {e.actorEmail}</>}
                      {e.latencyMs !== undefined && e.latencyMs !== null && <> · {e.latencyMs} ms</>}
                      {e.costUsd !== undefined && e.costUsd !== null && <> · ${e.costUsd.toFixed(6)}</>}
                    </div>
                    {e.payload && Object.keys(e.payload).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] text-text-secondary hover:text-primary">payload</summary>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-elevated/30 p-2 text-[10px]">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const SeverityIcon = ({ s }: { s: string }) => {
  if (s === 'error' || s === 'warning')
    return <AlertTriangle className={cn('mt-0.5 h-3.5 w-3.5', s === 'error' ? 'text-danger' : 'text-warning')} />;
  return <Info className="mt-0.5 h-3.5 w-3.5 text-info" />;
};
