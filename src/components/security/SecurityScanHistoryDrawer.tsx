/**
 * SecurityScanHistoryDrawer — slide-in panel listing every past security
 * scan run. Click any row to load that run's full findings back into the
 * SecurityScanPage so the user can review remediation status, re-export
 * findings, or create bugs from old findings without re-running the scan.
 *
 * Data sources:
 *   • GET /api/v1/functional-tests/security/scan              — list runs (newest first)
 *   • GET /api/v1/functional-tests/security/scan/{runId}      — full run with findings
 *
 * Both endpoints exist in `SecurityScanController.java`; we just surface
 * them. No backend changes required.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  History, X, AlertTriangle, CheckCircle2, Loader2, Search, RefreshCw,
  Clock,
} from 'lucide-react';
import { cn } from '@/utils/cn';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type RunStatus = 'RUNNING' | 'DONE' | 'CANCELLED' | 'FAILED';

export interface HistoryFinding {
  findingId: string;
  checkId: string;
  name: string;
  passed: boolean;
  severity: Severity;
  detail: string;
  remediation?: string;
  evidence?: string;
  whatItTests: string;
  howItWorks: string;
  endpointsTested: string[];
  durationMs: number;
  linkedBugId?: string;
  notified?: boolean;
}

export interface HistoryRun {
  id: string;
  targetUrl: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  findings: HistoryFinding[];
  severeCount?: number;
  triggeredBy?: string;
  probesRequested?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  baseUrl: string;          // e.g. `${SVC}/api/v1/functional-tests/security`
  /** Called when the user picks a past run — caller hydrates the page. */
  onLoadRun: (run: HistoryRun) => void;
  /** Currently-loaded run id (so we can highlight it). */
  activeRunId?: string | null;
}

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const fmtDuration = (a: string, b?: string) => {
  if (!b) return '—';
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} m`;
};

const statusTone: Record<RunStatus, string> = {
  RUNNING:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  DONE:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  FAILED:    'bg-red-500/15 text-red-400 border-red-500/30',
};

export function SecurityScanHistoryDrawer({
  open,
  onClose,
  baseUrl,
  onLoadRun,
  activeRunId,
}: Props) {
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'ALL'>('ALL');
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await axios.get<HistoryRun[]>(`${baseUrl}/scan`);
      const sorted = (r.data ?? []).slice().sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setRuns(sorted);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  // Refresh whenever the drawer opens — cheap (one GET, returns the
  // newest-first list) so worth doing every time vs cache invalidation.
  useEffect(() => {
    if (open) fetchHistory();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRun = async (id: string) => {
    setLoadingRunId(id);
    try {
      // Fetch the full run (the list endpoint already returns findings
      // but we re-fetch to guarantee freshness for the active row).
      const r = await axios.get<HistoryRun>(`${baseUrl}/scan/${id}`);
      onLoadRun(r.data);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load run');
    } finally {
      setLoadingRunId(null);
    }
  };

  const visibleRuns = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return runs.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.targetUrl?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.triggeredBy ?? '').toLowerCase().includes(q)
      );
    });
  }, [runs, filter, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<RunStatus | 'ALL', number> = { ALL: runs.length, RUNNING: 0, DONE: 0, CANCELLED: 0, FAILED: 0 };
    for (const r of runs) c[r.status]++;
    return c;
  }, [runs]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop. Click anywhere outside the drawer to close. */}
      <div
        data-testid="security-history-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Drawer — slides in from the right. */}
      <aside
        data-testid="security-history-drawer"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col border-l border-border bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <div>
              <div className="text-base font-semibold text-text-primary">Scan history</div>
              <div className="text-[11px] text-text-muted">Every past run for this workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              data-testid="history-refresh"
              onClick={fetchHistory}
              className="rounded p-1.5 text-text-muted hover:bg-hover hover:text-text-primary"
              title="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              data-testid="history-close"
              onClick={onClose}
              className="rounded p-1.5 text-text-muted hover:bg-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex shrink-0 flex-col gap-2 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                data-testid="history-search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search target URL, run id, user…"
                className="w-full rounded-md border border-border bg-transparent py-1.5 pl-7 pr-2 text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            {(['ALL', 'DONE', 'RUNNING', 'CANCELLED', 'FAILED'] as const).map((s) => (
              <button
                key={s}
                data-testid={`history-filter-${s.toLowerCase()}`}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 transition-colors',
                  statusFilter === s
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-text-muted hover:bg-hover',
                )}
              >
                {s} <span className="ml-1 opacity-70">({counts[s] ?? 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body — runs list */}
        <div className="flex-1 overflow-y-auto px-3 py-2" data-testid="history-list">
          {loading && runs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading history…
            </div>
          ) : error ? (
            <div className="m-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          ) : visibleRuns.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-text-muted">
              <Clock className="h-6 w-6 opacity-40" />
              {runs.length === 0
                ? 'No security scans recorded yet. Start a scan to build history.'
                : 'No runs match your filter.'}
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5 py-1">
              {visibleRuns.map((r) => {
                const fails = r.findings?.filter((f) => !f.passed).length ?? 0;
                const sev = r.findings?.reduce<Record<string, number>>((acc, f) => {
                  if (!f.passed) acc[f.severity] = (acc[f.severity] ?? 0) + 1;
                  return acc;
                }, {}) ?? {};
                const total = r.findings?.length ?? r.probesRequested?.length ?? 0;
                const isActive = activeRunId === r.id;
                return (
                  <li key={r.id}>
                    <button
                      data-testid={`history-row-${r.id}`}
                      onClick={() => loadRun(r.id)}
                      disabled={loadingRunId === r.id}
                      className={cn(
                        'group w-full rounded-md border px-3 py-2 text-left transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-hover/30',
                        loadingRunId === r.id && 'opacity-60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase',
                                statusTone[r.status],
                              )}
                            >
                              {r.status}
                            </span>
                            <span className="truncate font-mono text-[11px] text-text-primary">
                              {r.targetUrl}
                            </span>
                            {loadingRunId === r.id && (
                              <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-text-muted">
                            <span>{fmtDate(r.startedAt)}</span>
                            <span>· {fmtDuration(r.startedAt, r.finishedAt)}</span>
                            <span>· {total} probes</span>
                            {r.triggeredBy && r.triggeredBy !== 'anonymous' && (
                              <span>· by {r.triggeredBy}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {fails > 0 ? (
                            <span
                              className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400"
                              title="Failed probes"
                            >
                              <AlertTriangle className="h-3 w-3" /> {fails}
                            </span>
                          ) : r.status === 'DONE' ? (
                            <span
                              className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
                              title="All passed"
                            >
                              <CheckCircle2 className="h-3 w-3" /> pass
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {fails > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => sev[s] ? (
                            <span
                              key={s}
                              className={cn(
                                'rounded px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide',
                                s === 'CRITICAL' || s === 'HIGH'
                                  ? 'bg-red-500/15 text-red-400'
                                  : s === 'MEDIUM'
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-sky-500/15 text-sky-400',
                              )}
                            >
                              {s} {sev[s]}
                            </span>
                          ) : null)}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-2 text-[10px] text-text-muted">
          Showing {visibleRuns.length} of {runs.length} runs
        </div>
      </aside>
    </>
  );
}

export default SecurityScanHistoryDrawer;
