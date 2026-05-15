/**
 * PublicDocViewerPage — `/docs/:slug`. Anonymous reader for a single
 * published API doc. Shows: header (title/subtitle/tags), rendered HTML,
 * and a "back to hub" rail. No auth, no app chrome.
 *
 * Source of truth: `apiGetPublicDoc(slug)` from the auth-free Java endpoint
 * `GET /api/v1/api-docs/public/{slug}`.
 */
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Compass, FileText, Tag, Loader2, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { getPublicDoc } from '@/services/apiDocs.service';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const formatDate = (iso?: string | number | null): string => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};

export const PublicDocViewerPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const q = useQuery({
    queryKey: ['public-doc', slug],
    queryFn: () => getPublicDoc(slug!),
    enabled: !!slug,
    retry: false,
  });

  const doc = q.data;

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary" data-testid="public-doc-viewer">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight" data-testid="viewer-brand">
          <Logo variant="mark" className="h-6 w-6" />
          <span>ForgeFuzz</span>
        </Link>
        <ThemeToggle />
      </header>

      {q.isLoading ? (
        <div className="flex flex-1 items-center justify-center" data-testid="viewer-loading">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : q.isError || !doc ? (
        <NotFoundState />
      ) : (
        <>
          <section className="border-b border-border bg-gradient-to-b from-primary/[0.05] via-transparent to-transparent">
            <div className="mx-auto max-w-4xl px-6 py-12">
              {/* Inline back-to-hub breadcrumb */}
              <Link
                to="/api-hub"
                data-testid="viewer-back-to-hub"
                className="mb-5 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/40 px-3 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Public Hub
              </Link>
              <div className="flex items-start gap-4">
                {doc.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover" />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl" data-testid="viewer-title">
                    {doc.title}
                  </h1>
                  {doc.subtitle && (
                    <p className="mt-2 text-pretty text-sm text-text-secondary sm:text-base" data-testid="viewer-subtitle">
                      {doc.subtitle}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                    {doc.format && (
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono uppercase text-primary">
                        {doc.format}
                      </span>
                    )}
                    {doc.version != null && (
                      <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-text-secondary">
                        v{doc.version}
                      </span>
                    )}
                    {(doc.tags ?? []).map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5">
                        <Tag className="h-2.5 w-2.5" /> {t}
                      </span>
                    ))}
                    {doc.publishedAt && <span>Published {formatDate(doc.publishedAt as any)}</span>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
            {doc.html ? (
              <article
                data-testid="viewer-html"
                className="prose prose-sm max-w-none dark:prose-invert prose-headings:tracking-tight prose-headings:text-text-primary prose-p:text-text-secondary prose-a:text-primary prose-code:rounded prose-code:bg-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-elevated"
                dangerouslySetInnerHTML={{ __html: doc.html }}
              />
            ) : (
              <p className="text-sm text-text-muted">This page has no content yet.</p>
            )}
          </main>
        </>
      )}

      <footer className="border-t border-border bg-surface/40 py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 text-xs text-text-muted sm:flex-row">
          <span>Powered by ForgeFuzz</span>
          <Link
            to="/api-hub"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            data-testid="viewer-footer-hub"
          >
            <Compass className="h-3 w-3" /> Browse all public APIs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
};

const NotFoundState = () => (
  <div className="flex flex-1 items-center justify-center px-6 py-20" data-testid="viewer-not-found">
    <div className="max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-warning" />
      <h2 className="text-base font-semibold">Page not found</h2>
      <p className="mt-1 text-xs text-text-muted">
        The link may be wrong, or the owner has unpublished this doc.
      </p>
      <Link
        to="/api-hub"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
      >
        Browse the Public Hub <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  </div>
);

export default PublicDocViewerPage;
