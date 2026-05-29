/**
 * RunDetailPage — `/projects/testing/functional/runs/:id`.
 *
 * Header: back · run name · status badge · queued/started/completed
 *         times · pass-rate gauge · pause/resume/cancel · download report.
 * Body  : per-step accordion table with timing breakdown, assertions,
 *         extracted vars, error messages, retry counts.
 *
 * Live update strategy:
 *   - For SUCCESS/FAILED/ERROR/CANCELLED runs (terminal) → no polling.
 *   - For QUEUED/RUNNING/PAUSED → poll `getRun` every 2s; auto-refetch
 *     on tab focus.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pause, Play, Ban, Download, ChevronRight, Loader2,
  Beaker, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTestingStore } from '@/stores/testing.store';
import {
  getRun, pauseRun, resumeRun, cancelRun, downloadReport, downloadReportBlob,
  type Run, type Step, type ReportFormat,
} from '@/services/functionalTest.service';
import { RunStatusBadge, formatDuration } from './shared/RunBadges';
import { formatRelative } from '../shared/Badges';
import { cn } from '@/utils/cn';

const TERMINAL = new Set(['SUCCESS', 'FAILED', 'ERROR', 'CANCELLED']);

export const RunDetailPage = ({ runId }: { runId: string }) => {
  const id = useTestingStore((s) => s.selectedRunId);
  const closeRun = useTestingStore((s) => s.closeRun);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reportBusy, setReportBusy] = useState<ReportFormat | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runQ = useQuery({
    queryKey: ['functionalTest', 'run', id],
    queryFn: () => getRun(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const r = q.state.data as Run | undefined;
      return r && TERMINAL.has(r.status) ? false : 2000;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['functionalTest', 'run', id] });
  const pauseMut  = useMutation({ mutationFn: () => pauseRun(id!),  onSuccess: invalidate, onError: (e: any) => setActionError(e?.message ?? 'pause failed') });
  const resumeMut = useMutation({ mutationFn: () => resumeRun(id!), onSuccess: invalidate, onError: (e: any) => setActionError(e?.message ?? 'resume failed') });
  const cancelMut = useMutation({ mutationFn: () => cancelRun(id!), onSuccess: invalidate, onError: (e: any) => setActionError(e?.message ?? 'cancel failed') });

  const onDownload = async (fmt: ReportFormat) => {
    setReportBusy(fmt);
    try {
      const { blob, contentDisposition } = await downloadReport(id!, fmt);
      downloadReportBlob(blob, contentDisposition, `run-${id!.slice(0, 8)}.${fmt.toLowerCase()}.${fmt === 'JSON' ? 'json' : fmt === 'JUNIT' ? 'xml' : fmt === 'ALLURE' ? 'json' : 'html'}`);
    } finally {
      setReportBusy(null);
    }
  };

  const toggleStep = (sid: string) => setExpanded((p) => {
    const n = new Set(p); n.has(sid) ? n.delete(sid) : n.add(sid); return n;
  });

  const run = runQ.data;
  const isRunning = run?.status === 'RUNNING';
  const isPaused  = run?.status === 'PAUSED';
  const passed    = run?.passedSteps ?? 0;
  const failed    = run?.failedSteps ?? 0;
  const skipped   = run?.skippedSteps ?? 0;
  const total     = run?.totalSteps ?? 0;
  const passRate  = total > 0 ? (passed / total) * 100 : 0;

  return (
    <div className="flex h-full flex-col" data-testid="run-detail-page">
      <header className="border-b border-border bg-surface/30 px-6 pt-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => closeRun()} data-testid="run-back-btn">
            <ArrowLeft className="h-3.5 w-3.5" /> Runs
          </Button>
          <span className="text-text-muted">/</span>
          {runQ.isLoading
            ? <Skeleton className="h-5 w-48" />
            : <h1 className="truncate text-sm font-semibold tracking-tight" data-testid="run-detail-name">
                {run?.name || run?.runId.slice(0, 8) || '—'}
              </h1>}
          {run && <RunStatusBadge status={run.status} />}
          <div className="ml-auto flex items-center gap-1">
            {run && isRunning && (
              <Button size="sm" variant="outline" onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending} data-testid="run-pause-btn">
                {pauseMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />} Pause
              </Button>
            )}
            {run && isPaused && (
              <Button size="sm" variant="outline" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending} data-testid="run-resume-btn">
                {resumeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Resume
              </Button>
            )}
            {run && (isRunning || isPaused) && (
              <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending} data-testid="run-cancel-btn">
                {cancelMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel
              </Button>
            )}
            {run && TERMINAL.has(run.status) && (
              <div className="ml-2 flex items-center gap-1 rounded-md border border-border bg-probestack-bg p-0.5">
                {(['HTML', 'JSON', 'JUNIT', 'ALLURE'] as ReportFormat[]).map((f) => (
                  <button
                    key={f}
                    data-testid={`run-report-${f.toLowerCase()}`}
                    onClick={() => onDownload(f)}
                    disabled={reportBusy !== null}
                    className="rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
                  >
                    {reportBusy === f ? <Loader2 className="h-3 w-3 animate-spin" /> : f}
                  </button>
                ))}
                <Download className="ml-1 h-3 w-3 text-text-muted" />
              </div>
            )}
          </div>
        </div>

        {run && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-text-muted" data-testid="run-meta-strip">
            <span><strong className="text-text-secondary">Source:</strong> {run.sourceType}</span>
            {run.testSpecId && <span>· Spec <span className="font-mono">{run.testSpecId.slice(0, 8)}</span></span>}
            {run.collectionId && <span>· Coll <span className="font-mono">{run.collectionId.slice(0, 8)}</span></span>}
            {run.environmentId && <span>· Env <span className="font-mono">{run.environmentId.slice(0, 8)}</span></span>}
            <span>· Region {run.region ?? 'default'}</span>
            <span>· Triggered by {run.triggeredByEmail ?? '—'}</span>
            {run.queuedAt && <span>· Queued {formatRelative(typeof run.queuedAt === 'string' ? run.queuedAt : '')}</span>}
            {run.startedAt && <span>· Started {formatRelative(typeof run.startedAt === 'string' ? run.startedAt : '')}</span>}
            {run.completedAt && <span>· Completed {formatRelative(typeof run.completedAt === 'string' ? run.completedAt : '')}</span>}
          </div>
        )}
      </header>

      {actionError && (
        <div className="mx-6 mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" data-testid="run-action-error">
          {actionError}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {!run || runQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <KPI label="Total steps"  value={total}    icon={Activity} />
              <KPI label="Passed"       value={passed}   tone="success" />
              <KPI label="Failed"       value={failed}   tone="danger"  />
              <KPI label="Skipped"      value={skipped}  tone="muted"   />
              <KPI label="Pass rate"    value={`${passRate.toFixed(1)}%`} tone={passRate >= 95 ? 'success' : passRate >= 70 ? 'warning' : 'danger'} />
            </section>

            {run.statusReason && (
              <p data-testid="run-status-reason" className="mb-3 rounded-md border border-warning/30 bg-warning/[0.06] px-3 py-2 text-xs text-warning">
                <strong>Reason:</strong> {run.statusReason}
              </p>
            )}

            {/* Steps */}
            <section className="overflow-hidden rounded-lg border border-border" data-testid="run-steps-section">
              <header className="border-b border-border bg-elevated/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Steps
              </header>
              {!run.steps || run.steps.length === 0 ? (
                <div className="p-10 text-center" data-testid="run-steps-empty">
                  <Beaker className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                  <p className="text-sm font-medium">No steps yet</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {run.status === 'QUEUED' || run.status === 'RUNNING'
                      ? 'The run is in progress — steps will stream in.'
                      : 'This source produced 0 executable steps.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border" data-testid="run-steps-list">
                  {run.steps.map((s) => (
                    <StepRow key={s.stepId} step={s} expanded={expanded.has(s.stepId)} onToggle={() => toggleStep(s.stepId)} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const KPI = ({ label, value, icon: Icon, tone = 'default' }: {
  label: string; value: number | string; icon?: any; tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
    muted:   'text-text-muted',
  };
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className={cn('text-lg font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};

const StepRow = ({ step, expanded, onToggle }: { step: Step; expanded: boolean; onToggle: () => void }) => {
  const isPassed = step.status === 'PASSED' || step.status === 'SUCCESS';
  const isFailed = step.status === 'FAILED';
  const isSkipped = step.status === 'SKIPPED';
  return (
    <li data-testid={`step-row-${step.stepId}`}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-hover/40">
        <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-text-muted transition-transform', expanded && 'rotate-90')} />
        <span className="w-7 shrink-0 font-mono text-[10px] text-text-muted">#{step.stepSeq + 1}</span>
        <span className={cn(
          'w-2 rounded-full',
          isPassed ? 'bg-success' : isFailed ? 'bg-danger' : isSkipped ? 'bg-text-muted' : 'bg-amber-400',
        )} style={{ height: 16 }} />
        <span className="font-mono text-[10px] uppercase">{step.method ?? '—'}</span>
        <span className="min-w-0 flex-1 truncate font-medium">{step.name || step.url || step.stepId.slice(0, 8)}</span>
        {step.statusCode != null && (
          <span className={cn(
            'rounded px-1.5 py-0.5 font-mono text-[10px]',
            step.statusCode < 300 ? 'bg-success/10 text-success' :
            step.statusCode < 400 ? 'bg-blue-500/10 text-blue-400' :
            step.statusCode < 500 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger',
          )}>
            {step.statusCode}
          </span>
        )}
        <RunStatusBadge status={String(step.status ?? 'QUEUED')} />
        <span className="w-16 shrink-0 text-right font-mono text-[10px] text-text-muted">{formatDuration(step.totalMs ?? null)}</span>
      </button>

      {expanded && <StepDetail step={step} />}
    </li>
  );
};

const StepDetail = ({ step }: { step: Step }) => (
  <div className="space-y-2 border-t border-border/40 bg-elevated/20 px-12 py-3 text-[11px]">
    {step.url && <Row label="URL" value={step.url} mono />}
    {step.failureReason && (
      <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-danger">
        <strong className="block mb-0.5 text-[10px] uppercase tracking-wider">Failure</strong>
        {step.failureReason}
      </div>
    )}
    {(step.totalMs != null || step.dnsMs != null) && (
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Timings</div>
        <div className="flex flex-wrap gap-3 text-[10px] text-text-secondary">
          {step.dnsMs     != null && <Pill label="dns"     value={`${step.dnsMs}ms`} />}
          {step.connectMs != null && <Pill label="connect" value={`${step.connectMs}ms`} />}
          {step.tlsMs     != null && <Pill label="tls"     value={`${step.tlsMs}ms`} />}
          {step.sendMs    != null && <Pill label="send"    value={`${step.sendMs}ms`} />}
          {step.ttfbMs    != null && <Pill label="ttfb"    value={`${step.ttfbMs}ms`} />}
          {step.receiveMs != null && <Pill label="recv"    value={`${step.receiveMs}ms`} />}
          {step.totalMs   != null && <Pill label="total"   value={`${step.totalMs}ms`} tone />}
          {step.retryCount != null && step.retryCount > 0 && <Pill label="retries" value={String(step.retryCount)} tone />}
        </div>
      </div>
    )}
    {step.assertions && step.assertions.length > 0 && (
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Assertions</div>
        <ul className="space-y-0.5">
          {step.assertions.map((a, i) => (
            <li key={`${a.name}-${i}`} className="flex items-start gap-2 font-mono text-[10px]">
              <span className={a.ok ? 'text-success' : 'text-danger'}>{a.ok ? '✓' : '✗'}</span>
              <span className="text-text-secondary">{a.name}</span>
              {!a.ok && a.message && <span className="text-danger">— {a.message}</span>}
            </li>
          ))}
        </ul>
      </div>
    )}
    {step.extractedVars && Object.keys(step.extractedVars).length > 0 && (
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Extracted vars</div>
        <ul className="space-y-0.5">
          {Object.entries(step.extractedVars).map(([k, v]) => (
            <li key={k} className="font-mono text-[10px] text-text-secondary">
              <span className="text-primary">{k}</span> = <span>{v}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex gap-3">
    <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
    <span className={cn('min-w-0 flex-1 break-all text-text-secondary', mono && 'font-mono text-[10px]')}>{value}</span>
  </div>
);

const Pill = ({ label, value, tone }: { label: string; value: string; tone?: boolean }) => (
  <span className={cn('rounded border border-border px-1.5 py-0.5 font-mono', tone ? 'bg-primary/[0.08] text-primary' : 'bg-elevated text-text-secondary')}>
    <span className="text-text-muted">{label}</span> {value}
  </span>
);
