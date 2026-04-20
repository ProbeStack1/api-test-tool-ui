// src/components/mcp/history/McpHistory.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { History, RefreshCw, Trash2, Filter, Clock, Zap, Layers, Activity, X, Check } from 'lucide-react';
import Card, { CardBody } from '../shared/Card';
import EmptyState from '../shared/EmptyState';
import { LoadingBlock } from '../shared/Spinner';
import JsonViewer from '../shared/JsonViewer';
import StatusBadge from '../shared/StatusBadge';
import { Button, Select } from '../shared/Field';
import Tabs from '../shared/Tabs';
import {
  mcpListHistory, mcpDeleteHistory, mcpBulkDeleteHistory,
  mcpListWorkspaceRuns, mcpGetCollectionRun,
} from '../../../services/mcpService';

const VIEW_TABS = [
  { id: 'calls', label: 'Tool calls', icon: Zap, hint: 'Every tool / resource / prompt invocation' },
  { id: 'runs',  label: 'Collection runs', icon: Layers, hint: 'Every batch run across all collections' },
];

export default function McpHistory({ workspaceId, servers }) {
  const [view, setView] = useState('calls');
  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> MCP Call History
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Audit trail for everything this workspace has done against MCP servers.</p>
        </div>
        <Tabs tabs={VIEW_TABS} value={view} onChange={setView} />
      </div>
      {view === 'calls' ? <CallsView workspaceId={workspaceId} servers={servers} />
                        : <RunsView workspaceId={workspaceId} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function safeParse(text) {
  if (text == null) return null;
  if (typeof text !== 'string') return text;
  try { return JSON.parse(text); } catch { return null; }
}

/** Extract the useful payload from a raw JSON-RPC envelope string.
 *  For request: return `params`; for response: return `result` or `error`. */
function extractRpcBody(raw, side) {
  const obj = safeParse(raw);
  if (!obj || typeof obj !== 'object') return obj;
  if (side === 'request')  return obj.params ?? obj;
  if (side === 'response') return obj.error ?? obj.result ?? obj;
  return obj;
}

/** Titled JSON panel with Beautified/Raw toggle (default beautified). */
function JsonToggleSection({ title, beautified, raw, maxHeight = 480 }) {
  const [mode, setMode] = useState('beautified');
  const hasBeaut = beautified !== undefined && beautified !== null && !(typeof beautified === 'object' && Object.keys(beautified).length === 0 && !Array.isArray(beautified));
  const hasRaw   = raw !== undefined && raw !== null && raw !== '';
  // If beautified is empty but raw exists, default to raw.
  const effectiveMode = !hasBeaut && hasRaw ? 'raw' : mode;
  const showing = effectiveMode === 'raw' ? raw : (beautified ?? {});
  return (
    <div className="rounded-lg border border-dark-700/60 bg-probestack-bg overflow-hidden flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-dark-700/60 bg-dark-800/60">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        <div className="flex items-center rounded border border-dark-700/60 overflow-hidden">
          <button
            disabled={!hasBeaut}
            onClick={() => setMode('beautified')}
            className={clsx(
              'text-xs px-2 py-0.5 transition-colors',
              effectiveMode === 'beautified'
                ? 'bg-primary/20 text-primary'
                : 'text-gray-400 hover:bg-dark-700/50',
              !hasBeaut && 'opacity-40 cursor-not-allowed'
            )}>
            Beautified
          </button>
          <button
            disabled={!hasRaw}
            onClick={() => setMode('raw')}
            className={clsx(
              'text-xs px-2 py-0.5 transition-colors border-l border-dark-700/60',
              effectiveMode === 'raw'
                ? 'bg-primary/20 text-primary'
                : 'text-gray-400 hover:bg-dark-700/50',
              !hasRaw && 'opacity-40 cursor-not-allowed'
            )}>
            Raw
          </button>
        </div>
      </div>
      <div className="p-2 overflow-auto custom-scrollbar">
        <JsonViewer data={showing} title={null} maxHeight={maxHeight} expandDefault />
      </div>
    </div>
  );
}

/** Inline two-step delete button: first click = arm (turns into "Yes, delete"),
 *  second click = actually delete. Auto-disarms after 4s or on cancel. */
function TwoStepDeleteButton({ onConfirm, size = 'sm', label = 'Delete', className }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const arm = (e) => {
    e?.stopPropagation?.();
    setArmed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setArmed(false), 4000);
  };
  const cancel = (e) => {
    e?.stopPropagation?.();
    setArmed(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const confirm = async (e) => {
    e?.stopPropagation?.();
    setArmed(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    await onConfirm?.();
  };

  if (!armed) {
    return (
      <Button size={size} variant="danger" icon={Trash2} onClick={arm} className={className}>
        {label}
      </Button>
    );
  }
  return (
    <div className={clsx('inline-flex items-center gap-1', className)}>
      <Button size={size} variant="danger" icon={Check} onClick={confirm}>Yes, delete</Button>
      <button
        onClick={cancel}
        className="p-1.5 rounded-md border border-dark-700/60 hover:border-gray-400 text-gray-400 hover:text-white transition-colors"
        title="Cancel">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tool call history                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function CallsView({ workspaceId, servers }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterServer, setFilterServer] = useState('');
  const [filterKind, setFilterKind] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data } = await mcpListHistory({ workspaceId, limit: 200 });
      const list = Array.isArray(data) ? data : (data?.content || data?.items || []);
      setItems(list);
      setSelected(prev => prev && list.find(i => (i.id || i.historyId) === (prev.id || prev.historyId)) ? prev : list[0] || null);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const serverNameById = useMemo(() => {
    const m = {};
    (servers || []).forEach(s => { m[s.id || s.serverId] = s.name; });
    return m;
  }, [servers]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const sid = i.server_id || i.serverId;
      if (filterServer && String(sid) !== filterServer) return false;
      if (filterKind && (i.method || i.kind) !== filterKind) return false;
      return true;
    });
  }, [items, filterServer, filterKind]);

  const handleDelete = async (i) => {
    const id = i.id || i.historyId;
    try {
      await mcpDeleteHistory(id);
      setItems(prev => prev.filter(x => (x.id || x.historyId) !== id));
      setSelected(prev => (prev && (prev.id || prev.historyId) === id) ? null : prev);
      toast.success('Entry deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleClear = async () => {
    try {
      await mcpBulkDeleteHistory({ workspaceId });
      setItems([]); setSelected(null); setConfirmClear(false);
      toast.success('History cleared');
    } catch { toast.error('Clear failed'); }
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-dark-800/60 border border-dark-700 rounded-md px-2 py-1">
          <Filter className="w-3 h-3" />
          <Select value={filterServer} onChange={e => setFilterServer(e.target.value)} className="!w-auto !py-0.5 !text-xs bg-transparent border-0">
            <option value="">All servers</option>
            {servers.map(s => <option key={s.id || s.serverId} value={s.id || s.serverId} className="bg-probestack-bg" >{s.name}</option>)}
          </Select>
          <Select value={filterKind} onChange={e => setFilterKind(e.target.value)} className="!w-auto !py-0.5 !text-xs bg-transparent border-0">
            <option value="" className="bg-probestack-bg">All kinds</option>
            <option value="tools/call" className="bg-probestack-bg">tools/call</option>
            <option value="tools/list" className="bg-probestack-bg">tools/list</option>
            <option value="resources/read" className="bg-probestack-bg">resources/read</option>
            <option value="resources/list" className="bg-probestack-bg">resources/list</option>
            <option value="prompts/get" className="bg-probestack-bg">prompts/get</option>
            <option value="prompts/list" className="bg-probestack-bg">prompts/list</option>
            <option value="ping" className="bg-probestack-bg">ping</option>
          </Select>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={refresh}>Refresh</Button>
        <div className="relative">
          <Button variant="danger" icon={Trash2} onClick={() => setConfirmClear(v => !v)}>Clear all</Button>
          {confirmClear && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setConfirmClear(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-lg border border-red-500/40 bg-dark-800 shadow-2xl shadow-red-500/10 p-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Clear all history?</div>
                    <div className="text-xs text-gray-400 mt-0.5">Deletes every tool-call entry in this workspace. Cannot be undone.</div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-3">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-xs px-2.5 py-1 rounded-md text-gray-300 hover:bg-dark-700 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    className="text-xs px-2.5 py-1 rounded-md bg-red-500/90 hover:bg-red-500 text-white font-medium transition-colors">
                    Clear all
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading && items.length === 0 ? <LoadingBlock label="Loading history…" /> :
       filtered.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={History} title="No history yet" description="Invocations made via Inspector, Collections, Bridge or AI Generator will show up here." />
        </CardBody></Card>
       ) : (
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          <Card className="col-span-12 md:col-span-5 xl:col-span-4 flex flex-col min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-dark-700/60 text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center justify-between">
              <span>{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</span>
            </div>
            <ul className="flex-1 overflow-auto custom-scrollbar">
              {filtered.map(i => {
                const id = i.id || i.historyId;
                const active = (selected?.id || selected?.historyId) === id;
                const success = i.is_success !== false && !i.error_message;
                const method = i.method || i.kind || 'call';
                const target = i.target || i.toolName;
                const latency = i.latency_ms ?? i.latencyMs ?? i.durationMs ?? null;
                const when = i.executed_at || i.executedAt || i.createdAt || i.timestamp;
                const serverName = serverNameById[i.server_id || i.serverId];
                return (
                  <li key={id} className="border-b border-dark-700/40 last:border-b-0">
                    <button
                      onClick={() => setSelected(i)}
                      className={clsx('w-full text-left px-3 py-2 transition-colors group',
                        active ? 'bg-primary/10' : 'hover:bg-dark-700/40')}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className={clsx('w-3 h-3 shrink-0', active ? 'text-primary' : success ? 'text-emerald-400' : 'text-red-400')} />
                        <span className="text-xs font-mono text-gray-200 truncate">{target || method}</span>
                        <StatusBadge status={success ? 'healthy' : 'unhealthy'} label={success ? 'ok' : 'err'} size="xs" className="ml-auto" />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-gray-500 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-dark-700">{method}</span>
                        {serverName && <span className="truncate">{serverName}</span>}
                        <span className="ml-auto inline-flex items-center gap-1"><Clock className="w-3 h-3" />{latency ?? '—'}ms</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{fmtDate(when)}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="col-span-12 md:col-span-7 xl:col-span-8 flex flex-col min-h-0 overflow-hidden">
            {!selected ? <EmptyState icon={History} title="Select an entry" /> : (() => {
              const success = selected.is_success !== false && !selected.error_message;
              const method  = selected.method || selected.kind;
              const target  = selected.target || selected.toolName;
              const latency = selected.latency_ms ?? selected.latencyMs ?? selected.durationMs;
              const when    = selected.executed_at || selected.executedAt || selected.createdAt;
              const serverName = serverNameById[selected.server_id || selected.serverId];
              const rawReq  = selected.request_json ?? selected.requestJson ?? null;
              const rawRes  = selected.response_json ?? selected.responseJson ?? null;
              const beautReq = extractRpcBody(rawReq, 'request') ?? selected.arguments ?? null;
              const beautRes = extractRpcBody(rawRes, 'response');
              return (
                <>
                  <div className="px-4 py-3 border-b border-dark-700/60 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white font-mono truncate">{target || method}</h4>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <StatusBadge status={success ? 'healthy' : 'unhealthy'} label={success ? 'success' : 'error'} size="xs" />
                        <span className="font-mono">{method}</span>
                        {serverName && <span>· {serverName}</span>}
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{latency ?? '—'}ms</span>
                        <span>· {fmtDate(when)}</span>
                        {selected.status_code != null && <span className="font-mono">· HTTP {selected.status_code}</span>}
                      </div>
                      {selected.error_message && <div className="mt-1 text-xs text-red-400 font-mono">{selected.error_message}</div>}
                    </div>
                    <TwoStepDeleteButton onConfirm={() => handleDelete(selected)} />
                  </div>
                  <div className="flex-1 p-3 overflow-auto custom-scrollbar grid grid-cols-1 xl:grid-cols-2 gap-2">
                    <JsonToggleSection title="Request"  beautified={beautReq} raw={rawReq} />
                    <JsonToggleSection title={selected.error_message ? 'Error / Response' : 'Response'} beautified={beautRes} raw={rawRes} />
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
       )
      }
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Workspace-wide collection runs                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function RunsView({ workspaceId }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data } = await mcpListWorkspaceRuns({ workspaceId, limit: 100 });
      const list = Array.isArray(data) ? data : (data?.content || data?.items || []);
      setRuns(list);
      setDetail(null);
    } catch { toast.error('Failed to load collection runs'); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() =>
    runs.filter(r => !filterStatus || (r.status || '').toLowerCase() === filterStatus)
  , [runs, filterStatus]);

  const openRun = async (runId) => {
    setLoadingDetail(true);
    try { const { data } = await mcpGetCollectionRun(runId); setDetail(data); }
    catch { toast.error('Failed to load run detail'); }
    finally { setLoadingDetail(false); }
  };

  const stats = useMemo(() => {
    const total = runs.length;
    const passed = runs.filter(r => ['success', 'passed'].includes((r.status || '').toLowerCase())).length;
    const failed = runs.filter(r => (r.status || '').toLowerCase() === 'failed').length;
    return { total, passed, failed };
  }, [runs]);

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Stats + filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <StatCard icon={Activity} label="Total runs" value={stats.total} />
          <StatCard icon={Activity} label="Passed"     value={stats.passed} tone="success" />
          <StatCard icon={Activity} label="Failed"     value={stats.failed} tone="error" />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-dark-800/60 border border-dark-700 rounded-md px-2 py-1">
            <Filter className="w-3 h-3" />
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="!w-auto !py-0.5 !text-xs bg-transparent border-0">
              <option value="" className="bg-probestack-bg">All statuses</option>
              <option value="success" className="bg-probestack-bg">Success</option>
              <option value="failed" className="bg-probestack-bg">Failed</option>
              <option value="partial" className="bg-probestack-bg">Partial</option>
              <option value="running" className="bg-probestack-bg">Running</option>
            </Select>
          </div>
          <Button variant="outline" icon={RefreshCw} onClick={refresh}>Refresh</Button>
        </div>
      </div>

      {loading && runs.length === 0 ? <LoadingBlock label="Loading collection runs…" /> :
       filtered.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={Layers} title="No collection runs yet" description="Run any MCP collection and it'll appear here — regardless of which collection it came from." />
        </CardBody></Card>
       ) : (
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          <Card className="col-span-12 lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-dark-700/60 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              {filtered.length} run{filtered.length === 1 ? '' : 's'}
            </div>
            <ul className="flex-1 overflow-auto custom-scrollbar">
              {filtered.map(r => {
                const id = r.id || r.runId;
                const active = detail && (detail.id || detail.runId) === id;
                const status = (r.status || '').toLowerCase();
                const statusTone = ['success', 'passed'].includes(status) ? 'healthy'
                                 : status === 'failed' ? 'unhealthy' : 'degraded';
                const total = r.total_steps ?? r.totalSteps ?? r.total ?? 0;
                const passed = r.passed_steps ?? r.passedSteps ?? r.passed ?? 0;
                const ms = r.total_ms ?? r.totalMs ?? r.durationMs ?? '—';
                const when = r.started_at || r.startedAt || r.createdAt || r.created_at;
                const runBy = r.run_by || r.runBy;
                const collectionName = r.metadata?.collection_name
                  || r.metadata?.collectionName
                  || r.collectionName
                  || r.name
                  || 'Run';
                return (
                  <li key={id} className="border-b border-dark-700/40 last:border-b-0">
                    <button
                      onClick={() => openRun(id)}
                      className={clsx('w-full text-left px-3 py-2 transition-colors',
                        active ? 'bg-primary/10' : 'hover:bg-dark-700/40')}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className={clsx('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : 'text-gray-500')} />
                        <span className="text-xs font-medium text-gray-100 truncate">{collectionName}</span>
                        <StatusBadge status={statusTone} label={r.status || 'done'} size="xs" className="ml-auto" />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 font-mono">
                        <span>{passed}/{total} passed</span>
                        <span className="ml-auto inline-flex items-center gap-1"><Clock className="w-3 h-3" />{ms}ms</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{fmtDate(when)}</div>
                      {runBy && <div className="text-xs text-gray-500 mt-0.5 truncate">by {runBy}</div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="col-span-12 lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
            {loadingDetail ? <LoadingBlock label="Loading run…" /> :
             !detail ? <EmptyState icon={Layers} title="Select a run" description="Click a run on the left to inspect its steps and assertions." /> : (
              <RunDetail run={detail} />
             )
            }
          </Card>
        </div>
       )
      }
    </div>
  );
}

function RunDetail({ run }) {
  const status = (run.status || '').toLowerCase();
  const statusTone = ['success', 'passed'].includes(status) ? 'healthy'
                   : status === 'failed' ? 'unhealthy' : 'degraded';
  const steps  = run.step_results || run.stepResults || run.steps || [];
  const total  = run.total_steps  ?? run.totalSteps  ?? steps.length;
  const passed = run.passed_steps ?? run.passedSteps ?? 0;
  const ms     = run.total_ms ?? run.totalMs ?? run.durationMs ?? '—';
  const when   = run.started_at || run.startedAt || run.createdAt;
  const name   = run.metadata?.collection_name || run.metadata?.collectionName
              || run.collectionName || run.name || 'Run';

  return (
    <>
      <div className="px-4 py-3 border-b border-dark-700/60">
        <h4 className="text-sm font-semibold text-white truncate">{name}</h4>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
          <StatusBadge status={statusTone} label={run.status || 'done'} size="xs" />
          <span>{passed}/{total} passed</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{ms}ms</span>
          <span>· {fmtDate(when)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar p-3 space-y-2">
        {steps.length === 0 ? (
          <EmptyState icon={Layers} title="No step detail" description="This run completed without per-step data." />
        ) : steps.map((s, i) => {
          const stepName = s.step_name || s.stepName || s.name || `Step ${i + 1}`;
          const latency  = s.latency_ms ?? s.latencyMs ?? s.durationMs ?? '—';
          const inv      = s.invocation || {};
          const parsed   = inv.parsed_result ?? inv.parsedResult;
          const errMsg   = inv.error_message ?? inv.errorMessage ?? s.error;
          const asserts  = s.assertion_results || s.assertionResults || [];
          const skipped  = !!s.skipped;
          const ok       = !skipped && s.passed;
          return (
            <div key={s.step_id || s.stepId || i} className={clsx('rounded-md border p-3',
              skipped ? 'border-dark-700/60 bg-dark-900/30'
              : ok    ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                      : 'border-red-500/30 bg-red-500/[0.04]'
            )}>
              <div className="flex items-center gap-2">
                <span className={clsx('w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center',
                  skipped ? 'bg-dark-700 text-gray-500' : ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300')}>
                  {skipped ? '↷' : ok ? '✓' : '✗'}
                </span>
                <span className="text-xs font-semibold text-gray-100 truncate">{stepName}</span>
                {inv.method && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-dark-700 text-gray-400 uppercase tracking-wider font-mono">{inv.method}</span>
                )}
                <span className="ml-auto text-xs text-gray-500 font-mono inline-flex items-center gap-1"><Clock className="w-3 h-3" />{latency}ms</span>
              </div>
              {errMsg && <p className="mt-1 text-xs text-red-400 font-mono">{errMsg}</p>}
              {asserts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {asserts.map((a, j) => (
                    <span key={j} className={clsx('text-xs px-1.5 py-0.5 rounded font-mono',
                      a.passed ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                               : 'bg-red-500/10 text-red-300 border border-red-500/30')}>
                      {a.type}{a.message ? ` · ${a.message}` : (a.expected != null && a.expected !== '' ? `: ${a.expected}` : '')}
                    </span>
                  ))}
                </div>
              )}
              {parsed != null && <div className="mt-2"><JsonViewer data={parsed} title="response" maxHeight={200} /></div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const color = {
    default: 'text-white',
    success: 'text-emerald-300',
    error:   'text-red-300',
  }[tone];
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-dark-700/60 bg-dark-800/60 px-3 py-1.5">
      <Icon className={clsx('w-3.5 h-3.5', tone === 'success' ? 'text-emerald-400' : tone === 'error' ? 'text-red-400' : 'text-primary')} />
      <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
      <span className={clsx('text-sm font-semibold font-mono', color)}>{value}</span>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}
