/**
 * HeartbeatsPanel — passive / push monitors. Anyone can copy the
 * `pingUrl` into a cron job, GitHub Action, or pipeline; if a ping
 * doesn't arrive within `expectedIntervalSec + gracePeriodSec`,
 * notifications go out to the configured emails / webhooks.
 *
 * "Rohit-asleep-at-3am" coverage: a heartbeat is the *only* way to know
 * a missed nightly job — active monitors can't see that.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Plus, Loader2, Copy, RotateCw, Trash2, RefreshCw, X,
  CheckCircle2, AlertCircle, Clock, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  listHeartbeats, createHeartbeat, deleteHeartbeat, rotateHeartbeatToken,
  type HeartbeatView,
} from '@/services/monitor-extras.service';
import { cn } from '@/utils/cn';

const STATUS_TONE: Record<string, { dot: string; pill: string; icon: any; label: string }> = {
  HEALTHY: { dot: 'bg-success',    pill: 'border-success/30 bg-success/10 text-success',           icon: CheckCircle2, label: 'Healthy' },
  PENDING: { dot: 'bg-text-muted', pill: 'border-border bg-elevated text-text-muted',              icon: Clock,        label: 'Awaiting first ping' },
  MISSED:  { dot: 'bg-danger',     pill: 'border-danger/30 bg-danger/10 text-danger animate-pulse', icon: AlertCircle,  label: 'Ping missed' },
};

const fmtRelative = (iso?: string | number | null): string => {
  if (!iso) return '—';
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

export const HeartbeatsPanel = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<HeartbeatView | null>(null);
  const [revealedToken, setRevealedToken] = useState<HeartbeatView | null>(null);

  const q = useQuery({
    queryKey: ['heartbeats', ws?.id],
    queryFn: () => listHeartbeats(ws!.id),
    enabled: !!ws?.id,
    refetchInterval: 8_000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteHeartbeat(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['heartbeats'] }); toast.success('Heartbeat deleted'); setConfirmDelete(null); },
    onError: (e: any) => toast.error(e?.message ?? 'Delete failed'),
  });
  const rotMut = useMutation({
    mutationFn: (id: string) => rotateHeartbeatToken(id),
    onSuccess: (h) => { qc.invalidateQueries({ queryKey: ['heartbeats'] }); setRevealedToken(h); toast.success('Token rotated — copy the new URL now'); },
    onError: (e: any) => toast.error(e?.message ?? 'Rotate failed'),
  });

  if (!ws) {
    return (
      <div className="flex h-full items-center justify-center p-8" data-testid="hb-no-workspace">
        <div className="max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-text-muted" />
          <p className="text-sm font-semibold">Pick a project</p>
          <p className="mt-1 text-xs text-text-muted">Heartbeats are scoped per project.</p>
        </div>
      </div>
    );
  }

  const items = q.data ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="heartbeats-panel">
      <div className="flex items-center gap-2 border-b border-border bg-surface/30 px-6 py-2.5">
        <p className="text-[11px] text-text-muted">
          Push monitors. Each heartbeat exposes a unique <code className="rounded bg-elevated px-1 font-mono">/ping/{'{token}'}</code> URL —
          drop it into your cron job and we&rsquo;ll alert when it stops checking in.
        </p>
        <span className="ml-auto text-[10px] text-text-muted">{items.length} heartbeats</span>
        <Button size="sm" variant="ghost" onClick={() => q.refetch()} data-testid="hb-refresh">
          <RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} />
        </Button>
        <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)} data-testid="hb-toggle-form">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'New heartbeat'}
        </Button>
      </div>

      {showForm && (
        <CreateHeartbeatForm
          workspaceId={ws.id}
          onCreated={(h) => { setShowForm(false); setRevealedToken(h); qc.invalidateQueries({ queryKey: ['heartbeats'] }); }}
        />
      )}

      <div className="flex-1 overflow-auto p-4">
        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={() => setShowForm(true)} />
        ) : (
          <ul className="space-y-3" data-testid="hb-list">
            {items.map((h) => (
              <HeartbeatRow
                key={h.heartbeatId}
                hb={h}
                onDelete={() => setConfirmDelete(h)}
                onRotate={() => rotMut.mutate(h.heartbeatId)}
                isRotating={rotMut.isPending && rotMut.variables === h.heartbeatId}
              />
            ))}
          </ul>
        )}
      </div>

      {revealedToken && (
        <TokenRevealModal
          hb={revealedToken}
          onClose={() => setRevealedToken(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirmDelete(null)}
          title="Delete heartbeat?"
          description={`The ping URL for "${confirmDelete.name}" will stop accepting pings. This can't be undone.`}
          confirmText={delMut.isPending ? 'Deleting…' : 'Delete'}
          tone="danger"
          onConfirm={() => delMut.mutate(confirmDelete.heartbeatId)}
          testId="hb-confirm-delete"
        />
      )}
    </div>
  );
};

const HeartbeatRow = ({ hb, onDelete, onRotate, isRotating }: {
  hb: HeartbeatView; onDelete: () => void; onRotate: () => void; isRotating: boolean;
}) => {
  const tone = STATUS_TONE[hb.status] ?? STATUS_TONE.PENDING;
  const Icon = tone.icon;
  return (
    <li
      data-testid={`hb-row-${hb.heartbeatId}`}
      className="rounded-2xl border border-border bg-surface/40 p-4 transition-colors hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1', tone.pill)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold tracking-tight" data-testid={`hb-row-name-${hb.heartbeatId}`}>{hb.name}</h3>
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider', tone.pill)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} /> {tone.label}
            </span>
            <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
              every {hb.expectedIntervalSec}s
            </span>
            {hb.gracePeriodSec ? (
              <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                grace {hb.gracePeriodSec}s
              </span>
            ) : null}
          </div>
          {hb.description && (
            <p className="mt-1 line-clamp-1 text-[11px] text-text-secondary">{hb.description}</p>
          )}
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-text-muted sm:grid-cols-4">
            <KV k="Last ping">{fmtRelative(hb.lastPingAt)}</KV>
            <KV k="Total pings">{hb.totalPings ?? 0}</KV>
            <KV k="Emails">{(hb.notificationEmails ?? []).length || '—'}</KV>
            <KV k="Webhooks">{(hb.notificationWebhooks ?? []).length || '—'}</KV>
          </dl>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onRotate} disabled={isRotating} title="Rotate token" data-testid={`hb-rotate-${hb.heartbeatId}`}>
            {isRotating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Delete" data-testid={`hb-delete-${hb.heartbeatId}`}>
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      </div>
    </li>
  );
};

const KV = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-[9px] uppercase tracking-wider text-text-muted">{k}</dt>
    <dd className="font-mono text-[11px] text-text-secondary">{children}</dd>
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center" data-testid="hb-empty">
    <Heart className="mx-auto mb-3 h-8 w-8 text-text-muted" />
    <p className="text-sm font-semibold">No heartbeats yet</p>
    <p className="mx-auto mt-1.5 max-w-sm text-xs text-text-muted">
      Create one and we&rsquo;ll give you a unique ping URL. Drop it into your cron job /
      pipeline; if a ping is missed you&rsquo;ll get an alert via email + webhooks.
    </p>
    <Button size="sm" variant="primary" onClick={onCreate} className="mt-4" data-testid="hb-empty-cta">
      <Plus className="h-3.5 w-3.5" /> Create your first heartbeat
    </Button>
  </div>
);

const CreateHeartbeatForm = ({ workspaceId, onCreated }: {
  workspaceId: string; onCreated: (h: HeartbeatView) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intervalSec, setIntervalSec] = useState(3600);
  const [graceSec, setGraceSec] = useState(300);
  const [emailsCsv, setEmailsCsv] = useState('');
  const [webhooksCsv, setWebhooksCsv] = useState('');
  const mut = useMutation({
    mutationFn: () => createHeartbeat({
      workspaceId, name, description: description || undefined,
      expectedIntervalSec: intervalSec, gracePeriodSec: graceSec,
      notificationEmails: emailsCsv.trim() ? emailsCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      notificationWebhooks: webhooksCsv.trim() ? webhooksCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    }),
    onSuccess: (h) => { toast.success('Heartbeat created — copy the ping URL now'); onCreated(h); },
    onError: (e: any) => toast.error(e?.message ?? 'Create failed'),
  });

  const cls = 'h-9 w-full rounded-md border border-border bg-probestack-bg px-3 text-xs shadow-inner';
  return (
    <form
      data-testid="hb-create-form"
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="grid grid-cols-1 gap-3 border-b border-border bg-probestack-bg/30 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Field label="Name" required>
        <input data-testid="hb-form-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly DB backup" className={cls} />
      </Field>
      <Field label="Expected interval (seconds)" required>
        <input data-testid="hb-form-interval" type="number" min={10} required value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value))} className={cls} />
      </Field>
      <Field label="Grace period (seconds)">
        <input data-testid="hb-form-grace" type="number" min={0} value={graceSec} onChange={(e) => setGraceSec(Number(e.target.value))} className={cls} />
      </Field>
      <Field label="Description" className="sm:col-span-2 lg:col-span-3">
        <input data-testid="hb-form-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this heartbeat watch?" className={cls} />
      </Field>
      <Field label="Notification emails (comma-separated)" className="sm:col-span-1 lg:col-span-2">
        <input data-testid="hb-form-emails" value={emailsCsv} onChange={(e) => setEmailsCsv(e.target.value)} placeholder="ops@company.com, oncall@company.com" className={cls} />
      </Field>
      <Field label="Notification webhooks (comma-separated)" className="sm:col-span-2 lg:col-span-2">
        <input data-testid="hb-form-webhooks" value={webhooksCsv} onChange={(e) => setWebhooksCsv(e.target.value)} placeholder="https://hooks.slack.com/services/…" className={cls} />
      </Field>
      <div className="flex items-end">
        <Button size="sm" variant="primary" type="submit" disabled={mut.isPending || !name.trim()} data-testid="hb-form-submit" className="w-full">
          {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create
        </Button>
      </div>
    </form>
  );
};

const Field = ({ label, required, className, children }: {
  label: string; required?: boolean; className?: string; children: React.ReactNode;
}) => (
  <label className={cn('block', className)}>
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      {label} {required && <span className="text-danger">*</span>}
    </span>
    {children}
  </label>
);

const TokenRevealModal = ({ hb, onClose }: { hb: HeartbeatView; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const url = hb.pingUrl ?? '';
  const onCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div data-testid="hb-token-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-primary/30 bg-surface p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Heart className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Copy your ping URL — shown once</h2>
            <p className="mt-1 text-xs text-text-muted">
              We will never reveal this token again. Drop the URL below into your cron job
              (any HTTP method works).
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" data-testid="hb-token-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-probestack-bg p-3">
          <code data-testid="hb-token-url" className="flex-1 truncate font-mono text-[11px] text-text-primary">{url || '(no URL returned)'}</code>
          <Button size="sm" variant={copied ? 'primary' : 'outline'} onClick={onCopy} data-testid="hb-token-copy">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="mt-3 rounded-md border border-border bg-elevated/40 p-3 font-mono text-[10px] text-text-muted">
          <span className="text-text-secondary"># cron example</span>
          <br />
          0 * * * * curl -fsS {url || 'https://…/ping/<token>'} {'>'}/dev/null
        </div>
      </div>
    </div>
  );
};
