/**
 * PublicStatusPagePreview — embedded BetterStack/Statuspage-style live
 * preview of the public status page that this monitor exposes via
 * `GET /api/v1/monitors/public/status/{slug}`.
 *
 * Composes:
 *   • Hero with monitor name + current status
 *   • Big "All systems operational" / "Service down" banner
 *   • 30-day uptime ribbon — 30 vertical bars sourced from the
 *     timeseries endpoint (private, auth-only) so we can show *something*
 *     even before the page is published.
 *   • KPI strip: 30d uptime · avg latency · open incidents
 *   • Recent incidents list (private monitor incidents)
 *
 * Used in two places:
 *   1. Inline tile inside MonitorDetailPage > Settings tab.
 *   2. Public route /status/{slug} (StatusPagePublicRoute) — anonymous
 *      readers, calls `getPublicStatus(slug)` exclusively.
 */
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, AlertTriangle, Activity, Globe2, Loader2,
  Wrench, Clock,
} from 'lucide-react';
import {
  getMonitorTimeseries, getMonitorStats, listIncidents,
  getPublicStatus,
  type Monitor, type TimeseriesPoint, type IncidentView,
} from '@/services/monitor.service';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelative } from '../shared/Badges';
import { cn } from '@/utils/cn';

interface Props {
  /** When provided, this is the in-app preview (uses private endpoints). */
  monitor?: Monitor;
  /** When provided (and `monitor` is absent), this is the public route. */
  slug?: string;
}

export const PublicStatusPagePreview = ({ monitor, slug }: Props) => {
  // Public read (anonymous)
  const publicQ = useQuery({
    queryKey: ['monitor', 'public-status', slug],
    queryFn: () => getPublicStatus(slug!),
    enabled: !!slug && !monitor,
  });

  // Private (in-app preview): get the rich data the public endpoint omits
  const tsQ = useQuery({
    queryKey: ['monitor', 'timeseries', monitor?.monitorId, 30],
    queryFn: () => getMonitorTimeseries(monitor!.monitorId, 30),
    enabled: !!monitor,
  });
  const statsQ = useQuery({
    queryKey: ['monitor', 'stats', monitor?.monitorId, 30],
    queryFn: () => getMonitorStats(monitor!.monitorId, 30),
    enabled: !!monitor,
  });
  const incQ = useQuery({
    queryKey: ['monitor', 'incidents', monitor?.monitorId, 'recent'],
    queryFn: () => listIncidents(monitor!.monitorId, { size: 5 }),
    enabled: !!monitor,
  });

  if (slug && !monitor && publicQ.isLoading) {
    return <FullPageSkeleton />;
  }
  if (slug && !monitor && publicQ.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8" data-testid="status-page-not-found">
        <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
          <Globe2 className="mx-auto mb-3 h-8 w-8 text-text-muted" />
          <p className="text-base font-semibold">Status page unavailable</p>
          <p className="mt-1 text-xs text-text-muted">This page is private or has been unpublished.</p>
        </div>
      </div>
    );
  }

  const pub = publicQ.data;
  const headline = monitor?.name ?? pub?.name ?? 'Status';
  const subtitle = monitor?.description ?? pub?.description;
  const lastState = (monitor?.lastState ?? pub?.lastState ?? 'UNKNOWN').toUpperCase();
  const uptimePct = pub?.uptime30dPct ?? statsQ.data?.uptimePct ?? null;
  const avgLat    = pub?.avgLatencyMs ?? statsQ.data?.avgLatencyMs ?? null;
  const open      = pub?.openIncidents ?? statsQ.data?.openIncidents ?? 0;
  const inMaint   = pub?.inMaintenance ?? false;

  const banner = lastState === 'UP' || lastState === 'SUCCESS'
    ? { tone: 'success', icon: CheckCircle2, label: 'All systems operational' }
    : lastState === 'DEGRADED'
    ? { tone: 'warning', icon: AlertTriangle, label: 'Degraded performance' }
    : lastState === 'DOWN' || lastState === 'FAILED'
    ? { tone: 'danger', icon: XCircle, label: 'Service is currently down' }
    : { tone: 'muted', icon: Activity, label: 'No data yet' };
  const BannerIcon = banner.icon;

  const points = tsQ.data ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/60" data-testid="status-page-preview">
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Globe2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight">{headline}</h2>
            {subtitle && <p className="line-clamp-1 text-[11px] text-text-muted">{subtitle}</p>}
          </div>
          {monitor?.statusPagePublic && (
            <span data-testid="status-page-public-pill" className="ml-auto inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> public
            </span>
          )}
        </div>

        <div
          data-testid={`status-banner-${banner.tone}`}
          className={cn(
            'mt-4 flex items-center gap-3 rounded-xl border px-4 py-3',
            banner.tone === 'success' ? 'border-success/30 bg-success/[0.06] text-success' :
            banner.tone === 'warning' ? 'border-warning/30 bg-warning/[0.06] text-warning' :
            banner.tone === 'danger'  ? 'border-danger/30  bg-danger/[0.06]  text-danger' :
            'border-border bg-elevated text-text-muted',
          )}
        >
          <BannerIcon className="h-5 w-5 shrink-0" />
          <div>
            <div className="text-sm font-semibold tracking-tight">{banner.label}</div>
            <div className="mt-0.5 text-[11px] opacity-80">
              {monitor?.lastRunAt
                ? <>last checked {formatRelative(typeof monitor.lastRunAt === 'string' ? monitor.lastRunAt : '')}</>
                : pub?.lastRunAt
                ? <>last checked {formatRelative(typeof pub.lastRunAt === 'string' ? pub.lastRunAt : '')}</>
                : 'no checks yet'}
              {inMaint && <> · in maintenance</>}
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 border-b border-border bg-elevated/20 text-center">
        <KpiCell label="30-day uptime" value={uptimePct != null ? `${uptimePct.toFixed(2)}%` : '—'} testId="status-kpi-uptime" />
        <KpiCell label="Avg latency"  value={avgLat != null ? `${Math.round(avgLat)}ms` : '—'}     testId="status-kpi-latency" />
        <KpiCell label="Open incidents" value={open}                                                testId="status-kpi-incidents" />
      </div>

      {/* 30-day ribbon */}
      <div className="px-6 py-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <Clock className="h-3 w-3" /> Last 30 days
          <span className="ml-auto font-mono normal-case text-text-secondary">{points.length} probes</span>
        </div>
        <Ribbon points={points} loading={!!monitor && tsQ.isLoading} />
        <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> operational</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> degraded</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger" /> down</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-elevated" /> no data</span>
        </div>
      </div>

      {/* Recent incidents (private only) */}
      {monitor && (
        <div className="border-t border-border px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Recent incidents</h3>
            <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">
              {(incQ.data ?? []).length}
            </span>
            {incQ.isFetching && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-text-muted" />}
          </div>
          {incQ.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (incQ.data ?? []).length === 0 ? (
            <p className="rounded-lg border border-border/40 bg-probestack-bg/40 px-3 py-6 text-center text-xs text-text-muted" data-testid="status-incidents-empty">
              No incidents in the last 30 days. 🟢
            </p>
          ) : (
            <ul className="divide-y divide-border" data-testid="status-recent-incidents">
              {(incQ.data ?? []).map((inc) => <IncidentRow key={inc.incidentId} inc={inc} />)}
            </ul>
          )}
        </div>
      )}

      <footer className="flex items-center gap-2 border-t border-border bg-elevated/20 px-6 py-3 text-[10px] text-text-muted">
        <Wrench className="h-3 w-3" />
        <span>Powered by ForgeFuzz Monitors · auto-refreshes every minute</span>
      </footer>
    </div>
  );
};

/* ── helpers ─────────────────────────────────────────────────────── */

const Ribbon = ({ points, loading }: { points: TimeseriesPoint[]; loading: boolean }) => {
  if (loading) return <Skeleton className="h-12 w-full" />;
  // Reduce up to 30 buckets — average a window if we have more data points.
  const buckets = bucketise(points, 30);
  return (
    <div className="flex h-12 items-stretch gap-[3px]" data-testid="status-uptime-ribbon">
      {buckets.map((b, i) => {
        const tone =
          b.kind === 'success'  ? 'bg-success' :
          b.kind === 'degraded' ? 'bg-amber-400' :
          b.kind === 'down'     ? 'bg-danger' :
          'bg-elevated';
        return (
          <div
            key={i}
            data-testid={`status-ribbon-bar-${i}`}
            title={`${b.label} · ${b.kind}`}
            className={cn('flex-1 rounded-sm transition-all hover:scale-y-110', tone)}
          />
        );
      })}
    </div>
  );
};

interface Bucket { kind: 'success' | 'degraded' | 'down' | 'na'; label: string }

const bucketise = (points: TimeseriesPoint[], n: number): Bucket[] => {
  if (points.length === 0) return Array.from({ length: n }, () => ({ kind: 'na', label: 'No data' } as Bucket));
  if (points.length <= n) {
    const empty = n - points.length;
    return [
      ...Array.from({ length: empty }, () => ({ kind: 'na', label: 'No data' } as Bucket)),
      ...points.map((p) => ({
        kind: kindOf(p.status),
        label: typeof p.at === 'string' ? new Date(p.at).toLocaleString() : '',
      })),
    ];
  }
  const size = Math.ceil(points.length / n);
  return Array.from({ length: n }, (_, i) => {
    const slice = points.slice(i * size, (i + 1) * size);
    if (slice.length === 0) return { kind: 'na', label: 'No data' };
    const failed = slice.filter((p) => kindOf(p.status) === 'down').length;
    const degraded = slice.filter((p) => kindOf(p.status) === 'degraded').length;
    return {
      kind: failed > 0 ? 'down' : degraded > 0 ? 'degraded' : 'success',
      label: `${slice.length} probes`,
    };
  });
};

const kindOf = (status: string): Bucket['kind'] => {
  const s = (status ?? '').toUpperCase();
  if (s === 'SUCCESS' || s === 'UP') return 'success';
  if (s === 'FAILED' || s === 'DOWN' || s === 'ERROR') return 'down';
  if (s === 'DEGRADED' || s === 'PARTIAL') return 'degraded';
  return 'na';
};

const KpiCell = ({ label, value, testId }: { label: string; value: number | string; testId: string }) => (
  <div data-testid={testId} className="border-r border-border last:border-r-0 px-3 py-3.5">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
    <div className="mt-0.5 text-base font-semibold tracking-tight">{value}</div>
  </div>
);

const IncidentRow = ({ inc }: { inc: IncidentView }) => {
  const isResolved = inc.status === 'RESOLVED';
  const isAck      = inc.status === 'ACKNOWLEDGED';
  return (
    <li className="flex items-start gap-3 py-2.5 text-xs" data-testid={`status-incident-${inc.incidentId}`}>
      <span className={cn(
        'mt-0.5 grid h-7 w-7 place-items-center rounded-lg ring-1',
        isResolved ? 'bg-success/15 text-success ring-success/30' :
        isAck      ? 'bg-warning/15 text-warning ring-warning/30' :
        'bg-danger/15 text-danger ring-danger/30',
      )}>
        {isResolved ? <CheckCircle2 className="h-3.5 w-3.5" /> :
         isAck      ? <AlertTriangle className="h-3.5 w-3.5" /> :
         <XCircle className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{inc.summary ?? inc.incidentId.slice(0, 8)}</div>
        <div className="mt-0.5 text-[10px] text-text-muted">
          opened {formatRelative(typeof inc.openedAt === 'string' ? inc.openedAt : '')}
          {inc.downtimeMinutes != null && <> · downtime {inc.downtimeMinutes}m</>}
          {inc.resolvedAt && <> · resolved {formatRelative(typeof inc.resolvedAt === 'string' ? inc.resolvedAt : '')}</>}
        </div>
      </div>
      <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
        {inc.status}
      </span>
    </li>
  );
};

const FullPageSkeleton = () => (
  <div className="mx-auto max-w-3xl space-y-4 px-6 py-8">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export const StatusPagePublicView = ({ slug }: { slug: string }) => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PublicStatusPagePreview slug={slug} />
    </div>
  </div>
);
