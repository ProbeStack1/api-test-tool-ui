/**
 * Single support ticket view — read-only thread/detail.
 *
 * Uses the same `getTicket` endpoint (`/api/v1/support/tickets/:id`).
 * Shown when the user clicks a row from `SupportPage` → "My tickets".
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2, Mail, MessageSquareWarning, Tag, User } from 'lucide-react';
import { getTicket } from '@/api/support.api';
import { cn } from '@/utils/cn';

export const SupportTicketPage = () => {
  const { ticketId = '' } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const tQ = useQuery({
    queryKey: ['support', 'tickets', 'one', ticketId],
    queryFn: () => getTicket(ticketId),
    enabled: !!ticketId,
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-probestack-bg" data-testid="support-ticket-page">
      <header className="flex items-center gap-3 border-b border-border bg-surface/40 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/projects/support')}
          data-testid="support-ticket-back"
          className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <MessageSquareWarning className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">{tQ.data?.subject ?? 'Loading…'}</h1>
          <p className="truncate text-[11px] text-text-muted">Ticket {ticketId.slice(0, 8)}</p>
        </div>
        {tQ.data?.status && (
          <span className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            tQ.data.status === 'open'        ? 'bg-primary/15 text-primary' :
            tQ.data.status === 'in_progress' ? 'bg-warning/15 text-warning' :
            tQ.data.status === 'resolved'    ? 'bg-success/15 text-success' :
            'bg-elevated text-text-muted',
          )}>{tQ.data.status}</span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
          {tQ.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Loading ticket…</div>
          ) : !tQ.data ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-xs text-text-muted">Ticket not found.</div>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-4 text-xs sm:grid-cols-4" data-testid="support-ticket-meta">
                <Meta icon={User} label="Reporter" value={tQ.data.fullName} />
                <Meta icon={Mail} label="Email" value={tQ.data.email} />
                <Meta icon={Tag} label="Product area" value={tQ.data.productArea} />
                <Meta icon={Calendar} label="Created" value={new Date(tQ.data.createdAt).toLocaleString()} />
              </section>

              <section className="rounded-lg border border-border bg-surface p-5" data-testid="support-ticket-description">
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{tQ.data.description}</p>
              </section>

              <section className="rounded-lg border border-dashed border-border bg-elevated/40 p-5 text-center text-[11px] text-text-muted" data-testid="support-ticket-thread-placeholder">
                Replies from the ForgeQ team will land here once a support engineer picks up your ticket.
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Meta = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <div className="mt-0.5 truncate font-medium" title={value}>{value}</div>
  </div>
);
