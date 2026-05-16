/**
 * EndpointGridTable — tabular per-endpoint breakdown for a completed
 * functional run (Task 3.1).
 *
 * Backend contract:
 *   GET /api/v1/functional-tests/runs/{runId}/endpoints
 *   → { data: EndpointStat[] }
 *
 * Use:
 *   <EndpointGridTable runId={...} />
 *
 * The component lazy-loads the data when mounted, exposes a sortable
 * header, and renders a sparkline-free table — the goal is dense
 * scanning, not pretty charts (charts live in the Live panel).
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowDownNarrowWide, ArrowUpNarrowWide, ListTree, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { serviceUrl } from '@/lib/env';
import { createHttp } from '@/lib/http';

const http = createHttp('functionalTest');

interface EndpointStat {
  method: string;
  url: string;
  calls: number;
  passed: number;
  failed: number;
  avgMs: number;
  p50: number;
  p95: number;
  p99: number;
  lastStatusCode: number;
}

type Field = keyof EndpointStat;
type Dir = 'asc' | 'desc';

interface Props {
  runId: string;
}

const METHOD_TONE: Record<string, string> = {
  GET:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  POST:   'bg-sky-500/15 text-sky-400 border-sky-500/30',
  PUT:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PATCH:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  HEAD:   'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function EndpointGridTable({ runId }: Props) {
  const [rows, setRows] = useState<EndpointStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ field: Field; dir: Dir }>({ field: 'calls', dir: 'desc' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await http.get(
          `${serviceUrl('functionalTest')}/functional-tests/runs/${runId}/endpoints`,
        );
        if (cancelled) return;
        // Backend wraps payload in ResponseEnvelope → .data.data
        const list = (r.data?.data ?? r.data ?? []) as EndpointStat[];
        setRows(Array.isArray(list) ? list : []);
        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load endpoint stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [runId]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sort.field] as any;
      const bv = b[sort.field] as any;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [rows, sort]);

  const toggleSort = (field: Field) => {
    setSort((cur) =>
      cur.field === field
        ? { field, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: field === 'method' || field === 'url' ? 'asc' : 'desc' },
    );
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-text-muted" data-testid="endpoint-grid-loading">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading endpoint stats…
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 text-xs text-text-muted" data-testid="endpoint-grid-empty">
        <ListTree className="h-5 w-5 opacity-40" />
        No HTTP steps recorded for this run.
      </div>
    );
  }

  return (
    <div className="overflow-auto" data-testid="endpoint-grid-table">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-elevated text-text-muted">
          <tr>
            <Th field="method" sort={sort} onClick={toggleSort} className="w-20">Method</Th>
            <Th field="url" sort={sort} onClick={toggleSort}>Endpoint</Th>
            <Th field="calls" sort={sort} onClick={toggleSort} numeric>Calls</Th>
            <Th field="passed" sort={sort} onClick={toggleSort} numeric>Pass</Th>
            <Th field="failed" sort={sort} onClick={toggleSort} numeric>Fail</Th>
            <Th field="avgMs" sort={sort} onClick={toggleSort} numeric>Avg ms</Th>
            <Th field="p50" sort={sort} onClick={toggleSort} numeric>p50</Th>
            <Th field="p95" sort={sort} onClick={toggleSort} numeric>p95</Th>
            <Th field="p99" sort={sort} onClick={toggleSort} numeric>p99</Th>
            <Th field="lastStatusCode" sort={sort} onClick={toggleSort} numeric>Status</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={`${r.method}::${r.url}`}
              className="border-b border-border/40 last:border-b-0 hover:bg-hover/30"
              data-testid={`endpoint-row-${r.method}-${r.url}`}
            >
              <td className="px-3 py-1.5">
                <span className={cn('rounded border px-1.5 py-0 text-[10px] font-semibold', METHOD_TONE[r.method] ?? 'border-border text-text-muted')}>
                  {r.method}
                </span>
              </td>
              <td className="truncate px-3 py-1.5 font-mono" title={r.url}>{r.url}</td>
              <td className="px-3 py-1.5 text-right">{r.calls}</td>
              <td className="px-3 py-1.5 text-right text-success">{r.passed}</td>
              <td className={cn('px-3 py-1.5 text-right', r.failed ? 'text-danger font-semibold' : 'text-text-muted')}>{r.failed}</td>
              <td className="px-3 py-1.5 text-right font-mono">{r.avgMs}</td>
              <td className="px-3 py-1.5 text-right font-mono">{r.p50}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono', r.p95 > 1000 ? 'text-amber-400' : '')}>{r.p95}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono', r.p99 > 2000 ? 'text-danger' : '')}>{r.p99}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono',
                r.lastStatusCode >= 500 ? 'text-danger'
                : r.lastStatusCode >= 400 ? 'text-amber-400'
                : r.lastStatusCode >= 300 ? 'text-sky-400'
                : 'text-success')}>{r.lastStatusCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ThProps {
  field: Field;
  sort: { field: Field; dir: Dir };
  onClick: (f: Field) => void;
  numeric?: boolean;
  className?: string;
  children: React.ReactNode;
}
function Th({ field, sort, onClick, numeric, className, children }: ThProps) {
  const active = sort.field === field;
  return (
    <th
      onClick={() => onClick(field)}
      className={cn(
        'cursor-pointer select-none px-3 py-2 text-[10px] font-semibold uppercase tracking-wider',
        numeric ? 'text-right' : 'text-left',
        active ? 'text-primary' : 'hover:text-text-secondary',
        className,
      )}
      data-testid={`endpoint-th-${field}`}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {active && (sort.dir === 'asc' ? <ArrowUpNarrowWide className="h-3 w-3" /> : <ArrowDownNarrowWide className="h-3 w-3" />)}
      </span>
    </th>
  );
}

export default EndpointGridTable;
