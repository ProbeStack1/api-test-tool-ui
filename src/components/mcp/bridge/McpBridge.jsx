// src/components/mcp/bridge/McpBridge.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Network, Play, X, Zap, Clock } from 'lucide-react';
import Card, { CardBody } from '../shared/Card';
import EmptyState from '../shared/EmptyState';
import JsonEditor from '../shared/JsonEditor';
import JsonViewer from '../shared/JsonViewer';
import ServerSelector from '../shared/ServerSelector';
import { Button } from '../shared/Field';
import StatusBadge from '../shared/StatusBadge';
import {
  buildServerRef, mcpListTools, mcpCallTool, getApiRoot,
} from '../../../services/mcpService';
import { USER_ID } from '../../../lib/apiClient';
import { useMCP } from '../MCPContext';

/**
 * MCP ↔ REST Bridge
 * Every saved MCP server + every tool can be invoked via a stable REST POST.
 * This screen helps a developer pick a tool and generate:
 *   - a curl snippet
 *   - a JS fetch snippet
 *   - a quick "try it" runner that actually hits the tool
 *
 * Public endpoint (backend): POST /api/v1/requests/mcp/inspect/tools/call
 * Body: { server_id, tool_name, arguments }
 */
export default function McpBridge({ servers, activeId, setActiveId, workspaceId, onManageServers }) {
  const activeServer = servers.find(s => (s.id || s.serverId) === activeId);
  const serverRef = useMemo(() => buildServerRef({
    serverId: activeId, workspaceId,
    serverUrl: activeServer?.serverUrl, transport: activeServer?.transport,
    authHeaders: activeServer?.authHeaders,
  }), [activeId, workspaceId, activeServer]);

  const [tools, setTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState('');
  const [args, setArgs] = useState('{\n  \n}');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  useEffect(() => {
    if (!activeId) { setTools([]); setSelectedTool(''); return; }
    let cancelled = false;
    (async () => {
      setLoadingTools(true);
      try {
        const { data } = await mcpListTools(serverRef);
        if (cancelled) return;
        const list = data?.tools || data?.items || [];
        setTools(list);
        if (list[0]) setSelectedTool(list[0].name);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoadingTools(false); }
    })();
    return () => { cancelled = true; };
  }, [activeId, serverRef]);

  const base = getApiRoot();
  const endpoint = `${base}/api/v1/requests/mcp/inspect/tools/call`;
  // Parsed argument object (used by the live Try-it runner). Silently falls
  // back to `{}` when the user's JSON is mid-edit / invalid.
  const parsedArgs = useMemo(() => {
    try { return args.trim() ? JSON.parse(args) : {}; } catch { return null; }
  }, [args]);

  // String body for the snippet panel. We interpolate the user's raw args
  // text verbatim so even partially typed / invalid JSON still appears in
  // the generated cURL / Python / etc. — instant "live sync" feel.
  const bodyText = useMemo(() => {
    const argsLiteral = args.trim() ? args : '{}';
    return `{\n  "server_id": ${JSON.stringify(activeId)},\n  "tool_name": ${JSON.stringify(selectedTool)},\n  "arguments": ${argsLiteral}\n}`;
  }, [activeId, selectedTool, args]);

  // Publish this Bridge request to the shared MCP context so the host layout's
  // right-sidebar `</>` CodeSnippetPanel (cURL / JS / Python / Java / HTTPie /
  // Postman CLI / axios …) can generate a snippet for the actual call. Clear
  // on unmount so switching away from the Bridge tab doesn't leak stale data.
  const { setBridgeRequest } = useMCP();
  useEffect(() => {
    setBridgeRequest({
      method: 'POST',
      url: endpoint,
      queryParams: [],
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-User-Id',    value: USER_ID || '$USER_ID', enabled: true },
      ],
      body: bodyText,
      authType: 'none',
      authData: {},
    });
  }, [endpoint, bodyText, setBridgeRequest]);

  // Null-out the bridge request only when this component truly unmounts
  // (e.g. user switches away from the Bridge tab), not on every re-render.
  useEffect(() => () => setBridgeRequest(null), [setBridgeRequest]);

  const handleRun = async () => {
    if (parsedArgs == null) { toast.error('Arguments must be valid JSON'); return; }
    setRunning(true);
    try {
      const start = performance.now();
      const { data } = await mcpCallTool({ ...serverRef, tool_name: selectedTool, arguments: parsedArgs });
      const ms = Math.round(performance.now() - start);
      setResult({ ok: true, data, ms });
      toast.success(`Bridge call ok · ${ms}ms`);
    } catch (err) {
      setResult({ ok: false, data: err.response?.data || { message: err.message }, ms: 0 });
      toast.error('Bridge call failed');
    } finally { setRunning(false); }
  };

  if (!activeId) {
    return (
      <Card><CardBody>
        <EmptyState
          icon={Network}
          title="Pick an MCP server to bridge"
          description="The bridge exposes every MCP tool as a plain REST POST — ideal for GitHub Actions, cron jobs, Zapier or anything that doesn't speak MCP."
          action={<div className="w-full max-w-md"><ServerSelector servers={servers} value={activeId} onChange={setActiveId} onManage={onManageServers} /></div>}
        />
      </CardBody></Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 p-3">
          <div className="min-w-[220px] flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Server</div>
            <ServerSelector servers={servers} value={activeId} onChange={setActiveId} onManage={onManageServers} />
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Tool</div>
            <select
              value={selectedTool}
              onChange={e => setSelectedTool(e.target.value)}
              className="w-full rounded-lg bg-probestack-bg border border-dark-700 px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50"
            >
              {loadingTools ? <option>Loading…</option> :
                tools.length === 0 ? <option value="">(no tools)</option> :
                tools.map(t => <option key={t.name} value={t.name}>{t.name}</option>)
              }
            </select>
          </div>
          <Button variant="primary" icon={Play} loading={running} onClick={handleRun}>Try it</Button>
        </div>
      </Card>

      {/* Payload */}
      <Card>
        <div className="p-3">
          <JsonEditor label="Arguments" value={args} onChange={setArgs} rows={6} />
        </div>
      </Card>

      {/* Parsed response — full width; snippet is rendered in the host
           layout's right-sidebar `</>` Code panel (Bridge publishes the
           request to MCPContext, see effect above). */}
      <div ref={resultRef}>
        {result ? (
          <Card className="animate-in fade-in zoom-in-95 duration-200 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-dark-700/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Parsed response</span>
                <StatusBadge status={result.ok ? 'healthy' : 'unhealthy'} label={result.ok ? 'OK' : 'Error'} size="xs" />
                <span className="text-[12px] text-gray-500 font-mono font-semibold">{selectedTool}</span>
                {result.data?._statusCode != null && (
                  <span className="text-[12px] text-gray-500 font-mono">· HTTP {result.data._statusCode}</span>
                )}
                {(result.data?._latencyMs ?? result.ms) != null && (
                  <span className="text-[12px] text-gray-500 font-mono inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />{result.data?._latencyMs ?? result.ms}ms
                  </span>
                )}
              </div>
              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dark-700/60 hover:border-primary/40 hover:bg-dark-700/50 text-xs text-gray-300 transition-colors">
                <X className="w-3 h-3" /> Close
              </button>
            </div>
            {result.data?._errorMessage && (
              <div className="px-4 py-2 border-b border-dark-700/60 text-xs text-red-400 font-mono">{result.data._errorMessage}</div>
            )}
            <div className="p-3 flex-1 min-h-0">
              <JsonViewer data={stripMeta(result.data)} title="payload" expandDefault maxHeight={360} />
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center min-h-[180px]">
            <div className="text-xs text-gray-500 italic px-4 text-center">
              Click <span className="text-primary font-semibold">Try it</span> to see the parsed response here.
              <div className="mt-1 text-xs text-gray-600">Open the right-sidebar <span className="font-mono text-primary">&lt;/&gt;</span> Code panel to grab this call as cURL, JavaScript, Python, Java, HTTPie and more.</div>
            </div>
          </Card>
        )}
      </div>

      {/* Raw envelope — full width, below both cards, above InfoCard */}
      {result && (
        <Card className="animate-in fade-in duration-200">
          <div className="px-4 py-2.5 border-b border-dark-700/60 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Raw envelope</span>
            <span className="text-[12px] text-gray-500 font-mono">full backend response incl. trace_steps, headers, session_id</span>
          </div>
          <div className="p-3">
            <JsonViewer data={result.data?._raw ?? result.data} title={null} maxHeight={320} />
          </div>
        </Card>
      )}

      <InfoCard />
    </div>
  );
}

/** Drop the internal `_*` meta keys from the unwrapped response so the
 *  Beautified panel shows only the MCP payload. */
function stripMeta(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) if (!k.startsWith('_')) out[k] = v;
  return out;
}

function InfoCard() {
  return (
    <Card>
      <div className="p-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> How the Bridge works
        </h4>
        <ol className="mt-2 space-y-1.5 text-xs text-gray-400 list-decimal list-inside">
          <li>Your saved MCP server keeps a persistent MCP session (STREAMABLE_HTTP / SSE / STDIO).</li>
          <li>When the bridge endpoint is hit, ForgeQ forwards the call as a standard JSON-RPC <code className="px-1 py-0.5 bg-dark-700 rounded">tools/call</code>.</li>
          <li>The MCP response is unwrapped and returned as plain JSON — easy to consume from anything that speaks HTTP.</li>
        </ol>
      </div>
    </Card>
  );
}
