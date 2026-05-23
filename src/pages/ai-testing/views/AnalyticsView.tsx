/**
 * AnalyticsView — deeper rollups beyond the Overview tile.
 *
 * Full-width, filterable, skeleton-loaded. All numbers come straight from
 * the backend `/analytics` + `/token-usage` aggregations — no fake data.
 *
 *   • Window pills (7 / 30 / 90 days)
 *   • Provider filter dropdown
 *   • KPI tiles (Runs, Assertions, p50/p95/p99, Tokens, Spend)
 *   • Model comparison table with provider filter
 *   • Top failing assertions BarChart
 *   • Cost-over-time AreaChart
 *   • Tokens-per-day stacked BarChart (in vs out)
 *   • Spend share Donut
 *   • Latency distribution histogram
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, Filter, Loader2, RotateCw } from 'lucide-react';
import { fetchAnalytics, fetchTokenUsage, type AnalyticsRollup, type TokenUsageRollup } from '@/services/aiTesting.service';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';

const DONUT_COLORS = ['#6366f1','#10b981','#f59e0b','#06b6d4','#a855f7','#ec4899','#84cc16','#ef4444'];

interface TokenUsage extends TokenUsageRollup {}

export const AnalyticsView = ({ workspaceId }: { workspaceId: string }) => {
  const [days, setDays]   = useState(30);
  const [providerFilter, setProviderFilter] = useState('all');
  const [data, setData]   = useState<AnalyticsRollup | null>(null);
  const [tu, setTu]       = useState<TokenUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([
        fetchAnalytics(workspaceId, days).catch(() => null),
        fetchTokenUsage(workspaceId, days).catch(() => null),
      ]);
      setData(a);
      setTu(t);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, [workspaceId, days]); // eslint-disable-line

  /* ─── Apply provider filter to model table & charts ─── */
  const models = useMemo(() =>
    (data?.models ?? []).filter((m) => providerFilter === 'all' || m.model.startsWith(providerFilter + '/')),
    [data, providerFilter]);

  const spendShare = useMemo(() =>
    (tu?.perModel ?? [])
      .filter((m) => providerFilter === 'all' || m.provider === providerFilter)
      .map((m) => ({ name: m.provider + '/' + m.model, value: m.cost })),
    [tu, providerFilter]);

  const tokensByDay = useMemo(() => tu?.perDay ?? [], [tu]);

  const providerOptions = useMemo(() => {
    const s = new Set<string>();
    (tu?.perModel ?? []).forEach((m) => s.add(m.provider));
    return Array.from(s);
  }, [tu]);

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-5 p-6" data-testid="ai-testing-analytics-view">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" /> Analytics
          </h2>
          <p className="text-sm text-text-muted">
            Per-model pass-rate, top failing assertions, latency distribution &amp; cost-over-time.
          </p>
        </div>
        <button type="button" onClick={fetchAll}
                data-testid="ai-testing-analytics-refresh"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-elevated">
          <RotateCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* ─── Filter bar ─── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
           data-testid="ai-testing-analytics-filters">
        <Filter className="h-4 w-4 text-text-muted" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Filter</span>
        <div className="flex rounded-md border border-border bg-elevated/40 p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)}
                    data-testid={`ai-testing-analytics-window-${d}`}
                    className={cn('rounded px-2.5 py-1 text-xs font-semibold transition-colors',
                      days === d ? 'bg-primary text-white' : 'text-text-secondary hover:bg-elevated')}>
              {d}d
            </button>
          ))}
        </div>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}
                data-testid="ai-testing-analytics-provider-filter"
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
          <option value="all">All providers ({providerOptions.length})</option>
          {providerOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {(!data || data.totalRuns === 0) ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-text-muted"
             data-testid="ai-testing-analytics-empty">
          <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No data in this window. Run a suite to populate analytics.
        </div>
      ) : (
        <>
          {/* ─── KPIs ─── */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Tile label="Total runs"        value={data.totalRuns}                                  testid="kpi-runs" />
            <Tile label="Assertions"        value={data.totalAssertions.toLocaleString()}            testid="kpi-assertions" />
            <Tile label="Latency p50 (ms)"  value={data.latency.p50.toFixed(0)}                      testid="kpi-p50" />
            <Tile label="Latency p95 (ms)"  value={data.latency.p95.toFixed(0)}                      testid="kpi-p95" />
            <Tile label="Latency p99 (ms)"  value={data.latency.p99.toFixed(0)}                      testid="kpi-p99" />
            <Tile label="Total spend (USD)" value={'$' + (tu?.totalCostUsd ?? 0).toFixed(6)}         testid="kpi-spend" />
          </div>

          {/* ─── Model comparison table ─── */}
          <Card title="Model comparison">
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full text-sm" data-testid="ai-testing-analytics-model-table">
                <thead className="bg-elevated/40 text-xs uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Model</th>
                    <th className="px-3 py-2 text-right">Runs</th>
                    <th className="px-3 py-2 text-right">Pass / Fail / Err</th>
                    <th className="px-3 py-2 text-right">Pass-rate</th>
                    <th className="px-3 py-2 text-right">Total cost</th>
                    <th className="px-3 py-2 text-right">Avg latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {models.map((m) => (
                    <tr key={m.model} data-testid={`ai-testing-analytics-model-${m.model}`}>
                      <td className="px-3 py-2 font-mono">{m.model}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.runs}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className="text-success">{m.passed}</span>
                        <span className="text-text-muted"> / </span>
                        <span className="text-danger">{m.failed}</span>
                        <span className="text-text-muted"> / </span>
                        <span className="text-warning">{m.errored}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.passRate}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">${m.totalCostUsd.toFixed(6)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.avgLatencyMs.toFixed(0)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ─── Chart grid ─── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.topFailingAssertions.length > 0 && (
              <Card title="Top failing assertion types">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.topFailingAssertions} margin={{ top: 4, right: 16, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} angle={-12} interval={0} dy={6} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="count" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {data.trend.length > 0 && (
              <Card title={`Cost over time · last ${days} days`}>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.trend} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Number(v).toFixed(4)}`} />
                    <Tooltip content={<Tip valueFormatter={(v: number) => '$' + v.toFixed(6)} />} />
                    <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="url(#costGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {tokensByDay.length > 0 && (
              <Card title="Tokens per day" subtitle="In + Out stacked">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={tokensByDay} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="tokensIn"  stackId="t" fill="#6366f1" name="Prompt tokens" />
                    <Bar dataKey="tokensOut" stackId="t" fill="#a855f7" name="Completion tokens" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {spendShare.length > 0 && (
              <Card title="Spend share by model">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={spendShare} dataKey="value" nameKey="name" cx="50%" cy="50%"
                         innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {spendShare.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip valueFormatter={(v: number) => '$' + v.toFixed(6)} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────────── */
const Tile = ({ label, value, testid }: { label: string; value: any; testid?: string }) => (
  <div className="rounded-lg border border-border bg-surface px-4 py-3"
       data-testid={`ai-testing-analytics-${testid}`}>
    <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
    <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
  </div>
);

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string; children: any }) => (
  <div className="rounded-lg border border-border bg-surface p-4">
    <div className="mb-2 flex items-baseline justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
    </div>
    {children}
  </div>
);

const Tip = ({ active, payload, label, valueFormatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-lg" data-testid="ai-testing-analytics-tooltip">
      {label && <div className="mb-1 text-xs font-semibold">{label}</div>}
      <ul className="space-y-0.5">
        {payload.map((p: any) => (
          <li key={p.dataKey ?? p.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.payload?.fill ?? '#6366f1' }} />
            <span className="text-text-muted">{p.name}:</span>
            <span className="font-semibold tabular-nums">
              {valueFormatter ? valueFormatter(Number(p.value)) : (typeof p.value === 'number' ? p.value.toLocaleString() : p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AnalyticsSkeleton = () => (
  <div className="space-y-5 p-6" data-testid="ai-testing-analytics-skeleton">
    <Skeleton className="h-7 w-40" />
    <Skeleton className="h-12 w-full" />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
    </div>
    <Skeleton className="h-48 w-full" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60 w-full" />)}
    </div>
  </div>
);

/* ─── Token-usage helper is imported from the service client ─── */
