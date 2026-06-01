/**
 * PublicHubPage — `/api-hub`. Postman/Mintlify-style public discovery surface.
 *
 * Renders ONE unified grid that merges two sources:
 *   • ForgeFuzz public docs (every doc users have published with visibility=PUBLIC)
 *   • APIs.guru registry (2,400+ free public OpenAPI specs — GitHub, Stripe,
 *     PokéAPI, OpenWeather, etc.)
 *
 * Filters:
 *   • Free-text search (title / subtitle / tag)
 *   • Provider dropdown (any provider OR "ForgeFuzz" OR a single APIs.guru
 *     domain like "stripe.com")
 *   • Source toggle (all / forgefuzz / public)
 *
 * Try It → import a public API into the logged-in user's workspace as a
 * brand-new collection. Pre-login users get bounced to /login with a
 * returnTo so the import auto-resumes after sign-in.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Globe2, Search, ArrowRight, FileText, Sparkles, Tag, Eye, Loader2,
  ArrowLeft, Layers, Compass, TrendingUp, Clock, Building2, Filter, Download,
  ExternalLink, ChevronLeft, ChevronRight,
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
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
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

/** Unified card shape — discriminated union across both data sources. */
type UnifiedCard =
  | ({ kind: 'forgefuzz' } & PublicHubCard)
  | ({ kind: 'public' } & PublicApiCard);

const PAGE_SIZE = 30;

export const PublicHubPage = () => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'forgefuzz' | 'public'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('any');
  const [page, setPage] = useState(0);

  // Debounce search 250ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Reset pagination whenever any filter changes.
  useEffect(() => { setPage(0); }, [debouncedQ, sourceFilter, providerFilter]);

  /* ── ForgeFuzz public docs (existing) ── */
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

  /* ── APIs.guru registry (new) ── */
  const guruQ = useQuery({
    queryKey: ['public-hub', 'apis-guru'],
    queryFn: () => fetchPublicApiCatalog(),
    // Master list is large + immutable for hours; cache hard.
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });

  /* ── Merge + filter ── */
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

  const filtered = useMemo(() => {
    return merged.filter((c) => {
      // Provider filter
      if (providerFilter !== 'any') {
        if (providerFilter === 'ForgeFuzz' && c.kind !== 'forgefuzz') return false;
        if (providerFilter !== 'ForgeFuzz' && c.kind !== 'public') return false;
        if (c.kind === 'public' && c.provider !== providerFilter) return false;
      }
      // Free-text search
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

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const ffTotal = count.data?.total ?? forgeQ.data?.length ?? 0;
  const guruTotal = guruQ.data?.length ?? 0;
  const isFetching = forgeQ.isFetching || guruQ.isFetching;

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary" data-testid="public-hub-page">
      {/* Slim public header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
        <Link to="/" data-testid="app-header-logo" className="flex items-center gap-1">
          <Logo variant="mark" className="h-12 w-10" />
          <div className="text-left">
            <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">probestack</div>
            <div className="font-bold text-2xl tracking-normal leading-tight gradient-text">ForgeFuzz</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Hero — bold, search-first. */}
      <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            color: 'var(--color-text-muted)',
            maskImage: 'radial-gradient(ellipse at top, black 25%, transparent 70%)',
          }}
        />
        <div className="mx-auto max-w-5xl px-6 py-14 text-center sm:py-20">
          <Link
            to="/projects/collections"
            data-testid="hub-back-to-app"
            className="mb-5 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/40 px-3 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to project
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-wide text-primary" data-testid="hub-tag">
            <Compass className="h-3.5 w-3.5" /> Public API Hub
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Browse the world&rsquo;s <span className="text-primary">public APIs</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-text-secondary sm:text-lg">
            Discover ForgeFuzz docs <em>and</em> 2,400+ free APIs from APIs.guru. Search, read,
            and tap <strong>Try It</strong> to clone any API into your workspace as a runnable
            collection — no account needed to browse.
          </p>

          {/* Search */}
          <div className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm transition-shadow focus-within:border-primary/50 focus-within:shadow-md">
            <Search className="ml-2 h-4 w-4 text-text-muted" />
            <input
              data-testid="hub-search-input"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, provider, or tag — e.g. ‘weather’, ‘stripe’, ‘crypto’…"
              className="flex-1 bg-transparent px-1 py-2 text-sm placeholder:text-text-muted focus:outline-none"
            />
            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin text-text-muted" />}
          </div>

          {/* Filter row */}
          <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs">
            {/* Source toggle */}
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface/50 p-0.5" data-testid="hub-source-toggle">
              {([
                { key: 'all',       label: 'All' },
                { key: 'forgefuzz', label: 'ForgeFuzz' },
                { key: 'public',    label: 'Public APIs' },
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

            {/* Provider dropdown */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 pl-3" data-testid="hub-provider-filter">
              <Building2 className="h-3 w-3 text-text-muted" />
              <select
                data-testid="hub-provider-select"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="cursor-pointer bg-transparent py-1 pl-1 pr-7 text-[11px] font-medium focus:outline-none"
              >
                <option value="any">Any provider</option>
                {providers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1 text-text-muted" data-testid="hub-stat-total">
              <Layers className="h-3 w-3" />
              <strong className="font-semibold text-text-primary">{filtered.length}</strong>
              &nbsp;{filtered.length === 1 ? 'result' : 'results'}
              <span className="mx-1 text-text-muted/50">·</span>
              <span title="ForgeFuzz published docs">{ffTotal} ForgeFuzz</span>
              <span className="mx-1 text-text-muted/50">·</span>
              <span title="APIs.guru registry">{guruTotal} public</span>
            </span>

            {(debouncedQ || providerFilter !== 'any' || sourceFilter !== 'all') && (
              <button
                data-testid="hub-reset-filters"
                onClick={() => { setQ(''); setProviderFilter('any'); setSourceFilter('all'); }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/50 px-3 py-1 text-[11px] font-medium text-text-muted hover:text-text-primary"
              >
                <Filter className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10" data-testid="hub-main">
        {/* Popular APIs strip — featured providers users almost certainly
            recognise. Click jumps to the existing filter pipeline so the
            grid below already does the work. Hidden when the user is
            actively filtering or has chosen ForgeFuzz-only. */}
        {sourceFilter !== 'forgefuzz' && !debouncedQ && providerFilter === 'any' && (
          <PopularStrip
            cards={guruQ.data ?? []}
            onPick={(p) => setProviderFilter(p)}
          />
        )}

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

            {/* Pagination */}
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/40 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-text-muted sm:flex-row">
          <span>Powered by ProbeStack · Public APIs from APIs.guru (Apache-2.0)</span>
          <Link
            to="/projects/home"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            data-testid="hub-footer-cta"
          >
            <Sparkles className="h-3 w-3" /> Publish your own API doc <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Card components                                                     */
/* ──────────────────────────────────────────────────────────────────── */

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
            <img src={card.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
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
      // Redirect to login; preserve where we wanted to land
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
            <img src={card.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
                 onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
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

/* ──────────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────────── */
/*  Popular APIs strip                                                  */
/*  Featured row at the top of the grid — taps clamp the provider       */
/*  filter so the grid below auto-narrows to that provider's APIs.      */
/* ──────────────────────────────────────────────────────────────────── */

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
  // Index provider → first matching card (for logo + count).
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

  // Drop providers that have zero matches in the registry (avoids dead tiles).
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

      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tiles.map((p) => {
          const info = byProvider.get(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                data-testid={`hub-popular-${p.id}`}
                onClick={() => onPick(p.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                {info?.logoUrl ? (
                  <img
                    src={info.logoUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
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

export default PublicHubPage;
