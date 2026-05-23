/**
 * AI Testing — Overview tab. Headline cards + cost trend sparkline.
 */
import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, DollarSign, Play } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { fetchStats, type Stats } from '@/services/aiTesting.service';

interface Props {
  workspaceId: string;
  onJump: (k: 'overview' | 'suites' | 'quick' | 'runs' | 'keys' | 'audit') => void;
}

export const OverviewTab = ({ workspaceId, onJump }: Props) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStats(workspaceId)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const trend = (stats?.trend ?? []).map((t) => ({
    x: new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    cost: Number((t.cost ?? 0).toFixed(4)),
    passed: t.passed,
    failed: t.failed,
    errored: t.errored,
    latency: t.avgLatencyMs,
  }));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-lg font-semibold">Overview</h2>
      <p className="mb-6 text-xs text-text-muted">Last 30 days of AI Testing activity for this workspace.</p>

      {/* ── Headline cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="ai-testing-overview-cards">
        <Card icon={Play}        label="Total runs" value={stats?.totalRuns ?? 0} accent="primary" />
        <Card icon={CheckCircle2} label="Succeeded" value={stats?.succeeded ?? 0} accent="success" />
        <Card icon={AlertTriangle} label="Failed"   value={stats?.failed ?? 0}    accent="danger" />
        <Card icon={DollarSign}  label="30-day spend (USD)"
              value={'$' + (stats?.last30Cost ?? 0).toFixed(4)} accent="warning" />
      </div>

      {/* ── Cost trend line ── */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-4" data-testid="ai-testing-cost-chart">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Cost per run (USD)
            </div>
            <p className="text-[10px] text-text-muted">
              Thin line view — drill into Runs tab for full detail.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onJump('runs')}
            className="text-[11px] text-primary hover:underline"
          >
            View all runs →
          </button>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
              <XAxis dataKey="x" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(20,22,27,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, fontSize: 11,
                }}
                formatter={(value: any) => '$' + Number(value).toFixed(6)}
              />
              <Line
                type="monotone" dataKey="cost"
                stroke="#22c5a3" strokeWidth={1.5}
                dot={{ r: 2, fill: '#22c5a3', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#22c5a3' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Pass / Fail bars ── */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-4" data-testid="ai-testing-passfail-chart">
        <div className="mb-2 text-sm font-medium">Pass / fail per run</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <XAxis dataKey="x" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(20,22,27,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, fontSize: 11,
                }}
              />
              <Bar dataKey="passed" stackId="r" fill="#22c5a3" />
              <Bar dataKey="failed" stackId="r" fill="#ef4444" />
              <Bar dataKey="errored" stackId="r" fill="#fb923c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => onJump('suites')}
          data-testid="ai-testing-cta-suites"
          className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90"
        >
          Create a test suite →
        </button>
        <button
          type="button"
          onClick={() => onJump('quick')}
          data-testid="ai-testing-cta-quick"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated"
        >
          One-shot quick test
        </button>
      </div>
    </div>
  );
};

const Card = ({ icon: Icon, label, value, accent }: any) => {
  const colourMap: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
  };
  const colour = colourMap[accent] || 'text-primary';
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
        <Icon className={`h-3.5 w-3.5 ${colour}`} />
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
};
