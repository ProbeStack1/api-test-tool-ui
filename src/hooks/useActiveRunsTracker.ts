/**
 * Hook: keeps every tracked run alive in the background.
 *
 *   • Polls `getRun(id)` for each runId in the tracker every 3 s.
 *   • When a run transitions into a terminal status, fires a sonner
 *     toast with a "View" action that opens the Testing tab and
 *     deep-views that run.
 *   • Only mounts once (in AppShell) — so the polling outlives any
 *     individual page lifecycle.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getRun as getFunctionalRun } from '@/services/functionalTest.service';
import { getRun as getLoadRun } from '@/services/loadTest.service';
import { useRunsTracker, TERMINAL_STATUSES, type TrackedRun } from '@/stores/runsTracker.store';
import { useTestingStore } from '@/stores/testing.store';

const INTERVAL_MS = 3000;

export const useActiveRunsTracker = () => {
  const runs = useRunsTracker((s) => s.runs);
  const updateStatus = useRunsTracker((s) => s.updateStatus);
  const untrack = useRunsTracker((s) => s.untrack);
  const openRun = useTestingStore((s) => s.openRun);
  const openLoadRun = useTestingStore((s) => s.openLoadRun);
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    const ids = Object.keys(runs);
    if (ids.length === 0) return;

    let cancelled = false;
    const tick = async () => {
      for (const id of ids) {
        const tracked = runs[id];
        if (!tracked) continue;
        try {
          const r = tracked.kind === 'load'
            ? await getLoadRun(id)
            : await getFunctionalRun(id);
          if (cancelled) return;

          // Update React-Query cache so any open view re-renders.
          if (tracked.kind === 'load') {
            qc.setQueryData(['loadTest', 'run', id], r);
          } else {
            qc.setQueryData(['functionalTest', 'run', id], r);
          }

          if (r.status !== tracked.lastStatus) updateStatus(id, r.status);

          if (TERMINAL_STATUSES.has(String(r.status))) {
            const ok = r.status === 'SUCCESS';
            const fn = ok ? toast.success : toast.error;
            fn(`${tracked.kind === 'load' ? 'Load' : 'Run'} ${ok ? 'completed' : 'finished with ' + r.status.toLowerCase()}`, {
              description: tracked.name,
              duration: 7000,
              action: {
                label: 'View',
                onClick: () => {
                  if (tracked.kind === 'functional') openRun(id);
                  else openLoadRun(id);
                  nav('/projects/testing');
                },
              },
            });
            untrack(id);
            const prefix = tracked.kind === 'load' ? 'loadTest' : 'functionalTest';
            qc.invalidateQueries({ queryKey: [prefix, 'runs'] });
            qc.invalidateQueries({ queryKey: [prefix, 'dashboard'] });
          }
        } catch {
          // Network blips — keep tracking; if the run id is genuinely
          // gone the user can dismiss via the toast or the run card.
        }
      }
    };
    tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [runs, updateStatus, untrack, openRun, openLoadRun, nav, qc]);
};

/** Convenience helpers. */
export const trackFunctionalRun = (run: { runId: string; name: string }) => {
  useRunsTracker.getState().trackRun({
    runId: run.runId, kind: 'functional', name: run.name,
    lastStatus: 'QUEUED', startedAt: Date.now(),
  } satisfies TrackedRun);
};
export const trackLoadRun = (run: { runId: string; name: string }) => {
  useRunsTracker.getState().trackRun({
    runId: run.runId, kind: 'load', name: run.name,
    lastStatus: 'QUEUED', startedAt: Date.now(),
  } satisfies TrackedRun);
};
