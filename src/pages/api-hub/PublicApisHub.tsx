/**
 * PublicApisHub – The actual API hub grid (ForgeFuzz docs + APIs.guru)
 * 
 * Includes search, filters, cards, pagination, popular strip.
 * Used inside MarketplacePage.
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Globe2, Search, ArrowRight, FileText, Sparkles, Tag, Eye, Loader2,
  Layers, Building2, Filter, Download, ChevronLeft, ChevronRight, TrendingUp,
  ChevronDown, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { browsePublicDocs, countPublicDocs, type PublicHubCard } from '@/services/apiDocs.service';
import {
  fetchPublicApiCatalog,
  getProviders,
  importPublicApiToWorkspace,
  type PublicApiCard,
} from '@/services/publicApis.service';
import { useAuth } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/utils/cn';

const formatDate = (iso?: string | number | null): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
};

const FORMAT_BADGE: Record<string, string> = {
  AUTO:   'bg-primary/10 text-primary border-primary/30',
  MANUAL: 'bg-text-muted/15 text-text-secondary border-border',
  HYBRID: 'bg-warning/10 text-warning border-warning/30',
};

type UnifiedCard =
  | ({ kind: 'forgefuzz' } & PublicHubCard)
  | ({ kind: 'public' } & PublicApiCard);

const PAGE_SIZE = 30;

export const PublicApisHub = () => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'forgefuzz' | 'public'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('any');
  const [page, setPage] = useState(0);
  // Provider dropdown state
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const providerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(0); }, [debouncedQ, sourceFilter, providerFilter]);

  const forgeQ = useQuery({
    queryKey: ['public-hub', 'forgefuzz', debouncedQ],
    queryFn: () => browsePublicDocs({ q: debouncedQ || undefined, sort: 'recent', size: 120 }),
    staleTime: 30_000,
  });

  const count = useQuery({
    queryKey: ['public-hub', 'count'],
    queryFn: () => countPublicDocs(),
    staleTime: 60_000,
  });

  const guruQ = useQuery({
    queryKey: ['public-hub', 'apis-guru'],
    queryFn: () => fetchPublicApiCatalog(),
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });

  const merged = useMemo<UnifiedCard[]>(() => {
    const cards: UnifiedCard[] = [];
    if (sourceFilter !== 'public') {
      (forgeQ.data ?? []).forEach((c) => cards.push({ kind: 'forgefuzz', ...c }));
    }
    if (sourceFilter !== 'forgefuzz') {
      (guruQ.data ?? []).forEach((c) => cards.push({ kind: 'public', ...c }));
    }
    return cards;
  }, [forgeQ.data, guruQ.data, sourceFilter]);

  const providers = useMemo(() => {
    const set = new Set<string>(['ForgeFuzz']);
    getProviders(guruQ.data ?? []).forEach((p) => set.add(p));
    return Array.from(set);
  }, [guruQ.data]);

  // Filtered providers based on search term
  const filteredProviders = useMemo(() => {
    if (!providerSearch) return providers;
    return providers.filter(p => p.toLowerCase().includes(providerSearch.toLowerCase()));
  }, [providers, providerSearch]);

  const filtered = useMemo(() => {
    return merged.filter((c) => {
      if (providerFilter !== 'any') {
        if (providerFilter === 'ForgeFuzz' && c.kind !== 'forgefuzz') return false;
        if (providerFilter !== 'ForgeFuzz' && c.kind !== 'public') return false;
        if (c.kind === 'public' && c.provider !== providerFilter) return false;
      }
      if (debouncedQ) {
        const hay =
          c.kind === 'forgefuzz'
            ? `${c.title} ${c.subtitle ?? ''} ${(c.tags ?? []).join(' ')}`
            : `${c.title} ${c.subtitle ?? ''} ${c.provider} ${(c.tags ?? []).join(' ')}`;
        if (!hay.toLowerCase().includes(debouncedQ)) return false;
      }
      return true;
    });
  }, [merged, providerFilter, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const ffTotal = count.data?.total ?? forgeQ.data?.length ?? 0;
  const guruTotal = guruQ.data?.length ?? 0;
  const isFetching = forgeQ.isFetching || guruQ.isFetching;

  // Helper to reset only provider filter
  const resetProviderFilter = () => {
    setProviderFilter('any');
    setProviderSearch('');
    setShowProviderDropdown(false);
  };

  const selectedProviderLabel = providerFilter === 'any' ? 'Any provider' : providerFilter;

  return (
    <div data-testid="apis-hub-container">
      {/* Search & Filters – centered */}
      <div className="mb-6 flex flex-col items-center gap-4">
        <div className="flex w-full max-w-3xl items-center gap-2 rounded-xl border border-border bg-surface px-0 pl-2  shadow-sm transition-shadow focus-within:border-primary/50 focus-within:shadow-md mx-auto">
          <Search className="ml-2 h-4 w-4 text-text-muted" />
          <div className="flex-1 border-l-2 border-border rounded-r-xl ml-2">
  <input
    data-testid="hub-search-input"
    autoFocus
    value={q}
    onChange={(e) => setQ(e.target.value)}
    placeholder="Search by title, provider, or tag — e.g. ‘weather’, ‘stripe’, ‘crypto’…"
    className="w-full bg-transparent px-3 py-2 text-sm placeholder:text-text-muted rounded-r-xl border-transparent focus:border-primary focus:outline-none"
  />
</div>
          {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin text-text-muted" />}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {/* Source toggle – unchanged */}
          <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface/50 p-0.5" data-testid="hub-source-toggle">
            {([
              { key: 'all', label: 'All' },
              { key: 'forgefuzz', label: 'ForgeFuzz' },
              { key: 'public', label: 'Public APIs' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                data-testid={`hub-source-${key}`}
                onClick={() => setSourceFilter(key)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                  sourceFilter === key
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                {label}
              </button>
            ))}
          </span>

          {/* Custom Provider Dropdown */}
          <div className="relative" ref={providerRef}>
            <div
              data-testid="hub-provider-filter"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 pl-3 pr-2 py-1 cursor-pointer hover:bg-surface/70 transition-colors"
              onClick={() => setShowProviderDropdown(!showProviderDropdown)}
            >
              <Building2 className="h-3 w-3 text-text-muted" />
              <span className="text-[11px] font-medium text-text-primary">
                {selectedProviderLabel}
              </span>
              <ChevronDown className="h-3 w-3 text-text-muted" />
            </div>

            {showProviderDropdown && (
              <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                <div className="p-2 border-b border-border/50">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={providerSearch}
                      onChange={(e) => setProviderSearch(e.target.value)}
                      placeholder="Search provider..."
                      className="w-full rounded-md border border-border bg-elevated pl-7 pr-2 py-1.5 text-[11px] outline-none focus:border-primary"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <ul className="max-h-64 overflow-y-auto">
                  <li
                    className={cn(
                      'px-3 py-2 text-[11px] cursor-pointer hover:bg-hover transition-colors',
                      providerFilter === 'any' && 'bg-primary/10 text-primary font-semibold'
                    )}
                    onClick={() => {
                      setProviderFilter('any');
                      setShowProviderDropdown(false);
                      setProviderSearch('');
                    }}
                  >
                    Any provider
                  </li>
                  {filteredProviders.slice(0, 8).map((p) => (
                    <li
                      key={p}
                      className={cn(
                        'px-3 py-2 text-[11px] cursor-pointer hover:bg-hover transition-colors',
                        providerFilter === p && 'bg-primary/10 text-primary font-semibold'
                      )}
                      onClick={() => {
                        setProviderFilter(p);
                        setShowProviderDropdown(false);
                        setProviderSearch('');
                      }}
                    >
                      {p}
                    </li>
                  ))}
                  {filteredProviders.length > 8 && (
                    <li className="px-3 py-2 text-[10px] text-text-muted text-center border-t border-border/50">
                      {filteredProviders.length - 8} more providers (use search)
                    </li>
                  )}
                  {filteredProviders.length === 0 && (
                    <li className="px-3 py-2 text-[10px] text-text-muted text-center">
                      No matching providers
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Reset Provider Button (appears only when a specific provider is selected) */}
          {/* {providerFilter !== 'any' && (
            <button
              onClick={resetProviderFilter}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/50 px-2 py-1 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors"
              title="Clear provider filter"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )} */}

          {/* Stats – unchanged */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1 text-text-muted" data-testid="hub-stat-total">
            <Layers className="h-3 w-3" />
            <strong className="font-semibold text-text-primary">{filtered.length}</strong>
            &nbsp;{filtered.length === 1 ? 'result' : 'results'}
            <span className="mx-1 text-text-muted/50">·</span>
            <span title="ForgeFuzz published docs">{ffTotal} ForgeFuzz</span>
            <span className="mx-1 text-text-muted/50">·</span>
            <span title="APIs.guru registry">{guruTotal} public</span>
          </span>

          {/* Global Reset (unchanged) */}
          {(debouncedQ || providerFilter !== 'any' || sourceFilter !== 'all') && (
            <button
              data-testid="hub-reset-filters"
              onClick={() => { setQ(''); setProviderFilter('any'); setSourceFilter('all'); setProviderSearch(''); }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/50 px-3 py-1 text-[11px] font-medium text-text-muted hover:text-text-primary"
            >
              <Filter className="h-3 w-3" /> Reset all
            </button>
          )}
        </div>
      </div>

      {/* Popular APIs strip (unchanged) */}
      {sourceFilter !== 'forgefuzz' && !debouncedQ && providerFilter === 'any' && (
        <PopularStrip cards={guruQ.data ?? []} onPick={(p) => setProviderFilter(p)} />
      )}

      {/* Grid & Pagination (unchanged) */}
      {(forgeQ.isLoading || guruQ.isLoading) && filtered.length === 0 ? (
        <SkeletonGrid />
      ) : (forgeQ.isError && guruQ.isError) ? (
        <ErrorState message="Couldn’t load either source — check your network and retry." />
      ) : filtered.length === 0 ? (
        <EmptyState filtered={!!debouncedQ || providerFilter !== 'any' || sourceFilter !== 'all'} />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="hub-grid">
            {visible.map((c) =>
              c.kind === 'forgefuzz'
                ? <ForgeCard key={`ff-${c.slug}`} card={c} />
                : <PublicCard key={c.id} card={c} />,
            )}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2 text-xs" data-testid="hub-pagination">
              <button
                data-testid="hub-page-prev"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-text-muted">
                Page <strong className="text-text-primary">{safePage + 1}</strong> of <strong className="text-text-primary">{totalPages}</strong>
              </span>
              <button
                data-testid="hub-page-next"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
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

// ---------- Card Components (unchanged) ----------
const ForgeCard = ({ card }: { card: PublicHubCard }) => {
  const fmt = (card.format ?? '').toUpperCase();
  const badgeCls = FORMAT_BADGE[fmt] ?? FORMAT_BADGE.MANUAL;
  return (
    <li data-testid={`hub-card-${card.slug}`}>
      <Link
        to={`/docs/${card.slug}`}
        className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <div className="flex items-start gap-3">
          {card.logoUrl ? (
            <img src={card.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-border object-cover" />
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary/10 text-primary">
              <FileText className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold tracking-tight text-text-primary group-hover:text-primary">
              {card.title}
            </h3>
            {card.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-text-secondary">{card.subtitle}</p>
            )}
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-primary/70">ForgeFuzz</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase', badgeCls)} data-testid="hub-card-format">
            {fmt || 'MANUAL'}
          </span>
          {card.version != null && (
            <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
              v{card.version}
            </span>
          )}
          {(card.tags ?? []).slice(0, 2).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
              <Tag className="h-2.5 w-2.5" /> {t}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span data-testid="hub-card-views">{card.viewCount ?? 0}</span> views
          </span>
          <span>{formatDate(card.publishedAt)}</span>
        </div>
      </Link>
    </li>
  );
};

const PublicCard = ({ card }: { card: PublicApiCard }) => {
  const navigate = useNavigate();
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const ws = useWorkspaceStore((s) => s.current);
  const [importing, setImporting] = useState(false);

  const onTryIt = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      const returnTo = `/api-hub?try=${encodeURIComponent(card.id)}`;
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!ws?.id) {
      toast.error('Select a workspace first', { description: 'Open the workspace switcher in the app and try again.' });
      return;
    }
    setImporting(true);
    const tid = toast.loading(`Importing ${card.title}…`);
    try {
      const summary = await importPublicApiToWorkspace(card, ws.id);
      toast.success(`Imported ${card.title}`, {
        id: tid,
        description: `${summary.requestCount ?? 0} endpoints added to your collection.`,
      });
      if (summary.collectionId) {
        navigate(`/projects/collections/${summary.collectionId}`);
      } else {
        navigate('/projects/collections');
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Import failed';
      toast.error('Import failed', { id: tid, description: msg });
    } finally {
      setImporting(false);
    }
  };

  const detailHref = `/api-hub/public/${encodeURIComponent(card.id)}`;

  return (
    <li data-testid={`hub-card-public-${card.id}`}>
      <Link
        to={detailHref}
        className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <div className="flex items-start gap-3">
          {card.logoUrl ? (
            <img src={card.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-md border border-border bg-white object-contain p-1"
                 onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Globe2 className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold tracking-tight text-text-primary group-hover:text-primary">
              {card.title}
            </h3>
            {card.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-text-secondary">{card.subtitle}</p>
            )}
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-warning/80">{card.provider}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
            OpenAPI
          </span>
          {card.version && (
            <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
              {card.version}
            </span>
          )}
          {(card.tags ?? []).slice(0, 2).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
              <Tag className="h-2.5 w-2.5" /> {t}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1 group-hover:text-primary">
            <Eye className="h-3 w-3" /> View details
          </span>
          <button
            type="button"
            data-testid={`hub-card-try-${card.id}`}
            onClick={onTryIt}
            disabled={importing}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90',
              importing && 'cursor-wait opacity-60',
            )}
          >
            {importing ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Importing…</>
            ) : (
              <><Download className="h-3 w-3" /> Try It <ArrowRight className="h-3 w-3" /></>
            )}
          </button>
        </div>
      </Link>
    </li>
  );
};

const SkeletonGrid = () => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="hub-skeleton">
    {Array.from({ length: 9 }).map((_, i) => (
      <li key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-surface" />
    ))}
  </ul>
);

const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-12 text-center" data-testid="hub-empty">
    <Globe2 className="mx-auto mb-4 h-10 w-10 text-text-muted" />
    <h3 className="text-base font-semibold">
      {filtered ? 'No matches yet' : 'The hub is empty for now'}
    </h3>
    <p className="mt-1.5 text-xs text-text-muted">
      {filtered
        ? 'Try a different keyword, provider, or clear filters to see everything.'
        : 'Be the first to publish — open a project, create an API doc, and hit Publish.'}
    </p>
    {!filtered && (
      <Link
        to="/projects/api-docs"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        data-testid="hub-empty-cta"
      >
        Publish a doc <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center" data-testid="hub-error">
    <p className="text-sm font-semibold text-destructive">Couldn&rsquo;t load the hub</p>
    <p className="mt-1 text-xs text-text-muted">{message}</p>
  </div>
);

const POPULAR_PROVIDERS = [
  { id: 'stripe.com',     label: 'Stripe',    blurb: 'Payments, billing, invoicing' },
  { id: 'github.com',     label: 'GitHub',    blurb: 'Code hosting + issues + actions' },
  { id: 'twilio.com',     label: 'Twilio',    blurb: 'SMS, voice & messaging' },
  { id: 'openai.com',     label: 'OpenAI',    blurb: 'LLM completions, embeddings' },
  { id: 'slack.com',      label: 'Slack',     blurb: 'Channels, messages, webhooks' },
  { id: 'spotify.com',    label: 'Spotify',   blurb: 'Tracks, playlists, search' },
  { id: 'amazonaws.com',  label: 'AWS',       blurb: 'Cloud — S3, EC2, Lambda…' },
  { id: 'googleapis.com', label: 'Google',    blurb: 'Maps, Drive, Calendar APIs' },
] as const;

interface PopularStripProps {
  cards: PublicApiCard[];
  onPick: (provider: string) => void;
}

const PopularStrip = ({ cards, onPick }: PopularStripProps) => {
  const byProvider = useMemo(() => {
    const m = new Map<string, { logoUrl: string | null; count: number }>();
    for (const c of cards) {
      const existing = m.get(c.provider);
      if (existing) {
        existing.count += 1;
        if (!existing.logoUrl && c.logoUrl) existing.logoUrl = c.logoUrl;
      } else {
        m.set(c.provider, { logoUrl: c.logoUrl, count: 1 });
      }
    }
    return m;
  }, [cards]);

  const tiles = POPULAR_PROVIDERS.filter((p) => byProvider.has(p.id));
  if (tiles.length === 0) return null;

  return (
    <section className="mb-10" data-testid="hub-popular-strip">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-text-primary">Popular APIs</h2>
          <p className="text-[12px] text-text-muted">Recognisable providers — tap any to filter the grid.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <TrendingUp className="h-3 w-3" /> Trending
        </span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-4">
        {tiles.map((p) => {
          const info = byProvider.get(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                data-testid={`hub-popular-${p.id}`}
                onClick={() => onPick(p.id)}
                className="group flex w-full items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                {info?.logoUrl ? (
                  <img
                    src={info.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full border border-border bg-white object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <Globe2 className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-text-primary group-hover:text-primary">
                      {p.label}
                    </span>
                    <span className="rounded-full bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                      {info?.count ?? 0}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-[11px] text-text-muted">{p.blurb}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};