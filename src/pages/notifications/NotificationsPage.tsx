/**
 * NotificationsPage — settings-style layout:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ HEADER (title only)                                          │
 *   ├──────────────────┬──────────────────────────────────────────┤
 *   │ LEFT SIDEBAR     │ MAIN LIST                                 │
 *   │  • Inbox         │  [row]  [row]  [row]                      │
 *   │  • Trash         │   ↳ expanded body when clicked            │
 *   │ ────────────     │                                           │
 *   │  Mark all read   │                                           │
 *   │  Delete read     │                                           │
 *   │  Delete all      │                                           │
 *   │ ────────────     │                                           │
 *   │  preferences →   │                                           │
 *   └──────────────────┴──────────────────────────────────────────┘
 *
 * Behaviour:
 *   • All mutations are optimistic — the affected row(s) update in place
 *     without a re-fetch or visual reload flash.
 *   • Clicking a row body toggles an inline expand (full message, payload,
 *     workspace, timing).
 *   • INVITE_RECEIVED rows render inline Accept / Decline buttons.
 *   • "Mark as un-read" was intentionally REMOVED per user request — once
 *     you read it, it stays read. Trash + restore covers re-attention.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, RotateCcw, Loader2, Inbox, AlertTriangle,
  UserPlus, UserX, MailCheck, Check, X, ChevronRight, Settings, FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import {
  notificationsApi,
  type NotificationItem,
} from '@/services/notifications.service';
import { acceptInvitation, rejectInvitation } from '@/services/workspace.service';

type Tab = 'inbox' | 'trash';

const iconFor = (type: string) => {
  switch (type) {
    case 'INVITE_RECEIVED':   return <MailCheck     className="h-4 w-4 text-primary" />;
    case 'INVITE_SENT':       return <UserPlus      className="h-4 w-4 text-success" />;
    case 'INVITE_ACCEPTED':   return <UserPlus      className="h-4 w-4 text-success" />;
    case 'INVITE_REJECTED':   return <UserX         className="h-4 w-4 text-danger" />;
    case 'WORKSPACE_JOINED':  return <UserPlus      className="h-4 w-4 text-primary" />;
    case 'ROLE_CHANGED':      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'MEMBER_REMOVED':    return <UserX         className="h-4 w-4 text-danger" />;
    case 'LOGIN_ALERT':       return <Settings      className="h-4 w-4 text-info" />;
    case 'TEST_FAILED':       return <FlaskConical  className="h-4 w-4 text-danger" />;
    case 'MONITOR_ALERT':     return <AlertTriangle className="h-4 w-4 text-warning" />;
    default:                  return <Bell          className="h-4 w-4 text-text-secondary" />;
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
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
};

export const NotificationsPage = () => {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('inbox');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState({ unread: 0, total: 0, trash: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /** Load list for the active tab. Only called on tab change + first mount —
   *  subsequent mutations update local state optimistically. */
  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'inbox') {
        const d = await notificationsApi.inbox(0, 100);
        setItems(d?.items ?? []);
        setCounts({
          unread: Number(d?.unread ?? 0),
          total:  Number(d?.total ?? 0),
          trash:  Number(d?.trash ?? 0),
        });
      } else {
        const [d, c] = await Promise.all([
          notificationsApi.trash(0, 100),
          notificationsApi.counts(),
        ]);
        setItems(d?.items ?? []);
        setCounts(c ?? { unread: 0, total: 0, trash: 0 });
      }
    } catch (e: any) {
      toast.error('Could not load notifications', { description: e?.message ?? '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setExpanded(new Set());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ─── Optimistic mutations ──────────────────────────────────────────────
  const handleRead = async (n: NotificationItem) => {
    if (n.read) return;
    setBusy(n.id);
    // Optimistic: update row + counters locally
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setCounts((c) => ({ ...c, unread: Math.max(0, c.unread - 1) }));
    try {
      await notificationsApi.markRead(n.id);
    } catch (e: any) {
      // rollback
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
      setCounts((c) => ({ ...c, unread: c.unread + 1 }));
      toast.error('Failed to mark read', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const handleTrash = async (n: NotificationItem) => {
    setBusy(n.id);
    const prevItems = items;
    const prevCounts = counts;
    setItems((p) => p.filter((x) => x.id !== n.id));
    setCounts((c) => ({
      unread: !n.read ? Math.max(0, c.unread - 1) : c.unread,
      total: Math.max(0, c.total - 1),
      trash: c.trash + 1,
    }));
    try {
      await notificationsApi.trashOne(n.id);
      toast.success('Moved to trash');
    } catch (e: any) {
      setItems(prevItems);
      setCounts(prevCounts);
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const handleRestore = async (n: NotificationItem) => {
    setBusy(n.id);
    const prevItems = items;
    const prevCounts = counts;
    setItems((p) => p.filter((x) => x.id !== n.id));
    setCounts((c) => ({
      ...c,
      trash: Math.max(0, c.trash - 1),
      total: c.total + 1,
      unread: !n.read ? c.unread + 1 : c.unread,
    }));
    try {
      await notificationsApi.restoreOne(n.id);
      toast.success('Restored to inbox');
    } catch (e: any) {
      setItems(prevItems);
      setCounts(prevCounts);
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const handleDelete = async (n: NotificationItem) => {
    if (!confirm('Permanently delete this notification?')) return;
    setBusy(n.id);
    const prevItems = items;
    const prevCounts = counts;
    setItems((p) => p.filter((x) => x.id !== n.id));
    setCounts((c) => ({ ...c, trash: Math.max(0, c.trash - 1) }));
    try {
      await notificationsApi.deleteOne(n.id);
      toast.success('Deleted');
    } catch (e: any) {
      setItems(prevItems);
      setCounts(prevCounts);
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const handleReadAll = async () => {
    if (counts.unread === 0) return;
    const prevItems = items;
    const prevCounts = counts;
    setItems((p) => p.map((x) => ({ ...x, read: true })));
    setCounts((c) => ({ ...c, unread: 0 }));
    try {
      const r = await notificationsApi.markAllRead();
      toast.success(`Marked ${r.data?.data ?? 0} as read`);
    } catch (e: any) {
      setItems(prevItems);
      setCounts(prevCounts);
      toast.error('Failed', { description: e?.message ?? '' });
    }
  };

  const handleDeleteRead = async () => {
    if (counts.total - counts.unread === 0) return;
    if (!confirm('Permanently delete every READ notification in the inbox?')) return;
    const prevItems = items;
    const prevCounts = counts;
    setItems((p) => p.filter((x) => !x.read));
    setCounts((c) => ({ ...c, total: c.unread }));
    try {
      const r = await notificationsApi.deleteRead();
      toast.success(`Deleted ${r.data?.data ?? 0} read`);
    } catch (e: any) {
      setItems(prevItems);
      setCounts(prevCounts);
      toast.error('Failed', { description: e?.message ?? '' });
    }
  };

  const handleDeleteAll = async () => {
    if (counts.total === 0) return;
    if (!confirm('This will permanently delete the ENTIRE inbox (trash is untouched). Continue?')) return;
    const prevItems = items;
    const prevCounts = counts;
    setItems([]);
    setCounts((c) => ({ ...c, total: 0, unread: 0 }));
    try {
      const r = await notificationsApi.deleteAll();
      toast.success(`Deleted ${r.data?.data ?? 0} items`);
    } catch (e: any) {
      setItems(prevItems);
      setCounts(prevCounts);
      toast.error('Failed', { description: e?.message ?? '' });
    }
  };

  // ─── Invite accept / reject ────────────────────────────────────────────
  const extractInviteToken = (n: NotificationItem): string | null => {
    const fromPayload = (n.payload as any)?.token;
    if (typeof fromPayload === 'string' && fromPayload.length > 0) return fromPayload;
    if (n.link) {
      const i = n.link.indexOf('token=');
      if (i >= 0) return decodeURIComponent(n.link.slice(i + 'token='.length).split('&')[0]);
    }
    return null;
  };

  const handleAcceptInvite = async (n: NotificationItem) => {
    const token = extractInviteToken(n);
    if (!token) { toast.error('Invite token missing'); return; }
    setBusy(n.id);
    try {
      await acceptInvitation(token);
      // Mark read optimistically + remove invite buttons by replacing type? No,
      // backend will emit INVITE_ACCEPTED to inviter only — recipient's row
      // stays as INVITE_RECEIVED but now read. So just mark read here.
      try { await notificationsApi.markRead(n.id); } catch { /* noop */ }
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setCounts((c) => ({ ...c, unread: Math.max(0, c.unread - (n.read ? 0 : 1)) }));
      toast.success('Invitation accepted', { description: 'You have joined the workspace.' });
    } catch (e: any) {
      toast.error('Could not accept invitation', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const handleRejectInvite = async (n: NotificationItem) => {
    const token = extractInviteToken(n);
    if (!token) { toast.error('Invite token missing'); return; }
    setBusy(n.id);
    try {
      await rejectInvitation(token);
      try { await notificationsApi.markRead(n.id); } catch { /* noop */ }
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setCounts((c) => ({ ...c, unread: Math.max(0, c.unread - (n.read ? 0 : 1)) }));
      toast.success('Invitation declined');
    } catch (e: any) {
      toast.error('Could not reject invitation', { description: e?.message ?? '' });
    } finally { setBusy(null); }
  };

  const empty = useMemo(() => !loading && items.length === 0, [loading, items]);
  const readCount = counts.total - counts.unread;

  return (
    <div className="flex h-full bg-probestack-bg" data-testid="notifications-page">
      {/* ── LEFT SIDEBAR (settings-style) ─────────────────────────── */}
      <aside
        data-testid="notifications-sidebar"
        className="flex w-64 shrink-0 flex-col border-r border-border bg-surface"
      >
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-semibold">Notifications</h1>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Activity, invites, role changes.
          </p>
        </div>

        {/* Tabs */}
        <div className="px-2 pt-3">
          <SidebarNav
            active={tab === 'inbox'}
            onClick={() => setTab('inbox')}
            icon={Inbox}
            label="Inbox"
            badge={counts.unread > 0 ? counts.unread : null}
            testId="nf-side-inbox"
          />
          <SidebarNav
            active={tab === 'trash'}
            onClick={() => setTab('trash')}
            icon={Trash2}
            label="Trash"
            badge={counts.trash > 0 ? counts.trash : null}
            testId="nf-side-trash"
          />
        </div>

        {/* Action block — only meaningful on inbox tab */}
        {tab === 'inbox' && (
          <div className="mx-3 mt-4 rounded-md border border-border bg-elevated/40 px-2 py-2">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Bulk actions
            </div>
            <SidebarAction
              onClick={handleReadAll}
              disabled={counts.unread === 0}
              icon={CheckCheck}
              label="Mark all read"
              hint={`${counts.unread} unread`}
              testId="nf-side-mark-all-read"
            />
            <SidebarAction
              onClick={handleDeleteRead}
              disabled={readCount === 0}
              icon={Trash2}
              label="Delete read"
              hint={`${readCount} read`}
              testId="nf-side-delete-read"
            />
            <SidebarAction
              onClick={handleDeleteAll}
              disabled={counts.total === 0}
              icon={Trash2}
              label="Delete all"
              hint="entire inbox"
              danger
              testId="nf-side-delete-all"
            />
          </div>
        )}

        {/* Footer link */}
        <div className="mt-auto border-t border-border px-3 py-3">
          <button
            type="button"
            data-testid="nf-side-prefs"
            onClick={() => nav('/projects/profile?tab=notifications')}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[12px] text-text-secondary hover:bg-hover hover:text-text-primary"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" /> Preferences
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <p className="mt-1 px-2 text-[10px] text-text-muted">
            Trashed items auto-purge after 30 days.
          </p>
        </div>
      </aside>

      {/* ── MAIN LIST ─────────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : empty ? (
            <div className="grid place-items-center p-16 text-center text-text-muted" data-testid="nf-empty">
              <Bell className="mb-2 h-8 w-8 opacity-50" />
              <div className="text-sm font-medium">{tab === 'inbox' ? "You're all caught up" : 'Trash is empty'}</div>
              <p className="mt-1 max-w-md text-xs">
                {tab === 'inbox'
                  ? 'Activity in your workspaces will show up here.'
                  : 'Notifications you trash are kept for 30 days then permanently removed.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40 rounded-lg border border-border bg-surface">
              {items.map((n) => {
                const isExpanded = expanded.has(n.id);
                return (
                  <li
                    key={n.id}
                    data-testid={`nf-row-${n.id}`}
                    className={cn(
                      'group transition-colors',
                      !n.read && tab === 'inbox' && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-hover/40">
                      <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                      <button
                        type="button"
                        onClick={() => toggleExpand(n.id)}
                        className="block min-w-0 flex-1 text-left"
                        data-testid={`nf-row-expand-${n.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('truncate text-sm', !n.read && 'font-semibold')}>
                            {n.title}
                          </span>
                          {!n.read && tab === 'inbox' && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                          <ChevronRight
                            className={cn(
                              'ml-auto h-3.5 w-3.5 text-text-muted transition-transform',
                              isExpanded && 'rotate-90',
                            )}
                          />
                        </div>
                        <div className={cn(
                          'text-xs text-text-secondary',
                          !isExpanded && 'line-clamp-1',
                        )}>
                          {n.message}
                        </div>
                        <div className="mt-0.5 text-[10px] text-text-muted">
                          {relTime(n.createdAt)}
                          {n.actorEmail && <> · by {n.actorEmail}</>}
                          {tab === 'trash' && n.trashedAt && <> · trashed {relTime(n.trashedAt)}</>}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {tab === 'inbox' ? (
                          <>
                            {!n.read && (
                              <IconBtn
                                title="Mark as read"
                                onClick={() => handleRead(n)}
                                disabled={busy === n.id}
                                testId={`nf-read-${n.id}`}
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </IconBtn>
                            )}
                            <IconBtn
                              title="Move to trash"
                              onClick={() => handleTrash(n)}
                              disabled={busy === n.id}
                              testId={`nf-trash-${n.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconBtn>
                          </>
                        ) : (
                          <>
                            <IconBtn
                              title="Restore"
                              onClick={() => handleRestore(n)}
                              disabled={busy === n.id}
                              testId={`nf-restore-${n.id}`}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn
                              title="Delete forever"
                              onClick={() => handleDelete(n)}
                              disabled={busy === n.id}
                              testId={`nf-delete-${n.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconBtn>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div
                        className="border-t border-border/40 bg-elevated/30 px-4 py-3 text-xs"
                        data-testid={`nf-row-detail-${n.id}`}
                      >
                        <div className="grid grid-cols-2 gap-3 text-text-secondary">
                          <DetailRow label="Type" value={n.type} mono />
                          <DetailRow label="Severity" value={n.severity ?? 'info'} />
                          {n.workspaceId && <DetailRow label="Workspace" value={n.workspaceId} mono short />}
                          <DetailRow label="Created" value={n.createdAt} short />
                          {n.actorEmail && <DetailRow label="Actor" value={n.actorEmail} />}
                          {n.link && (
                            <DetailRow
                              label="Action"
                              value={(
                                <button
                                  type="button"
                                  onClick={() => nav(n.link!)}
                                  className="text-primary hover:underline"
                                >
                                  Open →
                                </button>
                              ) as any}
                            />
                          )}
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-text-primary">
                          {n.message}
                        </div>
                        {tab === 'inbox' && n.type === 'INVITE_RECEIVED' && extractInviteToken(n) && (
                          <div
                            className="mt-3 flex items-center gap-2"
                            data-testid={`nf-invite-actions-${n.id}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleAcceptInvite(n)}
                              disabled={busy === n.id}
                              data-testid={`nf-invite-accept-${n.id}`}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                            >
                              {busy === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Accept invitation
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectInvite(n)}
                              disabled={busy === n.id}
                              data-testid={`nf-invite-reject-${n.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-medium hover:bg-elevated disabled:opacity-50"
                            >
                              <X className="h-3 w-3" /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────────

const SidebarNav = ({ active, onClick, icon: Icon, label, badge, testId }: any) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={cn(
      'mb-0.5 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors',
      active
        ? 'bg-primary/10 text-primary'
        : 'text-text-secondary hover:bg-hover hover:text-text-primary',
    )}
  >
    <Icon className="h-4 w-4" />
    <span className="flex-1 text-sm font-medium">{label}</span>
    {badge !== null && badge !== undefined && (
      <span className={cn(
        'inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
        active ? 'bg-primary text-white' : 'bg-elevated text-text-muted',
      )}>
        {badge}
      </span>
    )}
  </button>
);

const SidebarAction = ({ onClick, disabled, icon: Icon, label, hint, danger, testId }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className={cn(
      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors',
      disabled
        ? 'cursor-not-allowed text-text-muted opacity-50'
        : danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-text-secondary hover:bg-hover hover:text-text-primary',
    )}
  >
    <span className="flex items-center gap-2 text-[12px]">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
    <span className="text-[10px] text-text-muted">{hint}</span>
  </button>
);

const IconBtn = ({ children, title, onClick, disabled, testId }: any) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className="grid h-7 w-7 place-items-center rounded-md text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-50"
  >
    {children}
  </button>
);

const DetailRow = ({ label, value, mono, short }: any) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wide text-text-muted">{label}</span>
    <span className={cn(
      'text-[11px] text-text-primary',
      mono && 'font-mono',
      short && 'truncate',
    )}>
      {value ?? '—'}
    </span>
  </div>
);

export default NotificationsPage;
