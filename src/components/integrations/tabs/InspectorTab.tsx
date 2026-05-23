/**
 * InspectorTab — connect to an MCP server, list tools / resources /
 * prompts, and call them with a JSON-arg editor + schema validation.
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Plug, PlugZap, Wrench, FileText, MessageSquare, Send, Loader2,
  AlertTriangle, CheckCircle2, ChevronDown, ArrowRight, History as ClockHistoryIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { MonacoEditor as CodeEditor } from '@/components/editor/MonacoEditor';
import {
  listServers, connect, disconnect, listTools, callTool,
  listResources, readResource, listPrompts, validateTool,
  getSettings,
  type McpServer, type McpTool, type McpResource,
} from '@/services/mcp.service';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import { cn } from '@/utils/cn';
import { ToolAuditTrail } from '@/components/integrations/parts/ToolAuditTrail';

type SubTab = 'tools' | 'resources' | 'prompts';

export const InspectorTab = () => {
  const activeServerId = useMcpStudioStore((s) => s.activeServerId);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);
  const setTab = useMcpStudioStore((s) => s.setTab);

  const { data: servers = [] } = useQuery({ queryKey: ['mcp-servers'], queryFn: () => listServers() });
  const { data: settings } = useQuery({ queryKey: ['mcp-settings'], queryFn: getSettings });

  const server = servers.find((s) => s.id === activeServerId);

  const [sub, setSub] = useState<SubTab>('tools');
  const [session, setSession] = useState<{ sessionId: string; capabilities: any; serverInfo: any } | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  // Tools state
  const [tools, setTools] = useState<McpTool[]>([]);
  const [toolFallback, setToolFallback] = useState(false);
  const [pickedTool, setPickedTool] = useState<McpTool | null>(null);
  const [args, setArgs] = useState('{\n  \n}');
  const [callRes, setCallRes] = useState<any>(null);
  const [callMs, setCallMs] = useState<number | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Resources / prompts state — track per-section status so the UI can
  // tell the user *why* a section is empty: not-supported by the server,
  // request error, or genuinely zero items.
  const [resources, setResources] = useState<McpResource[]>([]);
  const [pickedResource, setPickedResource] = useState<McpResource | null>(null);
  const [resourceContent, setResourceContent] = useState('');
  const [resourcesState, setResourcesState] = useState<'idle' | 'loading' | 'unsupported' | 'error' | 'ok'>('idle');
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [promptsState, setPromptsState] = useState<'idle' | 'loading' | 'unsupported' | 'error' | 'ok'>('idle');
  const [promptsError, setPromptsError] = useState<string | null>(null);

  useEffect(() => {
    setSession(null); setTools([]); setPickedTool(null); setCallRes(null);
    setResources([]); setPickedResource(null); setResourceContent(''); setPrompts([]);
    setResourcesState('idle'); setResourcesError(null);
    setPromptsState('idle');  setPromptsError(null);
  }, [activeServerId]);

  // Auto-connect if the user has the setting enabled.
  useEffect(() => {
    if (settings?.autoConnect && server && !session && !busy) {
      void doConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id, settings?.autoConnect]);

  if (!server) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center" data-testid="inspector-no-server">
        <div className="max-w-md">
          <Activity className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <h4 className="text-sm font-semibold">No active server</h4>
          <p className="mt-1 text-xs text-text-muted">
            Pick a server from the <strong>Servers</strong> tab and click <strong>Use</strong>.
          </p>
          <Button variant="primary" className="mt-3" data-testid="inspector-go-servers" onClick={() => setTab('servers')}>
            <ArrowRight className="h-3.5 w-3.5" /> Browse servers
          </Button>
        </div>
      </div>
    );
  }

  /* When the active server is a mock, its id does NOT exist in the
   * real-server repository that backend's session manager queries —
   * passing `serverId` would fail with "Unknown serverId". Mocks are
   * reachable through their in-process JSON-RPC endpoint already
   * baked into `server.serverUrl` by apiListMcpServers, so ref by URL
   * for mocks and by id for everyone else. */
  const ref: any = (server as any).isMock || (server as any).source === 'MOCK'
    ? { serverUrl: (server as any).serverUrl, transport: (server as any).transport ?? 'STREAMABLE_HTTP' }
    : { serverId: server.id };

  const doConnect = async () => {
    setBusy(true);
    try {
      const c = await connect(ref);
      setSession(c);
      // auto-list tools
      const t = await listTools(ref);
      const safe = Array.isArray(t?.tools) ? t.tools : [];
      setTools(safe); setToolFallback(!!t?.fallback);
      // Auto-list resources and prompts in parallel. We honour the server's
      // declared capability map first (received in the `initialize`
      // handshake) so we never hit /resources/list on a server that doesn't
      // support it (DeepWiki, for instance, exposes only `tools`). When the
      // capability is present we still wrap the call so an upstream
      // MethodNotFound (-32601) is reported as "unsupported" rather than an
      // opaque error toast.
      const caps = c?.capabilities ?? {};
      const supportsResources = caps?.resources != null;
      const supportsPrompts   = caps?.prompts   != null;
      const isMethodNotFound  = (err: any) => {
        const msg = (err?.message ?? String(err ?? '')).toLowerCase();
        return msg.includes('-32601')
            || msg.includes('method not found')
            || msg.includes('not implemented')
            || msg.includes('unsupported');
      };

      if (supportsResources) {
        setResourcesState('loading');
        listResources(ref).then((r) => {
          setResources(Array.isArray(r?.resources) ? r.resources : []);
          setResourcesState('ok');
        }).catch((err) => {
          if (isMethodNotFound(err)) setResourcesState('unsupported');
          else { setResourcesState('error'); setResourcesError(err?.message ?? 'Failed to list resources'); }
        });
      } else {
        setResourcesState('unsupported');
      }

      if (supportsPrompts) {
        setPromptsState('loading');
        listPrompts(ref).then((r) => {
          setPrompts(Array.isArray(r?.prompts) ? r.prompts : []);
          setPromptsState('ok');
        }).catch((err) => {
          if (isMethodNotFound(err)) setPromptsState('unsupported');
          else { setPromptsState('error'); setPromptsError(err?.message ?? 'Failed to list prompts'); }
        });
      } else {
        setPromptsState('unsupported');
      }
      qc.invalidateQueries({ queryKey: ['mcp-history'] });
      toast.success(`Connected — ${safe.length} tools`);
    } catch (e: any) { toast.error(e?.message ?? 'Connect failed'); }
    finally { setBusy(false); }
  };

  const doDisconnect = async () => {
    if (!session) return;
    try {
      await disconnect(ref);
    } catch (e: any) {
      /* Non-blocking — worst case the session is already gone server-side. */
      console.warn('[MCP] disconnect failed:', e?.message);
    }
    setSession(null); setTools([]); setPickedTool(null);
    toast.success('Disconnected');
  };

  const doCall = async () => {
    if (!pickedTool) return;
    let parsed: any = {};
    try { parsed = args.trim() ? JSON.parse(args) : {}; } catch { toast.error('Arguments must be valid JSON'); return; }
    // schema validate first — pass `ref` so the backend can resolve
    // the connected session and not return "Tool not found on server".
    const v = await validateTool(ref, pickedTool.name, parsed, pickedTool.inputSchema || {});
    setValidation({ valid: v.valid, errors: v.errors });
    if (!v.valid) return;
    setBusy(true);
    try {
      const r = await callTool(ref, pickedTool.name, parsed);
      setCallRes(r.result); setCallMs(r.ms);
      qc.invalidateQueries({ queryKey: ['mcp-history'] });
      toast.success(`${pickedTool.name} → ${r.ms}ms`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Tool call failed');
      /* Fire global chatbot error mode for MCP tool failures. */
      try {
        const { useChatbot } = await import('@/stores/chatbot.store');
        useChatbot.getState().triggerError({
          location: 'MCP tool call',
          method: 'TOOL',
          url: `${ref}::${pickedTool.name}`,
          errorMessage: e?.message ?? 'Tool call failed',
          body: typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed ?? ''),
        });
      } catch { /* swallow */ }
    }
    finally { setBusy(false); }
  };

  const doListResources = async () => {
    setBusy(true);
    try {
      const r = await listResources(ref);
      setResources(Array.isArray(r?.resources) ? r.resources : []);
      qc.invalidateQueries({ queryKey: ['mcp-history'] });
    } catch (e: any) {
      setResources([]);
      toast.error(e?.message ?? 'Failed to list resources');
    } finally { setBusy(false); }
  };

  const doReadResource = async (r: McpResource) => {
    setPickedResource(r);
    try {
      const x = await readResource(ref, r.uri);
      setResourceContent((x?.contents?.[0]?.text) ?? '');
    } catch (e: any) {
      setResourceContent('');
      toast.error(e?.message ?? 'Failed to read resource');
    }
  };

  const doListPrompts = async () => {
    setBusy(true);
    try {
      const r = await listPrompts(ref);
      setPrompts(Array.isArray(r?.prompts) ? r.prompts : []);
    } catch (e: any) {
      setPrompts([]);
      toast.error(e?.message ?? 'Failed to list prompts');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mcp-inspector-tab">
      {/* Connect bar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Server</span>
        <div className="relative">
          <select
            data-testid="inspector-server-picker"
            value={server.id}
            onChange={(e) => setActiveServer(e.target.value)}
            className="h-7 max-w-[420px] appearance-none rounded-md border border-border bg-probestack-bg px-2 pr-7 font-mono text-xs text-text-primary outline-none hover:border-primary/40 focus:border-primary"
          >
            {servers.map((s: McpServer) => <option key={s.id} value={s.id}>{s.name} — {s.serverUrl}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
        </div>
        <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs text-text-secondary">{server.transport}</span>
        <span className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              <span className="rounded bg-success-muted px-1.5 py-0.5 text-xs font-semibold text-success" data-testid="inspector-session-id">
                {(session?.sessionId ?? '').slice(0, 14)}…
              </span>
              <Button variant="outline" data-testid="inspector-disconnect" onClick={doDisconnect}>
                <Plug className="h-3.5 w-3.5" /> Disconnect
              </Button>
            </>
          ) : (
            <Button variant="primary" data-testid="inspector-connect" onClick={doConnect} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
              Connect
            </Button>
          )}
        </span>
      </div>

      {/* Sub-tabs */}
      <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-surface/40 px-3" data-testid="inspector-subtabs">
        {([
          ['tools', 'Tools', Wrench],
          ['resources', 'Resources', FileText],
          ['prompts', 'Prompts', MessageSquare],
        ] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            data-testid={`inspector-subtab-${k}`}
            onClick={() => {
              setSub(k);
              if (k === 'resources' && resources.length === 0 && session) doListResources();
              if (k === 'prompts' && prompts.length === 0 && session) doListPrompts();
            }}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs transition-colors',
              sub === k ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {!session ? (
        <div className="flex h-full items-center justify-center p-12 text-center" data-testid="inspector-not-connected">
          <div>
            <Plug className="mx-auto mb-2 h-8 w-8 text-text-muted" />
            <p className="text-xs text-text-muted">Click <strong>Connect</strong> to open a session and start inspecting.</p>
          </div>
        </div>
      ) : sub === 'tools' ? (
        <div className="grid h-full grid-cols-[260px_1fr] divide-x divide-border" data-testid="inspector-tools-pane">
          {/* Tools list */}
          <aside className="overflow-y-auto bg-surface/30">
            {toolFallback && (
              <div className="m-2 flex items-start gap-1.5 rounded border border-warning/40 bg-warning-muted p-2 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Upstream unreachable — showing canned tools so the UI stays driveable.
              </div>
            )}
            {tools.length === 0 && <Skeleton className="m-3 h-32" />}
            {tools.map((t) => (
              <button
                key={t.name}
                data-testid={`tool-row-${t.name}`}
                onClick={() => { setPickedTool(t); setCallRes(null); setValidation(null); seedArgs(t, setArgs); }}
                className={cn(
                  'flex w-full items-start gap-2 border-b border-border/40 px-3 py-2 text-left text-xs transition-colors',
                  pickedTool?.name === t.name ? 'bg-primary-muted text-primary' : 'hover:bg-hover',
                )}
              >
                <Wrench className="mt-0.5 h-3 w-3 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate font-mono font-semibold">{t.name}</div>
                  <div className="truncate text-xs text-text-muted">{t.description ?? '—'}</div>
                </div>
              </button>
            ))}
          </aside>

          {/* Tool runner */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            {!pickedTool ? (
              <div className="flex h-full items-center justify-center text-xs text-text-muted">Pick a tool from the left rail.</div>
            ) : (
              <>
                <div className="border-b border-border bg-surface/40 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-text-primary">{pickedTool.name}</span>
                    {pickedTool.inputSchema?.required && Array.isArray(pickedTool.inputSchema.required) && (
                      <span className="rounded bg-warning-muted px-1 text-[11px] font-bold text-warning">
                        requires: {(pickedTool.inputSchema.required as string[]).join(', ')}
                      </span>
                    )}
                    <button
                      data-testid="inspector-tool-audit"
                      onClick={() => setShowAudit((v) => !v)}
                      className="ml-auto flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs hover:bg-hover/40"
                      title="Show recent calls of this tool"
                    >
                      <ClockHistoryIcon className="h-3 w-3" /> Audit trail
                    </button>
                  </div>
                  {pickedTool.description && <p className="mt-1 text-xs text-text-muted">{pickedTool.description}</p>}
                  {showAudit && server && (
                    <ToolAuditTrail serverId={server.id} toolName={pickedTool.name} />
                  )}
                </div>
                <div className="grid h-full min-h-0 grid-rows-[1fr_auto_1fr] divide-y divide-border">
                  {/* Args editor */}
                  <div className="flex min-h-0 flex-col overflow-hidden p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Arguments (JSON)</span>
                      <Button variant="primary" data-testid="inspector-tool-call" onClick={doCall} disabled={busy}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Call tool
                      </Button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden rounded border border-border">
                      <CodeEditor value={args} onChange={setArgs} language="json" testId="inspector-tool-args" />
                    </div>
                  </div>

                  {/* Validation strip */}
                  <div className="px-3 py-1.5 text-xs">
                    {validation && (
                      validation.valid
                        ? <span data-testid="inspector-validation-ok" className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Arguments validate against tool schema</span>
                        : <span data-testid="inspector-validation-fail" className="flex items-center gap-1 text-danger"><AlertTriangle className="h-3 w-3" /> {validation.errors.join(' · ')}</span>
                    )}
                  </div>

                  {/* Result */}
                  <div className="flex min-h-0 flex-col overflow-hidden p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Result</span>
                      {callMs != null && <span className="font-mono text-xs text-text-muted">{callMs}ms</span>}
                      {callRes && (callRes as any).isError && (
                        <span className="rounded bg-danger-muted px-1.5 py-0.5 text-xs font-semibold text-danger" data-testid="inspector-tool-result-iserror">
                          tool reported error
                        </span>
                      )}
                    </div>
                    <ToolResultView result={callRes} testIdPrefix="inspector-tool" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : sub === 'resources' ? (
        <div className="grid h-full grid-cols-[260px_1fr] divide-x divide-border" data-testid="inspector-resources-pane">
          <aside className="overflow-y-auto bg-surface/30">
            {resourcesState === 'loading' && (
              <div className="flex items-center justify-center gap-1.5 p-6 text-xs text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading resources…
              </div>
            )}
            {resourcesState === 'unsupported' && (
              <div className="p-5 text-center text-xs text-text-muted" data-testid="resources-unsupported">
                <FileText className="mx-auto mb-1.5 h-5 w-5 opacity-50" />
                Server does not expose <span className="font-semibold">resources/list</span>.
              </div>
            )}
            {resourcesState === 'error' && (
              <div className="p-5 text-center text-xs text-danger" data-testid="resources-error">
                <AlertTriangle className="mx-auto mb-1.5 h-5 w-5" />
                {resourcesError}
              </div>
            )}
            {resourcesState === 'ok' && resources.length === 0 && (
              <div className="p-6 text-center text-xs text-text-muted">No resources.</div>
            )}
            {resources.map((r) => (
              <button key={r.uri} data-testid={`resource-row-${r.uri}`} onClick={() => doReadResource(r)}
                      className={cn('flex w-full items-start gap-2 border-b border-border/40 px-3 py-2 text-left text-xs transition-colors',
                        pickedResource?.uri === r.uri ? 'bg-primary-muted text-primary' : 'hover:bg-hover')}>
                <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.name ?? r.uri}</div>
                  <div className="truncate font-mono text-xs text-text-muted">{r.uri}</div>
                </div>
              </button>
            ))}
          </aside>
          <div className="overflow-hidden p-3">
            {!pickedResource ? (
              <div className="flex h-full items-center justify-center text-xs text-text-muted">
                {resourcesState === 'unsupported'
                  ? 'This MCP server only exposes tools — try the Tools tab.'
                  : 'Pick a resource to read it.'}
              </div>
            ) : (
              <div className="h-full overflow-hidden rounded border border-border">
                <CodeEditor value={resourceContent} onChange={() => {}} language="text" readOnly testId="inspector-resource-content" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto p-4" data-testid="inspector-prompts-pane">
          {promptsState === 'loading' && (
            <div className="flex items-center justify-center gap-1.5 p-6 text-xs text-text-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading prompts…
            </div>
          )}
          {promptsState === 'unsupported' && (
            <div className="rounded border border-dashed border-border bg-surface/20 p-6 text-center text-xs text-text-muted" data-testid="prompts-unsupported">
              <MessageSquare className="mx-auto mb-1.5 h-5 w-5 opacity-50" />
              Server does not expose <span className="font-semibold">prompts/list</span>.
              <div className="mt-1 opacity-70">Most documentation/lookup MCP servers (DeepWiki, Sequential-Thinking, …) only ship tools.</div>
            </div>
          )}
          {promptsState === 'error' && (
            <div className="rounded border border-danger/40 bg-danger-muted p-4 text-center text-xs text-danger" data-testid="prompts-error">
              <AlertTriangle className="mx-auto mb-1.5 h-5 w-5" />
              {promptsError}
            </div>
          )}
          {promptsState === 'ok' && prompts.length === 0 && (
            <div className="text-center text-xs text-text-muted">No prompts.</div>
          )}
          {prompts.map((p) => (
            <div key={p.name} className="mb-2 rounded border border-border bg-surface/30 p-3">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-sm font-semibold">{p.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">{p.description}</p>
              {p.arguments && Array.isArray(p.arguments) && p.arguments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.arguments.map((a: any) => (
                    <span key={a.name} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">
                      {a.name}{a.required ? ' *' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const seedArgs = (tool: McpTool, set: (s: string) => void) => {
  const props = (tool.inputSchema?.properties as Record<string, any>) ?? {};
  const rawRequired = tool.inputSchema?.required;
  const required: string[] = Array.isArray(rawRequired) ? rawRequired : [];
  const seed: Record<string, any> = {};
  for (const k of required) {
    const t = props[k]?.type;
    seed[k] = t === 'integer' || t === 'number' ? 0 : t === 'boolean' ? false : t === 'array' ? [] : '';
  }
  set(JSON.stringify(seed, null, 2));
};

/* ─────────────────────────────────────────────────────────────────────── */
/*                       Friendly tool-result renderer                      */
/*                                                                          */
/*  MCP `tools/call` responses come in a structured envelope:               */
/*    { content: [{type:'text', text:'...'}, ...],                          */
/*      structuredContent?: any, isError?: bool, ms?, fallback?, error? }   */
/*                                                                          */
/*  The user just wants to see the message — not the wire envelope. We      */
/*  surface the `text` parts as the headline, fall back to                  */
/*  `structuredContent.result`, then to a JSON dump of the structured        */
/*  payload, and keep a collapsible "Raw JSON" pane for the curious.        */
/* ─────────────────────────────────────────────────────────────────────── */

const ToolResultView = ({
  result, testIdPrefix,
}: { result: any; testIdPrefix: string }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (result == null || (typeof result === 'object' && Object.keys(result).length === 0)) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded border border-dashed border-border bg-surface/20 text-xs text-text-muted"
           data-testid={`${testIdPrefix}-result-empty`}>
        Press <span className="mx-1 rounded bg-elevated px-1.5 py-0.5 font-mono">Call tool</span> to see the response.
      </div>
    );
  }

  // Try to pluck human-readable text from the MCP envelope.
  const textParts: string[] = [];
  // CodeEditor's CodeLanguage union doesn't include 'plaintext' / 'markdown';
  // map to the closest supported language so the response renders without a
  // TS error. Markdown gets shown as plain `text`, JSON as `json`.
  let language: 'json' | 'text' = 'text';

  if (Array.isArray(result?.content)) {
    for (const c of result.content) {
      if (!c) continue;
      if (c.type === 'text' && typeof c.text === 'string') textParts.push(c.text);
      else if (c.type === 'resource' && c.resource?.text) textParts.push(c.resource.text);
      else if (c.type === 'image') textParts.push(`[image: ${c.mimeType ?? 'unknown'}]`);
    }
  }

  let bodyText: string;
  if (textParts.length > 0) {
    bodyText = textParts.join('\n\n');
    // JSON-looking responses get json highlighting; everything else
    // (markdown, plain text, etc.) renders as `text` to stay inside
    // the CodeLanguage union accepted by CodeEditor.
    if (bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[')) language = 'json';
    else language = 'text';
  } else if (result?.structuredContent?.result !== undefined) {
    const sv = result.structuredContent.result;
    bodyText = typeof sv === 'string' ? sv : JSON.stringify(sv, null, 2);
    language = typeof sv === 'string' ? 'text' : 'json';
  } else if (result?.structuredContent !== undefined) {
    bodyText = JSON.stringify(result.structuredContent, null, 2);
    language = 'json';
  } else {
    bodyText = JSON.stringify(result, null, 2);
    language = 'json';
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="min-h-0 flex-1 overflow-hidden rounded border border-border" data-testid={`${testIdPrefix}-result`}>
        <CodeEditor value={bodyText} onChange={() => {}} language={language} readOnly testId={`${testIdPrefix}-result-body`} />
      </div>
      <button
        type="button"
        data-testid={`${testIdPrefix}-result-raw-toggle`}
        onClick={() => setShowRaw((v) => !v)}
        className="self-start text-xs uppercase tracking-wide text-text-muted underline-offset-2 hover:text-text-primary hover:underline"
      >
        {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
      </button>
      {showRaw && (
        <div className="h-32 overflow-hidden rounded border border-border/60">
          <CodeEditor value={JSON.stringify(result, null, 2)} onChange={() => {}} language="json" readOnly testId={`${testIdPrefix}-result-raw`} />
        </div>
      )}
    </div>
  );
};
