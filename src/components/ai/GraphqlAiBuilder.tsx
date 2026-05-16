/**
 * GraphqlAiBuilder — the right-rail's GraphQL Builder view.
 *
 * Activated by `useGraphqlAiBridge` when the user clicks "AI Build"
 * inside the GraphQL body toolbar. We deliberately keep this UI tiny:
 *
 *   - prompt textarea + Generate button
 *   - list of past suggestions (latest at top)
 *   - each suggestion has Insert / Reject / Retry actions
 *      * Insert  → calls the bridge's `onInsert` closure which drops
 *                  the query into the editor at the cursor.
 *      * Reject  → drops the suggestion locally so it disappears.
 *      * Retry   → re-runs the prompt that produced this suggestion
 *                  (one click; no need to re-type).
 *
 * Bridge state is cleared on unmount so closing the right rail
 * naturally falls back to the regular request-aware chat.
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, Loader2, Check, RotateCw, X, History } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { serviceUrl } from '@/lib/env';
import { createHttp } from '@/lib/http';

const aiHttp = createHttp('aiAssistant');
import { useGraphqlAiBridge } from '@/stores/graphqlAiBridge.store';
import { useRequestDraftStore } from '@/stores/requestDraft.store';

interface Suggestion {
  id: string;
  prompt: string;
  query: string;
  rejected?: boolean;
}

/** Last-5-prompts cache, scoped per request id and persisted to
 *  localStorage so the strip survives panel close + page refresh. */
const HISTORY_LIMIT = 5;
const historyKey = (rid: string | null | undefined) => `gql-ai-history::${rid ?? 'adhoc'}`;
const loadHistory = (rid: string | null | undefined): string[] => {
  try {
    const raw = localStorage.getItem(historyKey(rid));
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string').slice(0, HISTORY_LIMIT) : [];
  } catch { return []; }
};
const saveHistory = (rid: string | null | undefined, list: string[]) => {
  try { localStorage.setItem(historyKey(rid), JSON.stringify(list.slice(0, HISTORY_LIMIT))); } catch { /* quota */ }
};

export const GraphqlAiBuilder = () => {
  const schemaSdl = useGraphqlAiBridge((s) => s.schemaSdl);
  const onInsert  = useGraphqlAiBridge((s) => s.onInsert);
  const clear     = useGraphqlAiBridge((s) => s.clear);
  const requestId = useRequestDraftStore((s) => s.current.id);

  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<string[]>(() => loadHistory(requestId));

  // Re-hydrate when the active request changes.
  useEffect(() => { setHistory(loadHistory(requestId)); }, [requestId]);

  const pushHistory = (p: string) => {
    setHistory((prev) => {
      const next = [p, ...prev.filter((x) => x !== p)].slice(0, HISTORY_LIMIT);
      saveHistory(requestId, next);
      return next;
    });
  };
  const removeHistory = (p: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== p);
      saveHistory(requestId, next);
      return next;
    });
  };

  const generate = async (overridePrompt?: string) => {
    const p = (overridePrompt ?? prompt).trim();
    if (!p) {
      toast.error('Type a prompt first');
      return;
    }
    setBusy(true);
    try {
      const { data } = await aiHttp.post(
        `${serviceUrl('aiAssistant')}/api/v1/ai/graphql/build`,
        { prompt: p, schemaSdl },
      );
      const q: string = data?.data?.query ?? data?.query ?? '';
      if (!q) {
        toast.error('AI returned no query — be more specific.');
        return;
      }
      setItems((xs) => [{ id: crypto.randomUUID(), prompt: p, query: q }, ...xs]);
      pushHistory(p);
      if (!overridePrompt) setPrompt('');
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? e?.message ?? 'AI request failed');
    } finally {
      setBusy(false);
    }
  };

  const accept = (item: Suggestion) => {
    if (!onInsert) {
      toast.error('No editor is connected.');
      return;
    }
    onInsert(item.query);
    // Mark as accepted by removing from list so the user can keep iterating.
    setItems((xs) => xs.filter((x) => x.id !== item.id));
  };

  const reject = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));

  return (
    <div className="flex h-full flex-col" data-testid="gql-ai-builder">
      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-secondary">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> GraphQL Builder
          <button
            type="button"
            onClick={() => clear()}
            data-testid="gql-ai-back-to-chat"
            className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-normal text-text-muted hover:bg-hover hover:text-text-primary"
            title="Back to request-aware chat"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <textarea
          data-testid="gql-ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. list every country with its capital and continent name"
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-elevated p-2 text-xs font-mono focus:border-primary focus:outline-none"
        />
        <Button
          size="sm"
          variant="primary"
          data-testid="gql-ai-generate"
          onClick={() => generate()}
          disabled={busy || !prompt.trim()}
          className="mt-2 w-full gap-1.5"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate
        </Button>
        {!schemaSdl && (
          <p className="mt-1.5 text-[10px] text-amber-400">
            Tip: click Introspect in the body toolbar first — schema context dramatically improves suggestions.
          </p>
        )}
        {history.length > 0 && (
          <div className="mt-2" data-testid="gql-ai-history">
            <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
              <History className="h-3 w-3" /> Recent prompts
            </div>
            <div className="flex flex-wrap gap-1">
              {history.map((h) => (
                <span
                  key={h}
                  data-testid="gql-ai-history-chip"
                  className="group inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary"
                >
                  <button
                    type="button"
                    onClick={() => setPrompt(h)}
                    title="Refill the prompt"
                    className="max-w-[160px] truncate text-left"
                  >
                    {h}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHistory(h)}
                    title="Remove from history"
                    className="rounded-full text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3" data-testid="gql-ai-results">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-[11px] text-text-muted">
            No suggestions yet. Describe the operation you want and hit Generate.
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              data-testid={`gql-ai-card-${it.id}`}
              className="mb-3 rounded-md border border-border bg-surface"
            >
              <div className="flex items-center gap-1 border-b border-border bg-elevated px-2 py-1 text-[10px] text-text-muted">
                <span className="truncate">prompt: <span className="text-text-primary">{it.prompt}</span></span>
              </div>
              <pre
                data-testid={`gql-ai-result-pre-${it.id}`}
                className="max-h-72 overflow-auto whitespace-pre-wrap p-2 text-[11px] font-mono text-text-primary"
              >{it.query}</pre>
              <div className="flex items-center gap-1 border-t border-border bg-elevated/40 px-2 py-1">
                <Button
                  size="sm"
                  variant="primary"
                  data-testid={`gql-ai-accept-${it.id}`}
                  onClick={() => accept(it)}
                  className="gap-1"
                >
                  <Check className="h-3 w-3" /> Insert
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`gql-ai-retry-${it.id}`}
                  onClick={() => generate(it.prompt)}
                  disabled={busy}
                  className="gap-1"
                >
                  <RotateCw className="h-3 w-3" /> Retry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`gql-ai-reject-${it.id}`}
                  onClick={() => reject(it.id)}
                  className="ml-auto gap-1 text-text-muted hover:text-red-400"
                >
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
