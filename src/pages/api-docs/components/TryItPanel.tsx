/**
 * TryItPanel — Stripe / Mintlify-style request runner. Reads structured
 * requests off the doc (populated when the doc is generated from a
 * collection) and lets the reader send each one against the live backend
 * via `adhocExecute`. Renders cURL copy + status + latency + body preview.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send, PlayCircle, ChevronRight, Loader2, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { adhocExecute } from '@/services/request.service';
import { listEnvironments } from '@/services/environment.service';
import { cn } from '@/utils/cn';
import { Field, cls } from './_shared';

const METHOD_TONE: Record<string, string> = {
  GET:    'border-success/30 bg-success/10 text-success',
  POST:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
  PUT:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
  PATCH:  'border-blue-500/30 bg-blue-500/10 text-blue-400',
  DELETE: 'border-danger/30 bg-danger/10 text-danger',
};

export const TryItPanel = ({ requests, workspaceId }: {
  requests: Array<Record<string, unknown>>; workspaceId: string;
}) => {
  const envQ = useQuery({
    queryKey: ['environment', 'list', workspaceId],
    queryFn: () => listEnvironments(workspaceId),
  });
  const [envId, setEnvId] = useState<string>('');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  if (requests.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center" data-testid="api-doc-tryit-empty">
        <PlayCircle className="mb-3 h-10 w-10 text-text-muted" />
        <p className="text-sm font-semibold">No structured requests yet</p>
        <p className="mt-1 max-w-sm text-xs text-text-muted">
          Try-It needs a doc generated from a collection (AUTO / HYBRID format).
          For MANUAL docs, link a collection or hit <strong>Regenerate</strong> after switching format.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4" data-testid="api-doc-tryit-panel">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-probestack-bg/40 px-3 py-2 text-xs">
        <span className="font-semibold text-text-secondary">Environment:</span>
        <select value={envId} onChange={(e) => setEnvId(e.target.value)} data-testid="api-doc-tryit-env"
          className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-xs">
          <option value="">— none —</option>
          {(envQ.data ?? []).map((e: any) => (
            <option key={e.id ?? e.environmentId} value={e.id ?? e.environmentId}>{e.name}</option>
          ))}
        </select>
        <span className="ml-auto text-[10px] text-text-muted">{requests.length} endpoints</span>
      </div>
      {requests.map((req, i) => (
        <TryItRequest
          key={i}
          req={req}
          index={i}
          isOpen={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          workspaceId={workspaceId}
          environmentId={envId}
        />
      ))}
    </div>
  );
};

const TryItRequest = ({ req, index, isOpen, onToggle, workspaceId, environmentId }: {
  req: Record<string, unknown>; index: number; isOpen: boolean; onToggle: () => void;
  workspaceId: string; environmentId: string;
}) => {
  const name   = String(req.name ?? `Request ${index + 1}`);
  const method = String(req.method ?? 'GET').toUpperCase();
  const url0   = typeof req.url === 'string' ? req.url : String((req.url as any)?.raw ?? '');
  const headers0 = (req.headers ?? []) as Array<{ key: string; value: string; enabled?: boolean }>;
  const body0  = typeof req.body === 'string' ? req.body : (req.body ? JSON.stringify(req.body, null, 2) : '');

  const [url, setUrl] = useState(url0);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    headers0.filter((h) => h.enabled !== false).map((h) => ({ key: h.key ?? '', value: h.value ?? '' })),
  );
  const [body, setBody] = useState(body0);
  const [response, setResponse] = useState<{ status?: number; latencyMs?: number; body?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const onSend = async () => {
    setBusy(true); setResponse(null);
    try {
      const t0 = performance.now();
      const result: any = await adhocExecute({
        method, url: { raw: url } as any,
        headers: headers.filter((h) => h.key.trim()).map((h) => ({ key: h.key, value: h.value, enabled: true })) as any,
        body: body.trim()
          ? { mode: 'raw', raw: body, contentType: 'application/json' } as any
          : undefined,
        workspaceId,
        environmentId: environmentId || undefined,
      });
      const ms = Math.round(performance.now() - t0);
      setResponse({
        status: result?.response?.statusCode ?? result?.statusCode,
        latencyMs: result?.response?.latencyMs ?? result?.latencyMs ?? ms,
        body: typeof result?.response?.body === 'string'
          ? result.response.body
          : JSON.stringify(result?.response?.body ?? result, null, 2),
      });
    } catch (e: any) {
      setResponse({ error: e?.message ?? 'Request failed' });
    } finally { setBusy(false); }
  };

  const onCopyCurl = () => {
    const hs = headers.filter((h) => h.key.trim()).map((h) => `-H '${h.key}: ${h.value}'`).join(' ');
    const bd = body.trim() ? `-d '${body.replace(/'/g, "'\\''")}'` : '';
    const curl = `curl -X ${method} ${hs} ${bd} '${url}'`.replace(/\s+/g, ' ').trim();
    navigator.clipboard.writeText(curl);
  };

  return (
    <article data-testid={`api-doc-tryit-req-${index}`}
      className="overflow-hidden rounded-xl border border-border bg-surface/40">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-hover/40">
        <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider', METHOD_TONE[method] ?? 'border-border bg-elevated text-text-muted')}>
          {method}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium" data-testid={`api-doc-tryit-name-${index}`}>{name}</span>
        <ChevronRight className={cn('h-3.5 w-3.5 text-text-muted transition-transform', isOpen && 'rotate-90')} />
      </button>
      {isOpen && (
        <div className="space-y-3 border-t border-border bg-probestack-bg/40 p-3">
          <Field label="URL">
            <input data-testid={`api-doc-tryit-url-${index}`} value={url} onChange={(e) => setUrl(e.target.value)} className={`${cls()} font-mono`} />
          </Field>
          {headers.length > 0 && (
            <Field label="Headers">
              <div className="space-y-1" data-testid={`api-doc-tryit-headers-${index}`}>
                {headers.map((h, hi) => (
                  <div key={hi} className="flex gap-1">
                    <input value={h.key}   onChange={(e) => setHeaders(headers.map((x, k) => k === hi ? { ...x, key: e.target.value } : x))} placeholder="Header" className={`${cls()} flex-1 font-mono`} />
                    <input value={h.value} onChange={(e) => setHeaders(headers.map((x, k) => k === hi ? { ...x, value: e.target.value } : x))} placeholder="Value"  className={`${cls()} flex-1 font-mono`} />
                  </div>
                ))}
              </div>
            </Field>
          )}
          {(method !== 'GET' && method !== 'DELETE') && (
            <Field label="Body">
              <textarea data-testid={`api-doc-tryit-body-${index}`} rows={6} value={body} onChange={(e) => setBody(e.target.value)}
                className="block w-full resize-y rounded-md border border-border bg-probestack-bg px-3 py-2 font-mono text-[11px] leading-relaxed shadow-inner" />
            </Field>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={onSend} disabled={busy || !url.trim()} data-testid={`api-doc-tryit-send-${index}`}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
            </Button>
            <Button size="sm" variant="outline" onClick={onCopyCurl} data-testid={`api-doc-tryit-curl-${index}`}>
              <Copy className="h-3.5 w-3.5" /> Copy as cURL
            </Button>
          </div>
          {response && (
            <div className="rounded-lg border border-border bg-probestack-bg/60" data-testid={`api-doc-tryit-response-${index}`}>
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs">
                {response.error ? (
                  <span className="font-semibold text-danger">Error</span>
                ) : (
                  <>
                    <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[10px]',
                      (response.status ?? 0) < 400 ? 'border-success/30 bg-success/10 text-success' :
                      'border-danger/30 bg-danger/10 text-danger')}>
                      {response.status ?? '—'}
                    </span>
                    <span className="text-text-muted">{response.latencyMs}ms</span>
                  </>
                )}
              </div>
              <pre className="max-h-64 overflow-auto p-3 font-mono text-[10px] leading-relaxed text-text-secondary">
                {response.error ?? response.body ?? '— empty —'}
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
