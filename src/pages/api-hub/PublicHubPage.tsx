/**
 * PublicHubPage — `/api-hub`. Postman/Mintlify-style public discovery surface.
 *
 * Auth-free. Lists every API doc whose owner has flipped it to PUBLIC and
 * Published. Visitors can search, browse, and click through to the public
 * doc viewer (`/docs/:slug`). No org/workspace info ever leaks here — the
 * backend strips it before sending the card payload.
 *
 * Entry points:
 *   • Header globe icon (visible everywhere inside `/projects/*`)
 *   • In-app `ApiDocsPage` "Public" section CTA
 *   • External share — anyone can paste `/api-hub` into a browser
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Globe2, Search, ArrowRight, FileText, Sparkles, Tag, Eye, Loader2,
  ArrowLeft, Layers, Compass, TrendingUp, Clock,
} from 'lucide-react';
import { browsePublicDocs, countPublicDocs, type PublicHubCard } from '@/services/apiDocs.service';
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

export const PublicHubPage = () => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'trending'>('recent');

  // Debounce search 250ms.
  useMemo(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const list = useQuery({
    queryKey: ['public-hub', 'list', debouncedQ, sort],
    queryFn: () => browsePublicDocs({ q: debouncedQ || undefined, sort, size: 120 }),
    staleTime: 30_000,
  });

  const count = useQuery({
    queryKey: ['public-hub', 'count'],
    queryFn: () => countPublicDocs(),
    staleTime: 60_000,
  });

  const docs: PublicHubCard[] = list.data ?? [];
  const total = count.data?.total ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary" data-testid="public-hub-page">
      {/* Slim public header — kept minimal so the hub feels like its own
          product. The "back to workspace" affordance lives in the main
          content area below, not in the chrome. */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
        <Link
          to="/"
          data-testid="app-header-logo"
          className="flex items-center gap-0.5"
        >
          <Logo variant="mark" className="h-9 w-8" />
          <div className="text-left">
            <div className="text-xs text-text-secondary font-semibold tracking-tight leading-tight mb-[-8px]">
              probestack
            </div>
            <div className="font-semibold text-xl tracking-tight leading-tight gradient-text">
              ForgeFuzz
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Hero — bold, search-first. */}
      <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent">
        {/* Decorative grid */}
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
          {/* Inline back-to-workspace breadcrumb (lives in the content
              area now, not the top header). */}
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
            Every documentation page builders publish on ForgeFuzz shows up here. Search, read, copy
            request snippets, and try endpoints &mdash; no account needed.
          </p>

          {/* Search */}
          <div className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm transition-shadow focus-within:border-primary/50 focus-within:shadow-md">
            <Search className="ml-2 h-4 w-4 text-text-muted" />
            <input
              data-testid="hub-search-input"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, subtitle, or tag…"
              className="flex-1 bg-transparent px-1 py-2 text-sm placeholder:text-text-muted focus:outline-none"
            />
            {list.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin text-text-muted" />}
          </div>

          {/* Stats + sort */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1" data-testid="hub-stat-total">
              <Layers className="h-3 w-3" />
              <strong className="font-semibold text-text-primary">{total}</strong> public {total === 1 ? 'doc' : 'docs'}
            </span>
            {debouncedQ && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1" data-testid="hub-stat-filter">
                <Search className="h-3 w-3" /> Filtered by &ldquo;{debouncedQ}&rdquo;
              </span>
            )}
            <span className="ml-1 flex items-center gap-0.5 rounded-full border border-border bg-surface/50 p-0.5" data-testid="hub-sort-toggle">
              {([
                { key: 'recent',   label: 'Recent',   icon: Clock },
                { key: 'trending', label: 'Trending', icon: TrendingUp },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  data-testid={`hub-sort-${key}`}
                  onClick={() => setSort(key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    sort === key
                      ? 'bg-primary/15 text-primary'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* Grid */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10" data-testid="hub-main">
        {list.isLoading ? (
          <SkeletonGrid />
        ) : list.isError ? (
          <ErrorState message={(list.error as Error)?.message ?? 'Failed to load public docs'} />
        ) : docs.length === 0 ? (
          <EmptyState filtered={!!debouncedQ} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="hub-grid">
            {docs.map((d) => <HubCard key={d.slug} card={d} />)}
          </ul>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/40 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-text-muted sm:flex-row">
          <span>Powered by ProbeStack &mdash; build, test, and document APIs in one place.</span>
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

const HubCard = ({ card }: { card: PublicHubCard }) => {
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
            // eslint-disable-next-line @next/next/no-img-element
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

const SkeletonGrid = () => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="hub-skeleton">
    {Array.from({ length: 6 }).map((_, i) => (
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
        ? 'Try a different keyword or clear the search to see everything.'
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

export default PublicHubPage;
