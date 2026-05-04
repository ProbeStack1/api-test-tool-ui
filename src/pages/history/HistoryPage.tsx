/**
 * History — full-page detail view.
 *
 * The LEFT list lives in `components/common/sidebar/HistoryPanel.tsx`
 * (already swapped in by `ContextSidebar` whenever `primaryTab === 'history'`),
 * so this page renders ONLY the detail pane. Selection is driven by
 * `useRunHistoryStore.selectedId`.
 *
 * UX target (per user spec):
 *   ┌────────────────────────────────────────────────────────┐
 *   │  Selected run                                          │
 *   │  ┌─ Postman-style request preview ──────────────────┐  │
 *   │  │  POST  https://… ───────────────── [Try][Edit]  │  │
 *   │  │  Headers · Params · Body (read-only)            │  │
 *   │  └─────────────────────────────────────────────────┘  │
 *   │  ┌─ Response from that execution ──────────────────┐  │
 *   │  │  200 · 124 ms · 4.2 KB                           │  │
 *   │  │  body / headers / timings                        │  │
 *   │  └──────────────────────────────────────────────────┘ │
 *   └────────────────────────────────────────────────────────┘
 *
 * "Try" re-executes the saved snapshot via /execute-adhoc, surfaces a
 * fresh response, AND pushes the new run into history so the user can
 * compare. The original entry stays read-only & immutable (this matches
 * Postman's history behaviour).
 *
 * "Edit & Try" loads the snapshot into the active request-builder tab so
 * the user can tweak values, then Send normally.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Trash2, Sparkles, History as HistoryIcon, Edit3, RotateCcw, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRunHistoryStore, type HistoryEntry } from '@/stores/runHistory.store';
import { useRequestDraftStore } from '@/stores/requestDraft.store';
import { adhocExecute } from '@/services/adhoc.service';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { ResponsePanel as InlineResponsePanel } from '@/components/request-builder/parts/ResponsePanel';
import { cn } from '@/utils/cn';

export const HistoryPage = () => {
  const entries    = useRunHistoryStore((s) => s.entries);
  const selectedId = useRunHistoryStore((s) => s.selectedId);
  const hasHydrated = useRunHistoryStore((s) => s.hasHydrated);
  const remove     = useRunHistoryStore((s) => s.remove);
  const select     = useRunHistoryStore((s) => s.select);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  return (
    <div data-testid="history-page" className="flex h-full min-h-0">
      <section className="min-w-0 flex-1 overflow-hidden">
        {!hasHydrated
          ? <HydratingSkeleton />
          : selected
          ? <DetailPane entry={selected} onDelete={() => { remove(selected.id); select(null); }} />
          : <SelectPrompt hasAny={entries.length > 0} />}
      </section>
    </div>
  );
};

/** Shown briefly on first paint while zustand is still reading IndexedDB. */
const HydratingSkeleton = () => (
  <div data-testid="history-hydrating" className="flex h-full items-center justify-center text-text-muted">
    <span className="text-sm">Loading history…</span>
  </div>
);

/* ─────────────────────────── detail pane ──────────────────────────── */
const DetailPane = ({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) => {
  const nav = useNavigate();

  // Track a fresh "Try" response so the right pane can show the latest
  // re-execution side-by-side with the historical one. We deliberately do
  // NOT mutate the original entry — historical immutability is the whole
  // point of having a history.
  const [tryResult, setTryResult] = useState<typeof entry.result | null>(null);
  const [tryAt, setTryAt] = useState<string | null>(null);

  const tryMut = useMutation({
    mutationFn: async () => {
      const snap = entry.snapshot;
      const payload: any = {
        method: snap.method,
        url: { raw: snap.url },
        headers: (snap.headers ?? []).filter((h) => h.enabled !== false && h.key)
          .map((h) => ({ key: h.key, value: h.value, enabled: true })),
        body: snap.body,
        auth: snap.auth,
        preRequestScript: snap.preScript,
        testScript: snap.testScript,
      };
      return adhocExecute(payload);
    },
    onSuccess: (r) => {
      setTryResult(r as any);
      setTryAt(new Date().toISOString());
      // Capture the re-run in history so it has its own audit trail.
      useRunHistoryStore.getState().push('request', entry.snapshot, r as any);
      toast.success('Replayed — fresh response below.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Replay failed.'),
  });

  const editAndTry = () => {
    // Stash the snapshot into a one-shot handoff slot so the builder
    // picks it up on mount and applies it to its own state. Using the
    // normal `setSnapshot` path doesn't work — the builder's own
    // debounced per-keystroke writer runs on first render and clobbers
    // our handoff with an empty tab, which the user experienced as
    // "try flashes for a moment, then I land on an empty builder".
    const snap = entry.snapshot;
    const flatBody = (snap.body as any) ?? {};
    useRequestDraftStore.getState().stashHandoff({
      source: 'request-builder',
      id: null,
      name: snap.name,
      method: snap.method,
      url: snap.url,
      queryParams: (snap.params ?? []).map((p) => ({ name: p.key, value: p.value, enabled: p.enabled })),
      headers:     (snap.headers ?? []).map((h) => ({ name: h.key, value: h.value, enabled: h.enabled })),
      bodyKind: (flatBody.mode === 'raw' ? (flatBody.language === 'text' ? 'text' : 'json')
              : flatBody.mode === 'urlencoded' ? 'form-urlencoded'
              : flatBody.mode === 'formdata' ? 'multipart'
              : 'none'),
      bodyText: flatBody.raw,
      bodyForm: (flatBody.fields ?? []).map((f: any) => ({ name: f.key, value: f.value, enabled: f.enabled })),
    });
    nav('/projects/collections');
  };

  const status = entry.result?.response?.statusCode ?? entry.result?.network?.statusCode ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="history-detail">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-border bg-surface/40 px-5 py-3">
        <MethodTag method={entry.snapshot.method} large />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-tight" data-testid="history-detail-title">
            {entry.snapshot.name || entry.snapshot.url}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
            <StatusDot code={status} />
            <span className="font-mono">{status || '—'}</span>
            <span>·</span>
            <span className="font-mono">{entry.result?.totalMs ?? 0}ms</span>
            <span>·</span>
            <span title={new Date(entry.at).toString()}>{formatRelative(entry.at)}</span>
            <span className="rounded-sm border border-warning/30 bg-warning/10 px-1.5 text-[9px] font-semibold uppercase text-warning">
              Read-only
            </span>
          </div>
        </div>
        <Button
          size="sm" variant="ghost" data-testid="history-copy-url"
          onClick={() => { navigator.clipboard.writeText(entry.snapshot.url); toast.success('URL copied'); }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} data-testid="history-delete-entry" title="Remove">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm" variant="outline" onClick={editAndTry} data-testid="history-edit-and-try"
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit &amp; Try
        </Button>
        <Button
          size="sm" variant="primary" data-testid="history-try"
          onClick={() => tryMut.mutate()}
          disabled={tryMut.isPending}
        >
          {tryMut.isPending
            ? <RotateCcw className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          Try
        </Button>
      </header>

      {/* Body — request preview top, response bottom */}
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden">
        <RequestPreview entry={entry} />
        <ResponseSection
          original={entry.result}
          replay={tryResult}
          replayAt={tryAt}
          tabId={`history-${entry.id}`}
        />
      </div>
    </div>
  );
};

/* ─────────────────────── request preview block ────────────────────── */
const RequestPreview = ({ entry }: { entry: HistoryEntry }) => {
  const [tab, setTab] = useState<'headers' | 'params' | 'body' | 'auth'>('body');
  const headers = entry.snapshot.headers ?? [];
  const params  = entry.snapshot.params ?? [];
  const bodyRaw = (entry.snapshot.body as any)?.raw ?? '';
  const bodyLang = (entry.snapshot.body as any)?.language ?? 'json';

  return (
    <section className="border-b border-border bg-elevated/20" data-testid="history-request-preview">
      <div className="flex items-center gap-1 border-b border-border px-4">
        {(['body', 'headers', 'params', 'auth'] as const).map((t) => (
          <button
            key={t}
            data-testid={`history-tab-${t}`}
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 py-2 text-[11px] font-medium transition-colors',
              tab === t ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {t === 'body' ? 'Body'
              : t === 'headers' ? `Headers · ${headers.length}`
              : t === 'params' ? `Params · ${params.length}`
              : 'Auth'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-text-muted">URL: <code className="rounded bg-elevated px-1 font-mono">{entry.snapshot.url}</code></span>
      </div>
      <div className="max-h-[260px] min-h-[120px] overflow-auto p-4">
        {tab === 'body' && (
          bodyRaw ? (
            <div className="h-[220px] overflow-hidden rounded-md border border-border">
              <MonacoEditor value={bodyRaw} onChange={() => {}} language={bodyLang} readOnly testId="history-body-preview" />
            </div>
          ) : <Empty>This request had no body.</Empty>
        )}
        {tab === 'headers' && <KvPreview rows={headers} testId="history-headers-preview" />}
        {tab === 'params'  && <KvPreview rows={params}  testId="history-params-preview" />}
        {tab === 'auth' && (
          <pre className="whitespace-pre-wrap rounded-md bg-elevated/40 p-3 font-mono text-[11px] text-text-secondary" data-testid="history-auth-preview">
            {JSON.stringify(entry.snapshot.auth ?? {}, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
};

const KvPreview = ({ rows, testId }: { rows: Array<{ key: string; value: string; enabled?: boolean }>; testId: string }) => {
  if (!rows.length) return <Empty>None.</Empty>;
  return (
    <table className="w-full text-xs" data-testid={testId}>
      <thead className="text-[10px] uppercase tracking-wider text-text-muted">
        <tr><th className="px-2 py-1 text-left">Key</th><th className="px-2 py-1 text-left">Value</th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={cn('border-t border-border/40', r.enabled === false && 'opacity-40')}>
            <td className="px-2 py-1.5 font-mono">{r.key}</td>
            <td className="px-2 py-1.5 font-mono break-all">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/* ─────────────────────── response section ─────────────────────────── */
const ResponseSection = ({
  original, replay, replayAt, tabId,
}: { original: HistoryEntry['result']; replay: HistoryEntry['result'] | null; replayAt: string | null; tabId: string }) => {
  const [which, setWhich] = useState<'original' | 'replay'>('original');
  const showing = which === 'replay' && replay ? replay : original;
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="history-response-section">
      <header className="flex items-center gap-2 border-b border-border bg-elevated/20 px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Response</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWhich('original')}
            data-testid="history-resp-original"
            className={cn('rounded px-2 py-0.5 text-[10px]', which === 'original' ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-hover')}
          >
            Original
          </button>
          {replay && (
            <button
              onClick={() => setWhich('replay')}
              data-testid="history-resp-replay"
              className={cn('rounded px-2 py-0.5 text-[10px]', which === 'replay' ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-hover')}
            >
              Replay {replayAt && `· ${formatRelative(replayAt)}`}
            </button>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        {showing
          ? <InlineResponsePanel
              height={9999}
              onClose={() => {}}
              result={showing as any}
              sending={false}
              tabId={tabId}
            />
          : <Empty>No response captured for this run.</Empty>}
      </div>
    </div>
  );
};

/* ─────────────────────── tiny presentationals ─────────────────────── */
const SelectPrompt = ({ hasAny }: { hasAny: boolean }) => (
  <div className="flex h-full items-center justify-center p-12 text-center" data-testid="history-select-prompt">
    <div className="max-w-sm">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <HistoryIcon className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold">
        {hasAny ? 'Pick a run from the left' : 'No history yet'}
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        {hasAny
          ? <>Each entry is a snapshot of the request you sent and the exact response that came back.
              Hit <strong>Try</strong> to replay it, <strong>Edit &amp; Try</strong> to tweak first.</>
          : <>Send a request from the builder — every run will appear in the History panel on the left.</>}
      </p>
    </div>
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full min-h-[120px] items-center justify-center text-xs italic text-text-muted">{children}</div>
);

const MethodTag = ({ method, large }: { method: string; large?: boolean }) => {
  const colours: Record<string, string> = {
    GET: 'text-success', POST: 'text-blue-400', PUT: 'text-warning', PATCH: 'text-pink-400',
    DELETE: 'text-danger', HEAD: 'text-cyan-400', OPTIONS: 'text-purple-400',
  };
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center justify-center rounded font-mono font-bold tracking-wider',
      colours[method?.toUpperCase()] ?? 'text-text-muted',
      large ? 'h-7 min-w-[3.25rem] px-2 text-[11px]' : 'h-5 min-w-[2.5rem] px-1.5 text-[10px]',
      'bg-elevated/60',
    )}>
      {method?.toUpperCase() ?? '—'}
    </span>
  );
};

const StatusDot = ({ code }: { code: number }) => {
  const tone = !code ? 'bg-text-muted' : code < 300 ? 'bg-success' : code < 400 ? 'bg-info' : code < 500 ? 'bg-warning' : 'bg-danger';
  return <span className={cn('h-1.5 w-1.5 rounded-full', tone)} />;
};

/* ─── helpers ─── */
function formatRelative(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)   return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
