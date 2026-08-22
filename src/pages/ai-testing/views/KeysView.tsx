/**
 * KeysView — per-workspace LLM provider key registry.
 *
 * - Strictly user-provided: paste your OpenAI / Anthropic / Google secret.
 * - Stored AES-GCM encrypted on the backend; only the masked last4 is
 *   ever returned by the API.
 * - One active key per provider; adding a new one auto-revokes the old.
 *
 * No "Universal" / "Emergent" fallback wording — the workspace's own
 * runtime configuration decides what happens when a provider isn't
 * configured.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound, Plus, Trash2, ShieldCheck, Loader2, Save, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createKey, listKeys, revokeKey,
  type ApiKey,
} from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const PROVIDERS = [
  { id: 'openai',    label: 'OpenAI',          hint: 'Starts with sk-… — https://platform.openai.com/api-keys' },
  { id: 'anthropic', label: 'Anthropic',       hint: 'Starts with sk-ant-… — https://console.anthropic.com/' },
  { id: 'google',    label: 'Google Gemini',   hint: 'Starts with AIza… — https://aistudio.google.com/app/apikey' },
];

export const KeysView = ({ workspaceId }: { workspaceId: string }) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const confirm = useConfirm();

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const k = await listKeys(workspaceId);
      // Backend may return null on edge cases; never rely on truthy chain.
      setKeys(Array.isArray(k) ? k : []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleRevoke = async (id: string) => {
    const ok = await confirm({
      title: 'Revoke this API key?',
      description: 'Future runs in this workspace will fail with a 401 until a new key is added for the same provider.',
      confirmText: 'Revoke key',
      tone: 'danger',
      testId: 'key-revoke-confirm',
    });
    if (!ok) return;
    const prev = keys;
    setKeys((p) => p.filter((k) => k.id !== id));
    try {
      await revokeKey(workspaceId, id);
      toast.success('Key revoked');
    } catch (e: any) {
      setKeys(prev);
      toast.error('Failed', { description: e?.message ?? '' });
    }
  };

  const grouped = PROVIDERS.map((p) => ({
    ...p,
    activeKey: keys.find((k) => k.provider === p.id && !k.revokedAt) || null,
  }));

  return (
    <div className="p-6" data-testid="ai-testing-keys-view">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">API keys & configuration</h2>
          <p className="text-xs text-text-muted">
            Add your own LLM provider keys. Stored AES-GCM encrypted; only the last 4 characters are visible after creation.
          </p>
        </div>
        <button type="button" onClick={() => setAdding(true)}
                data-testid="ai-testing-add-key-btn"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90">
          <Plus className="h-3 w-3" /> Add key
        </button>
      </div>

      <div className="mt-4 rounded-md border border-border/60 bg-surface p-3 text-[11px] text-text-secondary">
        <Info className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
        Without a provider key, runs targeting that provider will fail. Add the
        keys you control here — one active key per provider; adding a new one
        automatically revokes the previous one.
      </div>

      {loading ? (
        <div className="mt-10 grid place-items-center text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <ul className="mt-5 space-y-2" data-testid="ai-testing-keys-list">
          {grouped.map((p) => (
            <li key={p.id}
                className="rounded-lg border border-border bg-surface p-3"
                data-testid={`ai-testing-key-row-${p.id}`}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-md',
                  p.activeKey ? 'bg-success/10 text-success' : 'bg-elevated text-text-muted',
                )}>
                  {p.activeKey ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{p.label}</div>
                    {p.activeKey ? (
                      <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                        Active · ••••{p.activeKey.last4}
                      </span>
                    ) : (
                      <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-muted">{p.hint}</p>
                  {p.activeKey && p.activeKey.createdAt && (
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      Added {new Date(p.activeKey.createdAt).toLocaleString()}
                      {p.activeKey.createdByEmail && <> by {p.activeKey.createdByEmail}</>}
                    </p>
                  )}
                </div>
                {p.activeKey && (
                  <button type="button" onClick={() => handleRevoke(p.activeKey!.id)}
                          data-testid={`ai-testing-key-revoke-${p.id}`}
                          className="grid h-7 w-7 place-items-center rounded-md border border-border text-danger hover:bg-danger/10"
                          title="Revoke key">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddKeyModal workspaceId={workspaceId}
                     onClose={() => setAdding(false)}
                     onSaved={(k) => {
                       setKeys((prev) => [k, ...prev.filter((x) => x.provider !== k.provider)]);
                       setAdding(false);
                     }} />
      )}
    </div>
  );
};

/* ─── Modal ────────────────────────────────────────────────────────── */
const AddKeyModal = ({ workspaceId, onClose, onSaved }: {
  workspaceId: string;
  onClose: () => void;
  onSaved: (k: ApiKey) => void;
}) => {
  const [provider, setProvider] = useState('openai');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!secret.trim()) return;
    setBusy(true);
    try {
      const k = await createKey(workspaceId, { provider, label: label.trim() || undefined, secret: secret.trim() });
      toast.success('Key stored (encrypted)');
      onSaved(k);
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4"
         data-testid="ai-testing-add-key-modal">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Add provider key</h3>
        </div>

        <div className="grid gap-3">
          <Field label="Provider">
            <select value={provider} onChange={(e) => setProvider(e.target.value)}
                    data-testid="ai-testing-add-key-provider"
                    className={inputCls}>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Label (optional)">
            <input value={label} onChange={(e) => setLabel(e.target.value)}
                   placeholder="e.g. Personal · Team-shared"
                   className={inputCls} />
          </Field>
          <Field label="Secret">
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
                   data-testid="ai-testing-add-key-secret"
                   placeholder={PROVIDERS.find((p) => p.id === provider)?.hint ?? ''}
                   className={inputCls} />
            <p className="mt-1 text-[10px] text-text-muted">
              Stored AES-GCM encrypted. We never log or display the cleartext after save.
            </p>
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || !secret.trim()}
                  data-testid="ai-testing-add-key-submit"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save key
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
