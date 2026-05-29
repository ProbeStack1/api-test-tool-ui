/**
 * AgentMarketplaceView — curated catalog of agents.
 *
 *   • Pulls live KRE Nexus agents via the shared `krenexusApi` (which now
 *     auto-attaches the user's ForgeQ JWT on every call).
 *   • Card body click → opens `AgentDetailDrawer` (right-side, full bio,
 *     endpoint table, copy-as-cURL per row, request-access form).
 *   • Quick action buttons remain on the card:
 *       – Try in Playground → opens AgentTesting tab pre-filled
 *       – Save to Collection → saves all 4 endpoints into a folder
 *
 * Designed so a non-technical user can browse → understand → test in
 * under 30 seconds, without losing the previous "starter catalog" stubs
 * used for screenshots / demos.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles, Bot, Search, Loader2, RotateCw, Filter, BookmarkPlus, Cloud, ShieldAlert, Activity,
  Info,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { krenexusApi, kreBaseUrl, type KreAgent, type KreDeployedApi } from '../../../api/kernexux.api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  apiListCollections, apiCreateCollection, apiCreateFolder, apiGetFolderTree,
} from '@/api/collection.api';
import { apiCreateRequest, apiListRequests } from '@/api/request.api';
import { AgentDetailDrawer } from './AgentDetailDrawer';
import { agentToPostmanCollection } from '@/utils/agentToCollection';

/* ────────────────────────── Catalog types ─────────────────────────────── */

interface MarketplaceAgent {
  id: string;
  name: string;
  vendor: string;
  protocol: 'direct' | 'a2a' | 'acp' | 'mcp' | 'kre';
  category: string;
  description: string;
  baseUrl?: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tags?: string[];
  iconColor?: string;
  /** KRE Nexus only: */
  kreAgentId?: string;
  publicTokenLimit?: number;
  deployedApis?: KreDeployedApi[];
  deploymentUrl?: string;
  /** Original KreAgent payload — kept for the detail drawer. */
  kreRaw?: KreAgent;
}

/** Stub catalog — pre-populated so the page never looks empty. */
const STARTER_CATALOG: MarketplaceAgent[] = [
  { id: 'gh-deepwiki',   name: 'DeepWiki',          vendor: 'Cognition Labs', protocol: 'mcp',
    category: 'Code Q&A', description: 'Ask natural-language questions about any public GitHub repo.',
    baseUrl: 'https://mcp.deepwiki.com', tags: ['code','rag'], iconColor: 'bg-emerald-500/15 text-emerald-600' },
  { id: 'gh-search',     name: 'GitHub Search Agent', vendor: 'Anthropic',    protocol: 'mcp',
    category: 'Code Q&A', description: 'Searches GitHub issues, PRs, code, and discussions.',
    baseUrl: 'https://mcp.github.com', tags: ['code','search'], iconColor: 'bg-purple-500/15 text-purple-600' },
  { id: 'researcher',    name: 'Web Researcher',    vendor: 'BeeAI',         protocol: 'acp',
    category: 'Research', description: 'Multi-step web research with citations.',
    baseUrl: 'https://beeai.dev/agents/researcher', tags: ['web','research'],
    iconColor: 'bg-teal-500/15 text-teal-600' },
  { id: 'sql-buddy',     name: 'SQL Buddy',         vendor: 'Google',         protocol: 'a2a',
    category: 'Data',     description: 'Generates and explains SQL across Postgres / MySQL / BigQuery.',
    baseUrl: 'https://a2a.googleapis.com/agents/sql-buddy', tags: ['sql','data'],
    iconColor: 'bg-orange-500/15 text-orange-600' },
  { id: 'native-react',  name: 'ReAct Math Tutor',  vendor: 'Built-in',       protocol: 'direct',
    category: 'Math',     description: 'Step-by-step math tutoring with built-in calculator tool.',
    provider: 'openai', model: 'gpt-4o-mini',
    systemPrompt: 'You are a patient math tutor. Show your work step by step. When asked to compute, use the calculate tool.',
    tags: ['math','built-in'], iconColor: 'bg-orange-500/15 text-orange-600' },
  { id: 'native-hr',     name: 'HR Buddy',          vendor: 'Built-in',       protocol: 'direct',
    category: 'HR',       description: 'Friendly HR Q&A bot — answers policy questions concisely.',
    provider: 'google', model: 'gemini-2.5-flash',
    systemPrompt: 'You are HR Buddy at ACME. Answer concisely (≤2 sentences). If unsure, say so.',
    tags: ['hr','support'], iconColor: 'bg-emerald-500/15 text-emerald-600' },
];

const PROTOCOL_COLORS: Record<string, string> = {
  direct: 'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300',
  a2a:    'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300',
  acp:    'bg-teal-100   dark:bg-teal-500/15   text-teal-600   dark:text-teal-300',
  mcp:    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  kre:    'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
};

const PROTOCOL_LABEL: Record<string, string> = {
  direct: 'DIRECT', a2a: 'A2A', acp: 'ACP', mcp: 'MCP', kre: 'KRE',
};

/** Map a normalised KRE agent → MarketplaceAgent card. */
function mapKreAgent(a: KreAgent): MarketplaceAgent {
  return {
    id: `kre-${a.id}`,
    name: a.name || a.id,
    vendor: a.organization || a.ownerName || 'KRE Nexus',
    protocol: 'kre',
    category: a.agentType || (a.capabilities?.[0] ?? 'AI Agent'),
    description: a.description || 'KRE Nexus AI agent — chat, run tasks, and inspect deployed APIs.',
    baseUrl: undefined,
    tags: a.tags || a.capabilities?.slice(0, 4),
    iconColor: 'bg-indigo-500/15 text-indigo-600',
    kreAgentId: a.id,
    publicTokenLimit: a.publicTokenLimit,
    deployedApis: a.deployedApis,
    deploymentUrl: undefined,
    kreRaw: a,
  };
}

/* ────────────────────────── Component ─────────────────────────────────── */

export const AgentMarketplaceView = ({ workspaceId }: { workspaceId: string }) => {
  const nav = useNavigate();
  const wsId = workspaceId || useWorkspaceStore.getState().currentId || '';
  const [kreAgents, setKreAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [kreLoadError, setKreLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [proto, setProto] = useState<'all' | 'direct' | 'a2a' | 'acp' | 'mcp' | 'kre'>('all');
  const [drawerAgent, setDrawerAgent] = useState<KreAgent | null>(null);

  /** Pull live KRE Nexus agents via the shared `krenexusApi`. */
  const fetchKreAgents = async () => {
    setLoading(true);
    setKreLoadError(null);
    try {
      const { agents } = await krenexusApi.listAgents();
      setKreAgents(agents.map(mapKreAgent));
      if (agents.length === 0) {
        setKreLoadError('KRE Nexus marketplace returned 0 agents.');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const msg    = e?.response?.data?.detail
                  || (Array.isArray(e?.response?.data?.detail) ? JSON.stringify(e.response.data.detail) : '')
                  || e?.message
                  || 'Failed to reach KRE Nexus marketplace.';
      if (status === 401 || status === 403 || status === 422) {
        setKreLoadError(
          'KRE Nexus requires a logged-in session — your JWT is missing or expired. Sign in again to load live agents.',
        );
      } else {
        setKreLoadError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      setKreAgents([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchKreAgents(); }, []);

  // KRE agents first (newest), then static catalog.
  const allAgents = useMemo(() => [...kreAgents, ...STARTER_CATALOG], [kreAgents]);

  const filtered = allAgents.filter((a) => {
    if (proto !== 'all' && a.protocol !== proto) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!(a.name.toLowerCase().includes(q) ||
            a.vendor.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            (a.tags ?? []).some((t) => t.toLowerCase().includes(q)))) return false;
    }
    return true;
  });

  const openDrawer = (a: MarketplaceAgent) => {
    if (a.protocol === 'kre' && a.kreRaw) {
      setDrawerAgent(a.kreRaw);
    } else {
      // Non-KRE: build a minimal KreAgent shape so the drawer still
      // renders something useful (description + capabilities chips).
      setDrawerAgent({
        id: a.id,
        name: a.name,
        description: a.description,
        agentType: a.category,
        ownerName: a.vendor,
        tags: a.tags,
        capabilities: a.tags,
        status: 'available',
      });
    }
  };

  const tryAgent = (a: MarketplaceAgent) => {
    sessionStorage.setItem('forgeq:marketplace:prefill', JSON.stringify(a));
    setDrawerAgent(null);
    nav(`/projects/ai-testing?view=agent-testing&proto=${a.protocol}`);
  };

  const onTrySandbox = (raw: KreAgent) => {
    const a = mapKreAgent(raw);
    tryAgent(a);
  };

  /** Save a KRE agent's full endpoint suite into a Collection. */
  const saveToCollection = async (a: MarketplaceAgent) => {
    if (a.protocol !== 'kre' || !a.kreAgentId) {
      toast.error('Only KRE Nexus agents can be saved as a collection.');
      return;
    }
    if (!wsId) {
      toast.error('Select a workspace first.');
      return;
    }
    setSavingId(a.id);
    try {
      const collections = await apiListCollections(wsId);
      let coll = collections.find((c) => c.name.toLowerCase() === 'kre nexus agents');
      if (!coll) {
        coll = await apiCreateCollection(wsId, {
          name: 'KRE Nexus Agents',
          description: 'Saved KRE Nexus AI agents — pulled from the marketplace.',
        });
      }
      const tree = await apiGetFolderTree(coll.id).catch(() => ({ root: { folders: [] } } as any));
      const existingFolder = (tree?.root?.folders ?? []).find((f: any) => f?.name === a.name);
      const folder = existingFolder
        ? existingFolder
        : await apiCreateFolder(coll.id, {
            name: a.name,
            description: `${a.vendor || 'KRE Nexus'} · token limit ${a.publicTokenLimit ?? 'unlimited'}`,
          });

      const endpoints: KreDeployedApi[] =
        (a.deployedApis && a.deployedApis.length > 0)
          ? a.deployedApis
          : [
              { method: 'POST', path: `/api/proxy/agent-chat/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-chat/${a.kreAgentId}`, description: 'Chat (Sandbox)' },
              { method: 'POST', path: `/api/proxy/agent-run/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-run/${a.kreAgentId}`,  description: 'Run Task (Sandbox)' },
              { method: 'GET',  path: `/api/proxy/agent-info/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-info/${a.kreAgentId}`, description: 'Agent Info' },
              { method: 'GET',  path: `/api/proxy/agent-status/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-status/${a.kreAgentId}`, description: 'Agent Status' },
            ];

      const existing = await apiListRequests(coll.id, folder.id).catch(() => []);
      const existingKeys = new Set(
        existing.map((r: any) => `${r.method}|${r.url?.raw ?? ''}`),
      );

      let created = 0;
      for (const ep of endpoints) {
        const key = `${ep.method}|${ep.url}`;
        if (existingKeys.has(key)) continue;
        const requiresBody = ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH';
        const isChat = /chat/i.test(ep.path);
        const isRun = /run/i.test(ep.path);
        const body = !requiresBody
          ? { mode: 'none' as const }
          : isChat
            ? { mode: 'raw' as const, language: 'json' as const,
                raw: JSON.stringify({ message: 'Hello!', session_id: null }, null, 2) }
            : isRun
              ? { mode: 'raw' as const, language: 'json' as const,
                  raw: JSON.stringify({ input: 'Describe what you can do.' }, null, 2) }
              : { mode: 'none' as const };
        await apiCreateRequest(
          coll.id,
          {
            collectionId: coll.id,
            folderId: folder.id,
            name: `${ep.description || ep.path} · ${a.name}`,
            method: ep.method,
            url: { raw: ep.url },
            headers: requiresBody
              ? [{ key: 'Content-Type', value: 'application/json', enabled: true }]
              : [],
            auth: { type: 'none' as const },
            body,
            variables: [],
          } as any,
          wsId,
        );
        created++;
      }

      toast.success(
        created > 0
          ? `Saved ${created} endpoint${created === 1 ? '' : 's'} to "KRE Nexus Agents → ${a.name}"`
          : `"${a.name}" already saved in collection`,
        { duration: 3500 },
      );
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message || 'Unknown error' });
    } finally {
      setSavingId(null);
    }
  };

  /** Used by the drawer's "Import as Collection" button. */
  const onImportCollection = async (raw: KreAgent) => {
    try {
      const postman = agentToPostmanCollection(raw);
      const blob = new Blob([JSON.stringify(postman, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${raw.name.replace(/\W+/g, '_').toLowerCase()}.postman_collection.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      toast.success('Postman collection downloaded', { description: `${raw.name}` });
      // Then also save into the workspace collection for one-click reuse.
      const mapped = mapKreAgent(raw);
      await saveToCollection(mapped);
    } catch (e: any) {
      toast.error('Import failed', { description: e?.message || 'Unknown error' });
    }
  };

  return (
    <div className="space-y-5 p-6" data-testid="ai-testing-marketplace">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            Agent Marketplace
            <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
              KRE NEXUS · LIVE
            </span>
          </h2>
          <p className="text-sm text-text-muted">
            Click any card for the full bio. Then either <strong>Try in Playground</strong> or <strong>Save to Collection</strong>.
          </p>
        </div>
        <button type="button" onClick={fetchKreAgents} disabled={loading}
                data-testid="ai-testing-marketplace-refresh"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {/* Live-status banner */}
      {kreLoadError ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-[12px] text-amber-600 dark:text-amber-300"
             data-testid="ai-testing-marketplace-kre-error">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-semibold">KRE Nexus marketplace unavailable</div>
            <div className="text-amber-600/80 dark:text-amber-300/80">{kreLoadError} Showing starter catalog only.</div>
          </div>
        </div>
      ) : kreAgents.length > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-500/5 p-2.5 text-[12px] text-indigo-700 dark:text-indigo-300"
             data-testid="ai-testing-marketplace-kre-live">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          <span>
            <strong>{kreAgents.length}</strong> live KRE Nexus agent{kreAgents.length === 1 ? '' : 's'} pulled from{' '}
            <code className="font-mono text-[10px]">{kreBaseUrl().replace(/^https?:\/\//, '')}</code>
          </span>
        </div>
      ) : null}

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search by name, vendor, tag…"
                 data-testid="ai-testing-marketplace-search"
                 className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-2 text-[12px] outline-none focus:border-primary" />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          {(['all','kre','direct','a2a','acp','mcp'] as const).map((p) => (
            <button key={p} type="button" onClick={() => setProto(p)}
                    data-testid={`ai-testing-marketplace-filter-${p}`}
                    className={cn(
                      'rounded px-2 py-1 text-[11px] font-semibold transition-colors',
                      proto === p ? 'bg-primary text-white' : 'text-text-secondary hover:bg-elevated',
                    )}>
              {p === 'all' ? 'All' : PROTOCOL_LABEL[p] ?? p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-[12px] text-text-muted">
          <Filter className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No agents match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id}
                 data-testid={`ai-testing-marketplace-card-${a.id}`}
                 className="flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:shadow-sm">
              {/* Card body — clicking opens the deep-dive drawer. */}
              <button type="button"
                      data-testid={`ai-testing-marketplace-card-body-${a.id}`}
                      onClick={() => openDrawer(a)}
                      className="-m-1 flex w-full flex-col items-start gap-2 rounded-md p-1 text-left">
                <div className="flex w-full items-start gap-3">
                  <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', a.iconColor ?? 'bg-elevated text-text-secondary')}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold">{a.name}</div>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', PROTOCOL_COLORS[a.protocol])}>
                        {PROTOCOL_LABEL[a.protocol] ?? a.protocol.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-text-muted">{a.vendor} · {a.category}</div>
                  </div>
                  <Info className="h-3 w-3 shrink-0 text-text-muted opacity-50 group-hover:opacity-100" />
                </div>
                <p className="line-clamp-2 text-[11px] text-text-secondary">{a.description}</p>

                {a.protocol === 'kre' && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {a.publicTokenLimit != null && (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-indigo-700 dark:text-indigo-300">
                        {a.publicTokenLimit.toLocaleString()} tok limit
                      </span>
                    )}
                    {a.deployedApis && a.deployedApis.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-elevated px-1.5 py-0.5 font-mono text-text-secondary">
                        <Cloud className="h-2.5 w-2.5" />
                        {a.deployedApis.length} endpoint{a.deployedApis.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                )}

                {(a.tags && a.tags.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {a.tags.map((t) => (
                      <span key={t} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-secondary">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => tryAgent(a)}
                        data-testid={`ai-testing-marketplace-try-${a.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary/90">
                  <Sparkles className="h-3 w-3" /> Try in Playground
                </button>
                {a.protocol === 'kre' && (
                  <button type="button" onClick={() => saveToCollection(a)}
                          disabled={savingId === a.id || !wsId}
                          data-testid={`ai-testing-marketplace-save-${a.id}`}
                          title={!wsId ? 'Select a workspace first' : 'Save the full endpoint suite to a collection'}
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50">
                    {savingId === a.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <BookmarkPlus className="h-3 w-3" />}
                    Save
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {drawerAgent && (
        <AgentDetailDrawer
          agent={drawerAgent}
          onClose={() => setDrawerAgent(null)}
          onTrySandbox={onTrySandbox}
          onImportCollection={onImportCollection}
        />
      )}
    </div>
  );
};
