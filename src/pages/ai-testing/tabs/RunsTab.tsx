/**
 * Runs tab — every execution + drill-down to per-case result with
 * assertion grid.
 */
import { useEffect, useState } from 'react';
import {
  RefreshCw, Loader2, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Clock, DollarSign,
} from 'lucide-react';
import { listRuns, listResults, type TestRun, type TestResult } from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';

export const RunsTab = ({ workspaceId }: { workspaceId: string }) => {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [active, setActive] = useState<TestRun | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const d = await listRuns(workspaceId);
      setRuns(d?.items ?? []);
      if (!active && (d?.items ?? []).length) setActive(d.items[0]);
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [workspaceId]);
  // Poll while there are running / queued runs
  useEffect(() => {
    const anyLive = runs.some((r) => r.status === 'running' || r.status === 'queued');
    if (!anyLive) return;
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, [runs]); // eslint-disable-line

  useEffect(() => {
    if (!active?.id) { setResults([]); return; }
    setLoadingResults(true);
    listResults(workspaceId, active.id)
      .then((d) => setResults(d?.items ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoadingResults(false));
  }, [active?.id, workspaceId]);

  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-surface" data-testid="ai-testing-runs-list">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Runs</div>
          <button type="button" onClick={reload}
                  className="grid h-6 w-6 place-items-center rounded-md text-text-muted hover:bg-elevated">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className="grid flex-1 place-items-center text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="grid flex-1 place-items-center p-4 text-center text-[11px] text-text-muted">
            No runs yet. Trigger one from Suites.
          </div>
        ) : (
          <ul className="overflow-auto">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setActive(r)}
                  data-testid={`ai-testing-run-row-${r.id}`}
                  className={cn(
                    'group flex w-full items-start gap-2 border-b border-border/40 px-3 py-2 text-left',
                    active?.id === r.id ? 'bg-primary/10 text-primary' : 'hover:bg-hover',
                  )}
                >
                  <StatusDot status={r.status} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">{r.suiteName}</div>
                    <div className="truncate text-[10px] text-text-muted">
                      {r.executionMode} · {r.provider}/{r.model}
                    </div>
                    <div className="mt-0.5 flex gap-2 text-[10px] text-text-muted">
                      <span>p:{r.passed ?? 0}</span>
                      <span>f:{r.failed ?? 0}</span>
                      <span>e:{r.errored ?? 0}</span>
                      <span>${(r.totalCostUsd ?? 0).toFixed(4)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {!active ? (
          <div className="grid flex-1 place-items-center text-text-muted text-sm">
            Select a run to view per-case results.
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">{active.suiteName}</h2>
                <p className="text-[11px] text-text-muted">
                  Run ID {active.id} · {active.executionMode} · {active.provider}/{active.model} ·
                  triggered by {active.triggeredByEmail}
                </p>
              </div>
              <StatusBadge status={active.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat icon={CheckCircle2} label="Passed"  value={active.passed ?? 0}  color="text-success" />
              <Stat icon={XCircle}      label="Failed"  value={active.failed ?? 0}  color="text-danger" />
              <Stat icon={AlertTriangle} label="Errors" value={active.errored ?? 0} color="text-warning" />
              <Stat icon={DollarSign}   label="Cost"    value={'$' + (active.totalCostUsd ?? 0).toFixed(4)}
                    color="text-primary" />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4 text-[11px]">
              <Stat icon={Clock} label="Avg latency" value={(active.avgLatencyMs ?? 0).toFixed(0) + ' ms'} color="text-text-muted" small />
              <Stat icon={Clock} label="p95 latency" value={(active.p95LatencyMs ?? 0).toFixed(0) + ' ms'} color="text-text-muted" small />
              <Stat icon={Clock} label="Prompt tokens" value={active.totalTokensPrompt ?? 0} color="text-text-muted" small />
              <Stat icon={Clock} label="Completion tokens" value={active.totalTokensCompletion ?? 0} color="text-text-muted" small />
            </div>

            <h3 className="mt-6 mb-2 text-sm font-semibold">Per-case results</h3>
            {loadingResults ? (
              <div className="grid place-items-center p-6 text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : (
              <ul className="divide-y divide-border/40 rounded-md border border-border bg-surface">
                {results.length === 0 && (
                  <li className="px-4 py-6 text-center text-[11px] text-text-muted">
                    No results yet. {active.status === 'running' && 'Run in progress…'}
                  </li>
                )}
                {results.map((r) => (
                  <li key={r.id} className="px-4 py-3" data-testid={`ai-testing-result-${r.id}`}>
                    <div className="flex items-start gap-3">
                      <VerdictDot v={r.verdict} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium">{r.caseName}</span>
                          <span className="text-[10px] text-text-muted">
                            {r.latencyMs}ms · ${(r.costUsd ?? 0).toFixed(6)} ·
                            {' '}{(r.tokensPrompt ?? 0)}+{(r.tokensCompletion ?? 0)} tokens
                          </span>
                        </div>
                        {r.errorMessage ? (
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-danger/10 p-2 text-[11px] text-danger">
                            {r.errorMessage}
                          </pre>
                        ) : (
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-elevated/30 p-2 text-[11px]">
                            {(r.output || '').slice(0, 600)}
                          </pre>
                        )}
                        {r.assertionResults && r.assertionResults.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.assertionResults.map((a: any, i: number) => (
                              <span key={i} className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                a.passed ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger',
                              )}>
                                {a.passed ? '✓' : '✗'} {a.type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusDot = ({ status }: { status: string }) => {
  const c = {
    queued:    'bg-text-muted',
    running:   'bg-warning animate-pulse',
    succeeded: 'bg-success',
    failed:    'bg-danger',
    cancelled: 'bg-text-muted',
  }[status] || 'bg-text-muted';
  return <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', c)} />;
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn(
    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
    status === 'succeeded' && 'bg-success/15 text-success',
    status === 'failed' && 'bg-danger/15 text-danger',
    status === 'running' && 'bg-warning/15 text-warning',
    status === 'queued' && 'bg-text-muted/15 text-text-muted',
    status === 'cancelled' && 'bg-text-muted/15 text-text-muted',
  )}>{status}</span>
);

const Stat = ({ icon: Icon, label, value, color, small }: any) => (
  <div className={cn('rounded-lg border border-border bg-surface px-3 py-2', small && 'py-1.5')}>
    <div className="flex items-center justify-between">
      <div className={cn('text-[10px] uppercase tracking-wide text-text-muted', small && 'text-[9px]')}>{label}</div>
      <Icon className={cn('h-3 w-3', color)} />
    </div>
    <div className={cn('mt-0.5 text-base font-semibold tabular-nums', small && 'text-[12px]')}>{value}</div>
  </div>
);

const VerdictDot = ({ v }: { v: string }) => (
  <span className={cn(
    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
    v === 'passed' && 'bg-success',
    v === 'failed' && 'bg-danger',
    v === 'errored' && 'bg-warning',
    v === 'skipped' && 'bg-text-muted',
  )} />
);
