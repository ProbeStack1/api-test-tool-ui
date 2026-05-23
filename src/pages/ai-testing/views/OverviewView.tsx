/**
 * OverviewView — top-line KPIs + live trend charts for AI Testing.
 *
 * Full-width layout, larger typography, filterable by provider / model /
 * day-window. Real data only — no hard-coded numbers anywhere.
 *
 * Uses recharts for: cost-per-run bar, pass/fail stacked bar, latency
 * area chart, provider donut, token-by-day stacked bar.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie,
  PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, Filter, Loader2, RotateCw, Sparkles, Search, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchStats, listRuns, listSuites, fetchCatalog,
  type Stats, type TestRun, type TestSuite, type Catalog,
} from '@/services/aiTesting.service';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';

const PIE_COLORS = ['#6366f1','#ef4444','#10b981','#f59e0b','#06b6d4','#a855f7','#ec4899','#84cc16'];

export const OverviewView = ({ workspaceId }: { workspaceId: string }) => {
  const nav = useNavigate();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [runs, setRuns]     = useState<TestRun[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [cat, setCat]       = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(30);
  const [providerFilter, setProviderFilter] = useState('all');
  const [modelFilter,    setModelFilter]    = useState('all');
  const [suiteFilter,    setSuiteFilter]    = useState('all');
  const [query, setQuery]   = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, r, su, c] = await Promise.all([
        fetchStats(workspaceId).catch(() => null),
        listRuns(workspaceId, undefined, 0, 500).catch(() => ({ items: [] as TestRun[], total: 0 })),
        listSuites(workspaceId, '', 0, 200).catch(() => ({ items: [] as TestSuite[], total: 0 })),
        fetchCatalog(workspaceId).catch(() => null),
      ]);
      setStats(s);
      setRuns(r?.items ?? []);
      setSuites(su?.items ?? []);
      setCat(c);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, [workspaceId]); // eslint-disable-line

  /* ─── Filtered run set (drives all charts on this page) ─── */
  const filteredRuns = useMemo(() => {
    const since = Date.now() - days * 86400_000;
    return runs.filter((r) => {
      if (r.createdAt && new Date(r.createdAt).getTime() < since) return false;
      if (providerFilter !== 'all' && r.provider !== providerFilter) return false;
      if (modelFilter    !== 'all' && r.model    !== modelFilter)    return false;
      if (suiteFilter    !== 'all' && r.suiteId  !== suiteFilter)    return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!((r.suiteName ?? '').toLowerCase().includes(q) ||
              (r.provider ?? '').toLowerCase().includes(q) ||
              (r.model ?? '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [runs, days, providerFilter, modelFilter, suiteFilter, query]);

  /* ─── Derived chart data from filteredRuns ─── */
  const aggregates = useMemo(() => {
    let cost = 0, tokensIn = 0, tokensOut = 0, passed = 0, failed = 0, errored = 0, latencySum = 0, latencyN = 0;
    for (const r of filteredRuns) {
      cost      += r.totalCostUsd ?? 0;
      tokensIn  += r.totalTokensPrompt ?? 0;
      tokensOut += r.totalTokensCompletion ?? 0;
      passed    += r.passed ?? 0;
      failed    += r.failed ?? 0;
      errored   += r.errored ?? 0;
      if (r.avgLatencyMs && r.avgLatencyMs > 0) { latencySum += r.avgLatencyMs; latencyN++; }
    }
    const totalCases = passed + failed + errored;
    return { cost, tokensIn, tokensOut, passed, failed, errored,
             avgLatency: latencyN ? latencySum / latencyN : 0,
             passRate: totalCases ? (passed / totalCases) * 100 : 0 };
  }, [filteredRuns]);

  const trendData = useMemo(() =>
    filteredRuns.map((r) => ({
      id: r.id, suite: r.suiteName,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      passed: r.passed ?? 0, failed: r.failed ?? 0, errored: r.errored ?? 0,
      cost: r.totalCostUsd ?? 0,
      latency: r.avgLatencyMs ?? 0,
      tokens: (r.totalTokensPrompt ?? 0) + (r.totalTokensCompletion ?? 0),
    })), [filteredRuns]);

  const providerSplit = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filteredRuns) {
      const k = `${r.provider ?? '?'}/${r.model ?? '?'}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [filteredRuns]);

  const dayBucket = useMemo(() => {
    const m = new Map<string, { day: string; tokensIn: number; tokensOut: number; cost: number; runs: number }>();
    for (const r of filteredRuns) {
      if (!r.createdAt) continue;
      const day = r.createdAt.slice(0, 10);
      const cur = m.get(day) ?? { day, tokensIn: 0, tokensOut: 0, cost: 0, runs: 0 };
      cur.tokensIn  += r.totalTokensPrompt ?? 0;
      cur.tokensOut += r.totalTokensCompletion ?? 0;
      cur.cost      += r.totalCostUsd ?? 0;
      cur.runs++;
      m.set(day, cur);
    }
    return Array.from(m.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredRuns]);

  /* ─── Pick lists from catalog or runs ─── */
  const providers = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) if (r.provider) set.add(r.provider);
    return Array.from(set);
  }, [runs]);
  const models = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      if (providerFilter !== 'all' && r.provider !== providerFilter) continue;
      if (r.model) set.add(r.model);
    }
    return Array.from(set);
  }, [runs, providerFilter]);

  if (loading) return <OverviewSkeleton />;

  return (
    <div className="space-y-5 p-6" data-testid="ai-testing-overview">
      {/* ─── Page header ─── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Activity className="h-5 w-5 text-primary" /> Overview
          </h2>
          <p className="text-sm text-text-muted">
            Live metrics across the last {days} day{days === 1 ? '' : 's'} ·
            <span className="ml-1 font-mono text-xs text-text-secondary">{filteredRuns.length} runs in filter</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={fetchAll}
                  data-testid="ai-testing-overview-refresh"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-elevated">
            <RotateCw className="h-3 w-3" /> Refresh
          </button>
          <button type="button" onClick={() => nav('/projects/ai-testing?view=quick')}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90">
            <Sparkles className="h-3 w-3" /> Quick test
          </button>
        </div>
      </div>

      {/* ─── Filter bar ─── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
           data-testid="ai-testing-overview-filters">
        <Filter className="h-4 w-4 text-text-muted" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Filter</span>

        <div className="ml-2 flex rounded-md border border-border bg-elevated/40 p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)}
                    data-testid={`ai-testing-overview-days-${d}`}
                    className={cn('rounded px-2.5 py-1 text-xs font-semibold transition-colors',
                      days === d ? 'bg-primary text-white' : 'text-text-secondary hover:bg-elevated')}>
              {d}d
            </button>
          ))}
        </div>

        <select value={providerFilter}
                onChange={(e) => { setProviderFilter(e.target.value); setModelFilter('all'); }}
                data-testid="ai-testing-overview-provider"
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
          <option value="all">All providers ({providers.length})</option>
          {providers.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}
                data-testid="ai-testing-overview-model"
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
          <option value="all">All models ({models.length})</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={suiteFilter} onChange={(e) => setSuiteFilter(e.target.value)}
                data-testid="ai-testing-overview-suite"
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
          <option value="all">All suites ({suites.length})</option>
          {suites.map((s) => <option key={s.id} value={s.id!}>{s.name}</option>)}
        </select>

        <div className="relative ml-auto min-w-[180px]">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search runs…"
                 data-testid="ai-testing-overview-search"
                 className="w-full rounded-md border border-border bg-surface py-1 pl-7 pr-2 text-xs outline-none focus:border-primary" />
        </div>
      </div>

      {/* ─── KPI tiles ─── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total runs"     value={filteredRuns.length}                                    sub="in window"  testid="kpi-runs" />
        <Stat label="Pass rate"      value={aggregates.passRate.toFixed(1) + '%'}                   sub={`${aggregates.passed} / ${aggregates.passed + aggregates.failed + aggregates.errored} cases`} testid="kpi-pass" />
        <Stat label="Failed"         value={aggregates.failed}                                       sub="across cases" tone="danger" testid="kpi-failed" />
        <Stat label="Cost (USD)"     value={'$' + aggregates.cost.toFixed(6)}                       sub={`${(aggregates.tokensIn + aggregates.tokensOut).toLocaleString()} tokens`} testid="kpi-cost" />
        <Stat label="Avg latency"    value={Math.round(aggregates.avgLatency) + ' ms'}              sub="per run"      testid="kpi-latency" />
        <Stat label="Active baseline" value={runs.filter((r) => r.isBaseline).length}                sub="suites pinned" testid="kpi-baseline" />
      </div>

      {/* ─── Charts grid ─── */}
      {filteredRuns.length === 0 ? (
        <EmptyState onCreate={() => nav('/projects/ai-testing?view=suites')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Cost per run" subtitle="Top-N most recent">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData.slice(-20)} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="createdAt" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${Number(v).toFixed(4)}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={<ChartTip valueFormatter={(v: number) => '$' + v.toFixed(6)} />}
                />
                <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Pass / fail per run" subtitle="Stacked verdict">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData.slice(-20)} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="createdAt" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="passed"  stackId="v" fill="#10b981" />
                <Bar dataKey="failed"  stackId="v" fill="#ef4444" />
                <Bar dataKey="errored" stackId="v" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Avg latency (ms)" subtitle="Last 20 runs">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData.slice(-20)} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="createdAt" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="latency" stroke="#06b6d4" fill="url(#latGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Provider × model split" subtitle="Where your runs go">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={providerSplit} dataKey="value" nameKey="name" cx="50%" cy="50%"
                     innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {providerSplit.map((_, i) =>
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {dayBucket.length > 1 && (
            <Card title="Tokens per day" subtitle="In + Out, stacked" wide>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dayBucket} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tokensIn"  stackId="t" fill="#6366f1" name="Prompt tokens" />
                  <Bar dataKey="tokensOut" stackId="t" fill="#a855f7" name="Completion tokens" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* ─── Recent runs strip ─── */}
      {filteredRuns.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4" data-testid="ai-testing-overview-recent-runs">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Latest runs</h3>
            <button type="button"
                    onClick={() => nav('/projects/ai-testing?view=runs')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              All runs <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-2 py-1.5 text-left">Suite</th>
                  <th className="px-2 py-1.5 text-left">Model</th>
                  <th className="px-2 py-1.5 text-center">Status</th>
                  <th className="px-2 py-1.5 text-right">P / F / E</th>
                  <th className="px-2 py-1.5 text-right">Cost</th>
                  <th className="px-2 py-1.5 text-right">Tokens</th>
                  <th className="px-2 py-1.5 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredRuns.slice(-12).reverse().map((r) => (
                  <tr key={r.id}
                      data-testid={`ai-testing-overview-recent-${r.id}`}
                      onClick={() => nav(`/projects/ai-testing?view=runs&run=${r.id}`)}
                      className="cursor-pointer hover:bg-elevated/40">
                    <td className="px-2 py-1.5 font-medium">{r.suiteName}</td>
                    <td className="px-2 py-1.5 text-text-secondary">{r.provider}/{r.model}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold',
                        r.status === 'succeeded' && 'bg-success/15 text-success',
                        r.status === 'failed'    && 'bg-danger/15 text-danger',
                        r.status === 'running'   && 'bg-warning/15 text-warning animate-pulse',
                        (r.status === 'queued' || r.status === 'cancelled') && 'bg-elevated text-text-muted',
                      )}>{r.status}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      <span className="text-success">{r.passed ?? 0}</span>
                      <span className="text-text-muted"> / </span>
                      <span className="text-danger">{r.failed ?? 0}</span>
                      <span className="text-text-muted"> / </span>
                      <span className="text-warning">{r.errored ?? 0}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">${(r.totalCostUsd ?? 0).toFixed(6)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {((r.totalTokensPrompt ?? 0) + (r.totalTokensCompletion ?? 0)).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{Math.round(r.avgLatencyMs ?? 0)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────────── */

const Stat = ({ label, value, sub, tone, testid }: {
  label: string; value: any; sub?: string; tone?: 'danger' | 'success' | 'warning'; testid?: string;
}) => (
  <div className="rounded-lg border border-border bg-surface px-4 py-3"
       data-testid={`ai-testing-${testid ?? label.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
    <div className={cn('mt-1 text-2xl font-semibold tabular-nums',
      tone === 'danger' && 'text-danger', tone === 'success' && 'text-success',
      tone === 'warning' && 'text-warning')}>
      {value}
    </div>
    {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
  </div>
);

const Card = ({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: any; wide?: boolean }) => (
  <div className={cn('rounded-lg border border-border bg-surface p-4', wide && 'lg:col-span-2')}>
    <div className="mb-1.5 flex items-baseline justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
    </div>
    {children}
  </div>
);

const ChartTip = ({ active, payload, label, valueFormatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-lg" data-testid="ai-testing-chart-tooltip">
      {label && <div className="mb-1 text-xs font-semibold text-text-primary">{label}</div>}
      <ul className="space-y-0.5">
        {payload.map((p: any) => (
          <li key={p.dataKey ?? p.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.payload?.fill ?? '#6366f1' }} />
            <span className="text-text-muted">{p.name}:</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {valueFormatter ? valueFormatter(Number(p.value)) : (typeof p.value === 'number' ? p.value.toLocaleString() : p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center"
       data-testid="ai-testing-overview-empty">
    <Sparkles className="mx-auto mb-2 h-8 w-8 text-text-muted opacity-50" />
    <p className="text-sm text-text-muted">No runs match the current filter. Trigger a suite or relax filters.</p>
    <button type="button" onClick={onCreate}
            className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90">
      Open Test Suites <ArrowRight className="h-3 w-3" />
    </button>
  </div>
);

/* ─── Skeleton ───────────────────────────────────────────────────────── */
const OverviewSkeleton = () => (
  <div className="space-y-5 p-6" data-testid="ai-testing-overview-skeleton">
    <Skeleton className="h-7 w-48" />
    <Skeleton className="h-12 w-full" />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-60 w-full" />
      ))}
    </div>
  </div>
);
