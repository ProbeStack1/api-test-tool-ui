/**
 * CollectionRunDrawer — Postman-style collection runner, simplified.
 *
 * Why "simplified": ForgeFuzz already has dedicated Functional and Load
 * test pages with rich assertion + perf features. The collection
 * runner here is intentionally lightweight — its job is *"play these
 * requests one-by-one in user-controlled order and show me what
 * happened"*. Heavier flows live elsewhere.
 *
 * Flow:
 *   1. Open via right-click → Run, or hamburger Run.
 *   2. We flatten the collection into an ordered request list, plus
 *      per-row checkbox to skip + DnD reorder handle.
 *   3. Iterations + per-step delay inputs.
 *   4. "Run now" kicks off sequential `POST /requests/{id}/execute`
 *      calls. Each call's row updates pending → running → pass/fail
 *      with the status code + latency.
 *   5. Final summary card (X/Y passed, total time, fastest, slowest).
 *
 * Persistence: each `/execute` already writes to `request_runs` so the
 * server-side history + analytics get all entries automatically.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Play, X, GripVertical, CheckCircle2, AlertTriangle, Loader2, RotateCw,
  Clock, ArrowDownToLine, Pause,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { executeRequest, listRequests } from '@/services/request.service';
import { listFolders } from '@/services/collection.service';
import { cn } from '@/utils/cn';

type RowStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
interface RunRow {
  id: string;
  name: string;
  method: string;
  url: string;
  enabled: boolean;
  status: RowStatus;
  code?: number;
  ms?: number;
  err?: string;
}

const STATUS_CLR: Record<RowStatus, string> = {
  pending: 'text-text-muted',
  running: 'text-primary',
  passed:  'text-success',
  failed:  'text-danger',
  skipped: 'text-text-muted/50',
};

export const CollectionRunDrawer = ({
  collectionId, collectionName, onClose,
}: { collectionId: string; collectionName: string; onClose: () => void }) => {
  const [iterations, setIterations] = useState(1);
  const [delayMs, setDelayMs]       = useState(0);
  const [stopOnFail, setStopOnFail] = useState(false);
  const [rows, setRows]             = useState<RunRow[]>([]);
  const [running, setRunning]       = useState(false);
  const cancelRef                   = useRef(false);
  const sseRef                      = useRef<EventSource | null>(null);
  const [backendRunId, setBackendRunId] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  /* Flatten requests recursively (folders → folders → requests). */
  const tree = useQuery({
    queryKey: ['collection-tree-runner', collectionId],
    queryFn: () => flattenCollection(collectionId),
  });
  useEffect(() => {
    if (tree.data) {
      setRows(tree.data.map((r) => ({
        id: r.id, name: r.name, method: r.method, url: r.url,
        enabled: true, status: 'pending' as RowStatus,
      })));
    }
  }, [tree.data]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setRows((cur) => {
        const a = cur.findIndex((r) => r.id === active.id);
        const b = cur.findIndex((r) => r.id === over.id);
        return arrayMove(cur, a, b);
      });
    }
  };
  const toggleRow = (id: string) => setRows((cur) =>
    cur.map((r) => r.id === id ? { ...r, enabled: !r.enabled, status: !r.enabled ? 'pending' : 'skipped' } : r));

  const summary = useMemo(() => {
    const passed = rows.filter((r) => r.status === 'passed').length;
    const failed = rows.filter((r) => r.status === 'failed').length;
    const totalMs = rows.reduce((acc, r) => acc + (r.ms ?? 0), 0);
    const validRows = rows.filter((r) => r.ms != null);
    const fastest = validRows.length ? Math.min(...validRows.map((r) => r.ms!)) : 0;
    const slowest = validRows.length ? Math.max(...validRows.map((r) => r.ms!)) : 0;
    return { passed, failed, totalMs, fastest, slowest, total: rows.filter((r) => r.enabled).length };
  }, [rows]);

  const run = async () => {
    setRunning(true);
    cancelRef.current = false;
    setCompletedAt(null);
    const enabled = rows.filter((r) => r.enabled);
    setRows((cur) => cur.map((r) => ({
      ...r, status: r.enabled ? 'pending' : 'skipped',
      ms: undefined, code: undefined, err: undefined,
    })));

    /* Kick off the backend-orchestrated run + SSE stream so the run
     * survives tab navigations and shows up in collection-run history. */
    let runId: string | null = null;
    try {
      const root = (import.meta as any).env.VITE_REQUEST_SVC_URL || '';
      const startRes = await fetch(`${root}/api/v1/requests/collections/${collectionId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId:    null,
          collectionId,
          collectionName,
          requestIds:     enabled.map((r) => r.id),
          iterations,
          delayMs,
          stopOnFail,
        }),
      });
      if (!startRes.ok) throw new Error(`HTTP ${startRes.status}`);
      const env = await startRes.json();
      runId = (env?.data ?? env)?.id;
      setBackendRunId(runId);
    } catch (err: any) {
      toast.error(`Failed to start backend run — falling back to client mode (${err?.message})`);
      // Client-side fallback (legacy path).
      await runClientSide(enabled);
      setRunning(false);
      setCompletedAt(Date.now());
      return;
    }
    if (!runId) { setRunning(false); return; }

    /* Subscribe to SSE — every "snapshot" event has the full updated
     * CollectionRun. We map step status → row state. */
    const root = (import.meta as any).env.VITE_REQUEST_SVC_URL || '';
    const es = new EventSource(`${root}/api/v1/requests/collection-runs/${runId}/stream`);
    sseRef.current = es;
    es.addEventListener('snapshot', (ev: MessageEvent) => {
      try {
        const cr = JSON.parse(ev.data);
        setRows((cur) => {
          // Only the first iteration's worth of steps maps to UI rows.
          const next = [...cur];
          (cr.steps ?? []).forEach((s: any) => {
            if (s.iteration !== 0) return;
            const idx = next.findIndex((r) => r.id === s.request_id);
            if (idx < 0) return;
            next[idx] = {
              ...next[idx],
              status:
                s.status === 'RUNNING' ? 'running' :
                s.status === 'PASSED'  ? 'passed'  :
                s.status === 'FAILED'  ? 'failed'  :
                s.status === 'SKIPPED' ? 'skipped' : 'pending',
              code: s.status_code,
              ms:   s.latency_ms,
              err:  s.error,
            };
          });
          return next;
        });
        if (cr.status === 'PASSED' || cr.status === 'FAILED' || cr.status === 'CANCELLED') {
          setRunning(false);
          setCompletedAt(Date.now());
          toast.success(`Collection run ${cr.status.toLowerCase()} · ${cr.passed_count}/${cr.passed_count + cr.failed_count} passed`);
          es.close();
        }
      } catch (e) {
        console.warn('SSE parse error', e);
      }
    });
    es.onerror = () => {
      if (!running) return;
      // Don't toast on normal stream completion (close() fires onerror in some browsers).
    };
  };

  const runClientSide = async (enabled: RunRow[]) => {
    for (let iter = 0; iter < iterations; iter++) {
      for (const row of enabled) {
        if (cancelRef.current) break;
        setRows((cur) => cur.map((r) => r.id === row.id ? { ...r, status: 'running' } : r));
        const t0 = performance.now();
        try {
          const res = await executeRequest(row.id);
          const code = res.response?.statusCode ?? 0;
          const ok = code >= 200 && code < 400;
          const ms = Math.round(performance.now() - t0);
          setRows((cur) => cur.map((r) => r.id === row.id
            ? { ...r, status: ok ? 'passed' : 'failed', code, ms } : r));
          if (!ok && stopOnFail) { cancelRef.current = true; break; }
        } catch (err: any) {
          const ms = Math.round(performance.now() - t0);
          setRows((cur) => cur.map((r) => r.id === row.id
            ? { ...r, status: 'failed', err: err?.message ?? 'execution error', ms } : r));
          if (stopOnFail) { cancelRef.current = true; break; }
        }
        if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
      }
      if (cancelRef.current) break;
    }
  };

  const cancel = () => {
    cancelRef.current = true;
    if (backendRunId) {
      const root = (import.meta as any).env.VITE_REQUEST_SVC_URL || '';
      fetch(`${root}/api/v1/requests/collection-runs/${backendRunId}/cancel`, { method: 'POST' })
        .catch(() => { /* swallow */ });
    }
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    toast.message('Run cancelled');
  };

  /* Tidy SSE on unmount. */
  useEffect(() => () => { if (sseRef.current) sseRef.current.close(); }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} data-testid="collection-run-backdrop" />
      <aside
        data-testid="collection-run-drawer"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col border-l border-border bg-elevated shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface/60 px-4 py-3">
          <Play className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">Run · {collectionName}</h3>
            <p className="truncate text-[10px] text-text-muted">
              {rows.filter((r) => r.enabled).length} of {rows.length} request{rows.length === 1 ? '' : 's'} enabled
              {iterations > 1 && ` · ${iterations} iterations`}
              {delayMs > 0 && ` · ${delayMs}ms delay`}
            </p>
          </div>
          {running ? (
            <Button variant="outline" data-testid="collection-run-cancel" onClick={cancel}>
              <Pause className="h-3.5 w-3.5" /> Cancel
            </Button>
          ) : (
            <Button data-testid="collection-run-start" onClick={run} disabled={rows.filter((r) => r.enabled).length === 0}>
              <Play className="h-3.5 w-3.5" /> Run now
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="collection-run-close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Config row */}
        <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-border bg-elevated/15 px-4 py-2 text-[11px]">
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Iterations</span>
            <input
              type="number"
              min={1}
              max={100}
              value={iterations}
              onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value || '1', 10)))}
              data-testid="collection-run-iterations"
              className="h-6 rounded border border-border bg-probestack-bg px-2 font-mono"
              disabled={running}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Delay (ms)</span>
            <input
              type="number"
              min={0}
              max={10_000}
              value={delayMs}
              onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value || '0', 10)))}
              data-testid="collection-run-delay"
              className="h-6 rounded border border-border bg-probestack-bg px-2 font-mono"
              disabled={running}
            />
          </label>
          <label className="flex items-end gap-1.5 pb-0.5">
            <input
              type="checkbox"
              checked={stopOnFail}
              onChange={(e) => setStopOnFail(e.target.checked)}
              data-testid="collection-run-stop-on-fail"
              className="h-3 w-3"
              disabled={running}
            />
            <span>Stop on first failure</span>
          </label>
        </div>

        {/* Live rows */}
        <div className="min-h-0 flex-1 overflow-auto p-3" data-testid="collection-run-rows">
          {tree.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface/30 p-8 text-center text-xs text-text-muted">
              No requests in this collection.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1">
                  {rows.map((r, idx) => (
                    <Row key={r.id} row={r} idx={idx} onToggle={() => toggleRow(r.id)} disabled={running} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Summary */}
        {completedAt && (
          <div className="grid shrink-0 grid-cols-5 gap-2 border-t border-border bg-elevated/15 px-4 py-3 text-[11px]" data-testid="collection-run-summary">
            <Tile label="Passed"  value={summary.passed} tone={summary.passed === summary.total ? 'success' : 'default'} />
            <Tile label="Failed"  value={summary.failed} tone={summary.failed > 0 ? 'danger' : 'default'} />
            <Tile label="Total"   value={summary.total} />
            <Tile label="Fastest" value={`${summary.fastest}ms`} />
            <Tile label="Slowest" value={`${summary.slowest}ms`} />
          </div>
        )}
      </aside>
    </>
  );
};

const Row = ({ row, idx, onToggle, disabled }: { row: RunRow; idx: number; onToggle: () => void; disabled: boolean }) => {
  const sortable = useSortable({ id: row.id, disabled });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  const statusIcon = {
    pending: <Clock     className="h-3.5 w-3.5" />,
    running: <Loader2   className="h-3.5 w-3.5 animate-spin" />,
    passed:  <CheckCircle2 className="h-3.5 w-3.5" />,
    failed:  <AlertTriangle className="h-3.5 w-3.5" />,
    skipped: <ArrowDownToLine className="h-3.5 w-3.5" />,
  }[row.status];
  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      data-testid={`collection-run-row-${row.id}`}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border/60 bg-surface/40 px-2 py-1.5 text-[11px] transition-colors',
        row.status === 'running' && 'border-primary/40 bg-primary/5',
        row.status === 'passed' && 'border-success/30',
        row.status === 'failed' && 'border-danger/30',
        !row.enabled && 'opacity-50',
      )}
    >
      <span
        {...sortable.attributes}
        {...sortable.listeners}
        className="cursor-grab text-text-muted active:cursor-grabbing"
        data-testid={`collection-run-grip-${row.id}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <span className="w-6 shrink-0 text-center font-mono text-[10px] text-text-muted">{idx + 1}.</span>
      <input
        type="checkbox"
        checked={row.enabled}
        onChange={onToggle}
        className="h-3 w-3"
        data-testid={`collection-run-enable-${row.id}`}
        disabled={disabled}
      />
      <span className={cn('shrink-0 rounded bg-elevated/60 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider', methodColor(row.method))}>
        {row.method.toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-text-primary">{row.name}</div>
        <div className="truncate font-mono text-[10px] text-text-muted">{row.url || '—'}</div>
      </div>
      {row.ms != null && <span className="font-mono text-[10px] text-text-muted">{row.ms}ms</span>}
      {row.code != null && (
        <span className={cn('rounded px-1 py-px font-mono text-[9px] font-bold',
          row.code < 300 ? 'bg-success-muted text-success'
          : row.code < 400 ? 'bg-info/10 text-info'
          : row.code < 500 ? 'bg-warning/10 text-warning'
          : 'bg-red-500/10 text-red-500')}>{row.code}</span>
      )}
      <span className={STATUS_CLR[row.status]}>{statusIcon}</span>
    </li>
  );
};

const Tile = ({ label, value, tone = 'default' }: { label: string; value: any; tone?: 'default' | 'success' | 'danger' }) => {
  const tones = { default: 'text-text-primary', success: 'text-success', danger: 'text-danger' };
  return (
    <div className="rounded-md border border-border/60 bg-surface/40 p-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className={cn('text-sm font-bold', tones[tone])}>{value}</div>
    </div>
  );
};

const methodColor = (m: string) => {
  const map: Record<string, string> = {
    GET: 'text-emerald-400', POST: 'text-amber-400', PUT: 'text-sky-400',
    PATCH: 'text-purple-400', DELETE: 'text-red-400', HEAD: 'text-pink-400',
  };
  return map[m?.toUpperCase()] ?? 'text-text-secondary';
};

/** Walk the entire collection tree depth-first and gather every request node.
 *  Uses the same APIs the sidebar uses (`listFolders` + `listRequests`). */
const flattenCollection = async (collectionId: string): Promise<Array<{ id: string; name: string; method: string; url: string }>> => {
  const out: Array<{ id: string; name: string; method: string; url: string }> = [];
  // Root requests (folderId = null).
  const rootReqs = await listRequests(collectionId, null);
  rootReqs.forEach((r: any) => out.push({
    id: r.id,
    name: r.name ?? '(untitled)',
    method: r.method ?? 'GET',
    url: r.url?.raw ?? '',
  }));
  // Walk all folders (Java API returns the whole tree flat).
  const folders = await listFolders(collectionId);
  for (const f of folders as any[]) {
    const reqs = await listRequests(collectionId, f.id);
    reqs.forEach((r: any) => out.push({
      id: r.id,
      name: `${f.name} · ${r.name ?? '(untitled)'}`,
      method: r.method ?? 'GET',
      url: r.url?.raw ?? '',
    }));
  }
  return out;
};
