/**
 * WebhooksView — per-workspace webhook subscriptions for run lifecycle
 * events (CI/CD integration, Slack/Discord pings, etc.).
 *
 * Each webhook has:
 *   • URL (POST target)
 *   • Events subscribed (run.queued / started / completed / failed / …)
 *   • Optional HMAC-SHA256 shared secret (used for signing the payload)
 *   • Auto-disable after 5 consecutive delivery failures
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Webhook as WebhookIcon, Plus, Trash2, Save, Send, Loader2, AlertTriangle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listWebhooks, createWebhook, deleteWebhook, updateWebhook, testWebhook,
  fetchCatalog,
  type WebhookSub, type Catalog,
} from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';

const DEFAULT_EVENTS = ['run.completed', 'run.failed'];

export const WebhooksView = ({ workspaceId }: { workspaceId: string }) => {
  const [hooks, setHooks]   = useState<WebhookSub[]>([]);
  const [cat, setCat]       = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [w, c] = await Promise.all([
        listWebhooks(workspaceId).catch(() => [] as WebhookSub[]),
        fetchCatalog(workspaceId).catch(() => null),
      ]);
      setHooks(Array.isArray(w) ? w : []);
      setCat(c);
    } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleToggle = async (h: WebhookSub) => {
    const next = !h.isActive;
    setHooks((prev) => prev.map((x) => x.id === h.id ? { ...x, isActive: next } : x));
    try {
      await updateWebhook(workspaceId, h.id, { isActive: next });
      toast.success(next ? 'Webhook enabled' : 'Webhook paused');
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
      fetch();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    const prev = hooks;
    setHooks((p) => p.filter((x) => x.id !== id));
    try {
      await deleteWebhook(workspaceId, id);
      toast.success('Webhook deleted');
    } catch (e: any) {
      setHooks(prev);
      toast.error('Failed', { description: e?.message ?? '' });
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const r = await testWebhook(workspaceId, id);
      if (r.ok) toast.success(`Test fired · HTTP ${r.statusCode ?? '?'}`);
      else      toast.error(`Delivery failed${r.statusCode ? ` · HTTP ${r.statusCode}` : ''}`, { description: r.error });
      fetch();
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setTesting(null); }
  };

  return (
    <div className="p-6" data-testid="ai-testing-webhooks-view">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-xs text-text-muted">
            POSTed when a run starts, completes, fails or is baselined. Signed with HMAC-SHA256
            if you provide a secret. Auto-disabled after 5 consecutive failures.
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)}
                data-testid="ai-testing-webhook-create-btn"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90">
          <Plus className="h-3 w-3" /> New webhook
        </button>
      </div>

      {loading ? (
        <div className="mt-10 grid place-items-center text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : hooks.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center text-[12px] text-text-muted"
             data-testid="ai-testing-webhooks-empty">
          <WebhookIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No webhooks yet. Wire one up to ship run results into Slack, Discord, Jira, or your CI/CD.
        </div>
      ) : (
        <ul className="mt-5 space-y-2" data-testid="ai-testing-webhooks-list">
          {hooks.map((h) => (
            <li key={h.id}
                data-testid={`ai-testing-webhook-row-${h.id}`}
                className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-md',
                  h.isActive ? 'bg-success/10 text-success' : 'bg-elevated text-text-muted',
                )}>
                  <WebhookIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate font-mono text-[12px] font-semibold">{h.url}</div>
                    {!h.isActive && (
                      <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                        paused
                      </span>
                    )}
                    {(h.failureCount ?? 0) >= 3 && (
                      <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                        <AlertTriangle className="h-2.5 w-2.5" /> {h.failureCount} failures
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {h.events.map((e) => (
                      <span key={e} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                        {e}
                      </span>
                    ))}
                  </div>
                  {h.description && (
                    <p className="mt-1 truncate text-[11px] text-text-muted">{h.description}</p>
                  )}
                  {h.lastTriggeredAt && (
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      last fired {new Date(h.lastTriggeredAt).toLocaleString()}
                      {h.lastStatusCode && <> · HTTP {h.lastStatusCode}</>}
                      {h.lastError && <> · <span className="text-danger">{h.lastError}</span></>}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => handleTest(h.id)} disabled={testing === h.id}
                          data-testid={`ai-testing-webhook-test-${h.id}`}
                          title="Fire a test event"
                          className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-secondary hover:bg-elevated disabled:opacity-50">
                    {testing === h.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  </button>
                  <button type="button" onClick={() => handleToggle(h)}
                          data-testid={`ai-testing-webhook-toggle-${h.id}`}
                          title={h.isActive ? 'Pause' : 'Enable'}
                          className={cn(
                            'rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors',
                            h.isActive
                              ? 'border-success/40 bg-success/10 text-success hover:bg-success/20'
                              : 'border-border bg-surface text-text-secondary hover:bg-elevated',
                          )}>
                    {h.isActive ? 'On' : 'Off'}
                  </button>
                  <button type="button" onClick={() => handleDelete(h.id)}
                          data-testid={`ai-testing-webhook-delete-${h.id}`}
                          className="grid h-7 w-7 place-items-center rounded-md border border-border text-danger hover:bg-danger/10"
                          title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <CreateWebhookModal
          workspaceId={workspaceId}
          catalog={cat}
          onClose={() => setCreating(false)}
          onSaved={(h) => { setHooks((p) => [h, ...p]); setCreating(false); }}
        />
      )}
    </div>
  );
};

const CreateWebhookModal = ({ workspaceId, catalog, onClose, onSaved }: {
  workspaceId: string;
  catalog: Catalog | null;
  onClose: () => void;
  onSaved: (h: WebhookSub) => void;
}) => {
  const [url, setUrl]         = useState('https://');
  const [events, setEvents]   = useState<string[]>(DEFAULT_EVENTS);
  const [secret, setSecret]   = useState('');
  const [desc, setDesc]       = useState('');
  const [busy, setBusy]       = useState(false);

  const allEvents: string[] =
    (catalog as any)?.webhookEvents ??
    ['run.queued','run.started','run.completed','run.failed','run.cancelled','run.baselined'];

  const toggle = (ev: string) => setEvents((p) => p.includes(ev) ? p.filter((x) => x !== ev) : [...p, ev]);

  const submit = async () => {
    if (!url.trim() || events.length === 0) return;
    setBusy(true);
    try {
      const h = await createWebhook(workspaceId, {
        url: url.trim(), events, secret: secret.trim() || undefined,
        description: desc.trim() || undefined,
      });
      toast.success('Webhook created');
      onSaved(h);
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4"
         data-testid="ai-testing-webhook-create-modal">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WebhookIcon className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">New webhook</h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3">
          <Field label="POST URL">
            <input value={url} onChange={(e) => setUrl(e.target.value)}
                   data-testid="ai-testing-webhook-url"
                   placeholder="https://hooks.example.com/forgefuzz"
                   className={inputCls} />
          </Field>

          <Field label="Events">
            <div className="flex flex-wrap gap-1.5" data-testid="ai-testing-webhook-events">
              {allEvents.map((ev) => (
                <button key={ev} type="button" onClick={() => toggle(ev)}
                        className={cn(
                          'rounded-md border px-2 py-1 font-mono text-[10px] transition-colors',
                          events.includes(ev)
                            ? 'border-primary/40 bg-primary-muted text-primary'
                            : 'border-border bg-surface text-text-secondary hover:bg-elevated',
                        )}>
                  {ev}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Shared secret (optional · used for HMAC-SHA256)">
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
                   placeholder="whsec_…"
                   className={inputCls} />
          </Field>

          <Field label="Description (optional)">
            <input value={desc} onChange={(e) => setDesc(e.target.value)}
                   placeholder="Slack #ci-bots channel"
                   className={inputCls} />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || !url.trim() || events.length === 0}
                  data-testid="ai-testing-webhook-save"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: any) => (
  <div>
    <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
    {children}
  </div>
);
const inputCls =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary';
