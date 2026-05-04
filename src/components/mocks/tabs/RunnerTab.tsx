/**
 * RunnerTab — dedicated request-execution tab inside MockDetailPage.
 *
 * UX parity with the Collection RequestBuilder execution panel
 * (KVTable for Params/Headers, CodeMirror CodeEditor for body),
 * minus the "Save Response" button. Selecting an endpoint via the
 * left rail (`?ep=<id>`) auto-loads it.
 *
 * Top  — endpoint dropdown + URL bar (wide; copy/open/send all the way at the right end).
 * Mid  — Params / Headers / Body / Auth tabs (KVTable + CodeEditor).
 * Bot  — Response status + ms + size + Body / Headers / Cookies / Tests tabs.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Loader2, Copy, ExternalLink, ChevronDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { MonacoEditor as CodeEditor } from '@/components/editor/MonacoEditor';
import { KVTable, emptyRow, type KVRow } from '@/components/request-builder/parts/KVTable';
import { adhocExecute } from '@/services/request.service';
import { StatusBadge } from '../parts/StatusBadge';
import type { MockEndpoint, MockServer } from '@/services/mock.service';
import { cn } from '@/utils/cn';

type ReqTab = 'params' | 'headers' | 'body' | 'auth';
type RespTab = 'body' | 'headers' | 'cookies' | 'tests';

const METHODS = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'] as const;
const METHOD_TONE: Record<string, string> = {
  GET: 'text-method-get', POST: 'text-method-post', PUT: 'text-method-put',
  PATCH: 'text-method-patch', DELETE: 'text-method-delete',
};

const seedHeaders = (): KVRow[] => [
  { id: 'h-content-type', key: 'Content-Type', value: 'application/json', enabled: true },
  { id: 'h-accept',       key: 'Accept',       value: 'application/json', enabled: true },
  emptyRow(),
];

export const RunnerTab = ({
  mock, endpoints,
}: { mock: MockServer; endpoints: MockEndpoint[] }) => {
  const [params, setParams] = useSearchParams();
  const epId = params.get('ep') || endpoints[0]?.id || '';
  const ep   = endpoints.find((e) => e.id === epId);

  const initialUrl = useMemo(() => {
    /* Use the mock service base URL (configured via VITE_MOCK_SVC_URL),
     * NOT window.location.origin — the frontend origin (port 5173) does
     * not serve mock endpoints; the request would 404. Fall back to
     * localhost:8085 only for local dev without env override. */
    const base = (import.meta.env.VITE_MOCK_SVC_URL || 'http://localhost:8085').replace(/\/+$/, '');
    if (!ep) return `${base}/api/v1/mocks/${mock.slug}/`;
    return `${base}/api/v1/mocks/${mock.slug}${ep.pathPattern.replace(/\{[^}]+\}/g, 'x')}`;
  }, [mock.slug, ep?.pathPattern]); // eslint-disable-line react-hooks/exhaustive-deps

  const [url, setUrl]       = useState(initialUrl);
  const [method, setMethod] = useState<string>(ep?.method && ep.method !== '*' ? ep.method : 'GET');
  const [reqTab, setReqTab] = useState<ReqTab>('params');
  const [respTab, setRespTab] = useState<RespTab>('body');
  const [queryRows, setQueryRows] = useState<KVRow[]>([emptyRow()]);
  const [headerRows, setHeaderRows] = useState<KVRow[]>(seedHeaders());
  const [showHeadersDesc, setShowHeadersDesc] = useState(false);
  const [showParamsDesc, setShowParamsDesc] = useState(false);
  const [body, setBody] = useState('');
  const [bodyLang, setBodyLang] = useState<'json' | 'text' | 'xml' | 'html'>('json');
  const [authMode, setAuthMode] = useState<'none' | 'bearer' | 'basic' | 'apikey'>('none');
  const [bearer, setBearer] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [apikeyName, setApikeyName] = useState('X-API-Key');
  const [apikeyVal, setApikeyVal] = useState('');

  const [busy, setBusy]   = useState(false);
  const [resp, setResp]   = useState<{
    status: number; ms: number; size: number;
    headers: Record<string, string>; body: string; err?: string;
  } | null>(null);

  // Whenever the user switches endpoint via the dropdown, reset URL/method.
  useEffect(() => {
    if (!ep) return;
    setUrl(initialUrl);
    setMethod(ep.method === '*' ? 'GET' : ep.method);
    setBody('');
    setHeaderRows(seedHeaders());
    setQueryRows([emptyRow()]);
    setResp(null);
  }, [ep?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildFinalUrl = () => {
    const enabled = queryRows.filter((q) => q.enabled && q.key.trim());
    if (enabled.length === 0) return url;
    try {
      const u = new URL(url);
      enabled.forEach((q) => u.searchParams.set(q.key.trim(), q.value));
      return u.toString();
    } catch {
      return url;
    }
  };

  const composedHeaders = (): Array<{ key: string; value: string }> => {
    const out = headerRows
      .filter((h) => h.enabled && h.key.trim())
      .map((h) => ({ key: h.key.trim(), value: h.value }));
    if (authMode === 'bearer' && bearer) out.push({ key: 'Authorization', value: `Bearer ${bearer}` });
    if (authMode === 'basic' && (basicUser || basicPass)) {
      const enc = btoa(`${basicUser}:${basicPass}`);
      out.push({ key: 'Authorization', value: `Basic ${enc}` });
    }
    if (authMode === 'apikey' && apikeyName && apikeyVal) out.push({ key: apikeyName, value: apikeyVal });
    return out;
  };

  const send = async () => {
    setResp(null); setBusy(true);
    const t0 = performance.now();
    try {
      const finalUrl = buildFinalUrl();
      const r = await adhocExecute({
        method: method as any,
        url: { raw: finalUrl },
        headers: composedHeaders(),
        body: body && (['POST','PUT','PATCH'].includes(method))
          ? { mode: 'raw', raw: body, language: bodyLang }
          : undefined,
      } as any);
      const respBody = (r as any).response?.body ?? '';
      setResp({
        status: (r as any).response?.statusCode ?? 0,
        ms:     (r as any).totalMs ?? Math.round(performance.now() - t0),
        size:   new TextEncoder().encode(respBody).length,
        headers: ((r as any).response?.headers ?? []).reduce((acc: any, h: any) => { acc[h.key] = h.value; return acc; }, {}),
        body:   respBody,
      });
    } catch (e: any) {
      setResp({ status: 0, ms: Math.round(performance.now() - t0), size: 0, headers: {}, body: '', err: e?.message ?? 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  if (endpoints.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center" data-testid="runner-empty">
        <AlertTriangle className="mb-3 h-10 w-10 text-text-muted" />
        <div className="text-sm font-semibold">No endpoints to run</div>
        <div className="mt-1 max-w-md text-xs text-text-muted">
          Add an endpoint in the <strong>Endpoints</strong> tab first, then come back here to test it.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mock-runner-tab">
      {/* Endpoint picker row */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Endpoint</span>
        <div className="relative">
          <select
            data-testid="runner-endpoint-picker"
            value={ep?.id ?? ''}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set('ep', e.target.value);
              setParams(next, { replace: true });
            }}
            className="h-7 max-w-[480px] appearance-none rounded-md border border-border bg-probestack-bg px-2 pr-7 font-mono text-[11px] text-text-primary outline-none hover:border-primary/40 focus:border-primary"
          >
            {endpoints.map((x) => (
              <option key={x.id} value={x.id}>
                {x.method} {x.pathPattern}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
        </div>
        {ep && (
          <span className="ml-auto text-[10px] text-text-muted" data-testid="runner-endpoint-status">
            Status: <span className={cn('font-mono', ep.enabled ? 'text-success' : 'text-warning')}>
              {ep.enabled ? 'enabled' : 'disabled'}
            </span>
          </span>
        )}
      </div>

      {/* WIDE URL bar — method + URL takes the whole width; copy/open/send pinned to right */}
      <div className="flex items-stretch gap-2 border-b border-border bg-surface px-4 py-2">
        <div className="flex h-9 min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-border bg-probestack-bg">
          <select
            data-testid="runner-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={cn(
              'h-full w-24 appearance-none border-r border-border bg-transparent pl-3 pr-7 font-mono text-xs font-bold outline-none',
              METHOD_TONE[method] ?? 'text-text-primary',
            )}
          >
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            data-testid="runner-url"
            className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-xs text-text-primary outline-none"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <Tooltip content="Copy URL"><button
          data-testid="runner-copy-url"
          onClick={async () => { await navigator.clipboard.writeText(buildFinalUrl()); toast.success('URL copied'); }}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-secondary hover:border-primary/40 hover:text-primary"
        ><Copy className="h-3.5 w-3.5" /></button></Tooltip>
        <Tooltip content="Open in browser"><button
          data-testid="runner-open-tab"
          onClick={() => window.open(buildFinalUrl(), '_blank')}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-secondary hover:border-primary/40 hover:text-primary"
        ><ExternalLink className="h-3.5 w-3.5" /></button></Tooltip>
        <Button variant="primary" data-testid="runner-send" disabled={busy} onClick={send} className="h-9 px-4">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send
        </Button>
      </div>

      {/* Request tabs */}
      <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-surface/40 px-3" data-testid="runner-req-tabs">
        {(['params','headers','body','auth'] as ReqTab[]).map((t) => (
          <button
            key={t}
            data-testid={`runner-req-tab-${t}`}
            onClick={() => setReqTab(t)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs capitalize transition-colors',
              reqTab === t ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {t}
            {t === 'params'  && queryRows.filter((q) => q.enabled && q.key).length > 0 && <Pill n={queryRows.filter((q) => q.enabled && q.key).length} />}
            {t === 'headers' && headerRows.filter((h) => h.enabled && h.key).length > 0 && <Pill n={headerRows.filter((h) => h.enabled && h.key).length} />}
            {t === 'body' && body && <span className="rounded bg-elevated px-1 font-mono text-[9px] text-text-muted">●</span>}
            {t === 'auth' && authMode !== 'none' && <span className="rounded bg-primary-muted px-1 font-mono text-[9px] text-primary">on</span>}
          </button>
        ))}
      </nav>

      {/* Request body — uses KVTable for params/headers, CodeEditor for body */}
      <div className="min-h-[180px] shrink-0 border-b border-border bg-surface/20 p-3" data-testid="runner-req-body">
        {reqTab === 'params' && (
          <KVTable
            rows={queryRows}
            onChange={setQueryRows}
            showDescription={showParamsDesc}
            onToggleDescription={setShowParamsDesc}
            testIdPrefix="runner-params"
          />
        )}
        {reqTab === 'headers' && (
          <KVTable
            rows={headerRows}
            onChange={setHeaderRows}
            showDescription={showHeadersDesc}
            onToggleDescription={setShowHeadersDesc}
            testIdPrefix="runner-headers"
          />
        )}
        {reqTab === 'body' && (
          <div className="flex h-44 flex-col" data-testid="runner-body-pane">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Body</span>
              <select
                value={bodyLang}
                onChange={(e) => setBodyLang(e.target.value as any)}
                data-testid="runner-body-lang"
                className="h-6 rounded border border-border bg-probestack-bg px-2 text-[11px]"
              >
                {(['json','text','xml','html'] as const).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {!['POST','PUT','PATCH'].includes(method) && (
                <span className="ml-auto text-[10px] italic text-text-muted">(read-only for {method} requests)</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden rounded-md border border-border">
              <CodeEditor
                value={body}
                onChange={setBody}
                language={bodyLang}
                readOnly={!['POST','PUT','PATCH'].includes(method)}
                testId="runner-body-editor"
              />
            </div>
          </div>
        )}
        {reqTab === 'auth' && (
          <div className="space-y-2" data-testid="runner-auth-pane">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Type</span>
              <select
                value={authMode}
                onChange={(e) => setAuthMode(e.target.value as any)}
                data-testid="runner-auth-mode"
                className="h-7 rounded border border-border bg-probestack-bg px-2 text-[11px]"
              >
                <option value="none">No auth</option>
                <option value="bearer">Bearer token</option>
                <option value="basic">Basic auth</option>
                <option value="apikey">API key (header)</option>
              </select>
            </div>
            {authMode === 'bearer' && (
              <input
                value={bearer}
                onChange={(e) => setBearer(e.target.value)}
                placeholder="Token"
                data-testid="runner-auth-bearer"
                className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]"
              />
            )}
            {authMode === 'basic' && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={basicUser} onChange={(e) => setBasicUser(e.target.value)} placeholder="Username" data-testid="runner-auth-basic-user"
                       className="h-8 rounded border border-border bg-probestack-bg px-2 text-[11px]" />
                <input value={basicPass} onChange={(e) => setBasicPass(e.target.value)} placeholder="Password" type="password" data-testid="runner-auth-basic-pass"
                       className="h-8 rounded border border-border bg-probestack-bg px-2 text-[11px]" />
              </div>
            )}
            {authMode === 'apikey' && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={apikeyName} onChange={(e) => setApikeyName(e.target.value)} placeholder="Header name (e.g. X-API-Key)" data-testid="runner-auth-key-name"
                       className="h-8 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]" />
                <input value={apikeyVal} onChange={(e) => setApikeyVal(e.target.value)} placeholder="Value" data-testid="runner-auth-key-val"
                       className="h-8 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response */}
      <div className="flex min-h-0 flex-1 flex-col" data-testid="runner-resp-section">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Response</span>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            {resp && !resp.err && (
              <>
                <StatusBadge status={resp.status} />
                <span className="font-mono text-[10px] text-text-muted">{resp.ms.toFixed(0)} ms</span>
                <span className="font-mono text-[10px] text-text-muted">{fmtBytes(resp.size)}</span>
              </>
            )}
            {resp?.err && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-danger">
                <AlertTriangle className="h-3 w-3" /> {resp.err}
              </span>
            )}
          </div>
        </div>
        <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-surface/40 px-3">
          {(['body','headers','cookies','tests'] as RespTab[]).map((t) => (
            <button
              key={t}
              data-testid={`runner-resp-tab-${t}`}
              onClick={() => setRespTab(t)}
              className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs capitalize transition-colors',
                respTab === t ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {t}
              {t === 'headers' && resp && <Pill n={Object.keys(resp.headers).length} />}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden bg-probestack-bg/40" data-testid="runner-resp-body">
          {busy && (
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {!busy && !resp && (
            <div className="flex h-full items-center justify-center text-[11px] text-text-muted">
              Click <strong className="mx-1 text-text-primary">Send</strong> to hit the mock URL and see the response here.
            </div>
          )}
          {!busy && resp && respTab === 'body' && (
            <CodeEditor
              value={tryFormat(resp.body)}
              onChange={() => {}}
              language={detectLang(resp.headers, resp.body)}
              readOnly
              testId="runner-resp-body-editor"
            />
          )}
          {!busy && resp && respTab === 'headers' && (
            <table className="w-full font-mono text-[11px]">
              <thead className="text-[10px] uppercase text-text-muted">
                <tr><th className="w-1/3 px-3 py-1.5 text-left">Key</th><th className="px-3 py-1.5 text-left">Value</th></tr>
              </thead>
              <tbody>
                {Object.entries(resp.headers).map(([k, v]) => (
                  <tr key={k} className="border-t border-border/40">
                    <td className="px-3 py-1 pr-2 text-text-muted">{k}</td>
                    <td className="break-all px-3 py-1 text-text-primary">{v}</td>
                  </tr>
                ))}
                {Object.keys(resp.headers).length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-text-muted">No headers returned.</td></tr>
                )}
              </tbody>
            </table>
          )}
          {!busy && resp && respTab === 'cookies' && (
            <div className="p-4 text-[11px] text-text-muted" data-testid="runner-resp-cookies">No cookies — mocks don't set Set-Cookie by default.</div>
          )}
          {!busy && resp && respTab === 'tests' && (
            <div className="p-4 text-[11px] text-text-muted" data-testid="runner-resp-tests">
              Test scripts run after each response (Postman-style). Wire-up lands in the Test-Spec phase.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Pill = ({ n }: { n: number }) => (
  <span className="rounded bg-elevated px-1 font-mono text-[9px] text-text-muted">{n}</span>
);

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const tryFormat = (s: string) => {
  if (!s) return '';
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
};

const detectLang = (headers: Record<string, string>, body: string): 'json' | 'text' | 'xml' | 'html' => {
  const ct = (headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
  if (ct.includes('json')) return 'json';
  if (ct.includes('xml')) return 'xml';
  if (ct.includes('html')) return 'html';
  if (body && body.trim().startsWith('{')) return 'json';
  if (body && body.trim().startsWith('<')) return 'xml';
  return 'text';
};
