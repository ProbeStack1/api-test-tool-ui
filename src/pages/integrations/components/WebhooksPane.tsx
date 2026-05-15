/**
 * WebhooksPane — full CRUD for HMAC-signed webhook subscriptions.
 *
 * Surfaces:
 *   - List + new-webhook inline form (multi-select event chips driven by
 *     the live event catalog from the backend).
 *   - SecretRevealModal (shown ONCE on create / rotate-secret).
 *   - DeliveriesDrawer with replay + auto-refresh.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Webhook, Plus, RefreshCw, Loader2, Send, RotateCw, Trash2,
  Pause, Play, X, Copy, CheckCircle2, Activity, FileCode2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  listWebhooks, createWebhook, pingWebhook, rotateWebhookSecret, pauseWebhook,
  resumeWebhook, deleteWebhook, webhookDeliveries, replayDelivery, eventCatalog,
  type WebhookView, type DeliveryView,
} from '@/services/iwh.service';
import { Field, KV, EmptyShell, fmtRelative, inputCls } from './_shared';
import { useSavedWebhookUrls } from '@/hooks/useSavedWebhookUrls';
import { WebhookReplayDrawer } from './WebhookReplayDrawer';
import { cn } from '@/utils/cn';

export const WebhooksPane = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [secretReveal, setSecretReveal] = useState<WebhookView | null>(null);
  const [drilldown, setDrilldown] = useState<WebhookView | null>(null);
  const [replay, setReplay] = useState<WebhookView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WebhookView | null>(null);

  const q = useQuery({
    queryKey: ['iwh', 'webhooks', workspaceId],
    queryFn: () => listWebhooks(workspaceId),
    refetchInterval: 12_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['iwh'] });
  const pauseMut  = useMutation({ mutationFn: (id: string) => pauseWebhook(id),         onSuccess: () => { invalidate(); toast.success('Webhook paused'); } });
  const resumeMut = useMutation({ mutationFn: (id: string) => resumeWebhook(id),        onSuccess: () => { invalidate(); toast.success('Webhook resumed'); } });
  const pingMut   = useMutation({ mutationFn: (id: string) => pingWebhook(id),          onSuccess: () => toast.success('Ping queued — see Deliveries'), onError: (e: any) => toast.error(e?.message ?? 'Ping failed') });
  const rotateMut = useMutation({ mutationFn: (id: string) => rotateWebhookSecret(id),  onSuccess: (h) => { invalidate(); setSecretReveal(h); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteWebhook(id),        onSuccess: () => { invalidate(); toast.success('Webhook deleted'); setConfirmDelete(null); } });

  const items = q.data?.content ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="iwh-webhooks">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <h1 className="text-base font-semibold">Webhooks</h1>
        <span className="text-[11px] text-text-muted">· HMAC-signed outbound deliveries to your endpoints</span>
        <span className="ml-auto text-[10px] text-text-muted">{items.length} subscribers</span>
        <Button size="sm" variant="ghost" onClick={() => q.refetch()} data-testid="iwh-webhooks-refresh">
          <RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} />
        </Button>
        <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)} data-testid="iwh-webhooks-toggle-form">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'New webhook'}
        </Button>
      </header>

      {showForm && (
        <CreateWebhookForm workspaceId={workspaceId} onCreated={(w) => {
          setShowForm(false); setSecretReveal(w); invalidate();
        }} />
      )}

      <div className="flex-1 overflow-auto p-4">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : items.length === 0 ? (
          <EmptyShell
            testId="iwh-webhooks-empty"
            icon="webhook"
            title="No webhooks yet"
            body="Subscribe an HTTPS endpoint to ForgeFuzz events — monitor failures, heartbeat misses, audit changes."
            steps={[
              'Click "New webhook" and paste your endpoint URL',
              'Pick the events you want delivered',
              'Copy the signing secret (shown once) for HMAC verification',
            ]}
            ctaLabel="+ Create webhook"
            onCta={() => document.querySelector<HTMLButtonElement>('[data-testid="iwh-webhooks-toggle-form"]')?.click()}
          />
        ) : (
          <ul className="space-y-3" data-testid="iwh-webhooks-list">
            {items.map((w) => (
              <WebhookRow
                key={w.subscriptionId}
                w={w}
                onPause={() => pauseMut.mutate(w.subscriptionId)}
                onResume={() => resumeMut.mutate(w.subscriptionId)}
                onPing={() => pingMut.mutate(w.subscriptionId)}
                onRotate={() => rotateMut.mutate(w.subscriptionId)}
                onDelete={() => setConfirmDelete(w)}
                onDrilldown={() => setDrilldown(w)}
                onReplay={() => setReplay(w)}
              />
            ))}
          </ul>
        )}
      </div>

      {secretReveal && <SecretRevealModal hook={secretReveal} onClose={() => setSecretReveal(null)} />}
      {drilldown && <DeliveriesDrawer hook={drilldown} onClose={() => setDrilldown(null)} />}
      {replay && <WebhookReplayDrawer hook={replay} onClose={() => setReplay(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirmDelete(null)}
          title="Delete webhook?"
          description={`"${confirmDelete.name}" will stop receiving deliveries. Past delivery history is preserved.`}
          confirmText={deleteMut.isPending ? 'Deleting…' : 'Delete'}
          tone="danger"
          onConfirm={() => deleteMut.mutate(confirmDelete.subscriptionId)}
          testId="iwh-webhook-confirm-delete"
        />
      )}
    </div>
  );
};

const WebhookRow = ({ w, onPause, onResume, onPing, onRotate, onDelete, onDrilldown, onReplay }: {
  w: WebhookView; onPause: () => void; onResume: () => void; onPing: () => void;
  onRotate: () => void; onDelete: () => void; onDrilldown: () => void; onReplay: () => void;
}) => {
  const isActive = w.status === 'ACTIVE';
  return (
    <li data-testid={`iwh-webhook-row-${w.subscriptionId}`}
      className={cn('rounded-2xl border bg-surface/40 p-4 transition-colors', isActive ? 'border-border hover:border-primary/30' : 'border-border/40 opacity-70')}>
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1', isActive ? 'bg-primary/10 text-primary ring-primary/20' : 'bg-elevated text-text-muted ring-border')}>
          <Webhook className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold tracking-tight" data-testid={`iwh-webhook-name-${w.subscriptionId}`}>{w.name}</h3>
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
              isActive ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-elevated text-text-muted')}>
              {w.status}
            </span>
            {(w.events ?? []).slice(0, 3).map((e) => (
              <span key={e} className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{e}</span>
            ))}
            {(w.events ?? []).length > 3 && <span className="text-[9px] text-text-muted">+{(w.events ?? []).length - 3} more</span>}
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-text-secondary">{w.url}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 text-[10px] text-text-muted sm:grid-cols-4">
            <KV k="Success">{w.successCount ?? 0}</KV>
            <KV k="Failures">{w.failureCount ?? 0}</KV>
            <KV k="Last delivery">{fmtRelative(w.lastDeliveryAt)}</KV>
            <KV k="Retry policy">{w.retryPolicy ?? 'EXPONENTIAL'}</KV>
          </dl>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onDrilldown} title="Deliveries" data-testid={`iwh-webhook-drilldown-${w.subscriptionId}`}>
            <Activity className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onPing} title="Send test ping" data-testid={`iwh-webhook-ping-${w.subscriptionId}`}>
            <Send className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onReplay} title="Test with custom payload" data-testid={`iwh-webhook-replay-${w.subscriptionId}`}>
            <FileCode2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={isActive ? onPause : onResume} title={isActive ? 'Pause' : 'Resume'} data-testid={`iwh-webhook-toggle-${w.subscriptionId}`}>
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onRotate} title="Rotate secret" data-testid={`iwh-webhook-rotate-${w.subscriptionId}`}>
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Delete" data-testid={`iwh-webhook-delete-${w.subscriptionId}`}>
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      </div>
    </li>
  );
};

const CreateWebhookForm = ({ workspaceId, onCreated }: { workspaceId: string; onCreated: (w: WebhookView) => void }) => {
  const catalogQ = useQuery({ queryKey: ['iwh', 'catalog'], queryFn: eventCatalog, staleTime: 60_000 });
  const allEvents = useMemo(() => (catalogQ.data?.events ?? []).map((e) => e.type), [catalogQ.data]);
  const saved = useSavedWebhookUrls();
  const [showSaved, setShowSaved] = useState(false);
  const [saveForLater, setSaveForLater] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [retryPolicy, setRetryPolicy] = useState<'EXPONENTIAL' | 'LINEAR' | 'NONE'>('EXPONENTIAL');
  const [maxRetries, setMaxRetries] = useState(5);

  // Pre-select 3 sensible defaults once the catalog arrives
  useMemo(() => {
    if (selected.size === 0 && allEvents.length > 0) {
      const defaults = ['monitor.down', 'incident.opened', 'test.run.failed']
        .filter((e) => allEvents.includes(e));
      if (defaults.length > 0) setSelected(new Set(defaults));
    }
  }, [allEvents, selected.size]);

  const toggleEvent = (ev: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(ev) ? next.delete(ev) : next.add(ev);
    return next;
  });

  const mut = useMutation({
    mutationFn: () => createWebhook({
      workspaceId, name, url,
      events: Array.from(selected),
      retryPolicy, maxRetries,
    }),
    onSuccess: (w) => {
      if (saveForLater && url) saved.add({ label: saveLabel.trim() || name, url });
      toast.success('Webhook created — copy your signing secret now'); onCreated(w);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Create failed'),
  });

  return (
    <form data-testid="iwh-webhook-form"
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="space-y-3 border-b border-border bg-probestack-bg/30 px-6 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Name" required>
          <input data-testid="iwh-webhook-form-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="On-call PagerDuty bridge" />
        </Field>
        <Field label="URL" required className="sm:col-span-2">
          <div className="flex items-center gap-1.5">
            <input data-testid="iwh-webhook-form-url" required type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} placeholder="https://hooks.example.com/..." />
            {saved.list.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSaved((v) => !v)}
                  className="h-9 shrink-0 rounded-md border border-primary/40 bg-primary/[0.06] px-2 text-[10px] font-medium text-primary hover:bg-primary/[0.12]"
                  title="Pick from your saved URLs"
                  data-testid="iwh-webhook-form-saved-toggle"
                >
                  Saved ({saved.list.length})
                </button>
                {showSaved && (
                  <div data-testid="iwh-webhook-form-saved-menu" className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-surface p-1 shadow-2xl">
                    <ul className="max-h-60 overflow-auto">
                      {saved.list.map((s) => (
                        <li key={s.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setUrl(s.url); if (!name) setName(s.label); setShowSaved(false); }}
                            className="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 text-left hover:bg-hover"
                          >
                            <span className="truncate text-[11px] font-medium">{s.label}</span>
                            <span className="truncate font-mono text-[9px] text-text-muted">{s.url}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => saved.remove(s.id)}
                            className="px-1.5 py-1 text-text-muted hover:text-danger"
                            title="Remove preset"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-text-muted">
            <input
              type="checkbox"
              checked={saveForLater}
              onChange={(e) => setSaveForLater(e.target.checked)}
              className="h-3 w-3 rounded border-border bg-probestack-bg accent-primary"
              data-testid="iwh-webhook-form-save-checkbox"
            />
            Save this URL for next time
          </label>
          {saveForLater && (
            <input
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="Preset label (e.g. 'Slack on-call', 'webhook.site demo')"
              className={cn(inputCls, 'mt-1 h-7 text-[11px]')}
              data-testid="iwh-webhook-form-save-label"
            />
          )}
        </Field>
        <Field label="Retry policy">
          <select data-testid="iwh-webhook-form-retry" value={retryPolicy} onChange={(e) => setRetryPolicy(e.target.value as any)} className={inputCls}>
            <option value="EXPONENTIAL">Exponential</option>
            <option value="LINEAR">Linear</option>
            <option value="NONE">None</option>
          </select>
        </Field>
        <Field label="Max retries">
          <input data-testid="iwh-webhook-form-retries" type="number" min={0} max={20} value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      <div>
        <span className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Events <span className="text-danger">*</span>
          <span className="font-mono text-[9px] normal-case tracking-normal text-text-muted">— pick at least one</span>
        </span>
        <div className="flex flex-wrap gap-1.5" data-testid="iwh-webhook-form-events">
          {catalogQ.isLoading && <span className="text-[10px] text-text-muted">Loading event catalog…</span>}
          {allEvents.length === 0 && !catalogQ.isLoading && (
            <span className="text-[10px] text-danger">No events exposed by backend.</span>
          )}
          {allEvents.map((ev) => {
            const on = selected.has(ev);
            return (
              <button
                key={ev}
                type="button"
                data-testid={`iwh-webhook-form-event-${ev}`}
                onClick={() => toggleEvent(ev)}
                className={cn(
                  'rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors',
                  on
                    ? 'border-primary/40 bg-primary/[0.08] text-primary'
                    : 'border-border bg-elevated text-text-muted hover:border-primary/30 hover:text-primary',
                )}
              >
                {ev}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="text-[10px] text-text-muted">{selected.size} event{selected.size === 1 ? '' : 's'} selected</span>
        <Button size="sm" variant="primary" type="submit"
          disabled={mut.isPending || !name.trim() || !url.trim() || selected.size === 0}
          data-testid="iwh-webhook-form-submit">
          {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create
        </Button>
      </div>
    </form>
  );
};

const SecretRevealModal = ({ hook, onClose }: { hook: WebhookView; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const secret = hook.signingSecret ?? '';
  const onCopy = () => { navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div data-testid="iwh-webhook-secret-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-primary/30 bg-surface p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Webhook className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Copy your signing secret — shown ONCE</h2>
            <p className="mt-1 text-xs text-text-muted">Use this to verify the <code className="rounded bg-elevated px-1 font-mono">X-ForgeFuzz-Signature</code> header on incoming deliveries.</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" data-testid="iwh-webhook-secret-close"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-probestack-bg p-3">
          <code data-testid="iwh-webhook-secret-value" className="flex-1 truncate font-mono text-[11px]">{secret || '(no secret returned)'}</code>
          <Button size="sm" variant={copied ? 'primary' : 'outline'} onClick={onCopy} data-testid="iwh-webhook-secret-copy">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="mt-3 font-mono text-[10px] text-text-muted">
          Verify with HMAC-SHA256: <code className="rounded bg-elevated px-1">hmac(secret, body) == X-ForgeFuzz-Signature</code>
        </p>
      </div>
    </div>
  );
};

const DeliveriesDrawer = ({ hook, onClose }: { hook: WebhookView; onClose: () => void }) => {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['iwh', 'deliveries', hook.subscriptionId],
    queryFn: () => webhookDeliveries(hook.subscriptionId, 0, 50),
    refetchInterval: 6_000,
  });
  const replayMut = useMutation({
    mutationFn: (id: string) => replayDelivery(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['iwh', 'deliveries'] }); toast.success('Delivery replayed'); },
    onError: (e: any) => toast.error(e?.message ?? 'Replay failed'),
  });
  const items = q.data?.content ?? [];
  return (
    <div data-testid="iwh-deliveries-drawer" className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface shadow-2xl">
        <header className="flex items-center gap-2 border-b border-border bg-surface/80 px-4 py-3">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Deliveries · {hook.name}</h2>
          <span className="text-[11px] text-text-muted">{q.data?.totalElements ?? 0} total</span>
          <button onClick={onClose} data-testid="iwh-deliveries-close" className="ml-auto rounded p-1 text-text-muted hover:bg-hover hover:text-text-primary"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-auto p-3" data-testid="iwh-deliveries-body">
          {q.isLoading ? <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-text-muted" /> :
            items.length === 0 ? <p className="p-6 text-center text-[11px] text-text-muted">No deliveries yet — click <Send className="inline h-3 w-3 align-text-bottom" /> Send test ping on the webhook row.</p> :
            <ul className="space-y-2">{items.map((d: DeliveryView) => <DeliveryRow key={d.deliveryId} d={d} onReplay={() => replayMut.mutate(d.deliveryId)} replaying={replayMut.isPending && replayMut.variables === d.deliveryId} />)}</ul>
          }
        </div>
      </div>
    </div>
  );
};

const DeliveryRow = ({ d, onReplay, replaying }: { d: DeliveryView; onReplay: () => void; replaying: boolean }) => {
  const ok = d.status === 'SUCCESS';
  return (
    <li data-testid={`iwh-delivery-row-${d.deliveryId}`} className="rounded-md border border-border bg-surface/40 p-3 text-[11px]">
      <div className="flex items-center gap-2">
        <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase',
          ok ? 'border-success/30 bg-success/10 text-success' :
          d.status === 'PENDING' ? 'border-border bg-elevated text-text-muted' :
          'border-danger/30 bg-danger/10 text-danger')}>{d.status}</span>
        <span className="font-mono text-[10px] text-text-muted">{d.eventType}</span>
        {d.responseStatus != null && <span className="font-mono text-[10px] text-text-muted">→ HTTP {d.responseStatus}</span>}
        {d.durationMs != null && <span className="font-mono text-[10px] text-text-muted">{d.durationMs}ms</span>}
        <span className="ml-auto text-[10px] text-text-muted">{fmtRelative(d.createdAt)}</span>
        <Button size="sm" variant="ghost" onClick={onReplay} disabled={replaying} title="Replay" data-testid={`iwh-delivery-replay-${d.deliveryId}`}>
          {replaying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
        </Button>
      </div>
      {d.errorMessage && <p className="mt-1 rounded bg-danger/5 p-2 text-[10px] text-danger">{d.errorMessage}</p>}
      {d.responseBodySnippet && <pre className="mt-1 max-h-24 overflow-auto rounded bg-elevated p-2 font-mono text-[9px] text-text-secondary">{d.responseBodySnippet}</pre>}
    </li>
  );
};
