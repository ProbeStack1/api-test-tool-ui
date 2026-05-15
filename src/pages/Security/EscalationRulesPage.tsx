/**
 * EscalationRulesPage — manages auto-escalation rules for security scans.
 *
 * Rule semantics: "When ≥ N findings of severity ≥ X appear in a single
 * scan run, automatically notify these destinations (email / slack / teams
 * / generic webhook)."
 *
 * Backend contract (already shipped in
 * `EscalationRulesController.java`):
 *   GET    /api/v1/functional-tests/security/escalation-rules
 *   POST   /api/v1/functional-tests/security/escalation-rules
 *   PATCH  /api/v1/functional-tests/security/escalation-rules/{id}
 *   DELETE /api/v1/functional-tests/security/escalation-rules/{id}
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Bell, Plus, Trash2, Mail, Slack, Webhook, AlertTriangle,
  Save, X, Loader2, Power, PowerOff, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { serviceUrl } from '@/lib/env';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type DestKind = 'EMAIL' | 'SLACK' | 'TEAMS' | 'WEBHOOK';

interface Destination {
  kind: DestKind;
  target: string;
  label?: string;
}

interface EscalationRule {
  id?: string;
  workspaceId?: string;
  name: string;
  minSeverity: Severity;
  threshold: number;
  enabled: boolean;
  destinations: Destination[];
  createdAt?: string;
  updatedAt?: string;
}

const BASE = `${serviceUrl('functionalTest')}/api/v1/functional-tests/security/escalation-rules`;

const SEV_TONE: Record<Severity, string> = {
  CRITICAL: 'border-red-500/30 bg-red-500/15 text-red-400',
  HIGH:     'border-red-500/30 bg-red-500/10 text-red-400',
  MEDIUM:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
  LOW:      'border-sky-500/30 bg-sky-500/10 text-sky-400',
};

const DEST_ICON: Record<DestKind, typeof Mail> = {
  EMAIL: Mail, SLACK: Slack, TEAMS: Slack, WEBHOOK: Webhook,
};

const blankRule = (): EscalationRule => ({
  name: 'New rule',
  minSeverity: 'HIGH',
  threshold: 1,
  enabled: true,
  destinations: [{ kind: 'EMAIL', target: '', label: '' }],
});

export function EscalationRulesPage() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EscalationRule | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const r = await axios.get<EscalationRule[]>(BASE);
      setRules(r.data ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const toggleEnabled = async (rule: EscalationRule) => {
    if (!rule.id) return;
    await axios.patch(`${BASE}/${rule.id}`, { enabled: !rule.enabled });
    fetchRules();
  };

  const deleteRule = async (rule: EscalationRule) => {
    if (!rule.id) return;
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    await axios.delete(`${BASE}/${rule.id}`);
    fetchRules();
  };

  const saveRule = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await axios.patch(`${BASE}/${editing.id}`, editing);
      } else {
        await axios.post(BASE, editing);
      }
      setEditing(null);
      fetchRules();
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="escalation-rules-page">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-6 pb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Security escalation rules</h1>
            <p className="text-xs text-text-muted">
              Auto-notify channels when severity thresholds are breached in a scan.
            </p>
          </div>
        </div>
        <button
          data-testid="rule-create-btn"
          onClick={() => setEditing(blankRule())}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New rule
        </button>
      </div>

      <div className="flex h-0 flex-1 flex-col gap-3 overflow-y-auto p-6">
        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-text-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading rules…
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-12 text-center text-sm text-text-muted">
            <Bell className="h-8 w-8 opacity-40" />
            <p>No escalation rules yet.</p>
            <p className="text-xs">Click <strong>New rule</strong> to wire up your first auto-notification.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="rules-list">
            {rules.map((r) => (
              <li key={r.id}>
                <div
                  className={cn(
                    'rounded-md border p-3',
                    r.enabled ? 'border-border bg-surface' : 'border-border/50 bg-elevated/30 opacity-70',
                  )}
                  data-testid={`rule-row-${r.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{r.name}</span>
                        <span className={cn('rounded border px-1.5 py-0 text-[10px] font-semibold uppercase', SEV_TONE[r.minSeverity])}>
                          ≥ {r.minSeverity}
                        </span>
                        <span className="rounded border border-border bg-elevated px-1.5 py-0 text-[10px] text-text-muted">
                          threshold {r.threshold}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.destinations.map((d, i) => {
                          const Icon = DEST_ICON[d.kind] ?? Webhook;
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] text-text-secondary"
                              title={d.target}
                            >
                              <Icon className="h-3 w-3" /> {d.label || d.kind}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        data-testid={`rule-toggle-${r.id}`}
                        onClick={() => toggleEnabled(r)}
                        title={r.enabled ? 'Disable' : 'Enable'}
                        className={cn(
                          'rounded p-1.5 hover:bg-hover',
                          r.enabled ? 'text-success' : 'text-text-muted',
                        )}
                      >
                        {r.enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </button>
                      <button
                        data-testid={`rule-edit-${r.id}`}
                        onClick={() => setEditing(r)}
                        className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-hover"
                      >
                        Edit
                      </button>
                      <button
                        data-testid={`rule-delete-${r.id}`}
                        onClick={() => deleteRule(r)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <RuleEditorModal
          rule={editing}
          onChange={setEditing}
          onSave={saveRule}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

interface ModalProps {
  rule: EscalationRule;
  onChange: (r: EscalationRule) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

function RuleEditorModal({ rule, onChange, onSave, onClose, saving }: ModalProps) {
  const updateDest = (i: number, patch: Partial<Destination>) => {
    const next = [...rule.destinations];
    next[i] = { ...next[i], ...patch };
    onChange({ ...rule, destinations: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-[640px] max-w-[95vw] flex-col rounded-lg border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{rule.id ? 'Edit rule' : 'Create rule'}</span>
          </div>
          <button data-testid="rule-modal-close" onClick={onClose} className="rounded p-1 hover:bg-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-xs">
          <label className="block">
            <span className="text-text-muted">Rule name</span>
            <input
              data-testid="rule-name-input"
              value={rule.name}
              onChange={(e) => onChange({ ...rule, name: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1.5"
              placeholder="e.g. Page on-call when 3+ HIGH findings"
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-text-muted">Minimum severity</span>
              <select
                data-testid="rule-severity-input"
                value={rule.minSeverity}
                onChange={(e) => onChange({ ...rule, minSeverity: e.target.value as Severity })}
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1.5"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </label>
            <label className="block">
              <span className="text-text-muted">Threshold (count of findings)</span>
              <input
                data-testid="rule-threshold-input"
                type="number" min={1}
                value={rule.threshold}
                onChange={(e) => onChange({ ...rule, threshold: parseInt(e.target.value || '1', 10) })}
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1.5"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-text-muted">Destinations</span>
            <button
              data-testid="rule-dest-add"
              onClick={() => onChange({ ...rule, destinations: [...rule.destinations, { kind: 'EMAIL', target: '', label: '' }] })}
              className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-hover"
            >
              <Plus className="-mt-0.5 inline h-3 w-3" /> Add
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {rule.destinations.map((d, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_1fr_24px] gap-2" data-testid={`rule-dest-row-${i}`}>
                <select
                  value={d.kind}
                  onChange={(e) => updateDest(i, { kind: e.target.value as DestKind })}
                  className="rounded border border-border bg-transparent px-1 py-1"
                >
                  <option value="EMAIL">EMAIL</option>
                  <option value="SLACK">SLACK</option>
                  <option value="TEAMS">TEAMS</option>
                  <option value="WEBHOOK">WEBHOOK</option>
                </select>
                <input
                  value={d.target}
                  onChange={(e) => updateDest(i, { target: e.target.value })}
                  placeholder={d.kind === 'EMAIL' ? 'on-call@team.com' : 'https://hooks.slack.com/services/...'}
                  className="rounded border border-border bg-transparent px-2 py-1 font-mono"
                />
                <input
                  value={d.label ?? ''}
                  onChange={(e) => updateDest(i, { label: e.target.value })}
                  placeholder="label (optional)"
                  className="rounded border border-border bg-transparent px-2 py-1"
                />
                <button
                  onClick={() => onChange({ ...rule, destinations: rule.destinations.filter((_, j) => j !== i) })}
                  className="rounded text-red-400 hover:bg-red-500/10"
                  data-testid={`rule-dest-remove-${i}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-2">
            <input
              data-testid="rule-enabled-input"
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => onChange({ ...rule, enabled: e.target.checked })}
              className="accent-[var(--color-primary)]"
            />
            <span>Enabled</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="rounded border border-border px-3 py-1.5 text-xs">Cancel</button>
          <button
            data-testid="rule-save-btn"
            disabled={saving || !rule.name.trim() || rule.destinations.length === 0}
            onClick={onSave}
            className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default EscalationRulesPage;
