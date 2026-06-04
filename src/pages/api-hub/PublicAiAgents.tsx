import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Search, Loader2, Building2, Filter, Download, ArrowRight, Tag, Eye, ChevronDown, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/utils/cn';
import { fetchAgentsPage, importAgentToWorkspace, type PublicAgentCard } from '@/services/publicAiAgents.service';

const PAGE_SIZE = 30;

export const PublicAiAgents = () => {
  const navigate = useNavigate();
  const isAuthed = useAuth(s => s.isAuthenticated());
  const ws = useWorkspaceStore(s => s.current);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('any');
  const [page, setPage] = useState(0);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const providerRef = useRef<HTMLDivElement>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Paginated data
  const [agents, setAgents] = useState<PublicAgentCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load page when page index changes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = page * PAGE_SIZE;
        const result = await fetchAgentsPage(PAGE_SIZE, offset);
        setAgents(result.agents);
        setTotal(result.total);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page]);

  // Client‑side search & filter on the currently loaded agents
  const filteredAgents = useMemo(() => {
    let result = agents;
    if (debouncedQ) {
      result = result.filter(a =>
        `${a.name} ${a.provider} ${a.description} ${a.tags.join(' ')}`.toLowerCase().includes(debouncedQ)
      );
    }
    if (providerFilter !== 'any') {
      result = result.filter(a => a.provider === providerFilter);
    }
    return result;
  }, [agents, debouncedQ, providerFilter]);

  // Unique providers from current page
  const providers = useMemo(() => {
    const set = new Set<string>();
    agents.forEach(a => set.add(a.provider));
    return Array.from(set).sort();
  }, [agents]);

  const filteredProviders = useMemo(() => {
    if (!providerSearch) return providers;
    return providers.filter(p => p.toLowerCase().includes(providerSearch.toLowerCase()));
  }, [providers, providerSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const safePage = Math.min(page, totalPages - 1);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedQ, providerFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTryIt = async (agent: PublicAgentCard, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      navigate(`/login?returnTo=${encodeURIComponent(`/api-hub?tab=agents&try=${agent.id}`)}`);
      return;
    }
    if (!ws?.id) {
      toast.error('Select a workspace first');
      return;
    }
    setImportingId(agent.id);
    const tid = toast.loading(`Importing ${agent.name}…`);
    try {
      const result = await importAgentToWorkspace(agent, ws.id);
      toast.success(`Imported ${agent.name}`, { id: tid, description: `${result.requestCount} endpoints added.` });
      navigate(`/projects/collections/${result.collectionId}`);
    } catch (err: any) {
      toast.error('Import failed', { id: tid, description: err.message });
    } finally {
      setImportingId(null);
    }
  };

  if (loading && agents.length === 0) return <SkeletonGrid />;
  if (error && agents.length === 0) return <ErrorState message={error} />;

  return (
    <div data-testid="ai-agents-container">
      <div className="mb-6 flex flex-col items-center gap-4">
        <div className="flex w-full max-w-3xl items-center gap-2 rounded-xl border border-border bg-surface px-0 pl-2 shadow-sm mx-auto">
          <Search className="ml-2 h-4 w-4 text-text-muted" />
          <div className="flex-1 border-l-2 border-border rounded-r-xl ml-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search agents by name, provider, or capability..."
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
            />
          </div>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-text-muted" />}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <div className="relative" ref={providerRef}>
            <button
              onClick={() => setShowProviderDropdown(!showProviderDropdown)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 pl-3 pr-2 py-1"
            >
              <Building2 className="h-3 w-3" />
              <span className="text-[11px] font-medium">{providerFilter === 'any' ? 'Any provider' : providerFilter}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showProviderDropdown && (
              <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-xl border border-border bg-surface shadow-lg">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder="Search provider..."
                    className="w-full rounded-md border px-2 py-1.5 text-[11px] outline-none"
                    autoFocus
                  />
                </div>
                <ul className="max-h-64 overflow-auto">
                  <li
                    className={cn('px-3 py-2 cursor-pointer hover:bg-hover', providerFilter === 'any' && 'bg-primary/10 text-primary font-semibold')}
                    onClick={() => { setProviderFilter('any'); setShowProviderDropdown(false); setProviderSearch(''); }}
                  >
                    Any provider
                  </li>
                  {filteredProviders.slice(0, 8).map(p => (
                    <li
                      key={p}
                      className={cn('px-3 py-2 cursor-pointer hover:bg-hover', providerFilter === p && 'bg-primary/10 text-primary font-semibold')}
                      onClick={() => { setProviderFilter(p); setShowProviderDropdown(false); setProviderSearch(''); }}
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1">
            <Bot className="h-3 w-3" />
            <strong className="font-semibold text-text-primary">{filteredAgents.length}</strong> / {total}
          </span>
          {(debouncedQ || providerFilter !== 'any') && (
            <button
              onClick={() => { setQ(''); setProviderFilter('any'); setProviderSearch(''); setPage(0); }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/50 px-3 py-1 text-[11px] font-medium hover:text-primary"
            >
              <Filter className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <EmptyState filtered={!!debouncedQ || providerFilter !== 'any'} />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} importingId={importingId} onTryIt={handleTryIt} />
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2 text-xs">
              <button
                disabled={safePage === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary disabled:opacity-40 hover:text-primary"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-text-muted">Page <strong className="text-text-primary">{safePage + 1}</strong> of <strong>{totalPages}</strong></span>
              <button
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary disabled:opacity-40 hover:text-primary"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

const AgentCard = ({ agent, importingId, onTryIt }: { agent: PublicAgentCard; importingId: string | null; onTryIt: (agent: PublicAgentCard, e: React.MouseEvent) => void }) => {
  const detailHref = `/api-hub/agents/${encodeURIComponent(agent.id)}`;
  const isImporting = importingId === agent.id;

  return (
    <li>
      <Link to={detailHref} state={{ agent }} className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <div className="flex items-start gap-3">
          {agent.logoUrl ? (
            <img src={agent.logoUrl} className="h-12 w-12 rounded-md border object-cover" alt="" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-sm bg-primary/10 text-primary"><Bot className="h-8 w-8" /></div>
          )}
          <div>
            <h3 className="truncate text-sm font-semibold group-hover:text-primary">{agent.name}</h3>
            <p className="text-[10px] uppercase text-warning/80">{agent.provider}</p>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-text-muted">{agent.description}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">{agent.protocol?.toUpperCase() || 'API'}</span>
          {/* SAFE: ensure agent.tags is an array before slicing */}
          {Array.isArray(agent.tags) && agent.tags.slice(0, 2).map((t: string) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
              <Tag className="h-2.5 w-2.5" /> {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1 group-hover:text-primary"><Eye className="h-3 w-3" /> View details</span>
          <button onClick={(e) => onTryIt(agent, e)} disabled={isImporting} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60">
            {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Try It
          </button>
        </div>
      </Link>
    </li>
  );
};

const SkeletonGrid = () => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 9 }).map((_, i) => (
      <li key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-surface" />
    ))}
  </ul>
);

const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-12 text-center">
    <Bot className="mx-auto mb-4 h-10 w-10 text-text-muted" />
    <h3 className="text-base font-semibold">{filtered ? 'No agents match your filters' : 'No public agents found'}</h3>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
    <p className="text-sm font-semibold text-destructive">Couldn&apos;t load AI agents</p>
    <p className="mt-1 text-xs text-text-muted">{message}</p>
  </div>
);