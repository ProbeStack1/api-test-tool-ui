// src/components/mcp/inspector/Inspector.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  Wrench, FileStack, Sparkles, Gauge, Play, Radio, Zap, Search, RefreshCw, ArrowRight,
  Download, Clock, Plug, X,
} from 'lucide-react';
import Card, { CardBody } from '../shared/Card';
import { LoadingBlock } from '../shared/Spinner';
import EmptyState from '../shared/EmptyState';
import ServerSelector from '../shared/ServerSelector';
import StatusBadge from '../shared/StatusBadge';
import JsonEditor, { prettify } from '../shared/JsonEditor';
import JsonViewer from '../shared/JsonViewer';
import ResultPanel from '../shared/ResultPanel';
import { Button, Field, TextInput } from '../shared/Field';
import {
  buildServerRef,
  mcpConnect, mcpDisconnect, mcpPing,
  mcpListTools, mcpCallTool, mcpValidateArgs,
  mcpListResources, mcpReadResource, mcpListResourceTemplates,
  mcpListPrompts, mcpGetPrompt,
  mcpBenchmark,
} from '../../../services/mcpService';

const SECTIONS = [
  { id: 'tools',     label: 'Tools',     icon: Wrench },
  { id: 'resources', label: 'Resources', icon: FileStack },
  { id: 'prompts',   label: 'Prompts',   icon: Sparkles },
  { id: 'benchmark', label: 'Benchmark', icon: Gauge },
];

export default function Inspector({ servers, activeId, setActiveId, workspaceId, onManageServers }) {
  const [section, setSection] = useState('tools');
  const [connecting, setConnecting] = useState(false);
  const [connState, setConnState] = useState(null); // { connected, protocolVersion, capabilities }

  const activeServer = servers.find(s => (s.id || s.serverId) === activeId);
  const serverRef = useMemo(() => buildServerRef({
    serverId: activeId, workspaceId,
    serverUrl: activeServer?.serverUrl, transport: activeServer?.transport,
    authHeaders: activeServer?.authHeaders, protocolVersion: activeServer?.protocolVersion,
  }), [activeId, workspaceId, activeServer]);

  // Auto-connect when server changes
  useEffect(() => {
    let cancelled = false;
    setConnState(null);
    if (!activeId) return;
    (async () => {
      setConnecting(true);
      try {
        const { data } = await mcpConnect(serverRef);
        if (!cancelled) setConnState({ connected: true, ...data });
      } catch (err) {
        if (!cancelled) setConnState({ connected: false, error: err.response?.data?.message || err.message });
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeId, serverRef]);

  const handleReconnect = async () => {
    if (!activeId) return;
    setConnecting(true);
    try {
      await mcpDisconnect(serverRef).catch(() => {});
      const { data } = await mcpConnect(serverRef);
      setConnState({ connected: true, ...data });
      toast.success('Reconnected');
    } catch (err) {
      toast.error('Reconnect failed');
    } finally {
      setConnecting(false);
    }
  };

  const handlePing = async () => {
    try {
      const start = performance.now();
      await mcpPing(serverRef);
      toast.success(`Pong · ${Math.round(performance.now() - start)}ms`);
    } catch (err) {
      toast.error('Ping failed');
    }
  };

  if (!activeId) {
    return (
      <Card><CardBody>
        <EmptyState
          icon={Plug}
          title="Select an MCP server to inspect"
          description="Pick a server from the selector below — or register one first — and we'll auto-connect and surface its Tools, Resources and Prompts."
          action={
            <div className="w-full max-w-md">
              <ServerSelector servers={servers} value={activeId} onChange={setActiveId} onManage={onManageServers} />
            </div>
          }
        />
      </CardBody></Card>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Connection strip */}
      <Card className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-64 max-w-full">
              <ServerSelector servers={servers} value={activeId} onChange={setActiveId} onManage={onManageServers} />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
              {connecting ? (
                <StatusBadge status="connecting" pulse label="Connecting…" />
              ) : connState?.connected ? (
                <>
                  <StatusBadge status="healthy" label="Connected" />
                  {connState.protocolVersion && <span className="px-1.5 py-0.5 rounded bg-dark-700 font-mono">MCP v{connState.protocolVersion}</span>}
                  {connState.capabilities && (
                    <span className="text-gray-500">
                      caps: {Object.keys(connState.capabilities).filter(k => connState.capabilities[k]).join(', ') || '—'}
                    </span>
                  )}
                </>
              ) : (
                <StatusBadge status="unhealthy" label={connState?.error ? 'Disconnected' : 'Not connected'} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" icon={Radio} onClick={handlePing} disabled={!connState?.connected}>Ping</Button>
            <Button size="sm" variant="subtle" icon={RefreshCw} onClick={handleReconnect} loading={connecting}>Reconnect</Button>
          </div>
        </div>
      </Card>

      {/* Section tabs — large, beautiful segmented control */}
      <div className="shrink-0 flex items-center gap-1 p-1 rounded-xl bg-probestack-bg border border-dark-700/60 overflow-x-auto custom-scrollbar">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={clsx(
                'flex-1 min-w-[110px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                active
                  ? 'bg-gradient-to-br from-primary/20 to-primary/5 text-white ring-1 ring-primary/40 shadow-[inset_0_0_16px_-8px_rgba(255,91,31,0.6)]'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
              )}
            >
              <Icon className={clsx('w-3.5 h-3.5', active ? 'text-primary' : 'text-gray-500')} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Section body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {section === 'tools'     && <ToolsExplorer     serverRef={serverRef} connected={connState?.connected} />}
        {section === 'resources' && <ResourcesExplorer serverRef={serverRef} connected={connState?.connected} />}
        {section === 'prompts'   && <PromptsExplorer   serverRef={serverRef} connected={connState?.connected} />}
        {section === 'benchmark' && <BenchmarkPanel    serverRef={serverRef} connected={connState?.connected} />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tools                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function ToolsExplorer({ serverRef, connected }) {
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState([]);
  const [selected, setSelected] = useState(null);
  const [args, setArgs] = useState('{\n  \n}');
  const [result, setResult] = useState(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [running, setRunning] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [query, setQuery] = useState('');

  const closeResult = () => {
    setResultVisible(false);
    setTimeout(() => setResult(null), 260);
  };

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const { data } = await mcpListTools(serverRef);
      const list = data?.tools || data?.items || (Array.isArray(data) ? data : []);
      setTools(list);
      setSelected(prev => prev && list.find(t => t.name === prev.name) ? prev : list[0] || null);
    } catch (err) {
      toast.error('Failed to list tools');
      setTools([]);
    } finally { setLoading(false); }
  }, [serverRef, connected]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // Reset args to a scaffold based on schema when tool changes
    if (!selected) return;
    const schema = selected.inputSchema || selected.input_schema;
    const scaffold = buildScaffold(schema);
    setArgs(prettify(JSON.stringify(scaffold)));
    setResult(null); setResultVisible(false); setValidation(null);
  }, [selected]);

  const filtered = useMemo(() => {
    if (!query.trim()) return tools;
    const q = query.toLowerCase();
    return tools.filter(t => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }, [tools, query]);

  const parseArgs = () => {
    if (!args.trim()) return {};
    try { return JSON.parse(args); } catch { throw new Error('Arguments are not valid JSON'); }
  };

  const handleValidate = async () => {
    if (!selected) return;
    try {
      const parsed = parseArgs();
      setValidating(true);
      const { data } = await mcpValidateArgs({ ...serverRef, tool_name: selected.name, arguments: parsed });
      setValidation(data);
      if (data?.valid) toast.success('Arguments match schema'); else toast.error('Schema validation failed');
    } catch (err) {
      setValidation({ valid: false, errors: [err.response?.data?.message || err.message] });
    } finally { setValidating(false); }
  };

  const handleRun = async () => {
    if (!selected) return;
    try {
      const parsed = parseArgs();
      setRunning(true);
      const start = performance.now();
      const { data } = await mcpCallTool({ ...serverRef, tool_name: selected.name, arguments: parsed });
      const ms = data?._latencyMs ?? Math.round(performance.now() - start);
      // Backend signals failure via envelope meta (_success=false) even on HTTP 200
      if (data && data._success === false) {
        setResult({ ok: false, error: { message: data._raw?.error_message || 'Tool call failed', status: data._statusCode, trace: data._traceSteps }, ms });
        toast.error(data._raw?.error_message || 'Tool call failed');
      } else {
        setResult({ ok: true, data, ms });
        toast.success(`Tool returned in ${ms}ms`);
      }
      requestAnimationFrame(() => setResultVisible(true));
    } catch (err) {
      setResult({ ok: false, error: err.response?.data || { message: err.message }, ms: 0 });
      requestAnimationFrame(() => setResultVisible(true));
      toast.error('Tool call failed');
    } finally { setRunning(false); }
  };

  if (!connected) {
    return <Card><CardBody><EmptyState icon={Wrench} title="Not connected" description="Connect to the server to list tools." /></CardBody></Card>;
  }

  return (
    <div className="h-full grid grid-cols-12 gap-3 min-h-0">
      {/* Tool list */}
      <Card className="col-span-12 md:col-span-4 xl:col-span-3 flex flex-col min-h-0 overflow-hidden">
        <div className="p-2 border-b border-dark-700/60 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tools…"
              className="w-full bg-probestack-bg border border-dark-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50"
            />
          </div>
          <button onClick={load} className="p-1.5 rounded hover:bg-dark-700 text-gray-400 hover:text-white" title="Refresh">
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? <LoadingBlock label="Listing tools…" /> :
            filtered.length === 0 ? <EmptyState icon={Wrench} title="No tools" description={query ? 'No matches for your search.' : 'Server exposes no tools.'} />
            : (
              <ul className="p-1.5 space-y-0.5">
                {filtered.map(t => {
                  const active = selected?.name === t.name;
                  return (
                    <li key={t.name}>
                      <button
                        onClick={() => setSelected(t)}
                        className={clsx(
                          'w-full text-left px-2.5 py-2 rounded-md transition-colors',
                          active ? 'bg-primary/10 border border-primary/30' : 'border border-transparent hover:bg-dark-700/50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className={clsx('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : 'text-gray-500')} />
                          <span className="text-xs font-mono truncate text-gray-200">{t.name}</span>
                        </div>
                        {t.description && <p className="text-xs text-gray-500 ml-5 mt-0.5 line-clamp-2">{t.description}</p>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </div>
      </Card>

      {/* Invocation + result */}
      <div className="col-span-12 md:col-span-8 xl:col-span-9 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        {!selected ? (
          <Card><CardBody><EmptyState icon={Wrench} title="Pick a tool" description="Select a tool from the list to inspect its schema and invoke it." /></CardBody></Card>
        ) : (
          <>
            <Card>
              <div className="p-4 border-b border-dark-700/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white font-mono truncate">{selected.name}</h3>
                    {selected.description && <p className="text-xs text-gray-400 mt-1">{selected.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={handleValidate} loading={validating}>Validate</Button>
                    <Button size="sm" variant="primary" icon={Play} onClick={handleRun} loading={running}>Invoke</Button>
                  </div>
                </div>
                {validation && (
                  <div className={clsx(
                    'mt-3 px-3 py-2 rounded-md text-xs border',
                    validation.valid ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  )}>
                    {validation.valid
                      ? '✓ Arguments conform to the tool schema.'
                      : <>✗ {(validation.errors || []).join(' · ') || 'Schema validation failed.'}</>}
                  </div>
                )}
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <JsonEditor
                  label="Arguments"
                  hint="JSON object matching the tool's inputSchema."
                  value={args}
                  onChange={setArgs}
                  rows={12}
                />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Input Schema</div>
                  <JsonViewer data={selected.inputSchema || selected.input_schema || { note: 'No schema provided' }} title="inputSchema" maxHeight={300} />
                </div>
              </div>
            </Card>

            {/* Slide-in result (sibling, below the tool card). Slides up on enter, down on close. */}
            {result && (
              <div
                className={clsx(
                  'mcp-slide-panel',
                  resultVisible ? 'mcp-slide-in' : 'mcp-slide-out'
                )}
                data-testid="tool-result-slot"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Invocation result</span>
                  <button
                    onClick={closeResult}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-dark-700/60 border border-dark-700"
                    data-testid="dismiss-result"
                  >
                    <X className="w-3 h-3" /> Close
                  </button>
                </div>
                <ResultPanel ok={result.ok} data={result.data} error={result.error} ms={result.ms} kind="tool" />
              </div>
            )}

            <style>{`
              .mcp-slide-panel {
                transform: translateY(24px);
                opacity: 0;
                transition: transform 280ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease-out;
              }
              .mcp-slide-in  { transform: translateY(0);    opacity: 1; }
              .mcp-slide-out { transform: translateY(24px); opacity: 0; }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}

/** Build a friendly scaffold object from a JSON-schema-like inputSchema. */
function buildScaffold(schema) {
  if (!schema || schema.type !== 'object' || !schema.properties) return {};
  const out = {};
  const required = new Set(schema.required || []);
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (!required.has(key)) continue;
    switch (prop.type) {
      case 'string':  out[key] = ''; break;
      case 'number':
      case 'integer': out[key] = 0;  break;
      case 'boolean': out[key] = false; break;
      case 'array':   out[key] = []; break;
      case 'object':  out[key] = {}; break;
      default:        out[key] = null;
    }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Resources                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function ResourcesExplorer({ serverRef, connected }) {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState(null);
  const [reading, setReading] = useState(false);
  const [query, setQuery] = useState('');
  const [uriOverride, setUriOverride] = useState('');

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const [lr, lt] = await Promise.allSettled([mcpListResources(serverRef), mcpListResourceTemplates(serverRef)]);
      const resList = lr.status === 'fulfilled' ? (lr.value.data?.resources || lr.value.data?.items || []) : [];
      const tplList = lt.status === 'fulfilled' ? (lt.value.data?.resourceTemplates || lt.value.data?.items || []) : [];
      setResources(resList);
      setTemplates(tplList);
      setSelected(prev => prev && resList.find(r => r.uri === prev.uri) ? prev : resList[0] || null);
    } catch (err) {
      toast.error('Failed to list resources');
    } finally { setLoading(false); }
  }, [serverRef, connected]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selected) setUriOverride(selected.uri || ''); setContent(null); }, [selected]);

  const filtered = useMemo(() => {
    if (!query.trim()) return resources;
    const q = query.toLowerCase();
    return resources.filter(r => (r.uri || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q));
  }, [resources, query]);

  const handleRead = async () => {
    const uri = uriOverride || selected?.uri;
    if (!uri) return;
    setReading(true);
    try {
      const { data } = await mcpReadResource({ ...serverRef, uri });
      if (data && data._success === false) {
        setContent({ ok: false, data: { message: data._raw?.error_message || 'Read failed', status: data._statusCode } });
        toast.error(data._raw?.error_message || 'Read failed');
      } else {
        setContent({ ok: true, data });
      }
    } catch (err) {
      setContent({ ok: false, data: err.response?.data || { message: err.message } });
      toast.error('Read failed');
    } finally { setReading(false); }
  };

  if (!connected) {
    return <Card><CardBody><EmptyState icon={FileStack} title="Not connected" /></CardBody></Card>;
  }

  return (
    <div className="h-full grid grid-cols-12 gap-3 min-h-0">
      <Card className="col-span-12 md:col-span-4 flex flex-col min-h-0 overflow-hidden">
        <div className="p-2 border-b border-dark-700/60 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              value={query} onChange={e => setQuery(e.target.value)} placeholder="Search resources…"
              className="w-full bg-probestack-bg border border-dark-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <button onClick={load} className="p-1.5 rounded hover:bg-dark-700 text-gray-400 hover:text-white">
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? <LoadingBlock label="Listing…" /> :
            filtered.length === 0 ? <EmptyState icon={FileStack} title="No resources" /> : (
              <ul className="p-1.5 space-y-0.5">
                {filtered.map(r => {
                  const active = selected?.uri === r.uri;
                  return (
                    <li key={r.uri}>
                      <button
                        onClick={() => setSelected(r)}
                        className={clsx(
                          'w-full text-left px-2.5 py-2 rounded-md transition-colors',
                          active ? 'bg-primary/10 border border-primary/30' : 'border border-transparent hover:bg-dark-700/50'
                        )}
                      >
                        <div className="text-xs font-mono truncate text-gray-200">{r.name || r.uri}</div>
                        <div className="text-xs text-gray-500 font-mono truncate mt-0.5">{r.uri}</div>
                        {r.mimeType && <div className="text-xs text-gray-500 mt-0.5">{r.mimeType}</div>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </div>
        {templates.length > 0 && (
          <div className="border-t border-dark-700/60 p-2">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Templates</div>
            <ul className="space-y-0.5">
              {templates.map(t => (
                <li key={t.uriTemplate || t.name} className="px-2 py-1.5 rounded hover:bg-dark-700/40 text-xs text-gray-400 font-mono truncate" title={t.uriTemplate}>
                  <span className="text-primary mr-1">→</span>{t.uriTemplate || t.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="col-span-12 md:col-span-8 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        <Card>
          <div className="p-3 flex items-center gap-2">
            <TextInput
              value={uriOverride}
              onChange={e => setUriOverride(e.target.value)}
              placeholder="resource://… URI"
              className="flex-1"
            />
            <Button variant="primary" icon={Download} onClick={handleRead} loading={reading}>Read</Button>
          </div>
        </Card>
        {content ? (
          <ResultPanel ok={content.ok} data={content.data} error={content.ok ? null : content.data} kind="resource" />
        ) : (
          <Card><div className="p-3"><EmptyState icon={FileStack} title="No content yet" description="Click Read to fetch resource content." /></div></Card>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Prompts                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function PromptsExplorer({ serverRef, connected }) {
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [args, setArgs] = useState('{\n  \n}');
  const [result, setResult] = useState(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState('');

  const closeResult = () => {
    setResultVisible(false);
    setTimeout(() => setResult(null), 260);
  };

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const { data } = await mcpListPrompts(serverRef);
      const list = data?.prompts || data?.items || [];
      setPrompts(list);
      setSelected(prev => prev && list.find(p => p.name === prev.name) ? prev : list[0] || null);
    } catch (err) { toast.error('Failed to list prompts'); }
    finally { setLoading(false); }
  }, [serverRef, connected]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    const scaffold = {};
    (selected.arguments || []).forEach(a => { if (a.required) scaffold[a.name] = ''; });
    setArgs(prettify(JSON.stringify(scaffold)));
    setResult(null); setResultVisible(false);
  }, [selected]);

  const filtered = useMemo(() => {
    if (!query.trim()) return prompts;
    const q = query.toLowerCase();
    return prompts.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }, [prompts, query]);

  const handleGet = async () => {
    if (!selected) return;
    let parsed = {};
    if (args.trim()) { try { parsed = JSON.parse(args); } catch { toast.error('Arguments must be valid JSON'); return; } }
    setRunning(true);
    try {
      const { data } = await mcpGetPrompt({ ...serverRef, prompt_name: selected.name, arguments: parsed });
      if (data && data._success === false) {
        setResult({ ok: false, data: { message: data._raw?.error_message || 'Prompt call failed', status: data._statusCode } });
        toast.error(data._raw?.error_message || 'Prompt call failed');
      } else {
        setResult({ ok: true, data });
      }
      requestAnimationFrame(() => setResultVisible(true));
    } catch (err) {
      setResult({ ok: false, data: err.response?.data || { message: err.message } });
      requestAnimationFrame(() => setResultVisible(true));
    } finally { setRunning(false); }
  };

  if (!connected) return <Card><CardBody><EmptyState icon={Sparkles} title="Not connected" /></CardBody></Card>;

  return (
    <div className="h-full grid grid-cols-12 gap-3 min-h-0">
      <Card className="col-span-12 md:col-span-4 flex flex-col min-h-0 overflow-hidden">
        <div className="p-2 border-b border-dark-700/60 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search prompts…"
              className="w-full bg-probestack-bg border border-dark-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
          <button onClick={load} className="p-1.5 rounded hover:bg-dark-700 text-gray-400 hover:text-white">
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? <LoadingBlock label="Listing prompts…" /> :
            filtered.length === 0 ? <EmptyState icon={Sparkles} title="No prompts" /> : (
              <ul className="p-1.5 space-y-0.5">
                {filtered.map(p => {
                  const active = selected?.name === p.name;
                  return (
                    <li key={p.name}>
                      <button onClick={() => setSelected(p)}
                        className={clsx('w-full text-left px-2.5 py-2 rounded-md transition-colors',
                          active ? 'bg-primary/10 border border-primary/30' : 'border border-transparent hover:bg-dark-700/50')}>
                        <div className="text-xs font-mono truncate text-gray-200">{p.name}</div>
                        {p.description && <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{p.description}</div>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </div>
      </Card>

      <div className="col-span-12 md:col-span-8 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        {!selected ? (
          <Card><CardBody><EmptyState icon={Sparkles} title="Pick a prompt" /></CardBody></Card>
        ) : (
          <>
            <Card>
              <div className="p-4 border-b border-dark-700/60 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white font-mono">{selected.name}</h3>
                  {selected.description && <p className="text-xs text-gray-400 mt-1">{selected.description}</p>}
                  {selected.arguments?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selected.arguments.map(a => (
                        <span key={a.name} className="px-1.5 py-0.5 rounded bg-dark-700 text-xs font-mono text-gray-300">
                          {a.name}{a.required && <span className="text-primary ml-1">*</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="primary" icon={ArrowRight} onClick={handleGet} loading={running}>Get prompt</Button>
              </div>
              <div className="p-4">
                <JsonEditor label="Arguments" value={args} onChange={setArgs} rows={8} />
              </div>
            </Card>
            {result && (
              <div className={clsx('mcp-slide-panel', resultVisible ? 'mcp-slide-in' : 'mcp-slide-out')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Prompt result</span>
                  <button
                    onClick={closeResult}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-dark-700/60 border border-dark-700"
                  >
                    <X className="w-3 h-3" /> Close
                  </button>
                </div>
                <ResultPanel ok={result.ok} data={result.data} error={result.ok ? null : result.data} kind="prompt" />
              </div>
            )}
            <style>{`
              .mcp-slide-panel {
                transform: translateY(24px);
                opacity: 0;
                transition: transform 280ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease-out;
              }
              .mcp-slide-in  { transform: translateY(0);    opacity: 1; }
              .mcp-slide-out { transform: translateY(24px); opacity: 0; }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Benchmark                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function BenchmarkPanel({ serverRef, connected }) {
  const [toolName, setToolName] = useState('');
  const [args, setArgs] = useState('{\n  \n}');
  const [iterations, setIterations] = useState(20);
  const [concurrency, setConcurrency] = useState(4);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    let parsedArgs = {};
    if (args.trim()) { try { parsedArgs = JSON.parse(args); } catch { toast.error('Arguments must be valid JSON'); return; } }
    setRunning(true);
    try {
      const { data } = await mcpBenchmark({
        ...serverRef,
        tool_name: toolName || null,
        arguments: parsedArgs,
        iterations: Number(iterations) || 1,
        concurrency: Number(concurrency) || 1,
      });
      setResult(data);
      toast.success('Benchmark complete');
    } catch (err) {
      toast.error('Benchmark failed');
    } finally { setRunning(false); }
  };

  if (!connected) return <Card><CardBody><EmptyState icon={Gauge} title="Not connected" /></CardBody></Card>;

  return (
    <div className="grid grid-cols-12 gap-3 h-full min-h-0">
      <Card className="col-span-12 lg:col-span-5">
        <CardBody>
          <div className="space-y-3">
            <Field label="Tool name" hint="Leave empty to benchmark ping() instead.">
              <TextInput value={toolName} onChange={e => setToolName(e.target.value)} placeholder="e.g. search_issues" />
            </Field>
            <JsonEditor label="Arguments" value={args} onChange={setArgs} rows={6} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Iterations">
                <TextInput type="number" value={iterations} onChange={e => setIterations(e.target.value)} min={1} max={10000} />
              </Field>
              <Field label="Concurrency">
                <TextInput type="number" value={concurrency} onChange={e => setConcurrency(e.target.value)} min={1} max={64} />
              </Field>
            </div>
            <Button variant="primary" icon={Gauge} onClick={handleRun} loading={running} className="w-full justify-center">Run benchmark</Button>
          </div>
        </CardBody>
      </Card>
      <Card className="col-span-12 lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-dark-700/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Stats</span>
        </div>
        <div className="flex-1 p-4 overflow-auto custom-scrollbar">
          {!result ? <EmptyState icon={Gauge} title="No run yet" description="Configure and run a benchmark to see latency distribution." /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Iterations" value={result.iterations ?? result.total} />
                <Stat label="Success"    value={result.success_count ?? result.successCount ?? result.success} tone="success" />
                <Stat label="Failures"   value={result.failure_count ?? result.failureCount ?? result.errors ?? result.errorCount ?? 0}
                                          tone={((result.failure_count ?? result.failureCount ?? result.errors ?? 0) > 0) ? 'error' : 'muted'} />
                <Stat label="Total (ms)" value={fmt(result.total_ms ?? result.totalMs)} />
                <Stat label="Mean (ms)"  value={fmt(result.mean_ms ?? result.meanMs ?? result.avgMs ?? result.avg)} />
                <Stat label="P50 (ms)"   value={fmt(result.p50_ms ?? result.p50Ms ?? result.p50)} />
                <Stat label="P95 (ms)"   value={fmt(result.p95_ms ?? result.p95Ms ?? result.p95)} />
                <Stat label="P99 (ms)"   value={fmt(result.p99_ms ?? result.p99Ms ?? result.p99)} />
                <Stat label="Min (ms)"   value={fmt(result.min_ms ?? result.minMs ?? result.min)} />
                <Stat label="Max (ms)"   value={fmt(result.max_ms ?? result.maxMs ?? result.max)} />
                <Stat label="Throughput" value={fmt(result.throughput_per_sec ?? result.throughput) + ' /s'} />
                <Stat label="Concurrency" value={result.concurrency} />
              </div>
              {Array.isArray(result.error_samples) && result.error_samples.length > 0 && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
                  <div className="text-xs font-semibold text-red-300 mb-1.5">Error samples ({result.error_samples.length})</div>
                  <ul className="space-y-1 text-xs font-mono text-red-200 list-disc list-inside">
                    {result.error_samples.slice(0, 6).map((e, i) => <li key={i} className="truncate">{e}</li>)}
                  </ul>
                </div>
              )}
              <JsonViewer data={result} title="raw result" maxHeight={340} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone = 'default' }) {
  const color = {
    default: 'text-white',
    muted:   'text-gray-300',
    success: 'text-emerald-300',
    error:   'text-red-300',
  }[tone];
  return (
    <div className="rounded-lg border border-dark-700/60 bg-dark-900/50 p-3">
      <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      <div className={clsx('mt-1 text-lg font-semibold font-mono', color)}>{value ?? '—'}</div>
    </div>
  );
}

function fmt(n) {
  if (n == null || Number.isNaN(+n)) return '—';
  const num = +n;
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}
