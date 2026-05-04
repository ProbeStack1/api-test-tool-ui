/**
 * DigestsPanel — daily / weekly uptime summary email subscriptions.
 *
 * Why this exists: even when nothing breaks, leadership wants a Monday-
 * morning email saying "everything is green, here are last week's numbers".
 * Backend: /api/v1/monitors/digests.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Plus, Loader2, Send, Trash2, RefreshCw, X, Power, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  listDigests, createDigest, updateDigest, deleteDigest, sendDigestNow,
  type DigestView,
} from '@/services/monitor-extras.service';
import { cn } from '@/utils/cn';

const fmtAbsolute = (iso?: string | number | null): string => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
};

export const DigestsPanel = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DigestView | null>(null);

  const q = useQuery({
    queryKey: ['digests', ws?.id],
    queryFn: () => listDigests(ws!.id),
    enabled: !!ws?.id,
    refetchInterval: 15_000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteDigest(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['digests'] }); toast.success('Subscription deleted'); setConfirmDelete(null); },
    onError: (e: any) => toast.error(e?.message ?? 'Delete failed'),
  });
  const sendMut = useMutation({
    mutationFn: (id: string) => sendDigestNow(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['digests'] }); toast.success('Digest queued — recipients will receive it shortly'); },
    onError: (e: any) => toast.error(e?.message ?? 'Send failed'),
  });
  const updMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateDigest(id, { enabled }),
    onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['digests'] }); toast.success(vars.enabled ? 'Digest enabled' : 'Digest paused'); },
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  if (!ws) {
    return (
      <div className="flex h-full items-center justify-center p-8" data-testid="dg-no-workspace">
        <div className="max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-text-muted" />
          <p className="text-sm font-semibold">Pick a project</p>
          <p className="mt-1 text-xs text-text-muted">Digest subscriptions are scoped per project.</p>
        </div>
      </div>
    );
  }

  const items = q.data ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="digests-panel">
      <div className="flex items-center gap-2 border-b border-border bg-surface/30 px-6 py-2.5">
        <p className="text-[11px] text-text-muted">
          Schedule a recurring uptime summary email — daily or weekly. We aggregate the last
          24h / 7d of monitor runs and send a tidy report to your team.
        </p>
        <span className="ml-auto text-[10px] text-text-muted">{items.length} subscriptions</span>
        <Button size="sm" variant="ghost" onClick={() => q.refetch()} data-testid="dg-refresh">
          <RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} />
        </Button>
        <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)} data-testid="dg-toggle-form">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'New subscription'}
        </Button>
      </div>

      {showForm && <CreateDigestForm workspaceId={ws.id} onCreated={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['digests'] }); }} />}

      <div className="flex-1 overflow-auto p-4">
        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={() => setShowForm(true)} />
        ) : (
          <ul className="space-y-3" data-testid="dg-list">
            {items.map((d) => (
              <DigestRow
                key={d.subscriptionId}
                d={d}
                onToggle={() => updMut.mutate({ id: d.subscriptionId, enabled: !d.enabled })}
                onSendNow={() => sendMut.mutate(d.subscriptionId)}
                onDelete={() => setConfirmDelete(d)}
                isToggling={updMut.isPending && updMut.variables?.id === d.subscriptionId}
                isSending={sendMut.isPending && sendMut.variables === d.subscriptionId}
              />
            ))}
          </ul>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirmDelete(null)}
          title="Delete digest subscription?"
          description={`Recipients (${confirmDelete.recipients.join(', ')}) will stop receiving these emails.`}
          confirmText={delMut.isPending ? 'Deleting…' : 'Delete'}
          tone="danger"
          onConfirm={() => delMut.mutate(confirmDelete.subscriptionId)}
          testId="dg-confirm-delete"
        />
      )}
    </div>
  );
};

const DigestRow = ({ d, onToggle, onSendNow, onDelete, isToggling, isSending }: {
  d: DigestView; onToggle: () => void; onSendNow: () => void; onDelete: () => void;
  isToggling: boolean; isSending: boolean;
}) => (
  <li
    data-testid={`dg-row-${d.subscriptionId}`}
    className={cn(
      'rounded-2xl border bg-surface/40 p-4 transition-colors',
      d.enabled ? 'border-border hover:border-primary/30' : 'border-border/40 opacity-60',
    )}
  >
    <div className="flex items-start gap-3">
      <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1', d.enabled ? 'bg-primary/10 text-primary ring-primary/20' : 'bg-elevated text-text-muted ring-border')}>
        <Calendar className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold tracking-tight">
            {d.frequency === 'WEEKLY' ? 'Weekly digest' : 'Daily digest'}
          </h3>
          <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
            {String(d.sendHourUtc ?? 9).padStart(2, '0')}:00 UTC
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
            d.enabled ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-elevated text-text-muted',
          )}>
            {d.enabled ? 'enabled' : 'paused'}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">
          {(d.recipients ?? []).join(', ')}
        </p>
        <p className="mt-1 text-[10px] text-text-muted">
          Last sent: <span className="font-mono">{fmtAbsolute(d.lastSentAt)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onSendNow} disabled={isSending} title="Send now" data-testid={`dg-send-now-${d.subscriptionId}`}>
          {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggle} disabled={isToggling} title={d.enabled ? 'Pause' : 'Enable'} data-testid={`dg-toggle-${d.subscriptionId}`}>
          {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className={cn('h-3.5 w-3.5', d.enabled ? 'text-success' : 'text-text-muted')} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Delete" data-testid={`dg-delete-${d.subscriptionId}`}>
          <Trash2 className="h-3.5 w-3.5 text-danger" />
        </Button>
      </div>
    </div>
  </li>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center" data-testid="dg-empty">
    <Mail className="mx-auto mb-3 h-8 w-8 text-text-muted" />
    <p className="text-sm font-semibold">No digest subscriptions</p>
    <p className="mx-auto mt-1.5 max-w-sm text-xs text-text-muted">
      Schedule a recurring uptime summary email so leadership stays informed even when
      nothing breaks. Daily or weekly cadence.
    </p>
    <Button size="sm" variant="primary" onClick={onCreate} className="mt-4" data-testid="dg-empty-cta">
      <Plus className="h-3.5 w-3.5" /> Subscribe
    </Button>
  </div>
);

const CreateDigestForm = ({ workspaceId, onCreated }: { workspaceId: string; onCreated: () => void }) => {
  const [recipients, setRecipients] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('WEEKLY');
  const [hour, setHour] = useState(9);
  const mut = useMutation({
    mutationFn: () => createDigest({
      workspaceId,
      recipients: recipients.split(',').map((s) => s.trim()).filter(Boolean),
      frequency,
      sendHourUtc: hour,
      enabled: true,
    }),
    onSuccess: () => { toast.success('Subscription created'); onCreated(); },
    onError: (e: any) => toast.error(e?.message ?? 'Create failed'),
  });
  const cls = 'h-9 w-full rounded-md border border-border bg-probestack-bg px-3 text-xs shadow-inner';
  const valid = recipients.split(',').map((s) => s.trim()).filter(Boolean).length > 0;
  return (
    <form
      data-testid="dg-create-form"
      onSubmit={(e) => { e.preventDefault(); if (valid) mut.mutate(); }}
      className="grid grid-cols-1 gap-3 border-b border-border bg-probestack-bg/30 px-6 py-4 sm:grid-cols-4"
    >
      <Field label="Recipients (comma-separated)" required className="sm:col-span-2">
        <input data-testid="dg-form-recipients" required value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="leads@company.com, ops@company.com" className={cls} />
      </Field>
      <Field label="Frequency" required>
        <select data-testid="dg-form-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className={cls}>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly (Mon)</option>
        </select>
      </Field>
      <Field label="Hour (UTC)">
        <input data-testid="dg-form-hour" type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} className={cls} />
      </Field>
      <div className="sm:col-span-4 flex justify-end">
        <Button size="sm" variant="primary" type="submit" disabled={mut.isPending || !valid} data-testid="dg-form-submit">
          {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Subscribe
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
