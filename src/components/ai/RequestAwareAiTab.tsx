/**
 * RequestAwareAiTab — right-sidebar "AI" tab.
 *
 *   • Subscribes to `useRequestDraftStore` so it always knows the current
 *     request (method, URL, headers, body, auth meta).
 *   • Lets the user chat about THAT request only — the backend prompt is
 *     scoped and politely refuses unrelated questions.
 *   • Conversation lives in component state (no persistence) so closing
 *     the panel or switching to another request wipes context — exactly
 *     the design the user asked for.
 *   • Renders Markdown answers with `react-markdown` + GFM.
 *   • Suggestion chips returned by the backend auto-send when clicked.
 *   • Quick-ask preset chips for common questions.
 *   • Loading state shows a typing animation; errors are inline + retry-able.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, RefreshCw, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRequestDraftStore } from '@/stores/requestDraft.store';
import { analyze, type AiAnalyzeRequest, type AiChatTurn } from '@/services/ai.service';
import { FancyEmpty } from '@/components/common/FancyEmpty';
import { AppIcon } from '@/components/icons/AppIcons';
import { cn } from '@/utils/cn';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  status: 'pending' | 'done' | 'error';
  error?: string;
}

const QUICK_ASKS: { label: string; prompt: string }[] = [
  { label: 'Why this status?',     prompt: 'Why am I getting this response status? What\'s the most likely cause?' },
  { label: 'Validate request',     prompt: 'Review my request — are headers, params, body, and auth correctly formed?' },
  { label: 'Suggest tests',        prompt: 'Suggest 5 test assertions for this endpoint based on the response.' },
  { label: 'Explain response',     prompt: 'Walk me through the response body — what does each field mean?' },
];

export const RequestAwareAiTab = () => {
  const draft = useRequestDraftStore((s) => s.current);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  /* When the active request changes, drop the conversation — context is
     local to a single request only. */
  const requestKey = useMemo(
    () => `${draft.id ?? 'none'}::${draft.method}::${draft.url}`,
    [draft.id, draft.method, draft.url],
  );
  useEffect(() => { setMessages([]); }, [requestKey]);

  /* Auto-scroll to the bottom on every new chunk. */
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || busy) return;
    const userId = crypto.randomUUID();
    const aiId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: userMessage, status: 'done' },
      { id: aiId, role: 'assistant', content: '', status: 'pending' },
    ]);
    setBusy(true);

    /* Compress history to last 8 turns to keep prompts small. */
    const history: AiChatTurn[] = messages
      .filter((m) => m.status === 'done')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    const payload: AiAnalyzeRequest = {
      request: {
        method: draft.method,
        url: draft.url,
        queryParams: (draft.queryParams ?? []).map((q) => ({ name: q.name, value: q.value })),
        headers:     (draft.headers     ?? []).map((q) => ({ name: q.name, value: q.value })),
        bodyKind: draft.bodyKind,
        bodyText: draft.bodyText,
      },
      history,
      userMessage,
    };

    try {
      const r = await analyze(payload);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: r.answer || '_(empty answer)_', suggestions: r.suggestions, status: 'done' }
            : m,
        ),
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'AI is offline.';
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: '', status: 'error', error: msg } : m)),
      );
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, draft, messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput('');
    void send(t);
  };

  const retryLast = () => {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    if (!last) return;
    setMessages((prev) => prev.filter((m) => m.role === 'user' && m.id !== last.id ? true : m.role === 'user'));
    void send(last.content);
  };

  const clearChat = () => {
    setMessages([]);
    toast.message('Chat cleared');
  };

  const noRequest = !draft.source || !draft.url;

  return (
    <div className="flex h-full flex-col" data-testid="ai-tab-request-aware">
      {/* Context preview pill */}
      <div className="border-b border-border bg-surface/40 px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Request context</span>
          {messages.length > 0 && (
            <button
              data-testid="ai-clear-chat"
              type="button"
              onClick={clearChat}
              title="Clear conversation"
              className="rounded-md border border-border px-1.5 py-0.5 text-[9px] text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="rounded border border-border bg-elevated px-1.5 py-0.5 uppercase text-text-secondary">
            {draft.method || 'GET'}
          </span>
          <span className="min-w-0 flex-1 truncate text-text-primary" title={draft.url}>
            {draft.url || '(no URL)'}
          </span>
        </div>
        {draft.url && (
          <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-text-muted">
            {(draft.headers ?? []).slice(0, 3).map((h) => (
              <span key={h.name} className="rounded bg-elevated px-1.5 py-0.5">{h.name}</span>
            ))}
            {(draft.headers ?? []).length > 3 && <span className="text-text-muted">+{draft.headers.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Chat scroller */}
      <div
        ref={scrollerRef}
        data-testid="ai-chat-scroller"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {noRequest && messages.length === 0 ? (
          <FancyEmpty
            testId="ai-empty"
            icon="zap"
            title="Open a request to chat with the AI"
            body="The assistant only answers questions about the active request — open one from a collection or the request builder to get started."
          />
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              Ask anything about <span className="font-mono text-text-secondary">{draft.method} {truncate(draft.url, 50)}</span>. The assistant only answers questions about this request.
            </p>
            <div className="flex flex-wrap gap-1.5" data-testid="ai-quick-asks">
              {QUICK_ASKS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  data-testid={`ai-quick-${q.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => send(q.prompt)}
                  className="rounded-full border border-border bg-elevated px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Sparkles className="mr-1 inline h-2.5 w-2.5" />{q.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <Message key={m.id} m={m} onSuggest={(p) => send(p)} />
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="flex shrink-0 items-end gap-1.5 border-t border-border bg-surface/40 p-2"
        data-testid="ai-composer"
      >
        <textarea
          data-testid="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder={noRequest ? 'Open a request first…' : 'Ask anything about this request…'}
          rows={2}
          disabled={noRequest}
          className="min-h-0 flex-1 resize-none rounded-md border border-border bg-probestack-bg px-2 py-1.5 text-xs outline-none transition-colors hover:border-primary/40 focus:border-primary disabled:opacity-40"
        />
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            data-testid="ai-send"
            disabled={busy || noRequest || !input.trim()}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md transition-all',
              busy
                ? 'bg-elevated text-text-muted'
                : 'bg-primary text-white hover:bg-primary-hover',
              (!input.trim() || noRequest) && 'opacity-40',
            )}
            title="Send (Enter)"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
          {messages.some((m) => m.status === 'error') && (
            <button
              type="button"
              data-testid="ai-retry"
              onClick={retryLast}
              title="Retry last message"
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-muted hover:border-primary/40 hover:text-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

const Message = ({ m, onSuggest }: { m: ChatMessage; onSuggest: (prompt: string) => void }) => {
  const isUser = m.role === 'user';
  return (
    <div
      data-testid={`ai-msg-${m.role}`}
      className={cn(
        'space-y-1.5',
        isUser ? 'pl-4 text-right' : 'pr-4',
      )}
    >
      <div
        className={cn(
          'inline-block max-w-full rounded-lg px-2.5 py-1.5 text-[12px] leading-relaxed',
          isUser
            ? 'bg-primary-muted/40 text-text-primary'
            : 'bg-elevated text-text-primary',
          m.status === 'error' && 'border border-danger/40 bg-danger/10 text-danger',
        )}
      >
        {m.status === 'pending' ? (
          <span className="inline-flex items-center gap-1 text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="animate-pulse">Thinking…</span>
          </span>
        ) : m.status === 'error' ? (
          <span className="font-mono text-[11px]">{m.error}</span>
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{m.content}</span>
        ) : (
          <div className="space-y-1.5 text-left text-[12px] leading-relaxed [&_code]:rounded [&_code]:bg-probestack-bg [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[10px] [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-probestack-bg [&_pre]:p-2 [&_pre]:text-[10px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-text-primary [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_a]:text-primary [&_a]:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {!isUser && m.suggestions && m.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1" data-testid="ai-suggestions">
          {m.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggest(s)}
              className="rounded-full border border-primary/30 bg-primary-muted/20 px-2 py-0.5 text-[10px] text-primary transition-colors hover:bg-primary-muted/40"
            >
              <AppIcon name="zap" className="mr-1 inline h-2.5 w-2.5" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const truncate = (s: string, n: number) => (s && s.length > n ? s.slice(0, n) + '…' : s);

export default RequestAwareAiTab;
