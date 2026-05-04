/**
 * ResponsePanel — ForgeQ response viewer (NOT a Postman clone).
 *
 *   Outer tabs (TOP, the panel's main sections):
 *     Response · Logs · Validation Results · Collection Run · Debug Info
 *
 *   The "Response" tab has its own sub-toolbar:
 *     [ Body ] [ Headers ]   [JSON ▾]                     ⟲ ⌗ 🔍 ⧉
 *
 *   Right-side meta chips (always visible) and their hover popovers:
 *     [200 OK]  ·  1.56 s  ·  1.04 KB  ·  🌐   |  Save Response  ⋯
 *      ↳ status — meaning popover
 *      ↳ time   — waterfall (Prepare → Send → Wait → Receive …) with each
 *                 phase starting where the previous one ends (staircase).
 *      ↳ size   — Response/Request size breakdown
 *      ↳ globe  — Network info (HTTP version, addresses, TLS)
 *
 *   The body uses our CodeEditor (CodeMirror) in read-only mode; the
 *   format dropdown swaps the highlight language. Search shows an inline
 *   bar inside the response panel that scrolls to and highlights matches
 *   in the body using the browser's window.find as a baseline.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Circle, Clock, Copy, Download, Globe, MoreHorizontal, Repeat, Search, Wand2, WrapText, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import { Select } from '@/components/ui/Select';
import { type CodeLanguage } from '@/components/editor/CodeEditor';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { LiveExecutionView, LiveStepperStrip } from './LiveExecutionView';
import { useStreamStore } from '@/stores/stream.store';
import { saveResponse, replayRun } from '@/services/request.service';
import { useRunsStore } from '@/stores/runs.store';
import { useQueryClient } from '@tanstack/react-query';
import type { ExecutionResult } from '@/services/request.service';

const useStreamStoreSel = (tabId?: string) =>
  useStreamStore((s) => (tabId ? !!s.byTab[tabId] && s.byTab[tabId].phases.length > 0 : false));

const STATUS_CLASS_NAMES: { range: [number, number]; bg: string; fg: string }[] = [
  { range: [200, 299], bg: 'bg-success-muted',   fg: 'text-success'  },
  { range: [300, 399], bg: 'bg-info/10',         fg: 'text-info'     },
  { range: [400, 499], bg: 'bg-warning/10',      fg: 'text-warning'  },
  { range: [500, 599], bg: 'bg-red-500/10',      fg: 'text-red-500'  },
];

const STATUS_MEANING: Record<number, string> = {
  200: 'Request successful. The server has responded as required.',
  201: 'Created. The request has been fulfilled and a new resource was created.',
  204: 'No content. The server processed the request successfully.',
  301: 'Moved permanently. The resource has been assigned a new URI.',
  302: 'Found. The resource resides temporarily at a different URI.',
  304: 'Not modified. The cached version is up to date.',
  400: 'Bad request. The server cannot process the request due to client error.',
  401: 'Unauthorized. Authentication is required to access this resource.',
  403: 'Forbidden. The server understood the request but refuses to authorise it.',
  404: 'Not found. The requested resource could not be located.',
  405: 'Method not allowed. The request method is not supported for the resource.',
  500: 'Internal server error. The server encountered an unexpected condition.',
  502: 'Bad gateway. The server received an invalid response from upstream.',
  503: 'Service unavailable. The server is currently unable to handle the request.',
};

const OUTER_TABS = ['Response', 'Logs', 'Validation Results', 'Collection Run', 'Debug Info'] as const;
type OuterTab = (typeof OUTER_TABS)[number];

const FORMATS = ['json', 'text', 'html', 'xml'] as const;
type Fmt = (typeof FORMATS)[number];

export const ResponsePanel = ({
  height, onClose, result, sending, tabId, requestId,
}: {
  height: number;
  onClose: () => void;
  result: ExecutionResult | null;
  sending: boolean;
  tabId?: string;
  requestId?: string;
}) => {
  const [outer, setOuter]   = useState<OuterTab>('Response');
  const [sub, setSub]       = useState<'body' | 'headers'>('body');
  const [fmt, setFmt]       = useState<Fmt>('json');
  const [wrap, setWrap]     = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const bodyContainer = useRef<HTMLDivElement | null>(null);

  /* Auto-switch to Debug Info tab the first time a streaming run pushes
   * phase events into the store for this tab. */
  const liveActive = useStreamStoreSel(tabId);
  useEffect(() => { if (liveActive) setOuter('Debug Info'); }, [liveActive]);

  /* Capture each completed run into the per-tab in-memory log so the
   * Logs tab can list & expand them. */
  useEffect(() => {
    if (result) pushRunHistory(tabId, result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.runId]);

  const qc = useQueryClient();

  const statusCode = result?.response?.statusCode ?? 0;
  const statusText = result?.response?.statusText || (statusCode ? defaultText(statusCode) : '—');
  const totalMs    = result?.totalMs ?? 0;
  const sizeBytes  = result?.response?.sizeBytes ?? 0;
  const headers    = result?.response?.headers || [];
  const body       = result?.response?.body ?? '';
  const headersTxt = headers.map((h) => `${h.key}: ${h.value}`).join('\n');

  const prettyBody = useMemo(() => {
    if (!body) return '';
    if (fmt === 'json') {
      try { return JSON.stringify(JSON.parse(body), null, 2); } catch { /* fall-through */ }
    }
    return body;
  }, [body, fmt]);

  const lang: CodeLanguage = fmt === 'json' ? 'json' : fmt === 'html' ? 'html' : fmt === 'xml' ? 'xml' : 'text';

  const onCopy = () => {
    const txt = sub === 'headers' ? headersTxt : prettyBody;
    navigator.clipboard.writeText(txt);
    toast.success('Copied');
  };
  const onSaveResponseClick = async () => {
    if (!result || !requestId) return;
    try {
      await saveResponse(requestId, {
        method: result.method,
        url: result.finalUrl,
        statusCode: result.response.statusCode,
        statusText: result.response.statusText || '',
        sentHeaders: result.sentHeaders || [],
        sentBody: result.sentBody || '',
        response: result.response,
        totalMs: result.totalMs,
      });
      toast.success('Response saved — visible in the sidebar under this request');
      qc.invalidateQueries({ queryKey: ['saved-responses', requestId] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to save response');
    }
  };
  const onFormat = () => {
    if (fmt === 'json') toast.success('Formatted'); else toast.info('Format only available for JSON');
  };
  const runSearch = (dir: 1 | -1) => {
    if (!searchQ) return;
    /* Use the browser's incremental find — works against the visible CM
     * content. CM6 also exposes its own search panel via Ctrl+F when
     * focused, but this is a simple cross-browser fallback. */
    try { (window as any).find?.(searchQ, false, dir < 0, true); } catch { /* noop */ }
  };

  return (
    <div
      data-testid="response-panel"
      style={{ height }}
      className="relative flex shrink-0 flex-col border-t border-border bg-probestack-bg motion-safe:animate-response-slide-in"
    >
      {/* TOP BAR — outer tabs (left) · meta chips (right) */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3">
        <div className="flex items-center" data-testid="response-outer-tabs">
          {OUTER_TABS.map((t) => {
            const tid = t.toLowerCase().replace(/\s+/g, '-');
            return (
              <button
                key={t}
                onClick={() => setOuter(t)}
                data-testid={`response-tab-${tid}`}
                className={cn(
                  'relative h-9 px-3 text-[11.5px] font-semibold transition-colors',
                  outer === t ? 'text-primary' : 'text-text-primary/80 hover:text-text-primary',
                )}
              >
                {t}
                {outer === t && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <StatusChip code={statusCode} text={statusText} />
          <Sep />
          <TimeChip ms={totalMs} phases={result?.phases} />
          <Sep />
          <SizeChip
            resBytes={sizeBytes}
            headers={headers}
            reqHeaderCount={result?.sentHeaders?.length ?? 0}
            reqBodyLen={result?.sentBody?.length ?? 0}
          />
          <Sep />
          <NetworkChip result={result} />
          <span className="ml-1 h-4 w-px bg-border" />
          <Tooltip content={!result ? 'No response yet' : !requestId ? 'Save the request first to pin its response' : 'Save response — appears under this request in the sidebar'}>
            <button
              data-testid="response-save"
              disabled={!result || !requestId}
              onClick={onSaveResponseClick}
              className={cn(
                'flex h-6 items-center gap-1.5 rounded px-1.5 text-[11px]',
                (result && requestId) ? 'text-text-secondary hover:bg-hover hover:text-text-primary' : 'cursor-not-allowed text-text-muted opacity-60',
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Save Response
            </button>
          </Tooltip>
          <button
            data-testid="response-collapse"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:bg-hover hover:text-text-primary"
            title="Collapse"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SUB-TOOLBAR — visible only for the Response tab */}
      {outer === 'Response' && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/50 px-3 py-1.5">
          <div className="flex items-center gap-1">
            <SubTab id="body"    active={sub === 'body'}    onClick={() => setSub('body')}>Body</SubTab>
            <SubTab id="headers" active={sub === 'headers'} onClick={() => setSub('headers')}>Headers</SubTab>
            {sub === 'body' && (
              <Select
                value={fmt}
                onChange={(v) => setFmt(v as Fmt)}
                options={FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))}
                testId="response-format"
                className="ml-2 h-6"
              />
            )}
          </div>
          {sub === 'body' && (
            <div className="flex items-center gap-1">
              <ToolbarBtn label={wrap ? 'Disable wrap' : 'Enable wrap'} active={wrap} onClick={() => setWrap((w) => !w)} icon={<WrapText className="h-3.5 w-3.5" />} testId="response-wrap" />
              <ToolbarBtn label="Format JSON" onClick={onFormat} icon={<Wand2 className="h-3.5 w-3.5" />} testId="response-fmt" />
              <ToolbarBtn label="Search" active={searchOpen} onClick={() => setSearchOpen((o) => !o)} icon={<Search className="h-3.5 w-3.5" />} testId="response-find" />
              <ToolbarBtn label="Copy" onClick={onCopy} icon={<Copy className="h-3.5 w-3.5" />} testId="response-copy" />
            </div>
          )}
        </div>
      )}

      {/* Live execution stepper — only visible on Response and Debug Info tabs while/after streaming. */}
      {tabId && (outer === 'Response' || outer === 'Debug Info') && <LiveStepperStrip tabId={tabId} />}

      {/* BODY area — every child either:
       *   (a) is wrapped in `absolute inset-0 overflow-auto` so the
       *       response content scrolls *inside* this panel, OR
       *   (b) renders its own internal scroller (e.g. Monaco).
       * This way the request-builder workspace above never gains a
       * scrollbar from response data — only the panel itself does. */}
      <div className="relative min-h-0 flex-1 overflow-hidden" ref={bodyContainer}>
        {outer === 'Response' && sub === 'body'    && <BodyView sending={sending} result={result} prettyBody={prettyBody} lang={lang} wrap={wrap} />}
        {outer === 'Response' && sub === 'headers' && (
          <div className="absolute inset-0 overflow-auto"><HeadersView headers={headers} /></div>
        )}
        {outer === 'Logs'              && (
          <div className="absolute inset-0 overflow-auto"><LogsView result={result} sending={sending} tabId={tabId} /></div>
        )}
        {outer === 'Validation Results' && (
          <div className="absolute inset-0 overflow-auto"><ValidationView result={result} /></div>
        )}
        {outer === 'Collection Run' && (
          <div className="absolute inset-0 overflow-auto p-3 text-xs italic text-text-muted" data-testid="response-collection-run">
            Run from Collection Runner to see per-request results.
          </div>
        )}
        {outer === 'Debug Info' && (
          <div className="absolute inset-0 overflow-auto"><LiveExecutionView tabId={tabId || 'default'} result={result} /></div>
        )}

        {searchOpen && outer === 'Response' && sub === 'body' && (
          <div data-testid="response-search-bar" className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-1 shadow-xl">
            <Search className="h-3 w-3 text-text-muted" />
            <input
              data-testid="response-search-input"
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch(e.shiftKey ? -1 : 1);
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="Find in response…"
              className="h-6 w-56 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-muted"
            />
            <button onClick={() => runSearch(-1)} className="h-5 w-5 rounded text-text-muted hover:bg-hover hover:text-text-primary" title="Previous">↑</button>
            <button onClick={() => runSearch(1)}  className="h-5 w-5 rounded text-text-muted hover:bg-hover hover:text-text-primary" title="Next">↓</button>
            <button onClick={() => setSearchOpen(false)} className="h-5 w-5 rounded text-text-muted hover:bg-hover hover:text-text-primary" title="Close"><X className="h-3 w-3" /></button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ───── sub-tab + body ───── */
const SubTab = ({ id, active, onClick, children }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    data-testid={`response-sub-${id}`}
    onClick={onClick}
    className={cn(
      'rounded-md px-2.5 py-1 text-[11px] transition-colors',
      active ? 'bg-primary-muted text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
    )}
  >
    {children}
  </button>
);

const BodyView = ({
  sending, result, prettyBody, lang, wrap,
}: { sending: boolean; result: ExecutionResult | null; prettyBody: string; lang: CodeLanguage; wrap: boolean }) => {
  if (sending) return <Empty>Sending…</Empty>;
  if (!result) return <Empty>Press Send to run the request.</Empty>;

  /* Failure surfaces — when the run did not complete with a real HTTP
   * response (DNS miss, TLS error, thrown Reactor exception, backend
   * substitution crash …). Showing an empty editor here is misleading —
   * render a red failure card with the backend's `error.message` AND
   * the phase that failed, so the user never has to dig through logs. */
  const statusCode = result.response?.statusCode ?? 0;
  const failedPhase = Array.isArray(result.phases)
    ? result.phases.find((p) => p.status === 'failed')
    : undefined;
  const execFailed =
    result.status === 'FAILED' ||
    !!result.error ||
    (statusCode === 0 && !result.response?.body);
  if (execFailed) {
    const msg =
      result.error?.message ||
      failedPhase?.error ||
      result.response?.statusText ||
      'Request failed before a response was received.';
    const kind = result.error?.kind || failedPhase?.name || 'Execution error';
    return (
      <div
        data-testid="response-failure"
        className="absolute inset-0 overflow-auto p-4"
      >
        <div className="mx-auto max-w-2xl rounded-xl border border-danger/40 bg-danger/5 p-4 motion-safe:animate-response-slide-in">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-danger/15 text-danger">
              <X className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-danger">
                Request failed
              </div>
              <div className="truncate text-[11px] text-text-muted">{kind}</div>
            </div>
          </div>
          <pre
            data-testid="response-failure-message"
            className="whitespace-pre-wrap break-words rounded-md border border-border bg-surface/60 p-3 font-mono text-[11px] leading-relaxed text-text-primary"
          >
            {msg}
          </pre>
          {failedPhase && (
            <p className="mt-2 text-[11px] text-text-muted">
              Failed at phase <strong className="text-text-primary">{failedPhase.name}</strong>
              {typeof failedPhase.durationMs === 'number' ? ` · ${failedPhase.durationMs}ms` : ''}
              {` · see the `}
              <strong className="text-text-primary">Debug Info</strong>
              {` tab for the full pipeline.`}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!prettyBody) return <Empty>Empty response</Empty>;
  /* Absolute-positioned wrapper guarantees CM has a definite parent
   * height — that way `height: 100%` in CM produces a properly bounded
   * scroller and the body never bleeds out into the request workspace. */
  return (
    <div data-testid="response-body" className="absolute inset-0">
      <MonacoEditor value={prettyBody} onChange={() => {}} language={lang} readOnly testId="response-codemirror" />
    </div>
  );
};

const HeadersView = ({ headers }: { headers: { key: string; value: string }[] }) => (
  <div className="overflow-auto p-3 text-[11px]" data-testid="response-headers">
    {headers.length === 0 ? (
      <div className="italic text-text-muted">No headers.</div>
    ) : (
      <table className="w-full font-mono">
        <tbody>
          {headers.map((h, i) => (
            <tr key={i} className="border-b border-border/40">
              <td className="py-1 pr-4 text-text-secondary">{h.key}</td>
              <td className="py-1 text-text-primary break-all">{h.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

/* Logs tab — expandable history cards. Each row represents one
 * execution from the *current session* (we store them locally per tab,
 * up to 20). Clicking a row reveals the full request + response
 * payloads with a collapse animation. The "Replay" button on each row
 * fires `POST /runs/{runId}/replay` server-side so the request is
 * re-executed with the EXACT environment + variables that were resolved
 * at the original send time.
 */
const LogsView = ({ result, sending, tabId }: { result: ExecutionResult | null; sending: boolean; tabId?: string }) => {
  const history = useRunHistory(tabId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replaying, setReplaying] = useState<string | null>(null);
  if (sending && history.length === 0) return <Empty>Streaming…</Empty>;
  if (!history.length) return <Empty>No runs yet. Send a request to populate the log.</Empty>;
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const onReplay = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplaying(runId);
    try {
      const fresh = await replayRun(runId);
      pushRunHistory(tabId, fresh);
      useRunsStore.getState().setResult(tabId || 'default', fresh);
      toast.success(`Replayed · ${fresh.response?.statusCode ?? '—'} · ${fresh.totalMs ?? 0} ms`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Replay failed');
    } finally {
      setReplaying(null);
    }
  };
  return (
    <div className="space-y-2 p-3" data-testid="response-logs">
      {history.map((run) => {
        const isOpen = expanded.has(run.runId);
        const code = run.response?.statusCode ?? 0;
        const cls = code < 300 ? 'bg-success-muted text-success' : code < 400 ? 'bg-info/10 text-info' : code < 500 ? 'bg-warning/10 text-warning' : 'bg-red-500/10 text-red-500';
        return (
          <div key={run.runId} className="overflow-hidden rounded-md border border-border bg-surface/50">
            <button onClick={() => toggle(run.runId)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-hover" data-testid={`log-row-${run.runId}`}>
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
              <span className={cn('shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold', cls)}>{code} {run.method}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">{run.finalUrl}</span>
              <span className="shrink-0 font-mono text-[10px] text-text-muted">{run.totalMs} ms · {fmtBytes(run.response?.sizeBytes ?? 0)}</span>
              <span className="shrink-0 text-[10px] text-text-muted">{relTime(run.runAt)}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => onReplay(run.runId, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onReplay(run.runId, e as any);
                }}
                aria-label="Replay this run with the exact original environment"
                className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                data-testid={`log-replay-${run.runId}`}
                aria-disabled={replaying === run.runId}
              >
                <Repeat className={cn('h-3 w-3', replaying === run.runId && 'animate-spin')} />
                {replaying === run.runId ? 'Replay…' : 'Replay'}
              </span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-2 gap-3 border-t border-border bg-probestack-bg p-3 text-[11px]">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Request Headers</div>
                  <pre className="max-h-40 overflow-auto rounded border border-border bg-surface p-2 font-mono text-text-primary">
{(run.sentHeaders || []).map((h) => `${h.key}: ${h.value}`).join('\n') || '—'}
                  </pre>
                  <div className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Request Body</div>
                  <pre className="max-h-40 overflow-auto rounded border border-border bg-surface p-2 font-mono text-text-primary">{run.sentBody || '—'}</pre>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Response Headers</div>
                  <pre className="max-h-40 overflow-auto rounded border border-border bg-surface p-2 font-mono text-text-primary">
{(run.response?.headers || []).map((h) => `${h.key}: ${h.value}`).join('\n') || '—'}
                  </pre>
                  <div className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Response Body</div>
                  <pre className="max-h-40 overflow-auto rounded border border-border bg-surface p-2 font-mono text-text-primary">{(run.response?.body || '—').slice(0, 4000)}</pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* In-memory per-tab run history. The 'result' prop changing is our cue
 * to push a new entry. Capped at 20 entries to keep memory bounded. */
const RUN_HISTORY: Record<string, ExecutionResult[]> = {};
const useRunHistory = (tabId?: string) => {
  const [, force] = useState(0);
  const id = tabId || 'default';
  useEffect(() => { force((x) => x + 1); }, []);
  return RUN_HISTORY[id] || [];
};
const pushRunHistory = (tabId: string | undefined, run: ExecutionResult | null) => {
  if (!run) return;
  const id = tabId || 'default';
  RUN_HISTORY[id] = [run, ...(RUN_HISTORY[id] || [])].slice(0, 20);
};

/* Validation Results — auto-assertions with Pass / Warn / Fail badges.
 * This is our differentiator: Postman makes you write `pm.test()`
 * scripts; we run a baseline set of checks for free, every time. */
const VALIDATIONS = [
  { id: 'status-2xx',    label: 'Status code is 2xx',                test: (r: ExecutionResult) => r.response.statusCode >= 200 && r.response.statusCode < 300 },
  { id: 'status-not-5xx', label: 'No server error (status < 500)',     test: (r: ExecutionResult) => r.response.statusCode < 500 },
  { id: 'has-body',       label: 'Response body is not empty',         test: (r: ExecutionResult) => !!r.response.body,                soft: true },
  { id: 'json-valid',     label: 'Response is valid JSON',             test: (r: ExecutionResult) => { try { JSON.parse(r.response.body); return true; } catch { return false; } }, soft: true },
  { id: 'time-fast',      label: 'Response time < 500 ms',             test: (r: ExecutionResult) => (r.totalMs ?? 0) < 500,           soft: true },
  { id: 'cors-headers',   label: 'CORS headers present',               test: (r: ExecutionResult) => (r.response.headers ?? []).some((h) => (h?.key || '').toLowerCase().startsWith('access-control-')), soft: true },
  { id: 'tls-ok',         label: 'TLS 1.2 or higher',                  test: (r: ExecutionResult) => !!(r.network as any).tlsProtocol && /TLSv1\.[23]/.test((r.network as any).tlsProtocol), soft: true, only: 'https' as const },
];

const ValidationView = ({ result }: { result: ExecutionResult | null }) => {
  if (!result) return <Empty>Send a request to evaluate built-in assertions.</Empty>;
  const isHttps = result.finalUrl?.startsWith('https://');
  const rows = VALIDATIONS.filter((v) => !v.only || (v.only === 'https' && isHttps));
  let pass = 0, fail = 0, warn = 0;
  const evaluated = rows.map((v) => {
    const ok = v.test(result);
    if (ok) pass++; else if (v.soft) warn++; else fail++;
    return { ...v, ok };
  });
  return (
    <div className="space-y-3 p-4" data-testid="response-validation">
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface/50 px-3 py-2 text-xs">
        <span className="rounded bg-success-muted px-2 py-0.5 font-bold text-success">PASS {pass}</span>
        {warn > 0 && <span className="rounded bg-warning/10 px-2 py-0.5 font-bold text-warning">WARN {warn}</span>}
        {fail > 0 && <span className="rounded bg-red-500/10 px-2 py-0.5 font-bold text-red-500">FAIL {fail}</span>}
        <span className="ml-auto text-text-muted">Built-in assertions — no scripting required.</span>
      </div>
      <ul className="space-y-1">
        {evaluated.map((row) => {
          const cls = row.ok ? 'text-success' : row.soft ? 'text-warning' : 'text-red-500';
          const icon = row.ok ? <Check className="h-3.5 w-3.5" /> : row.soft ? <Circle className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />;
          return (
            <li key={row.id} className={cn('flex items-center gap-2 rounded-md px-3 py-1.5 text-xs', row.ok ? 'bg-success-muted/40' : row.soft ? 'bg-warning/10' : 'bg-red-500/10')}>
              <span className={cls}>{icon}</span>
              <span className="text-text-primary">{row.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/* DebugView replaced by LiveExecutionView (interactive pipeline). */

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="p-3 text-xs italic text-text-muted">{children}</div>
);
const Sep = () => <span className="text-text-muted">·</span>;

const ToolbarBtn = ({ label, icon, onClick, active, testId }: { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean; testId?: string }) => (
  <Tooltip content={label}>
    <button
      data-testid={testId}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded',
        active ? 'bg-primary-muted text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
      )}
    >
      {icon}
    </button>
  </Tooltip>
);

/* ───── meta chips ───── */
const StatusChip = ({ code, text }: { code: number; text: string }) => {
  if (!code) return <span className="rounded-md bg-hover px-2 py-0.5 font-mono text-[11px] text-text-muted" data-testid="response-status">—</span>;
  const cls = STATUS_CLASS_NAMES.find((c) => code >= c.range[0] && code <= c.range[1]) ?? STATUS_CLASS_NAMES[3];
  return (
    <Tooltip
      content={
        <div className="w-72 p-3" data-testid="status-tooltip">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold">
            <span className={cn('flex h-5 w-5 items-center justify-center rounded', cls.bg, cls.fg)}>
              <Check className="h-3 w-3" />
            </span>
            <span className={cls.fg}>{code} {text}</span>
          </div>
          <p className="text-[11px] text-text-secondary">{STATUS_MEANING[code] || 'See server documentation for details.'}</p>
        </div>
      }
      side="bottom"
    >
      <span data-testid="response-status" className={cn('inline-flex cursor-help items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold', cls.bg, cls.fg)}>
        {code} {text}
      </span>
    </Tooltip>
  );
};

const TimeChip = ({ ms, phases }: { ms: number; phases?: { name: string; durationMs: number; startedAtMs?: number }[] }) => (
  <Tooltip content={<TimeWaterfall total={ms} phases={phases} />} side="bottom">
    <span data-testid="response-time" className="inline-flex cursor-help items-center font-mono text-[11px] text-text-secondary hover:text-text-primary">
      {fmtTime(ms)}
    </span>
  </Tooltip>
);

const SizeChip = ({ resBytes, headers, reqHeaderCount, reqBodyLen }: { resBytes: number; headers: { key: string; value: string }[]; reqHeaderCount: number; reqBodyLen: number }) => {
  const headerBytes = headers.reduce((acc, h) => acc + h.key.length + h.value.length + 4, 0);
  const bodyBytes = Math.max(0, resBytes - headerBytes);
  const reqHeaderBytes = reqHeaderCount * 60;
  return (
    <Tooltip
      content={
        <div className="w-64 p-3 text-[11px]" data-testid="size-tooltip">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-info">
              <Download className="h-3 w-3" />
              Response Size
            </span>
            <span className="font-mono font-bold text-text-primary">{fmtBytes(resBytes)}</span>
          </div>
          <div className="ml-4 flex justify-between text-text-secondary"><span>Headers</span><span className="font-mono">{fmtBytes(headerBytes)}</span></div>
          <div className="ml-4 flex justify-between text-text-secondary"><span>Body</span><span className="font-mono">{fmtBytes(bodyBytes)}</span></div>
          <div className="my-2 border-t border-border" />
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-warning">
              <Download className="h-3 w-3 rotate-180" />
              Request Size
            </span>
            <span className="font-mono font-bold text-text-primary">{fmtBytes(reqHeaderBytes + reqBodyLen)}</span>
          </div>
          <div className="ml-4 flex justify-between text-text-secondary"><span>Headers</span><span className="font-mono">{fmtBytes(reqHeaderBytes)}</span></div>
          <div className="ml-4 flex justify-between text-text-secondary"><span>Body</span><span className="font-mono">{fmtBytes(reqBodyLen)}</span></div>
        </div>
      }
      side="bottom"
    >
      <span data-testid="response-size" className="inline-flex cursor-help items-center font-mono text-[11px] text-text-secondary hover:text-text-primary">
        {fmtBytes(resBytes)}
      </span>
    </Tooltip>
  );
};

const NetworkChip = ({ result }: { result: ExecutionResult | null }) => {
  const n = result?.network || ({} as any);
  return (
    <Tooltip
      content={
        <div className="w-80 p-3 text-[11px]" data-testid="network-tooltip">
          <div className="mb-2 flex items-center gap-1.5 font-semibold"><Globe className="h-3 w-3" /> Network</div>
          <Row k="HTTP Version" v={n.httpVersion || '—'} />
          <Row k="Local Address" v={n.localAddress || '—'} />
          <Row k="Remote Address" v={n.remoteAddress || '—'} />
          <div className="my-2 border-t border-border" />
          <Row k="TLS Protocol" v={n.tlsProtocol || '—'} />
          <Row k="Cipher Name" v={n.cipherName || '—'} />
          <Row k="Certificate CN" v={n.certCN || '—'} />
          <Row k="Issuer CN" v={n.issuerCN || '—'} />
          <Row k="Valid Until" v={n.validUntil || '—'} />
          {(n.hostnameWarning || n.tlsWarning) && (
            <div className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-warning">
              {n.hostnameWarning || n.tlsWarning}
            </div>
          )}
        </div>
      }
      side="bottom"
    >
      <span data-testid="response-network" className={cn('inline-flex cursor-help items-center text-text-secondary hover:text-text-primary', (n.hostnameWarning || n.tlsWarning) && 'text-warning')}>
        <Globe className="h-3.5 w-3.5" />
      </span>
    </Tooltip>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3 py-0.5 text-text-secondary">
    <span>{k}</span>
    <span className="font-mono text-text-primary break-all">{v}</span>
  </div>
);

/* ───── waterfall ───── */
/* Each phase rendered as a stacked bar: previous phase's end becomes
 * the start offset for the next, like Postman.  When the BFF doesn't
 * supply explicit `startedAtMs`, we compute cumulative offsets locally. */
const PHASE_COLORS: Record<string, string> = {
  prepare:           '#9ca3af',
  socket:            '#facc15',
  socketinit:        '#facc15',
  socketinitialization: '#facc15',
  dns:               '#f59e0b',
  dnslookup:         '#f59e0b',
  tcp:               '#3b82f6',
  tcphandshake:      '#3b82f6',
  ssl:               '#60a5fa',
  sslhandshake:      '#60a5fa',
  send:              '#a78bfa',
  wait:              '#dc2626',
  waiting:           '#dc2626',
  ttfb:              '#dc2626',
  download:          '#22c55e',
  receive:           '#22c55e',
  process:           '#94a3b8',
};

const TimeWaterfall = ({ total, phases }: { total: number; phases?: { name: string; durationMs: number; startedAtMs?: number }[] }) => {
  /* Build a list with cumulative offsets so each phase starts where the
   * previous ended (ignoring upstream startedAtMs which is sometimes 0). */
  const list = (phases && phases.length > 0)
    ? phases
    : [{ name: 'Prepare', durationMs: 0 }, { name: 'Send', durationMs: total }];
  let acc = 0;
  const rows = list.map((p) => {
    const start = acc;
    const dur = typeof p.durationMs === 'number' ? p.durationMs : 0;
    acc += dur;
    // Java's RequestRun.Phase ships `step` (e.g. DNS_LOOKUP); the BFF and
    // the running-stream event use `name`. Accept either so the waterfall
    // never blows up on a missing field.
    return { name: p.name ?? (p as any).step ?? 'Phase', durationMs: dur, start };
  });
  const max = Math.max(1, acc);
  return (
    <div className="w-[360px] p-3" data-testid="time-tooltip">
      <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold"><Clock className="h-3 w-3" /> Response Time</span>
        <span className="text-xs font-bold text-text-primary">{fmtTime(total)}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((p) => {
          const startPct = (p.start / max) * 100;
          const widthPct = Math.max(0.6, (p.durationMs / max) * 100);
          // p.name is normalised to a string above, so toLowerCase() is safe.
          const key = p.name.toLowerCase().replace(/[^a-z]/g, '');
          const colour = PHASE_COLORS[key] ?? '#6b7280';
          return (
            <div key={p.name} className="grid grid-cols-[120px_1fr_70px] items-center gap-2 text-[11px]">
              <span className="truncate text-text-secondary">{p.name}</span>
              <div className="relative h-2 rounded bg-hover/60">
                <span style={{ left: `${startPct}%`, width: `${widthPct}%`, backgroundColor: colour }} className="absolute inset-y-0 rounded shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
              </div>
              <span className="text-right font-mono text-text-primary">{fmtMs(p.durationMs)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ───── helpers ───── */
const fmtBytes = (n: number) => {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};
const fmtTime = (ms: number) => {
  if (!ms) return '— ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};
const fmtMs = (ms: number) => `${ms.toFixed(2)} ms`;
const relTime = (iso?: string) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
};
const defaultText = (code: number) => {
  if (code >= 200 && code < 300) return 'OK';
  if (code >= 300 && code < 400) return 'REDIRECT';
  if (code >= 400 && code < 500) return 'CLIENT';
  if (code >= 500) return 'SERVER';
  return '';
};
