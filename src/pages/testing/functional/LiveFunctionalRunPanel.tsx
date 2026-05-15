/**
 * LiveFunctionalRunPanel — replaces the configure form on the Runs tab
 * once a run is queued. Streams progress via SSE
 * (`/api/v1/functional-tests/runs/{id}/stream`) and falls back to
 * polling when the stream drops.
 *
 * Lifecycle inside the Runs tab:
 *   1. Queue mode (no run)             → InlineStartRunForm
 *   2. Live mode (queued/running/paused) → this panel, animated
 *   3. Completed mode (terminal)       → this panel, static stats
 *      with [Start another] [Open full detail] [Download report]
 *
 * Persists across navigation: even if the user leaves /projects/testing
 * the runId stays in `useTestingStore.liveFunctionalRunId`, so when
 * they return mid-run the panel is still here showing live progress.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Pause, Ban, Loader2, Sparkles, CheckCircle2, XCircle,
  AlertOctagon, Activity, Timer, ListTree, Plus, ExternalLink,
  Download, RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getRun, pauseRun, resumeRun, cancelRun, openRunStream,
  downloadReport, downloadReportBlob, startRun,
  type Run, type ReportFormat,
} from '@/services/functionalTest.service';
import { useTestingStore } from '@/stores/testing.store';
import { RunStatusBadge, formatDuration } from './shared/RunBadges';
import { cn } from '@/utils/cn';
import { LiveFunctionalRunChart, type LiveStepSample } from './LiveFunctionalRunChart';
import { EndpointGridTable } from './EndpointGridTable';

const TERMINAL = new Set(['SUCCESS', 'FAILED', 'ERROR', 'CANCELLED']);

interface Props {
  runId: string;
}

interface StreamLine {
  ts: number;
  kind: 'run.start' | 'step.start' | 'step.end' | 'run.done' | 'info';
  text: string;
  ok?: boolean;
}

export const LiveFunctionalRunPanel = ({ runId }: Props) => {
  const qc = useQueryClient();
  const setLiveRun = useTestingStore((s) => s.setLiveFunctionalRun);
  const openRun = useTestingStore((s) => s.openRun);

  const [lines, setLines] = useState<StreamLine[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const [reportBusy, setReportBusy] = useState<ReportFormat | null>(null);
  const [latestStep, setLatestStep] = useState<LiveStepSample | undefined>();
  const stepCounterRef = useRef(0);
  const linesEndRef = useRef<HTMLDivElement>(null);

  const runQ = useQuery({
    queryKey: ['functionalTest', 'live-run', runId],
    queryFn: () => getRun(runId),
    refetchInterval: (q) => {
      const r = q.state.data as Run | undefined;
      return r && TERMINAL.has(r.status) ? false : 1500;
    },
  });
  const run = runQ.data;
  const isTerminal = !!run && TERMINAL.has(run.status);

  /* ── SSE stream ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!runId || isTerminal) return;
    const es = openRunStream(runId);
    const onLine = (ev: MessageEvent, kind: StreamLine['kind']) => {
      try {
        const payload = ev.data ? JSON.parse(ev.data) : {};
        const msg = payload.name ?? payload.message ?? payload.stepName ?? payload.statusReason ?? '';
        const ok = payload.status ? !['FAILED', 'ERROR'].includes(String(payload.status)) : undefined;
        setLines((prev) => [
          ...prev.slice(-499),
          { ts: Date.now(), kind, text: msg || kind, ok },
        ]);
      } catch {
        setLines((prev) => [...prev.slice(-499), { ts: Date.now(), kind, text: kind }]);
      }
    };
    es.addEventListener('open', () => setStreamConnected(true));
    es.addEventListener('error', () => setStreamConnected(false));
    es.addEventListener('run.start', (e) => {
      // Reset chart counter every time a fresh run starts streaming —
      // important when the panel is reused across consecutive runs.
      stepCounterRef.current = 0;
      onLine(e as MessageEvent, 'run.start');
    });
    es.addEventListener('step.start', (e) => onLine(e as MessageEvent, 'step.start'));
    es.addEventListener('step.end',   (e) => {
      onLine(e as MessageEvent, 'step.end');
      // Push a sample to the live chart.
      try {
        const payload = (e as MessageEvent).data ? JSON.parse((e as MessageEvent).data) : {};
        stepCounterRef.current += 1;
        setLatestStep({
          idx: stepCounterRef.current,
          name: String(payload.stepName ?? payload.name ?? `step ${stepCounterRef.current}`),
          durationMs: Number(payload.durationMs ?? payload.elapsedMs ?? 0) || 0,
          ok: !['FAILED', 'ERROR'].includes(String(payload.status ?? '').toUpperCase()),
        });
      } catch { /* ignore parse errors */ }
    });
    es.addEventListener('run.done',   (e) => {
      onLine(e as MessageEvent, 'run.done');
      /* On run completion that is FAILED/ERROR, dispatch the chatbot
         error analyzer with the captured run context. */
      try {
        const payload = (e as MessageEvent).data ? JSON.parse((e as MessageEvent).data) : {};
        if (payload?.status === 'FAILED' || payload?.status === 'ERROR') {
          import('@/stores/chatbot.store').then(({ useChatbot }) => {
            useChatbot.getState().triggerError({
              location: 'Functional test run',
              statusCode: undefined,
              statusText: String(payload.status),
              durationMs: payload.durationMs ?? payload.elapsedMs,
              errorMessage: payload.statusReason || payload.message || `Run ${runId.slice(0,8)} ended with status ${payload.status}`,
              url: `runId=${runId}`,
              method: 'TEST',
            });
          });
        }
      } catch { /* swallow */ }
    });
    return () => { es.close(); };
  }, [runId, isTerminal]);

  // auto-scroll the stream feed
  useEffect(() => { linesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines.length]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['functionalTest'] });
  const pauseMut  = useMutation({ mutationFn: () => pauseRun(runId),  onSuccess: invalidate });
  const resumeMut = useMutation({ mutationFn: () => resumeRun(runId), onSuccess: invalidate });
  const cancelMut = useMutation({ mutationFn: () => cancelRun(runId), onSuccess: invalidate });

  const onDownload = async (fmt: ReportFormat) => {
    setReportBusy(fmt);
    try {
      const { blob, contentDisposition } = await downloadReport(runId, fmt);
      downloadReportBlob(blob, contentDisposition,
        `run-${runId.slice(0, 8)}.${fmt.toLowerCase()}.${fmt === 'JSON' ? 'json' : fmt === 'JUNIT' ? 'xml' : fmt === 'ALLURE' ? 'json' : 'html'}`);
    } finally {
      setReportBusy(null);
    }
  };

  /* ── render bits ──────────────────────────────────────────────── */
  const passed = run?.passedSteps ?? 0;
  const failed = run?.failedSteps ?? 0;
  const skipped = run?.skippedSteps ?? 0;
  const total = run?.totalSteps ?? 0;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const progressPct = total > 0 ? Math.min(100, ((passed + failed + skipped) / total) * 100) : 0;
  const status = run?.status ?? 'QUEUED';
  const isRunning = status === 'RUNNING';
  const isPaused  = status === 'PAUSED';

  return (
    <section data-testid="live-run-panel" className="overflow-hidden rounded-2xl border border-border bg-surface/50 shadow-sm">
      {/* Top status bar with animated sweep when active */}
      <div className={cn(
        'relative border-b border-border px-6 py-4',
        !isTerminal && 'bg-gradient-to-r from-primary/[0.04] via-primary/[0.10] to-primary/[0.04]',
      )}>
        {!isTerminal && (
          <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-[sweep_2s_linear_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn(
            'grid h-9 w-9 place-items-center rounded-lg ring-1',
            status === 'SUCCESS'   ? 'bg-success/15 text-success ring-success/30' :
            status === 'FAILED'    ? 'bg-danger/15  text-danger  ring-danger/30' :
            status === 'ERROR'     ? 'bg-danger/15  text-danger  ring-danger/30' :
            status === 'CANCELLED' ? 'bg-text-muted/15 text-text-muted ring-border' :
            'bg-primary/15 text-primary ring-primary/30',
          )}>
            {status === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4" /> :
             status === 'FAILED'  ? <XCircle className="h-4 w-4" /> :
             status === 'ERROR'   ? <AlertOctagon className="h-4 w-4" /> :
             status === 'CANCELLED' ? <Ban className="h-4 w-4" /> :
             <Sparkles className="h-4 w-4 animate-pulse" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold tracking-tight" data-testid="live-run-name">
                {run?.name || `Run ${runId.slice(0, 8)}`}
              </h2>
              <RunStatusBadge status={status} />
              {!isTerminal && streamConnected && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[9px] font-semibold text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> live
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-text-muted" data-testid="live-run-meta">
              {run?.sourceType ?? 'TEST_SPEC'}
              {run?.region && <> · region {run.region}</>}
              {run?.startedAt && typeof run.startedAt === 'string' && <> · started {new Date(run.startedAt).toLocaleTimeString()}</>}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {isRunning && (
              <Button size="sm" variant="outline" onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending} data-testid="live-pause-btn">
                {pauseMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />} Pause
              </Button>
            )}
            {isPaused && (
              <Button size="sm" variant="outline" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending} data-testid="live-resume-btn">
                {resumeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Resume
              </Button>
            )}
            {(isRunning || isPaused) && (
              <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending} data-testid="live-cancel-btn">
                {cancelMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel
              </Button>
            )}
            {isTerminal && (
              <>
                <div className="flex items-center gap-1 rounded-md border border-border bg-probestack-bg p-0.5">
                  {(['HTML', 'JSON', 'JUNIT'] as ReportFormat[]).map((f) => (
                    <button
                      key={f}
                      data-testid={`live-report-${f.toLowerCase()}`}
                      onClick={() => onDownload(f)}
                      disabled={reportBusy !== null}
                      className="rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
                    >
                      {reportBusy === f ? <Loader2 className="h-3 w-3 animate-spin" /> : f}
                    </button>
                  ))}
                  <Download className="ml-1 h-3 w-3 text-text-muted" />
                </div>
                <Button size="sm" variant="outline" onClick={() => openRun(runId)} data-testid="live-open-detail">
                  <ExternalLink className="h-3.5 w-3.5" /> Open detail
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    // Run replay (Task 3.14) — re-uses the original run's
                    // testSpecId + environment so the same conditions are
                    // exercised back-to-back. Useful for flake-hunting.
                    if (!run || !run.testSpecId || !run.workspaceId) return;
                    try {
                      const next = await startRun({
                        testSpecId: run.testSpecId,
                        workspaceId: run.workspaceId,
                        environmentId: run.environmentId ?? undefined,
                      });
                      if (next?.runId) setLiveRun(next.runId);
                    } catch (e) {
                      console.error('Replay failed', e);
                    }
                  }}
                  data-testid="live-replay-btn"
                  title="Re-run with the same spec and environment"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Replay
                </Button>
                <Button size="sm" variant="primary" onClick={() => setLiveRun(null)} data-testid="live-start-another">
                  <Plus className="h-3.5 w-3.5" /> Start another
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 border-b border-border bg-elevated/20 px-6 py-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tile icon={Activity} label="Total steps" value={total} testId="live-kpi-total" />
        <Tile icon={CheckCircle2} label="Passed"  value={passed}  tone="success" testId="live-kpi-passed" />
        <Tile icon={XCircle}      label="Failed"  value={failed}  tone="danger"  testId="live-kpi-failed" />
        <Tile icon={ListTree}     label="Skipped" value={skipped} tone="muted"   testId="live-kpi-skipped" />
        <Tile icon={Timer}        label="Avg / total"
              value={`${formatDuration(run?.avgDurationMs ?? null)} / ${formatDuration(run?.totalDurationMs ?? null)}`}
              testId="live-kpi-time" />
      </div>

      {/* Progress bar */}
      <div className="border-b border-border px-6 py-3">
        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Progress</span>
          <span data-testid="live-progress-text" className="font-mono normal-case text-text-secondary">
            {(passed + failed + skipped)} / {total || '?'} steps
            {total > 0 && <> · {progressPct.toFixed(0)}%</>}
            {total > 0 && <> · pass-rate {passRate.toFixed(1)}%</>}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-elevated">
          {total > 0
            ? <div className={cn('h-full transition-all duration-500',
                isTerminal ? (failed > 0 ? 'bg-danger' : 'bg-success') : 'bg-primary',
              )} style={{ width: `${progressPct}%` }} />
            : <div className={cn(
                'h-full bg-primary/40',
                !isTerminal && 'animate-[indeterminate_1.4s_ease-in-out_infinite]',
              )} style={{ width: '40%' }} />}
        </div>
      </div>

      {/* Live charts — step durations + pass-rate over time. Shows up
          regardless of run state so the user can review charts on
          completed runs too (the chart simply stops appending). */}
      <div className="border-b border-border px-6 py-4">
        <LiveFunctionalRunChart latest={latestStep} resetKey={runId} />
      </div>

      {/* Endpoint grid — shows once the run reaches a terminal state.
          Hidden during RUNNING so we don't spam Mongo while ticks fly. */}
      {isTerminal && runId && (
        <div className="border-b border-border px-6 py-4" data-testid="endpoint-grid-section">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Per-endpoint breakdown
          </div>
          <div className="rounded-lg border border-border/60 bg-probestack-bg/30">
            <EndpointGridTable runId={runId} />
          </div>
        </div>
      )}

      {/* Stream feed */}
      <div className="px-6 py-4" data-testid="live-stream-feed">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Activity</span>
          {!isTerminal && !streamConnected && (
            <span className="text-warning">· stream reconnecting…</span>
          )}
        </div>
        <div className="h-64 overflow-auto rounded-lg border border-border/60 bg-probestack-bg/40 p-3 font-mono text-[11px]">
          {lines.length === 0
            ? <p className="text-text-muted" data-testid="live-stream-empty">
                {isTerminal ? 'Run completed before streaming connected. See full detail for steps.' : 'Waiting for first event…'}
              </p>
            : lines.map((l, i) => (
                <div key={i} className="flex gap-2 leading-5">
                  <span className="w-16 shrink-0 text-text-muted">{new Date(l.ts).toLocaleTimeString()}</span>
                  <span className={cn(
                    'w-20 shrink-0 font-semibold',
                    l.kind === 'run.start' ? 'text-primary' :
                    l.kind === 'run.done'  ? (l.ok === false ? 'text-danger' : 'text-success') :
                    l.kind === 'step.end'  ? (l.ok === false ? 'text-danger' : 'text-success') :
                    'text-text-secondary',
                  )}>{l.kind}</span>
                  <span className="min-w-0 flex-1 truncate text-text-secondary">{l.text}</span>
                </div>
              ))}
          <div ref={linesEndRef} />
        </div>
      </div>

      {run?.statusReason && (
        <div className="border-t border-border bg-warning/[0.06] px-6 py-3 text-xs text-warning" data-testid="live-status-reason">
          <strong>Reason:</strong> {run.statusReason}
        </div>
      )}
    </section>
  );
};

const Tile = ({ icon: Icon, label, value, tone = 'default', testId }: {
  icon: any; label: string; value: number | string; tone?: 'default' | 'success' | 'danger' | 'muted'; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary',
    success: 'text-success',
    danger:  'text-danger',
    muted:   'text-text-muted',
  };
  return (
    <div data-testid={testId} className="rounded-lg border border-border/60 bg-surface/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn('truncate text-base font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};
