/**
 * WebhookReplayDrawer — "Test webhook with custom payload" panel.
 *
 * Two firing modes:
 *   1. **Fire directly from browser** (works today, browser → URL) — POSTs
 *      the edited JSON straight to the webhook's target URL via `fetch`.
 *      No HMAC signing happens (secret is not in the browser), so Slack /
 *      Discord won't accept this, but webhook.site and any endpoint that
 *      doesn't require signing will. Great for rapid contract testing.
 *
 *   2. **Fire via ForgeQ (signed)** — disabled today with a tooltip that
 *      explains the backend doesn't yet expose a "test with custom
 *      payload" endpoint. The request to add
 *      `POST /webhooks/{id}/test` on the Java side has been filed. Once
 *      shipped, this button lights up and routes through the signing
 *      pipeline with the subscriber's secret.
 *
 * The editor is a <textarea> with monospaced font and JSON-validating
 * live feedback. Users can pick one of the curated sample payloads from a
 * dropdown to scaffold their own.
 */
import { useMemo, useState } from 'react';
import {
  X, Send, Loader2, CheckCircle2, AlertTriangle, Copy, FileCode2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { samplePayloads, samplePayloadFor } from './samplePayloads';
import type { WebhookView } from '@/services/iwh.service';
import { cn } from '@/utils/cn';

interface DirectFireResult {
  ok: boolean;
  status?: number;
  statusText?: string;
  durationMs: number;
  error?: string;
  responseBody?: string;
}

export const WebhookReplayDrawer = ({ hook, onClose }: { hook: WebhookView; onClose: () => void }) => {
  const eventTypes = useMemo(() => Object.keys(samplePayloads), []);
  const [eventType, setEventType] = useState<string>(eventTypes[0] ?? 'monitor.down');
  const [body, setBody] = useState<string>(() => samplePayloadFor(eventType));
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<DirectFireResult | null>(null);

  const pickSample = (t: string) => {
    setEventType(t);
    setBody(samplePayloadFor(t));
    setLastResult(null);
  };

  const jsonStatus = useMemo(() => {
    try { JSON.parse(body); return { ok: true, msg: '' }; }
    catch (e: any) { return { ok: false, msg: e?.message ?? 'Invalid JSON' }; }
  }, [body]);

  const fireDirect = async () => {
    if (!jsonStatus.ok) { toast.error('Fix JSON before firing'); return; }
    setRunning(true);
    const t0 = performance.now();
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ForgeQ-Source': 'browser-playground',
          'X-ForgeQ-Event-Type': eventType,
        },
        body,
        mode: 'cors',
      });
      const text = await res.text().catch(() => '');
      setLastResult({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        durationMs: Math.round(performance.now() - t0),
        responseBody: text.slice(0, 600),
      });
      if (res.ok) toast.success(`HTTP ${res.status} · ${Math.round(performance.now() - t0)}ms`);
      else toast.error(`HTTP ${res.status} · ${res.statusText}`);
    } catch (e: any) {
      setLastResult({
        ok: false,
        durationMs: Math.round(performance.now() - t0),
        error: e?.message ?? 'Network / CORS error',
      });
      toast.error(e?.message ?? 'Fire failed (likely CORS — Slack etc. block browser posts)');
    } finally {
      setRunning(false);
    }
  };

  const copyBody = () => { navigator.clipboard.writeText(body); toast.success('Payload copied'); };

  return (
    <div data-testid="iwh-replay-drawer" className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface shadow-2xl">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-border bg-surface/80 px-4 py-3">
          <FileCode2 className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold tracking-tight">Test with custom payload</h2>
            <p className="truncate font-mono text-[10px] text-text-muted">{hook.name} · {hook.url}</p>
          </div>
          <button onClick={onClose} data-testid="iwh-replay-close" className="rounded p-1 text-text-muted hover:bg-hover hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Event-type picker */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-probestack-bg/40 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Event type</span>
          <select
            data-testid="iwh-replay-event-type"
            value={eventType}
            onChange={(e) => pickSample(e.target.value)}
            className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-xs"
          >
            {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={() => pickSample(eventType)}
            className="rounded-md border border-border bg-elevated px-2 py-0.5 text-[10px] text-text-secondary hover:border-primary/30 hover:text-primary"
            data-testid="iwh-replay-reset"
          >
            Reset to sample
          </button>
          <span className="ml-auto text-[10px] text-text-muted">Body below is fully editable</span>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto px-4 py-3">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            JSON body
          </label>
          <textarea
            data-testid="iwh-replay-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            className={cn(
              'h-[260px] w-full resize-none rounded-md border bg-probestack-bg p-3 font-mono text-[11px] leading-snug',
              jsonStatus.ok ? 'border-border' : 'border-danger/50',
            )}
          />
          <div className={cn('mt-1 flex items-center gap-1.5 text-[10px]', jsonStatus.ok ? 'text-success' : 'text-danger')}>
            {jsonStatus.ok
              ? <><CheckCircle2 className="h-3 w-3" /> Valid JSON</>
              : <><AlertTriangle className="h-3 w-3" /> {jsonStatus.msg}</>}
            <button onClick={copyBody} className="ml-auto inline-flex items-center gap-1 text-text-muted hover:text-text-primary">
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>

          {/* Last-result panel */}
          {lastResult && (
            <div data-testid="iwh-replay-result" className="mt-4 rounded-md border border-border bg-elevated p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase',
                  lastResult.ok ? 'border-success/30 bg-success/10 text-success'
                                : 'border-danger/30 bg-danger/10 text-danger')}>
                  {lastResult.ok ? 'SUCCESS' : 'FAILED'}
                </span>
                {lastResult.status != null && <span className="font-mono text-[10px] text-text-muted">HTTP {lastResult.status} {lastResult.statusText}</span>}
                <span className="font-mono text-[10px] text-text-muted">{lastResult.durationMs}ms</span>
              </div>
              {lastResult.error && <p className="mt-1 rounded bg-danger/5 p-2 font-mono text-[10px] text-danger">{lastResult.error}</p>}
              {lastResult.responseBody && (
                <pre className="max-h-32 overflow-auto rounded bg-probestack-bg p-2 font-mono text-[9px] text-text-secondary">{lastResult.responseBody}</pre>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <footer className="flex flex-col gap-2 border-t border-border bg-surface/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={fireDirect}
              disabled={running || !jsonStatus.ok}
              className="flex-1"
              data-testid="iwh-replay-fire-direct"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Fire directly from browser
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled
              title="Requires POST /webhooks/{id}/test on the Java backend (tracked). Once shipped, this fires via ForgeQ with HMAC signing."
              data-testid="iwh-replay-fire-signed"
            >
              Fire via ForgeQ (signed) — soon
            </Button>
          </div>
          <p className="text-[10px] text-text-muted">
            ⚡ Browser mode bypasses HMAC signing. Slack/Discord block unsigned browser posts via CORS — but webhook.site,
            Pipedream, Hookbin and any dev endpoint that accepts CORS will happily receive this.
          </p>
        </footer>
      </div>
    </div>
  );
};
