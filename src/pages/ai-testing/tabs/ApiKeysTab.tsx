/**
 * API Keys tab — per-workspace LLM provider key registry. Keys are
 * encrypted at rest; only the {@code last4} + {@code hint} are
 * surfaced. Falls back to Emergent Universal Key when no key is set.
 */
import { useEffect, useState } from 'react';
import { KeyRound, Loader2, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { listKeys, createKey, revokeKey, type ApiKey } from '@/services/aiTesting.service';

const PROVIDERS = [
  { id: 'openai',    label: 'OpenAI'    },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google',    label: 'Google Gemini' },
];

export const ApiKeysTab = ({ workspaceId }: { workspaceId: string }) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');

  const reload = async () => {
    setLoading(true);
    try { setKeys(await listKeys(workspaceId)); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [workspaceId]);

  const handleCreate = async () => {
    if (!secret.trim()) { toast.error('Secret cannot be empty'); return; }
    setBusy(true);
    try {
      const k = await createKey(workspaceId, { provider, label: label || provider, secret });
      setKeys((p) => [k, ...p.filter((x) => x.provider !== provider)]);
      setShowNew(false); setSecret(''); setLabel('');
      toast.success('Key stored (encrypted)', { description: `last4: ${k.last4}` });
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this key? The runner will fall back to the Emergent universal key.')) return;
    const prev = keys;
    setKeys((p) => p.filter((k) => k.id !== id));
    try { await revokeKey(workspaceId, id); toast.success('Key revoked'); }
    catch (e: any) { setKeys(prev); toast.error('Failed', { description: e?.message ?? '' }); }
  };

  return (
    <div className="mx-auto max-w-3xl p-6" data-testid="ai-testing-keys-page">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">API Keys</h2>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">
            Per-workspace LLM keys. AES/GCM encrypted at rest — only the last 4 digits are surfaced.
            <br />
            When no key is configured for a provider, runs fall back to the Emergent Universal Key.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          data-testid="ai-testing-key-new"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add key
        </button>
      </div>

      {showNew && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4" data-testid="ai-testing-key-new-form">
          <div className="grid gap-3">
            <Field label="Provider">
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}>
                {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Label (optional)">
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls}
                     placeholder="e.g. Prod OpenAI" />
            </Field>
            <Field label="Secret (one-way: not retrievable after save)">
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className={inputCls}
                     placeholder="sk-..." data-testid="ai-testing-key-secret" />
            </Field>
            <div className="flex gap-2">
              <button type="button" disabled={busy || !secret} onClick={handleCreate}
                      data-testid="ai-testing-key-submit"
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                Store key
              </button>
              <button type="button" onClick={() => setShowNew(false)}
                      className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {loading ? (
          <div className="grid place-items-center p-6 text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-[11px] text-text-muted">
            No keys yet — the runner will use the Emergent Universal Key for all calls.
          </div>
        ) : (
          <ul className="divide-y divide-border/40 rounded-md border border-border bg-surface">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-4 py-3" data-testid={`ai-testing-key-row-${k.id}`}>
                <KeyRound className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[12px] font-medium">
                    {k.label}
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">{k.provider}</span>
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {k.hint}••••{k.last4} · added {new Date(k.createdAt).toLocaleString()}
                    {k.createdByEmail && <> · by {k.createdByEmail}</>}
                  </div>
                </div>
                <button type="button" onClick={() => handleRevoke(k.id)}
                        data-testid={`ai-testing-key-revoke-${k.id}`}
                        className="grid h-7 w-7 place-items-center rounded-md border border-border text-danger hover:bg-danger/10">
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
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
