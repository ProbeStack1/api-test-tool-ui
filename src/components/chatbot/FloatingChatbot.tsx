/**
 * FloatingChatbot — global, always-on assistant pinned to the
 * bottom-right of every authenticated route (excluding home).
 *
 * Two modes:
 *   • Guide  — default. Searches the in-app knowledge base, shows
 *              clickable topic cards (no AI call needed). Free-form
 *              questions are routed through Gemini with the KB digest
 *              embedded as system context.
 *   • Error  — auto-activated when something throws or returns 4xx/5xx.
 *              Loads the error payload, asks "Want me to analyze it?",
 *              and on confirm dispatches an /api/v1/ai/guide call with
 *              mode=error.
 *
 * Layout: 360 × 540 floating panel with smooth scale+fade transitions.
 * Stays open across route changes — but the chatbot store wipes any
 * error context the moment the user clears it OR navigates to a new
 * request (wired in `useClearOnNavigation`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, X, MessageCircle, Search, ArrowLeft, Loader2, RotateCcw, ChevronRight, AlertTriangle, Sparkles, GripVertical } from 'lucide-react';
import { useChatbot, type ChatbotMessage } from '@/stores/chatbot.store';
import { GUIDE_KB, searchTopics, findTopic, buildKbDigest, type GuideTopic } from '@/data/guideKb';
import { askGuide } from '@/services/aiGuide.service';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';

const KB_DIGEST = buildKbDigest();

export const FloatingChatbot = () => {
  const isOpen        = useChatbot((s) => s.isOpen);
  const mode          = useChatbot((s) => s.mode);
  const errorPayload  = useChatbot((s) => s.errorPayload);
  const messages      = useChatbot((s) => s.messages);
  const toggle        = useChatbot((s) => s.toggle);
  const close         = useChatbot((s) => s.close);
  const clearError    = useChatbot((s) => s.clearError);
  const appendMessage = useChatbot((s) => s.appendMessage);
  const patchMessage  = useChatbot((s) => s.patchMessage);
  const resetChat     = useChatbot((s) => s.resetChat);

  const [input, setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView]     = useState<'home' | 'topic'>('home');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /*  Draggable position — pinned bottom/right by default. Persists in    */
  /*  localStorage so the user's chosen corner survives reloads.          */
  /* ------------------------------------------------------------------ */
  const POS_KEY = 'forgeq.chatbot.pos.v1';
  const [pos, setPos] = useState<{ right: number; bottom: number }>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.right === 'number' && typeof p?.bottom === 'number') return p;
      }
    } catch { /* ignore */ }
    return { right: 24, bottom: 24 };
  });
  const dragRef = useRef<{ startX: number; startY: number; right: number; bottom: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    /* Don't start dragging when clicking on a button inside header. */
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, right: pos.right, bottom: pos.bottom };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const next = {
        right: Math.max(8, Math.min(window.innerWidth - 80, dragRef.current.right - dx)),
        bottom: Math.max(8, Math.min(window.innerHeight - 80, dragRef.current.bottom - dy)),
      };
      setPos(next);
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [pos.right, pos.bottom]);

  /* Persist position to localStorage whenever it settles. */
  useEffect(() => {
    try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
  }, [pos]);

  /* Auto-scroll on new messages. */
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages]);

  /* When mode flips to error, jump to the home view so the user sees the
     incoming "Want me to analyze it?" prompt. */
  useEffect(() => { if (mode === 'error') setView('home'); }, [mode]);

  const send = async (userMessage: string) => {
    if (!userMessage.trim() || sending) return;
    const userId = crypto.randomUUID();
    const aiId = crypto.randomUUID();
    appendMessage({ id: userId, role: 'user', content: userMessage });
    appendMessage({ id: aiId, role: 'assistant', content: '', pending: true });
    setSending(true);
    try {
      const history = messages
        .filter((m) => !m.pending && !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));
      const r = await askGuide({
        mode,
        kbDigest: KB_DIGEST,
        errorContext: mode === 'error' ? errorPayload ?? undefined : undefined,
        history,
        userMessage,
      });
      patchMessage(aiId, { content: r.answer || '_(empty answer)_', pending: false });
    } catch (e: any) {
      patchMessage(aiId, { content: '', pending: false, error: e?.message ?? 'AI is offline.' });
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput('');
    void send(t);
  };

  const topic = topicId ? findTopic(topicId) : null;

  return (
    <>
      {/* FAB — collapsed state with concentric "radiation" pulse rings. */}
      <div
        data-testid="chatbot-fab-wrapper"
        onMouseDown={(e) => {
          /* Only start drag if user actually moves; we use a small threshold
             so a click still toggles the chatbot. */
          if (isOpen) return;
          const startX = e.clientX, startY = e.clientY;
          let dragged = false;
          const move = (ev: MouseEvent) => {
            if (!dragged) {
              if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return;
              dragged = true;
              onDragStart(e);
            }
          };
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
        className={cn(
          'fixed z-50 transition-all duration-300',
          isOpen ? 'pointer-events-none scale-90 opacity-0' : 'pointer-events-auto scale-100 opacity-100',
        )}
        style={{ right: pos.right, bottom: pos.bottom }}
      >
        {/* Radiation pulse rings — only when closed AND not in error mode. */}
        {!isOpen && (
          <>
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 rounded-full opacity-70',
                'animate-chatbot-radiate-1',
                mode === 'error' ? 'bg-danger/30' : 'bg-primary/30',
              )}
            />
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 rounded-full opacity-70',
                'animate-chatbot-radiate-2',
                mode === 'error' ? 'bg-danger/30' : 'bg-primary/30',
              )}
            />
          </>
        )}
        <button
          type="button"
          data-testid="chatbot-fab"
          onClick={toggle}
          title={isOpen ? 'Close assistant' : 'Open assistant'}
          className={cn(
            'relative grid h-12 w-12 place-items-center rounded-full shadow-lg transition-all duration-300',
            mode === 'error'
              ? 'bg-danger text-white shadow-danger/40'
              : 'bg-primary text-white shadow-primary/30 hover:scale-110 hover:shadow-primary/50',
          )}
        >
          {mode === 'error' ? <AlertTriangle className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </button>
      </div>

      {/* Drawer */}
      <aside
        data-testid="chatbot-drawer"
        lang="en"
        translate="no"
        className={cn(
          'notranslate',
          'fixed z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl transition-all duration-300',
          'origin-bottom-right',
          isOpen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
        )}
        style={{ right: pos.right, bottom: pos.bottom, height: 'min(540px, calc(100vh - 80px))' }}
      >
        {/* Header — drag handle */}
        <header
          data-testid="chatbot-header"
          onMouseDown={onDragStart}
          className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-br from-primary/10 to-transparent px-3 py-2.5 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex min-w-0 items-center gap-2">
            <GripVertical className="h-3 w-3 shrink-0 text-text-muted" />
            {view === 'topic' && (
              <button
                data-testid="chatbot-back"
                type="button"
                onClick={() => { setTopicId(null); setView('home'); }}
                className="rounded p-1 text-text-muted hover:bg-hover hover:text-text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div className={cn(
              'grid h-7 w-7 place-items-center rounded-md',
              mode === 'error' ? 'bg-danger/15 text-danger' : 'bg-primary-muted/40 text-primary',
            )}>
              {mode === 'error' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-text-primary">
                {mode === 'error' ? 'Error analyzer' : (view === 'topic' && topic) ? topic.title : 'ForgeFuzz guide'}
              </h3>
              <p className="truncate text-[10px] text-text-muted">
                {mode === 'error' ? 'Stays until resolved' : 'Drag to move • Ask anything'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button
                data-testid="chatbot-reset"
                type="button"
                title="Clear conversation"
                onClick={() => { resetChat(); if (mode === 'error') clearError(); }}
                className="rounded p-1 text-text-muted hover:bg-hover hover:text-text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              data-testid="chatbot-close"
              type="button"
              onClick={close}
              className="rounded p-1 text-text-muted hover:bg-hover hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div ref={scrollerRef} data-testid="chatbot-body" className="min-h-0 flex-1 overflow-y-auto">
          {view === 'topic' && topic ? (
            <TopicCard topic={topic} onPick={(id) => setTopicId(id)} />
          ) : messages.length > 0 ? (
            <>
              <ChatTranscript messages={messages} sending={sending} />
              {/* Yes/No consent prompt — only shown in error mode when we
                  haven't started analyzing yet (i.e. just the intro bubble
                  exists and nothing is pending). Clean pair of buttons so
                  the user doesn't have to type "yes". */}
              {mode === 'error'
                && !sending
                && messages.length === 1
                && messages[0].role === 'assistant'
                && !messages[0].pending && (
                <div
                  data-testid="chatbot-consent-prompt"
                  className="flex items-center gap-2 px-3 pb-3"
                >
                  <button
                    type="button"
                    data-testid="chatbot-consent-yes"
                    onClick={() => void send(
                      `Yes, please analyze this error and suggest a fix. ` +
                      (errorPayload?.errorMessage ? `Error message: ${errorPayload.errorMessage}` : '')
                    )}
                    className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Yes, analyze it
                  </button>
                  <button
                    type="button"
                    data-testid="chatbot-consent-no"
                    onClick={() => { clearError(); }}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                  >
                    No, dismiss
                  </button>
                </div>
              )}
            </>
          ) : (
            <GuideHome
              search={search}
              onSearch={setSearch}
              onPick={(t) => { setTopicId(t.id); setView('topic'); }}
            />
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={onSubmit}
          className="flex shrink-0 items-end gap-1.5 border-t border-border bg-surface/40 p-2"
          data-testid="chatbot-composer"
        >
          <textarea
            data-testid="chatbot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(e); }
            }}
            placeholder={mode === 'error' ? 'Ask about this error…' : 'Ask anything about ForgeFuzz…'}
            rows={1}
            className="min-h-[34px] flex-1 resize-none rounded-md border border-border bg-probestack-bg px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-primary"
          />
          <button
            type="submit"
            data-testid="chatbot-send"
            disabled={sending || !input.trim()}
            className={cn(
              'grid h-9 w-9 place-items-center rounded-md transition-all',
              sending ? 'bg-elevated text-text-muted' : 'bg-primary text-white hover:bg-primary-hover',
              !input.trim() && 'opacity-40',
            )}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </form>
      </aside>
    </>
  );
};

/* ==================================================================== */
/*  Guide-mode home — search + categorised topic chips.                   */
/* ==================================================================== */
const GuideHome = ({
  search, onSearch, onPick,
}: {
  search: string;
  onSearch: (v: string) => void;
  onPick: (t: GuideTopic) => void;
}) => {
  const isSearch = search.trim().length > 0;
  const matched = isSearch ? searchTopics(search) : [];
  return (
    <div className="space-y-3 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          data-testid="chatbot-guide-search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search topics — e.g. project, request, mock…"
          className="h-8 w-full rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs outline-none focus:border-primary"
        />
      </div>

      {isSearch ? (
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {matched.length} match{matched.length === 1 ? '' : 'es'}
          </p>
          <ul className="space-y-1">
            {matched.map((t) => (
              <TopicListItem key={t.id} topic={t} onPick={onPick} />
            ))}
            {matched.length === 0 && (
              <li className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[11px] text-text-muted">
                No topics matched. Try typing a free-form question below.
              </li>
            )}
          </ul>
        </section>
      ) : (
        <>
          <p className="text-xs text-text-muted">
            Browse a category, or type a question below.
          </p>
          {GUIDE_KB.map((cat) => (
            <section key={cat.id}>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                <cat.icon className="h-3 w-3" />
                {cat.label}
              </h4>
              <ul className="space-y-1">
                {cat.topics.map((t) => (
                  <TopicListItem key={t.id} topic={t} onPick={onPick} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
};

const TopicListItem = ({ topic, onPick }: { topic: GuideTopic; onPick: (t: GuideTopic) => void }) => (
  <li>
    <button
      data-testid={`chatbot-topic-${topic.id}`}
      type="button"
      onClick={() => onPick(topic)}
      className="group flex w-full items-center gap-2 rounded-md border border-transparent bg-surface px-2.5 py-1.5 text-left text-[11px] transition-all hover:border-primary/30 hover:bg-elevated"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">{topic.title}</span>
        <span className="block truncate text-[10px] text-text-muted">{topic.summary}</span>
      </span>
      <ChevronRight className="h-3 w-3 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  </li>
);

/* ==================================================================== */
/*  Single topic detail card — steps + related guides + "Take me there". */
/* ==================================================================== */
const TopicCard = ({ topic, onPick }: { topic: GuideTopic; onPick: (id: string) => void }) => {
  const navigate = useNavigate();
  const close = useChatbot((s) => s.close);
  const related = (topic.related ?? []).map((id) => findTopic(id)).filter(Boolean) as GuideTopic[];
  return (
    <div className="space-y-3 p-3" data-testid={`chatbot-topic-detail-${topic.id}`}>
      <p className="text-xs leading-relaxed text-text-secondary">{topic.summary}</p>
      <ol className="space-y-1.5 text-xs leading-relaxed text-text-primary">
        {topic.steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary-muted/40 text-[9px] font-semibold text-primary">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {topic.route && (
        <button
          data-testid={`chatbot-take-me-${topic.id}`}
          type="button"
          onClick={() => { navigate(topic.route!); close(); }}
          className="w-full rounded-md border border-primary bg-primary-muted/20 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-muted/40"
        >
          Take me there →
        </button>
      )}
      {related.length > 0 && (
        <section>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Related guides</h4>
          <div className="flex flex-wrap gap-1">
            {related.map((r) => (
              <button
                key={r.id}
                type="button"
                data-testid={`chatbot-related-${r.id}`}
                onClick={() => onPick(r.id)}
                className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                {r.title}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/* ==================================================================== */
/*  Chat transcript (used in error mode + free-form Q/A).                 */
/* ==================================================================== */
const ChatTranscript = ({ messages, sending }: { messages: ChatbotMessage[]; sending: boolean }) => (
  <div className="space-y-2 p-3">
    {messages.map((m) => (
      <ChatBubble key={m.id} m={m} />
    ))}
    {sending && !messages.some((m) => m.pending) && (
      <ChatBubble m={{ id: 'pending', role: 'assistant', content: '', pending: true }} />
    )}
  </div>
);

const ChatBubble = ({ m }: { m: ChatbotMessage }) => {
  const isUser = m.role === 'user';
  return (
    <div
      data-testid={`chatbot-msg-${m.role}`}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed',
          isUser ? 'bg-primary-muted/40 text-text-primary' : 'bg-elevated text-text-primary',
          m.error && 'border border-danger/40 bg-danger/10 text-danger',
        )}
      >
        {m.pending ? (
          <span className="inline-flex items-center gap-1 text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" /><span className="animate-pulse">Thinking…</span>
          </span>
        ) : m.error ? (
          <span className="font-mono text-[10px]">{m.error}</span>
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{m.content}</span>
        ) : (
          <div className="space-y-1 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-probestack-bg [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[10px] [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-probestack-bg [&_pre]:p-2 [&_pre]:text-[10px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-text-primary [&_ul]:list-disc [&_ul]:pl-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
