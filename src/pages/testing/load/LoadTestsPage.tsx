/**
 * LoadTestsPage — section content for `useTestingStore.section === 'load'`.
 *
 * Internal tab strip:
 *   • Runs       (default)  — InlineStartLoadRunForm ↔ LiveLoadRunPanel + recent runs
 *   • Dashboard              — KPI overview + recent runs
 *   • Schedules              — cron-driven jobs
 *   • Analytics              — trend chart for a chosen test spec
 *
 * Tab persisted via `useTestingStore.loadTab`.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gauge, LayoutDashboard, ListTree, CalendarClock, LineChart,
  PlayCircle, Activity, CheckCircle2, XCircle, AlertOctagon, Ban,
  Pause, Play, RefreshCw, AlertTriangle, Trash2, Zap, Loader2, Plus,
  Sparkles, ArrowRight, GitCompareArrows,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTestingStore } from '@/stores/testing.store';
import { useRunsTracker } from '@/stores/runsTracker.store';
import {
  getDashboard, listRuns, listSchedules, createSchedule, pauseSchedule,
  resumeSchedule, triggerSchedule, deleteSchedule,
  cancelRun, pauseRun, resumeRun, getTrend,
  type LoadRun, type LoadSchedule, type TrendPoint,
} from '@/services/loadTest.service';
import { listTestSpecs } from '@/services/testSpec.service';
import { listEnvironments } from '@/services/environment.service';
import { listCollections } from '@/services/collection.service';
import { RunStatusBadge, formatDuration } from '../functional/shared/RunBadges';
import { formatRelative } from '../shared/Badges';
import { InlineStartLoadRunForm } from './InlineStartLoadRunForm';
import { LiveLoadRunPanel } from './LiveLoadRunPanel';
import { CompareLoadRunsModal } from './CompareLoadRunsModal';
import { cn } from '@/utils/cn';

const TABS = [
  { key: 'runner',     label: 'Runner',    icon: PlayCircle,      testId: 'load-tab-runner' },
  { key: 'runs',       label: 'Runs',      icon: ListTree,        testId: 'load-tab-runs' },
  { key: 'dashboard',  label: 'Dashboard', icon: LayoutDashboard, testId: 'load-tab-dashboard' },
  { key: 'schedules',  label: 'Schedules', icon: CalendarClock,   testId: 'load-tab-schedules' },
  { key: 'analytics',  label: 'Analytics', icon: LineChart,       testId: 'load-tab-analytics' },
] as const;

export const LoadTestsPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const tab = useTestingStore((s) => s.loadTab);
  const setTab = useTestingStore((s) => s.setLoadTab);
  const trackedCount = useRunsTracker((s) => Object.values(s.runs).filter((r) => r.kind === 'load').length);

  if (!ws) {
    return (
      <NoProjectEmpty testId="load-no-workspace" icon="load-test" surface="load tests" />
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="load-tests-page">
      <header className="border-b border-border bg-surface/30 px-6 pt-3">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Gauge className="h-4 w-4 text-primary" /> Load Tests
          </h1>
          <span className="text-[11px] text-text-muted">
            · Concurrency · target RPS · ramp-up · thresholds. Throughput &amp; p95 from the Java engine.
          </span>
          {trackedCount > 0 && (
            <span data-testid="load-tracked-count" className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              {trackedCount} load run{trackedCount > 1 ? 's' : ''} in flight
            </span>
          )}
        </div>
        <nav role="tablist" className="-mb-px mt-3 flex gap-1" data-testid="load-tabs">
          {TABS.map((t) => {
            const isActive = tab === (t.key as any);
            return (
              <button
                key={t.key}
                role="tab"
                data-testid={t.testId}
                onClick={() => setTab(t.key as any)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>
      <div className="flex-1 overflow-hidden">
        {tab === 'runner'     && <LoadRunnerTab workspaceId={ws.id} />}
        {tab === 'runs'       && <LoadRunsTab workspaceId={ws.id} />}
        {tab === 'dashboard'  && <LoadDashboard workspaceId={ws.id} />}
        {tab === 'schedules'  && <LoadSchedulesList workspaceId={ws.id} />}
        {tab === 'analytics'  && <LoadAnalytics workspaceId={ws.id} />}
      </div>
    </div>
  );
};

/* ──────── RUNNER TAB (form / live stream only) ───────────────── */
const LoadRunnerTab = ({ workspaceId }: { workspaceId: string }) => {
  const liveRunId = useTestingStore((s) => s.liveLoadRunId);
  return (
    <div className="h-full overflow-auto" data-testid="load-runner-tab">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        {liveRunId
          ? <LiveLoadRunPanel runId={liveRunId} />
          : <InlineStartLoadRunForm workspaceId={workspaceId} />}
      </div>
    </div>
  );
};

/* ──────── RUNS TAB (recent runs table only) ──────────────────── */
const LoadRunsTab = ({ workspaceId }: { workspaceId: string }) => {
  return (
    <div className="h-full overflow-auto" data-testid="load-runs-tab">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <LoadRecentRuns workspaceId={workspaceId} />
      </div>
    </div>
  );
};

const STATUSES = ['ALL', 'QUEUED', 'RUNNING', 'PAUSED', 'SUCCESS', 'FAILED', 'ERROR', 'CANCELLED'] as const;

const LoadRecentRuns = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const openLoadRun = useTestingStore((s) => s.openLoadRun);
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<LoadRun[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const q = useQuery({
    queryKey: ['loadTest', 'runs', workspaceId, status, page],
    queryFn: () => listRuns(workspaceId, { status: status === 'ALL' ? undefined : status, page, size: 12 }),
    refetchInterval: 4000,
  });
  const cancelMut = useMutation({ mutationFn: (id: string) => cancelRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['loadTest'] }) });
  const pauseMut  = useMutation({ mutationFn: (id: string) => pauseRun(id),  onSuccess: () => qc.invalidateQueries({ queryKey: ['loadTest'] }) });
  const resumeMut = useMutation({ mutationFn: (id: string) => resumeRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['loadTest'] }) });

  const runs = q.data?.content ?? [];
  const totalPages = q.data?.totalPages ?? 0;

  const toggleSelect = (run: LoadRun) => {
    setSelected((prev) => {
      if (prev.some((r) => r.runId === run.runId)) return prev.filter((r) => r.runId !== run.runId);
      return prev.length < 2 ? [...prev, run] : [prev[1], run];
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface/40 shadow-sm" data-testid="load-recent-section">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-elevated/30 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ListTree className="h-4 w-4 text-primary" /> Recent load runs
          <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">{q.data?.totalElements ?? 0}</span>
        </h2>
        {selected.length > 0 && (
          <span className="text-[10px] text-text-muted" data-testid="load-compare-count">
            {selected.length}/2 selected for compare
          </span>
        )}
        <Button
          size="sm"
          variant={selected.length === 2 ? 'primary' : 'outline'}
          disabled={selected.length !== 2}
          onClick={() => setCompareOpen(true)}
          data-testid="compare-load-runs-btn"
          className="ml-auto"
        >
          <GitCompareArrows className="h-3.5 w-3.5" /> Compare {selected.length === 2 && '2 runs'}
        </Button>
        <select data-testid="load-runs-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="h-8 rounded-md border border-border bg-probestack-bg px-2 text-xs">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>)}
        </select>
        <Button size="sm" variant="ghost" onClick={() => q.refetch()} data-testid="load-runs-refresh"><RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} /></Button>
      </header>
      {q.isLoading
        ? <div className="space-y-1 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        : runs.length === 0
          ? <div className="flex flex-col items-center justify-center p-10 text-center" data-testid="load-runs-list-empty">
              <ListTree className="mb-2 h-8 w-8 text-text-muted" />
              <p className="text-sm font-medium">No load runs match this filter</p>
            </div>
          : <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-elevated/40 text-text-muted">
                  <tr>
                    <Th><span className="sr-only">Compare</span></Th>
                    <Th>Name</Th><Th>Status</Th><Th>RPS</Th><Th>p95</Th><Th>Errors</Th><Th>Queued</Th><Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const checked = selected.some((s) => s.runId === r.runId);
                    return (
                      <tr key={r.runId} className={cn('border-t border-border/40 hover:bg-hover/40', checked && 'bg-primary/[0.06]')} data-testid={`load-runs-row-${r.runId}`}>
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(r)}
                            data-testid={`load-runs-compare-check-${r.runId}`}
                            className="h-3.5 w-3.5 cursor-pointer accent-primary"
                          />
                        </td>
                        <td className="px-3 py-2.5"><button onClick={() => openLoadRun(r.runId)} className="font-medium hover:text-primary">{r.name || r.runId.slice(0, 8)}</button></td>
                        <td className="px-3 py-2.5"><RunStatusBadge status={r.status} /></td>
                        <td className="px-3 py-2.5 font-mono text-[10px]">{(r.actualRps ?? 0).toFixed(1)}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px]">{r.percentiles?.['95'] ?? 0}ms</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-danger">{r.failedRequests ?? 0}</td>
                        <td className="px-3 py-2.5 text-[10px] text-text-muted">{formatRelative(typeof r.queuedAt === 'string' ? r.queuedAt : '')}</td>
                        <td className="px-3 py-2.5 text-right">
                          {r.status === 'RUNNING' && <Button size="sm" variant="ghost" onClick={() => pauseMut.mutate(r.runId)}><Pause className="h-3.5 w-3.5" /></Button>}
                          {r.status === 'PAUSED' && <Button size="sm" variant="ghost" onClick={() => resumeMut.mutate(r.runId)}><Play className="h-3.5 w-3.5" /></Button>}
                          {(r.status === 'RUNNING' || r.status === 'PAUSED') && <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(r.runId)}><Ban className="h-3.5 w-3.5" /></Button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      }
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 text-xs">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} data-testid="load-runs-prev">Prev</Button>
          <span className="text-text-muted">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} data-testid="load-runs-next">Next</Button>
        </div>
      )}
      <CompareLoadRunsModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        baseRun={selected[0] ?? null}
        compareRun={selected[1] ?? null}
      />
    </section>
  );
};

/* ──────── DASHBOARD (overview only) ──────────────────────────────── */
const LoadDashboard = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const openLoadRun = useTestingStore((s) => s.openLoadRun);
  const setTab = useTestingStore((s) => s.setLoadTab);

  const dashQ = useQuery({
    queryKey: ['loadTest', 'dashboard', workspaceId],
    queryFn: () => getDashboard(workspaceId),
    refetchInterval: 4000,
  });
  const runsQ = useQuery({
    queryKey: ['loadTest', 'runs', workspaceId, 'recent'],
    queryFn: () => listRuns(workspaceId, { size: 8 }),
    refetchInterval: 4000,
  });

  const cancelMut = useMutation({ mutationFn: (id: string) => cancelRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['loadTest'] }) });
  const pauseMut  = useMutation({ mutationFn: (id: string) => pauseRun(id),  onSuccess: () => qc.invalidateQueries({ queryKey: ['loadTest'] }) });
  const resumeMut = useMutation({ mutationFn: (id: string) => resumeRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['loadTest'] }) });

  const dash = dashQ.data;
  const runs = runsQ.data?.content ?? [];

  return (
    <div className="h-full overflow-auto" data-testid="load-dashboard">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section data-testid="load-kpi-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Tile icon={Activity}     label="Total runs" value={dash?.runsTotal ?? 0}      testId="load-kpi-total" />
          <Tile icon={PlayCircle}   label="Running"    value={dash?.runsRunning ?? 0}    tone="amber"   testId="load-kpi-running" />
          <Tile icon={CheckCircle2} label="Success"    value={dash?.runsSuccess ?? 0}    tone="success" testId="load-kpi-success" />
          <Tile icon={XCircle}      label="Failed"     value={dash?.runsFailed ?? 0}     tone="warning" testId="load-kpi-failed" />
          <Tile icon={AlertOctagon} label="Error"      value={dash?.runsError ?? 0}      tone="danger"  testId="load-kpi-error" />
          <Tile icon={Ban}          label="Cancelled"  value={dash?.runsCancelled ?? 0}  tone="muted"   testId="load-kpi-cancelled" />
          <Tile icon={Gauge}        label="Pass rate"  value={`${(dash?.passRatePct ?? 0).toFixed(1)}%`} tone="success" testId="load-kpi-passrate" />
        </section>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.10] to-amber-500/[0.06] px-5 py-4 shadow-sm" data-testid="load-cta-card">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Ready to load-test?</p>
            <p className="text-[11px] text-text-muted">Pick a source, set concurrency &amp; duration, expand <em>Advanced</em> for ramp-up.</p>
          </div>
          <Button variant="primary" size="md" onClick={() => setTab('runner')} className="ml-auto" data-testid="load-dashboard-go-runs">
            Go to Runner <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface/40 shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-border bg-elevated/30 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Recent load runs</h2>
            <Button size="sm" variant="ghost" onClick={() => setTab('runs')} data-testid="load-dashboard-see-all">
              See all <ArrowRight className="h-3 w-3" />
            </Button>
          </header>
          {runsQ.isLoading
            ? <div className="space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : runs.length === 0
              ? <div className="p-10 text-center" data-testid="load-runs-empty">
                  <PlayCircle className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                  <p className="text-sm font-medium">No load runs yet</p>
          <p className="mt-1 text-xs text-text-muted">Head to the <strong>Runner</strong> tab to queue one.</p>
                </div>
              : <ul className="divide-y divide-border" data-testid="load-recent-runs">
                  {runs.map((r) => <LoadRunRow key={r.runId} run={r}
                    onOpen={() => openLoadRun(r.runId)}
                    onCancel={() => cancelMut.mutate(r.runId)}
                    onPause={()  => pauseMut.mutate(r.runId)}
                    onResume={() => resumeMut.mutate(r.runId)} />)}
                </ul>
          }
        </section>
      </div>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, tone = 'default', testId }: {
  icon: any; label: string; value: number | string; tone?: 'default' | 'amber' | 'success' | 'warning' | 'danger' | 'muted'; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary', amber: 'text-amber-400', success: 'text-success',
    warning: 'text-warning', danger: 'text-danger', muted: 'text-text-muted',
  };
  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-surface/40 p-4 transition-colors hover:bg-surface/60">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn('text-xl font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};

const LoadRunRow = ({ run, onOpen, onCancel, onPause, onResume }: {
  run: LoadRun; onOpen: () => void; onCancel: () => void; onPause: () => void; onResume: () => void;
}) => {
  const isRunning = run.status === 'RUNNING';
  const isPaused  = run.status === 'PAUSED';
  return (
    <li data-testid={`load-run-row-${run.runId}`} className="flex items-center gap-3 px-5 py-2.5 text-xs">
      <button onClick={onOpen} className="min-w-0 flex-1 truncate text-left font-medium hover:text-primary">
        {run.name || run.runId.slice(0, 8)}
      </button>
      <RunStatusBadge status={run.status} />
      <span className="font-mono text-[10px] text-text-muted">{(run.actualRps ?? 0).toFixed(1)} rps</span>
      <span className="font-mono text-[10px] text-text-muted">p95 {(run.percentiles?.['95'] ?? 0)}ms</span>
      <span className="w-20 truncate text-right text-[10px] text-text-muted">{formatRelative(typeof run.queuedAt === 'string' ? run.queuedAt : '')}</span>
      <span className="flex shrink-0 items-center gap-0.5">
        {isRunning && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onPause(); }} data-testid={`load-pause-${run.runId}`}><Pause className="h-3.5 w-3.5" /></Button>}
        {isPaused  && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onResume(); }} data-testid={`load-resume-${run.runId}`}><Play  className="h-3.5 w-3.5" /></Button>}
        {(isRunning || isPaused) && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onCancel(); }} data-testid={`load-cancel-${run.runId}`}><Ban className="h-3.5 w-3.5" /></Button>}
      </span>
    </li>
  );
};

const Th = ({ children, align }: { children: React.ReactNode; align?: 'right' }) => (
  <th className={cn('px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider', align === 'right' && 'text-right')}>{children}</th>
);

/* ──────── SCHEDULES ──────────────────────────────────────────────── */
const LoadSchedulesList = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoadSchedule | null>(null);

  const q = useQuery({ queryKey: ['loadTest', 'schedules', workspaceId], queryFn: () => listSchedules(workspaceId, { size: 50 }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['loadTest', 'schedules', workspaceId] });
  const pauseMut   = useMutation({ mutationFn: (id: string) => pauseSchedule(id),   onSuccess: invalidate });
  const resumeMut  = useMutation({ mutationFn: (id: string) => resumeSchedule(id),  onSuccess: invalidate });
  const triggerMut = useMutation({ mutationFn: (id: string) => triggerSchedule(id), onSuccess: invalidate });
  const deleteMut  = useMutation({ mutationFn: (id: string) => deleteSchedule(id),  onSuccess: invalidate });

  const items = q.data?.content ?? [];

  return (
    <div className="h-full overflow-auto p-6" data-testid="load-schedules-tab">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <CalendarClock className="h-4 w-4 text-primary" /> Load schedules
            <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">{items.length}</span>
          </h2>
          <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)} data-testid="load-schedule-create-btn" className="ml-auto">
            <Plus className="h-3.5 w-3.5" /> New schedule
          </Button>
        </div>
        <div className="overflow-auto rounded-lg border border-border">
          {q.isLoading
            ? <div className="space-y-1 p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : items.length === 0
              ? <div className="flex h-full flex-col items-center justify-center p-10 text-center" data-testid="load-schedules-empty">
                  <CalendarClock className="mb-2 h-8 w-8 text-text-muted" />
                  <p className="text-sm font-medium">No load schedules yet</p>
                </div>
              : <ul className="divide-y divide-border">
                  {items.map((s) => (
                    <li key={s.scheduleId} className="flex items-center gap-3 px-4 py-3 text-xs" data-testid={`load-schedule-row-${s.scheduleId}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{s.name || s.scheduleId.slice(0, 8)}</span>
                          <span className={cn(
                            'rounded border px-1 py-px text-[9px] font-semibold uppercase tracking-wider',
                            s.status === 'PAUSED'
                              ? 'border-warning/30 bg-warning/10 text-warning'
                              : 'border-success/30 bg-success/10 text-success',
                          )}>
                            {s.status ?? 'ACTIVE'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                          <code className="rounded bg-elevated px-1.5 py-0.5 font-mono">{s.cron}</code>
                          {s.timezone && <span>{s.timezone}</span>}
                          {s.lastRunStatus && <span>· last: {s.lastRunStatus}</span>}
                          {s.nextRunAt && <span>· next {formatRelative(typeof s.nextRunAt === 'string' ? s.nextRunAt : '')}</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => triggerMut.mutate(s.scheduleId)} aria-label="Trigger now"><Zap className="h-3.5 w-3.5" /></Button>
                      {s.status === 'PAUSED'
                        ? <Button size="sm" variant="ghost" onClick={() => resumeMut.mutate(s.scheduleId)}><Play className="h-3.5 w-3.5" /></Button>
                        : <Button size="sm" variant="ghost" onClick={() => pauseMut.mutate(s.scheduleId)}><Pause className="h-3.5 w-3.5" /></Button>}
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </li>
                  ))}
                </ul>
          }
        </div>
        <CreateLoadScheduleModal open={createOpen} onClose={() => setCreateOpen(false)} workspaceId={workspaceId} onCreated={() => { setCreateOpen(false); invalidate(); }} />
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
          title="Delete load schedule?"
          description={deleteTarget ? `"${deleteTarget.name ?? deleteTarget.scheduleId}" will be permanently deleted.` : ''}
          confirmText="Delete" tone="danger"
          onConfirm={async () => { if (deleteTarget) await deleteMut.mutateAsync(deleteTarget.scheduleId); }}
        />
      </div>
    </div>
  );
};

const CreateLoadScheduleModal = ({
  open, onClose, workspaceId, onCreated,
}: { open: boolean; onClose: () => void; workspaceId: string; onCreated: () => void }) => {
  const [name, setName] = useState('');
  const [source, setSource] = useState<'spec' | 'collection'>('spec');
  const [testSpecId, setTestSpecId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [cron, setCron] = useState('0 0 * * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [concurrency, setConcurrency] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const specsQ = useQuery({
    queryKey: ['testSpec', 'list', workspaceId, 'ACTIVE', ''],
    queryFn: () => listTestSpecs(workspaceId, { status: 'ACTIVE', size: 100 }),
    enabled: open,
  });
  const collectionsQ = useQuery({
    queryKey: ['collection', 'list', workspaceId],
    queryFn: () => listCollections(workspaceId),
    enabled: open,
  });
  const envsQ = useQuery({
    queryKey: ['environment', 'list', workspaceId],
    queryFn: () => listEnvironments(workspaceId),
    enabled: open,
  });

  const mut = useMutation({
    mutationFn: () => createSchedule({
      workspaceId,
      name: name.trim() || undefined,
      testSpecId:   source === 'spec'       && testSpecId   ? testSpecId   : undefined,
      collectionId: source === 'collection' && collectionId ? collectionId : undefined,
      environmentId: environmentId || undefined,
      cron: cron.trim(),
      timezone: timezone.trim() || undefined,
      config: { concurrency, durationSeconds },
    }),
    onSuccess: () => onCreated(),
    onError: (e: any) => setError(e?.message ?? 'Failed to create schedule'),
  });

  return (
    <Modal
      open={open} onClose={onClose} title="New load schedule" icon={CalendarClock} size="md"
      testId="load-schedule-create-modal"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => mut.mutate()}
            disabled={
              (source === 'spec' && !testSpecId) ||
              (source === 'collection' && !collectionId) ||
              !cron.trim() || mut.isPending
            }
            data-testid="load-schedule-create-submit"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
          </Button>
        </>
      }
    >
      {error && <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
      <div className="space-y-3">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={cls()} placeholder="Hourly load smoke" /></Field>
        <Field label="Run source" required>
          <div className="flex gap-2 text-[11px]" data-testid="load-schedule-source">
            <label className={`flex items-center gap-1.5 rounded border px-2 py-1 cursor-pointer ${source === 'spec' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
              <input type="radio" className="hidden" checked={source === 'spec'} onChange={() => setSource('spec')} />
              Test Spec
            </label>
            <label className={`flex items-center gap-1.5 rounded border px-2 py-1 cursor-pointer ${source === 'collection' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
              <input type="radio" className="hidden" checked={source === 'collection'} onChange={() => setSource('collection')} />
              Collection
            </label>
          </div>
        </Field>
        {source === 'spec' && (
          <Field label="Test spec" required>
            <select value={testSpecId} onChange={(e) => setTestSpecId(e.target.value)} className={cls()} data-testid="load-schedule-spec">
              <option value="">— select —</option>
              {specsQ.data?.content.map((s) => <option key={s.testSpecId} value={s.testSpecId}>{s.name}</option>)}
            </select>
          </Field>
        )}
        {source === 'collection' && (
          <Field label="Collection" required>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={cls()} data-testid="load-schedule-collection">
              <option value="">— select —</option>
              {(collectionsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Environment">
          <select value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)} className={cls()}>
            <option value="">— none —</option>
            {(envsQ.data ?? []).map((e: any) => {
              const scope = String(e.scope ?? 'ENVIRONMENT').toUpperCase();
              return (
                <option key={e.id ?? e.environmentId} value={e.id ?? e.environmentId}>{e.name} ({scope})</option>
              );
            })}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Schedule" required>
            <select
              value={LOAD_CRON_PRESETS.some((p) => p.value === cron) ? cron : '__custom__'}
              onChange={(e) => { if (e.target.value !== '__custom__') setCron(e.target.value); }}
              className={cls()}
              data-testid="load-schedule-cron-preset"
            >
              {LOAD_CRON_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              <option value="__custom__">Custom (enter cron below)</option>
            </select>
          </Field>
          <Field label="Timezone">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={cls()} data-testid="load-schedule-tz">
              {LOAD_TZ_PRESETS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Custom cron"><input value={cron} onChange={(e) => setCron(e.target.value)} className={`${cls()} font-mono`} /></Field>
          <Field label="Concurrency"><input type="number" value={concurrency} min={1} max={500} onChange={(e) => setConcurrency(Number(e.target.value))} className={`${cls()} font-mono`} /></Field>
          <Field label="Duration (s)"><input type="number" value={durationSeconds} min={1} max={3600} onChange={(e) => setDurationSeconds(Number(e.target.value))} className={`${cls()} font-mono`} /></Field>
        </div>
      </div>
    </Modal>
  );
};

// Same preset lists as the functional scheduler — kept inline to avoid
// cross-package coupling for such a small constant.
const LOAD_CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Every 15 minutes',        value: '0 */15 * * * *'      },
  { label: 'Every 30 minutes',        value: '0 */30 * * * *'      },
  { label: 'Hourly (on the hour)',    value: '0 0 * * * *'         },
  { label: 'Every 6 hours',           value: '0 0 */6 * * *'       },
  { label: 'Daily at 09:00',          value: '0 0 9 * * *'         },
  { label: 'Daily at midnight',       value: '0 0 0 * * *'         },
  { label: 'Weekdays at 09:00',       value: '0 0 9 * * MON-FRI'   },
  { label: 'Weekly Monday 09:00',     value: '0 0 9 * * MON'       },
];
const LOAD_TZ_PRESETS: string[] = [
  'UTC', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Dubai',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Australia/Sydney',
];

/* ──────── ANALYTICS ──────────────────────────────────────────────── */
const LoadAnalytics = ({ workspaceId }: { workspaceId: string }) => {
  const specsQ = useQuery({
    queryKey: ['testSpec', 'list', workspaceId, 'ACTIVE', ''],
    queryFn: () => listTestSpecs(workspaceId, { status: 'ACTIVE', size: 100 }),
  });
  const [testSpecId, setTestSpecId] = useState('');
  const [limit, setLimit] = useState(20);

  const specs = specsQ.data?.content ?? [];
  if (!testSpecId && specs[0]) setTimeout(() => setTestSpecId(specs[0].testSpecId), 0);

  const trendQ = useQuery({
    queryKey: ['loadTest', 'trend', testSpecId, limit],
    queryFn: () => getTrend(testSpecId, 'TEST_SPEC', limit),
    enabled: !!testSpecId,
  });

  return (
    <div className="h-full overflow-auto p-6" data-testid="load-analytics-tab">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Test spec:</span>
          <select value={testSpecId} onChange={(e) => setTestSpecId(e.target.value)} data-testid="load-analytics-spec" className="h-7 rounded border border-border bg-probestack-bg px-2 text-xs">
            {specs.map((s) => <option key={s.testSpecId} value={s.testSpecId}>{s.name}</option>)}
          </select>
          <span className="ml-auto text-xs font-medium text-text-secondary">last:</span>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} data-testid="load-analytics-limit" className="h-7 rounded border border-border bg-probestack-bg px-2 text-xs">
            {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} runs</option>)}
          </select>
        </div>
        <section className="rounded-xl border border-border bg-surface/40">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold tracking-tight">Load trend</h2>
            <AlertTriangle className="ml-auto h-3 w-3 text-text-muted" />
            <span className="text-[10px] text-text-muted">RPS · p95 · error rate</span>
          </header>
          <TrendBlock loading={trendQ.isLoading} points={trendQ.data ?? []} />
        </section>
      </div>
    </div>
  );
};

const TrendBlock = ({ loading, points }: { loading: boolean; points: TrendPoint[] }) => {
  if (loading) return <div className="space-y-1 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>;
  if (points.length === 0) return <p className="px-4 py-6 text-center text-xs text-text-muted" data-testid="load-trend-empty">Not enough load runs yet.</p>;
  const maxRps = Math.max(1, ...points.map((p) => p.actualRps ?? 0));
  return (
    <div className="p-4" data-testid="load-trend-content">
      <div className="mb-4 flex h-20 items-end gap-1">
        {points.map((p) => {
          const h = Math.max(2, ((p.actualRps ?? 0) / maxRps) * 80);
          const tone = p.status === 'SUCCESS' ? 'bg-success' : p.status === 'FAILED' ? 'bg-danger' : 'bg-amber-400';
          return (
            <div key={p.runId} title={`${p.status} · ${p.actualRps} rps · p95 ${p.p95Ms}ms · ${p.errorRatePct}% errors`}
              className={cn('flex-1 rounded-t-sm transition-all hover:opacity-80', tone)} style={{ height: `${h}px` }} />
          );
        })}
      </div>
      <table className="w-full text-xs">
        <thead className="bg-elevated/40 text-text-muted">
          <tr><Th>When</Th><Th>Status</Th><Th>RPS</Th><Th>p95</Th><Th>p99</Th><Th>Error %</Th></tr>
        </thead>
        <tbody>
          {[...points].reverse().slice(0, 20).map((p) => (
            <tr key={p.runId} className="border-t border-border/40">
              <td className="px-3 py-1.5 text-[10px] text-text-muted">{formatRelative(typeof p.at === 'string' ? p.at : '')}</td>
              <td className="px-3 py-1.5"><RunStatusBadge status={String(p.status)} /></td>
              <td className="px-3 py-1.5 font-mono text-[10px]">{(p.actualRps ?? 0).toFixed(1)}</td>
              <td className="px-3 py-1.5 font-mono text-[10px]">{p.p95Ms ?? 0}ms</td>
              <td className="px-3 py-1.5 font-mono text-[10px]">{p.p99Ms ?? 0}ms</td>
              <td className="px-3 py-1.5 font-mono text-[10px]">{(p.errorRatePct ?? 0).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* shared form bits */
const cls = () => 'h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs';
const Field = ({ label, children, required }: { label: React.ReactNode; children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs">
    <span className="mb-1 block font-medium text-text-secondary">{label} {required && <span className="text-danger">*</span>}</span>
    {children}
  </label>
);

void formatDuration;
