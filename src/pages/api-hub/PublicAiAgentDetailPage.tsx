import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Loader2, Download, ArrowRight, Tag, Server, Key, ExternalLink, ChevronDown, ChevronRight, FileJson, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { importAgentToWorkspace, fetchAgentById, type PublicAgentCard } from '@/services/publicAiAgents.service';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { cn } from '@/utils/cn';
import Editor from '@monaco-editor/react';
import * as Dialog from '@radix-ui/react-dialog';

// Method badge colors (same as API detail page)
const METHOD_CLASS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15    text-blue-400    border-blue-500/30",
  PUT: "bg-amber-500/15   text-amber-400   border-amber-500/30",
  PATCH: "bg-violet-500/15  text-violet-400  border-violet-500/30",
  DELETE: "bg-rose-500/15    text-rose-400    border-rose-500/30",
  HEAD: "bg-text-muted/15  text-text-secondary border-border",
  OPTIONS: "bg-text-muted/15  text-text-secondary border-border",
};

interface MethodMetadata {
  required?: string[];
  optional?: string[];
  params?: any;
  example?: any;
  note?: string;
  description?: string;
  summary?: string;
  responses?: Record<string, string>;
}

interface EndpointLike {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters?: Array<{ name: string; in: string; required?: boolean; description?: string }>;
  requestBody?: { description?: string; contentType?: string };
  responses?: Array<{ code: string; description?: string }>;
  note?: string;
}

export const PublicAiAgentDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
  const agentFromState = location.state?.agent as PublicAgentCard | undefined;
  const isAuthed = useAuth(s => s.isAuthenticated());
  const ws = useWorkspaceStore(s => s.current);
  const [agent, setAgent] = useState<PublicAgentCard | null>(agentFromState || null);
  const [loading, setLoading] = useState(!agentFromState);
  const [importing, setImporting] = useState(false);
  const [methodMetadata, setMethodMetadata] = useState<Record<string, MethodMetadata> | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>("ANY");
  const [tagFilter, setTagFilter] = useState<string>("ANY");
  const [search, setSearch] = useState("");
  const [openEndpoint, setOpenEndpoint] = useState<number | null>(null);
  const [showJsonDrawer, setShowJsonDrawer] = useState(false);
  const [rawJsonData, setRawJsonData] = useState<string>("");
  const [drawerWidth, setDrawerWidth] = useState(640);
  const drawerResizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // Resize handler for drawer
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 400 && newWidth <= window.innerWidth * 0.9) {
        setDrawerWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
  };

  // If agent was not passed via state, fetch it by ID
  useEffect(() => {
    if (!agent && agentId) {
      fetchAgentById(agentId)
        .then(a => setAgent(a))
        .finally(() => setLoading(false));
    }
  }, [agent, agentId]);

  // Fetch endpoint metadata from agent's base URL.
  // This is a legacy A2A-registry pattern where every agent self-hosts a
  // discovery document at its root URL. Our curated catalog already
  // ships `agent.endpoints`, so this fetch is only a fallback for
  // dynamically-loaded agents that don't have static endpoints baked in.
  useEffect(() => {
    if (!agent) return;
    // Catalog-driven agents already have endpoints — skip the network call.
    if (agent.endpoints && agent.endpoints.length > 0) {
      setMethodMetadata(null);
      setLoadingMetadata(false);
      return;
    }
    if (!agent.baseUrl) return;
    setLoadingMetadata(true);
    fetch(agent.baseUrl)
      .then(res => res.ok ? res.json() : null)
      .then(data => setMethodMetadata((data && data.methods) || null))
      .catch(() => {
        // CORS-blocked endpoints (api.openai.com, api.anthropic.com…) are
        // expected to fail here — that's fine, we fall back to the static
        // endpoint list. We swallow the error rather than logging it so
        // the browser console stays clean.
      })
      .finally(() => setLoadingMetadata(false));
  }, [agent]);

  // Convert method metadata to endpoints array
  const endpoints = useMemo<EndpointLike[]>(() => {
    // ── Source 1: catalog-provided endpoints (preferred) ──
    if (agent?.endpoints && agent.endpoints.length > 0) {
      return agent.endpoints.map((ep) => ({
        method: ep.method,
        path: ep.path ?? '',
        summary: ep.description ?? ep.label,
        description: ep.description,
      }));
    }
    // ── Source 2: dynamic A2A-style metadata fetched from baseUrl ──
    if (!methodMetadata) return [];
    const result: EndpointLike[] = [];
    for (const [methodName, methodData] of Object.entries(methodMetadata)) {
      let httpMethod = "POST";
      if (methodName.toLowerCase().includes("get") || methodName === "tasks/get") httpMethod = "GET";
      else if (methodName.toLowerCase().includes("list")) httpMethod = "GET";
      const path = `/${methodName.replace(/\./g, '/')}`;
      const summary = methodData.summary || methodData.description || `${methodName} endpoint`;
      const description = methodData.description || methodData.note;
      const parameters: EndpointLike['parameters'] = [];
      if (methodData.required?.length) {
        methodData.required.forEach((p: string) => {
          parameters.push({ name: p, in: 'body', required: true, description: 'Required parameter' });
        });
      }
      if (methodData.optional?.length) {
        methodData.optional.forEach((p: string) => {
          parameters.push({ name: p, in: 'body', required: false, description: 'Optional parameter' });
        });
      }
      const requestBody = methodData.params ? { description: 'Request parameters', contentType: 'application/json' } : undefined;
      let responses = undefined;
      if (methodData.responses) {
        responses = Object.entries(methodData.responses).map(([code, desc]) => ({ code, description: desc }));
      } else {
        responses = [{ code: "200", description: "Success" }, { code: "400", description: "Bad Request" }];
      }
      result.push({
        method: httpMethod,
        path,
        summary,
        description,
        parameters,
        requestBody,
        responses,
        note: methodData.note,
      });
    }
    return result;
  }, [methodMetadata]);

  // Distinct methods for filter dropdown
  const methods = useMemo(() => {
    const s = new Set<string>();
    endpoints.forEach(e => s.add(e.method));
    return Array.from(s);
  }, [endpoints]);

  // Tags from agent's own tags
  const tags = agent?.tags || [];

  // Filter endpoints
  const filtered = useMemo(() => {
    return endpoints.filter(e => {
      if (methodFilter !== "ANY" && e.method !== methodFilter) return false;
      if (tagFilter !== "ANY" && !tags.includes(tagFilter)) return false;
      if (search) {
        const hay = `${e.method} ${e.path} ${e.summary ?? ''} ${e.description ?? ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [endpoints, methodFilter, tagFilter, search, tags]);

  const handleImport = async () => {
    if (!agent) return;
    if (!isAuthed) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!ws?.id) {
      toast.error('Select a workspace first');
      return;
    }
    setImporting(true);
    const tid = toast.loading(`Importing ${agent.name}…`);
    try {
      const result = await importAgentToWorkspace(agent, ws.id);
      toast.success(`Imported ${agent.name}`, { id: tid, description: `${result.requestCount} endpoints added.` });
      navigate(`/projects/collections/${result.collectionId}`);
    } catch (err: any) {
      toast.error('Import failed', { id: tid, description: err.message });
    } finally {
      setImporting(false);
    }
  };

  const onOpenJsonDrawer = async () => {
    if (!agent) return;
    setShowJsonDrawer(true);
    // 1. Always render the agent card first — this is the source of
    //    truth for the UI and works for every agent (including ones
    //    without a baseUrl). Wrapped in try/catch so any exotic
    //    circular ref still falls back to a safe string.
    let cardJson: string;
    try {
      cardJson = JSON.stringify(agent, null, 2);
    } catch (err: any) {
      cardJson = `// Could not stringify agent card: ${err?.message ?? 'unknown error'}`;
    }
    setRawJsonData(cardJson);
    if (!agent.baseUrl) return;
    // 2. Best-effort live fetch — if it CORS-blocks or 401s, we just
    //    keep the card view. No toast on failure (it's expected for
    //    most providers).
    try {
      const response = await fetch(agent.baseUrl, { credentials: 'omit' });
      if (!response.ok) return;
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        setRawJsonData(
          `// ─── Agent card (catalog data) ─────────────────\n` +
          cardJson +
          `\n\n// ─── Live response from ${agent.baseUrl} ──────────\n` +
          JSON.stringify(json, null, 2),
        );
      } catch {
        // Non-JSON body — still useful (e.g. HTML)
        setRawJsonData(
          `// ─── Agent card (catalog data) ─────────────────\n` +
          cardJson +
          `\n\n// ─── Live response from ${agent.baseUrl} (non-JSON) ──────────\n` +
          text.slice(0, 4000),
        );
      }
    } catch {
      // CORS / network — silently keep the card-only view.
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Bot className="h-12 w-12 text-text-muted" />
        <p className="text-text-muted">Agent not found</p>
        <Link to="/api-hub?tab=agents" className="text-primary hover:underline">← Back to marketplace</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
        <Link to="/" className="flex items-center gap-1">
          <Logo variant="mark" className="h-12 w-10" />
          <div>
            <div className="text-[0.8rem] text-text-secondary">ProbeStack</div>
            <div className="font-bold text-2xl gradient-text">ForgeFuzz</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/api-hub?tab=agents" className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/40 px-3 py-1.5 text-[11px] font-medium hover:border-primary/40 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to marketplace
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Hero section */}
        <div className="flex items-start gap-6 mb-8">
          {agent.logoUrl ? (
            <img src={agent.logoUrl} className="h-20 w-20 rounded-xl border bg-white object-contain p-2" alt="" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-xl bg-primary/10 text-primary"><Bot className="h-10 w-10" /></div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 text-[11px] uppercase">
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-semibold text-warning">{agent.provider}</span>
              <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono">{agent.protocol.toUpperCase()}</span>
              {agent.publicTokenLimit != null && (
                <span className="rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-primary">{agent.publicTokenLimit.toLocaleString()} tokens</span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold">{agent.name}</h1>
            <p className="mt-2 text-sm text-text-secondary">{agent.description}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={handleImport} disabled={importing} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold  disabled:opacity-60">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Try It (Import)
              </button>
              {agent.baseUrl && (
                <a
                  href={agent.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs"
                  data-testid="agent-open-base-url"
                >
                  <ExternalLink className="h-4 w-4" /> Open base URL
                </a>
              )}
              <button
                type="button"
                onClick={onOpenJsonDrawer}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary hover:border-primary/40 hover:text-primary"
                data-testid="agent-view-json"
              >
                <FileJson className="h-3.5 w-3.5" /> View JSON
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-8">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-1 text-[10px]">
                <Tag className="h-2.5 w-2.5" /> {t}
              </span>
            ))}
          </div>
        )}

        {/* Endpoints Section */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              Endpoints
              <span className="ml-2 text-xs font-normal text-text-muted">
                ({filtered.length} of {endpoints.length})
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
                {methods.map(m => (
                  <option key={m} value={m}>{m}</option>
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
                  {tags.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {loadingMetadata ? (
            <div className="flex items-center gap-2 text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading endpoints…</div>
          ) : filtered.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-surface/40 p-6 text-center text-xs text-text-muted">
              No endpoints match this filter.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="detail-endpoints">
              {filtered.map((ep, idx) => (
                <EndpointRow
                  key={idx}
                  ep={ep}
                  isOpen={openEndpoint === idx}
                  onToggle={() => setOpenEndpoint(openEndpoint === idx ? null : idx)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-border bg-surface/40 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 text-xs text-text-muted">
          <span>Powered by ProbeStack · Curated AI providers + live Smithery MCP registry</span>
          <Link to="/api-hub?tab=agents" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-medium hover:border-primary/40 hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> Browse more agents
          </Link>
        </div>
      </footer>

      {/* Resizable JSON Drawer */}
      <Dialog.Root open={showJsonDrawer} onOpenChange={setShowJsonDrawer}>
        <Dialog.Portal>
          <div className="fixed inset-0 z-50 flex justify-end">
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content
              className="relative z-50 h-screen bg-surface shadow-2xl border-l border-border flex flex-col"
              style={{ width: drawerWidth }}
            >
              {/* Resize handle */}
              <div
                ref={drawerResizeRef}
                onMouseDown={startResize}
                className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-primary/50 transition-colors"
              />
              {/* Header */}
              <div className="flex items-center justify-between gap-4 border-b border-border bg-elevated px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Agent JSON</h2>
                  <p className="text-xs text-text-muted mt-1 break-all">
                    {agent?.baseUrl ?? `Catalog data for ${agent?.name ?? 'agent'}`}
                  </p>
                </div>
                <Dialog.Close className="rounded-md p-1.5 hover:bg-hover">
                  <X className="h-5 w-5 text-text-muted" />
                </Dialog.Close>
              </div>
              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  value={rawJsonData}
                  language="json"
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    wordWrap: "on",
                  }}
                  loading={<div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div>}
                />
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

/* ---------- Endpoint Row Component (same styling as PublicApiDetailPage) ---------- */
const EndpointRow = ({ ep, isOpen, onToggle }: { ep: EndpointLike; isOpen: boolean; onToggle: () => void }) => {
  const methodCls = METHOD_CLASS[ep.method] ?? METHOD_CLASS.HEAD;
  return (
    <li className="overflow-hidden rounded-md border border-border bg-surface" data-testid={`endpoint-${ep.method}-${ep.path}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
        )}
        <span className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase", methodCls)}>
          {ep.method}
        </span>
        <span className="truncate font-mono text-xs text-text-primary">{ep.path}</span>
        <span className="truncate text-[12px] text-text-muted">{ep.summary}</span>
      </button>
      {isOpen && (
        <div className="border-t border-border bg-elevated/40 px-4 py-3 text-xs">
          {ep.description && <p className="mb-3 whitespace-pre-wrap text-text-secondary">{ep.description}</p>}
          {ep.parameters && ep.parameters.length > 0 && (
            <div className="mb-3">
              <h4 className="mb-1 font-semibold uppercase text-[10px] tracking-wider text-text-muted">Parameters</h4>
              <ul className="space-y-1">
                {ep.parameters.map(p => (
                  <li key={p.name} className="flex flex-wrap items-baseline gap-2">
                    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-primary">{p.name}</code>
                    <span className="rounded border border-border bg-surface px-1 text-[10px] uppercase text-text-muted">{p.in}</span>
                    {p.required && <span className="rounded bg-rose-500/15 px-1 text-[10px] text-rose-400">required</span>}
                    {p.description && <span className="text-text-secondary">{p.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ep.requestBody && (
            <div className="mb-3">
              <h4 className="mb-1 font-semibold uppercase text-[10px] tracking-wider text-text-muted">Request body</h4>
              <p className="text-text-secondary">
                {ep.requestBody.description ?? "(no description)"}
                {ep.requestBody.contentType && (
                  <code className="rounded bg-surface px-1 font-mono text-[10px] ml-1">{ep.requestBody.contentType}</code>
                )}
              </p>
            </div>
          )}
          {ep.responses && ep.responses.length > 0 && (
            <div>
              <h4 className="mb-1 font-semibold uppercase text-[10px] tracking-wider text-text-muted">Responses</h4>
              <ul className="space-y-1">
                {ep.responses.map(r => (
                  <li key={r.code} className="flex items-baseline gap-2">
                    <code className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                      r.code.startsWith("2") ? "bg-emerald-500/15 text-emerald-400" :
                      r.code.startsWith("4") ? "bg-amber-500/15 text-amber-400" :
                      r.code.startsWith("5") ? "bg-rose-500/15 text-rose-400" :
                      "bg-text-muted/15 text-text-secondary"
                    )}>{r.code}</code>
                    <span className="text-text-secondary">{r.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ep.note && (
            <div className="mt-3 text-xs text-text-muted italic border-l-2 border-primary pl-2">{ep.note}</div>
          )}
        </div>
      )}
    </li>
  );
};