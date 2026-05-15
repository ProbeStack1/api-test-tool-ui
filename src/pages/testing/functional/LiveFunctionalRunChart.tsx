/**
 * LiveFunctionalRunChart — small live chart for functional runs.
 *
 * Two visualisations stacked:
 *   1. **Step outcome timeline** — every step.end SSE event becomes one
 *      bar (green = pass, red = fail). Length of bar = step duration in
 *      ms. Gives the user a glance over which steps were slow.
 *   2. **Cumulative pass-rate curve** — pass-rate (%) after each step,
 *      computed client-side from the same event stream.
 *
 * Inputs are deliberately just lightweight `LiveStepSample[]` so the
 * caller can map SSE payloads → samples without coupling to backend
 * schema.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Activity } from 'lucide-react';

export interface LiveStepSample {
  /** 1-based index in the stream (used for x-axis labelling). */
  idx: number;
  /** Step name from SSE payload. */
  name: string;
  /** Duration in ms (defaults to 0 when unknown). */
  durationMs: number;
  /** Whether the step ended successfully. */
  ok: boolean;
}

interface Props {
  /** Latest step sample to append. */
  latest?: LiveStepSample;
  /** Reset signal — bumping this number clears the buffer. */
  resetKey?: number | string;
  /** Hard ceiling on samples kept (last N steps). */
  maxSamples?: number;
}

export function LiveFunctionalRunChart({
  latest,
  resetKey,
  maxSamples = 200,
}: Props) {
  const [samples, setSamples] = useState<LiveStepSample[]>([]);

  useEffect(() => { setSamples([]); }, [resetKey]);

  useEffect(() => {
    if (!latest) return;
    setSamples((prev) => {
      const next = [...prev, latest];
      return next.length > maxSamples ? next.slice(-maxSamples) : next;
    });
  }, [latest, maxSamples]);

  const cumulative = useMemo(() => {
    let pass = 0;
    return samples.map((s, i) => {
      if (s.ok) pass++;
      return {
        idx: s.idx,
        name: s.name,
        passRate: ((pass / (i + 1)) * 100),
      };
    });
  }, [samples]);

  if (samples.length === 0) {
    return (
      <div
        data-testid="live-fn-chart-empty"
        className="flex h-32 flex-col items-center justify-center rounded-lg border border-border/60 bg-probestack-bg/30 text-[11px] text-text-muted"
      >
        <Activity className="mb-1.5 h-5 w-5 opacity-50" />
        Waiting for step events…
      </div>
    );
  }

  const failingNow = samples.length > 0 && !samples[samples.length - 1].ok;

  return (
    <div className="flex flex-col gap-3" data-testid="live-fn-chart">
      {/* Step duration timeline */}
      <div className="rounded-lg border border-border/60 bg-probestack-bg/30 p-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Step durations</span>
          <span data-testid="live-fn-chart-count">{samples.length} step{samples.length === 1 ? '' : 's'}</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={samples} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
            <XAxis
              dataKey="idx"
              stroke="rgba(148,163,184,0.55)"
              fontSize={10}
              minTickGap={32}
            />
            <YAxis
              stroke="rgba(148,163,184,0.55)"
              fontSize={10}
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(148,163,184,0.25)',
                fontSize: 11,
                borderRadius: 6,
              }}
              labelFormatter={(label, payload: any) => {
                const item = payload?.[0]?.payload as LiveStepSample | undefined;
                return item ? `${item.idx}. ${item.name}` : String(label);
              }}
              formatter={(value: any, _name: any, ctx: any) => {
                const item = ctx?.payload as LiveStepSample | undefined;
                return [`${Number(value).toFixed(0)} ms`, item?.ok === false ? 'duration (FAIL)' : 'duration'];
              }}
            />
            <Bar dataKey="durationMs" isAnimationActive={false}>
              {samples.map((s, i) => (
                <Cell key={i} fill={s.ok ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative pass-rate */}
      <div className="rounded-lg border border-border/60 bg-probestack-bg/30 p-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Cumulative pass rate</span>
          {samples.length > 0 && (
            <span data-testid="live-fn-chart-passrate" className={`font-mono normal-case ${failingNow ? 'text-danger' : 'text-success'}`}>
              {cumulative[cumulative.length - 1].passRate.toFixed(1)}%
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={cumulative} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" />
            <XAxis dataKey="idx" stroke="rgba(148,163,184,0.55)" fontSize={10} minTickGap={32} />
            <YAxis
              stroke="rgba(148,163,184,0.55)"
              fontSize={10}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(148,163,184,0.25)',
                fontSize: 11,
                borderRadius: 6,
              }}
              labelFormatter={(label) => `Step ${label}`}
              formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Pass rate']}
            />
            <Area
              type="monotone"
              dataKey="passRate"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#passGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default LiveFunctionalRunChart;
