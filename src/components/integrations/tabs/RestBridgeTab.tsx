/**
 * RestBridgeTab — bidirectional bridge between MCP tools and HTTP/curl.
 *
 *   ┌─────────────────┐                          ┌──────────────────┐
 *   │  MCP → REST     │  ── pick server+tool ──▶ │ URL + curl + body│
 *   └─────────────────┘                          └──────────────────┘
 *
 *   ┌─────────────────┐  ── paste curl/HTTP ──▶  ┌──────────────────┐
 *   │  REST → MCP     │                          │ MCP tool spec    │
 *   └─────────────────┘                          │ (name + schema)  │
 *                                                └──────────────────┘
 *
 * The MCP → REST half is the proven flow we shipped earlier; the REST →
 * MCP half is a client-side curl parser → ToolSpec converter. We
 * deliberately keep it client-side so the demo works even if the
 * backend bridge endpoint is not deployed yet — paste a curl, watch a
 * MCP tool spec appear with the right name, description and JSON
 * Schema generated from the JSON body.
 *
 * Right-rail Snippet panel hint: when the user opens MCP → REST we
 * surface a small breadcrumb explaining that the same curl + multi-
 * language snippets (Node/Python/Java/...) are also available in the
 * right-side Snippets panel, so the user can copy from either place
 * without changing context.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Repeat, Copy, Loader2, ArrowRight, Server, Wrench, Code2,
  ArrowLeftRight, Sparkles, ListChecks, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { MonacoEditor as CodeEditor } from '@/components/editor/MonacoEditor';
import {
  listServers, listTools, buildRestBridge,
  type McpServer, type McpTool,
} from '@/services/mcp.service';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import { useRequestDraftStore, type DraftKV } from '@/stores/requestDraft.store';
import { cn } from '@/utils/cn';

/** Direction toggle key — `m2r` = MCP→REST, `r2m` = REST→MCP. */
type BridgeDirection = 'm2r' | 'r2m';

export const RestBridgeTab = () => {
  const setTab = useMcpStudioStore((s) => s.setTab);
  const activeServerId = useMcpStudioStore((s) => s.activeServerId);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);

  const [direction, setDirection] = useState<BridgeDirection>('m2r');
  const setDraftSnapshot = useRequestDraftStore((s) => s.setSnapshot);
  const clearDraft       = useRequestDraftStore((s) => s.clear);
  // Subscribe to the live draft so external edits (snippet panel cURL
  // editor) round-trip back into this page.
  const draftCurrent     = useRequestDraftStore((s) => s.current);
  // Signature of the LAST snapshot WE pushed — used to distinguish our
  // own writes (don't re-apply) from external edits (do re-apply).
  const lastPushedSigRef = useRef<string>('');

  const { data: servers = [] } = useQuery({ queryKey: ['mcp-servers'], queryFn: () => listServers() });
  const server = servers.find((s) => s.id === activeServerId) ?? servers[0];

  /* ────────────── MCP → REST state (unchanged from prior) ────────────── */
  const [pickedTool, setPickedTool] = useState<string>('');
  const [tools, setTools] = useState<McpTool[]>([]);
  const [bridge, setBridge] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!server) return;
    setTools([]); setPickedTool(''); setBridge(null);
    listTools({ serverId: server.id }).then((r) => {
      const safe = Array.isArray(r?.tools) ? r.tools : [];
      setTools(safe);
      if (safe[0]) setPickedTool(safe[0].name);
    }).catch(() => { setTools([]); });
  }, [server?.id]);

  useEffect(() => {
    if (!server || !pickedTool || direction !== 'm2r') return;
    setLoading(true);
    buildRestBridge(server.id, pickedTool)
      .then(setBridge)
      .finally(() => setLoading(false));
  }, [server?.id, pickedTool, direction]);

  /* ────────────── REST → MCP state ────────────────────────────────────── */
  const [curlInput, setCurlInput] = useState<string>(
    'curl -X POST https://api.example.com/v1/orders \\\n' +
    '  -H "Content-Type: application/json" \\\n' +
    '  -H "Authorization: Bearer $TOKEN" \\\n' +
    '  -d \'{"customerId": "abc", "amount": 99.99, "items": ["sku-1","sku-2"]}\'',
  );
  const r2mSpec = useMemo(() => parseCurlToMcpSpec(curlInput), [curlInput]);

  // ─── Push the active request into the shared draft store ─────────────
  // The right-rail Snippet panel (`CodeSnippetPanel`) reads from
  // `useRequestDraftStore` and renders multi-language equivalents (curl,
  // fetch, axios, Python requests, Java OkHttp, …). Whenever the user
  // is on this tab — in EITHER direction — we want that panel populated
  // so they can copy-paste from there without context-switching.
  //
  // For MCP → REST: publish `bridge.{method,url,headers,sampleBody}`.
  // For REST → MCP: publish the parsed curl (`r2mSpec`).
  // When the tab unmounts we clear the draft so the snippet panel
  // doesn't keep a stale MCP request once the user navigates away.
  useEffect(() => {
    if (direction === 'm2r' && bridge) {
      const headersKV: DraftKV[] = Object.entries(bridge.headers || {}).map(
        ([name, value]) => ({ name, value: String(value), enabled: true }),
      );
      const body = bridge.sampleBody;
      const snap = {
        source: 'mcp' as const,
        id: `mcp-m2r-${server?.id ?? 'srv'}-${pickedTool}`,
        method: bridge.method || 'POST',
        url: bridge.url || '',
        queryParams: [],
        headers: headersKV,
        bodyKind: (body ? 'json' : 'none') as 'json' | 'none',
        bodyText: body ? JSON.stringify(body, null, 2) : undefined,
        bodyForm: undefined,
      };
      lastPushedSigRef.current = draftSignature(snap);
      setDraftSnapshot(snap);
    } else if (direction === 'r2m' && r2mSpec?.ok) {
      const headersKV: DraftKV[] = Object.entries(r2mSpec.headers || {}).map(
        ([name, value]) => ({ name, value: String(value), enabled: true }),
      );
      const queryKV: DraftKV[] = Object.entries(r2mSpec.queryParams || {}).map(
        ([name, value]) => ({ name, value: String(value), enabled: true }),
      );
      const isJson = r2mSpec.bodyKind === 'json' && r2mSpec.body && typeof r2mSpec.body === 'object';
      const snap = {
        source: 'mcp' as const,
        id: 'mcp-r2m-parsed-curl',
        method: r2mSpec.method,
        url: r2mSpec.url,
        queryParams: queryKV,
        headers: headersKV,
        bodyKind: (isJson ? 'json' : (r2mSpec.bodyKind === 'form' ? 'form-urlencoded' : 'none')) as
          'json' | 'form-urlencoded' | 'none',
        bodyText: isJson ? JSON.stringify(r2mSpec.body, null, 2) : undefined,
        bodyForm: undefined,
      };
      lastPushedSigRef.current = draftSignature(snap);
      setDraftSnapshot(snap);
    }
  }, [direction, bridge, r2mSpec, server?.id, pickedTool, setDraftSnapshot]);

  // ─── Round-trip edits from the right-rail snippet panel ─────────────
  // When the user edits the cURL/Postman snippet on the right rail, the
  // CodeSnippetPanel parses it and calls `setSnapshot()` with the new
  // method/url/headers/body. We detect that those values diverge from
  // what WE last wrote (via `lastPushedSigRef`) and reflect them back
  // into the page so the URL/Headers/Body/curl card stays in sync —
  // i.e. the bidirectional contract the user expects.
  useEffect(() => {
    if (draftCurrent.source !== 'mcp') return;
    const sig = draftSignature(draftCurrent);
    if (sig === lastPushedSigRef.current) return; // our own write — ignore
    // External edit; reflect back into the appropriate half.
    if (direction === 'm2r') {
      if (!bridge) return;
      const newHeaders: Record<string, string> = {};
      for (const h of draftCurrent.headers || []) {
        if (h.enabled === false || !h.name) continue;
        newHeaders[h.name] = h.value;
      }
      let newBody: any = undefined;
      if (draftCurrent.bodyKind === 'json' && draftCurrent.bodyText) {
        try { newBody = JSON.parse(draftCurrent.bodyText); } catch { newBody = draftCurrent.bodyText; }
      }
      const next = {
        ...bridge,
        method: draftCurrent.method || bridge.method,
        url: draftCurrent.url || bridge.url,
        headers: newHeaders,
        sampleBody: newBody ?? bridge.sampleBody,
        curl: buildCurlString(draftCurrent.method, draftCurrent.url, newHeaders, draftCurrent.bodyText),
      };
      lastPushedSigRef.current = sig; // remember the synced value
      setBridge(next);
    } else if (direction === 'r2m') {
      // Rebuild the curl textarea content from the parsed draft so the
      // left editor reflects whatever the snippet panel parsed.
      const headersObj: Record<string, string> = {};
      for (const h of draftCurrent.headers || []) {
        if (h.enabled === false || !h.name) continue;
        headersObj[h.name] = h.value;
      }
      const next = buildCurlString(draftCurrent.method, draftCurrent.url, headersObj, draftCurrent.bodyText);
      lastPushedSigRef.current = sig;
      setCurlInput(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftCurrent]);

  // Clear the draft when the user leaves the tab so the right-rail
  // snippet panel doesn't keep showing an MCP request elsewhere.
  useEffect(() => () => { clearDraft(); }, [clearDraft]);

  if (!server && direction === 'm2r') {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center" data-testid="rest-no-server">
        <div className="max-w-md">
          <Repeat className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <h4 className="text-sm font-semibold">Pick a server</h4>
          <p className="mt-1 text-xs text-text-muted">
            Register or pick a server first — the bridge URL is server + tool specific.
          </p>
          <Button variant="primary" className="mt-3" onClick={() => setTab('servers')}>
            <ArrowRight className="h-3.5 w-3.5" /> Browse servers
          </Button>
        </div>
      </div>
    );
  }

  const copy = async (s: string, label: string) => {
    await navigator.clipboard.writeText(s);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-3 p-4" data-testid="mcp-rest-tab">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Repeat className="h-3.5 w-3.5 text-primary" /> MCP ↔ REST Bridge
        </h3>
        <DirectionToggle value={direction} onChange={setDirection} />
      </header>

      {direction === 'm2r' ? (
        <McpToRest
          servers={servers}
          server={server!}
          setActiveServer={setActiveServer}
          tools={tools}
          pickedTool={pickedTool}
          setPickedTool={setPickedTool}
          bridge={bridge}
          loading={loading}
          copy={copy}
        />
      ) : (
        <RestToMcp
          curlInput={curlInput}
          setCurlInput={setCurlInput}
          spec={r2mSpec}
          copy={copy}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────── */
/*                            Direction toggle                              */
/* ─────────────────────────────────────────────────────────────────────── */

const DirectionToggle = ({
  value, onChange,
}: { value: BridgeDirection; onChange: (v: BridgeDirection) => void }) => (
  <div className="inline-flex items-center rounded-full border border-border bg-surface/40 p-1" data-testid="rest-bridge-direction">
    <button
      type="button"
      onClick={() => onChange('m2r')}
      data-testid="rest-bridge-direction-m2r"
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
        value === 'm2r' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary',
      )}
    >
      <Wrench className="h-3 w-3" /> MCP <ArrowRight className="h-3 w-3" /> REST
    </button>
    <button
      type="button"
      onClick={() => onChange('r2m')}
      data-testid="rest-bridge-direction-r2m"
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
        value === 'r2m' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary',
      )}
    >
      <Code2 className="h-3 w-3" /> REST <ArrowRight className="h-3 w-3" /> MCP
    </button>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────── */
/*                              MCP → REST                                  */
/* ─────────────────────────────────────────────────────────────────────── */

interface McpToRestProps {
  servers: McpServer[];
  server: McpServer;
  setActiveServer: (id: string) => void;
  tools: McpTool[];
  pickedTool: string;
  setPickedTool: (s: string) => void;
  bridge: any;
  loading: boolean;
  copy: (s: string, label: string) => Promise<void>;
}

const McpToRest = ({
  servers, server, setActiveServer, tools, pickedTool, setPickedTool, bridge, loading, copy,
}: McpToRestProps) => (
  <>
    <div className="grid gap-3 rounded-md border border-border bg-surface/30 p-3 sm:grid-cols-2">
      <Field label="Server" icon={Server}>
        <select data-testid="rest-server"
                value={server.id}
                onChange={(e) => setActiveServer(e.target.value)}
                className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs">
          {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Tool" icon={Wrench}>
        <select data-testid="rest-tool"
                value={pickedTool}
                onChange={(e) => setPickedTool(e.target.value)}
                className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                disabled={tools.length === 0}>
          {tools.length === 0 && <option value="">Loading tools…</option>}
          {tools.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </Field>
    </div>

    {loading ? (
      <Skeleton className="h-56 w-full" />
    ) : !bridge ? (
      <div className="rounded-md border border-dashed border-border bg-surface/30 p-12 text-center text-xs text-text-muted">
        Pick a server + tool to generate the REST bridge.
      </div>
    ) : (
      <div className="space-y-3" data-testid="rest-bridge-view">
        <Row label="Method">
          <span className="rounded bg-success-muted px-2 py-0.5 font-mono text-[11px] font-bold text-success">{bridge.method}</span>
        </Row>
        <Row label="URL">
          <div className="flex w-full items-center gap-1">
            <code data-testid="rest-bridge-url" className="flex-1 truncate rounded border border-border bg-probestack-bg px-2 py-1 font-mono text-[11px]">{bridge.url}</code>
            <Button variant="outline" data-testid="rest-bridge-copy-url" onClick={() => copy(bridge.url, 'URL')}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </Row>
        <Row label="Headers">
          <pre className="w-full rounded border border-border bg-probestack-bg p-2 font-mono text-[10px]">
{Object.entries(bridge.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
          </pre>
        </Row>
        <Row label="Sample body">
          <div className="flex h-40 w-full overflow-hidden rounded border border-border">
            <CodeEditor value={JSON.stringify(bridge.sampleBody, null, 2)} onChange={() => {}} language="json" readOnly testId="rest-bridge-body" />
          </div>
        </Row>
        <Row label="curl">
          <div className="w-full">
            <pre data-testid="rest-bridge-curl" className="overflow-x-auto rounded border border-border bg-probestack-bg p-2 font-mono text-[10px] leading-relaxed">{bridge.curl}</pre>
            <Button variant="outline" className="mt-1.5" data-testid="rest-bridge-copy-curl" onClick={() => copy(bridge.curl, 'curl')}>
              <Copy className="h-3 w-3" /> Copy curl
            </Button>
          </div>
        </Row>
      </div>
    )}

    {/* Instructions block — at the bottom as a titled section so the
        user knows where the right-rail snippet panel comes in once
        they've reviewed the generated REST bridge above. */}
    <SnippetInstructions />
  </>
);

/** Bottom-anchored "Open the snippet panel" instructions, styled as
 *  a heading-led card rather than a top-of-page tip. */
const SnippetInstructions = () => (
  <section
    data-testid="rest-bridge-snippet-instructions"
    className="mt-5 rounded-md border border-border bg-surface/30 p-4"
  >
    <header className="mb-2 flex items-center gap-2">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <h4 className="text-[13px] font-semibold text-text-primary">
        Multi-language snippets — open the right-side Snippets panel
      </h4>
    </header>
    <ol className="ml-4 list-decimal space-y-1 text-[11px] leading-snug text-text-secondary">
      <li>Expand the <span className="font-semibold">Snippets</span> tab on the right rail.</li>
      <li>The same request is auto-loaded — switch between <span className="font-mono">cURL</span>,
        <span className="font-mono"> fetch</span>, <span className="font-mono">axios</span>,
        <span className="font-mono"> Python · requests</span>, <span className="font-mono">Java · OkHttp</span>,
        and 6 more.</li>
      <li>Edit the <span className="font-mono">cURL</span> there and the parsed values flow back into this page automatically.</li>
    </ol>
  </section>
);

/* ─────────────────────────────────────────────────────────────────────── */
/*                              REST → MCP                                  */
/* ─────────────────────────────────────────────────────────────────────── */

interface ParsedMcpSpec {
  ok: boolean;
  error?: string;
  toolName: string;
  description: string;
  method: string;
  url: string;
  pathParams: string[];
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body: any;
  bodyKind: 'json' | 'form' | 'raw' | 'none';
  inputSchema: Record<string, any>;
}

const RestToMcp = ({
  curlInput, setCurlInput, spec, copy,
}: {
  curlInput: string;
  setCurlInput: (s: string) => void;
  spec: ParsedMcpSpec;
  copy: (s: string, label: string) => Promise<void>;
}) => (
  <div className="grid gap-3 lg:grid-cols-[1fr_1fr]" data-testid="r2m-pane">
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">curl / HTTP request</span>
        <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">paste here</span>
      </div>
      <div className="h-72 overflow-hidden rounded border border-border" data-testid="r2m-curl-editor">
        <CodeEditor value={curlInput} onChange={setCurlInput} language="shell" testId="r2m-curl" />
      </div>
      <Button variant="outline" onClick={() => copy(curlInput, 'curl')} data-testid="r2m-copy-curl">
        <Copy className="h-3 w-3" /> Copy curl
      </Button>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          <ArrowLeftRight className="h-3 w-3" /> Generated MCP tool spec
        </span>
        {spec.ok && (
          <Button variant="outline" onClick={() => copy(JSON.stringify(buildMcpToolJson(spec), null, 2), 'MCP tool JSON')} data-testid="r2m-copy-spec">
            <Copy className="h-3 w-3" /> Copy MCP JSON
          </Button>
        )}
      </div>

      {!spec.ok ? (
        <div className="rounded border border-dashed border-border bg-surface/30 p-6 text-center text-[11px] text-text-muted" data-testid="r2m-spec-empty">
          <FileText className="mx-auto mb-1.5 h-5 w-5 opacity-50" />
          {spec.error || 'Paste a curl command on the left to generate an MCP tool spec.'}
        </div>
      ) : (
        <div className="rounded border border-border bg-surface/30 p-3 text-[11px]" data-testid="r2m-spec">
          <KV label="tool name"   value={spec.toolName} mono />
          <KV label="description" value={spec.description} />
          <KV label="method"      value={spec.method} mono />
          <KV label="url"         value={spec.url} mono />
          {spec.pathParams.length > 0 && (
            <KV label="path params" value={spec.pathParams.join(', ')} mono />
          )}
          {Object.keys(spec.queryParams).length > 0 && (
            <KV label="query"
                value={Object.entries(spec.queryParams).map(([k, v]) => `${k}=${v}`).join(' & ')}
                mono />
          )}
          <div className="mt-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              <ListChecks className="h-3 w-3" /> input schema (JSON Schema)
            </div>
            <pre className="max-h-72 overflow-auto rounded border border-border bg-probestack-bg p-2 font-mono text-[10px]">
{JSON.stringify(spec.inputSchema, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  </div>
);

const KV = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-baseline gap-2 border-b border-border/30 py-1 last:border-b-0">
    <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
    <span className={cn('min-w-0 break-all text-text-primary', mono && 'font-mono text-[11px]')}>{value || '—'}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────── */
/*                       curl → MCP tool spec parser                        */
/*                                                                          */
/*  Best-effort tokeniser. Handles:                                         */
/*    • multi-line `\` continuations                                        */
/*    • -X / --request, -H / --header, -d / --data, --data-raw, --form,     */
/*      -F, --url, single + double quotes, the special `-X POST URL` style  */
/*    • query params extracted from the URL                                 */
/*    • JSON body → JSON Schema property map (string/number/boolean/array)  */
/* ─────────────────────────────────────────────────────────────────────── */

function parseCurlToMcpSpec(input: string): ParsedMcpSpec {
  const empty: ParsedMcpSpec = {
    ok: false, error: 'Paste a curl command on the left to generate an MCP tool spec.',
    toolName: '', description: '', method: 'GET', url: '',
    pathParams: [], queryParams: {}, headers: {}, body: null, bodyKind: 'none',
    inputSchema: { type: 'object', properties: {}, required: [] },
  };
  const cleaned = input.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned || !/^curl\b/i.test(cleaned)) {
    return { ...empty, error: 'Input must start with `curl …`' };
  }

  const tokens = tokenize(cleaned).slice(1); // drop the leading `curl`
  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let rawBody = '';
  let bodyKind: ParsedMcpSpec['bodyKind'] = 'none';

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const next = () => tokens[++i] ?? '';
    if (tok === '-X' || tok === '--request') { method = next().toUpperCase(); continue; }
    if (tok === '-H' || tok === '--header') {
      const h = stripQuotes(next());
      const idx = h.indexOf(':');
      if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
      continue;
    }
    if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
      rawBody = stripQuotes(next());
      bodyKind = 'json';
      if (method === 'GET') method = 'POST';
      continue;
    }
    if (tok === '--data-urlencode' || tok === '-F' || tok === '--form') {
      rawBody = stripQuotes(next());
      bodyKind = 'form';
      if (method === 'GET') method = 'POST';
      continue;
    }
    if (tok === '--url') { url = stripQuotes(next()); continue; }
    if (tok === '-u' || tok === '--user' || tok === '-A' || tok === '--user-agent' || tok === '-e' || tok === '--referer' || tok === '-o' || tok === '--output') {
      next(); // consume single-value flags we don't care about
      continue;
    }
    if (tok.startsWith('-')) {
      // Unknown flag — best-effort: if it carries a value, swallow it.
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) next();
      continue;
    }
    // Positional → the URL
    if (!url) url = stripQuotes(tok);
  }

  if (!url) return { ...empty, error: 'Could not find a URL in the curl.' };

  // Split URL → path + query
  let path = url, queryStr = '';
  const qIdx = url.indexOf('?');
  if (qIdx >= 0) { path = url.slice(0, qIdx); queryStr = url.slice(qIdx + 1); }
  const queryParams: Record<string, string> = {};
  if (queryStr) {
    for (const part of queryStr.split('&')) {
      if (!part) continue;
      const eq = part.indexOf('=');
      const k = eq >= 0 ? part.slice(0, eq) : part;
      const v = eq >= 0 ? part.slice(eq + 1) : '';
      queryParams[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }

  // Path params heuristic — `{id}` style or `/users/123` final numeric segment
  const pathParams: string[] = [];
  const curlyRe = /\{([^}]+)\}/g;
  let m;
  while ((m = curlyRe.exec(path)) !== null) pathParams.push(m[1]);

  // Parse JSON body → properties
  let body: any = null;
  const properties: Record<string, any> = {};
  const required: string[] = [];
  if (bodyKind === 'json' && rawBody) {
    try {
      body = JSON.parse(rawBody);
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        for (const [k, v] of Object.entries(body)) {
          properties[k] = jsTypeToSchema(v);
          required.push(k);
        }
      }
    } catch {
      // Not strict JSON — keep raw, no schema rows
      bodyKind = 'raw';
    }
  } else if (bodyKind === 'form' && rawBody) {
    // key1=val&key2=val OR -F "key=value"
    const flat = rawBody.replace(/^"|"$/g, '');
    if (flat.includes('=')) {
      for (const part of flat.split('&')) {
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        const k = part.slice(0, eq);
        properties[k] = { type: 'string' };
        required.push(k);
      }
    }
  }

  // Add path + query params to the schema so AI agents can fill them in.
  for (const p of pathParams) {
    properties[p] = { type: 'string', description: `Path parameter ${p}` };
    if (!required.includes(p)) required.push(p);
  }
  for (const [k] of Object.entries(queryParams)) {
    if (!properties[k]) properties[k] = { type: 'string', description: `Query parameter ${k}` };
  }

  // Derive a tool name from the path: /v1/orders → create-order or list-order
  const segs = path.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean).filter((s) => !s.startsWith('{'));
  const last = segs[segs.length - 1] || 'request';
  const verb =
    method === 'GET'    ? (path.includes('{') ? 'get'    : 'list') :
    method === 'POST'   ? 'create' :
    method === 'PUT'    ? 'replace' :
    method === 'PATCH'  ? 'update' :
    method === 'DELETE' ? 'delete' : method.toLowerCase();
  const toolName = `${verb}-${singularise(last)}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  const description = `${method} ${path} — generated from curl`;

  return {
    ok: true,
    toolName,
    description,
    method,
    url: path,
    pathParams,
    queryParams,
    headers,
    body,
    bodyKind,
    inputSchema: {
      type: 'object',
      properties,
      required,
    },
  };
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  let buf = '', q: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === q) { q = null; buf += ch; }
      else buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
    if (ch === ' ') { if (buf) { out.push(buf); buf = ''; } continue; }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function jsTypeToSchema(v: any): any {
  if (v === null) return { type: 'string' };
  if (Array.isArray(v)) return { type: 'array', items: v.length > 0 ? jsTypeToSchema(v[0]) : { type: 'string' } };
  switch (typeof v) {
    case 'number':  return Number.isInteger(v) ? { type: 'integer' } : { type: 'number' };
    case 'boolean': return { type: 'boolean' };
    case 'object':  {
      const props: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) props[k] = jsTypeToSchema(val);
      return { type: 'object', properties: props };
    }
    default: return { type: 'string' };
  }
}

/** Best-effort plural→singular (orders → order, statuses → status). */
function singularise(w: string): string {
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ses')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function buildMcpToolJson(spec: ParsedMcpSpec): Record<string, unknown> {
  return {
    name: spec.toolName,
    description: spec.description,
    inputSchema: spec.inputSchema,
    forgeq: {
      transport: 'rest',
      method: spec.method,
      url: spec.url,
      headers: spec.headers,
      query: spec.queryParams,
      bodyKind: spec.bodyKind,
      sampleBody: spec.body,
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/*               draft <-> page synchronisation helpers                     */
/* ─────────────────────────────────────────────────────────────────────── */

/** Stable signature of the fields we round-trip — used to ignore writes
 *  that originated from this same component on a previous tick. */
function draftSignature(d: {
  method: string;
  url: string;
  headers: DraftKV[];
  bodyKind: string;
  bodyText?: string;
}): string {
  const hs = (d.headers || [])
    .filter((h) => h && h.name)
    .map((h) => [h.name, h.value, h.enabled !== false ? 1 : 0]);
  return JSON.stringify([d.method || '', d.url || '', d.bodyKind || 'none', d.bodyText || '', hs]);
}

/** Best-effort multi-line curl reconstruction from a parsed draft. */
function buildCurlString(
  method: string,
  url: string,
  headers: Record<string, string>,
  bodyText?: string,
): string {
  const lines: string[] = [`curl -X ${method || 'GET'} '${url}'`];
  for (const [k, v] of Object.entries(headers || {})) {
    if (!k) continue;
    lines.push(`  -H '${k}: ${v}'`);
  }
  if (bodyText && bodyText.trim()) {
    lines.push(`  -d '${bodyText.replace(/'/g, "'\\''")}'`);
  }
  return lines.join(' \\\n');
}

/* ─────────────────────────────────────────────────────────────────────── */
const Field = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
  <div>
    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
      <Icon className="h-3 w-3" /> {label}
    </div>
    {children}
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className={cn('grid grid-cols-[100px_1fr] items-start gap-3')}>
    <span className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
    <div>{children}</div>
  </div>
);
