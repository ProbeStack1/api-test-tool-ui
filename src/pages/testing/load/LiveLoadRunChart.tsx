/**
 * LiveLoadRunChart — time-series chart showing RPS, p95, p99, and error %
 * over the lifetime of a load run. Series are sampled from the SSE
 * `tick` and `progress` events the panel already subscribes to.
 *
 * Design choices:
 *   • Two synchronized recharts area-charts stacked (latency vs error)
 *     so the y-axes don't fight each other.
 *   • Sliding window of the last 120 samples (≈ 2-3 min @ 1Hz) — older
 *     samples are dropped to keep render cheap.
 *   • Empty-state shows a hint instead of a blank chart so the user
 *     knows the stream just hasn't ticked yet.
 *   • All visual styling uses CSS vars from the theme so the chart
 *     matches whatever ForgeQ skin is active.
 */
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { Activity, AlertTriangle } from 'lucide-react';

export interface LiveLoadSample {
  /** Wall-clock timestamp the sample was captured. */
  ts: number;
  /** Actual requests/sec at this instant. */
  rps: number;
  /** p95 latency in ms. */
  p95: number;
  /** p99 latency in ms. */
  p99: number;
  /** Error rate (0–100 percentage). */
  errPct: number;
}

interface Props {
  /** Latest sample to append. When undefined, no append happens. */
  latest?: LiveLoadSample;
  /** Hard ceiling on samples kept in memory (rolling window). */
  maxSamples?: number;
  /** Reset signal — bumping this number clears the buffer. */
  resetKey?: number | string;
  /** Optional threshold guides drawn as dashed lines. */
  thresholds?: {
    p95?: number;
    p99?: number;
    errPct?: number;
  };
}

/** A tiny formatter that keeps the x-axis short — "12:34:56". */
const fmtTime = (ts: number) => {
  try { return new Date(ts).toLocaleTimeString(); } catch { return ''; }
};

export function LiveLoadRunChart({
  latest,
  maxSamples = 120,
  resetKey,
  thresholds,
}: Props) {
  const [samples, setSamples] = useState<LiveLoadSample[]>([]);

  // Reset when caller signals a fresh run.
  useEffect(() => {
    setSamples([]);
  }, [resetKey]);

  // Append latest sample, capped at `maxSamples`.
  useEffect(() => {
    if (!latest) return;
    setSamples((prev) => {
      const next = [...prev, latest];
      return next.length > maxSamples ? next.slice(-maxSamples) : next;
    });
  }, [latest, maxSamples]);

  if (samples.length === 0) {
    return (
      <div
        data-testid="live-load-chart-empty"
        className="flex h-48 flex-col items-center justify-center rounded-lg border border-border/60 bg-probestack-bg/30 text-[11px] text-text-muted"
      >
        <Activity className="mb-1.5 h-5 w-5 opacity-50" />
        Waiting for ticks… chart will render after the first sample.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="live-load-chart">
      {/* RPS + p95/p99 latency overlay */}
      <div className="rounded-lg border border-border/60 bg-probestack-bg/30 p-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Throughput + latency (live)</span>
          <span data-testid="live-load-chart-count">{samples.length} sample{samples.length === 1 ? '' : 's'}</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={samples} margin={{ top: 8, right: 14, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="p99Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#a78bfa" stopOpacity={0.30} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
            <XAxis
              dataKey="ts"
              tickFormatter={fmtTime}
              minTickGap={48}
              stroke="rgba(148,163,184,0.55)"
              fontSize={10}
            />
            <YAxis
              yAxisId="left"
              stroke="#f59e0b"
              fontSize={10}
              tickFormatter={(v) => v.toFixed(0)}
              label={{ value: 'rps', angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 9, fill: '#f59e0b' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#38bdf8"
              fontSize={10}
              tickFormatter={(v) => `${v.toFixed(0)}`}
              label={{ value: 'ms', angle: 90, position: 'insideRight', offset: 12, style: { fontSize: 9, fill: '#38bdf8' } }}
            />
            <Tooltip
              labelFormatter={(label: any) => fmtTime(Number(label))}
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(148,163,184,0.25)',
                fontSize: 11,
                borderRadius: 6,
              }}
              formatter={(value: any, name: any) => {
                const num = Number(value);
                if (name === 'RPS')        return [num.toFixed(1), 'RPS'];
                if (name === 'p95 (ms)')   return [`${num.toFixed(0)} ms`, 'p95'];
                if (name === 'p99 (ms)')   return [`${num.toFixed(0)} ms`, 'p99'];
                return [String(value), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconSize={8} />
            {thresholds?.p95 != null && (
              <ReferenceLine yAxisId="right" y={thresholds.p95} stroke="#38bdf8" strokeDasharray="4 4" strokeOpacity={0.5} />
            )}
            {thresholds?.p99 != null && (
              <ReferenceLine yAxisId="right" y={thresholds.p99} stroke="#a78bfa" strokeDasharray="4 4" strokeOpacity={0.5} />
            )}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="rps"
              name="RPS"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#rpsGrad)"
              isAnimationActive={false}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="p95"
              name="p95 (ms)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              fill="url(#p95Grad)"
              isAnimationActive={false}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="p99"
              name="p99 (ms)"
              stroke="#a78bfa"
              strokeWidth={1.5}
              fill="url(#p99Grad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Error % — its own small chart so a 0.1% blip is still visible */}
      <div className="rounded-lg border border-border/60 bg-probestack-bg/30 p-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-danger" /> Error rate (live)
          </span>
          {samples.length > 0 && (
            <span data-testid="live-load-chart-err-current" className="font-mono normal-case text-text-secondary">
              now: {samples[samples.length - 1].errPct.toFixed(2)}%
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={samples} margin={{ top: 4, right: 14, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
            <XAxis
              dataKey="ts"
              tickFormatter={fmtTime}
              minTickGap={48}
              stroke="rgba(148,163,184,0.55)"
              fontSize={10}
            />
            <YAxis
              stroke="#ef4444"
              fontSize={10}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              domain={[0, (max: number) => Math.max(5, Math.ceil(max * 1.2))]}
            />
            <Tooltip
              labelFormatter={(label: any) => fmtTime(Number(label))}
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(148,163,184,0.25)',
                fontSize: 11,
                borderRadius: 6,
              }}
              formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Errors']}
            />
            {thresholds?.errPct != null && (
              <ReferenceLine y={thresholds.errPct} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            )}
            <Area
              type="monotone"
              dataKey="errPct"
              name="Errors"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#errGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default LiveLoadRunChart;
