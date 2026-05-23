/**
 * AgentTestingView — interactive agent playground.
 *
 * Matches the senior's reference design exactly:
 *   • 4 protocol chips at top (Built-in · Direct Agent / Google · A2A /
 *     BeeAI · ACP / Anthropic · MCP)
 *   • Tab switcher mirroring the chips
 *   • For Direct Agent: 4 execution modes (single / sequential /
 *     parallel / supervisor) + agent definitions + tool checklist +
 *     temp + max-iterations + Run button → JSON result panel on right
 *   • For A2A: Agent Base URL + Message + auth headers + Discover Card
 *     and Send Task buttons
 *   • For ACP / MCP: similar form per their protocol verbs
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bot, Globe, MessageSquare, Cpu, Play, Plus, Trash2, Loader2, Search, Send, ChevronDown,
  Wrench, ArrowRight, Code2,
} from 'lucide-react';
import {
  fetchCatalog, listAgentTools, runDirectAgent,
  a2aDiscover, a2aSend, acpSend, mcpListTools, mcpCallTool,
  type Catalog, type AgentToolDef, type AgentExecMode, type DirectAgentRunResult,
} from '@/services/aiTesting.service';
import { ExecutionTrace } from './ExecutionTrace';
import { cn } from '@/utils/cn';

type Protocol = 'direct' | 'a2a' | 'acp' | 'mcp';

interface MarketplacePrefill {
  protocol: Protocol;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  baseUrl?: string;
  name?: string;
}

const PROTOCOLS: { id: Protocol; label: string; sub: string; icon: any; chip: string; chipText: string }[] = [
  { id: 'direct', label: 'Direct Agent', sub: 'ReAct loop, multi-agent orchestration',
    icon: Bot, chip: 'bg-orange-100 dark:bg-orange-500/15', chipText: 'text-orange-600 dark:text-orange-300' },
  { id: 'a2a',    label: 'A2A Protocol', sub: 'Agent-to-Agent via HTTP',
    icon: Globe, chip: 'bg-purple-100 dark:bg-purple-500/15', chipText: 'text-purple-600 dark:text-purple-300' },
  { id: 'acp',    label: 'ACP Protocol', sub: 'Agent Communication Protocol (BeeAI)',
    icon: MessageSquare, chip: 'bg-teal-100 dark:bg-teal-500/15', chipText: 'text-teal-600 dark:text-teal-300' },
  { id: 'mcp',    label: 'MCP Protocol', sub: 'Model Context Protocol (Anthropic)',
    icon: Cpu, chip: 'bg-emerald-100 dark:bg-emerald-500/15', chipText: 'text-emerald-600 dark:text-emerald-300' },
];

export const AgentTestingView = ({ workspaceId }: { workspaceId: string }) => {
  const [params, setParams] = useSearchParams();
  const [proto, setProto]   = useState<Protocol>((params.get('proto') as Protocol) || 'direct');
  const [prefill, setPrefill] = useState<MarketplacePrefill | null>(null);

  // Read marketplace prefill (set by AgentMarketplaceView) once on mount.
  useEffect(() => {
    const raw = sessionStorage.getItem('forgeq:marketplace:prefill');
    if (!raw) return;
    try {
      const p: MarketplacePrefill = JSON.parse(raw);
      setPrefill(p);
      setProto(p.protocol);
      toast.success(`Loaded "${p.name}" — adjust + Run`, { duration: 3000 });
    } catch { /* ignore */ }
    sessionStorage.removeItem('forgeq:marketplace:prefill');
  }, []);

  const switchProto = (p: Protocol) => {
    setProto(p);
    const next = new URLSearchParams(params);
    next.set('proto', p);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5 p-6" data-testid="ai-testing-agent-playground">
      <div>
        <h2 className="text-2xl font-semibold">Agent Testing</h2>
        <p className="text-sm text-text-muted">
          Test internal and external agents via A2A, ACP, MCP, and direct execution protocols
        </p>
      </div>

      {/* ─── Protocol chips ─── */}
      <div className="flex flex-wrap gap-2">
        {PROTOCOLS.map((p) => (
          <span
            key={p.id}
            className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold',
              p.chip, p.chipText)}
          >
            {p.id === 'direct' ? 'Built-in' : p.id === 'a2a' ? 'Google' : p.id === 'acp' ? 'BeeAI' : 'Anthropic'}
            <span className="opacity-50">·</span>
            {p.label}
          </span>
        ))}
      </div>

      {/* ─── Tab bar ─── */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-elevated/40 p-1">
        {PROTOCOLS.map((p) => {
          const Icon = p.icon;
          const active = proto === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => switchProto(p.id)}
              data-testid={`ai-testing-protocol-tab-${p.id}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                active ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:bg-elevated',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', active ? p.chipText : 'text-text-muted')} />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ─── Selected protocol banner ─── */}
      {(() => {
        const p = PROTOCOLS.find((x) => x.id === proto)!;
        const Icon = p.icon;
        return (
          <div className={cn('flex items-center gap-3 rounded-lg p-3', p.chip)}>
            <Icon className={cn('h-5 w-5', p.chipText)} />
            <div>
              <div className={cn('text-sm font-semibold', p.chipText)}>{p.label}</div>
              <div className="text-[11px] text-text-secondary">{p.sub}</div>
            </div>
          </div>
        );
      })()}

      {/* ─── Body — two-column layout: config + result ─── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr,1fr]">
        <div className="rounded-lg border border-border bg-surface p-5">
          {proto === 'direct' && <DirectAgentForm workspaceId={workspaceId} prefill={prefill} />}
          {proto === 'a2a'    && <A2aForm        workspaceId={workspaceId} prefill={prefill} />}
          {proto === 'acp'    && <AcpForm        workspaceId={workspaceId} prefill={prefill} />}
          {proto === 'mcp'    && <McpForm        workspaceId={workspaceId} prefill={prefill} />}
        </div>
        <ResultPanel />
      </div>
    </div>
  );
};

/* ════════════════════════ Direct Agent form ═══════════════════════════ */
const DirectAgentForm = ({ workspaceId, prefill }: { workspaceId: string; prefill: MarketplacePrefill | null }) => {
  const [mode, setMode] = useState<AgentExecMode>('single');
  const [cat, setCat] = useState<Catalog | null>(null);
  const [tools, setTools] = useState<AgentToolDef[]>([]);

  const [provider, setProvider] = useState(prefill?.provider ?? 'openai');
  const [model, setModel] = useState(prefill?.model ?? 'gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState(prefill?.systemPrompt ?? '');
  const [userMessage, setUserMessage] = useState('What is 15 multiplied by 7?');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [maxIters, setMaxIters] = useState(5);
  const [temperature, setTemperature] = useState(0.7);

  // Multi-agent definitions
  const [agents, setAgents] = useState<Array<{
    name: string; role: string; provider: string; model: string;
    systemPrompt: string; description: string;
  }>>([
    { name: 'researcher', role: 'specialist', provider: 'openai', model: 'gpt-4o-mini',
      systemPrompt: 'You are a research specialist.', description: 'Researches information and facts' },
    { name: 'writer', role: 'specialist', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022',
      systemPrompt: 'You are a skilled writer.', description: 'Writes clear, engaging content' },
  ]);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCatalog(workspaceId).then(setCat).catch(() => {});
    listAgentTools(workspaceId).then(setTools).catch(() => setTools([]));
  }, [workspaceId]);

  const providerObj = cat?.providers.find((p) => p.id === provider);

  const toggleTool = (t: string) => setSelectedTools((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  const addAgent = () => setAgents((p) => [...p, {
    name: 'agent_' + (p.length + 1), role: 'specialist',
    provider: 'openai', model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.', description: 'Does something useful',
  }]);
  const updateAgent = (i: number, field: string, value: string) =>
    setAgents((p) => p.map((a, ix) => ix === i ? { ...a, [field]: value } : a));
  const removeAgent = (i: number) => setAgents((p) => p.filter((_, ix) => ix !== i));

  const submit = async () => {
    if (!userMessage.trim()) return;
    setBusy(true);
    try {
      const result = await runDirectAgent(workspaceId, {
        mode,
        provider, model, systemPrompt: systemPrompt || undefined,
        userMessage: userMessage.trim(),
        tools: selectedTools, maxIterations: maxIters, temperature,
        agents: mode === 'single' ? undefined : agents,
      });
      window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: result }));
      if (!result.ok) toast.error('Agent run failed', { description: result.error });
      else toast.success(`Agent run · ${result.latencyMs}ms · $${(result.totalCostUsd ?? 0).toFixed(6)}`);
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-orange-500" />
        <h3 className="text-base font-semibold">Direct Agent Execution</h3>
      </div>

      {/* Execution mode 2×2 grid */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Execution Mode</div>
        <div className="grid grid-cols-2 gap-2" data-testid="ai-testing-exec-mode-grid">
          {([
            { id: 'single',     label: 'Single Agent', sub: 'ReAct loop with tools' },
            { id: 'sequential', label: 'Sequential',   sub: 'Chain agents A→B→C' },
            { id: 'parallel',   label: 'Parallel',     sub: 'Run all agents concurrently' },
            { id: 'supervisor', label: 'Supervisor',   sub: 'LLM routes to specialists' },
          ] as const).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id as AgentExecMode)}
              data-testid={`ai-testing-exec-mode-${m.id}`}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                mode === m.id
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/10 ring-1 ring-orange-300'
                  : 'border-border bg-surface hover:border-text-muted/50',
              )}
            >
              <div className={cn('text-sm font-semibold', mode === m.id ? 'text-orange-600 dark:text-orange-300' : 'text-text-primary')}>
                {m.label}
              </div>
              <div className="mt-0.5 text-[11px] text-text-muted">{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Single mode: provider/model/prompt directly */}
      {mode === 'single' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider">
              <select value={provider} onChange={(e) => {
                setProvider(e.target.value);
                const p = cat?.providers.find((x) => x.id === e.target.value);
                setModel(p?.models[0] ?? 'gpt-4o-mini');
              }} data-testid="ai-testing-direct-provider" className={inputCls}>
                {cat?.providers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select value={model} onChange={(e) => setModel(e.target.value)}
                      data-testid="ai-testing-direct-model" className={inputCls}>
                {providerObj?.models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="System Prompt (optional)">
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="You are a helpful assistant…"
                      rows={2} className={cn(inputCls, 'resize-y')} />
          </Field>
        </>
      ) : (
        <>
          {/* Multi-agent definitions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Agent Definitions</div>
              <button type="button" onClick={addAgent}
                      data-testid="ai-testing-add-agent"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600">
                <Plus className="h-3 w-3" /> Add Agent
              </button>
            </div>
            <div className="space-y-3">
              {agents.map((a, i) => (
                <div key={i} className="rounded-lg border border-border bg-elevated/30 p-3"
                     data-testid={`ai-testing-agent-def-${i}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-muted">Agent {i + 1}</span>
                    <button type="button" onClick={() => removeAgent(i)}
                            className="text-danger hover:text-danger-darker">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={a.name} onChange={(e) => updateAgent(i, 'name', e.target.value)}
                           placeholder="researcher" className={inputCls} />
                    <select value={a.role} onChange={(e) => updateAgent(i, 'role', e.target.value)} className={inputCls}>
                      <option value="specialist">specialist</option>
                      <option value="generalist">generalist</option>
                    </select>
                    <select value={a.provider} onChange={(e) => {
                      updateAgent(i, 'provider', e.target.value);
                      const p = cat?.providers.find((x) => x.id === e.target.value);
                      updateAgent(i, 'model', p?.models[0] ?? '');
                    }} className={inputCls}>
                      {cat?.providers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                    </select>
                    <select value={a.model} onChange={(e) => updateAgent(i, 'model', e.target.value)} className={inputCls}>
                      {(cat?.providers.find((p) => p.id === a.provider)?.models ?? []).map((m) =>
                        <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <input value={a.systemPrompt} onChange={(e) => updateAgent(i, 'systemPrompt', e.target.value)}
                         placeholder="You are a …"
                         className={cn(inputCls, 'mt-2')} />
                  <input value={a.description} onChange={(e) => updateAgent(i, 'description', e.target.value)}
                         placeholder="Researches information and facts"
                         className={cn(inputCls, 'mt-2')} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Field label="User Message">
        <textarea value={userMessage} onChange={(e) => setUserMessage(e.target.value)}
                  data-testid="ai-testing-direct-user-message"
                  rows={3} className={cn(inputCls, 'resize-y font-mono')} />
      </Field>

      {/* Built-in tools */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Built-in Tools</div>
        <div className="space-y-1">
          {tools.map((t) => (
            <label key={t.name} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-elevated/50">
              <input type="checkbox" checked={selectedTools.includes(t.name)}
                     onChange={() => toggleTool(t.name)}
                     data-testid={`ai-testing-tool-${t.name}`}
                     className="rounded" />
              <span>{t.icon}</span>
              <span className="font-mono text-[12px] font-semibold">{t.name}</span>
              <span className="text-[11px] text-text-muted">— {t.description}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Max Iterations">
          <input type="number" min={1} max={20} value={maxIters}
                 onChange={(e) => setMaxIters(parseInt(e.target.value || '5', 10))} className={inputCls} />
        </Field>
        <Field label="Temperature">
          <input type="number" min={0} max={2} step={0.1} value={temperature}
                 onChange={(e) => setTemperature(parseFloat(e.target.value || '0.7'))} className={inputCls} />
        </Field>
      </div>

      <button type="button" onClick={submit} disabled={busy || !userMessage.trim()}
              data-testid="ai-testing-run-agent-btn"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Run Agent
      </button>
    </div>
  );
};

/* ════════════════════════ A2A / ACP / MCP forms ═══════════════════════ */
const A2aForm = ({ workspaceId, prefill }: { workspaceId: string; prefill: MarketplacePrefill | null }) =>
  <ExternalAgentForm
    workspaceId={workspaceId}
    title="A2A Agent Configuration"
    icon={<Globe className="h-4 w-4 text-purple-500" />}
    discoverLabel="Discover Card"
    sendLabel="Send Task"
    initialUrl={prefill?.protocol === 'a2a' ? (prefill.baseUrl ?? '') : ''}
    onDiscover={(ws, url, h)        => a2aDiscover(ws, url, h)}
    onSend={(ws, url, h, msg)       => a2aSend(ws, url, h, msg)}
    placeholder="http://my-agent:8080"
  />;

const AcpForm = ({ workspaceId, prefill }: { workspaceId: string; prefill: MarketplacePrefill | null }) =>
  <ExternalAgentForm
    workspaceId={workspaceId}
    title="ACP Agent Configuration"
    icon={<MessageSquare className="h-4 w-4 text-teal-500" />}
    sendLabel="Send Run"
    initialUrl={prefill?.protocol === 'acp' ? (prefill.baseUrl ?? '') : ''}
    onSend={(ws, url, h, msg)       => acpSend(ws, url, h, msg)}
    placeholder="http://my-beeai-agent:8000"
  />;

const McpForm = ({ workspaceId, prefill }: { workspaceId: string; prefill: MarketplacePrefill | null }) => {
  const [baseUrl, setBaseUrl] = useState(
    prefill?.protocol === 'mcp' && prefill.baseUrl
      ? (prefill.baseUrl.endsWith('/mcp') ? prefill.baseUrl : prefill.baseUrl.replace(/\/$/, '') + '/mcp')
      : 'https://mcp.deepwiki.com/mcp'
  );
  const [transport, setTransport] = useState<'STREAMABLE_HTTP' | 'SSE' | 'HTTP'>('STREAMABLE_HTTP');
  const [tool, setTool]       = useState('');
  const [args, setArgs]       = useState('{}');
  const [busy, setBusy]       = useState(false);

  // Listen for "Use this tool" clicks coming from the result panel —
  // populates the tool name + a JSON skeleton from the tool's inputSchema
  // so users don't have to copy-paste from the response.
  useEffect(() => {
    const onUse = (e: any) => {
      const { name, inputSchema } = e.detail || {};
      if (!name) return;
      setTool(String(name));
      setArgs(skeletonFromSchema(inputSchema));
      toast.success(`Loaded "${name}" — edit args below and Call Tool`);
      // bring the form into view
      document.getElementById('mcp-tool-call-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener('forgeq:mcp-use-tool', onUse as any);
    return () => window.removeEventListener('forgeq:mcp-use-tool', onUse as any);
  }, []);

  const runListTools = async () => {
    setBusy(true);
    try {
      const r = await mcpListTools(workspaceId, baseUrl, { transport } as any);
      window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: r }));
    } finally { setBusy(false); }
  };

  const runCall = async () => {
    if (!tool.trim()) return;
    setBusy(true);
    try {
      const parsed = JSON.parse(args || '{}');
      const r = await mcpCallTool(workspaceId, baseUrl, { transport } as any, tool.trim(), parsed);
      window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: r }));
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 text-emerald-500" />
        <h3 className="text-base font-semibold">MCP Server Configuration</h3>
      </div>
      <Field label="MCP Server URL (include /mcp suffix for Streamable HTTP)">
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Transport">
        <select value={transport} onChange={(e) => setTransport(e.target.value as any)} className={inputCls}>
          <option value="STREAMABLE_HTTP">Streamable HTTP (default, hosted servers)</option>
          <option value="SSE">SSE</option>
          <option value="HTTP">HTTP (legacy)</option>
        </select>
      </Field>
      <button type="button" onClick={runListTools} disabled={busy}
              data-testid="ai-testing-mcp-list-tools"
              className="inline-flex items-center gap-2 rounded-md border border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 disabled:opacity-50">
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        List Tools
      </button>
      <Field label="Tool name">
        <input id="mcp-tool-call-section" value={tool} onChange={(e) => setTool(e.target.value)} placeholder="ask_question"
               className={inputCls} />
      </Field>
      <Field label="Arguments (JSON)">
        <textarea value={args} onChange={(e) => setArgs(e.target.value)}
                  rows={3} className={cn(inputCls, 'resize-y font-mono')} />
      </Field>
      <button type="button" onClick={runCall} disabled={busy || !tool.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        Call Tool
      </button>
    </div>
  );
};

/** Shared form for A2A and ACP. */
const ExternalAgentForm = ({
  workspaceId, title, icon, discoverLabel, sendLabel, onDiscover, onSend, placeholder, initialUrl,
}: {
  workspaceId: string;
  title: string;
  icon: any;
  discoverLabel?: string;
  sendLabel: string;
  onDiscover?: (ws: string, url: string, headers: Record<string, string>) => Promise<any>;
  onSend: (ws: string, url: string, headers: Record<string, string>, message: string) => Promise<any>;
  placeholder: string;
  initialUrl?: string;
}) => {
  const [baseUrl, setBaseUrl] = useState(initialUrl ?? '');
  const [message, setMessage] = useState('What can you help me with?');
  const [headers, setHeaders] = useState<Array<{ k: string; v: string }>>([]);
  const [busy, setBusy]       = useState<'discover' | 'send' | null>(null);

  const headerMap = (): Record<string, string> => {
    const m: Record<string, string> = {};
    headers.forEach((h) => { if (h.k.trim()) m[h.k.trim()] = h.v; });
    return m;
  };

  const doDiscover = async () => {
    if (!baseUrl.trim() || !onDiscover) return;
    setBusy('discover');
    try {
      const r = await onDiscover(workspaceId, baseUrl.trim(), headerMap());
      window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: r }));
    } finally { setBusy(null); }
  };

  const doSend = async () => {
    if (!baseUrl.trim() || !message.trim()) return;
    setBusy('send');
    try {
      const r = await onSend(workspaceId, baseUrl.trim(), headerMap(), message.trim());
      window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: r }));
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-semibold">{title}</h3>
      </div>

      <Field label="Agent Base URL">
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
               placeholder={placeholder} className={inputCls} />
      </Field>
      <Field label="Message">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                  rows={3} className={cn(inputCls, 'resize-y font-mono')} />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Auth Headers</div>
          <button type="button" onClick={() => setHeaders((p) => [...p, { k: '', v: '' }])}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add header
          </button>
        </div>
        {headers.length === 0 ? (
          <p className="text-[11px] italic text-text-muted">
            No headers — click "Add header" to set Authorization, API-Key, etc.
          </p>
        ) : (
          <div className="space-y-1">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input value={h.k} onChange={(e) => setHeaders((p) => p.map((x, ix) => ix === i ? { ...x, k: e.target.value } : x))}
                       placeholder="Authorization" className={cn(inputCls, 'flex-1')} />
                <input value={h.v} onChange={(e) => setHeaders((p) => p.map((x, ix) => ix === i ? { ...x, v: e.target.value } : x))}
                       placeholder="Bearer …" className={cn(inputCls, 'flex-1')} />
                <button type="button" onClick={() => setHeaders((p) => p.filter((_, ix) => ix !== i))}
                        className="text-danger hover:text-danger-darker">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {onDiscover && (
          <button type="button" onClick={doDiscover} disabled={busy !== null || !baseUrl.trim()}
                  data-testid="ai-testing-external-discover"
                  className="inline-flex items-center gap-2 rounded-md bg-purple-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-purple-600 disabled:opacity-50">
            {busy === 'discover' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            {discoverLabel}
          </button>
        )}
        <button type="button" onClick={doSend} disabled={busy !== null || !baseUrl.trim() || !message.trim()}
                data-testid="ai-testing-external-send"
                className="inline-flex items-center gap-2 rounded-md bg-purple-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-purple-600 disabled:opacity-50">
          {busy === 'send' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          {sendLabel}
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════ Result panel (right side) ═══════════════════ */
const ResultPanel = () => {
  const [result, setResult] = useState<DirectAgentRunResult | any | null>(null);
  useEffect(() => {
    const h = (e: any) => setResult(e.detail);
    window.addEventListener('forgeq:agent-result', h as any);
    return () => window.removeEventListener('forgeq:agent-result', h as any);
  }, []);

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/40 p-5"
         data-testid="ai-testing-agent-result">
      <div className="mb-3 flex items-center gap-2">
        <ChevronDown className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-muted">Execution Result</h3>
      </div>
      {!result ? (
        <div className="grid h-48 place-items-center rounded-md border border-dashed border-border bg-elevated/20 text-sm text-text-muted">
          Configure the agent on the left and hit <strong className="text-text-primary">Run</strong> to see results here.
        </div>
      ) : (
        <div className="space-y-3">
          {result.finalText && (
            <div className="rounded-md border border-success/40 bg-success/5 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">Final answer</div>
              <pre className="whitespace-pre-wrap text-sm">{result.finalText}</pre>
            </div>
          )}
          {result.body?.response_json && !extractMcpTools(result) && (
            <details className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3" open>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Response (JSON-RPC)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
                {typeof result.body.response_json === 'string'
                  ? result.body.response_json
                  : JSON.stringify(result.body.response_json, null, 2)}
              </pre>
            </details>
          )}
          {extractMcpTools(result) && <McpToolsList tools={extractMcpTools(result)!} /> }
          {result.specialist && (
            <div className="rounded-md border border-orange-400/40 bg-orange-50 dark:bg-orange-500/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-500">Routed to</div>
              <div className="font-mono text-sm">{result.specialist.name} <span className="text-text-muted">({result.specialist.model})</span></div>
            </div>
          )}
          {(result.error || result.body?.error_message) && (
            <div className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
              {result.error || result.body.error_message}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Tile label="Cost"    value={'$' + (result.totalCostUsd ?? 0).toFixed(6)} />
            <Tile label="Tokens"  value={result.totalTokens ?? '—'} />
            <Tile label="Latency" value={(result.latencyMs ?? result.body?.latency_ms ?? 0) + ' ms'} />
          </div>

          {/* Execution Trace — Postman-style step breakdown */}
          <ExecutionTrace result={result} />

          <details className="rounded-md border border-border bg-elevated/30 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-text-muted">Raw JSON</summary>
            <pre className="mt-2 max-h-80 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

const Tile = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-md border border-border bg-surface px-2 py-1.5">
    <div className="text-[9px] uppercase tracking-wide text-text-muted">{label}</div>
    <div className="font-mono text-[12px] font-semibold">{value}</div>
  </div>
);

const Field = ({ label, children }: any) => (
  <div>
    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
    {children}
  </div>
);
const inputCls =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary';

/* ════════════════════════ MCP tools — card list (replaces raw JSON dump) ═══ */

interface McpToolDef {
  name: string;
  description?: string;
  inputSchema?: any;
}

/**
 * Pull the `tools` array out of an MCP `tools/list` JSON-RPC response,
 * regardless of envelope shape. Returns null if not a tools/list result.
 */
function extractMcpTools(result: any): McpToolDef[] | null {
  if (!result) return null;
  const rj = result?.body?.response_json;
  if (!rj) return null;
  // Some servers return a string body — try to parse it.
  let parsed: any = rj;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  const tools = parsed?.result?.tools ?? parsed?.tools;
  if (!Array.isArray(tools) || tools.length === 0) return null;
  // Sanity: every entry must have a name string.
  if (!tools.every((t: any) => typeof t?.name === 'string')) return null;
  return tools as McpToolDef[];
}

/**
 * Build a minimal JSON skeleton from a JSON-Schema-ish `inputSchema`.
 * Only handles top-level required properties — anything fancier the
 * user can fill in themselves.
 */
function skeletonFromSchema(schema: any): string {
  if (!schema || typeof schema !== 'object') return '{}';
  const props = schema.properties ?? {};
  const required: string[] = Array.isArray(schema.required) ? schema.required : [];
  const seed: Record<string, any> = {};
  required.forEach((k) => {
    const p = props[k] ?? {};
    seed[k] = sampleForType(p);
  });
  // If no required, seed all top-level props as a courtesy.
  if (required.length === 0) {
    Object.keys(props).forEach((k) => { seed[k] = sampleForType(props[k]); });
  }
  try { return JSON.stringify(seed, null, 2); } catch { return '{}'; }
}

function sampleForType(p: any): any {
  if (!p) return '';
  if (Array.isArray(p.enum) && p.enum.length > 0) return p.enum[0];
  switch (p.type) {
    case 'string':  return p.default ?? '';
    case 'integer':
    case 'number':  return p.default ?? 0;
    case 'boolean': return p.default ?? false;
    case 'array':   return [];
    case 'object':  return {};
    default:        return '';
  }
}

const McpToolsList = ({ tools }: { tools: McpToolDef[] }) => {
  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3"
         data-testid="ai-testing-mcp-tools-cards">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
          <Wrench className="h-3.5 w-3.5" /> Available tools
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
            {tools.length}
          </span>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2" data-testid="ai-testing-mcp-tools-grid">
        {tools.map((t, i) => <McpToolCard key={t.name + i} tool={t} />)}
      </ul>
    </div>
  );
};

const McpToolCard = ({ tool }: { tool: McpToolDef }) => {
  const [showSchema, setShowSchema] = useState(false);
  const reqKeys: string[] = Array.isArray(tool.inputSchema?.required) ? tool.inputSchema.required : [];
  const propCount =
    tool.inputSchema?.properties && typeof tool.inputSchema.properties === 'object'
      ? Object.keys(tool.inputSchema.properties).length
      : 0;
  const useThis = () => {
    window.dispatchEvent(new CustomEvent('forgeq:mcp-use-tool', {
      detail: { name: tool.name, inputSchema: tool.inputSchema },
    }));
  };
  return (
    <li className="flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-surface p-3 transition-colors hover:border-emerald-500/60"
        data-testid={`ai-testing-mcp-tool-card-${tool.name}`}>
      <div className="flex items-start gap-2">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <Wrench className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px] font-semibold">{tool.name}</div>
          {tool.description && (
            <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-muted">
              {tool.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {propCount > 0 && (
          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-text-secondary">
            {propCount} arg{propCount === 1 ? '' : 's'}
          </span>
        )}
        {reqKeys.length > 0 && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-amber-700 dark:text-amber-300"
                title={`Required: ${reqKeys.join(', ')}`}>
            {reqKeys.length} required
          </span>
        )}
        {tool.inputSchema && (
          <button type="button" onClick={() => setShowSchema((s) => !s)}
                  className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-text-secondary hover:bg-elevated"
                  data-testid={`ai-testing-mcp-tool-schema-${tool.name}`}>
            <Code2 className="h-2.5 w-2.5" /> {showSchema ? 'Hide' : 'Schema'}
          </button>
        )}
      </div>
      {showSchema && tool.inputSchema && (
        <pre className="max-h-40 overflow-auto rounded border border-border/60 bg-elevated/30 p-2 font-mono text-[10px] leading-snug text-text-secondary">
          {JSON.stringify(tool.inputSchema, null, 2)}
        </pre>
      )}
      <button type="button" onClick={useThis}
              data-testid={`ai-testing-mcp-tool-use-${tool.name}`}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600">
        Use this tool <ArrowRight className="h-3 w-3" />
      </button>
    </li>
  );
};
