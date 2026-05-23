/**
 * Project Dashboard — premium overview.
 *
 * Data comes live from `forgeq-dashboard-mgmt-svc` (port 8095), which itself
 * aggregates over every ForgeFuzz service's MongoDB collections.
 *
 * Interactions / UX:
 *   • Every KPI tile is a clickable deep-link into its feature page.
 *   • Counts animate on first render ("count-up") and refresh.
 *   • Time-series renders as a stacked gradient area chart (modern, no
 *     old-school bars / pies).
 *   • HTTP method distribution renders as comparison bars with per-method
 *     accent colour — cleaner than a donut at a glance.
 *   • A service-health strip at the top shows all 15 Java services green
 *     when they're reachable.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Database, Globe,
  LayoutDashboard, RefreshCw, Server, ShieldAlert, Sparkles, Zap,
  BookOpen, Boxes, TestTube2, Target, Webhook,
} from 'lucide-react';
import { getOverview, getRecentActivity, getTimeseries } from '@/api/dashboard.api';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/ui/Skeleton';

interface KpiDef {
  key: string;
  label: string;
  icon: any;
  tone: string;
  /** Route the tile deep-links into. null → not clickable. */
  to?: string;
}

const KPI_DEFINITIONS: KpiDef[] = [
  { key: 'workspaces',     label: 'Workspaces',      icon: Globe,        tone: 'from-primary/30 to-primary/0 text-primary',        to: '/project' },
  { key: 'collections',    label: 'Collections',     icon: Boxes,        tone: 'from-blue-500/30 to-blue-500/0 text-blue-400',      to: '/projects/collections' },
  { key: 'requests',       label: 'Saved requests',  icon: Zap,          tone: 'from-amber-500/30 to-amber-500/0 text-amber-400',   to: '/projects/collections' },
  { key: 'environments',   label: 'Environments',    icon: Server,       tone: 'from-emerald-500/30 to-emerald-500/0 text-emerald-400', to: '/projects/variables' },
  { key: 'monitors',       label: 'Monitors',        icon: Activity,     tone: 'from-cyan-500/30 to-cyan-500/0 text-cyan-400',      to: '/projects/monitors' },
  { key: 'monitorRuns',    label: 'Monitor runs',    icon: BarChart3,    tone: 'from-cyan-500/30 to-cyan-500/0 text-cyan-400',      to: '/projects/monitors' },
  { key: 'mocks',          label: 'Mock servers',    icon: Database,     tone: 'from-purple-500/30 to-purple-500/0 text-purple-400', to: '/projects/mocks' },
  { key: 'testSpecs',      label: 'Test specs',      icon: Sparkles,     tone: 'from-pink-500/30 to-pink-500/0 text-pink-400',      to: '/projects/testing' },
  { key: 'functionalRuns', label: 'Functional runs', icon: TestTube2,    tone: 'from-emerald-500/30 to-emerald-500/0 text-emerald-400', to: '/projects/testing' },
  { key: 'loadRuns',       label: 'Load runs',       icon: Target,       tone: 'from-amber-500/30 to-amber-500/0 text-amber-400',   to: '/projects/testing' },
  { key: 'apiDocs',        label: 'API docs',        icon: BookOpen,     tone: 'from-indigo-500/30 to-indigo-500/0 text-indigo-400', to: '/projects/api-docs' },
  { key: 'security',       label: 'Security',        icon: ShieldAlert,  tone: 'from-red-500/30 to-red-500/0 text-red-400',         to: '/projects/security' },
  { key: 'governance',     label: 'Governance',      icon: ShieldAlert,  tone: 'from-purple-500/30 to-purple-500/0 text-purple-400', to: '/projects/governance' },
  { key: 'incidents',      label: 'Open incidents',  icon: ShieldAlert,  tone: 'from-danger/30 to-danger/0 text-danger',           to: '/projects/monitors' },
];

/** All Java service ports + display names for the health strip. */
const SERVICES: { key: string; label: string; port: number }[] = [
  { key: 'workspace', label: 'Workspace', port: 8081 },
  { key: 'collection', label: 'Collection', port: 8082 },
  { key: 'request', label: 'Request', port: 8083 },
  { key: 'environment', label: 'Environment', port: 8084 },
  { key: 'mock', label: 'Mock', port: 8085 },
  { key: 'monitor', label: 'Monitor', port: 8086 },
  { key: 'apiDocs', label: 'API docs', port: 8087 },
  { key: 'audit', label: 'Audit', port: 8088 },
  { key: 'functional', label: 'Functional', port: 8089 },
  { key: 'integrations', label: 'Integrations', port: 8090 },
  { key: 'load', label: 'Load', port: 8091 },
  { key: 'testSpec', label: 'Test spec', port: 8092 },
  { key: 'ai', label: 'AI', port: 8093 },
  { key: 'support', label: 'Support', port: 8094 },
  { key: 'dashboard', label: 'Dashboard', port: 8095 },
];

export const DashboardPage = () => {
  const [range, setRange] = useState<'7d' | '14d' | '30d'>('7d');

  const overviewQ = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => getOverview(),
    refetchInterval: 30_000,
  });
  const tsQ = useQuery({
    queryKey: ['dashboard', 'timeseries', range],
    queryFn: () => getTimeseries(range),
    refetchInterval: 60_000,
  });
  const activityQ = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: () => getRecentActivity(20),
    refetchInterval: 60_000,
  });

  const ov = overviewQ.data;
  const refreshing = overviewQ.isFetching || tsQ.isFetching;

  return (
    <div className="flex h-full min-h-0 flex-col bg-probestack-bg" data-testid="dashboard-page">
      {/* Hero strip ---------------------------------------------------- */}
      <header className="flex items-center justify-between gap-4 border-b border-border bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight" data-testid="dashboard-heading">Project dashboard</h1>
            <p className="text-xs text-text-muted">Live aggregate across every ForgeFuzz service · auto-refresh every 30 s</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker value={range} onChange={setRange} />
          <button
            type="button"
            onClick={() => { overviewQ.refetch(); tsQ.refetch(); activityQ.refetch(); }}
            data-testid="dashboard-refresh"
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
            title="Refresh now"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* Service health strip ----------------------------------------- */}
      {/* <ServiceHealthStrip /> */}

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="w-full space-y-6 p-6 xl:p-8 2xl:p-10">
          {/* KPI Tiles ------------------------------------------------- */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              <span className="h-px w-6 bg-gradient-to-r from-primary/60 to-transparent" />
              Key metrics · click any tile to drill in
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6">
              {KPI_DEFINITIONS.map((d) => (
                <KpiTile
                  key={d.key}
                  def={d}
                  total={ov?.kpis?.[d.key]?.total}
                  delta={ov?.kpis?.[d.key]?.delta}
                  spark={ov?.kpiTrends?.[d.key]}
                  loading={overviewQ.isLoading}
                />
              ))}
            </div>
          </section>

          {/* Activity chart + method comparison ---------------------- */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-2" data-testid="dashboard-activity-chart-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Activity over time</h3>
                  <p className="text-[11px] text-text-muted">Stacked daily counts across runs and audit events</p>
                </div>
              </div>
              <AreaChart loading={tsQ.isLoading} data={tsQ.data} />
            </div>

            <div className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-method-donut-card">
              <h3 className="mb-3 text-sm font-semibold">HTTP method distribution</h3>
              <MethodComparisonBars breakdown={ov?.methodBreakdown} loading={overviewQ.isLoading} />
            </div>
          </section>

          {/* Performance quad — donut + radial + latency dial + heatmap ---- */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-method-donut-chart-card">
              <h3 className="mb-3 text-sm font-semibold">Method mix · donut</h3>
              <MethodDonutChart breakdown={ov?.methodBreakdown} loading={overviewQ.isLoading} />
            </div>
            <div className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-success-gauge-card">
              <h3 className="mb-3 text-sm font-semibold">Run success rate (last {range})</h3>
              <SuccessRateGauge ov={ov} loading={overviewQ.isLoading} />
            </div>
            <div className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-latency-dial-card">
              <h3 className="mb-3 text-sm font-semibold">Latency percentiles</h3>
              <LatencyDial ov={ov} loading={overviewQ.isLoading} />
            </div>
            <div className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-activity-heatmap-card">
              <h3 className="mb-3 text-sm font-semibold">Activity intensity heatmap</h3>
              <ActivityHeatmap data={tsQ.data} loading={tsQ.isLoading} />
            </div>
          </section>

          {/* Trend matrix — every KPI as a side-by-side spark line --------- */}
          <section className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-trend-matrix-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">KPI trend matrix · last {range}</h3>
              <span className="text-[10px] text-text-muted">Hover any cell to inspect</span>
            </div>
            <TrendMatrix kpiTrends={ov?.kpiTrends} loading={overviewQ.isLoading} />
          </section>

          {/* Top items + recent activity ----------------------------- */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-top-monitors-card">
              <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Most active monitors</span>
                <Link to="/projects/monitors" className="text-[11px] font-normal text-text-muted hover:text-primary">All →</Link>
              </h3>
              <TopList items={ov?.topMonitors ?? []} loading={overviewQ.isLoading} valueLabel="runs" testId="dashboard-top-monitors" />
            </div>
            <div className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-top-collections-card">
              <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Largest collections</span>
                <Link to="/projects/collections" className="text-[11px] font-normal text-text-muted hover:text-primary">All →</Link>
              </h3>
              <TopList items={ov?.topCollections ?? []} loading={overviewQ.isLoading} valueLabel="requests" testId="dashboard-top-collections" />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5" data-testid="dashboard-recent-activity-card">
            <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
              <span>Recent activity</span>
              <Link to="/projects/audit" className="text-[11px] font-normal text-text-muted hover:text-primary">Open audit log →</Link>
            </h3>
            <RecentActivityList loading={activityQ.isLoading} data={activityQ.data} />
          </section>
        </div>
      </div>
    </div>
  );
};

/* =========================== sub-components =========================== */

const KpiTile = ({ def, total, delta, spark, loading }: {
  def: KpiDef; total?: number; delta?: number; spark?: number[]; loading: boolean;
}) => {
  const Icon = def.icon;
  const body = (
    <div
      data-testid={`kpi-${def.key}`}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-surface p-3 transition-all',
        def.to && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
      )}
    >
      {/* accent gradient wash */}
      <span className={cn('pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b opacity-60', def.tone.replace('text-', ''))} />
      <div className="relative flex items-start justify-between gap-2">
        <div className={cn('grid h-7 w-7 place-items-center rounded-md bg-elevated', def.tone.replace(/from-[^\s]+ to-[^\s]+ /, ''))}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {typeof delta === 'number' && delta !== 0 && (
          <span className={cn(
            'inline-flex items-center gap-0.5 rounded px-1 text-[9px] font-semibold',
            delta > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
          )}>
            {delta > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {Math.abs(delta)}
          </span>
        )}
      </div>
      <div className="relative mt-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">{def.label}</div>
      {loading ? (
        <Skeleton className="relative mt-1 h-7 w-14" />
      ) : (
        <div className="relative mt-0.5 flex items-end justify-between gap-2">
          <div className="text-2xl font-semibold tabular-nums"><CountUp value={total ?? 0} /></div>
          <Sparkline values={spark} tone={def.tone} testId={`sparkline-${def.key}`} />
        </div>
      )}
    </div>
  );
  return def.to ? <Link to={def.to} className="block" aria-label={def.label}>{body}</Link> : body;
};

/**
 * Tiny 7-day sparkline baked into every KPI tile. Renders a gradient
 * under-fill + top stroke so motion/trend is readable at a glance
 * without competing with the big count beside it.
 */
const Sparkline = ({ values, tone, testId }: { values?: number[]; tone: string; testId: string }) => {
  if (!values || values.length === 0) return null;
  const W = 56, H = 20;
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, n - 1)) * W;
    const y = H - (v / max) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `0,${H} ${pts} ${W},${H}`;
  // Pull the accent hex from the tone class (crude but matches our palette).
  const colorClass = tone.replace(/^.*(text-\S+).*$/, '$1');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-5 w-14 shrink-0', colorClass)} data-testid={testId}>
      <defs>
        <linearGradient id={`sg-${testId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${testId})`} />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** Smoothly counts from 0 → target using requestAnimationFrame. */
const CountUp = ({ value, duration = 700 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
};

const RangePicker = ({ value, onChange }: { value: '7d' | '14d' | '30d'; onChange: (v: any) => void }) => (
  <div className="inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-[11px]" data-testid="dashboard-range-picker">
    {(['7d', '14d', '30d'] as const).map((r) => (
      <button
        key={r}
        type="button"
        onClick={() => onChange(r)}
        data-testid={`dashboard-range-${r}`}
        className={cn(
          'rounded px-2 py-1 font-medium uppercase tracking-wider transition-colors',
          value === r ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary',
        )}
      >
        {r}
      </button>
    ))}
  </div>
);

/* --- Stacked gradient area chart (modern replacement for bar/polyline) -- */
const AreaChart = ({ data, loading }: { data?: { days: string[]; series: { label: string; key: string; values: number[] }[] }; loading: boolean }) => {
  const palette = useMemo(() => ['#6366f1', '#10b981', '#f59e0b', '#ec4899'], []);
  const stacked = useMemo(() => {
    if (!data) return { yMax: 1, layers: [] as { color: string; label: string; points: string }[], total: 0 };
    const n = data.days.length;
    const acc = new Array(n).fill(0);
    const layers = data.series.map((s, i) => {
      const top = s.values.map((v, x) => ({ x, y: acc[x] + v }));
      // mutate acc for next layer
      s.values.forEach((v, x) => { acc[x] += v; });
      return { color: palette[i % palette.length], label: s.label, top };
    });
    const yMax = Math.max(1, ...acc);
    const W = 100, H = 100;
    const xStep = W / Math.max(1, n - 1);
    const rendered = layers.map((layer, idx) => {
      const belowTop = idx === 0 ? new Array(n).fill(0) : layers[idx - 1].top.map((p) => p.y);
      const up = layer.top.map((p) => `${(p.x * xStep).toFixed(2)},${(H - (p.y / yMax) * H).toFixed(2)}`).join(' ');
      const down = belowTop.slice().reverse().map((y, i) => {
        const x = (n - 1 - i) * xStep;
        return `${x.toFixed(2)},${(H - (y / yMax) * H).toFixed(2)}`;
      }).join(' ');
      return { color: layer.color, label: layer.label, points: `${up} ${down}` };
    });
    return { yMax, layers: rendered, total: acc.reduce((a, b) => a + b, 0) };
  }, [data, palette]);

  if (loading || !data) return <Skeleton className="h-48 w-full" />;

  if (stacked.total === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-md bg-probestack-bg/60 text-center text-[11px] text-text-muted" data-testid="dashboard-activity-empty">
        <div>
          <Sparkles className="mx-auto mb-1 h-4 w-4 text-text-muted" />
          No activity yet for this range.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="dashboard-activity-chart">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
        {data.series.map((s, i) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-text-muted">
            <span className="h-2 w-2 rounded-sm" style={{ background: palette[i % palette.length] }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative h-48 w-full overflow-hidden rounded-md bg-probestack-bg/60">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            {stacked.layers.map((l, i) => (
              <linearGradient id={`grad-${i}`} key={i} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          {/* background grid */}
          {[25, 50, 75].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.3" />
          ))}
          {stacked.layers.map((l, i) => (
            <polygon
              key={i}
              points={l.points}
              fill={`url(#grad-${i})`}
              stroke={l.color}
              strokeWidth="0.6"
              className="transition-opacity duration-500"
              style={{ animation: `fadeIn 0.6s ease-out ${i * 0.08}s both` }}
            />
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between text-[9px] text-text-muted">
        {data.days.map((d) => <span key={d}>{d.slice(5)}</span>)}
      </div>
    </div>
  );
};

/* --- Horizontal comparison bars — replaces donut -------------------- */
const MethodComparisonBars = ({ breakdown, loading }: { breakdown?: Record<string, number>; loading: boolean }) => {
  if (loading || !breakdown) return <Skeleton className="h-44 w-full" />;
  const entries = Object.entries(breakdown);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  const colors: Record<string, string> = {
    GET: '#10b981', POST: '#6366f1', PUT: '#f59e0b', PATCH: '#ec4899',
    DELETE: '#ef4444', HEAD: '#06b6d4', OPTIONS: '#8b5cf6',
  };
  if (total === 0) {
    return <div className="grid h-44 place-items-center text-[11px] text-text-muted" data-testid="dashboard-method-donut-empty">No requests yet.</div>;
  }
  const max = Math.max(1, ...entries.map(([, n]) => n));
  const sorted = entries.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2" data-testid="dashboard-method-donut">
      <div className="mb-1 text-[10px] text-text-muted">{total} total requests</div>
      {sorted.map(([m, n]) => (
        <div key={m} className="group relative">
          <div className="mb-0.5 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold" style={{ color: colors[m] ?? '#94a3b8' }}>
              {m}
            </span>
            <span className="tabular-nums text-text-muted">{n} ({Math.round((n / total) * 100)}%)</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(n / max) * 100}%`, background: colors[m] ?? '#94a3b8' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const TopList = ({ items, loading, valueLabel, testId }: {
  items: { id: string; name: string; subtitle: string; value: number }[];
  loading: boolean; valueLabel: string; testId: string;
}) => {
  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>;
  }
  if (items.length === 0) {
    return <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-text-muted" data-testid={`${testId}-empty`}>Nothing here yet.</div>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1.5" data-testid={testId}>
      {items.map((it) => (
        <li
          key={it.id}
          className="group relative flex items-center gap-3 rounded-md border border-transparent bg-elevated px-3 py-1.5 text-xs transition-colors hover:border-primary/30"
        >
          <span className="absolute inset-y-0 left-0 rounded-l-md bg-primary/10" style={{ width: `${(it.value / max) * 100}%` }} />
          <span className="relative min-w-0 flex-1 truncate font-medium">{it.name}</span>
          <span className="relative truncate text-[10px] text-text-muted">{it.subtitle}</span>
          <span className="relative tabular-nums text-text-secondary">{it.value} {valueLabel}</span>
        </li>
      ))}
    </ul>
  );
};

const RecentActivityList = ({ data, loading }: { data?: { items: { id: string; timestamp: string; actor: string; action: string; entityType: string; description: string }[] }; loading: boolean }) => {
  if (loading || !data) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>;
  }
  if (data.items.length === 0) {
    return <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-text-muted" data-testid="dashboard-recent-activity-empty">No recent activity yet — get going!</div>;
  }
  return (
    <ul className="divide-y divide-border" data-testid="dashboard-recent-activity-list">
      {data.items.map((a) => (
        <li key={a.id} className="flex items-start gap-3 py-2 text-xs">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-elevated text-[9px] font-semibold uppercase text-primary">
            {(a.action || '?').slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{a.description || `${a.action} ${a.entityType}`}</span>
            <span className="block text-[10px] text-text-muted">
              {a.actor} · {a.entityType} · {timeAgo(a.timestamp)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};

/* --- Service health strip — pulses when reachable ------------------- */
const ServiceHealthStrip = () => {
  const [statuses, setStatuses] = useState<Record<string, 'up' | 'down' | 'unknown'>>({});

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const results: Record<string, 'up' | 'down' | 'unknown'> = {};
      await Promise.all(SERVICES.map(async (s) => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const res = await fetch(`http://localhost:${s.port}/actuator/health`, { signal: ctrl.signal });
          clearTimeout(timer);
          results[s.key] = res.ok ? 'up' : 'down';
        } catch {
          results[s.key] = 'unknown';
        }
      }));
      if (!cancelled) setStatuses(results);
    };
    probe();
    const interval = setInterval(probe, 20_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const upCount = Object.values(statuses).filter((v) => v === 'up').length;
  const total = SERVICES.length;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface/40 px-6 py-2" data-testid="dashboard-health-strip">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Services</span>
      <span className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-semibold',
        upCount === total ? 'bg-success/15 text-success' : upCount > 0 ? 'bg-warning/15 text-warning' : 'bg-elevated text-text-muted',
      )}>
        {upCount}/{total} up
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {SERVICES.map((s) => {
          const st = statuses[s.key] ?? 'unknown';
          return (
            <span
              key={s.key}
              title={`${s.label} — :${s.port} — ${st}`}
              data-testid={`dashboard-health-${s.key}`}
              className={cn(
                'inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted',
                st === 'up' && 'border-success/30',
                st === 'down' && 'border-danger/30',
              )}
            >
              <span className={cn(
                'h-1.5 w-1.5 rounded-full',
                st === 'up' ? 'bg-success animate-pulse' :
                st === 'down' ? 'bg-danger' : 'bg-text-muted',
              )} />
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/* =========================== new chart widgets =========================== */

/**
 * Method-distribution donut.
 *
 * Renders an SVG ring divided into arcs proportional to each HTTP method
 * count. Centre shows the dominant method's percentage (the at-a-glance
 * insight). Used together with the comparison bars chart so the same data
 * tells two different stories — variety + breakdown.
 */
const MethodDonutChart = ({
  breakdown, loading,
}: { breakdown?: Record<string, number>; loading: boolean }) => {
  const COLORS: Record<string, string> = {
    GET: '#10b981', POST: '#6366f1', PUT: '#f59e0b', PATCH: '#ec4899',
    DELETE: '#ef4444', HEAD: '#06b6d4', OPTIONS: '#8b5cf6',
  };
  if (loading || !breakdown) return <Skeleton className="h-44 w-full" />;
  const entries = Object.entries(breakdown).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  if (total === 0) {
    return <div className="grid h-44 place-items-center text-[11px] text-text-muted" data-testid="dashboard-method-donut-chart-empty">No requests yet.</div>;
  }
  const R = 38, CX = 50, CY = 50, STROKE = 14;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = entries.map(([method, n]) => {
    const frac = n / total;
    const seg = { method, n, frac, dasharray: `${(frac * C).toFixed(2)} ${C.toFixed(2)}`, dashoffset: -offset };
    offset += frac * C;
    return seg;
  });
  const dominant = arcs[0];
  return (
    <div className="flex items-center gap-4" data-testid="dashboard-method-donut-chart">
      <svg viewBox="0 0 100 100" className="h-32 w-32">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-elevated)" strokeWidth={STROKE} />
        {arcs.map((a) => (
          <circle
            key={a.method}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={COLORS[a.method] ?? '#94a3b8'}
            strokeWidth={STROKE}
            strokeDasharray={a.dasharray}
            strokeDashoffset={a.dashoffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
          />
        ))}
        <text x={CX} y={CY - 2} textAnchor="middle" className="fill-text-primary" fontSize="13" fontWeight="700">
          {Math.round(dominant.frac * 100)}%
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" className="fill-text-muted" fontSize="6.5">
          {dominant.method}
        </text>
      </svg>
      <ul className="flex-1 space-y-1 text-[11px]">
        {arcs.map((a) => (
          <li key={a.method} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: COLORS[a.method] ?? '#94a3b8' }} />
              <span className="font-mono font-semibold" style={{ color: COLORS[a.method] ?? '#94a3b8' }}>{a.method}</span>
            </span>
            <span className="tabular-nums text-text-muted">{a.n} · {Math.round(a.frac * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Health gauge — radial progress ring showing what % of services are
 * currently green plus how many monitor incidents are open. Centre prints
 * the score (0-100) with a tone that flips red when it drops below 80.
 *
 * Score = (services-up / total-services) × 100  *  (1 - incidents/(incidents+10))
 *  i.e. fewer incidents and more services up → higher score.
 */
/**
 * SuccessRateGauge — radial gauge sourced from run KPIs (no port probing).
 * Replaces the old HealthGauge which polled localhost:* /actuator and
 * embedded raw service URLs in tooltips; that surface belongs to the
 * thin top strip (`ServiceHealthStrip`). This gauge is what end-users
 * actually care about in a Postman-class tool: how many of your runs
 * are passing right now.
 */
const SuccessRateGauge = ({ ov, loading }: { ov?: any; loading: boolean }) => {
  if (loading) return <Skeleton className="h-44 w-full" />;
  const passed = Number(ov?.kpis?.runs?.passed ?? ov?.kpis?.runs?.passedCount ?? 0);
  const failed = Number(ov?.kpis?.runs?.failed ?? ov?.kpis?.runs?.failedCount ?? 0);
  const total  = Number(ov?.kpis?.runs?.total  ?? (passed + failed));
  const score  = total > 0 ? Math.round((passed / total) * 100) : 0;
  const tone   = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  const R = 42, CX = 50, CY = 50;
  const C = 2 * Math.PI * R;
  const dash = `${((score / 100) * C).toFixed(2)} ${C.toFixed(2)}`;
  return (
    <div className="flex items-center gap-4" data-testid="dashboard-success-gauge">
      <svg viewBox="0 0 100 100" className="h-32 w-32">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-elevated)" strokeWidth={10} />
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={tone}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={dash}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.34,1.56,.64,1)' }}
        />
        <text x={CX} y={CY - 1} textAnchor="middle" fill={tone} fontSize="20" fontWeight="700">
          {score}%
        </text>
        <text x={CX} y={CY + 13} textAnchor="middle" className="fill-text-muted" fontSize="6.5">
          pass rate
        </text>
      </svg>
      <ul className="flex-1 space-y-1.5 text-[11px]">
        <li className="flex items-center justify-between"><span className="text-text-muted">Passed</span><span className="tabular-nums font-semibold text-success">{passed}</span></li>
        <li className="flex items-center justify-between"><span className="text-text-muted">Failed</span><span className={cn('tabular-nums font-semibold', failed > 0 ? 'text-danger' : 'text-text-muted')}>{failed}</span></li>
        <li className="flex items-center justify-between"><span className="text-text-muted">Total runs</span><span className="tabular-nums font-semibold">{total}</span></li>
        <li className="flex items-center justify-between"><span className="text-text-muted">Status</span>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', score >= 90 ? 'bg-success/15 text-success' : score >= 70 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger')}>
            {total === 0 ? 'No data' : score >= 90 ? 'Excellent' : score >= 70 ? 'Watch' : 'Degraded'}
          </span>
        </li>
      </ul>
    </div>
  );
};

/**
 * Activity heatmap — per-day intensity grid coloured from cool (low) to
 * hot (high). Aggregates *all* timeseries layers into one cell per day so
 * the user sees overall workload pressure at a glance.
 */
const ActivityHeatmap = ({
  data, loading,
}: { data?: { days: string[]; series: { values: number[] }[] }; loading: boolean }) => {
  if (loading || !data) return <Skeleton className="h-44 w-full" />;
  const totals = data.days.map((_, i) =>
    data.series.reduce((a, s) => a + (s.values[i] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);
  const HEAT = ['#0f172a', '#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#fb923c', '#ef4444'];
  const cellColour = (v: number) => {
    const idx = Math.min(HEAT.length - 1, Math.floor((v / max) * (HEAT.length - 1)));
    return HEAT[idx];
  };
  if (totals.every((v) => v === 0)) {
    return <div className="grid h-44 place-items-center text-[11px] text-text-muted" data-testid="dashboard-activity-heatmap-empty">No activity to map.</div>;
  }
  return (
    <div className="space-y-2" data-testid="dashboard-activity-heatmap">
      <div className="grid auto-rows-fr gap-1.5" style={{ gridTemplateColumns: `repeat(${data.days.length}, 1fr)` }}>
        {data.days.map((d, i) => (
          <div
            key={d}
            title={`${d}: ${totals[i]} events`}
            className="h-12 rounded-md border border-border/40 transition-transform hover:scale-105"
            style={{ background: cellColour(totals[i]) }}
            data-testid={`dashboard-heatmap-cell-${i}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>Low</span>
        <div className="flex gap-1">
          {HEAT.map((c) => <span key={c} className="h-2 w-3 rounded-sm" style={{ background: c }} />)}
        </div>
        <span>High</span>
      </div>
      <div className="flex justify-between text-[9px] text-text-muted">
        {data.days.map((d) => <span key={d}>{d.slice(5)}</span>)}
      </div>
    </div>
  );
};

/**
 * Trend matrix — a tight grid of mini line charts, one per KPI, lined up
 * for at-a-glance comparison. Each cell prints the KPI name + last value
 * + a 30px line chart driven by the same `kpiTrends` array used to power
 * the sparkline beside the big counter on the KPI tile.
 */
const TrendMatrix = ({
  kpiTrends, loading,
}: { kpiTrends?: Record<string, number[]>; loading: boolean }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }
  const entries = Object.entries(kpiTrends ?? {}).filter(([, vs]) => vs && vs.length > 0);
  if (entries.length === 0) {
    return <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-text-muted" data-testid="dashboard-trend-matrix-empty">No trend data yet.</div>;
  }
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="dashboard-trend-matrix">
      {entries.map(([key, values], i) => {
        const max = Math.max(1, ...values);
        const min = Math.min(0, ...values);
        const last = values[values.length - 1] ?? 0;
        const first = values[0] ?? 0;
        const delta = last - first;
        const W = 100, H = 32;
        const n = values.length;
        const pts = values.map((v, idx) => {
          const x = (idx / Math.max(1, n - 1)) * W;
          const y = H - ((v - min) / Math.max(1, max - min)) * (H - 2) - 1;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        const colour = COLORS[i % COLORS.length];
        const label = KPI_DEFINITIONS.find((k) => k.key === key)?.label ?? key;
        return (
          <div
            key={key}
            data-testid={`trend-${key}`}
            className="group relative overflow-hidden rounded-lg border border-border bg-elevated/50 p-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="truncate text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
              <span
                className={cn(
                  'rounded px-1 text-[9px] font-semibold tabular-nums',
                  delta > 0 ? 'bg-success/10 text-success' : delta < 0 ? 'bg-danger/10 text-danger' : 'bg-elevated text-text-muted',
                )}
              >
                {delta > 0 ? '+' : ''}{delta}
              </span>
            </div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <span className="text-base font-semibold tabular-nums">{last.toLocaleString()}</span>
              <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-20" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`tm-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colour} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={colour} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#tm-${key})`} />
                <polyline points={pts} fill="none" stroke={colour} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};



/* =========================================================================
 * LatencyDial — polished percentile widget
 * ------------------------------------------------------------------------
 * Shows P50 / P95 / P99 as three stacked horizontal "dials" with animated
 * width + colour ramp. Sources: `ov.kpis.latency.p50|p95|p99` (ms). If the
 * backend hasn't wired any of them yet, falls back to the first numeric we
 * can find under `ov.latency` so the widget still renders meaningfully.
 * ======================================================================== */
const LatencyDial = ({ ov, loading }: { ov?: any; loading: boolean }) => {
  if (loading) return <Skeleton className="h-40 w-full" />;
  const src = ov?.kpis?.latency ?? ov?.latency ?? {};
  const p50 = Number(src.p50 ?? src.median ?? 0);
  const p95 = Number(src.p95 ?? 0);
  const p99 = Number(src.p99 ?? 0);
  const max = Math.max(p50, p95, p99, 1000);
  const bars = [
    { label: 'P50', value: p50, tone: 'bg-success' },
    { label: 'P95', value: p95, tone: 'bg-warning' },
    { label: 'P99', value: p99, tone: 'bg-danger' },
  ];
  return (
    <div className="flex flex-col gap-3" data-testid="dashboard-latency-dial">
      {bars.map((b) => (
        <div key={b.label} className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-mono font-semibold text-text-secondary">{b.label}</span>
            <span className="tabular-nums text-text-muted">{b.value.toLocaleString()} ms</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className={cn('h-full rounded-full transition-[width]', b.tone)}
              style={{
                width: `${Math.min(100, (b.value / max) * 100).toFixed(1)}%`,
                transitionDuration: '900ms',
                transitionTimingFunction: 'cubic-bezier(.34,1.56,.64,1)',
              }}
            />
          </div>
        </div>
      ))}
      <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-text-muted">
        <span>Max observed</span>
        <span className="tabular-nums font-mono">{max.toLocaleString()} ms</span>
      </div>
    </div>
  );
};
