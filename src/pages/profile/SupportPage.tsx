/**
 * Support page — premium two-tab UI.
 *
 *   Tab 1 — Knowledge Base : search-first, category browse, expandable cards.
 *   Tab 2 — Tickets        : list user's own tickets, "New ticket" drawer
 *                            for creation, click row → detail view.
 *
 * Backend: `forgeq-support-mgmt-svc` on port 8094.
 *
 * The user identity comes from the existing `auth.store` if present; for
 * the dev-bypass mode we fall back to a deterministic UUID so a single
 * test session lists its own tickets across reloads.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronRight, LifeBuoy, Loader2, Plus, RefreshCw, Search,
  Send, Ticket as TicketIcon, X, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  searchKb, listTickets, createTicket, getKbArticle,
  type KbArticle, type TicketView,
} from '@/api/support.api';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/ui/Skeleton';

const PRODUCT_AREAS = [
  'Request Builder', 'Collections', 'Environments', 'Variables', 'Mocks',
  'Monitors', 'Functional Testing', 'Load Testing', 'API Docs',
  'Integrations', 'AI Assistant', 'Other',
];

/** Stable per-browser id so tickets list across reloads. */
function getOrCreateLocalUserId(): string {
  const k = 'forgeq.support.localUserId';
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

export const SupportPage = () => {
  const [tab, setTab] = useState<'kb' | 'tickets'>('kb');
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-probestack-bg" data-testid="support-page">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Help &amp; Support</h1>
            <p className="text-xs text-text-muted">Search the knowledge base or open a ticket — we typically reply in 24-48 hours.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          data-testid="support-new-ticket-btn"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-hover hover:shadow-primary/30"
        >
          <Plus className="h-3.5 w-3.5" /> New ticket
        </button>
      </header>

      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface/40 px-4">
        <TabButton active={tab === 'kb'}      onClick={() => setTab('kb')}      icon={BookOpen}     label="Knowledge base" testId="support-tab-kb" />
        <TabButton active={tab === 'tickets'} onClick={() => setTab('tickets')} icon={TicketIcon}   label="My tickets"     testId="support-tab-tickets" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'kb'      && <KnowledgeBaseTab />}
        {tab === 'tickets' && <TicketsTab onNew={() => setDrawerOpen(true)} />}
      </div>

      {drawerOpen && <NewTicketDrawer onClose={() => setDrawerOpen(false)} />}
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, testId }: any) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={cn(
      'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
      active ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary',
    )}
  >
    <Icon className="h-3.5 w-3.5" /> {label}
  </button>
);

/* =========================== Knowledge Base =========================== */

const KnowledgeBaseTab = () => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const kbQ = useQuery({
    queryKey: ['support', 'kb', debouncedQ],
    queryFn: () => searchKb(debouncedQ, 50, 0),
  });

  const grouped = useMemo(() => {
    const items = kbQ.data?.items ?? [];
    const map = new Map<string, KbArticle[]>();
    for (const a of items) {
      const c = a.category ?? 'Misc';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(a);
    }
    return Array.from(map.entries());
  }, [kbQ.data]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6" data-testid="support-kb-pane">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          data-testid="support-kb-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the knowledge base — e.g. monitor, environment, variables…"
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary"
        />
      </div>

      {kbQ.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid="support-kb-empty">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-text-muted" />
          <p className="text-sm font-medium">No articles matched.</p>
          <p className="mt-1 text-xs text-text-muted">Try a different keyword, or open a support ticket below.</p>
        </div>
      ) : (
        grouped.map(([cat, articles]) => (
          <section key={cat} data-testid={`support-kb-cat-${cat.replace(/\s+/g, '-').toLowerCase()}`}>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">{cat}</h3>
            <ul className="space-y-2">
              {articles.map((a) => <ArticleCard key={a.id} article={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} />)}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

const ArticleCard = ({ article, open, onToggle }: { article: KbArticle; open: boolean; onToggle: () => void }) => {
  /* On expand we fetch the full content — saves bandwidth on the listing. */
  const fullQ = useQuery({
    queryKey: ['support', 'kb', 'one', article.id],
    queryFn: () => getKbArticle(article.id),
    enabled: open,
  });
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-surface transition-all hover:border-primary/30">
      <button
        type="button"
        onClick={onToggle}
        data-testid={`support-kb-article-${article.id}`}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <BookOpen className="h-3 w-3" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{article.title}</span>
          <span className="mt-0.5 block text-xs text-text-muted line-clamp-2">{article.snippet}</span>
        </span>
        <ChevronRight className={cn('mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform', open && 'rotate-90 text-primary')} />
      </button>
      {open && (
        <div className="border-t border-border bg-elevated/40 px-4 py-3 text-xs leading-relaxed text-text-secondary" data-testid={`support-kb-article-body-${article.id}`}>
          {fullQ.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <p className="whitespace-pre-wrap">{fullQ.data?.content ?? article.snippet}</p>}
          {(article.tags ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {(article.tags ?? []).map((t) => (
                <span key={t} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-text-muted">#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
};

/* ============================== Tickets ============================== */

const TicketsTab = ({ onNew }: { onNew: () => void }) => {
  const userId = getOrCreateLocalUserId();
  const navigate = useNavigate();
  const ticketsQ = useQuery({
    queryKey: ['support', 'tickets', userId],
    queryFn: () => listTickets(userId, 0, 50),
    refetchInterval: 30_000,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-6" data-testid="support-tickets-pane">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">My tickets</h2>
        <button
          type="button"
          onClick={() => ticketsQ.refetch()}
          data-testid="support-tickets-refresh"
          className="grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-text-muted hover:bg-elevated hover:text-text-primary"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', ticketsQ.isFetching && 'animate-spin')} />
        </button>
      </div>

      {ticketsQ.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (ticketsQ.data?.items ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid="support-tickets-empty">
          <TicketIcon className="mx-auto mb-2 h-6 w-6 text-text-muted" />
          <p className="text-sm font-medium">No tickets yet.</p>
          <p className="mt-1 text-xs text-text-muted">Stuck on something? File a ticket and we'll jump on it.</p>
          <button
            type="button"
            onClick={onNew}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> New ticket
          </button>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="support-tickets-list">
          {(ticketsQ.data!.items).map((t) => (
            <li key={t.ticketId}>
              <button
                type="button"
                onClick={() => navigate(`/projects/support/${t.ticketId}`)}
                data-testid={`support-ticket-row-${t.ticketId}`}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-elevated"
              >
                <span className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                  t.status === 'open'        ? 'bg-primary/15 text-primary' :
                  t.status === 'in_progress' ? 'bg-warning/15 text-warning' :
                  t.status === 'resolved'    ? 'bg-success/15 text-success' :
                  'bg-elevated text-text-muted',
                )}>{t.status}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.subject}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-text-muted">{t.productArea} · {t.email} · {timeAgo(t.createdAt)}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const NewTicketDrawer = ({ onClose }: { onClose: () => void }) => {
  const userId = getOrCreateLocalUserId();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: '', email: '', productArea: PRODUCT_AREAS[0],
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    subject: '', description: '',
  });
  const create = useMutation({
    mutationFn: () => createTicket(userId, form),
    onSuccess: () => {
      toast.success('Ticket submitted — we\'ll be in touch soon.');
      qc.invalidateQueries({ queryKey: ['support', 'tickets', userId] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not submit ticket'),
  });

  const valid = form.fullName && form.email && form.subject.length > 3 && form.description.length > 10;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} data-testid="support-drawer-overlay" />
      <aside
        data-testid="support-new-ticket-drawer"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">New support ticket</h2>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary" data-testid="support-drawer-close">
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
          <Field label="Full name *">
            <input data-testid="support-form-fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary" />
          </Field>
          <Field label="Email *">
            <input data-testid="support-form-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary" />
          </Field>
          <Field label="Product area *">
            <select data-testid="support-form-productArea" value={form.productArea} onChange={(e) => setForm({ ...form, productArea: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary">
              {PRODUCT_AREAS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <div className="flex items-center gap-1" data-testid="support-form-priority">
              {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[10px] font-medium uppercase transition-colors',
                    form.priority === p ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-elevated text-text-muted hover:text-text-primary',
                  )}>{p}</button>
              ))}
            </div>
          </Field>
          <Field label="Subject *">
            <input data-testid="support-form-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="One-line summary"
              className="h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary" />
          </Field>
          <Field label="Description *">
            <textarea data-testid="support-form-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Steps to reproduce, expected vs actual, screenshots if any."
              rows={6}
              className="w-full resize-none rounded-md border border-border bg-probestack-bg p-2 text-xs outline-none focus:border-primary" />
          </Field>
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-elevated">Cancel</button>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={!valid || create.isPending}
            data-testid="support-form-submit"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-all',
              valid && !create.isPending ? 'bg-primary hover:bg-primary-hover' : 'bg-elevated text-text-muted cursor-not-allowed',
            )}
          >
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit ticket
          </button>
        </footer>
      </aside>
    </>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
    {children}
  </label>
);

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export type { TicketView };
