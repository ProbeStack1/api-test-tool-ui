/**
 * LoadRunDetailPage — drill-in for a single load run.
 *
 * Header  : back · name · status · pause/resume/cancel · 3-format report
 * KPI     : Total req · Success rps · Avg latency · p95 · p99 · Error rate · Throughput
 * Body    : per-endpoint breakdown table + status-code distribution
 *           + threshold violations (if any).
 *
 * Polls every 2 s while not in a terminal status — same pattern as
 * the functional run detail page.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pause, Play, Ban, Loader2, Activity, Gauge, Timer, Hash,
  AlertTriangle, Download, ZapOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTestingStore } from '@/stores/testing.store';
import {
  getRun, pauseRun, resumeRun, cancelRun, downloadReport, downloadReportBlob,
  type LoadRun, type ReportFormat,
} from '@/services/loadTest.service';
import { RunStatusBadge } from '../functional/shared/RunBadges';
import { formatRelative } from '../shared/Badges';
import { cn } from '@/utils/cn';

const TERMINAL = new Set(['SUCCESS', 'FAILED', 'ERROR', 'CANCELLED']);

export const LoadRunDetailPage = ({ loadRunId }: { loadRunId: string }) => {
  const id = useTestingStore((s) => s.selectedLoadRunId);
  const closeLoadRun = useTestingStore((s) => s.closeLoadRun);
  const qc = useQueryClient();
  const [reportBusy, setReportBusy] = useState<ReportFormat | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runQ = useQuery({
    queryKey: ['loadTest', 'run', id],
    queryFn: () => getRun(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const r = q.state.data as LoadRun | undefined;
      return r && TERMINAL.has(r.status) ? false : 2000;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['loadTest', 'run', id] });
  const pauseMut  = useMutation({ mutationFn: () => pauseRun(id!),  onSuccess: invalidate, onError: (e: any) => setActionError(e?.message ?? 'pause failed') });
  const resumeMut = useMutation({ mutationFn: () => resumeRun(id!), onSuccess: invalidate, onError: (e: any) => setActionError(e?.message ?? 'resume failed') });
  const cancelMut = useMutation({ mutationFn: () => cancelRun(id!), onSuccess: invalidate, onError: (e: any) => setActionError(e?.message ?? 'cancel failed') });

  const onDownload = async (fmt: ReportFormat) => {
    setReportBusy(fmt);
    try {
      const { blob, contentDisposition } = await downloadReport(id!, fmt);
      downloadReportBlob(blob, contentDisposition,
        `load-${id!.slice(0, 8)}.${fmt.toLowerCase()}.${fmt === 'JSON' ? 'json' : fmt === 'JUNIT' ? 'xml' : 'html'}`);
    } finally { setReportBusy(null); }
  };

  if (!id) return null;
  const run = runQ.data;
  const isRunning = run?.status === 'RUNNING';
  const isPaused  = run?.status === 'PAUSED';

  return (
    <div className="flex h-full flex-col" data-testid="load-run-detail-page">
      <header className="border-b border-border bg-surface/30 px-6 pt-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => closeLoadRun()} data-testid="load-run-back">
            <ArrowLeft className="h-3.5 w-3.5" /> Load runs
          </Button>
          <span className="text-text-muted">/</span>
          {runQ.isLoading
            ? <Skeleton className="h-5 w-48" />
            : <h1 className="truncate text-sm font-semibold tracking-tight" data-testid="load-run-name">{run?.name || run?.runId.slice(0, 8) || '—'}</h1>}
          {run && <RunStatusBadge status={run.status} />}
          {run?.passed === true  && <span className="rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-success">PASSED</span>}
          {run?.passed === false && <span className="rounded border border-danger/30 bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-danger">FAILED THRESHOLDS</span>}
          <div className="ml-auto flex items-center gap-1">
            {run && isRunning && (
              <Button size="sm" variant="outline" onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending} data-testid="load-run-pause">
                {pauseMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />} Pause
              </Button>
            )}
            {run && isPaused && (
              <Button size="sm" variant="outline" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending} data-testid="load-run-resume">
                {resumeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Resume
              </Button>
            )}
            {run && (isRunning || isPaused) && (
              <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending} data-testid="load-run-cancel">
                {cancelMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel
              </Button>
            )}
            {run && TERMINAL.has(run.status) && (
              <div className="ml-2 flex items-center gap-1 rounded-md border border-border bg-probestack-bg p-0.5">
                {(['HTML', 'JSON', 'JUNIT'] as ReportFormat[]).map((f) => (
                  <button
                    key={f}
                    data-testid={`load-run-report-${f.toLowerCase()}`}
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
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-text-muted">
            <span>{run.sourceType}</span>
            {run.testSpecId && <span>· spec <span className="font-mono">{run.testSpecId.slice(0, 8)}</span></span>}
            {run.config?.concurrency != null && <span>· concurrency {run.config.concurrency}</span>}
            {run.config?.targetRps != null && run.config.targetRps > 0 && <span>· target {run.config.targetRps} rps</span>}
            {run.config?.durationSeconds != null && <span>· {run.config.durationSeconds}s</span>}
            {run.config?.rampUpSeconds != null && <span>· ramp {run.config.rampUpSeconds}s</span>}
            {run.queuedAt && <span>· queued {formatRelative(typeof run.queuedAt === 'string' ? run.queuedAt : '')}</span>}
          </div>
        )}
      </header>

      {actionError && <div className="mx-6 mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{actionError}</div>}

      <div className="flex-1 overflow-auto p-6">
        {!run || runQ.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>
        ) : (
          <>
            <section data-testid="load-run-kpi-grid" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <KPI label="Total req"      value={(run.totalRequests ?? 0).toLocaleString()} icon={Activity} />
              <KPI label="Success"        value={(run.successfulRequests ?? 0).toLocaleString()} tone="success" icon={Activity} />
              <KPI label="Failed"         value={(run.failedRequests ?? 0).toLocaleString()} tone="danger" icon={ZapOff} />
              <KPI label="Actual RPS"     value={(run.actualRps ?? 0).toFixed(1)} icon={Gauge} />
              <KPI label="Avg latency"    value={`${(run.avgLatencyMs ?? 0).toFixed(0)}ms`} icon={Timer} />
              <KPI label="p95"            value={`${run.percentiles?.['95'] ?? 0}ms`} tone="warning" icon={Timer} />
              <KPI label="p99"            value={`${run.percentiles?.['99'] ?? 0}ms`} tone="danger"  icon={Timer} />
            </section>

            {run.thresholdViolations && run.thresholdViolations.length > 0 && (
              <section data-testid="load-run-violations" className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
                <h3 className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                  <AlertTriangle className="h-3.5 w-3.5" /> Threshold violations
                </h3>
                <ul className="ml-4 list-disc space-y-0.5">
                  {run.thresholdViolations.map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </section>
            )}

            {run.statusCodes && Object.keys(run.statusCodes).length > 0 && (
              <section className="mb-3" data-testid="load-run-statuscodes">
                <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status codes</h3>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(run.statusCodes).map(([code, cnt]) => {
                    const c = Number(code);
                    const tone = c < 300 ? 'bg-success/10 text-success' : c < 400 ? 'bg-blue-500/10 text-blue-400' : c < 500 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger';
                    return (
                      <span key={code} className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px]', tone)}>
                        <Hash className="h-3 w-3" />{code} <span className="text-text-muted">×{cnt.toLocaleString()}</span>
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-lg border border-border" data-testid="load-run-endpoints-section">
              <header className="border-b border-border bg-elevated/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Per-endpoint breakdown
              </header>
              {!run.endpointResults || run.endpointResults.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-text-muted" data-testid="load-run-endpoints-empty">No per-endpoint data yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-elevated/40 text-text-muted">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider">Endpoint</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider">Method</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">Total</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">OK</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">Fail</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">Avg ms</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">p95</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">err %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.endpointResults.map((e, i) => (
                      <tr key={`${e.endpointName ?? i}`} className="border-t border-border/40">
                        <td className="px-3 py-1.5 truncate font-medium">{e.endpointName ?? e.url ?? '—'}</td>
                        <td className="px-3 py-1.5 font-mono text-[10px] uppercase">{e.method ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[10px]">{(e.totalRequests ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[10px] text-success">{(e.successfulRequests ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[10px] text-danger">{(e.failedRequests ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[10px]">{(e.avgLatencyMs ?? 0).toFixed(0)}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[10px]">{e.p95Ms ?? 0}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[10px]">{(e.errorRatePct ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const KPI = ({ label, value, icon: Icon, tone = 'default' }: {
  label: string; value: string | number; icon?: any; tone?: 'default' | 'success' | 'warning' | 'danger';
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary', success: 'text-success', warning: 'text-warning', danger: 'text-danger',
  };
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className={cn('text-lg font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};
