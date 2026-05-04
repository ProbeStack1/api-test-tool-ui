/**
 * AnalyticsTab — pick a spec, then see two views:
 *   • Flaky report — non-deterministic test cases over the last N runs
 *   • Trend       — pass/fail/duration over the last N runs (sparkline-style table)
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Activity, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  getFlakyReport, getTrend, type FlakyReport, type TrendPoint,
} from '@/services/functionalTest.service';
import { listTestSpecs } from '@/services/testSpec.service';
import { RunStatusBadge, formatDuration } from '../shared/RunBadges';
import { formatRelative } from '../../shared/Badges';
import { cn } from '@/utils/cn';

interface Props { workspaceId: string }

export const AnalyticsTab = ({ workspaceId }: Props) => {
  const specsQ = useQuery({
    queryKey: ['testSpec', 'list', workspaceId, 'ACTIVE', ''],
    queryFn: () => listTestSpecs(workspaceId, { status: 'ACTIVE', size: 100 }),
  });
  const [testSpecId, setTestSpecId] = useState('');
  const [windowSize, setWindowSize] = useState(10);
  const [trendLimit, setTrendLimit] = useState(20);

  useEffect(() => {
    const first = specsQ.data?.content[0]?.testSpecId;
    if (!testSpecId && first) setTestSpecId(first);
  }, [testSpecId, specsQ.data]);

  const flakyQ = useQuery({
    queryKey: ['functionalTest', 'flaky', testSpecId, windowSize],
    queryFn: () => getFlakyReport(testSpecId, windowSize),
    enabled: !!testSpecId,
  });
  const trendQ = useQuery({
    queryKey: ['functionalTest', 'trend', testSpecId, trendLimit],
    queryFn: () => getTrend(testSpecId, trendLimit),
    enabled: !!testSpecId,
  });

  if (specsQ.isLoading) {
    return <div className="space-y-2 p-6"><Skeleton className="h-32 w-full" /></div>;
  }
  if (!specsQ.data?.content.length) {
    return (
      <div className="flex h-full items-center justify-center p-6" data-testid="analytics-no-specs">
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <LineChart className="mx-auto mb-3 h-8 w-8 text-text-muted" />
          <p className="text-sm font-medium">No specs in this project</p>
          <p className="mt-1 text-xs text-text-muted">Analytics need at least 2 runs of one spec.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-auto p-6" data-testid="functional-analytics-tab">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-secondary">Test spec:</span>
        <select
          data-testid="analytics-spec-select"
          value={testSpecId}
          onChange={(e) => setTestSpecId(e.target.value)}
          className="h-7 rounded border border-border bg-probestack-bg px-2 text-xs"
        >
          {specsQ.data!.content.map((s) => (
            <option key={s.testSpecId} value={s.testSpecId}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Flaky */}
      <section className="rounded-xl border border-border bg-surface/40" data-testid="analytics-flaky-section">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <AlertTriangle className="h-4 w-4 text-warning" /> Flaky tests
            <span className="text-[10px] font-normal text-text-muted">— non-deterministic over last {windowSize} runs</span>
          </h2>
          <select
            data-testid="analytics-flaky-window"
            value={windowSize}
            onChange={(e) => setWindowSize(Number(e.target.value))}
            className="h-7 rounded border border-border bg-probestack-bg px-2 text-xs"
          >
            {[5, 10, 20, 30, 50].map((n) => <option key={n} value={n}>last {n} runs</option>)}
          </select>
        </header>
        <FlakyTable data={flakyQ.data} loading={flakyQ.isLoading} />
      </section>

      {/* Trend */}
      <section className="rounded-xl border border-border bg-surface/40" data-testid="analytics-trend-section">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <LineChart className="h-4 w-4 text-primary" /> Trend
            <span className="text-[10px] font-normal text-text-muted">— last {trendLimit} runs</span>
          </h2>
          <select
            data-testid="analytics-trend-limit"
            value={trendLimit}
            onChange={(e) => setTrendLimit(Number(e.target.value))}
            className="h-7 rounded border border-border bg-probestack-bg px-2 text-xs"
          >
            {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>last {n}</option>)}
          </select>
        </header>
        <TrendTable data={trendQ.data} loading={trendQ.isLoading} />
      </section>
    </div>
  );
};

const FlakyTable = ({ data, loading }: { data?: FlakyReport; loading: boolean }) => {
  if (loading) return <div className="space-y-1 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>;
  const entries = data?.entries ?? [];
  if (entries.length === 0) {
    return <p data-testid="analytics-flaky-empty" className="px-4 py-6 text-center text-xs text-text-muted">No flaky steps detected — your suite is stable.</p>;
  }
  return (
    <table className="w-full text-xs" data-testid="analytics-flaky-table">
      <thead className="bg-elevated/40 text-text-muted">
        <tr><Th>Name</Th><Th>Runs</Th><Th>Pass</Th><Th>Fail</Th><Th>Flips</Th><Th>Failure %</Th></tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={`${e.sourceId ?? 'x'}-${i}`} className="border-t border-border/40">
            <td className="px-3 py-2 font-medium">{e.name}</td>
            <td className="px-3 py-2 font-mono">{e.runs}</td>
            <td className="px-3 py-2 font-mono text-success">{e.passes}</td>
            <td className="px-3 py-2 font-mono text-danger">{e.fails}</td>
            <td className="px-3 py-2 font-mono">{e.flips}</td>
            <td className="px-3 py-2 font-mono">
              <span className={cn(e.failureRatePct > 30 ? 'text-danger' : e.failureRatePct > 10 ? 'text-warning' : 'text-text-secondary')}>
                {e.failureRatePct.toFixed(1)}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const TrendTable = ({ data, loading }: { data?: TrendPoint[]; loading: boolean }) => {
  const points = data ?? [];

  // mini-bar chart: pass/fail bars + duration sparkline
  const maxDur = useMemo(() => Math.max(1, ...points.map((p) => p.durationMs)), [points]);

  if (loading) return <div className="space-y-1 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>;
  if (points.length === 0) {
    return <p data-testid="analytics-trend-empty" className="px-4 py-6 text-center text-xs text-text-muted">Not enough runs yet.</p>;
  }

  return (
    <div className="p-4" data-testid="analytics-trend-content">
      {/* Sparkline-style bars */}
      <div className="mb-4 flex h-20 items-end gap-1" data-testid="analytics-trend-bars">
        {points.map((p) => {
          const h = Math.max(2, (p.durationMs / maxDur) * 80);
          const tone = p.status === 'SUCCESS' ? 'bg-success' : p.status === 'FAILED' ? 'bg-danger' : p.status === 'ERROR' ? 'bg-rose-500' : 'bg-text-muted';
          return (
            <div
              key={p.runId}
              title={`${p.status} · ${formatDuration(p.durationMs)} · ${formatRelative(typeof p.at === 'string' ? p.at : '')}`}
              className={cn('flex-1 rounded-t-sm transition-all hover:opacity-80', tone)}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
      <table className="w-full text-xs">
        <thead className="bg-elevated/40 text-text-muted">
          <tr><Th>When</Th><Th>Status</Th><Th>Pass</Th><Th>Fail</Th><Th>Duration</Th></tr>
        </thead>
        <tbody>
          {[...points].reverse().slice(0, 20).map((p) => (
            <tr key={p.runId} className="border-t border-border/40">
              <td className="px-3 py-1.5 text-[10px] text-text-muted">{formatRelative(typeof p.at === 'string' ? p.at : '')}</td>
              <td className="px-3 py-1.5"><RunStatusBadge status={p.status as string} /></td>
              <td className="px-3 py-1.5 font-mono text-success">{p.passed}</td>
              <td className="px-3 py-1.5 font-mono text-danger">{p.failed}</td>
              <td className="px-3 py-1.5 font-mono text-[10px] text-text-muted">{formatDuration(p.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider">{children}</th>
);
