/**
 * ApiCatalogPage — embeds the public hub feed (Public API Network) or the
 * private workspace docs (Private API Network) inside `HomeShell`. The
 * variant is driven by the `:variant` URL segment so the left rail link
 * highlights cleanly.
 *
 * Public  → calls auth-free `browsePublicDocs` (same data as `/api-hub`).
 * Private → calls the authenticated `listDocs(workspaceId)`. Requires an
 *           active workspace; otherwise we surface a friendly empty state.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookMarked, Globe, Lock, Search, FileText, Tag, Eye, Loader2,
  ArrowRight, Compass, AlertTriangle, Clock, TrendingUp,
} from 'lucide-react';
import { browsePublicDocs, listDocs, type PublicHubCard, type DocView } from '@/services/apiDocs.service';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/utils/cn';

type Variant = 'public' | 'private';

const FORMAT_BADGE: Record<string, string> = {
  AUTO:   'bg-primary/10 text-primary border-primary/30',
  MANUAL: 'bg-text-muted/15 text-text-secondary border-border',
  HYBRID: 'bg-warning/10 text-warning border-warning/30',
};

const fmtDate = (iso?: string | number | null): string => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};

export const ApiCatalogPage = () => {
  const { variant = 'public' } = useParams<{ variant?: Variant }>();
  const isPublic = variant === 'public';

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'trending'>('recent');

  useMemo(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="flex h-full flex-col" data-testid={`api-catalog-${variant}`}>
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/40 px-6 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-primary" />}
          {isPublic ? 'Public API Network' : 'Private API Network'}
        </h2>
        <span className="text-[11px] text-text-muted">
          ·{' '}
          {isPublic
            ? 'APIs published to the open web. Discoverable by anyone, no auth required.'
            : 'Documentation owned by the active workspace. Visible only to your team.'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="api-catalog-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, subtitle, or tag…"
              className="h-8 w-72 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs"
            />
          </div>
          {isPublic && (
            <span className="flex items-center gap-0.5 rounded-full border border-border bg-surface/50 p-0.5" data-testid="api-catalog-sort-toggle">
              {([
                { key: 'recent',   label: 'Recent',   icon: Clock },
                { key: 'trending', label: 'Trending', icon: TrendingUp },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  data-testid={`api-catalog-sort-${key}`}
                  onClick={() => setSort(key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    sort === key ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </span>
          )}
          {isPublic && (
            <Link
              to="/api-hub"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="api-catalog-open-hub"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Compass className="h-3 w-3" /> Open hub <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6" data-testid={`api-catalog-${variant}-body`}>
        {isPublic
          ? <PublicGrid q={debouncedQ} sort={sort} />
          : <PrivateGrid q={debouncedQ} />
        }
      </div>
    </div>
  );
};

/* ─────────────── PUBLIC GRID (auth-free) ──────────────────────────── */
const PublicGrid = ({ q, sort }: { q: string; sort: 'recent' | 'trending' }) => {
  const list = useQuery({
    queryKey: ['public-hub', 'list', q, sort],
    queryFn: () => browsePublicDocs({ q: q || undefined, sort, size: 120 }),
    staleTime: 30_000,
  });

  // Aggregate tags for the category sidebar.
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    (list.data ?? []).forEach((c) => (c.tags ?? []).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [list.data]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const docs = useMemo(() => {
    const arr = list.data ?? [];
    return activeTag ? arr.filter((d) => (d.tags ?? []).includes(activeTag)) : arr;
  }, [list.data, activeTag]);

  if (list.isLoading) {
    return <SkeletonGrid testId="api-catalog-public-skeleton" />;
  }
  if (list.isError) {
    return <ErrorState message={(list.error as Error)?.message ?? 'Failed to load'} />;
  }
  if ((list.data ?? []).length === 0) {
    return <EmptyState testId="api-catalog-public-empty" message="No public APIs yet — be the first to publish a doc." cta={{ to: '/projects/api-docs', label: 'Publish a doc' }} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      {/* Category sidebar */}
      <aside className="space-y-1.5" data-testid="api-catalog-tag-sidebar">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Categories
        </p>
        <button
          data-testid="api-catalog-tag-all"
          onClick={() => setActiveTag(null)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
            activeTag === null ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
          )}
        >
          <span>All</span>
          <span className="rounded-full bg-elevated px-1.5 font-mono text-[9px] text-text-muted">{(list.data ?? []).length}</span>
        </button>
        {tagCounts.length === 0 && (
          <p className="px-2 py-1.5 text-[11px] text-text-muted">No tags yet.</p>
        )}
        {tagCounts.map(([t, n]) => (
          <button
            key={t}
            data-testid={`api-catalog-tag-${t}`}
            onClick={() => setActiveTag(t === activeTag ? null : t)}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
              activeTag === t ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
            )}
          >
            <span className="inline-flex items-center gap-1.5 truncate">
              <Tag className="h-3 w-3" /> {t}
            </span>
            <span className="rounded-full bg-elevated px-1.5 font-mono text-[9px] text-text-muted">{n}</span>
          </button>
        ))}
      </aside>

      {/* Card grid */}
      {docs.length === 0 ? (
        <EmptyState testId="api-catalog-public-filtered-empty" message={`No public APIs in "${activeTag}".`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="api-catalog-public-grid">
          {docs.map((d) => <PublicCard key={d.slug} card={d} />)}
        </ul>
      )}
    </div>
  );
};

const PublicCard = ({ card }: { card: PublicHubCard }) => {
  const fmt = (card.format ?? '').toUpperCase();
  const badgeCls = FORMAT_BADGE[fmt] ?? FORMAT_BADGE.MANUAL;
  return (
    <li data-testid={`api-catalog-public-card-${card.slug}`}>
      <Link
        to={`/docs/${card.slug}`}
        target="_blank"
        rel="noopener noreferrer"
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
            <h3 className="truncate text-sm font-semibold tracking-tight group-hover:text-primary">{card.title}</h3>
            {card.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-text-secondary">{card.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase', badgeCls)}>{fmt || 'MANUAL'}</span>
          {card.version != null && (
            <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">v{card.version}</span>
          )}
          {(card.tags ?? []).slice(0, 2).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
              <Tag className="h-2.5 w-2.5" /> {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {card.viewCount ?? 0} views</span>
          <span>{fmtDate(card.publishedAt)}</span>
        </div>
      </Link>
    </li>
  );
};

/* ─────────────── PRIVATE GRID (project-scoped) ───────────────────── */
const PrivateGrid = ({ q }: { q: string }) => {
  const ws = useWorkspaceStore((s) => s.current);

  const list = useQuery({
    queryKey: ['api-docs', 'list', ws?.id],
    queryFn: () => listDocs(ws!.id, { size: 200 }),
    enabled: !!ws?.id,
  });

  const filtered = useMemo(() => {
    const docs = list.data ?? [];
    const k = q.toLowerCase();
    return k
      ? docs.filter((d) =>
          (d.title ?? '').toLowerCase().includes(k) ||
          (d.subtitle ?? '').toLowerCase().includes(k) ||
          (d.tags ?? []).some((t) => t.toLowerCase().includes(k)),
        )
      : docs;
  }, [list.data, q]);

  if (!ws) {
    return (
      <EmptyState
        testId="api-catalog-private-no-ws"
        message="Pick a project to see its private API documentation."
        cta={{ to: '/projects/manage', label: 'Open workspaces' }}
      />
    );
  }
  if (list.isLoading) return <SkeletonGrid testId="api-catalog-private-skeleton" />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        testId="api-catalog-private-empty"
        message={q ? `No private docs match "${q}".` : 'No private docs yet — create one in your project.'}
        cta={!q ? { to: '/projects/api-docs', label: 'Create a doc' } : undefined}
      />
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="api-catalog-private-grid">
      {filtered.map((d) => <PrivateCard key={d.docId} doc={d} />)}
    </ul>
  );
};

const PrivateCard = ({ doc: d }: { doc: DocView }) => {
  const fmt = (d.format ?? '').toUpperCase();
  const badgeCls = FORMAT_BADGE[fmt] ?? FORMAT_BADGE.MANUAL;
  return (
    <li data-testid={`api-catalog-private-card-${d.docId}`}>
      <Link
        to={`/projects/api-docs?docId=${d.docId}`}
        className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <BookMarked className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold tracking-tight group-hover:text-primary">{d.title}</h3>
            {d.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-text-secondary">{d.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase', badgeCls)}>{fmt || 'MANUAL'}</span>
          {d.version != null && (
            <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">v{d.version}</span>
          )}
          {d.isPublished
            ? <span className="rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success">published</span>
            : <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">draft</span>
          }
          {(d.tags ?? []).slice(0, 2).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
              <Tag className="h-2.5 w-2.5" /> {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {d.viewCount ?? 0} views</span>
          <span>Updated {fmtDate(d.updatedAt)}</span>
        </div>
      </Link>
    </li>
  );
};

/* ─────────────── SHARED helpers ───────────────────────────────────── */
const SkeletonGrid = ({ testId }: { testId: string }) => (
  <ul data-testid={testId} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <li key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-surface">
        <Loader2 className="m-auto mt-16 h-4 w-4 animate-spin text-text-muted" />
      </li>
    ))}
  </ul>
);

const EmptyState = ({
  testId, message, cta,
}: {
  testId: string; message: string;
  cta?: { to: string; label: string };
}) => (
  <div data-testid={testId} className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-12 text-center">
    <BookMarked className="mx-auto mb-3 h-8 w-8 text-text-muted" />
    <p className="text-sm font-semibold">{message}</p>
    {cta && (
      <Link
        to={cta.to}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
      >
        {cta.label} <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div data-testid="api-catalog-error" className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
    <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
    <p className="text-sm font-semibold text-destructive">{message}</p>
  </div>
);

export default ApiCatalogPage;
