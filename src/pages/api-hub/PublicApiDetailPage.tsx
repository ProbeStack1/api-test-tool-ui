/**
 * PublicApiDetailPage — `/api-hub/public/:apiId`
 *
 * Reader for one public API from the APIs.guru registry. Shows:
 *   • Hero (logo, title, provider, version, tags)
 *   • Long description from the spec
 *   • Server URLs
 *   • Every endpoint grouped by method, with parameters / request body /
 *     responses inline (collapsible)
 *   • "Try It →" CTA — same one-click import as the hub card
 *
 * No auth required to view. Import requires a logged-in workspace.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ExternalLink,
  Globe2,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Download,
  Server,
  Tag,
  ChevronDown,
  ChevronRight,
  BookOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchPublicApiDetail,
  importPublicApiToWorkspace,
  type PublicApiDetail,
  type PublicApiEndpoint,
} from "@/services/publicApis.service";
import { useAuth } from "@/stores/auth.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/utils/cn";

const METHOD_CLASS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15    text-blue-400    border-blue-500/30",
  PUT: "bg-amber-500/15   text-amber-400   border-amber-500/30",
  PATCH: "bg-violet-500/15  text-violet-400  border-violet-500/30",
  DELETE: "bg-rose-500/15    text-rose-400    border-rose-500/30",
  HEAD: "bg-text-muted/15  text-text-secondary border-border",
  OPTIONS: "bg-text-muted/15  text-text-secondary border-border",
};

export const PublicApiDetailPage = () => {
  const { apiId } = useParams<{ apiId: string }>();
  const navigate = useNavigate();
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const ws = useWorkspaceStore((s) => s.current);
  const [importing, setImporting] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>("ANY");
  const [tagFilter, setTagFilter] = useState<string>("ANY");
  const [search, setSearch] = useState("");
  const [showSpecDrawer, setShowSpecDrawer] = useState(false);
  const [rawSpec, setRawSpec] = useState<string>("");

  const q = useQuery({
    queryKey: ["public-api-detail", apiId],
    queryFn: () => fetchPublicApiDetail(apiId!),
    enabled: !!apiId,
    retry: false,
    staleTime: 60 * 60_000,
  });

  const detail: PublicApiDetail | null | undefined = q.data;

  // Index distinct method + tag values for filter dropdowns
  const methods = useMemo(() => {
    const s = new Set<string>();
    (detail?.endpoints ?? []).forEach((e) => s.add(e.method));
    return Array.from(s);
  }, [detail]);
  const tags = useMemo(() => {
    const s = new Set<string>();
    (detail?.endpoints ?? []).forEach((e) =>
      (e.tags ?? []).forEach((t) => s.add(t)),
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [detail]);

  const filtered = useMemo(() => {
    return (detail?.endpoints ?? []).filter((e) => {
      if (methodFilter !== "ANY" && e.method !== methodFilter) return false;
      if (tagFilter !== "ANY" && !(e.tags ?? []).includes(tagFilter))
        return false;
      if (search) {
        const hay =
          `${e.method} ${e.path} ${e.summary ?? ""} ${e.description ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [detail, methodFilter, tagFilter, search]);

  const onTryIt = async () => {
    if (!detail) return;
    if (!isAuthed) {
      navigate(
        `/login?returnTo=${encodeURIComponent(`/api-hub/public/${apiId}?import=1`)}`,
      );
      return;
    }
    if (!ws?.id) {
      toast.error("Select a workspace first");
      return;
    }
    setImporting(true);
    const tid = toast.loading(`Importing ${detail.card.title}…`);
    try {
      const summary = await importPublicApiToWorkspace(detail.card, ws.id);
      toast.success(`Imported ${detail.card.title}`, {
        id: tid,
        description: `${summary.requestCount ?? 0} endpoints added to your collection.`,
      });
      if (summary.collectionId)
        navigate(`/projects/collections/${summary.collectionId}`);
      else navigate("/projects/collections");
    } catch (err) {
      toast.error("Import failed", {
        id: tid,
        description: (err as Error)?.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const onOpenRawSpec = async () => {
    if (!detail?.card.swaggerUrl) return;
    setShowSpecDrawer(true);
    const tid = toast.loading("Loading spec…");
    try {
      const response = await fetch(detail.card.swaggerUrl);
      const spec = await response.text();
      setRawSpec(spec);
      toast.dismiss(tid);
    } catch (err) {
      toast.error("Failed to load spec", {
        id: tid,
        description: (err as Error)?.message,
      });
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-text-primary"
      data-testid="public-api-detail"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
        <Link
          to="/"
          className="flex items-center gap-1"
          data-testid="app-header-logo"
        >
          <Logo variant="mark" className="h-12 w-10" />
          <div className="text-left">
            <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
              ProbeStack
            </div>
            <div className="font-bold text-2xl tracking-normal leading-tight gradient-text">
              ForgeFuzz
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/api-hub"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/40 px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:border-primary/40 hover:text-primary"
            data-testid="back-to-hub"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to hub
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-surface/40 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start">
          {q.isLoading ? (
            <div className="flex w-full items-center gap-2 text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading spec…
            </div>
          ) : !detail ? (
            <div className="flex w-full items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4" /> API not found in the public
              registry.
            </div>
          ) : (
            <>
              {detail.card.logoUrl ? (
                <img
                  src={detail.card.logoUrl}
                  alt=""
                  className="h-20 w-20 rounded-xl border border-border bg-white object-contain p-2"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <Globe2 className="h-8 w-8" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-text-muted">
                  <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-semibold text-warning">
                    {detail.card.provider}
                  </span>
                  {detail.card.version && (
                    <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono">
                      {detail.card.version}
                    </span>
                  )}
                  {detail.openApiVersion && (
                    <span className="rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-primary">
                      {detail.openApiVersion}
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {detail.card.title}
                </h1>
                {detail.card.subtitle && (
                  <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                    {detail.card.subtitle}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="detail-try-it"
                    onClick={onTryIt}
                    disabled={importing}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md bg-green-900 px-3 py-2 text-xs text-white !text-white transition-opacity hover:opacity-90",
                      importing && "cursor-wait opacity-60",
                    )}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Importing…
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 !text-white" /> Try It{" "}
                        <ArrowRight className="h-3 w-3 !text-white" />
                      </>
                    )}
                  </button>
                  {detail.card.externalDocsUrl && (
                    <a
                      href={detail.card.externalDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary hover:border-primary/40 hover:text-primary"
                      data-testid="detail-external-docs"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> Official docs{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {detail.card.swaggerUrl && (
                    <button
                      type="button"
                      onClick={onOpenRawSpec}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary hover:border-primary/40 hover:text-primary"
                      data-testid="detail-raw-spec"
                    >
                      Raw spec <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {q.isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Couldn’t load the spec —{" "}
            {(q.error as Error)?.message ?? "unknown error"}.
          </div>
        )}

        {detail && (
          <>
            {detail.longDescription && (
              <section className="mb-8 rounded-2xl border border-border bg-surface p-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  About
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {detail.longDescription}
                </p>
              </section>
            )}

            {detail.servers.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Servers
                </h2>
                <ul className="space-y-1">
                  {detail.servers.map((s) => (
                    <li
                      key={s}
                      className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 font-mono text-xs"
                    >
                      <Server className="h-3.5 w-3.5 text-text-muted" /> {s}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight">
                  Endpoints
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    ({filtered.length} of {detail.endpoints.length})
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <input
                    data-testid="detail-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search path / summary…"
                    className="rounded-md border border-border bg-surface px-2 py-1 outline-none placeholder:text-text-muted focus:border-primary/40"
                  />
                  <select
                    data-testid="detail-method-filter"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="cursor-pointer rounded-md border border-border bg-surface px-2 py-1 outline-none"
                  >
                    <option value="ANY">All methods</option>
                    {methods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {tags.length > 0 && (
                    <select
                      data-testid="detail-tag-filter"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="cursor-pointer rounded-md border border-border bg-surface px-2 py-1 outline-none"
                    >
                      <option value="ANY">All tags</option>
                      {tags.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-surface/40 p-6 text-center text-xs text-text-muted">
                  No endpoints match this filter.
                </p>
              ) : (
                <ul className="space-y-2" data-testid="detail-endpoints">
                  {filtered.map((e, i) => (
                    <EndpointRow key={`${e.method}-${e.path}-${i}`} ep={e} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-border bg-surface/40 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 text-xs text-text-muted">
          <span>Powered by ProbeStack · Specs via APIs.guru (Apache-2.0)</span>
          <Link
            to="/api-hub"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary hover:border-primary/40 hover:text-primary"
            data-testid="detail-back"
          >
            <ArrowLeft className="h-3 w-3" /> Browse more APIs
          </Link>
        </div>
      </footer>

      {/* Raw Spec Drawer */}
      <Dialog.Root open={showSpecDrawer} onOpenChange={setShowSpecDrawer}>
        <Dialog.Portal>
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            {/* Drawer */}
            <Dialog.Content className="relative z-50 h-screen w-[90%] max-w-2xl overflow-hidden bg-surface shadow-2xl border-l border-border flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between gap-4 border-b border-border bg-elevated px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Raw Spec
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    {detail?.card.title}
                  </p>
                </div>
                <Dialog.Close className="rounded-md p-1.5 hover:bg-hover">
                  <X className="h-5 w-5 text-text-muted" />
                </Dialog.Close>
              </div>
              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  value={rawSpec}
                  language="yaml"
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    wordWrap: "on",
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                    </div>
                  }
                />
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────── */

const EndpointRow = ({ ep }: { ep: PublicApiEndpoint }) => {
  const [open, setOpen] = useState(false);
  const methodCls = METHOD_CLASS[ep.method] ?? METHOD_CLASS.HEAD;
  return (
    <li
      className="overflow-hidden rounded-md border border-border bg-surface"
      data-testid={`endpoint-${ep.method}-${ep.path}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
        )}
        <span
          className={cn(
            "rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
            methodCls,
          )}
        >
          {ep.method}
        </span>
        <span className="truncate font-mono text-xs text-text-primary">
          {ep.path}
        </span>
        <span className="truncate text-[12px] text-text-muted">
          {ep.summary}
        </span>
        {(ep.tags ?? []).slice(0, 2).map((t) => (
          <span
            key={t}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary"
          >
            <Tag className="h-2.5 w-2.5" /> {t}
          </span>
        ))}
      </button>
      {open && (
        <div className="border-t border-border bg-elevated/40 px-4 py-3 text-xs">
          {ep.description && (
            <p className="mb-3 whitespace-pre-wrap text-text-secondary">
              {ep.description}
            </p>
          )}

          {ep.parameters && ep.parameters.length > 0 && (
            <div className="mb-3">
              <h4 className="mb-1 font-semibold uppercase text-[10px] tracking-wider text-text-muted">
                Parameters
              </h4>
              <ul className="space-y-1">
                {ep.parameters.map((p) => (
                  <li
                    key={`${p.in}-${p.name}`}
                    className="flex flex-wrap items-baseline gap-2"
                  >
                    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-primary">
                      {p.name}
                    </code>
                    <span className="rounded border border-border bg-surface px-1 text-[10px] uppercase text-text-muted">
                      {p.in}
                    </span>
                    {p.required && (
                      <span className="rounded bg-rose-500/15 px-1 text-[10px] text-rose-400">
                        required
                      </span>
                    )}
                    {p.description && (
                      <span className="text-text-secondary">
                        {p.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ep.requestBody && (
            <div className="mb-3">
              <h4 className="mb-1 font-semibold uppercase text-[10px] tracking-wider text-text-muted">
                Request body
              </h4>
              <p className="text-text-secondary">
                {ep.requestBody.description ?? "(no description)"}{" "}
                {ep.requestBody.contentType && (
                  <code className="rounded bg-surface px-1 font-mono text-[10px]">
                    {ep.requestBody.contentType}
                  </code>
                )}
              </p>
            </div>
          )}

          {ep.responses && ep.responses.length > 0 && (
            <div>
              <h4 className="mb-1 font-semibold uppercase text-[10px] tracking-wider text-text-muted">
                Responses
              </h4>
              <ul className="space-y-1">
                {ep.responses.map((r) => (
                  <li key={r.code} className="flex items-baseline gap-2">
                    <code
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                        r.code.startsWith("2")
                          ? "bg-emerald-500/15 text-emerald-400"
                          : r.code.startsWith("4")
                            ? "bg-amber-500/15 text-amber-400"
                            : r.code.startsWith("5")
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-text-muted/15 text-text-secondary",
                      )}
                    >
                      {r.code}
                    </code>
                    <span className="text-text-secondary">{r.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

export default PublicApiDetailPage;
