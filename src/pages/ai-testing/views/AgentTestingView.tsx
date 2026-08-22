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
  Wrench, ArrowRight, Code2, Cloud,
} from 'lucide-react';
import {
  fetchCatalog, listAgentTools, runDirectAgent,
  a2aDiscover, a2aSend, acpSend, mcpListTools, mcpCallTool,
  listAgentPlaygroundRuns, mcpHealth,
  type Catalog, type AgentToolDef, type AgentExecMode, type DirectAgentRunResult, type AgentPlaygroundRun, type McpHealth,
} from '@/services/aiTesting.service';
import {
  sandboxChat, sandboxRun, sandboxStatus, authenticatedRun, getAgentInfo,
  KRE_NEXUS_BASE,
} from '@/services/kreNexus.service';
import { ExecutionTrace } from './ExecutionTrace';
import { cn } from '@/utils/cn';

type Protocol = 'direct' | 'a2a' | 'acp' | 'mcp' | 'kre';

interface MarketplacePrefill {
  protocol: Protocol;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  baseUrl?: string;
  name?: string;
  kreAgentId?: string;
  publicTokenLimit?: number;
}

const PROTOCOLS: { id: Protocol; label: string; sub: string; icon: any; chip: string; chipText: string }[] = [
  { id: 'direct', label: 'Direct Agent', sub: 'ReAct loop, multi-agent orchestration',
    icon: Bot, chip: 'bg-orange-100 dark:bg-orange-500/15', chipText: 'text-orange-600 dark:text-orange-300' },
  { id: 'kre',    label: 'KRE Nexus AI', sub: 'Deployed Cloud Run agents · sandbox + auth modes',
    icon: Cloud, chip: 'bg-indigo-100 dark:bg-indigo-500/15', chipText: 'text-indigo-600 dark:text-indigo-300' },
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

  // Sync the active protocol tab with the URL `?proto=` on every change.
  // Without this, the AiTestingPage keep-alive caching causes the tab
  // to render with a stale state when the user comes back via the
  // marketplace's "Try in Playground" button.
  const urlProto = params.get('proto') as Protocol | null;
  useEffect(() => {
    if (urlProto && urlProto !== proto) setProto(urlProto);
  }, [urlProto]);

  // Whenever the active protocol tab changes, broadcast a reset so the
  // right-hand ResultPanel clears any stale execution from the previous
  // tab. The KreNexusForm token meter persists separately in localStorage.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('forgeq:agent-reset'));
  }, [proto]);

  // Read marketplace prefill (set by AgentMarketplaceView). We re-check
  // on every render path that mounts the view so re-clicking "Try in
  // Playground" for a different agent loads the new prefill instead of
  // showing the previously cached one.
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
  // Re-run when the URL proto changes too — that's the signal that the
  // user just navigated here from the marketplace.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProto]);

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
            {p.id === 'direct' ? 'Built-in'
              : p.id === 'kre' ? 'KRE Nexus'
              : p.id === 'a2a' ? 'Google'
              : p.id === 'acp' ? 'BeeAI' : 'Anthropic'}
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
          <div className={cn('flex items-center gap-3 bg-probestack-bg rounded-lg p-3', p.chip)}>
            <Icon className={cn('h-5 w-5', p.chipText)} />
            <div>
              <div className={cn('text-sm font-semibold', p.chipText)}>{p.label}</div>
              <div className="text-[11px] text-text-secondary">{p.sub}</div>
            </div>
          </div>
        );
      })()}

      {proto === 'direct' && <PlaygroundHistoryPanel workspaceId={workspaceId} />}

      {/* ─── Body — two-column layout: config + result ─── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr,1fr]">
        <div className="rounded-lg border border-border bg-surface p-5">
          {proto === 'direct' && <DirectAgentForm workspaceId={workspaceId} prefill={prefill} />}
          {proto === 'kre'    && <KreNexusForm   workspaceId={workspaceId} prefill={prefill} />}
          {proto === 'a2a'    && <A2aForm        workspaceId={workspaceId} prefill={prefill} />}
          {proto === 'acp'    && <AcpForm        workspaceId={workspaceId} prefill={prefill} />}
          {proto === 'mcp'    && <McpForm        workspaceId={workspaceId} prefill={prefill} />}
        </div>
        <ResultPanel />
      </div>
    </div>
  );
};

/* ════════════════════════ Playground history ══════════════════════════
 * Direct-agent runs are persisted server-side now (see
 * AgentExecutionService#persistPlaygroundRun) — this surfaces that
 * history so a page refresh no longer loses every past trace. Clicking a
 * row replays it through the exact same ResultPanel / ExecutionTrace the
 * live run used, via the same `forgeq:agent-result` event.
 */
const PlaygroundHistoryPanel = ({ workspaceId }: { workspaceId: string }) => {
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<AgentPlaygroundRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listAgentPlaygroundRuns(workspaceId, 0, 20)
      .then((r) => setRuns(Array.isArray(r) ? r : []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open && runs.length === 0) load(); }, [open]); // eslint-disable-line

  // Refresh the list whenever a new run completes so it appears without
  // the user having to manually reopen the panel.
  useEffect(() => {
    const h = () => { if (open) load(); };
    window.addEventListener('forgeq:agent-result', h as any);
    return () => window.removeEventListener('forgeq:agent-result', h as any);
  }, [open]); // eslint-disable-line

  const replay = (run: AgentPlaygroundRun) => {
    setActiveId(run.id);
    window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: { ...run.result, id: run.id } }));
  };

  return (
    <div className="rounded-lg border border-border bg-surface" data-testid="ai-testing-playground-history">
      <button type="button" onClick={() => setOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
          <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
          History{runs.length > 0 && <span className="text-text-muted font-normal">({runs.length})</span>}
        </span>
        {open && loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />}
      </button>
      {open && (
        <div className="max-h-56 overflow-auto border-t border-border">
          {!loading && runs.length === 0 ? (
            <div className="px-4 py-4 text-xs text-text-muted">No runs yet — configure the agent below and hit Run.</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {runs.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => replay(r)}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-xs hover:bg-elevated',
                            activeId === r.id && 'bg-elevated',
                          )}>
                    <span className="min-w-0 flex-1 truncate">
                      <span className={cn('mr-2 rounded px-1.5 py-0.5 font-mono text-[10px]',
                        r.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                        {r.ok ? 'ok' : 'error'}
                      </span>
                      <span className="text-text-secondary">{r.mode}</span>
                      {r.userMessage && <span className="text-text-muted"> · {r.userMessage}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-text-muted">
                      {r.latencyMs != null ? `${r.latencyMs}ms` : ''} · {new Date(r.createdAt).toLocaleTimeString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
                setModel(p?.models[0]?.name ?? 'gpt-4o-mini');
              }} data-testid="ai-testing-direct-provider" className={inputCls}>
                {cat?.providers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select value={model} onChange={(e) => setModel(e.target.value)}
                      data-testid="ai-testing-direct-model" className={inputCls}>
                {providerObj?.models.map((m) => (
                  <option key={m.name} value={m.name}
                          title={`$${m.promptCostPer1k}/1k prompt tok · $${m.completionCostPer1k}/1k completion tok`}>
                    {m.name}
                  </option>
                ))}
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
                <div key={i} className="rounded-lg border border-border bg-probestack-bg p-3"
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
                      updateAgent(i, 'model', p?.models[0]?.name ?? '');
                    }} className={inputCls}>
                      {cat?.providers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                    </select>
                    <select value={a.model} onChange={(e) => updateAgent(i, 'model', e.target.value)} className={inputCls}>
                      {(cat?.providers.find((p) => p.id === a.provider)?.models ?? []).map((m) => (
                        <option key={m.name} value={m.name}
                                title={`$${m.promptCostPer1k}/1k prompt tok · $${m.completionCostPer1k}/1k completion tok`}>
                          {m.name}
                        </option>
                      ))}
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

/* ════════════════════════ KRE Nexus AI form ═══════════════════════════ */
/**
 * Talks to the KRE Agentic backend (Cloud Run). Supports both the
 * unauthenticated sandbox endpoints AND the authenticated platform runner.
 *
 * UI:
 *   • Agent ID input pre-filled from marketplace "Try in Playground"
 *   • Mode toggle: Sandbox (no auth) | Authenticated (JWT field appears)
 *   • Action toggle: Chat | Run Task | Status
 *   • Token usage tile renders when KRE returns `public_token_usage`
 */
/** localStorage key for persisting per-agent token usage across page
 *  reloads. The cap itself is also persisted so a logged-in user sees
 *  their remaining budget even if KRE hasn't streamed usage back yet. */
const TOKEN_USAGE_KEY = (id: string) => `forgeq:kre:tokens:${id}`;

const KreNexusForm = ({ workspaceId: _wsId, prefill }: { workspaceId: string; prefill: MarketplacePrefill | null }) => {
  const [agentId, setAgentId] = useState(prefill?.kreAgentId ?? '');
  const [mode, setMode] = useState<'sandbox' | 'auth'>('sandbox');
  const [action, setAction] = useState<'chat' | 'run' | 'status'>('chat');
  const [message, setMessage] = useState('Hello! What can you help me with?');
  const [sessionId, setSessionId] = useState<string>('');
  const [jwt, setJwt] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{ used: number; limit: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  /** Persist token usage to localStorage so a refresh doesn't reset to 0. */
  const writeTokenUsage = (u: { used: number; limit: number } | null) => {
    setTokenUsage(u);
    try {
      if (!agentId) return;
      if (u) localStorage.setItem(TOKEN_USAGE_KEY(agentId), JSON.stringify(u));
      else localStorage.removeItem(TOKEN_USAGE_KEY(agentId));
    } catch { /* quota or disabled — ignore */ }
  };

  /** Whenever the chosen agent changes, hydrate token usage in this priority:
   *    1. Saved usage in localStorage for that agent (preserves "8000 / 9000 used")
   *    2. Public token limit from marketplace prefill (shows full 7000 immediately)
   *    3. Live fetch from /api/proxy/agent-info if neither of the above. */
  useEffect(() => {
    if (!agentId.trim()) { setTokenUsage(null); return; }
    try {
      const saved = localStorage.getItem(TOKEN_USAGE_KEY(agentId));
      if (saved) { setTokenUsage(JSON.parse(saved)); return; }
    } catch { /* ignore */ }
    if (prefill?.publicTokenLimit && prefill?.kreAgentId === agentId) {
      setTokenUsage({ used: 0, limit: prefill.publicTokenLimit });
      return;
    }
    // Live probe — best-effort, ignore failure.
    (async () => {
      try {
        const info = await getAgentInfo(agentId.trim());
        const cap = (info as any)?.publicTokenLimit
                 ?? (info as any)?.public_token_limit;
        if (typeof cap === 'number' && cap > 0) {
          setTokenUsage({ used: 0, limit: cap });
        }
      } catch { /* offline / 401 — fine */ }
    })();
  }, [agentId, prefill]);

  /** Marketplace "Try in Playground" sync. */
  useEffect(() => {
    if (prefill?.protocol === 'kre' && prefill.kreAgentId) {
      setAgentId(prefill.kreAgentId);
    }
  }, [prefill]);

  const run = async () => {
    if (!agentId.trim()) {
      toast.error('Enter an agent ID first');
      return;
    }
    setBusy(true);
    const startedAt = Date.now();
    try {
      let result: any;
      if (action === 'status') {
        const body = await sandboxStatus(agentId.trim());
        result = {
          ok: true,
          finalText: 'Agent status fetched.',
          body: { response_json: body },
          latencyMs: Date.now() - startedAt,
        };
      } else if (action === 'chat') {
        if (mode === 'auth') {
          if (!jwt.trim()) { toast.error('JWT token required for authenticated mode'); setBusy(false); return; }
          const r = await authenticatedRun(agentId.trim(), message.trim(), jwt.trim(), sessionId.trim() || null);
          if (r.session_id) setSessionId(r.session_id);
          if (r.token_limit_exceeded) {
            toast.error('Token limit exhausted', { description: r.error || '' });
          }
          result = {
            ok: r.ok,
            finalText: r.answer ?? '',
            body: { response_json: r },
            error: r.error,
            latencyMs: Date.now() - startedAt,
            totalTokens: undefined,
            totalCostUsd: undefined,
          };
        } else {
          const r = await sandboxChat(agentId.trim(), message.trim(), sessionId.trim() || null);
          const b = r.body || {} as any;
          if (b.session_id) setSessionId(b.session_id);
          if (b.public_token_usage) {
            writeTokenUsage({ used: b.public_token_usage.tokensUsed, limit: b.public_token_usage.tokenLimit });
          } else if (b.tokensUsed != null && b.tokenLimit != null) {
            writeTokenUsage({ used: b.tokensUsed, limit: b.tokenLimit });
          }
          if (b.token_limit_exceeded) {
            toast.error('Token limit exhausted', { description: b.error || '' });
          }
          result = {
            ok: !b.token_limit_exceeded && (r.status === 200),
            finalText: b.response ?? '',
            body: { response_json: r },
            error: b.error,
            latencyMs: r.latency_ms ?? (Date.now() - startedAt),
            // Expose flat token figures so the result tiles and downstream
            // consumers don't have to dig into `public_token_usage`.
            totalTokens: b.public_token_usage?.tokensUsed ?? b.tokensUsed,
            tokenLimit: b.public_token_usage?.tokenLimit ?? b.tokenLimit,
            tokensRemaining: b.public_token_usage?.remaining,
          };
        }
      } else {
        // run task — sandbox always (no auth required by spec)
        const r = await sandboxRun(agentId.trim(), message.trim());
        const b = r.body || {} as any;
        if (b.public_token_usage) {
          writeTokenUsage({ used: b.public_token_usage.tokensUsed, limit: b.public_token_usage.tokenLimit });
        }
        result = {
          ok: r.status === 200,
          finalText: b.response ?? '',
          body: { response_json: r },
          error: b.error,
          latencyMs: r.latency_ms ?? (Date.now() - startedAt),
          totalTokens: b.public_token_usage?.tokensUsed,
          tokenLimit: b.public_token_usage?.tokenLimit,
          tokensRemaining: b.public_token_usage?.remaining,
        };
      }
      window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: result }));
      if (result.ok) toast.success(`KRE ${action} · ${result.latencyMs}ms`);
    } catch (e: any) {
      toast.error('KRE call failed', { description: e?.message || '' });
    } finally {
      setBusy(false);
    }
  };

  const tokenPct = tokenUsage ? Math.min(100, (tokenUsage.used / Math.max(1, tokenUsage.limit)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4 text-indigo-500" />
        <h3 className="text-base font-semibold">KRE Nexus AI Agent</h3>
        <span className="ml-auto rounded bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-muted">
          {KRE_NEXUS_BASE.replace(/^https?:\/\//, '').slice(0, 40)}
        </span>
      </div>

      <Field label="Agent ID">
        <input value={agentId} onChange={(e) => setAgentId(e.target.value)}
               placeholder="my-sales-agent"
               data-testid="kre-agent-id"
               className={inputCls} />
      </Field>

      {/* Mode toggle */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Mode</span>
          <button type="button" onClick={() => setShowHelp((v) => !v)}
                  data-testid="kre-mode-help-toggle"
                  className="grid h-4 w-4 place-items-center rounded-full border border-text-muted/40 text-[9px] font-bold text-text-muted hover:bg-elevated">
            ?
          </button>
        </div>
        {showHelp && (
          <div className="mb-2 space-y-2 rounded-md border border-indigo-500/30 bg-indigo-500/5 p-3 text-[11px] leading-relaxed text-text-secondary"
               data-testid="kre-mode-help">
            <div>
              <strong className="text-indigo-600 dark:text-indigo-300">Sandbox</strong> — hits
              <code className="mx-1 font-mono">/api/proxy/agent-chat/{'{id}'}</code> on KRE Nexus.
              Auth automatic (your ForgeFuzz login JWT is auto-attached); KRE enforces a public
              <strong> token budget</strong> (default 7,000 tokens/agent). Use this for quick
              demos and shareable testing — no extra secret needed.
            </div>
            <div>
              <strong className="text-indigo-600 dark:text-indigo-300">Authenticated</strong> — hits
              <code className="mx-1 font-mono">/api/agents/{'{id}'}/run</code> with the
              <em> full MCP tool-loop</em> (multi-step reasoning, tool calls, session persistence).
              No token budget for agent owners. Paste your KRE Nexus / Firebase JWT — same email
              that owns the agent on KRE.
            </div>
            <div className="text-text-muted">
              ⚙︎ Execution happens on <strong>KRE Nexus' Cloud Run</strong>, not your backend.
              ForgeFuzz only relays the request and renders the response. Your data: message →
              KRE → KRE's model provider → reply.
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2" data-testid="kre-mode-grid">
          {([
            { id: 'sandbox', label: 'Sandbox', sub: 'No setup · public token limit' },
            { id: 'auth',    label: 'Authenticated', sub: 'JWT · full MCP tool-loop' },
          ] as const).map((m) => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)}
                    data-testid={`kre-mode-${m.id}`}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      mode === m.id
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-300'
                        : 'border-border bg-surface hover:border-text-muted/50',
                    )}>
              <div className={cn('text-sm font-semibold', mode === m.id ? 'text-indigo-600 dark:text-indigo-300' : 'text-text-primary')}>
                {m.label}
              </div>
              <div className="mt-0.5 text-[11px] text-text-muted">{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {mode === 'auth' && (
        <Field label="JWT Bearer Token (ForgeQ or Firebase)">
          <input type="password" value={jwt} onChange={(e) => setJwt(e.target.value)}
                 placeholder="eyJhbGciOiJIUzUxMiJ9…"
                 data-testid="kre-jwt-input"
                 className={cn(inputCls, 'font-mono')} />
        </Field>
      )}

      {/* Action toggle */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Action</div>
        <div className="inline-flex gap-1 rounded-md border border-border bg-elevated/40 p-1">
          {([
            { id: 'chat',   label: 'Chat' },
            { id: 'run',    label: 'Run Task' },
            { id: 'status', label: 'Status' },
          ] as const).map((a) => (
            <button key={a.id} type="button" onClick={() => setAction(a.id)}
                    data-testid={`kre-action-${a.id}`}
                    className={cn(
                      'rounded px-3 py-1 text-[11px] font-semibold transition-colors',
                      action === a.id ? 'bg-indigo-500 text-white' : 'text-text-secondary hover:bg-elevated',
                    )}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {action !== 'status' && (
        <Field label={action === 'chat' ? 'Message' : 'Input / Task'}>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    data-testid="kre-message-input"
                    className={cn(inputCls, 'resize-y font-mono')} />
        </Field>
      )}

      {action === 'chat' && (
        <Field label="Session ID (optional — preserves conversation)">
          <input value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                 placeholder="auto-assigned by server"
                 data-testid="kre-session-id"
                 className={cn(inputCls, 'font-mono')} />
        </Field>
      )}

      {/* Token usage meter — visible as soon as we know the agent's cap,
       *  even before the first call. Persisted to localStorage so a
       *  refresh keeps the running total instead of resetting to 0. */}
      {tokenUsage && (
        <div className="rounded-md border border-indigo-500/30 bg-indigo-500/5 p-3"
             data-testid="kre-token-meter">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-indigo-700 dark:text-indigo-300">
              Public Token Budget
              {tokenUsage.used === 0 && (
                <span className="ml-1.5 rounded bg-indigo-500/10 px-1 py-0.5 text-[9px] font-mono uppercase text-indigo-500">
                  fresh
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-text-muted">
                {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()}
              </span>
              <button type="button" onClick={() => writeTokenUsage({ used: 0, limit: tokenUsage.limit })}
                      data-testid="kre-token-reset"
                      title="Reset local usage counter (the upstream server is unaffected)"
                      className="rounded border border-border bg-surface px-1.5 py-0 text-[9px] font-mono text-text-muted hover:bg-elevated">
                reset
              </button>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <div className={cn(
              'h-full transition-all',
              tokenPct >= 100 ? 'bg-danger'
                : tokenPct > 80 ? 'bg-amber-500'
                : 'bg-indigo-500',
            )} style={{ width: `${tokenPct}%` }} />
          </div>
          {tokenPct >= 100 && (
            <div className="mt-1.5 text-[10px] text-danger">
              Budget exhausted — switch to <strong>Authenticated</strong> mode (uses agent owner's quota) or request access from the marketplace card.
            </div>
          )}
        </div>
      )}

      <button type="button" onClick={run} disabled={busy || !agentId.trim()}
              data-testid="kre-run-btn"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow hover:bg-indigo-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {action === 'chat' ? 'Send Chat' : action === 'run' ? 'Run Task' : 'Fetch Status'}
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
  // Inline tools list — also rendered below "List Tools" so the user can
  // pick a tool without scrolling to the right-hand ResultPanel.
  const [inlineTools, setInlineTools] = useState<Array<{ name: string; description?: string; inputSchema?: any }>>([]);

  // Live health dot — a real tools/list probe against whatever URL is
  // currently typed, debounced so we don't fire on every keystroke.
  // Previously the only feedback for "server is down" was a generic
  // error after clicking List Tools / Call Tool.
  const [health, setHealth] = useState<McpHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  useEffect(() => {
    if (!baseUrl.trim()) { setHealth(null); return; }
    setCheckingHealth(true);
    const t = setTimeout(() => {
      mcpHealth(workspaceId, baseUrl.trim(), transport)
        .then(setHealth)
        .catch(() => setHealth({ status: 'down', circuitOpen: false }))
        .finally(() => setCheckingHealth(false));
    }, 700);
    return () => clearTimeout(t);
  }, [workspaceId, baseUrl, transport]);

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

  const useToolInline = (t: { name: string; inputSchema?: any }) => {
    setTool(t.name);
    setArgs(skeletonFromSchema(t.inputSchema));
    document.getElementById('mcp-tool-call-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const runListTools = async () => {
    setBusy(true);
    try {
      const r = await mcpListTools(workspaceId, baseUrl, { transport } as any);
      window.dispatchEvent(new CustomEvent('forgeq:agent-result', { detail: r }));
      // Mirror locally so the tools list also appears under the button.
      const parsed = extractMcpTools(r);
      setInlineTools(parsed ?? []);
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
        <div className="relative">
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={cn(inputCls, 'pr-8')} />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2" title={
            checkingHealth ? 'Checking…'
              : health?.status === 'up' ? `Server reachable${health.lastLatencyMs != null ? ` (${health.lastLatencyMs}ms)` : ''}`
              : health?.status === 'down' ? (health.circuitOpen ? 'Circuit open — repeated failures, backing off' : `Server unreachable${health.error ? `: ${health.error}` : ''}`)
              : health?.status === 'degraded' ? 'Last call failed — may be flaky'
              : 'Not checked yet'
          }>
            {checkingHealth ? (
              <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
            ) : (
              <span className={cn('block h-2 w-2 rounded-full',
                health?.status === 'up' ? 'bg-success' :
                health?.status === 'down' ? 'bg-danger' :
                health?.status === 'degraded' ? 'bg-amber-500' : 'bg-text-muted/30')} />
            )}
          </span>
        </div>
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

      {/* Inline tools list — picks one to auto-fill the form below. */}
      {inlineTools.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2"
             data-testid="ai-testing-mcp-tools-inline">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <span>Available tools · {inlineTools.length}</span>
            <button type="button" onClick={() => setInlineTools([])}
                    className="text-text-muted hover:text-text-primary">
              Hide
            </button>
          </div>
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {inlineTools.map((t) => (
              <button key={t.name} type="button" onClick={() => useToolInline(t)}
                      data-testid={`mcp-tool-pick-${t.name}`}
                      className={cn(
                        'block w-full rounded border bg-surface px-2 py-1.5 text-left transition-colors',
                        tool === t.name
                          ? 'border-emerald-400 ring-1 ring-emerald-300'
                          : 'border-border hover:border-emerald-400/60',
                      )}>
                <div className="flex items-center gap-2">
                  <Wrench className="h-3 w-3 text-emerald-500" />
                  <span className="font-mono text-[11px] font-semibold">{t.name}</span>
                </div>
                {t.description && (
                  <div className="mt-0.5 line-clamp-2 text-[10px] text-text-muted">{t.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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
    // Clear stale result when the user switches between protocol tabs
    // (KRE → MCP → A2A …). Without this, the previous chat / tool-list
    // output stays visible on the new tab, which is confusing.
    const reset = () => setResult(null);
    window.addEventListener('forgeq:agent-result', h as any);
    window.addEventListener('forgeq:agent-reset', reset as any);
    return () => {
      window.removeEventListener('forgeq:agent-result', h as any);
      window.removeEventListener('forgeq:agent-reset', reset as any);
    };
  }, []);

  // Decide whether the "Response (JSON-RPC)" block adds anything beyond
  // what the user already sees. When `finalText` is present, the Raw
  // JSON expandable below already contains the exact same payload (it's
  // nested inside `result.body.response_json`) — so showing it twice is
  // just noise. We hide it in that case and let users open Raw JSON if
  // they want the full envelope.
  const hasFinal = !!result?.finalText;
  const showJsonRpc =
    result?.body?.response_json
    && !extractMcpTools(result)
    && !hasFinal;

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/40 p-5"
         data-testid="ai-testing-agent-result">
      <div className="mb-3 flex items-center gap-2">
        <ChevronDown className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-muted">Execution Result</h3>
      </div>
      {!result ? (
        <div className="grid h-48 place-items-center rounded-md border border-dashed border-border bg-probestack-bg text-sm text-text-muted">
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
          {showJsonRpc && (
            <details className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3" open>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Server response
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
          {/* KPI tiles. We pull token usage from a few well-known locations
              so KRE Nexus (deep-nested `public_token_usage`), Direct Agent
              (`totalTokens`), and MCP (no usage) all light up correctly. */}
          {(() => {
            const usage = extractTokenUsage(result);
            const used  = usage?.used ?? result.totalTokens;
            const limit = usage?.limit;
            const remaining = usage?.remaining;
            return (
              <div className={cn('grid gap-2', usage ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3')}>
                <Tile label="Cost"    value={'$' + (result.totalCostUsd ?? 0).toFixed(6)} />
                <Tile
                  label={usage ? 'Tokens used' : 'Tokens'}
                  value={used != null
                    ? (limit
                        ? `${Number(used).toLocaleString()} / ${Number(limit).toLocaleString()}`
                        : Number(used).toLocaleString())
                    : '—'}
                />
                {usage && remaining != null && (
                  <Tile label="Remaining" value={Number(remaining).toLocaleString()} />
                )}
                <Tile label="Latency" value={(result.latencyMs ?? result.body?.latency_ms ?? 0) + ' ms'} />
              </div>
            );
          })()}

          {/* Execution Trace — Postman-style step breakdown */}
          <ExecutionTrace result={result} />

          <details className="rounded-md border border-border bg-probestack-bg p-2">
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
 * Extract token-usage figures from anywhere in the response envelope.
 * Handles:
 *   • KRE Nexus chat — result.body.response_json.body.public_token_usage
 *     { tokensUsed, tokenLimit, remaining }
 *   • Direct Agent runner — top-level `totalTokens` + optional `tokenLimit`
 *   • Misc shapes — `tokensUsed` / `tokens_used` / `usage.totalTokens`
 */
function extractTokenUsage(result: any): { used: number; limit?: number; remaining?: number } | null {
  if (!result) return null;
  // KRE nested public usage (deepest first, that's where the real numbers live).
  const kre = result?.body?.response_json?.body?.public_token_usage
           ?? result?.body?.public_token_usage;
  if (kre && typeof kre === 'object') {
    const used = Number(kre.tokensUsed ?? kre.tokens_used ?? kre.used);
    if (Number.isFinite(used)) {
      return {
        used,
        limit: Number(kre.tokenLimit ?? kre.token_limit ?? kre.limit) || undefined,
        remaining: Number(kre.remaining) || undefined,
      };
    }
  }
  // Some KRE payloads send flat fields on the inner body.
  const inner = result?.body?.response_json?.body;
  if (inner && (inner.tokensUsed != null || inner.tokens_used != null)) {
    const used = Number(inner.tokensUsed ?? inner.tokens_used);
    return {
      used,
      limit: Number(inner.tokenLimit ?? inner.token_limit) || undefined,
      remaining: Number(inner.remaining) || undefined,
    };
  }
  // Direct Agent / generic shapes.
  const top = result?.totalTokens
           ?? result?.tokensUsed
           ?? result?.usage?.totalTokens;
  if (top != null) {
    return {
      used: Number(top),
      limit: result?.tokenLimit ?? undefined,
      remaining: result?.tokensRemaining ?? undefined,
    };
  }
  return null;
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
