/**
 * RunsTab — the *default* landing tab for the Functional section.
 *
 * Shape:
 *   ┌─ Configure & Run (or Live Stream when a run is in flight) ─┐
 *   │  • InlineStartRunForm with collapsible Advanced panel       │
 *   │  • OR LiveFunctionalRunPanel — animated until terminal      │
 *   └────────────────────────────────────────────────────────────┘
 *   ┌─ Recent runs (paginated, filterable) ───────────────────────┐
 *   │  Click a row → opens RunDetailPage in-place                 │
 *   └────────────────────────────────────────────────────────────┘
 *
 * The active run id is held in `useTestingStore.liveFunctionalRunId`
 * so that navigating away and coming back keeps the live stream view
 * in place (background polling never stops thanks to the global runs
 * tracker).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ListTree, Pause, Play, Ban, GitCompareArrows } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  listRuns, cancelRun, pauseRun, resumeRun, type Run,
} from '@/services/functionalTest.service';
import { RunStatusBadge, formatDuration } from '../shared/RunBadges';
import { formatRelative } from '../../shared/Badges';
import { useTestingStore } from '@/stores/testing.store';
import { CompareRunsModal } from '../CompareRunsModal';
import { cn } from '@/utils/cn';

interface Props { workspaceId: string }

const STATUSES = ['ALL', 'QUEUED', 'RUNNING', 'PAUSED', 'SUCCESS', 'FAILED', 'ERROR', 'CANCELLED'] as const;

export const RunsTab = ({ workspaceId }: Props) => {
  return (
    <div className="h-full overflow-auto" data-testid="functional-runs-tab">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <RecentRunsList workspaceId={workspaceId} />
      </div>
    </div>
  );
};

const RecentRunsList = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const openRun = useTestingStore((s) => s.openRun);
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Run[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const q = useQuery({
    queryKey: ['functionalTest', 'runs', workspaceId, status, page],
    queryFn: () => listRuns(workspaceId, {
      status: status === 'ALL' ? undefined : status,
      page, size: 12,
    }),
    refetchInterval: 4000,
  });

  const cancelMut = useMutation({ mutationFn: (id: string) => cancelRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['functionalTest'] }) });
  const pauseMut  = useMutation({ mutationFn: (id: string) => pauseRun(id),  onSuccess: () => qc.invalidateQueries({ queryKey: ['functionalTest'] }) });
  const resumeMut = useMutation({ mutationFn: (id: string) => resumeRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['functionalTest'] }) });

  const runs = q.data?.content ?? [];
  const totalPages = q.data?.totalPages ?? 0;
  const totalElements = q.data?.totalElements ?? 0;

  const toggleSelect = (run: Run) => {
    setSelected((prev) => {
      if (prev.some((r) => r.runId === run.runId)) return prev.filter((r) => r.runId !== run.runId);
      // FIFO max 2
      return prev.length < 2 ? [...prev, run] : [prev[1], run];
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface/40 shadow-sm" data-testid="functional-recent-section">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-elevated/30 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ListTree className="h-4 w-4 text-primary" />
          Recent runs
          <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary" data-testid="functional-runs-total">
            {totalElements}
          </span>
        </h2>
        {selected.length > 0 && (
          <span className="text-[10px] text-text-muted" data-testid="compare-selected-count">
            {selected.length}/2 selected for compare
          </span>
        )}
        <Button
          size="sm"
          variant={selected.length === 2 ? 'primary' : 'outline'}
          disabled={selected.length !== 2}
          onClick={() => setCompareOpen(true)}
          data-testid="compare-runs-btn"
          className="ml-auto"
        >
          <GitCompareArrows className="h-3.5 w-3.5" /> Compare {selected.length === 2 && '2 runs'}
        </Button>
        <select
          data-testid="runs-status-filter"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="h-8 rounded-md border border-border bg-probestack-bg px-2 text-xs"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>)}
        </select>
        <Button size="sm" variant="ghost" onClick={() => q.refetch()} data-testid="runs-refresh">
          <RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} />
        </Button>
      </header>

      {q.isLoading ? (
        <div className="space-y-1 p-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center" data-testid="runs-empty">
          <ListTree className="mb-2 h-8 w-8 text-text-muted" />
          <p className="text-sm font-medium">No runs match this filter</p>
          <p className="mt-1 text-xs text-text-muted">Switch to the <strong>Runner</strong> tab and click <strong>Queue functional run</strong>.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-elevated/40 text-text-muted">
              <tr>
                <Th><span className="sr-only">Compare</span></Th>
                <Th>Name</Th><Th>Status</Th><Th>Source</Th>
                <Th>Steps</Th><Th>Duration</Th><Th>Queued</Th><Th>Triggered by</Th><Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => <Row key={r.runId} run={r}
                checked={selected.some((s) => s.runId === r.runId)}
                onToggleCheck={() => toggleSelect(r)}
                onOpen={() => openRun(r.runId)}
                onCancel={() => cancelMut.mutate(r.runId)}
                onPause={() =>  pauseMut.mutate(r.runId)}
                onResume={() => resumeMut.mutate(r.runId)} />)}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 text-xs">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} data-testid="runs-prev">Prev</Button>
          <span className="text-text-muted">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} data-testid="runs-next">Next</Button>
        </div>
      )}

      <CompareRunsModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        baseRun={selected[0] ?? null}
        compareRun={selected[1] ?? null}
      />
    </section>
  );
};

const Th = ({ children, align }: { children: React.ReactNode; align?: 'right' }) => (
  <th className={cn('px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider', align === 'right' && 'text-right')}>{children}</th>
);

const Row = ({ run, checked, onToggleCheck, onOpen, onCancel, onPause, onResume }: {
  run: Run; checked: boolean; onToggleCheck: () => void;
  onOpen: () => void; onCancel: () => void; onPause: () => void; onResume: () => void;
}) => {
  const isRunning = run.status === 'RUNNING';
  const isPaused  = run.status === 'PAUSED';
  return (
    <tr data-testid={`runs-row-${run.runId}`} className={cn(
      'border-t border-border/40 transition-colors hover:bg-hover/40',
      checked && 'bg-primary/[0.06]',
    )}>
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleCheck}
          data-testid={`runs-compare-check-${run.runId}`}
          className="h-3.5 w-3.5 cursor-pointer accent-primary"
          aria-label={`Select ${run.name || run.runId} for compare`}
        />
      </td>
      <td className="px-3 py-2.5">
        <button onClick={onOpen} className="font-medium hover:text-primary">
          {run.name || run.runId.slice(0, 8)}
        </button>
      </td>
      <td className="px-3 py-2.5"><RunStatusBadge status={run.status} /></td>
      <td className="px-3 py-2.5 text-text-secondary">{run.sourceType}</td>
      <td className="px-3 py-2.5 font-mono text-[10px]">
        {(run.passedSteps ?? 0)}/{(run.totalSteps ?? 0)}
        {(run.failedSteps ?? 0) > 0 && <span className="ml-1 text-danger">· {run.failedSteps} failed</span>}
      </td>
      <td className="px-3 py-2.5 font-mono text-[10px] text-text-muted">{formatDuration(run.totalDurationMs ?? null)}</td>
      <td className="px-3 py-2.5 text-[10px] text-text-muted">{formatRelative(typeof run.queuedAt === 'string' ? run.queuedAt : '')}</td>
      <td className="px-3 py-2.5 text-[10px] text-text-muted">{run.triggeredByEmail ?? '—'}</td>
      <td className="px-3 py-2.5 text-right">
        {isRunning && (
          <Button size="sm" variant="ghost" onClick={onPause} aria-label="Pause" data-testid={`runs-pause-${run.runId}`}><Pause className="h-3.5 w-3.5" /></Button>
        )}
        {isPaused && (
          <Button size="sm" variant="ghost" onClick={onResume} aria-label="Resume" data-testid={`runs-resume-${run.runId}`}><Play className="h-3.5 w-3.5" /></Button>
        )}
        {(isRunning || isPaused) && (
          <Button size="sm" variant="ghost" onClick={onCancel} aria-label="Cancel" data-testid={`runs-cancel-${run.runId}`}><Ban className="h-3.5 w-3.5" /></Button>
        )}
      </td>
    </tr>
  );
};
