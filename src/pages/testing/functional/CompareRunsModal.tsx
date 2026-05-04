/**
 * CompareRunsModal — fetches `GET /runs/{base}/diff?compareWith=<other>`
 * and renders a side-by-side per-step diff with kind badges
 * (REGRESSED · LATENCY_REGRESSED · IMPROVED · UNCHANGED).
 *
 * Reused from the functional Runs tab: user picks two recent runs via
 * checkboxes then clicks "Compare".
 */
import { useQuery } from '@tanstack/react-query';
import {
  GitCompareArrows, ArrowRight, AlertTriangle, TrendingDown, TrendingUp,
  Minus, Loader2, Activity,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { diffRuns, type Run } from '@/services/functionalTest.service';
import type { StepDiff } from '@/api/functionalTest.api';
import { cn } from '@/utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  baseRun: Run | null;
  compareRun: Run | null;
}

const KIND_META: Record<string, { label: string; icon: any; tone: string }> = {
  REGRESSED:           { label: 'Regressed',           icon: TrendingDown, tone: 'text-danger bg-danger/10  border-danger/30' },
  LATENCY_REGRESSED:   { label: 'Slower',              icon: AlertTriangle, tone: 'text-warning bg-warning/10 border-warning/30' },
  IMPROVED:            { label: 'Improved',            icon: TrendingUp,    tone: 'text-success bg-success/10 border-success/30' },
  UNCHANGED:           { label: 'Unchanged',           icon: Minus,         tone: 'text-text-muted bg-elevated  border-border' },
};

export const CompareRunsModal = ({ open, onClose, baseRun, compareRun }: Props) => {
  const enabled = open && !!baseRun?.runId && !!compareRun?.runId;
  const q = useQuery({
    queryKey: ['functionalTest', 'diff', baseRun?.runId, compareRun?.runId],
    queryFn: () => diffRuns(baseRun!.runId, compareRun!.runId),
    enabled,
  });

  const diff = q.data;
  const allSteps = diff?.steps ?? [];
  const changedSteps = allSteps.filter((s) => s.kind !== 'UNCHANGED');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compare functional runs"
      icon={GitCompareArrows}
      size="xl"
      testId="compare-runs-modal"
    >
      {!baseRun || !compareRun ? (
        <p className="text-xs text-text-muted">Pick two runs to compare.</p>
      ) : (
        <div className="space-y-4">
          {/* Headline runs */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-probestack-bg/40 p-3 text-xs">
            <RunPill label="Base" run={baseRun} />
            <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
            <RunPill label="Compare" run={compareRun} />
          </div>

          {q.isLoading && (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          )}
          {q.isError && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" data-testid="compare-runs-error">
              {(q.error as any)?.message ?? 'Failed to load diff'}
            </div>
          )}

          {diff && (
            <>
              {/* Summary tiles */}
              <div className="grid gap-3 sm:grid-cols-4">
                <SummaryTile label="Total steps"  value={allSteps.length} testId="diff-total" />
                <SummaryTile label="Changed"      value={diff.changed}   tone="warning" testId="diff-changed" />
                <SummaryTile label="Regressed"    value={diff.regressed} tone="danger"  testId="diff-regressed" />
                <SummaryTile label="Improved"     value={diff.improved}  tone="success" testId="diff-improved" />
              </div>

              {/* Steps table */}
              <section className="overflow-hidden rounded-xl border border-border" data-testid="diff-table-section">
                <header className="flex items-center justify-between border-b border-border bg-elevated/40 px-3 py-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold tracking-tight">
                    <Activity className="h-3.5 w-3.5 text-primary" /> Step diff
                    <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                      {changedSteps.length} changed · {allSteps.length} total
                    </span>
                  </h3>
                </header>

                {allSteps.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-text-muted" data-testid="diff-empty">
                    No step-level differences detected. Both runs produced identical step outcomes.
                  </p>
                ) : (
                  <div className="max-h-[55vh] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10 bg-elevated/60 text-[10px] font-semibold uppercase tracking-wider text-text-muted backdrop-blur">
                        <tr>
                          <th className="px-3 py-2 text-left">Step</th>
                          <th className="px-3 py-2 text-left">Base</th>
                          <th className="px-3 py-2 text-left">Compare</th>
                          <th className="px-3 py-2 text-right">Δ Latency</th>
                          <th className="px-3 py-2 text-right">Kind</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...allSteps].sort((a, b) => kindRank(a.kind) - kindRank(b.kind)).map((s, i) => (
                          <DiffRow key={`${s.sourceId ?? s.name}-${i}`} step={s} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

const kindRank = (k: string) =>
  k === 'REGRESSED' ? 0 : k === 'LATENCY_REGRESSED' ? 1 : k === 'IMPROVED' ? 2 : 3;

const RunPill = ({ label, run }: { label: string; run: Run }) => (
  <div className="min-w-0 flex-1">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
    <div className="mt-0.5 flex items-center gap-2">
      <span className="truncate text-xs font-semibold tracking-tight" data-testid={`compare-pill-${label.toLowerCase()}`}>
        {run.name || run.runId.slice(0, 8)}
      </span>
      <span className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        run.status === 'SUCCESS' ? 'border-success/30 bg-success/10 text-success' :
        run.status === 'FAILED'  ? 'border-danger/30 bg-danger/10 text-danger' :
        'border-border bg-elevated text-text-muted',
      )}>
        {run.status}
      </span>
    </div>
    <div className="mt-0.5 font-mono text-[10px] text-text-muted">
      {(run.passedSteps ?? 0)}/{(run.totalSteps ?? 0)} passed
      {run.totalDurationMs != null && <> · {run.totalDurationMs}ms</>}
    </div>
  </div>
);

const SummaryTile = ({ label, value, tone = 'default', testId }: {
  label: string; value: number; tone?: 'default' | 'warning' | 'danger' | 'success'; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary',
    warning: 'text-warning',
    danger:  'text-danger',
    success: 'text-success',
  };
  return (
    <div data-testid={testId} className="rounded-lg border border-border bg-surface/40 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className={cn('text-lg font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};

const DiffRow = ({ step }: { step: StepDiff }) => {
  const meta = KIND_META[step.kind] ?? KIND_META.UNCHANGED;
  const Icon = meta.icon;
  const baseMs = step.baseTotalMs ?? 0;
  const cmpMs  = step.compareTotalMs ?? 0;
  const delta  = cmpMs - baseMs;
  return (
    <tr data-testid={`diff-row-${step.kind.toLowerCase()}`} className="border-t border-border/40 hover:bg-hover/40">
      <td className="px-3 py-2">
        <div className="font-medium">{step.name}</div>
        {step.sourceId && <div className="font-mono text-[10px] text-text-muted">{step.sourceId.slice(0, 8)}</div>}
      </td>
      <td className="px-3 py-2 font-mono text-[10px]">
        <Cell status={step.baseStatus} statusCode={step.baseStatusCode} ms={step.baseTotalMs} />
      </td>
      <td className="px-3 py-2 font-mono text-[10px]">
        <Cell status={step.compareStatus} statusCode={step.compareStatusCode} ms={step.compareTotalMs} />
      </td>
      <td className={cn(
        'px-3 py-2 text-right font-mono text-[10px]',
        delta > 0 ? 'text-warning' : delta < 0 ? 'text-success' : 'text-text-muted',
      )}>
        {delta > 0 ? `+${delta}ms` : delta < 0 ? `${delta}ms` : '0'}
      </td>
      <td className="px-3 py-2 text-right">
        <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider', meta.tone)}>
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
      </td>
    </tr>
  );
};

const Cell = ({ status, statusCode, ms }: { status?: string; statusCode?: number | null; ms?: number | null }) => (
  <div className="flex items-center gap-2">
    <span className={cn(
      'rounded border px-1.5 py-0.5 text-[9px]',
      status === 'PASSED' || status === 'SUCCESS' ? 'border-success/30 bg-success/10 text-success' :
      status === 'FAILED' ? 'border-danger/30 bg-danger/10 text-danger' :
      'border-border bg-elevated text-text-muted',
    )}>
      {status ?? '—'}
    </span>
    {statusCode != null && <span className="text-text-muted">{statusCode}</span>}
    <span className="text-text-muted">{ms != null ? `${ms}ms` : '—'}</span>
  </div>
);
