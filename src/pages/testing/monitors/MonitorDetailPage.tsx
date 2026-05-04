/**
 * MonitorDetailPage — single-route detail view that shows when
 * `selectedMonitorId` is set on the testing store.
 *
 * Tabs:
 *   • Overview      KPIs · 7-day timeseries chart · last run summary
 *   • Runs          Paginated history + drill-down + CSV export
 *   • Incidents     Open / acknowledged / resolved + ack / resolve actions
 *   • Maintenance   Scheduled maintenance windows
 *   • Settings      Status-page publish/unpublish · update · delete
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowLeft, PlayCircle, Pause, Play, RefreshCw, Loader2, Share2,
  LayoutDashboard, ListTree, ShieldAlert, Wrench, Settings,
  CheckCircle2, XCircle, AlertTriangle, Trash2, Globe2,
  Download, Plus, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  getMonitor, pauseMonitor, resumeMonitor, runMonitorNow, updateMonitor, deleteMonitor,
  getMonitorStats, getMonitorTimeseries,
  listMonitorRuns, getMonitorRunDetail, exportMonitorRunsCsv, downloadCsvBlob,
  listIncidents, ackIncident, resolveIncident,
  listMaintenance, createMaintenance, deleteMaintenance,
  publishStatusPage, unpublishStatusPage,
  type Monitor, type MonitorRunView, type IncidentView, type MaintenanceView,
} from '@/services/monitor.service';
import { useTestingStore, type MonitorTab } from '@/stores/testing.store';
import { formatRelative } from '../shared/Badges';
import { PublicStatusPagePreview } from './PublicStatusPagePreview';
import { ShareLinkDialog } from '@/components/collab/ShareLinkDialog';
import { cn } from '@/utils/cn';

const TABS: { key: MonitorTab; label: string; icon: any; testId: string }[] = [
  { key: 'overview',    label: 'Overview',    icon: LayoutDashboard, testId: 'monitor-tab-overview' },
  { key: 'runs',        label: 'Runs',        icon: ListTree,        testId: 'monitor-tab-runs' },
  { key: 'incidents',   label: 'Incidents',   icon: ShieldAlert,     testId: 'monitor-tab-incidents' },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench,          testId: 'monitor-tab-maintenance' },
  { key: 'settings',    label: 'Settings',    icon: Settings,        testId: 'monitor-tab-settings' },
];

export const MonitorDetailPage = () => {
  const id = useTestingStore((s) => s.selectedMonitorId)!;
  const closeMonitor = useTestingStore((s) => s.closeMonitor);
  const tab = useTestingStore((s) => s.monitorTab);
  const setTab = useTestingStore((s) => s.setMonitorTab);
  const qc = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);

  const monQ = useQuery({
    queryKey: ['monitor', 'detail', id],
    queryFn: () => getMonitor(id),
    refetchInterval: 4000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['monitor', 'detail', id] });
  const pauseMut  = useMutation({ mutationFn: () => pauseMonitor(id),  onSuccess: invalidate });
  const resumeMut = useMutation({ mutationFn: () => resumeMonitor(id), onSuccess: invalidate });
  const runMut    = useMutation({ mutationFn: () => runMonitorNow(id), onSuccess: invalidate });

  const m = monQ.data;

  /* When the monitor flips into a failure state, trigger the global
     chatbot's error analyzer with the monitor context. We track the last
     observed state in a ref so we only fire on transitions. */
  const lastSeenStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!m?.lastState) return;
    const failed = m.lastState === 'FAILED' || m.lastState === 'DOWN' || m.lastState === 'ERROR';
    if (failed && lastSeenStateRef.current !== m.lastState) {
      import('@/stores/chatbot.store').then(({ useChatbot }) => {
        useChatbot.getState().triggerError({
          location: 'Monitor probe',
          method: 'MONITOR',
          url: m.name ?? id,
          statusText: String(m.lastState),
          errorMessage: (m as any).lastReason ?? `Monitor "${m.name ?? id}" reported ${m.lastState}.`,
        });
      });
    }
    lastSeenStateRef.current = m.lastState;
  }, [m?.lastState, m?.name, id]);

  return (
    <div className="flex h-full flex-col" data-testid="monitor-detail-page">
      <header className="border-b border-border bg-surface/30 px-6 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={closeMonitor} data-testid="monitor-detail-back" aria-label="Back">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Activity className="h-4 w-4 text-primary" />
            <span data-testid="monitor-detail-name">{m?.name ?? 'Loading…'}</span>
          </h1>
          {m?.lastState && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
              m.lastState === 'UP' || m.lastState === 'SUCCESS' ? 'border-success/30 bg-success/10 text-success' :
              m.lastState === 'DOWN' || m.lastState === 'FAILED' ? 'border-danger/30 bg-danger/10 text-danger' :
              'border-border bg-elevated text-text-muted',
            )}>{m.lastState}</span>
          )}
          {m?.status === 'PAUSED' && (
            <span className="inline-flex items-center gap-1 rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
              paused
            </span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => runMut.mutate()} disabled={runMut.isPending} data-testid="monitor-detail-run-now">
              {runMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />} Run now
            </Button>
            {m?.status === 'PAUSED'
              ? <Button size="sm" variant="outline" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending} data-testid="monitor-detail-resume">
                  <Play className="h-3.5 w-3.5" /> Resume
                </Button>
              : <Button size="sm" variant="outline" onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending} data-testid="monitor-detail-pause">
                  <Pause className="h-3.5 w-3.5" /> Pause
                </Button>}
            <Button size="sm" variant="outline" onClick={() => setShareOpen(true)} data-testid="monitor-detail-share">
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
            <Button size="sm" variant="ghost" onClick={() => monQ.refetch()} data-testid="monitor-detail-refresh">
              <RefreshCw className={cn('h-3.5 w-3.5', monQ.isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <nav role="tablist" className="-mb-px mt-3 flex gap-1" data-testid="monitor-tabs">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                data-testid={t.testId}
                onClick={() => setTab(t.key)}
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
        {!m ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {tab === 'overview'    && <OverviewTab monitor={m} />}
            {tab === 'runs'        && <RunsTab monitor={m} />}
            {tab === 'incidents'   && <IncidentsTab monitor={m} />}
            {tab === 'maintenance' && <MaintenanceTab monitor={m} />}
            {tab === 'settings'    && <SettingsTab monitor={m} onClose={closeMonitor} />}
          </>
        )}
      </div>
      {shareOpen && m && (
        <ShareLinkDialog
          entityType="monitor"
          entityId={id}
          entityName={m.name}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
};

/* ────────────────────────── OVERVIEW ─────────────────────────────────── */
const OverviewTab = ({ monitor: m }: { monitor: Monitor }) => {
  const [days, setDays] = useState(7);
  const statsQ = useQuery({
    queryKey: ['monitor', 'stats', m.monitorId, days],
    queryFn: () => getMonitorStats(m.monitorId, days),
    refetchInterval: 8000,
  });
  const tsQ = useQuery({
    queryKey: ['monitor', 'timeseries', m.monitorId, days],
    queryFn: () => getMonitorTimeseries(m.monitorId, days),
    refetchInterval: 8000,
  });

  const s = statsQ.data;
  const points = tsQ.data ?? [];
  const maxLat = Math.max(1, ...points.map((p) => p.p95LatencyMs ?? p.avgLatencyMs ?? 0));

  return (
    <div className="h-full overflow-auto" data-testid="monitor-overview-tab">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Window:</span>
          {[1, 7, 30].map((n) => (
            <button
              key={n}
              data-testid={`monitor-window-${n}d`}
              onClick={() => setDays(n)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs transition-colors',
                days === n ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-probestack-bg text-text-muted hover:bg-hover',
              )}
            >{n}d</button>
          ))}
        </div>

        <section data-testid="monitor-stats-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Tile label="Runs"       value={s?.totalRuns ?? 0}       testId="monitor-stat-total" />
          <Tile label="Success"    value={s?.successRuns ?? 0}     tone="success" testId="monitor-stat-success" />
          <Tile label="Failed"     value={s?.failedRuns ?? 0}      tone="danger"  testId="monitor-stat-failed" />
          <Tile label="Uptime"     value={`${(s?.uptimePct ?? 0).toFixed(2)}%`}    tone={(s?.uptimePct ?? 100) >= 99 ? 'success' : (s?.uptimePct ?? 100) >= 95 ? 'warning' : 'danger'} testId="monitor-stat-uptime" />
          <Tile label="Avg latency" value={`${Math.round(s?.avgLatencyMs ?? 0)}ms`} testId="monitor-stat-avg" />
          <Tile label="p95"        value={`${Math.round(s?.p95LatencyMs ?? 0)}ms`} testId="monitor-stat-p95" />
          <Tile label="Open inc."  value={s?.openIncidents ?? 0}   tone={(s?.openIncidents ?? 0) > 0 ? 'danger' : 'muted'} testId="monitor-stat-incidents" />
        </section>

        <section className="rounded-2xl border border-border bg-surface/40">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Activity className="h-3.5 w-3.5 text-primary" /> Latency &amp; status — last {days}d
            </h2>
            <span className="text-[10px] text-text-muted">{points.length} data points</span>
          </header>
          {tsQ.isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
            </div>
          ) : points.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-text-muted" data-testid="monitor-trend-empty">No runs in this window yet.</p>
          ) : (
            <div className="px-4 py-3" data-testid="monitor-trend-chart">
              <div className="flex h-24 items-end gap-1">
                {points.map((p, i) => {
                  const lat = p.p95LatencyMs ?? p.avgLatencyMs ?? 0;
                  const h = Math.max(2, (lat / maxLat) * 88);
                  const tone =
                    p.status === 'SUCCESS' || p.status === 'UP' ? 'bg-success' :
                    p.status === 'FAILED'  || p.status === 'DOWN' ? 'bg-danger' :
                    'bg-amber-400';
                  return (
                    <div
                      key={i}
                      title={`${p.status} · ${lat}ms`}
                      data-testid={`monitor-trend-bar-${i}`}
                      className={cn('flex-1 min-w-[2px] rounded-t-sm transition-all hover:opacity-80', tone)}
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> success</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> degraded</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger" /> failed</span>
                <span className="ml-auto font-mono">max p95 {Math.round(maxLat)}ms</span>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <KvCard title="Configuration" testId="monitor-config-card" rows={[
            ['Schedule',  m.scheduleCron],
            ['Regions',   (m.regions ?? []).join(', ') || '—'],
            ['Retries',   `${m.retryCount ?? 0} (${m.retryDelayMs ?? 0}ms delay)`],
            ['Timeout',   `${m.requestTimeoutMs ?? 0}ms`],
            ['SLA p95',   m.slaP95Ms ? `${m.slaP95Ms}ms` : '—'],
            ['SLA uptime', m.slaUptimePct ? `${m.slaUptimePct}%` : '—'],
          ]} />
          <KvCard title="Notifications" testId="monitor-notify-card" rows={[
            ['Emails',  (m.notificationEmails ?? []).join(', ') || '—'],
            ['Slack',   m.notificationSlackWebhook || '—'],
            ['Webhooks', (m.notificationWebhooks ?? []).join(', ') || '—'],
            ['On state-change only', m.notifyOnStateChangeOnly ? 'yes' : 'no'],
          ]} />
        </section>
      </div>
    </div>
  );
};

const Tile = ({ label, value, tone = 'default', testId }: {
  label: string; value: number | string; tone?: 'default' | 'success' | 'danger' | 'warning' | 'muted'; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary', success: 'text-success', danger: 'text-danger', warning: 'text-warning', muted: 'text-text-muted',
  };
  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-surface/40 p-4">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className={cn('text-lg font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};

const KvCard = ({ title, rows, testId }: { title: string; rows: [string, string][]; testId: string }) => (
  <div data-testid={testId} className="rounded-2xl border border-border bg-surface/40">
    <header className="border-b border-border px-4 py-2.5"><h3 className="text-sm font-semibold tracking-tight">{title}</h3></header>
    <dl className="divide-y divide-border/40 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-3 px-4 py-2">
          <dt className="w-32 shrink-0 text-text-muted">{k}</dt>
          <dd className="min-w-0 flex-1 truncate font-mono text-text-secondary">{v}</dd>
        </div>
      ))}
    </dl>
  </div>
);

/* ────────────────────────── RUNS ─────────────────────────────────────── */
const RunsTab = ({ monitor: m }: { monitor: Monitor }) => {
  const [page, setPage] = useState(0);
  const [openRun, setOpenRun] = useState<MonitorRunView | null>(null);
  const [exporting, setExporting] = useState(false);

  const runsQ = useQuery({
    queryKey: ['monitor', 'runs', m.monitorId, page],
    queryFn: () => listMonitorRuns(m.monitorId, { page, size: 30 }),
    refetchInterval: 4000,
  });
  const runs = runsQ.data ?? [];

  const onExport = async () => {
    setExporting(true);
    try {
      const { blob, contentDisposition } = await exportMonitorRunsCsv(m.monitorId, 1000);
      downloadCsvBlob(blob, contentDisposition, `${m.name}-runs.csv`);
    } finally { setExporting(false); }
  };

  return (
    <div className="h-full overflow-auto" data-testid="monitor-runs-tab">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface/40">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <ListTree className="h-3.5 w-3.5 text-primary" /> Run history
              <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">{runs.length}</span>
            </h3>
            <Button size="sm" variant="ghost" onClick={onExport} disabled={exporting} className="ml-auto" data-testid="monitor-runs-export">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => runsQ.refetch()}><RefreshCw className={cn('h-3.5 w-3.5', runsQ.isFetching && 'animate-spin')} /></Button>
          </header>
          {runsQ.isLoading ? (
            <div className="space-y-1 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : runs.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-text-muted" data-testid="monitor-runs-empty">No runs yet — hit <em>Run now</em> to fire the first probe.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-elevated/40 text-text-muted">
                  <tr>
                    <Th>Status</Th><Th>Region</Th><Th>Triggered by</Th><Th>Reqs</Th>
                    <Th>Latency (avg/p95)</Th><Th>Duration</Th><Th>Started</Th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.runId} data-testid={`monitor-run-row-${r.runId}`}
                      onClick={() => setOpenRun(r)}
                      className="cursor-pointer border-t border-border/40 hover:bg-hover/40">
                      <td className="px-3 py-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                          r.status === 'SUCCESS' || r.status === 'UP' ? 'border-success/30 bg-success/10 text-success' :
                          r.status === 'FAILED'  || r.status === 'DOWN' ? 'border-danger/30 bg-danger/10 text-danger' :
                          'border-border bg-elevated text-text-muted',
                        )}>{r.status}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px]">{r.region ?? '—'}</td>
                      <td className="px-3 py-2 text-[10px] text-text-muted">{r.triggeredByEmail ?? r.triggeredBy ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{r.passedRequests ?? 0}/{r.totalRequests ?? 0}{(r.failedRequests ?? 0) > 0 && <span className="ml-1 text-danger">· {r.failedRequests}f</span>}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{Math.round(r.avgLatencyMs ?? 0)}ms / {Math.round(r.p95LatencyMs ?? 0)}ms</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{r.durationMs ?? 0}ms</td>
                      <td className="px-3 py-2 text-[10px] text-text-muted">{formatRelative(typeof r.startedAt === 'string' ? r.startedAt : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 text-xs">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} data-testid="monitor-runs-prev">Prev</Button>
            <span className="text-text-muted">Page {page + 1}</span>
            <Button size="sm" variant="outline" disabled={runs.length < 30} onClick={() => setPage((p) => p + 1)} data-testid="monitor-runs-next">Next</Button>
          </div>
        </section>
      </div>
      <RunDetailModal run={openRun} onClose={() => setOpenRun(null)} />
    </div>
  );
};

const RunDetailModal = ({ run, onClose }: { run: MonitorRunView | null; onClose: () => void }) => {
  const q = useQuery({
    queryKey: ['monitor', 'run-detail', run?.runId],
    queryFn: () => getMonitorRunDetail(run!.runId),
    enabled: !!run?.runId,
  });
  return (
    <Modal open={!!run} onClose={onClose} title="Monitor run detail" icon={ListTree} size="xl" testId="monitor-run-detail-modal">
      {!run ? null : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-probestack-bg/40 p-3 text-xs">
            <div><div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status</div><div className="mt-0.5 font-medium">{run.status}</div></div>
            <div><div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Region</div><div className="mt-0.5 font-mono">{run.region ?? '—'}</div></div>
            <div><div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Avg latency</div><div className="mt-0.5 font-mono">{Math.round(run.avgLatencyMs ?? 0)}ms</div></div>
            <div><div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">p95</div><div className="mt-0.5 font-mono">{Math.round(run.p95LatencyMs ?? 0)}ms</div></div>
          </div>
          {q.isLoading ? <Skeleton className="h-32 w-full" />
            : (q.data?.results ?? []).length === 0
              ? <p className="text-xs text-text-muted">No request-level results captured.</p>
              : <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-elevated/40 text-text-muted">
                      <tr><Th>Method</Th><Th>URL</Th><Th>Status</Th><Th>Latency</Th><Th>Passed</Th></tr>
                    </thead>
                    <tbody>
                      {(q.data?.results ?? []).map((r, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="px-3 py-1.5 font-mono text-[10px]">{r.method ?? '—'}</td>
                          <td className="truncate px-3 py-1.5 font-mono text-[10px]">{r.url ?? '—'}</td>
                          <td className="px-3 py-1.5 font-mono text-[10px]">{r.statusCode ?? '—'}</td>
                          <td className="px-3 py-1.5 font-mono text-[10px]">{r.latencyMs ?? 0}ms</td>
                          <td className="px-3 py-1.5">{r.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-danger" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
        </div>
      )}
    </Modal>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">{children}</th>
);

/* ─────────────────── INCIDENTS ──────────────────────────────────────── */
const IncidentsTab = ({ monitor: m }: { monitor: Monitor }) => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('ALL');
  const [actOn, setActOn] = useState<{ inc: IncidentView; kind: 'ack' | 'resolve' } | null>(null);
  const [note, setNote] = useState('');

  const q = useQuery({
    queryKey: ['monitor', 'incidents', m.monitorId, filter],
    queryFn: () => listIncidents(m.monitorId, { status: filter === 'ALL' ? undefined : filter, size: 50 }),
    refetchInterval: 6000,
  });
  const ackMut = useMutation({
    mutationFn: (id: string) => ackIncident(id, { note: note || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['monitor', 'incidents'] }); setActOn(null); setNote(''); },
  });
  const resolveMut = useMutation({
    mutationFn: (id: string) => resolveIncident(id, { note: note || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['monitor', 'incidents'] }); setActOn(null); setNote(''); },
  });

  const items = q.data ?? [];
  return (
    <div className="h-full overflow-auto" data-testid="monitor-incidents-tab">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface/40">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Incidents
              <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">{items.length}</span>
            </h3>
            <select data-testid="monitor-incidents-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="ml-auto h-7 rounded-md border border-border bg-probestack-bg px-2 text-xs">
              {['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </header>
          {q.isLoading ? <div className="space-y-1 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            : items.length === 0
              ? <p className="px-4 py-10 text-center text-xs text-text-muted" data-testid="monitor-incidents-empty">No incidents — keep it running clean! 🟢</p>
              : <ul className="divide-y divide-border" data-testid="monitor-incidents-list">
                  {items.map((inc) => (
                    <li key={inc.incidentId} data-testid={`monitor-incident-row-${inc.incidentId}`} className="flex items-start gap-3 px-4 py-3 text-xs">
                      <span className={cn(
                        'mt-0.5 grid h-7 w-7 place-items-center rounded-lg ring-1',
                        inc.status === 'RESOLVED' ? 'bg-success/15 text-success ring-success/30' :
                        inc.status === 'ACKNOWLEDGED' ? 'bg-warning/15 text-warning ring-warning/30' :
                        'bg-danger/15 text-danger ring-danger/30',
                      )}>
                        {inc.status === 'RESOLVED' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                         inc.status === 'ACKNOWLEDGED' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                         <XCircle className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{inc.summary ?? inc.incidentId.slice(0, 8)}</span>
                          <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                            {inc.status}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-text-muted">
                          <span>opened {formatRelative(typeof inc.openedAt === 'string' ? inc.openedAt : '')}</span>
                          {inc.acknowledgedByEmail && <span>· ack by {inc.acknowledgedByEmail}</span>}
                          {inc.resolvedByEmail && <span>· resolved by {inc.resolvedByEmail}</span>}
                          {inc.downtimeMinutes != null && <span>· downtime {inc.downtimeMinutes}m</span>}
                        </div>
                        {inc.resolutionNote && <div className="mt-1 rounded bg-elevated/50 px-2 py-1 text-[10px] text-text-secondary">{inc.resolutionNote}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        {inc.status === 'OPEN' && (
                          <Button size="sm" variant="outline" onClick={() => setActOn({ inc, kind: 'ack' })} data-testid={`monitor-incident-ack-${inc.incidentId}`}>Acknowledge</Button>
                        )}
                        {(inc.status === 'OPEN' || inc.status === 'ACKNOWLEDGED') && (
                          <Button size="sm" variant="primary" onClick={() => setActOn({ inc, kind: 'resolve' })} data-testid={`monitor-incident-resolve-${inc.incidentId}`}>Resolve</Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>}
        </section>
      </div>
      <Modal
        open={!!actOn}
        onClose={() => { setActOn(null); setNote(''); }}
        title={actOn?.kind === 'ack' ? 'Acknowledge incident' : 'Resolve incident'}
        icon={ShieldAlert} size="md" testId="incident-action-modal"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setActOn(null); setNote(''); }}>Cancel</Button>
            <Button variant="primary" onClick={() => {
              if (!actOn) return;
              actOn.kind === 'ack' ? ackMut.mutate(actOn.inc.incidentId) : resolveMut.mutate(actOn.inc.incidentId);
            }} disabled={ackMut.isPending || resolveMut.isPending} data-testid="incident-action-submit">
              {(ackMut.isPending || resolveMut.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {actOn?.kind === 'ack' ? 'Acknowledge' : 'Resolve'}
            </Button>
          </>
        }
      >
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-text-secondary">Note (optional)</span>
          <textarea data-testid="incident-action-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="block w-full rounded-md border border-border bg-probestack-bg px-3 py-2 text-xs" placeholder="e.g. paged on-call, bad deploy reverted" />
        </label>
      </Modal>
    </div>
  );
};

/* ─────────────────── MAINTENANCE ────────────────────────────────────── */
const MaintenanceTab = ({ monitor: m }: { monitor: Monitor }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<MaintenanceView | null>(null);

  const q = useQuery({
    queryKey: ['monitor', 'maintenance', m.monitorId],
    queryFn: () => listMaintenance(m.monitorId),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['monitor', 'maintenance', m.monitorId] });
  const create = useMutation({
    mutationFn: () => createMaintenance(m.monitorId, {
      startsAt: new Date(startsAt).toISOString(),
      endsAt:   new Date(endsAt).toISOString(),
      reason:   reason.trim() || undefined,
    }),
    onSuccess: () => {
      setOpen(false); setStartsAt(''); setEndsAt(''); setReason(''); setError(null); invalidate();
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to create maintenance window'),
  });
  const del = useMutation({ mutationFn: (id: string) => deleteMaintenance(id), onSuccess: invalidate });

  return (
    <div className="h-full overflow-auto" data-testid="monitor-maintenance-tab">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface/40">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Wrench className="h-3.5 w-3.5 text-primary" /> Maintenance windows
              <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">{(q.data ?? []).length}</span>
            </h3>
            <Button size="sm" variant="primary" onClick={() => setOpen(true)} className="ml-auto" data-testid="monitor-maintenance-new">
              <Plus className="h-3.5 w-3.5" /> Schedule
            </Button>
          </header>
          {q.isLoading ? <div className="space-y-1 p-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            : (q.data ?? []).length === 0
              ? <p className="px-4 py-10 text-center text-xs text-text-muted" data-testid="monitor-maintenance-empty">No maintenance windows scheduled.</p>
              : <ul className="divide-y divide-border" data-testid="monitor-maintenance-list">
                  {(q.data ?? []).map((w) => (
                    <li key={w.windowId} data-testid={`monitor-maintenance-row-${w.windowId}`} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                      <span className="font-mono text-[10px] text-text-secondary">
                        {new Date(typeof w.startsAt === 'string' ? w.startsAt : '').toLocaleString()} → {new Date(typeof w.endsAt === 'string' ? w.endsAt : '').toLocaleString()}
                      </span>
                      <span className="text-text-muted">{w.reason}</span>
                      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setDelTarget(w)} aria-label="Delete" data-testid={`monitor-maintenance-delete-${w.windowId}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>}
        </section>
      </div>
      <Modal
        open={open}
        onClose={() => { setOpen(false); setError(null); }}
        title="Schedule maintenance" icon={Wrench} size="md" testId="maintenance-create-modal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => create.mutate()} disabled={!startsAt || !endsAt || create.isPending} data-testid="maintenance-create-submit">
              {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Schedule
            </Button>
          </>
        }
      >
        {error && <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-text-secondary">Starts at <span className="text-danger">*</span></span>
            <input type="datetime-local" data-testid="maintenance-starts-at" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-8 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-text-secondary">Ends at <span className="text-danger">*</span></span>
            <input type="datetime-local" data-testid="maintenance-ends-at" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-8 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs" />
          </label>
        </div>
        <label className="mt-3 block text-xs">
          <span className="mb-1 block font-medium text-text-secondary">Reason</span>
          <input data-testid="maintenance-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs" placeholder="DB maintenance — read-only" />
        </label>
      </Modal>
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => { if (!o) setDelTarget(null); }}
        title="Delete maintenance window?"
        description="The monitor will resume normal alerting in this window."
        confirmText="Delete" tone="danger"
        onConfirm={async () => { if (delTarget) await del.mutateAsync(delTarget.windowId); setDelTarget(null); }}
      />
    </div>
  );
};

/* ─────────────────── SETTINGS ──────────────────────────────────────── */
const SettingsTab = ({ monitor: m, onClose }: { monitor: Monitor; onClose: () => void }) => {
  const qc = useQueryClient();
  const [name, setName] = useState(m.name);
  const [description, setDescription] = useState(m.description ?? '');
  const [scheduleCron, setScheduleCron] = useState(m.scheduleCron);
  const [emails, setEmails] = useState((m.notificationEmails ?? []).join(', '));
  const [tags, setTags] = useState((m.tags ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  // Status-page state
  const [slug, setSlug] = useState(m.statusPageSlug ?? '');
  const [isPublic, setIsPublic] = useState(m.statusPagePublic ?? false);

  // Re-sync when monitor reloads
  useEffect(() => {
    setName(m.name);
    setDescription(m.description ?? '');
    setScheduleCron(m.scheduleCron);
    setEmails((m.notificationEmails ?? []).join(', '));
    setTags((m.tags ?? []).join(', '));
    setSlug(m.statusPageSlug ?? '');
    setIsPublic(m.statusPagePublic ?? false);
  }, [m.monitorId]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['monitor'] });
  const updateMut = useMutation({
    mutationFn: () => updateMonitor(m.monitorId, {
      name: name.trim(), description: description.trim() || undefined,
      scheduleCron: scheduleCron.trim(),
      notificationEmails: emails.trim() ? emails.split(',').map((e) => e.trim()).filter(Boolean) : [],
      tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: invalidate,
    onError: (e: any) => setError(e?.message ?? 'Failed to update monitor'),
  });
  const publishMut = useMutation({
    mutationFn: () => publishStatusPage(m.monitorId, { slug: slug.trim() || undefined, isPublic }),
    onSuccess: invalidate,
  });
  const unpublishMut = useMutation({ mutationFn: () => unpublishStatusPage(m.monitorId), onSuccess: invalidate });
  const deleteMut = useMutation({
    mutationFn: () => deleteMonitor(m.monitorId),
    onSuccess: () => { invalidate(); onClose(); },
  });

  return (
    <div className="h-full overflow-auto" data-testid="monitor-settings-tab">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

        <section className="rounded-2xl border border-border bg-surface/40 p-5" data-testid="monitor-settings-general">
          <h3 className="mb-3 text-sm font-semibold tracking-tight">General</h3>
          <div className="space-y-3">
            <Input label="Name" value={name} onChange={setName} testId="settings-name" required />
            <Input label="Description" value={description} onChange={setDescription} testId="settings-desc" />
            <Input label="Schedule cron" value={scheduleCron} onChange={setScheduleCron} mono required testId="settings-cron" />
            <Input label="Notification emails (comma-separated)" value={emails} onChange={setEmails} testId="settings-emails" />
            <Input label="Tags (comma-separated)" value={tags} onChange={setTags} testId="settings-tags" />
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => updateMut.mutate()} disabled={updateMut.isPending} data-testid="settings-save">
                {updateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface/40 p-5" data-testid="monitor-settings-status-page">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Globe2 className="h-4 w-4 text-primary" /> Public status page
          </h3>
          <p className="mb-3 text-[11px] text-text-muted">Expose this monitor's status under a public slug — anyone with the link sees uptime &amp; incidents (no auth).</p>
          <div className="space-y-3">
            <Input label="Slug" value={slug} onChange={setSlug} mono testId="settings-slug" />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" data-testid="settings-public" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
              <span>Make page public</span>
            </label>
            {m.statusPageUrl && (
              <p className="text-[11px] text-text-muted">URL: <a href={m.statusPageUrl} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline" data-testid="settings-status-url">{m.statusPageUrl}</a></p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              {m.statusPagePublic && (
                <Button variant="outline" onClick={() => unpublishMut.mutate()} disabled={unpublishMut.isPending} data-testid="settings-unpublish">
                  {unpublishMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Unpublish
                </Button>
              )}
              <Button variant="primary" onClick={() => publishMut.mutate()} disabled={publishMut.isPending} data-testid="settings-publish">
                {publishMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe2 className="h-3.5 w-3.5" />} {m.statusPagePublic ? 'Update' : 'Publish'}
              </Button>
            </div>
          </div>

          {/* Live preview — shows what public visitors actually see */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <span data-testid="settings-status-preview-label">Live preview</span>
              {m.statusPagePublic
                ? <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 normal-case text-success">visible publicly</span>
                : <span className="rounded-full border border-border bg-elevated px-2 py-0.5 normal-case text-text-muted">private — published preview only</span>}
            </div>
            <PublicStatusPagePreview monitor={m} />
          </div>
        </section>

        <section className="rounded-2xl border border-danger/30 bg-danger/[0.04] p-5" data-testid="monitor-settings-danger">
          <h3 className="mb-1 text-sm font-semibold tracking-tight text-danger">Danger zone</h3>
          <p className="mb-3 text-[11px] text-text-muted">Deleting a monitor permanently removes its run history, incidents, and maintenance windows.</p>
          <Button variant="outline" className="border-danger/40 text-danger hover:bg-danger/10" onClick={() => setConfirmDel(true)} data-testid="settings-delete">
            <Trash2 className="h-3.5 w-3.5" /> Delete monitor
          </Button>
        </section>
      </div>
      <ConfirmDialog
        open={confirmDel}
        onOpenChange={(o) => { if (!o) setConfirmDel(false); }}
        title="Delete this monitor?"
        description={`"${m.name}" will be permanently deleted along with its history.`}
        confirmText="Delete" tone="danger"
        onConfirm={async () => { await deleteMut.mutateAsync(); setConfirmDel(false); }}
      />
    </div>
  );
};

const Input = ({ label, value, onChange, mono, required, testId }: {
  label: string; value: string; onChange: (s: string) => void; mono?: boolean; required?: boolean; testId: string;
}) => (
  <label className="block text-xs">
    <span className="mb-1 flex items-center gap-1.5 font-medium text-text-secondary">
      {label} {required && <span className="text-danger">*</span>}
    </span>
    <input
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-8 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs',
        mono && 'font-mono',
      )}
    />
  </label>
);
