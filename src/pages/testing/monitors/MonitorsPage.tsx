/**
 * MonitorsPage — list & create monitors for the current workspace.
 *
 * Layout:
 *   • Workspace summary tiles
 *   • Either: inline "Configure new monitor" form (when `creating` is on)
 *           : OR card grid with "New monitor" CTA
 *   • Empty state has its own primary CTA
 *
 * Single-URL guarantee preserved — no nested routes.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Plus, RefreshCw, Search, Pause, Play, PlayCircle,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Trash2,
  Globe2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTestingStore } from '@/stores/testing.store';
import {
  listMonitors, computeWorkspaceSummary,
  pauseMonitor, resumeMonitor, runMonitorNow, deleteMonitor,
  type Monitor,
} from '@/services/monitor.service';
import { InlineCreateMonitorForm } from './InlineCreateMonitorForm';
import { formatRelative } from '../shared/Badges';
import { cn } from '@/utils/cn';

const POLL_MS = 4000;

export const MonitorsPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const openMonitor = useTestingStore((s) => s.openMonitor);
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Monitor | null>(null);

  const monsQ = useQuery({
    queryKey: ['monitor', 'list', ws?.id],
    queryFn: () => listMonitors(ws!.id, { size: 100 }),
    enabled: !!ws?.id,
    refetchInterval: POLL_MS,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['monitor', 'list'] });
  const pauseMut  = useMutation({ mutationFn: (id: string) => pauseMonitor(id),  onSuccess: invalidate });
  const resumeMut = useMutation({ mutationFn: (id: string) => resumeMonitor(id), onSuccess: invalidate });
  const runMut    = useMutation({ mutationFn: (id: string) => runMonitorNow(id), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteMonitor(id), onSuccess: invalidate });

  const all = monsQ.data ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.description ?? '').toLowerCase().includes(q) ||
      (m.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [all, search]);
  const summary = useMemo(() => computeWorkspaceSummary(all), [all]);

  if (!ws) {
    return (
      <NoProjectEmpty testId="monitors-no-workspace" icon="monitor" surface="monitors" />
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="monitors-page">
      <header className="border-b border-border bg-surface/30 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Activity className="h-4 w-4 text-primary" /> Monitors
          </h1>
          <span className="text-[11px] text-text-muted">
            · Scheduled health probes with paging on regression. Cron-driven, multi-region, SLA &amp; incident-aware.
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                data-testid="monitors-search"
                className="h-8 w-56 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => monsQ.refetch()} data-testid="monitors-refresh">
              <RefreshCw className={cn('h-3.5 w-3.5', monsQ.isFetching && 'animate-spin')} />
            </Button>
            <Button size="sm" variant="primary" onClick={() => setCreating(true)} data-testid="monitors-create-btn" disabled={creating}>
              <Plus className="h-3.5 w-3.5" /> New monitor
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
          {/* Summary tiles */}
          <section data-testid="monitors-kpi-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Tile icon={Activity}      label="Total"        value={summary.totalMonitors}      testId="monitors-kpi-total" />
            <Tile icon={PlayCircle}    label="Active"       value={summary.activeMonitors}     tone="success" testId="monitors-kpi-active" />
            <Tile icon={Pause}         label="Paused"       value={summary.pausedMonitors}     tone="muted"   testId="monitors-kpi-paused" />
            <Tile icon={AlertTriangle} label="Failing now"  value={summary.currentlyFailing}   tone="danger"  testId="monitors-kpi-failing" />
            <Tile icon={CheckCircle2}  label="Last UP"      value={summary.successMonitors}    tone="success" testId="monitors-kpi-up" />
            <Tile icon={Globe2}        label="Avg uptime"   value={`${summary.avgUptimePct.toFixed(1)}%`} tone="success" testId="monitors-kpi-uptime" />
          </section>

          {/* Inline create form (above grid) */}
          {creating && (
            <InlineCreateMonitorForm
              workspaceId={ws.id}
              onCreated={() => { setCreating(false); invalidate(); }}
              onCancel={() => setCreating(false)}
            />
          )}

          {/* Grid / Empty */}
          {monsQ.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
            </div>
          ) : filtered.length === 0 && !creating ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center" data-testid="monitors-empty">
              <Activity className="mb-3 h-10 w-10 text-text-muted" />
              <p className="text-sm font-semibold">{search ? 'No monitors match your search' : 'No monitors yet'}</p>
              <p className="mb-4 mt-1 text-xs text-text-muted">
                {search
                  ? 'Try a different keyword or clear the filter.'
                  : 'Configure your first monitor — a cron-scheduled probe of a saved request, collection, or test spec.'}
              </p>
              {!search && (
                <Button variant="primary" onClick={() => setCreating(true)} data-testid="monitors-create-empty">
                  <Plus className="h-3.5 w-3.5" /> Configure first monitor
                </Button>
              )}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="monitors-grid">
              {filtered.map((m) => (
                <MonitorCard
                  key={m.monitorId}
                  monitor={m}
                  onOpen={() => openMonitor(m.monitorId)}
                  onPause={()  => pauseMut.mutate(m.monitorId)}
                  onResume={() => resumeMut.mutate(m.monitorId)}
                  onRunNow={() => runMut.mutate(m.monitorId)}
                  onDelete={() => setDeleteTarget(m)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete monitor?"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently deleted along with its run history and incidents.` : ''}
        confirmText="Delete" tone="danger"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMut.mutateAsync(deleteTarget.monitorId);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, tone = 'default', testId }: {
  icon: any; label: string; value: number | string; tone?: 'default' | 'success' | 'danger' | 'warning' | 'muted'; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary', success: 'text-success', danger: 'text-danger',
    warning: 'text-warning', muted: 'text-text-muted',
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

const stateMeta: Record<string, { tone: string; icon: any; label: string }> = {
  UP:      { tone: 'border-success/30 bg-success/10 text-success', icon: CheckCircle2,  label: 'UP' },
  SUCCESS: { tone: 'border-success/30 bg-success/10 text-success', icon: CheckCircle2,  label: 'SUCCESS' },
  DOWN:    { tone: 'border-danger/30  bg-danger/10  text-danger',  icon: XCircle,       label: 'DOWN' },
  FAILED:  { tone: 'border-danger/30  bg-danger/10  text-danger',  icon: XCircle,       label: 'FAILED' },
  DEGRADED:{ tone: 'border-warning/30 bg-warning/10 text-warning', icon: AlertTriangle, label: 'DEGRADED' },
  PAUSED:  { tone: 'border-border bg-elevated text-text-muted',    icon: Pause,         label: 'PAUSED' },
  UNKNOWN: { tone: 'border-border bg-elevated text-text-muted',    icon: Activity,      label: 'UNKNOWN' },
};

const MonitorCard = ({ monitor: m, onOpen, onPause, onResume, onRunNow, onDelete }: {
  monitor: Monitor;
  onOpen: () => void; onPause: () => void; onResume: () => void; onRunNow: () => void; onDelete: () => void;
}) => {
  const isPaused = m.status === 'PAUSED';
  const state = m.lastState ? (stateMeta[m.lastState] ?? stateMeta.UNKNOWN) : stateMeta.UNKNOWN;
  const StateIcon = state.icon;
  const uptime = (m.totalRuns ?? 0) > 0 ? ((m.successRuns ?? 0) / (m.totalRuns ?? 1)) * 100 : null;

  return (
    <article
      data-testid={`monitor-card-${m.monitorId}`}
      className={cn(
        'group flex flex-col gap-3 rounded-2xl border bg-surface/50 p-4 shadow-sm transition-all',
        'hover:border-primary/40 hover:bg-surface/70 hover:shadow-md',
        (m.consecutiveFailures ?? 0) > 0 && 'border-danger/40 bg-danger/[0.04]',
        isPaused && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-2">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">
            {m.name}
          </h3>
          {m.description && <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{m.description}</p>}
        </button>
        <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider', state.tone)}>
          <StateIcon className="h-3 w-3" /> {state.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <Stat label="Schedule">
          <code className="font-mono text-text-secondary">{m.scheduleCron}</code>
        </Stat>
        <Stat label="Uptime">
          <span className={cn(
            'font-mono',
            uptime != null && uptime >= 99 ? 'text-success' :
            uptime != null && uptime >= 95 ? 'text-warning' :
            uptime != null ? 'text-danger' : 'text-text-muted',
          )}>
            {uptime != null ? `${uptime.toFixed(2)}%` : '—'}
          </span>
        </Stat>
        <Stat label="Runs">
          <span className="font-mono">{m.totalRuns ?? 0}</span>
          {(m.failedRuns ?? 0) > 0 && <span className="ml-1 text-danger">· {m.failedRuns} failed</span>}
        </Stat>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {(m.regions ?? []).slice(0, 3).map((r) => (
          <span key={r} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-secondary">{r}</span>
        ))}
        {(m.tags ?? []).slice(0, 2).map((t) => (
          <span key={t} className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[9px] font-medium text-primary">#{t}</span>
        ))}
        {m.statusPagePublic && (
          <span className="ml-auto inline-flex items-center gap-1 rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success">
            <Globe2 className="h-2.5 w-2.5" /> public
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-[10px] text-text-muted">
        <span data-testid={`monitor-card-last-${m.monitorId}`}>
          Last: {m.lastRunAt ? formatRelative(typeof m.lastRunAt === 'string' ? m.lastRunAt : '') : '—'}
        </span>
        <span>·</span>
        <span data-testid={`monitor-card-next-${m.monitorId}`}>
          Next: {m.nextRunAt ? formatRelative(typeof m.nextRunAt === 'string' ? m.nextRunAt : '') : '—'}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button size="sm" variant="ghost" onClick={onRunNow} aria-label="Run now" data-testid={`monitor-run-now-${m.monitorId}`}>
            <PlayCircle className="h-3.5 w-3.5" />
          </Button>
          {isPaused
            ? <Button size="sm" variant="ghost" onClick={onResume} aria-label="Resume" data-testid={`monitor-resume-${m.monitorId}`}><Play className="h-3.5 w-3.5" /></Button>
            : <Button size="sm" variant="ghost" onClick={onPause}  aria-label="Pause"  data-testid={`monitor-pause-${m.monitorId}`}><Pause className="h-3.5 w-3.5" /></Button>}
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete" data-testid={`monitor-delete-${m.monitorId}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onOpen} aria-label="Open" data-testid={`monitor-open-${m.monitorId}`}>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
};

const Stat = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-md border border-border/40 bg-probestack-bg/60 px-2 py-1.5">
    <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
    <div className="mt-0.5 truncate text-[10px]">{children}</div>
  </div>
);
