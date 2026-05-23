/**
 * NotificationBell — header dropdown showing the caller's recent activity
 * feed with TOAST EMISSION when new items arrive.
 *
 * Polls every 30 s. On each poll, compares the previous max-createdAt to
 * the new max; any items with createdAt > previous max are emitted as
 * sonner toasts so the user gets a peripheral hint even when the bell
 * is closed.
 */
import { useEffect, useRef, useState } from 'react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { Bell, CheckCheck, Loader2, MailCheck, UserPlus, UserX, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useAuth } from '@/stores/auth.store';
import { notificationsApi, type NotificationItem } from '@/services/notifications.service';
import { acceptInvitation, rejectInvitation } from '@/services/workspace.service';

const POLL_MS = 30_000;

const iconFor = (type: string) => {
  switch (type) {
    case 'INVITE_RECEIVED':  return <MailCheck className="h-4 w-4 text-primary" />;
    case 'INVITE_SENT':      return <UserPlus  className="h-4 w-4 text-success" />;
    case 'INVITE_ACCEPTED':  return <UserPlus  className="h-4 w-4 text-success" />;
    case 'INVITE_REJECTED':  return <UserX     className="h-4 w-4 text-danger" />;
    case 'WORKSPACE_JOINED': return <UserPlus  className="h-4 w-4 text-primary" />;
    case 'ROLE_CHANGED':     return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'MEMBER_REMOVED':   return <UserX     className="h-4 w-4 text-danger" />;
    default:                 return <Bell      className="h-4 w-4 text-text-secondary" />;
  }
};

const relTime = (iso?: string | null): string => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const NotificationBell = () => {
  const authed = useAuth((s) => s.isAuthenticated());
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  // Track the most-recent createdAt we've ALREADY shown to the user, so we
  // never toast the same item twice across polls or page reloads. Seeded
  // from localStorage on first mount, written on every successful poll.
  const lastSeenRef = useRef<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('forgefuzz.notify.lastSeen');
      if (raw) lastSeenRef.current = Number(raw) || 0;
    } catch { /* noop */ }
  }, []);

  const fetchAll = async (toastNew: boolean) => {
    if (!authed) return;
    try {
      const d = await notificationsApi.inbox(0, 20);
      const newItems = d?.items ?? [];
      const newUnread = Number(d?.unread ?? 0);
      setItems(newItems);
      setUnread(newUnread);

      if (toastNew && newItems.length > 0) {
        const fresh = newItems.filter((n) => {
          const t = new Date(n.createdAt).getTime();
          return Number.isFinite(t) && t > lastSeenRef.current;
        });
        // Toast at most 3 — avoid spamming after a long absence
        fresh.slice(0, 3).forEach((n) => {
          const variant =
            n.severity === 'error'   ? toast.error :
            n.severity === 'warning' ? toast.warning :
            n.severity === 'success' ? toast.success :
                                       toast.info;
          variant(n.title, {
            description: n.message,
            action: n.link ? { label: 'View', onClick: () => nav(n.link!) } : undefined,
          });
        });
        if (newItems.length > 0) {
          const max = Math.max(...newItems.map((n) => new Date(n.createdAt).getTime() || 0));
          if (max > lastSeenRef.current) {
            lastSeenRef.current = max;
            try { localStorage.setItem('forgefuzz.notify.lastSeen', String(max)); } catch { /* noop */ }
          }
        }
      }
    } catch { /* noop */ }
  };

  useEffect(() => {
    fetchAll(false);                 // first load — silent
    const t = setInterval(() => fetchAll(true), POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const markAllRead = async () => {
    setBusy(true);
    try { await notificationsApi.markAllRead(); await fetchAll(false); }
    finally { setBusy(false); }
  };

  /** Pull invite token from notification payload or fall back to link. */
  const inviteToken = (n: NotificationItem): string | null => {
    const fromPayload = (n.payload as any)?.token;
    if (typeof fromPayload === 'string' && fromPayload.length > 0) return fromPayload;
    if (n.link) {
      const i = n.link.indexOf('token=');
      if (i >= 0) return decodeURIComponent(n.link.slice(i + 'token='.length).split('&')[0]);
    }
    return null;
  };

  const acceptFromBell = async (n: NotificationItem) => {
    const t = inviteToken(n);
    if (!t) return;
    setBusy(true);
    try {
      await acceptInvitation(t);
      try { await notificationsApi.markRead(n.id); } catch { /* noop */ }
      toast.success('Invitation accepted');
      fetchAll(false);
    } catch (e: any) {
      toast.error('Could not accept', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  const rejectFromBell = async (n: NotificationItem) => {
    const t = inviteToken(n);
    if (!t) return;
    setBusy(true);
    try {
      await rejectInvitation(t);
      try { await notificationsApi.markRead(n.id); } catch { /* noop */ }
      toast.success('Invitation declined');
      fetchAll(false);
    } catch (e: any) {
      toast.error('Could not decline', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  const onClickRow = async (n: NotificationItem) => {
    if (!n.read) { try { await notificationsApi.markRead(n.id); } catch { /* noop */ } }
    if (n.link) nav(n.link);
    fetchAll(false);
  };

  if (!authed) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="notification-bell"
          aria-label={`Notifications, ${unread} unread`}
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-hover"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              data-testid="notification-unread-count"
              className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          'z-50 w-[380px] rounded-lg border border-border bg-elevated p-0 shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy || unread === 0}
            data-testid="notification-mark-all-read"
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-text-secondary hover:bg-hover disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
            Mark all read
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-text-muted" data-testid="notification-empty">
              You're all caught up!
            </div>
          ) : (
            items.slice(0, 8).map((n) => {
              const isInvite = n.type === 'INVITE_RECEIVED' && !!inviteToken(n);
              return (
                <div
                  key={n.id}
                  data-testid={`notification-item-${n.id}`}
                  className={cn(
                    'border-b border-border/40',
                    !n.read && 'bg-primary/5',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onClickRow(n)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-hover"
                  >
                    <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{n.title}</div>
                      <div className="line-clamp-2 text-[11px] text-text-secondary">{n.message}</div>
                      <div className="mt-0.5 text-[10px] text-text-muted">{relTime(n.createdAt)}</div>
                    </div>
                    {!n.read && <span className="ml-1 mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                  {isInvite && (
                    <div className="flex items-center gap-2 px-3 pb-2" data-testid={`notification-invite-actions-${n.id}`}>
                      <button
                        type="button"
                        onClick={() => acceptFromBell(n)}
                        disabled={busy}
                        data-testid={`notification-invite-accept-${n.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectFromBell(n)}
                        disabled={busy}
                        data-testid={`notification-invite-reject-${n.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium hover:bg-elevated disabled:opacity-50"
                      >
                        <X className="h-3 w-3" /> Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-3 py-1.5">
          <Link
            to="/projects/notifications"
            onClick={() => setOpen(false)}
            data-testid="notification-view-all"
            className="block text-center text-[11px] text-primary hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
