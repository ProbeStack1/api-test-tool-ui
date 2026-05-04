/**
 * DashboardTab — pure overview for the Functional section.
 * KPI tiles + a compact "recent runs" feed.
 *
 * The configure-and-run form lives on the **Runs** tab (default
 * landing). Keeping this tab read-only lets users glance at health
 * without accidentally triggering anything.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlayCircle, Activity, CheckCircle2, XCircle, AlertOctagon, Gauge,
  Timer, Pause, Play, Ban, Sparkles, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  getDashboard, listRuns, cancelRun, pauseRun, resumeRun,
  type Run,
} from '@/services/functionalTest.service';
import { RunStatusBadge, formatDuration } from '../shared/RunBadges';
import { formatRelative } from '../../shared/Badges';
import { useTestingStore } from '@/stores/testing.store';
import { cn } from '@/utils/cn';

interface Props { workspaceId: string }

const POLL = 4000;

export const DashboardTab = ({ workspaceId }: Props) => {
  const qc = useQueryClient();
  const openRun = useTestingStore((s) => s.openRun);
  const setTab  = useTestingStore((s) => s.setFunctionalTab);

  const dashQ = useQuery({
    queryKey: ['functionalTest', 'dashboard', workspaceId],
    queryFn: () => getDashboard(workspaceId),
    refetchInterval: POLL,
  });
  const runsQ = useQuery({
    queryKey: ['functionalTest', 'runs', workspaceId, 'recent'],
    queryFn: () => listRuns(workspaceId, { size: 8 }),
    refetchInterval: POLL,
  });

  const cancelMut = useMutation({ mutationFn: (id: string) => cancelRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['functionalTest'] }) });
  const pauseMut  = useMutation({ mutationFn: (id: string) => pauseRun(id),  onSuccess: () => qc.invalidateQueries({ queryKey: ['functionalTest'] }) });
  const resumeMut = useMutation({ mutationFn: (id: string) => resumeRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['functionalTest'] }) });

  const dash = dashQ.data;
  const runs = runsQ.data?.content ?? [];

  return (
    <div className="h-full overflow-auto" data-testid="functional-dashboard">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* KPI tiles */}
        <section data-testid="functional-kpi-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Tile icon={Activity}     label="Total runs"  value={dash?.runsTotal ?? 0} loading={dashQ.isLoading} testId="kpi-total" />
          <Tile icon={PlayCircle}   label="Running"     value={dash?.runsRunning ?? 0} tone="amber"   loading={dashQ.isLoading} testId="kpi-running" />
          <Tile icon={CheckCircle2} label="Success"     value={dash?.runsSuccess ?? 0} tone="success" loading={dashQ.isLoading} testId="kpi-success" />
          <Tile icon={XCircle}      label="Failed"      value={dash?.runsFailed ?? 0}  tone="warning" loading={dashQ.isLoading} testId="kpi-failed" />
          <Tile icon={AlertOctagon} label="Error"       value={dash?.runsError ?? 0}   tone="danger"  loading={dashQ.isLoading} testId="kpi-error" />
          <Tile icon={Gauge}        label="Pass rate"   value={`${(dash?.passRatePct ?? 0).toFixed(1)}%`} tone="success" loading={dashQ.isLoading} testId="kpi-passrate" />
          <Tile icon={Timer}        label="Avg time"    value={formatDuration(dash?.avgDurationMs ?? 0)}     loading={dashQ.isLoading} testId="kpi-avgtime" />
        </section>

        {/* CTA → Runs tab */}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.06] via-primary/[0.10] to-primary/[0.06] px-5 py-4 shadow-sm" data-testid="functional-cta-card">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Ready to run a suite?</p>
            <p className="text-[11px] text-text-muted">
              Pick a spec / collection / inline content, configure parallelism &amp; retries, and watch the live stream.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setTab('runner')} className="ml-auto" data-testid="dashboard-go-runs">
            Go to Runner <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </section>

        {/* Recent runs (read-only feed) */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface/40 shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-border bg-elevated/30 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Recent runs</h2>
            <Button size="sm" variant="ghost" onClick={() => setTab('runs')} data-testid="dashboard-recent-see-all">
              See all <ArrowRight className="h-3 w-3" />
            </Button>
          </header>
          {runsQ.isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : runs.length === 0 ? (
            <div className="p-10 text-center" data-testid="functional-runs-empty">
              <PlayCircle className="mx-auto mb-2 h-8 w-8 text-text-muted" />
              <p className="text-sm font-medium">No runs yet</p>
              <p className="mt-1 text-xs text-text-muted">Head over to the <strong>Runner</strong> tab to queue one.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border" data-testid="functional-recent-runs">
              {runs.map((r) => (
                <RunRow key={r.runId} run={r}
                  onOpen={() => openRun(r.runId)}
                  onCancel={() => cancelMut.mutate(r.runId)}
                  onPause={() => pauseMut.mutate(r.runId)}
                  onResume={() => resumeMut.mutate(r.runId)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, tone = 'default', loading, testId }: {
  icon: any; label: string; value: number | string; tone?: 'default' | 'amber' | 'success' | 'warning' | 'danger';
  loading?: boolean; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary',
    amber:   'text-amber-400',
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
  };
  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-surface/40 p-4 transition-colors hover:bg-surface/60">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {loading
        ? <Skeleton className="h-6 w-12" />
        : <div className={cn('text-xl font-semibold tracking-tight', tones[tone])}>{value}</div>}
    </div>
  );
};

const RunRow = ({ run, onOpen, onCancel, onPause, onResume }: {
  run: Run; onOpen: () => void; onCancel: () => void; onPause: () => void; onResume: () => void;
}) => {
  const isRunning = run.status === 'RUNNING';
  const isPaused  = run.status === 'PAUSED';
  const passed = run.passedSteps ?? 0;
  const failed = run.failedSteps ?? 0;
  const total  = run.totalSteps  ?? 0;
  return (
    <li data-testid={`run-row-${run.runId}`} className="flex items-center gap-3 px-5 py-2.5 text-xs">
      <button onClick={onOpen} className="min-w-0 flex-1 truncate text-left font-medium hover:text-primary">
        {run.name || run.runId.slice(0, 8)}
      </button>
      <RunStatusBadge status={run.status} />
      <span className="hidden font-mono text-[10px] text-text-muted sm:inline">
        {passed}/{total} {failed > 0 && <span className="text-danger">· {failed} failed</span>}
      </span>
      <span className="font-mono text-[10px] text-text-muted">{formatDuration(run.totalDurationMs ?? null)}</span>
      <span className="w-20 truncate text-right text-[10px] text-text-muted">
        {formatRelative(typeof run.queuedAt === 'string' ? run.queuedAt : '')}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        {isRunning && (
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onPause(); }} data-testid={`run-pause-${run.runId}`} aria-label="Pause">
            <Pause className="h-3.5 w-3.5" />
          </Button>
        )}
        {isPaused && (
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onResume(); }} data-testid={`run-resume-${run.runId}`} aria-label="Resume">
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {(isRunning || isPaused) && (
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onCancel(); }} data-testid={`run-cancel-${run.runId}`} aria-label="Cancel">
            <Ban className="h-3.5 w-3.5" />
          </Button>
        )}
      </span>
    </li>
  );
};
