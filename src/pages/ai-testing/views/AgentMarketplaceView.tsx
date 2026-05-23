/**
 * AgentMarketplaceView — pulls a curated list of agents from the
 * configured marketplace API (set by senior's external service) and
 * lets the user "Try in Playground" → pre-fills the Agent Testing form
 * with that agent's config.
 *
 * If the marketplace API URL isn't configured yet, we render a placeholder
 * with a built-in starter set so the demo never looks empty.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Bot, ExternalLink, Search, Loader2, RotateCw, Filter,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface MarketplaceAgent {
  id: string;
  name: string;
  vendor: string;
  protocol: 'direct' | 'a2a' | 'acp' | 'mcp';
  category: string;
  description: string;
  baseUrl?: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tags?: string[];
  iconColor?: string;
}

/** Stub catalog — replaced at runtime if a marketplace URL is configured. */
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
};

export const AgentMarketplaceView = ({ workspaceId: _workspaceId }: { workspaceId: string }) => {
  const nav = useNavigate();
  const [agents, setAgents] = useState<MarketplaceAgent[]>(STARTER_CATALOG);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [proto, setProto] = useState<'all' | 'direct' | 'a2a' | 'acp' | 'mcp'>('all');

  const fetchMarketplace = async () => {
    const url = (import.meta as any).env?.VITE_AGENT_MARKETPLACE_URL;
    if (!url) return; // stub catalog already in place
    setLoading(true);
    try {
      const r = await fetch(url, { method: 'GET' });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setAgents(data);
        else if (Array.isArray(data.agents)) setAgents(data.agents);
      }
    } catch { /* keep starter catalog */ }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchMarketplace(); }, []);

  const filtered = agents.filter((a) => {
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

  const tryAgent = (a: MarketplaceAgent) => {
    // Stash the agent payload in sessionStorage and jump to Agent Testing
    sessionStorage.setItem('forgeq:marketplace:prefill', JSON.stringify(a));
    nav(`/projects/ai-testing?view=agent-testing&proto=${a.protocol}`);
  };

  return (
    <div className="space-y-5 p-6" data-testid="ai-testing-marketplace">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            Agent Marketplace
            <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">NEW</span>
          </h2>
          <p className="text-sm text-text-muted">
            Curated catalog of internal and 3rd-party agents you can test in one click.
          </p>
        </div>
        <button type="button" onClick={fetchMarketplace} disabled={loading}
                data-testid="ai-testing-marketplace-refresh"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

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
          {(['all','direct','a2a','acp','mcp'] as const).map((p) => (
            <button key={p} type="button" onClick={() => setProto(p)}
                    data-testid={`ai-testing-marketplace-filter-${p}`}
                    className={cn(
                      'rounded px-2 py-1 text-[11px] font-semibold transition-colors',
                      proto === p ? 'bg-primary text-white' : 'text-text-secondary hover:bg-elevated',
                    )}>
              {p === 'all' ? 'All' : p.toUpperCase()}
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
                 className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40">
              <div className="flex items-start gap-3">
                <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', a.iconColor ?? 'bg-elevated text-text-secondary')}>
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', PROTOCOL_COLORS[a.protocol])}>
                      {a.protocol.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-muted">{a.vendor} · {a.category}</div>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-text-secondary">{a.description}</p>
              {(a.tags && a.tags.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.tags.map((t) => (
                    <span key={t} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-secondary">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => tryAgent(a)}
                      data-testid={`ai-testing-marketplace-try-${a.id}`}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary/90">
                <Sparkles className="h-3 w-3" /> Try in Playground
              </button>
            </div>
          ))}
        </div>
      )}

      {/* <div className="mt-4 rounded-md border border-dashed border-border bg-elevated/30 p-3 text-[11px] text-text-muted">
        <ExternalLink className="mr-1.5 inline h-3 w-3" />
        Marketplace pulls from <code className="font-mono text-text-primary">{(import.meta as any).env?.VITE_AGENT_MARKETPLACE_URL ?? '(not configured — using starter catalog)'}</code>.
        Set <code className="font-mono">VITE_AGENT_MARKETPLACE_URL</code> in <code className="font-mono">.env</code> to switch to your live registry.
      </div> */}
    </div>
  );
};
