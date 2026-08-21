/**
 * RunsView — recent runs list + per-run drill-down.
 *
 *   (no ?run)         → all recent runs as a table (with baseline marker)
 *   ?run=<id>         → run header (verdict bar, cost, latency)
 *                       + per-case assertion-verdict grid
 *                       + actions: rerun · cancel · save/clear baseline
 *
 * Polls every 5s while any run is queued/running so the UI stays live.
 * Persists the URL so a refresh keeps you on the same run.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, BookmarkCheck, BookmarkX, CheckCircle2, ChevronRight,
  Clock, AlertTriangle, History, Loader2, Play, RefreshCw, XCircle, Zap,
} from 'lucide-react';
import {
  cancelRun, clearBaseline, getRun, listResults, listRuns, rerunRun, setBaseline,
  type TestResult, type TestRun,
} from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export const RunsView = ({ workspaceId }: { workspaceId: string }) => {
  const [params] = useSearchParams();
  const runId = params.get('run');
  return runId
    ? <RunDetail workspaceId={workspaceId} runId={runId} />
    : <RunsList workspaceId={workspaceId} />;
};

/* ─── LIST ──────────────────────────────────────────────────────────── */
const RunsList = ({ workspaceId }: { workspaceId: string }) => {
  const [, setParams] = useSearchParams();
  const [runs, setRuns]       = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TestRun['status']>('all');
  const [query, setQuery]     = useState('');

  const fetch = useCallback(async () => {
    try {
      const r = await listRuns(workspaceId, undefined, 0, 200);
      setRuns(r?.items ?? []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Live-poll while any run is queued/running.
  useEffect(() => {
    const live = runs.some((r) => r.status === 'queued' || r.status === 'running');
    if (!live) return;
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, [runs, fetch]);

  const filtered = useMemo(() => runs.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!((r.suiteName ?? '').toLowerCase().includes(q) ||
            (r.provider ?? '').toLowerCase().includes(q) ||
            (r.model ?? '').toLowerCase().includes(q) ||
            (r.triggeredByEmail ?? '').toLowerCase().includes(q))) return false;
    }
    return true;
  }), [runs, statusFilter, query]);

  return (
    <div className="space-y-4 p-6" data-testid="ai-testing-runs-list">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <History className="h-5 w-5 text-primary" /> Run history
          </h2>
          <p className="text-sm text-text-muted">
            All test runs across your suites · live-updates while in progress ·{' '}
            <span className="font-mono text-xs">{filtered.length} of {runs.length} shown</span>
          </p>
        </div>
        <button type="button" onClick={fetch}
                data-testid="ai-testing-runs-refresh"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-elevated">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
           data-testid="ai-testing-runs-filters">
        <div className="flex rounded-md border border-border bg-elevated/40 p-0.5">
          {(['all','succeeded','failed','running','queued','cancelled'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
                    data-testid={`ai-testing-runs-status-${s}`}
                    className={cn('rounded px-2.5 py-1 text-xs font-semibold capitalize transition-colors',
                      statusFilter === s ? 'bg-primary text-white' : 'text-text-secondary hover:bg-elevated')}>
              {s}
            </button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder="Search by suite, model, user…"
               data-testid="ai-testing-runs-search"
               className="flex-1 min-w-[180px] rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary" />
      </div>

      {loading ? (
        <RunsListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-text-muted">
          <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
          {runs.length === 0
            ? <>No runs yet. Trigger a suite from <strong className="text-text-primary">Suites</strong> or run a one-shot probe from <strong className="text-text-primary">Quick test</strong>.</>
            : <>No runs match the current filter. Reset or try a different search.</>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-elevated/40 text-xs uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Suite</th>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">P / F / E</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Tokens</th>
                <th className="px-3 py-2 text-right">Latency p95</th>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((r) => (
                <tr key={r.id}
                    onClick={() => setParams({ view: 'runs', run: r.id }, { replace: false })}
                    data-testid={`ai-testing-run-row-${r.id}`}
                    className="cursor-pointer transition-colors hover:bg-elevated/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{r.suiteName}</span>
                      {r.isBaseline && (
                        <span className="rounded bg-warning/15 px-1.5 py-[1px] text-[10px] font-semibold text-warning"
                              title="This run is the baseline for its suite"
                              data-testid={`ai-testing-baseline-badge-${r.id}`}>
                          baseline
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{r.provider}/{r.model}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {r.executionMode}{r.executionMode === 'parallel' && r.parallelism ? ` ×${r.parallelism}` : ''}
                  </td>
                  <td className="px-3 py-2 text-center"><StatusPill status={r.status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className="text-success">{r.passed ?? 0}</span>
                    <span className="text-text-muted"> / </span>
                    <span className="text-danger">{r.failed ?? 0}</span>
                    <span className="text-text-muted"> / </span>
                    <span className="text-warning">{r.errored ?? 0}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">${(r.totalCostUsd ?? 0).toFixed(6)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                    {((r.totalTokensPrompt ?? 0) + (r.totalTokensCompletion ?? 0)).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{(r.p95LatencyMs ?? 0).toFixed(0)} ms</td>
                  <td className="px-3 py-2 text-text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-right"><ChevronRight className="ml-auto h-3.5 w-3.5 text-text-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const RunsListSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="ai-testing-runs-skeleton">
    <div className="border-b border-border bg-elevated/40 px-3 py-2">
      <Skeleton className="h-3 w-32" />
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="ml-auto h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    ))}
  </div>
);

/* ─── DETAIL ────────────────────────────────────────────────────────── */
const RunDetail = ({ workspaceId, runId }: { workspaceId: string; runId: string }) => {
  const nav = useNavigate();
  const [, setParams] = useSearchParams();
  const [run, setRun] = useState<TestRun | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'baseline' | 'rerun' | 'cancel' | null>(null);
  const polling = useRef<number | null>(null);
  const confirm = useConfirm();

  // Parallel-agent suites tag every result with which agent config ran it —
  // when a run has 2+ distinct agents, default to the comparison grid.
  const agentNames = useMemo(() => new Set(results.map((r) => r.agentConfigName).filter(Boolean)), [results]);
  const [compareMode, setCompareMode] = useState(false);
  useEffect(() => { if (agentNames.size > 1) setCompareMode(true); }, [agentNames.size]);

  const fetch = useCallback(async () => {
    try {
      const [r, rs] = await Promise.all([
        getRun(workspaceId, runId),
        listResults(workspaceId, runId, 0, 500).catch(() => ({ items: [] as TestResult[] })),
      ]);
      setRun(r);
      setResults(rs?.items ?? []);
    } catch (e: any) {
      toast.error('Could not load run', { description: e?.message ?? '' });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, runId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Poll every 3s while still running so the user sees progress live.
  useEffect(() => {
    if (!run) return;
    if (run.status === 'queued' || run.status === 'running') {
      polling.current = window.setInterval(fetch, 3000);
      return () => { if (polling.current) clearInterval(polling.current); };
    }
  }, [run?.status, fetch]); // eslint-disable-line

  const handleSetBaseline = async () => {
    if (!run) return;
    setBusy('baseline');
    try {
      const updated = run.isBaseline
        ? await clearBaseline(workspaceId, run.id)
        : await setBaseline(workspaceId, run.id);
      setRun(updated);
      toast.success(updated.isBaseline ? 'Saved as baseline' : 'Baseline cleared');
      window.dispatchEvent(new CustomEvent('forgeq:ai-testing:refresh'));
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const handleRerun = async () => {
    if (!run) return;
    setBusy('rerun');
    try {
      const nr = await rerunRun(workspaceId, run.id);
      toast.success('Re-run queued');
      window.dispatchEvent(new CustomEvent('forgeq:ai-testing:refresh'));
      nav(`/projects/ai-testing?view=runs&run=${nr.id}`);
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const handleCancel = async () => {
    if (!run) return;
    const ok = await confirm({
      title: 'Cancel this run?',
      description: 'In-flight cases finish their current step, then the run stops. Already-completed cases keep their results.',
      confirmText: 'Cancel run',
      cancelText: 'Keep running',
      tone: 'warning',
      testId: 'run-cancel-confirm',
    });
    if (!ok) return;
    setBusy('cancel');
    try {
      const updated = await cancelRun(workspaceId, run.id);
      setRun(updated);
      toast.success('Cancel requested');
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  if (loading || !run) {
    return (
      <div className="space-y-4 p-6" data-testid="ai-testing-run-detail-skeleton">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-72" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const completion = run.total ? Math.round(((run.passed ?? 0) + (run.failed ?? 0) + (run.errored ?? 0)) / run.total * 100) : 0;
  const passRate = run.total ? Math.round(((run.passed ?? 0) / run.total) * 100) : 0;
  const inFlight = run.status === 'queued' || run.status === 'running';

  return (
    <div className="space-y-4 p-6" data-testid="ai-testing-run-detail">
      <button type="button" onClick={() => setParams({ view: 'runs' }, { replace: true })}
              data-testid="ai-testing-run-back"
              className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-3 w-3" /> Back to runs
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{run.suiteName}</h2>
            {run.isBaseline && (
              <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning"
                    data-testid="ai-testing-run-baseline-badge">
                BASELINE
              </span>
            )}
            <StatusPill status={run.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {run.provider}/{run.model} · {run.executionMode}
            {run.parallelism && run.executionMode === 'parallel' ? ` ×${run.parallelism}` : ''}
            {run.triggeredByEmail && <> · by {run.triggeredByEmail}</>}
            {run.createdAt && <> · {new Date(run.createdAt).toLocaleString()}</>}
            {run.triggerReason && <> · {run.triggerReason}</>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button"
                  onClick={handleSetBaseline}
                  disabled={!!busy || inFlight}
                  data-testid="ai-testing-run-baseline-toggle"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50',
                    run.isBaseline
                      ? 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20'
                      : 'border-border bg-surface hover:bg-elevated',
                  )}>
            {busy === 'baseline' ? <Loader2 className="h-3 w-3 animate-spin" /> :
              run.isBaseline ? <BookmarkX className="h-3 w-3" /> : <BookmarkCheck className="h-3 w-3" />}
            {run.isBaseline ? 'Clear baseline' : 'Save as baseline'}
          </button>
          <button type="button" onClick={handleRerun} disabled={!!busy || inFlight}
                  data-testid="ai-testing-run-rerun"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {busy === 'rerun' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Re-run
          </button>
          {inFlight && (
            <button type="button" onClick={handleCancel} disabled={!!busy}
                    data-testid="ai-testing-run-cancel"
                    className="inline-flex items-center gap-1 rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/20 disabled:opacity-50">
              {busy === 'cancel' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Verdict cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total" value={run.total ?? 0} icon={Zap} colour="text-primary" />
        <Stat label="Passed" value={run.passed ?? 0} icon={CheckCircle2} colour="text-success" />
        <Stat label="Failed" value={run.failed ?? 0} icon={XCircle} colour="text-danger" />
        <Stat label="Errored" value={run.errored ?? 0} icon={AlertTriangle} colour="text-warning" />
        <Stat label="Cost (USD)" value={'$' + (run.totalCostUsd ?? 0).toFixed(6)} icon={Clock} colour="text-text-primary" />
      </div>

      {/* Pass rate + completion bars */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-text-muted">
            <span>Pass rate</span><span className="tabular-nums text-text-primary">{passRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-elevated">
            <div className="h-full bg-success transition-all" style={{ width: `${passRate}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-text-muted">
            <span>Completion</span><span className="tabular-nums text-text-primary">{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-elevated">
            <div className={cn('h-full transition-all', inFlight ? 'bg-warning animate-pulse' : 'bg-primary')}
                 style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      {/* Per-case results */}
      <div className="mt-5 mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Per-case results</h3>
        {agentNames.size > 1 && (
          <div className="inline-flex rounded-md border border-border p-0.5 text-[11px]">
            <button type="button" onClick={() => setCompareMode(true)}
                    data-testid="ai-testing-results-compare-toggle"
                    className={cn('rounded px-2 py-1 font-semibold', compareMode ? 'bg-primary text-white' : 'text-text-secondary hover:bg-elevated')}>
              Compare agents
            </button>
            <button type="button" onClick={() => setCompareMode(false)}
                    className={cn('rounded px-2 py-1 font-semibold', !compareMode ? 'bg-primary text-white' : 'text-text-secondary hover:bg-elevated')}>
              List
            </button>
          </div>
        )}
      </div>
      {results.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-[11px] text-text-muted">
          {inFlight ? 'Run in progress — results will appear as cases finish.' : 'No results recorded.'}
        </div>
      ) : compareMode && agentNames.size > 1 ? (
        <AgentComparisonGrid results={results} />
      ) : (
        <ul className="space-y-1.5">
          {results.map((res) => (
            <ResultRow key={res.id} res={res} />
          ))}
        </ul>
      )}

      {run.errorMessage && (
        <div className="mt-4 rounded bg-danger/10 px-3 py-2 text-[12px] text-danger">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          {run.errorMessage}
        </div>
      )}
    </div>
  );
};

/* ─── Reusable bits ─────────────────────────────────────────────────── */
const ResultRow = ({ res }: { res: TestResult }) => {
  const [open, setOpen] = useState(false);
  const verdictColour =
    res.verdict === 'passed' ? 'border-success/40 bg-success/5' :
    res.verdict === 'failed' ? 'border-danger/40 bg-danger/5' :
    res.verdict === 'errored' ? 'border-warning/40 bg-warning/5' :
    'border-border bg-surface';
  return (
    <li className={cn('rounded-md border', verdictColour)}
        data-testid={`ai-testing-result-row-${res.id}`}>
      <button type="button" onClick={() => setOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px]">
        <VerdictIcon v={res.verdict} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {res.caseName}
            {res.agentConfigName && (
              <span className="ml-1.5 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300">
                {res.agentConfigName}
              </span>
            )}
          </div>
          <div className="truncate text-[10px] text-text-muted">
            {res.tokensPrompt ?? 0}+{res.tokensCompletion ?? 0} tok · ${(res.costUsd ?? 0).toFixed(6)} · {(res.latencyMs ?? 0)}ms
          </div>
        </div>
        <ChevronRight className={cn('h-3.5 w-3.5 text-text-muted transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2 text-[11px]">
          {res.errorMessage && (
            <div className="mb-2 rounded bg-danger/10 p-2 text-danger">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              {res.errorMessage}
            </div>
          )}
          {res.output && (
            <details className="mb-2 rounded border border-border bg-elevated/40 p-2" open>
              <summary className="cursor-pointer font-semibold">Model output</summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap">{res.output}</pre>
            </details>
          )}
          {res.assertionResults && res.assertionResults.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Assertions</div>
              <ul className="space-y-1">
                {res.assertionResults.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 rounded bg-elevated/30 px-2 py-1">
                    {a.passed
                      ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                      : <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-danger" />}
                    <div className="min-w-0">
                      <span className="font-semibold">{a.type}</span>
                      {a.details && <span className="ml-1 text-text-muted">— {a.details}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {res.toolCallSummary && (
            <div className="mt-2 rounded border border-border bg-elevated/30 p-2">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Tool-call accuracy
                {res.toolCallSummary.sequenceMatches != null && (
                  <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold normal-case',
                    res.toolCallSummary.sequenceMatches ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                    {res.toolCallSummary.sequenceMatches ? 'matches expected' : 'does not match expected'}
                  </span>
                )}
                {res.toolCallSummary.invalidCalls > 0 && (
                  <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold normal-case text-warning">
                    {res.toolCallSummary.invalidCalls} invalid arg{res.toolCallSummary.invalidCalls > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(res.toolCallSummary.callCounts).map(([tool, count]) => (
                  <span key={tool} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px]">{tool} ×{count}</span>
                ))}
                {Object.keys(res.toolCallSummary.callCounts).length === 0 && (
                  <span className="text-text-muted">No tools called</span>
                )}
              </div>
              {res.toolCallSummary.expectedSequence && (
                <div className="mt-1.5 text-[10px] text-text-muted">
                  expected: <span className="font-mono">{res.toolCallSummary.expectedSequence.join(' → ') || '(none)'}</span>{' '}
                  · actual: <span className="font-mono">{res.toolCallSummary.actualSequence.join(' → ') || '(none)'}</span>
                </div>
              )}
            </div>
          )}
          {res.agentTrace && res.agentTrace.length > 0 && (
            <details className="mt-2 rounded border border-border bg-elevated/30 p-2">
              <summary className="cursor-pointer font-semibold">{res.agentTrace.length} agent step(s)</summary>
              <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap text-[10px]">
                {JSON.stringify(res.agentTrace, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </li>
  );
};

const Stat = ({ icon: Icon, label, value, colour }: any) => (
  <div className="rounded-lg border border-border bg-surface px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <Icon className={`h-3.5 w-3.5 ${colour}`} />
    </div>
    <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
  </div>
);

const StatusPill = ({ status }: { status: TestRun['status'] }) => {
  const cfg: Record<string, { bg: string; t: string; label: string }> = {
    queued:    { bg: 'bg-text-muted/15',  t: 'text-text-muted',  label: 'queued' },
    running:   { bg: 'bg-warning/15',     t: 'text-warning animate-pulse', label: 'running' },
    succeeded: { bg: 'bg-success/15',     t: 'text-success',     label: 'succeeded' },
    failed:    { bg: 'bg-danger/15',      t: 'text-danger',      label: 'failed' },
    cancelled: { bg: 'bg-text-muted/15',  t: 'text-text-muted',  label: 'cancelled' },
  };
  const c = cfg[status] ?? cfg.queued;
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold', c.bg, c.t)}>
      {c.label}
    </span>
  );
};

const VerdictIcon = ({ v }: { v: TestResult['verdict'] }) =>
  v === 'passed' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> :
  v === 'failed' ? <XCircle className="h-3.5 w-3.5 shrink-0 text-danger" /> :
  v === 'errored' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" /> :
  <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" />;

/* ─── Parallel-agent comparison grid ────────────────────────────────────
 * One row per case, one column per agent config, so "which agent answered
 * this case best?" is a glance instead of scrolling a flat list looking
 * for matching case names across scattered rows. */
const AgentComparisonGrid = ({ results }: { results: TestResult[] }) => {
  const [selected, setSelected] = useState<TestResult | null>(null);

  const agents = useMemo(() => {
    const seen = new Map<string, string>();
    results.forEach((r) => { if (r.agentConfigId && !seen.has(r.agentConfigId)) seen.set(r.agentConfigId, r.agentConfigName || r.agentConfigId); });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [results]);

  const cases = useMemo(() => {
    const seen = new Map<string, string>();
    results.forEach((r) => { if (!seen.has(r.caseId)) seen.set(r.caseId, r.caseName); });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [results]);

  const agentStats = useMemo(() => agents.map((a) => {
    const rows = results.filter((r) => r.agentConfigId === a.id);
    const passed = rows.filter((r) => r.verdict === 'passed').length;
    const avgCost = rows.length ? rows.reduce((s, r) => s + (r.costUsd ?? 0), 0) / rows.length : 0;
    const avgLatency = rows.length ? rows.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / rows.length : 0;
    return { ...a, passed, total: rows.length, avgCost, avgLatency };
  }), [agents, results]);

  const cellFor = (caseId: string, agentId: string) =>
    results.find((r) => r.caseId === caseId && r.agentConfigId === agentId);

  return (
    <div className="space-y-3" data-testid="ai-testing-agent-comparison-grid">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-elevated/60">
              <th className="sticky left-0 z-1 min-w-[140px] bg-elevated/60 px-3 py-2 text-left font-semibold">Case</th>
              {agentStats.map((a) => (
                <th key={a.id} className="min-w-[150px] px-3 py-2 text-left font-semibold">
                  <div className="truncate">{a.name}</div>
                  <div className="mt-0.5 font-normal tabular-nums text-text-muted">
                    {a.passed}/{a.total} passed · ${a.avgCost.toFixed(5)} avg · {Math.round(a.avgLatency)}ms avg
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="sticky left-0 z-1 max-w-[160px] truncate bg-surface px-3 py-2 font-medium">{c.name}</td>
                {agents.map((a) => {
                  const r = cellFor(c.id, a.id);
                  if (!r) return <td key={a.id} className="px-3 py-2 text-text-muted">—</td>;
                  return (
                    <td key={a.id} className="px-2 py-1.5">
                      <button type="button" onClick={() => setSelected(r)}
                              data-testid={`ai-testing-compare-cell-${c.id}-${a.id}`}
                              className={cn(
                                'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left transition-colors hover:opacity-80',
                                selected?.id === r.id && 'ring-2 ring-primary',
                                r.verdict === 'passed' ? 'bg-success/10 text-success' :
                                r.verdict === 'failed' ? 'bg-danger/10 text-danger' :
                                'bg-warning/10 text-warning',
                              )}>
                            <VerdictIcon v={r.verdict} />
                            <span className="tabular-nums">{r.latencyMs ?? 0}ms</span>
                          </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="rounded-md border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold">
              {selected.caseName} <span className="text-text-muted">·</span> {selected.agentConfigName}
            </div>
            <button type="button" onClick={() => setSelected(null)}
                    className="text-[11px] text-text-muted hover:text-text-primary">
              Close
            </button>
          </div>
          <ResultRow res={selected} />
        </div>
      ) : (
        <p className="text-[11px] text-text-muted">Click any cell to inspect that agent's output for that case.</p>
      )}
    </div>
  );
};
