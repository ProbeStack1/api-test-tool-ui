/**
 * AgentsView — workspace-scoped registry of reusable agent definitions.
 *
 * Each agent has:
 *   • Type — single | multi_sequential | multi_parallel | multi_supervisor
 *   • Protocol — direct (no tools) | mcp | a2a | acp
 *   • Provider/model + system prompt + max iterations
 *   • Optional reference to an MCP server (from MCP Studio registry)
 *
 * Suites of type "agent" / "tool_calling" bind to one of these.
 */
import { useCallback, useEffect, useState } from 'react';
import { Bot, Plus, Loader2, Trash2, ChevronRight, Server, Save, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  listAgents, createAgent, updateAgent, deleteAgent, listMcpServers, listAgentTools,
  fetchCatalog,
  type AgentConfig, type AgentType, type AgentProto, type Catalog, type McpServerInfo, type AgentToolDef,
} from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export const AgentsView = ({ workspaceId }: { workspaceId: string }) => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [mcps, setMcps]     = useState<McpServerInfo[]>([]);
  const [cat, setCat]       = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const confirm = useConfirm();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [a, m, c] = await Promise.all([
        listAgents(workspaceId).catch(() => [] as AgentConfig[]),
        listMcpServers(workspaceId).catch(() => [] as McpServerInfo[]),
        fetchCatalog(workspaceId).catch(() => null),
      ]);
      setAgents(Array.isArray(a) ? a : []);
      setMcps(Array.isArray(m) ? m : []);
      setCat(c);
    } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this agent configuration?',
      description: 'Any test suite still bound to this agent will fail until you re-link a new agent.',
      confirmText: 'Delete agent',
      tone: 'danger',
      testId: 'agent-delete-confirm',
    });
    if (!ok) return;
    const prev = agents;
    setAgents((p) => p.filter((x) => x.id !== id));
    try {
      await deleteAgent(workspaceId, id);
      toast.success('Agent deleted');
    } catch (e: any) {
      setAgents(prev);
      toast.error('Failed', { description: e?.message ?? '' });
    }
  };

  return (
    <div className="p-6" data-testid="ai-testing-agents-view">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agents</h2>
          <p className="text-xs text-text-muted">
            Reusable agent definitions. Bind to <strong className="text-text-primary">agent</strong> or{' '}
            <strong className="text-text-primary">tool_calling</strong> suites for evaluation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          data-testid="ai-testing-agent-create-btn"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" /> New agent
        </button>
      </div>

      {loading ? (
        <div className="mt-10 grid place-items-center text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : agents.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center text-[12px] text-text-muted"
             data-testid="ai-testing-agents-empty">
          <Bot className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No agents yet. Click <strong className="text-text-primary">New agent</strong> to register one.
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {agents.map((a) => (
            <li key={a.id}
                data-testid={`ai-testing-agent-row-${a.id}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/40">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-muted text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                    {a.agentType}
                  </span>
                  <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                    {a.protocol}
                  </span>
                  {a.mcpServerId && (
                    <span className="inline-flex items-center gap-1 rounded bg-primary-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      <Server className="h-2.5 w-2.5" /> MCP linked
                    </span>
                  )}
                  {a.protocol === 'direct' && (!a.tools || a.tools.length === 0) ? (
                    <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning" title="This agent can't call any tools — it will just answer directly">
                      No tools
                    </span>
                  ) : a.tools && a.tools.length > 0 ? (
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                      {a.tools.length} tool{a.tools.length > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[11px] text-text-muted">
                  {a.provider}/{a.model} · {a.maxIterations ?? 8} max-iters
                </div>
                {a.systemPrompt && (
                  <p className="mt-1 truncate text-[11px] text-text-secondary">{a.systemPrompt}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingAgent(a)}
                data-testid={`ai-testing-agent-edit-${a.id}`}
                className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-secondary hover:bg-elevated"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(a.id!)}
                data-testid={`ai-testing-agent-delete-${a.id}`}
                className="grid h-7 w-7 place-items-center rounded-md border border-border text-danger hover:bg-danger/10"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && cat && (
        <AgentFormModal
          mode="create"
          workspaceId={workspaceId}
          catalog={cat}
          mcps={mcps}
          onClose={() => setCreating(false)}
          onSaved={(a) => { setAgents((p) => [a, ...p]); setCreating(false); }}
        />
      )}
      {editingAgent && cat && (
        <AgentFormModal
          mode="edit"
          initial={editingAgent}
          workspaceId={workspaceId}
          catalog={cat}
          mcps={mcps}
          onClose={() => setEditingAgent(null)}
          onSaved={(a) => { setAgents((p) => p.map((x) => (x.id === a.id ? a : x))); setEditingAgent(null); }}
        />
      )}
    </div>
  );
};

/* ─── Create / Edit modal ─────────────────────────────────────────────── */
const AgentFormModal = ({ mode, workspaceId, catalog, mcps, initial, onClose, onSaved }: {
  mode: 'create' | 'edit';
  workspaceId: string;
  catalog: Catalog;
  mcps: McpServerInfo[];
  initial?: AgentConfig;
  onClose: () => void;
  onSaved: (a: AgentConfig) => void;
}) => {
  const [name, setName]               = useState(initial?.name ?? '');
  const [agentType, setAgentType]     = useState<AgentType>(initial?.agentType ?? 'single');
  const [protocol, setProtocol]       = useState<AgentProto>(initial?.protocol ?? 'direct');
  const [provider, setProvider]       = useState<string>(initial?.provider ?? catalog.providers[0]?.id ?? 'openai');
  const [model, setModel]             = useState<string>(initial?.model ?? catalog.providers[0]?.models[0]?.name ?? 'gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '');
  const [maxIterations, setMaxIters]  = useState(initial?.maxIterations ?? 8);
  const [mcpServerId, setMcp]         = useState<string>(initial?.mcpServerId ?? '');
  const [busy, setBusy]               = useState(false);

  // Built-in tools the ReAct loop can actually call (same catalog the
  // Agent Testing playground uses). Previously this form never set
  // `tools` at all, so every agent-type suite ran with zero tools —
  // the model had nothing to call even if asked to.
  const [availableTools, setAvailableTools] = useState<AgentToolDef[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>(
    (initial?.tools ?? []).map((t) => String(t.name)).filter(Boolean),
  );
  useEffect(() => { listAgentTools(workspaceId).then(setAvailableTools).catch(() => setAvailableTools([])); }, [workspaceId]);
  const toggleTool = (n: string) =>
    setSelectedTools((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  // Expected call order — powers the "tool-call accuracy" diff shown on
  // suite run results. Optional; comma-separated, in the order expected.
  const [expectedSeq, setExpectedSeq] = useState((initial?.expectedToolSequence ?? []).join(', '));

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(), agentType, protocol, provider, model,
        systemPrompt: systemPrompt.trim() || undefined,
        maxIterations,
        mcpServerId: protocol === 'mcp' && mcpServerId ? mcpServerId : undefined,
        tools: protocol === 'direct' && selectedTools.length > 0 ? selectedTools.map((n) => ({ name: n })) : undefined,
        expectedToolSequence: expectedSeq.trim()
          ? expectedSeq.split(',').map((s: string) => s.trim()).filter(Boolean)
          : undefined,
      };
      const a = mode === 'edit'
        ? await updateAgent(workspaceId, initial!.id!, body)
        : await createAgent(workspaceId, body as AgentConfig);
      toast.success(mode === 'edit' ? 'Agent updated' : 'Agent created');
      onSaved(a);
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  const providerObj = catalog.providers.find((p) => p.id === provider);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4"
         data-testid={mode === 'edit' ? 'ai-testing-agent-edit-modal' : 'ai-testing-agent-create-modal'}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">{mode === 'edit' ? `Edit "${initial?.name}"` : 'New agent'}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)}
                   data-testid="ai-testing-agent-name"
                   placeholder="HR Buddy · Math tutor · Code reviewer"
                   className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Agent type">
              <select value={agentType} onChange={(e) => setAgentType(e.target.value as AgentType)}
                      data-testid="ai-testing-agent-type"
                      className={inputCls}>
                {(catalog as any).agentTypes?.map?.((t: string) => <option key={t} value={t}>{t}</option>) ??
                  ['single','multi_sequential','multi_parallel','multi_supervisor'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Protocol">
              <select value={protocol} onChange={(e) => setProtocol(e.target.value as AgentProto)}
                      data-testid="ai-testing-agent-protocol"
                      className={inputCls}>
                {(catalog as any).protocols?.map?.((t: string) => <option key={t} value={t}>{t}</option>) ??
                  ['direct','mcp','a2a','acp'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider">
              <select value={provider} onChange={(e) => {
                setProvider(e.target.value);
                const p = catalog.providers.find((x) => x.id === e.target.value);
                setModel(p?.models[0]?.name ?? 'gpt-4o-mini');
              }} className={inputCls}>
                {catalog.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select value={model} onChange={(e) => setModel(e.target.value)} className={inputCls}>
                {providerObj?.models.map((m) => (
                  <option key={m.name} value={m.name}
                          title={`$${m.promptCostPer1k}/1k prompt tok · $${m.completionCostPer1k}/1k completion tok`}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="System prompt (optional)">
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={3} className={cn(inputCls, 'resize-y')}
                      placeholder="You are a helpful assistant…" />
          </Field>

          <Field label="Max iterations">
            <input type="number" min={1} max={50} value={maxIterations}
                   onChange={(e) => setMaxIters(Math.max(1, parseInt(e.target.value || '8', 10)))}
                   className={inputCls} />
          </Field>

          {protocol === 'direct' && (
            <Field label="Tools this agent can call">
              {availableTools.length === 0 ? (
                <p className="text-[11px] text-text-muted">Loading tools…</p>
              ) : (
                <div className="flex flex-wrap gap-1.5" data-testid="ai-testing-agent-tools">
                  {availableTools.map((t) => (
                    <button type="button" key={t.name} onClick={() => toggleTool(t.name)}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                              selectedTools.includes(t.name)
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-surface text-text-secondary hover:bg-elevated',
                            )}
                            title={t.description}>
                      {t.icon} {t.name}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[10px] text-text-muted">
                Without at least one selected, a "Agent" suite bound to this config can never actually invoke a tool —
                it just answers directly, same as a plain prompt suite.
              </p>
            </Field>
          )}

          {selectedTools.length > 0 && (
            <Field label="Expected call order (optional — powers tool-call accuracy on suite runs)">
              <input value={expectedSeq} onChange={(e) => setExpectedSeq(e.target.value)} className={inputCls}
                     placeholder={`e.g. ${selectedTools[0]}${selectedTools[1] ? `, ${selectedTools[1]}` : ''}`}
                     data-testid="ai-testing-agent-expected-sequence" />
              <p className="mt-1 text-[10px] text-text-muted">Comma-separated, in the order you expect them called.</p>
            </Field>
          )}

          {protocol === 'mcp' && (
            <Field label="MCP server (from MCP Studio)">
              <select value={mcpServerId} onChange={(e) => setMcp(e.target.value)}
                      data-testid="ai-testing-agent-mcp"
                      className={inputCls}>
                <option value="">— pick one —</option>
                {mcps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {mcps.length === 0 && (
                <p className="mt-1 text-[10px] text-text-muted">
                  No MCP servers registered yet. Add one from <strong>MCP Studio</strong>.
                </p>
              )}
            </Field>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || !name.trim()}
                  data-testid="ai-testing-agent-save"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {mode === 'edit' ? 'Save changes' : 'Save agent'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: any) => (
  <div>
    <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
    {children}
  </div>
);
const inputCls =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary';
