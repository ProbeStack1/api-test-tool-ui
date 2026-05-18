/**
 * HistoryTab — Postman/Insomnia-grade MCP call audit log.
 *
 * Layout (3 columns + slide-in drawer):
 *
 *   ┌──────────────┬─────────────────────────────────────┬──────┐
 *   │  Servers     │  Toolbar (filters, search, range)   │      │
 *   │  sidebar     ├─────────────────────────────────────┤      │
 *   │  ───         │  Stats (success rate, p95, sparkline)│ Side │
 *   │  • All       ├─────────────────────────────────────┤ drwr │
 *   │  • Server A  │  Table: Time · Server · Method ·    │ on   │
 *   │  • Server B  │           Tool · Status · Latency   │ row  │
 *   │  ─── tags    │  rows clickable → drawer            │ click│
 *   │  ─── methods │                                     │      │
 *   └──────────────┴─────────────────────────────────────┴──────┘
 *
 * Drawer (right-slide):
 *   • Tabs: Request | Response | Headers/Meta | Notes & tags
 *   • Replay button, Copy, Download
 *   • Compare-with-previous (when there is one)
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  History, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Search,
  Filter, Calendar, Download, Server, Tag as TagIcon, X, Play, Copy,
  ChevronRight, BarChart3, Globe2, Activity, MessageSquare, FileJson,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  listHistoryPage, getHistoryEntry, historyStats, replayHistory,
  annotateHistory, historyExportUrl, deleteHistoryEntry, clearHistory,
  listServers,
} from '@/services/mcp.service';
import type {
  McpHistoryEntry as McpHistoryEntryDto, McpHistoryFilter, McpHistoryStatsDto,
} from '@/services/mcp.service';
import { fmtDateTime, fmtRelative, getGlobalTimezone } from '@/lib/timezone';
import { useGlobalTimezone } from '@/hooks/useGlobalTimezone';
import { cn } from '@/utils/cn';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const METHODS = [
  'tools/list', 'tools/call', 'resources/list', 'resources/read',
  'prompts/list', 'prompts/get', 'ping', 'initialize',
];

const METHOD_TONE: Record<string, string> = {
  'tools/call':     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'tools/list':     'bg-sky-500/15   text-sky-400   border-sky-500/30',
  'resources/read': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'resources/list': 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  'prompts/get':    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'prompts/list':   'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  'ping':           'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const todayIso  = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);

export const HistoryTab = () => {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [zone] = useGlobalTimezone();
  // Filter state
  const [serverId, setServerId] = useState<string | undefined>();
  const [method, setMethod]     = useState<string | undefined>();
  const [status, setStatus]     = useState<'success' | 'failed' | undefined>();
  const [q, setQ]               = useState('');
  const [from, setFrom]         = useState<string>(daysAgoIso(7));
  const [to, setTo]             = useState<string>(todayIso());
  const [page, setPage]         = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filter: McpHistoryFilter = useMemo(() => ({
    serverId,
    method,
    status,
    q: q.trim() || undefined,
    fromDate: from ? `${from}T00:00:00Z` : undefined,
    toDate:   to   ? `${to}T23:59:59Z`   : undefined,
    page,
    size: 50,
  }), [serverId, method, status, q, from, to, page]);

  const histQ = useQuery({
    queryKey: ['mcp-history-page', filter],
    queryFn:  () => listHistoryPage(filter),
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
  const entries = histQ.data?.content ?? [];

  const statsQ = useQuery({
    queryKey: ['mcp-history-stats', serverId, from, to],
    queryFn:  () => historyStats({
      serverId,
      fromDate: from ? `${from}T00:00:00Z` : undefined,
      toDate:   to   ? `${to}T23:59:59Z`   : undefined,
    }),
    refetchInterval: 30_000,
  });

  const serversQ = useQuery({
    queryKey: ['mcp-servers-history-sidebar'],
    queryFn: () => listServers(),
  });
  const servers = (serversQ.data ?? []) as Array<{ id: string; name?: string; serverUrl?: string }>;

  const clr = useMutation({
    mutationFn: () => clearHistory(serverId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mcp-history-page'] });
      await qc.invalidateQueries({ queryKey: ['mcp-history-stats'] });
      toast.success('History cleared');
    },
  });

  const delOne = useMutation({
    mutationFn: (id: string) => deleteHistoryEntry(id),
    onSuccess: async () => {
      setSelectedId(null);
      await qc.invalidateQueries({ queryKey: ['mcp-history-page'] });
    },
  });

  const exportHref = historyExportUrl(filter, 'csv');
  const exportJsonHref = historyExportUrl(filter, 'json');

  // Stats summary
  const stats: McpHistoryStatsDto | undefined = statsQ.data;

  return (
    <div className="flex h-full min-h-0" data-testid="mcp-history-tab">
      {/* ───────── Left sidebar — server / method picker ───────── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface/30">
        <div className="px-3 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Servers
          </div>
          <button
            data-testid="hist-sidebar-server-all"
            onClick={() => { setServerId(undefined); setPage(0); }}
            className={cn(
              'mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-hover/40',
              !serverId && 'bg-primary/10 text-primary',
            )}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">All servers</span>
            <span className="font-mono text-[10px] text-text-muted">{stats?.total ?? 0}</span>
          </button>
          {servers.map((s) => (
            <button
              key={s.id}
              data-testid={`hist-sidebar-server-${s.id}`}
              onClick={() => { setServerId(s.id); setPage(0); }}
              className={cn(
                'mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-hover/40',
                serverId === s.id && 'bg-primary/10 text-primary',
              )}
              title={s.serverUrl}
            >
              <Server className="h-3.5 w-3.5" />
              <span className="flex-1 truncate text-left">{s.name || s.serverUrl || s.id.slice(0, 8)}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-border px-3 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Method
          </div>
          <button
            data-testid="hist-sidebar-method-all"
            onClick={() => { setMethod(undefined); setPage(0); }}
            className={cn(
              'mb-0.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] hover:bg-hover/40',
              !method && 'bg-primary/10 text-primary',
            )}
          >
            <span className="flex-1 text-left">All methods</span>
          </button>
          {METHODS.map((m) => (
            <button
              key={m}
              data-testid={`hist-sidebar-method-${m.replace('/', '-')}`}
              onClick={() => { setMethod(m); setPage(0); }}
              className={cn(
                'mb-0.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono hover:bg-hover/40',
                method === m && 'bg-primary/10 text-primary',
              )}
            >
              <span className="flex-1 text-left">{m}</span>
              <span className="font-mono text-[10px] text-text-muted">{stats?.byMethod?.[m] ?? ''}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto border-t border-border px-3 py-2.5 text-[10px] text-text-muted">
          Timezone: <span className="font-mono text-text-secondary">{zone}</span>
        </div>
      </aside>

      {/* ───────── Main area ───────── */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Toolbar */}
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface/40 px-4 py-2.5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <History className="h-4 w-4 text-primary" />
            Call History
            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
              {histQ.data?.totalElements ?? 0}
            </span>
          </h3>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="mcp-history-filter"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search tool / method / URL…"
              className="h-7 w-64 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border bg-probestack-bg px-2 py-1 text-[10px]">
            <Calendar className="h-3 w-3 text-text-muted" />
            <input
              type="date"
              data-testid="hist-from-date"
              value={from}
              max={to}
              onChange={(e) => { setFrom(e.target.value); setPage(0); }}
              className="bg-transparent font-mono outline-none"
            />
            <span className="text-text-muted">→</span>
            <input
              type="date"
              data-testid="hist-to-date"
              value={to}
              min={from}
              onChange={(e) => { setTo(e.target.value); setPage(0); }}
              className="bg-transparent font-mono outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border bg-probestack-bg p-0.5 text-[10px]">
            {(['all', 'success', 'failed'] as const).map((s) => (
              <button
                key={s}
                data-testid={`hist-status-${s}`}
                onClick={() => { setStatus(s === 'all' ? undefined : s); setPage(0); }}
                className={cn(
                  'rounded px-2 py-1 font-semibold uppercase tracking-wide transition-colors',
                  ((s === 'all' && !status) || s === status)
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <a
              href={exportHref}
              download
              data-testid="mcp-history-export-csv"
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-hover/30"
            >
              <Download className="h-3 w-3" /> CSV
            </a>
            <a
              href={exportJsonHref}
              download
              data-testid="mcp-history-export-json"
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-hover/30"
            >
              <FileJson className="h-3 w-3" /> JSON
            </a>
            <Button variant="outline" data-testid="mcp-history-refresh"
                    onClick={() => qc.invalidateQueries({ queryKey: ['mcp-history-page'] })}>
              <RefreshCw className={cn('h-3.5 w-3.5', histQ.isFetching && 'animate-spin')} /> Refresh
            </Button>
            <Button variant="outline" data-testid="mcp-history-clear"
                    disabled={entries.length === 0 || clr.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Clear MCP history?',
                        description: 'All entries matching the current filter will be permanently deleted from this workspace.',
                        tone: 'danger',
                        confirmText: 'Clear history',
                        testId: 'confirm-mcp-history-clear',
                      });
                      if (ok) clr.mutate();
                    }}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </header>

        {/* Stats row */}
        <StatsStrip stats={stats} loading={statsQ.isLoading} />

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto" data-testid="mcp-history-list">
          {histQ.isLoading ? (
            <Skeleton className="m-4 h-48 w-auto" />
          ) : entries.length === 0 ? (
            <div className="m-4 rounded-md border border-dashed border-border bg-surface/30 p-12 text-center text-xs text-text-muted" data-testid="mcp-history-empty">
              No history matches these filters.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
                <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Server</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-left">Tool / Target</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-right">Latency</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const svr = servers.find((s) => s.id === e.serverId);
                  return (
                    <tr
                      key={e.id}
                      data-testid={`mcp-history-entry-${e.id}`}
                      onClick={() => setSelectedId(e.id)}
                      className={cn(
                        'cursor-pointer border-b border-border/40 transition-colors hover:bg-hover/30',
                        selectedId === e.id && 'bg-primary/10',
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-[10px] text-text-muted" title={fmtDateTime(e.createdAt)}>
                        {fmtDateTime(e.createdAt)}
                        <div className="text-[9px] opacity-60">{fmtRelative(e.createdAt)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Server className="h-3 w-3 text-text-muted" />
                          <span className="truncate">{svr?.name || e.serverUrl || (e.serverId ? e.serverId.slice(0, 8) : '—')}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[10px]', METHOD_TONE[e.method ?? ''] ?? 'border-border bg-elevated text-text-muted')}>
                          {e.method ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">
                        {e.target || <span className="text-text-muted/60">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {e.success
                          ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-success" />
                          : <AlertTriangle className="mx-auto h-3.5 w-3.5 text-danger" />}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[10px] text-text-muted">{e.ms}ms</td>
                      <td className="px-3 py-2 text-right">
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-text-muted" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {histQ.data && histQ.data.totalPages > 1 && (
          <footer className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2 text-[11px]">
            <span className="text-text-muted">
              Page <b>{(histQ.data.number ?? 0) + 1}</b> of <b>{histQ.data.totalPages}</b> · {histQ.data.totalElements} total
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Prev
              </Button>
              <Button size="sm" variant="outline" disabled={page >= (histQ.data.totalPages - 1)} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </footer>
        )}
      </div>

      {/* ───────── Detail drawer (right slide-in) ───────── */}
      {selectedId && (
        <DetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onDelete={() => delOne.mutate(selectedId)}
          onReplaySuccess={() => qc.invalidateQueries({ queryKey: ['mcp-history-page'] })}
        />
      )}
    </div>
  );
};

/* ============================================================================
 * StatsStrip — KPI tiles + 7-day sparkline.
 * ========================================================================== */
const StatsStrip = ({ stats, loading }: { stats?: McpHistoryStatsDto; loading: boolean }) => {
  if (loading) return <Skeleton className="m-4 h-16 w-auto" />;
  if (!stats) return null;
  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-border bg-elevated/20 px-4 py-3 sm:grid-cols-5">
      <Tile icon={Activity} label="Total calls" value={stats.total.toLocaleString()} testId="hist-kpi-total" />
      <Tile icon={CheckCircle2} label="Success rate" value={`${stats.successRate.toFixed(1)}%`} tone="success" testId="hist-kpi-success" />
      <Tile icon={BarChart3} label="p50 / p95" value={`${stats.latencyP50} / ${stats.latencyP95}ms`} testId="hist-kpi-latency" />
      <Tile icon={BarChart3} label="p99" value={`${stats.latencyP99}ms`} testId="hist-kpi-p99" />
      <div className="rounded-lg border border-border/60 bg-surface/40 p-2" data-testid="hist-sparkline">
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">Daily volume</div>
        <ResponsiveContainer width="100%" height={42}>
          <AreaChart data={stats.series} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <RechartsTooltip
              contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.25)', fontSize: 11, borderRadius: 6 }}
              formatter={(v: any, _n: any, p: any) => [v, p?.payload?.date]}
            />
            <Area dataKey="total" type="monotone" stroke="#f59e0b" fill="url(#histGrad)" strokeWidth={1.5} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, tone = 'default', testId }: {
  icon: any; label: string; value: string; tone?: 'default' | 'success' | 'danger'; testId: string;
}) => {
  const tones = { default: 'text-text-primary', success: 'text-success', danger: 'text-danger' } as const;
  return (
    <div data-testid={testId} className="rounded-lg border border-border/60 bg-surface/40 p-2">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn('truncate text-sm font-semibold', tones[tone])}>{value}</div>
    </div>
  );
};

/* ============================================================================
 * DetailDrawer — right slide-in panel with Request / Response / Meta / Notes.
 * ========================================================================== */
const DetailDrawer = ({ id, onClose, onDelete, onReplaySuccess }: {
  id: string; onClose: () => void; onDelete: () => void; onReplaySuccess: () => void;
}) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'request' | 'response' | 'meta' | 'notes'>('response');
  const [replayBusy, setReplayBusy] = useState(false);
  const [replayResult, setReplayResult] = useState<any | null>(null);

  const entryQ = useQuery({
    queryKey: ['mcp-history-entry', id],
    queryFn: () => getHistoryEntry(id),
  });
  const e: McpHistoryEntryDto | undefined = entryQ.data;

  const [tagInput, setTagInput] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { setNote(e?.note ?? ''); setTagInput(''); }, [e?.id]);

  const annotMut = useMutation({
    mutationFn: (body: { tags?: string[]; note?: string }) => annotateHistory(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mcp-history-entry', id] });
      await qc.invalidateQueries({ queryKey: ['mcp-history-page'] });
      toast.success('Saved');
    },
  });

  const onReplay = async () => {
    setReplayBusy(true);
    try {
      const inv = await replayHistory(id);
      setReplayResult(inv);
      toast.success(inv?.is_success ? 'Replayed successfully' : 'Replayed (call failed)');
      onReplaySuccess();
    } catch (err: any) {
      toast.error(`Replay error: ${err?.message || 'unknown'}`);
    } finally {
      setReplayBusy(false);
    }
  };

  const copy = (txt: string) => {
    try { navigator.clipboard.writeText(txt); toast.success('Copied'); } catch { toast.error('Copy failed'); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    const next = Array.from(new Set([...(e?.tags ?? []), t]));
    annotMut.mutate({ tags: next });
    setTagInput('');
  };
  const removeTag = (t: string) => annotMut.mutate({ tags: (e?.tags ?? []).filter((x: string) => x !== t) });

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        data-testid="mcp-history-drawer-backdrop"
      />
      <aside
        data-testid="mcp-history-drawer"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col border-l border-border bg-elevated shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[10px]', METHOD_TONE[e?.method ?? ''] ?? 'border-border bg-elevated')}>
                {e?.method ?? '—'}
              </span>
              {e?.success
                ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                : <AlertTriangle className="h-3.5 w-3.5 text-danger" />}
              <span className="font-mono text-xs text-text-secondary">{e?.statusCode ?? ''}</span>
              <span className="font-mono text-[10px] text-text-muted">{e?.ms ?? 0}ms</span>
            </div>
            <h3 className="mt-0.5 truncate font-mono text-sm text-text-primary">
              {e?.target || e?.method || id}
            </h3>
            <p className="truncate text-[10px] text-text-muted">
              {fmtDateTime(e?.createdAt)} · {e?.serverUrl ?? e?.serverId?.slice(0, 8) ?? 'unknown server'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onReplay} disabled={replayBusy || !e?.method} data-testid="hist-replay-btn">
            <Play className={cn('h-3.5 w-3.5', replayBusy && 'animate-pulse')} /> Replay
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} data-testid="hist-delete-btn" title="Delete">
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} data-testid="hist-drawer-close" title="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Tags row */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-surface/30 px-4 py-2 text-[10px]">
          <TagIcon className="h-3 w-3 text-text-muted" />
          {(e?.tags ?? []).map((t: string) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
              {t}
              <button onClick={() => removeTag(t)} className="opacity-70 hover:opacity-100"><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
          <input
            data-testid="hist-tag-input"
            value={tagInput}
            onChange={(ev) => setTagInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                ev.stopPropagation();
                addTag();
              }
            }}
            placeholder="add tag…"
            className="h-5 w-24 rounded-full border border-border bg-transparent px-2 outline-none focus:border-primary"
          />
        </div>

        {/* Tabs */}
        <nav className="flex shrink-0 gap-1 border-b border-border px-3 pt-2">
          {([
            { id: 'response', label: 'Response' },
            { id: 'request',  label: 'Request' },
            { id: 'meta',     label: 'Meta' },
            { id: 'notes',    label: 'Notes' },
          ] as const).map((t) => (
            <button
              key={t.id}
              data-testid={`hist-drawer-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-t-md border-b-2 px-3 py-1.5 text-[11px] font-semibold transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {entryQ.isLoading || !e ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              {tab === 'response' && (
                <JsonBlock label="Response body" value={e.response ?? e.payload?.response ?? { error: e.error }} onCopy={copy} testId="hist-resp-json" />
              )}
              {tab === 'request' && (
                <JsonBlock label="Request body" value={e.request ?? e.payload?.request} onCopy={copy} testId="hist-req-json" />
              )}
              {tab === 'meta' && (
                <div className="space-y-1.5 font-mono text-[11px]">
                  <Meta k="id"          v={e.id} />
                  <Meta k="server_id"   v={e.serverId} />
                  <Meta k="server_url"  v={e.serverUrl} />
                  <Meta k="user_id"     v={e.userId} />
                  <Meta k="workspace"   v={e.workspaceId} />
                  <Meta k="method"      v={e.method} />
                  <Meta k="target"      v={e.target} />
                  <Meta k="status_code" v={String(e.statusCode ?? '')} />
                  <Meta k="latency_ms"  v={`${e.ms}ms`} />
                  <Meta k="executed_at" v={`${fmtDateTime(e.createdAt)}  (${getGlobalTimezone()})`} />
                  {e.error && <Meta k="error" v={e.error} />}
                </div>
              )}
              {tab === 'notes' && (
                <div className="space-y-2">
                  <textarea
                    data-testid="hist-note-input"
                    value={note}
                    onChange={(ev) => setNote(ev.target.value)}
                    placeholder="Add your notes for this call (e.g. why you ran it, what you observed)…"
                    rows={8}
                    className="w-full rounded-md border border-border bg-transparent p-2 text-xs"
                  />
                  <Button size="sm" data-testid="hist-note-save" onClick={() => annotMut.mutate({ note })} disabled={annotMut.isPending}>
                    Save note
                  </Button>
                </div>
              )}
              {replayResult && (
                <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    <span>Replay result · {replayResult.is_success ? 'success' : 'failed'} · {replayResult.latency_ms ?? 0}ms</span>
                    <button onClick={() => setReplayResult(null)}><X className="h-3 w-3" /></button>
                  </div>
                  <pre className="max-h-48 overflow-auto rounded bg-elevated/40 p-2 font-mono text-[10px]">
                    {JSON.stringify(replayResult, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};

const Meta = ({ k, v }: { k: string; v?: string }) => (
  <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/40 pb-1">
    <span className="text-text-muted">{k}</span>
    <span className="break-all text-text-secondary">{v || '—'}</span>
  </div>
);

const JsonBlock = ({ label, value, onCopy, testId }: { label: string; value: any; onCopy: (s: string) => void; testId: string }) => {
  const pretty = useMemo(() => {
    try {
      if (value == null) return '—';
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch { return String(value); }
  }, [value]);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        <span>{label}</span>
        <button
          data-testid={`${testId}-copy`}
          className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-hover/40"
          onClick={() => onCopy(pretty)}
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <pre
        data-testid={testId}
        className="max-h-[420px] overflow-auto rounded-md border border-border bg-elevated/30 p-3 font-mono text-[10px] leading-relaxed text-text-secondary"
      >
        {pretty}
      </pre>
    </div>
  );
};
