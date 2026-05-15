/**
 * NotificationsBell — global header bell that hits the Collaboration service.
 *
 * Shows a red pill with the unread count. Clicking opens a dropdown list
 * of recent notifications with in-place mark-as-read and a bulk
 * "Mark all read" action. Re-polls every 30 s.
 */
import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Loader2, Sparkles } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listNotifications, markAllNotificationsRead, markNotificationRead,
} from '@/api/collab.api';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';

/** Shared per-browser uuid — same key used by Support/Profile so everything
 *  in dev targets the same "logical user". */
function localUserId(): string {
  const k = 'ForgeFuzz.support.localUserId';
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

export const NotificationsBell = () => {
  const userId = localUserId();
  const [open, setOpen] = useState(false);
  /** When the unread count tick UPS between two polls we pop the dropdown
   *  open with a quick slide-in. This is the daily-engagement hook the
   *  user asked for — no need to wait for a user click. */
  const [autoOpened, setAutoOpened] = useState(false);
  const lastUnreadRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['collab', 'notifications', userId],
    queryFn: () => listNotifications(userId),
    refetchInterval: 30_000,
  });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collab', 'notifications', userId] }),
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collab', 'notifications', userId] }),
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = q.data?.unread ?? 0;
  const items  = q.data?.items ?? [];

  /* Auto-open when unread count increases between polls */
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lastUnreadRef.current !== null && unread > lastUnreadRef.current && !open) {
      setOpen(true);
      setAutoOpened(true);

      /* Toast preview — pick the freshest unread item and slide it in
       * from the top-right via `sonner` (already mounted globally and
       * theme-aware). Click "Open" → keeps the bell dropdown open and
       * cancels the auto-close timer. Auto-dismisses after 5 s. */
      const fresh = items.find((n) => !n.isRead);
      if (fresh) {
        toast(fresh.message || 'New notification', {
          id: `notif-${fresh.id}`,
          description: fresh.referenceType
            ? `On ${String(fresh.referenceType).toLowerCase()} · ${timeAgo(fresh.createdAt)}`
            : timeAgo(fresh.createdAt),
          duration: 5_000,
          action: {
            label: 'Open',
            onClick: () => {
              cancelAutoClose();
              setOpen(true);
            },
          },
        });
      }

      // Auto-close after 6s if user doesn't interact
      autoCloseTimerRef.current = setTimeout(() => {
        setOpen(false);
        setAutoOpened(false);
      }, 6000);
    }
    lastUnreadRef.current = unread;
  }, [unread, open, items]);

  /* Cancel auto-close timer when user interacts */
  const cancelAutoClose = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setAutoOpened(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Tooltip content="Notifications">
        <Button
          variant="ghost"
          size="icon"
          data-testid="notifications-bell"
          onClick={() => setOpen((v) => !v)}
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              data-testid="notifications-unread-badge"
              className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </Tooltip>

      {open && (
        <div
          data-testid="notifications-dropdown"
          data-auto-opened={autoOpened ? '1' : '0'}
          onClick={cancelAutoClose}
          className={cn(
            'absolute right-0 top-[calc(100%+6px)] z-50 w-[360px] overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-black/20',
            'animate-notifications-slide-in',
            autoOpened && 'ring-2 ring-primary/50',
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div>
              <h3 className="text-sm font-semibold">Notifications</h3>
              <p className="text-[11px] text-text-muted">
                {q.data ? `${unread} unread · ${q.data.total} total` : 'Loading…'}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                disabled={readAll.isPending}
                data-testid="notifications-mark-all-read"
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
              >
                {readAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Mark all read
              </button>
            )}
          </header>

          <div className="max-h-[440px] overflow-auto" data-testid="notifications-list">
            {q.isLoading ? (
              <div className="flex items-center gap-2 p-6 text-xs text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading notifications…
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center" data-testid="notifications-empty">
                <Sparkles className="mx-auto mb-2 h-5 w-5 text-text-muted" />
                <p className="text-xs font-semibold">You're all caught up!</p>
                <p className="mt-1 text-[11px] text-text-muted">New comments and mentions will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li
                    key={n.id}
                    data-testid={`notification-item-${n.id}`}
                    className={cn(
                      'group relative flex items-start gap-3 px-4 py-2.5 text-xs transition-colors',
                      !n.isRead && 'bg-primary/5',
                    )}
                  >
                    {!n.isRead && <span className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-primary" />}
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-elevated text-[9px] font-semibold uppercase text-primary">
                      {(n.type || '?').slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{n.message}</span>
                      <span className="block text-[10px] text-text-muted">
                        {n.referenceType ? `${n.referenceType} · ` : ''}{timeAgo(n.createdAt)}
                      </span>
                    </span>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => readOne.mutate(n.id)}
                        data-testid={`notification-read-${n.id}`}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Mark as read"
                      >
                        <Check className="h-3 w-3 text-primary" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60)    return `${sec}s ago`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
