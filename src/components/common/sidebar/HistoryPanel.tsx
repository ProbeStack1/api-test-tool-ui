/**
 * Sidebar — History panel.
 *
 * Live, kind-filterable list of every Send the user has fired. Click an
 * entry to load its full snapshot in the main pane (the request builder
 * detects `primaryTab='history'` + `selectedId` and swaps to a read-only
 * preview with a Try button).
 *
 * Design notes (per user spec):
 *   • Dropdown across the top picks the kind (request / mock / mcp …).
 *   • Search box filters by URL / name / method.
 *   • List is grouped by date (Today / Yesterday / dd-MMM).
 *   • An entry is selectable — selection drives the main pane.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, History as HistoryIcon, Filter } from 'lucide-react';
import { SidebarShell } from './SidebarShell';
import { useRunHistoryStore, type HistoryKind } from '@/stores/runHistory.store';
import { cn } from '@/utils/cn';

const KIND_OPTIONS: { value: HistoryKind | 'all'; label: string }[] = [
  { value: 'all',        label: 'All kinds' },
  { value: 'request',    label: 'Request' },
  { value: 'mock',       label: 'Mock' },
  { value: 'mcp',        label: 'MCP' },
  { value: 'loadtest',   label: 'Load test' },
  { value: 'functional', label: 'Functional' },
  { value: 'monitors',   label: 'Monitors' },
];

export const HistoryPanel = () => {
  const entries    = useRunHistoryStore((s) => s.entries);
  const selectedId = useRunHistoryStore((s) => s.selectedId);
  const select     = useRunHistoryStore((s) => s.select);
  const remove     = useRunHistoryStore((s) => s.remove);
  const clearAll   = useRunHistoryStore((s) => s.clear);
  const nav        = useNavigate();

  const [kind, setKind] = useState<HistoryKind | 'all'>('all');
  const [q, setQ]       = useState('');

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (kind !== 'all' && e.kind !== kind) return false;
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        e.snapshot.url?.toLowerCase().includes(needle) ||
        e.snapshot.name?.toLowerCase().includes(needle) ||
        e.snapshot.method?.toLowerCase().includes(needle)
      );
    });
  }, [entries, kind, q]);

  // Group by day for headers.
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const day = new Date(e.at).toDateString();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  const onPick = (id: string) => {
    select(id);
    // The main area listens to `selectedId` + `primaryTab='history'`,
    // and the route is the same as collections so the user lands in the
    // request-builder workspace.
    nav('/projects/collections');
  };

  return (
    <SidebarShell
      title="History"
      testId="sidebar-history"
      icon={HistoryIcon}
      search={
        <div className="space-y-2">
          <select
            data-testid="sidebar-history-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as HistoryKind | 'all')}
            className="h-7 w-full rounded-md border border-border bg-probestack-bg px-2 text-[11px]"
          >
            {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
              <input
                data-testid="sidebar-history-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter…"
                className="h-7 w-full rounded-md border border-border bg-probestack-bg pl-6 pr-2 text-[11px]"
              />
            </div>
            <button
              data-testid="sidebar-history-clear"
              disabled={entries.length === 0}
              onClick={clearAll}
              title="Clear all history"
              className="rounded p-1 text-text-muted hover:bg-hover hover:text-danger disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      }
    >
      {filtered.length === 0
        ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-[11px] text-text-muted" data-testid="sidebar-history-empty">
            <Filter className="mb-2 h-5 w-5 opacity-60" />
            {entries.length === 0
              ? <>No runs captured yet. Hit&nbsp;<strong>Send</strong>&nbsp;in the builder.</>
              : <>Nothing matches the current filter.</>}
          </div>
        )
        : groups.map(([day, rows]) => (
          <section key={day} data-testid={`sidebar-history-group-${day}`}>
            <h3 className="sticky top-0 z-10 bg-surface/95 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-text-muted backdrop-blur">
              {formatDay(day)}
            </h3>
            <ul>
              {rows.map((e) => {
                const status = e.result?.response?.statusCode ?? e.result?.network?.statusCode ?? 0;
                const sel = e.id === selectedId;
                return (
                  <li key={e.id}>
                    <button
                      data-testid={`sidebar-history-item-${e.id}`}
                      onClick={() => onPick(e.id)}
                      className={cn(
                        'group flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors',
                        sel ? 'bg-primary/10' : 'hover:bg-hover',
                      )}
                    >
                      <span className={cn(
                        'inline-flex h-4 min-w-[2.25rem] shrink-0 items-center justify-center rounded font-mono text-[9px] font-bold tracking-wider',
                        methodColour(e.snapshot.method),
                        'bg-elevated/60',
                      )}>{e.snapshot.method?.toUpperCase()}</span>
                      <span className="min-w-0 flex-1 truncate text-text-primary">
                        {e.snapshot.name || e.snapshot.url}
                      </span>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusTone(status))} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </SidebarShell>
  );
};

/* ─── helpers ─── */
function formatDay(s: string): string {
  const d = new Date(s);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
function methodColour(m: string): string {
  const c: Record<string, string> = {
    GET: 'text-success', POST: 'text-blue-400', PUT: 'text-warning', PATCH: 'text-pink-400',
    DELETE: 'text-danger', HEAD: 'text-cyan-400', OPTIONS: 'text-purple-400',
  };
  return c[m?.toUpperCase()] ?? 'text-text-muted';
}
function statusTone(code: number): string {
  if (!code)        return 'bg-text-muted';
  if (code < 300)   return 'bg-success';
  if (code < 400)   return 'bg-info';
  if (code < 500)   return 'bg-warning';
  return 'bg-danger';
}
