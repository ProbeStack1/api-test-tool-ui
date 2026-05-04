/**
 * Right side of the AI-Assisted page — scrollable conversation + composer.
 *
 * Shows a friendly empty conversation when no session is selected so the
 * user can start typing immediately (the page handles auto-create-on-send).
 */
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AppIcon } from '@/components/icons/AppIcons';
import type { SessionDetail } from '@/services/aiChat.service';

interface Props {
  detail: SessionDetail | undefined;
  loading: boolean;
  sending: boolean;
  onSend: (text: string) => void;
}

const STARTER_PROMPTS: { label: string; prompt: string }[] = [
  { label: 'Debug a 4xx/5xx response',  prompt: 'I just got a 4xx/5xx response — walk me through the most common causes and what to check first.' },
  { label: 'Generate test cases',       prompt: 'Suggest a comprehensive set of test assertions for a typical REST GET endpoint that returns a list with pagination.' },
  { label: 'Explain a JSON response',   prompt: 'Help me understand the structure of a typical JSON API response — what each common field usually means.' },
  { label: 'Write a regex pattern',     prompt: 'Help me write a regex — start by asking me what I need to match.' },
];

export const ChatRoom = ({ detail, loading, sending, onSend }: Props) => {
  const [input, setInput] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll to bottom on every message arrival. */
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [detail?.messages?.length, sending]);

  const messages = detail?.messages ?? [];
  const hasSession = !!detail;
  const titleText = hasSession ? (detail!.session.title || 'New chat') : 'New chat';
  const messageCount = messages.length;

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-probestack-bg" data-testid="chat-room">
      {/* Title bar */}
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <AppIcon name="zap" animated className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold text-text-primary" data-testid="chat-room-title">
            {loading ? 'Loading…' : titleText}
          </h2>
        </div>
        {hasSession && (
          <span className="text-[10px] text-text-muted">
            {messageCount} message{messageCount === 1 ? '' : 's'}
          </span>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollerRef}
        data-testid="chat-scroller"
        className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-text-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation…
          </div>
        ) : messageCount === 0 && !sending ? (
          <FreshChatHero onPick={(p) => onSend(p)} />
        ) : (
          <div className="mx-auto w-full space-y-4">
            {messages.map((m: any) => (
              <Bubble key={m.id} role={m.role} content={m.content} pending={!!m._pending} />
            ))}
            {sending && !messages.some((m: any) => m._pending) && (
              <Bubble role="assistant" content="" pending />
            )}
          </div>
        )}
      </div>

      {/* Composer (always enabled — first send auto-creates a session) */}
      <form
        data-testid="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          const t = input.trim();
          if (!t || sending) return;
          setInput('');
          onSend(t);
        }}
        className="flex shrink-0 items-end gap-2 border-t border-border bg-surface/40 px-4 py-3"
      >
        <textarea
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const t = input.trim();
              if (!t || sending) return;
              setInput('');
              onSend(t);
            }
          }}
          placeholder="Ask anything…"
          rows={2}
          autoFocus
          className="min-h-0 flex-1 resize-none rounded-md border border-border bg-probestack-bg px-3 py-2 text-sm outline-none transition-colors hover:border-primary/40 focus:border-primary"
        />
        <button
          data-testid="chat-send"
          type="submit"
          disabled={sending || !input.trim()}
          className={cn(
            'grid h-10 w-10 place-items-center rounded-md transition-all',
            sending ? 'bg-elevated text-text-muted' : 'bg-primary text-white hover:bg-primary-hover',
            !input.trim() && 'opacity-40',
          )}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </main>
  );
};

/** Big friendly "Start the conversation" panel shown when there are no
 *  messages yet (either because no session is selected or the session
 *  has zero turns so far). The composer below it is always active.
 *
 *  Includes 4 one-tap starter prompts for first-time-user discoverability. */
const FreshChatHero = ({ onPick }: { onPick: (prompt: string) => void }) => (
  <div
    data-testid="chat-fresh-hero"
    className="flex h-full flex-col items-center justify-center gap-4 text-center"
  >
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-muted/30">
      <AppIcon name="zap" animated className="h-8 w-8 text-primary" />
    </div>
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-text-primary">How can I help you today?</h3>
      <p className="max-w-md text-xs text-text-muted">
        Start typing below — or pick one of these to get going.
      </p>
    </div>
    <div className="flex max-w-2xl flex-wrap justify-center gap-2" data-testid="chat-starter-prompts">
      {STARTER_PROMPTS.map((p) => (
        <button
          key={p.label}
          type="button"
          data-testid={`starter-${p.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          onClick={() => onPick(p.prompt)}
          className="group rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-sm hover:shadow-primary/10"
        >
          <AppIcon name="zap" className="mr-1.5 inline h-3 w-3 text-primary opacity-60 group-hover:opacity-100" />
          {p.label}
        </button>
      ))}
    </div>
  </div>
);

const Bubble = ({ role, content, pending }: { role: 'user' | 'assistant'; content: string; pending?: boolean }) => {
  const isUser = role === 'user';
  return (
    <div
      data-testid={`chat-msg-${role}`}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-muted/40">
          <AppIcon name="zap" animated className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'min-w-0 max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-primary-muted/40 text-text-primary'
            : 'bg-elevated text-text-primary',
        )}
      >
        {pending ? (
          <span className="inline-flex items-center gap-1.5 text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="animate-pulse">Thinking…</span>
          </span>
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div className="space-y-2 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-probestack-bg [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-probestack-bg [&_pre]:p-2 [&_pre]:text-[12px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-text-primary [&_ul]:list-disc [&_ul]:pl-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
