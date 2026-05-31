/**
 * CompareLoadRunsModal — calls
 * `GET /api/v1/load-tests/runs/{base}/diff?compareWith=<other>` and
 * renders the verdict + delta tiles for headline metrics
 * (avg latency, p95, p99, RPS, error rate).
 */
import { useQuery } from '@tanstack/react-query';
import {
  GitCompareArrows, ArrowRight, TrendingDown, TrendingUp, Minus,
  Loader2, Gauge, Zap, AlertTriangle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { diffRuns, type LoadRun } from '@/services/loadTest.service';
import { cn } from '@/utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  baseRun: LoadRun | null;
  compareRun: LoadRun | null;
}

export const CompareLoadRunsModal = ({ open, onClose, baseRun, compareRun }: Props) => {
  const enabled = open && !!baseRun?.runId && !!compareRun?.runId;
  const q = useQuery({
    queryKey: ['loadTest', 'diff', baseRun?.runId, compareRun?.runId],
    queryFn: () => diffRuns(baseRun!.runId, compareRun!.runId),
    enabled,
  });

  return (
    <Modal
      open={open} onClose={onClose}
      title="Compare load runs" icon={GitCompareArrows} size="xl"
      testId="compare-load-modal"
    >
      {!baseRun || !compareRun ? (
        <p className="text-xs text-text-muted">Pick two load runs to compare.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-probestack-bg/40 p-3 text-xs">
            <RunPill label="Base" run={baseRun} />
            <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
            <RunPill label="Compare" run={compareRun} />
          </div>

          {q.isLoading && (
            <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          )}
          {q.isError && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" data-testid="compare-load-error">
              {(q.error as any)?.message ?? 'Failed to load diff'}
            </div>
          )}

          {q.data && (
            <>
              <div data-testid="compare-load-verdict" className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3',
                q.data.verdict === 'REGRESSED'  ? 'border-danger/30 bg-danger/[0.06]' :
                q.data.verdict === 'IMPROVED'   ? 'border-success/30 bg-success/[0.06]' :
                'border-border bg-elevated/30',
              )}>
                <span className={cn(
                  'grid h-9 w-9 place-items-center rounded-lg',
                  q.data.verdict === 'REGRESSED' ? 'bg-danger/15 text-danger' :
                  q.data.verdict === 'IMPROVED'  ? 'bg-success/15 text-success' :
                  'bg-elevated text-text-muted',
                )}>
                  {q.data.verdict === 'REGRESSED' ? <TrendingDown className="h-4 w-4" /> :
                   q.data.verdict === 'IMPROVED'  ? <TrendingUp   className="h-4 w-4" /> :
                                                     <Minus       className="h-4 w-4" />}
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">Verdict</div>
                  <div className="text-sm font-semibold tracking-tight">{q.data.verdict}</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DeltaTile icon={Gauge} label="Avg latency"
                  base={q.data.baseAvgLatencyMs} compare={q.data.compareAvgLatencyMs}
                  deltaPct={q.data.avgLatencyDeltaPct} unit="ms" lowerIsBetter testId="diff-avg-lat" />
                <DeltaTile icon={Gauge} label="p95"
                  base={q.data.baseP95Ms} compare={q.data.compareP95Ms}
                  deltaPct={q.data.p95DeltaPct} unit="ms" lowerIsBetter testId="diff-p95" />
                <DeltaTile icon={Gauge} label="p99"
                  base={q.data.baseP99Ms} compare={q.data.compareP99Ms}
                  deltaPct={q.data.p99DeltaPct} unit="ms" lowerIsBetter testId="diff-p99" />
                <DeltaTile icon={AlertTriangle} label="Error rate"
                  base={q.data.baseErrorRatePct} compare={q.data.compareErrorRatePct}
                  deltaPct={q.data.errorRateDeltaPct} unit="%" lowerIsBetter testId="diff-err" />
                <DeltaTile icon={Zap} label="RPS"
                  base={q.data.baseActualRps} compare={q.data.compareActualRps}
                  deltaPct={q.data.rpsDeltaPct} unit="rps" lowerIsBetter={false} testId="diff-rps" />
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

const RunPill = ({ label, run }: { label: string; run: LoadRun }) => (
  <div className="min-w-0 flex-1">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
    <div className="mt-0.5 flex items-center gap-2">
      <span className="truncate text-xs font-semibold tracking-tight" data-testid={`compare-load-pill-${label.toLowerCase()}`}>
        {run.name || run.runId.slice(0, 8)}
      </span>
      <span className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        run.status === 'SUCCESS' ? 'border-success/30 bg-success/10 text-success' :
        run.status === 'FAILED'  ? 'border-danger/30  bg-danger/10  text-danger'  :
        'border-border bg-elevated text-text-muted',
      )}>{run.status}</span>
    </div>
    <div className="mt-0.5 font-mono text-[10px] text-text-muted">
      {(run.actualRps ?? 0).toFixed(1)} rps · p95 {run.percentiles?.['p95'] ?? run.percentiles?.['95'] ?? 0}ms
    </div>
  </div>
);

const DeltaTile = ({ icon: Icon, label, base, compare, deltaPct, unit, lowerIsBetter, testId }: {
  icon: any; label: string; base?: number; compare?: number; deltaPct?: number;
  unit: string; lowerIsBetter: boolean; testId: string;
}) => {
  const goodDir = lowerIsBetter ? -1 : 1;
  const tone =
    deltaPct == null || Math.abs(deltaPct) < 1 ? 'text-text-muted' :
    Math.sign(deltaPct) === goodDir ? 'text-success' : 'text-danger';
  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-surface/40 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="flex items-baseline gap-2 font-mono text-xs">
        <span className="text-text-secondary">{base != null ? `${base.toFixed?.(2) ?? base}${unit}` : '—'}</span>
        <ArrowRight className="h-3 w-3 text-text-muted" />
        <span className="font-semibold text-text-primary">{compare != null ? `${compare.toFixed?.(2) ?? compare}${unit}` : '—'}</span>
      </div>
      <div className={cn('mt-1 text-[11px] font-semibold', tone)}>
        {deltaPct != null ? `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%` : '—'}
      </div>
    </div>
  );
};
