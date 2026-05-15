/**
 * AnalyticsTab — visual deep-dive on top of history data.
 *  • Top tools (bar chart, last 30 days)
 *  • Method mix (pie/donut)
 *  • Daily volume + success rate (area + line)
 *  • Per-server success-rate leaderboard (table)
 *  • Latency percentiles (sparkbars)
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, RefreshCw, CheckCircle2, AlertTriangle, Activity as ActivityIcon, Server as ServerIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { historyStats, listServers } from '@/services/mcp.service';
import { useGlobalTimezone } from '@/hooks/useGlobalTimezone';
import { cn } from '@/utils/cn';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const RANGES = [
  { id: '24h',  label: 'Last 24h', days: 1 },
  { id: '7d',   label: 'Last 7d',  days: 7 },
  { id: '30d',  label: 'Last 30d', days: 30 },
  { id: '90d',  label: 'Last 90d', days: 90 },
];

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
const isoNow     = () => new Date().toISOString();

export const AnalyticsTab = () => {
  const [zone] = useGlobalTimezone();
  const [range, setRange] = useState('30d');
  const days = RANGES.find((r) => r.id === range)?.days ?? 30;

  const stats = useQuery({
    queryKey: ['mcp-analytics', range],
    queryFn: () => historyStats({ fromDate: isoDaysAgo(days), toDate: isoNow() }),
    refetchInterval: 30_000,
  });
  const serversQ = useQuery({
    queryKey: ['mcp-servers-analytics'],
    queryFn: () => listServers(),
  });

  const s = stats.data;

  // Per-server breakdown (compute from per-server stats request) — fetch on demand.
  const perServer = useQuery({
    queryKey: ['mcp-analytics-perserver', range, (serversQ.data ?? []).map((x) => x.id).join(',')],
    enabled: !!serversQ.data && serversQ.data.length > 0,
    queryFn: async () => {
      const list = serversQ.data ?? [];
      const out = await Promise.all(list.map(async (svr: any) => {
        const sStats = await historyStats({
          serverId: svr.id,
          fromDate: isoDaysAgo(days),
          toDate: isoNow(),
        });
        return { server: svr, stats: sStats };
      }));
      return out.sort((a, b) => (b.stats.total ?? 0) - (a.stats.total ?? 0));
    },
  });

  const topToolsData = useMemo(() =>
    Object.entries(s?.topTools ?? {}).map(([name, count]) => ({ name, count })),
    [s]);
  const methodMixData = useMemo(() =>
    Object.entries(s?.byMethod ?? {}).map(([name, value]) => ({ name, value })),
    [s]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mcp-analytics-tab">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/40 px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" /> Analytics
          <span className="ml-2 text-[10px] font-normal text-text-muted">timezone: {zone}</span>
        </h3>
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border border-border bg-probestack-bg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                data-testid={`analytics-range-${r.id}`}
                onClick={() => setRange(r.id)}
                className={cn(
                  'rounded px-2 py-1 text-[10px] font-semibold transition-colors',
                  range === r.id ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary',
                )}
              >{r.label}</button>
            ))}
          </div>
          <Button size="sm" variant="outline" data-testid="analytics-refresh" onClick={() => stats.refetch()}>
            <RefreshCw className={cn('h-3.5 w-3.5', stats.isFetching && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </header>

      {stats.isLoading || !s ? (
        <Skeleton className="m-4 h-72 w-auto" />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-4 lg:grid-cols-12">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-5">
            <KPI label="Total calls"   value={s.total.toLocaleString()} icon={ActivityIcon} />
            <KPI label="Success rate"  value={`${s.successRate.toFixed(1)}%`}  icon={CheckCircle2} tone={s.successRate >= 95 ? 'success' : s.successRate >= 80 ? 'warning' : 'danger'} />
            <KPI label="Failed"        value={s.failed.toLocaleString()} icon={AlertTriangle} tone={s.failed > 0 ? 'warning' : 'default'} />
            <KPI label="p50 latency"   value={`${s.latencyP50}ms`} icon={BarChart3} />
            <KPI label="p95 / p99"     value={`${s.latencyP95} / ${s.latencyP99}ms`} icon={BarChart3} />
          </div>

          {/* Daily volume + success rate */}
          <Card title="Daily volume" testId="analytics-daily-volume" className="lg:col-span-8">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={s.series}>
                <defs>
                  <linearGradient id="okGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" stroke="rgba(148,163,184,0.6)" fontSize={10} />
                <YAxis stroke="rgba(148,163,184,0.6)" fontSize={10} />
                <RTooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.25)', fontSize: 11, borderRadius: 6 }} />
                <Area dataKey="success" stackId="1" stroke="#10b981" fill="url(#okGrad)"  strokeWidth={1.5} name="Success" isAnimationActive={false} />
                <Area dataKey="failed"  stackId="1" stroke="#ef4444" fill="url(#failGrad)" strokeWidth={1.5} name="Failed" isAnimationActive={false} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Method mix donut */}
          <Card title="Method mix" testId="analytics-method-mix" className="lg:col-span-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={methodMixData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {methodMixData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RTooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.25)', fontSize: 11, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Top tools */}
          <Card title="Top tools called" testId="analytics-top-tools" className="lg:col-span-8">
            {topToolsData.length === 0 ? (
              <Empty msg="No tool calls in this range." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, topToolsData.length * 28)}>
                <BarChart layout="vertical" data={topToolsData} margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(148,163,184,0.6)" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="rgba(148,163,184,0.6)" fontSize={10} width={140} />
                  <RTooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.25)', fontSize: 11, borderRadius: 6 }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Latency percentile bars */}
          <Card title="Latency percentiles" testId="analytics-latency" className="lg:col-span-4">
            <div className="flex flex-col gap-3 px-2 pt-2">
              <LatBar label="p50" value={s.latencyP50} max={Math.max(s.latencyP99, 1)} color="#10b981" />
              <LatBar label="p95" value={s.latencyP95} max={Math.max(s.latencyP99, 1)} color="#f59e0b" />
              <LatBar label="p99" value={s.latencyP99} max={Math.max(s.latencyP99, 1)} color="#ef4444" />
            </div>
          </Card>

          {/* Per-server leaderboard */}
          <Card title="Per-server breakdown" testId="analytics-perserver" className="lg:col-span-12">
            {perServer.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (perServer.data ?? []).length === 0 ? (
              <Empty msg="No servers configured yet." />
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wide text-text-muted">
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left">Server</th>
                    <th className="px-2 py-1.5 text-right">Total</th>
                    <th className="px-2 py-1.5 text-right">Success</th>
                    <th className="px-2 py-1.5 text-right">Failed</th>
                    <th className="px-2 py-1.5 text-right">p95</th>
                    <th className="px-2 py-1.5 text-right">Success rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(perServer.data ?? []).map(({ server, stats: ss }: any) => (
                    <tr key={server.id} className="border-b border-border/40" data-testid={`analytics-server-row-${server.id}`}>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <ServerIcon className="h-3 w-3 text-text-muted" />
                          <span className="truncate">{server.name || server.serverUrl || server.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{ss.total}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-success">{ss.success}</td>
                      <td className={cn('px-2 py-1.5 text-right font-mono', ss.failed > 0 && 'text-danger')}>{ss.failed}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{ss.latencyP95}ms</td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="ml-auto flex h-3 w-24 items-center justify-end overflow-hidden rounded-full bg-elevated">
                          <div
                            className={cn('h-full',
                              ss.successRate >= 95 ? 'bg-success' :
                              ss.successRate >= 80 ? 'bg-warning' : 'bg-danger')}
                            style={{ width: `${Math.min(100, Math.max(0, ss.successRate))}%` }}
                          />
                        </div>
                        <div className="font-mono text-[10px]">{ss.successRate.toFixed(1)}%</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Trend success rate line */}
          <Card title="Success-rate trend" testId="analytics-success-trend" className="lg:col-span-12">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={s.series.map((p: any) => ({ ...p, rate: p.total ? (p.success * 100) / p.total : 100 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" stroke="rgba(148,163,184,0.6)" fontSize={10} />
                <YAxis stroke="rgba(148,163,184,0.6)" fontSize={10} domain={[0, 100]} />
                <RTooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.25)', fontSize: 11, borderRadius: 6 }} formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Line dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
};

const KPI = ({ label, value, icon: Icon, tone = 'default' }: {
  label: string; value: string; icon: any; tone?: 'default' | 'success' | 'warning' | 'danger';
}) => {
  const tones = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  } as const;
  return (
    <div className="rounded-lg border border-border/60 bg-surface/40 p-3" data-testid={`analytics-kpi-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className={cn('truncate text-base font-bold', tones[tone])}>{value}</div>
    </div>
  );
};

const Card = ({ title, children, className, testId }: { title: string; children: any; className?: string; testId: string }) => (
  <div className={cn('rounded-lg border border-border/60 bg-surface/40 p-3', className)} data-testid={testId}>
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{title}</div>
    {children}
  </div>
);

const Empty = ({ msg }: { msg: string }) => (
  <div className="flex h-32 items-center justify-center text-xs text-text-muted">{msg}</div>
);

const LatBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div>
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-semibold text-text-secondary">{label}</span>
      <span className="font-mono text-text-muted">{value}ms</span>
    </div>
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-elevated">
      <div className="h-full" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: color }} />
    </div>
  </div>
);
