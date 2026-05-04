/**
 * InlineCreateMonitorForm — premium configure-and-create experience that
 * lives directly on the Monitors landing page (mirrors the
 * `InlineStartRunForm` / `InlineStartLoadRunForm` pattern).
 *
 * Required basics above the fold · Advanced section collapsible.
 * Field names mirror `ApiDocDtos / MonitorDtos.CreateMonitorRequest`
 * exactly — Spring Jackson is strict.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Activity, FileText, FolderTree, ChevronDown, Loader2, Plus,
  SlidersHorizontal, Bell, Target, X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { listTestSpecs } from '@/services/testSpec.service';
import { listCollections } from '@/services/collection.service';
import { listEnvironments } from '@/services/environment.service';
import { createMonitor, type MonitorCreate } from '@/services/monitor.service';
import { cn } from '@/utils/cn';

type Source = 'TEST_SPEC' | 'COLLECTION';
const REGIONS = ['us-east', 'us-west', 'eu-west', 'ap-south', 'ap-southeast'];
const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: 'Every minute',     cron: '0 * * * * *' },
  { label: 'Every 5 minutes',  cron: '0 */5 * * * *' },
  { label: 'Every 15 minutes', cron: '0 */15 * * * *' },
  { label: 'Every hour',       cron: '0 0 * * * *' },
  { label: 'Every day at 9am', cron: '0 0 9 * * *' },
];

interface Props {
  workspaceId: string;
  onCreated: () => void;
  onCancel: () => void;
}

const SOURCE_TABS: { src: Source; label: string; hint: string; icon: any; testId: string }[] = [
  { src: 'TEST_SPEC',  label: 'Test Spec',  hint: 'Probe a saved spec',     icon: FileText,   testId: 'monitor-inline-src-spec' },
  { src: 'COLLECTION', label: 'Collection', hint: 'Probe a request set',    icon: FolderTree, testId: 'monitor-inline-src-collection' },
];

export const InlineCreateMonitorForm = ({ workspaceId, onCreated, onCancel }: Props) => {
  const [src, setSrc] = useState<Source>('TEST_SPEC');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testSpecId, setTestSpecId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [scheduleCron, setScheduleCron] = useState('0 */5 * * * *');
  const [regions, setRegions] = useState<string[]>(['us-east']);

  // Advanced
  const [retryCount, setRetryCount]                     = useState(2);
  const [retryDelayMs, setRetryDelayMs]                 = useState(2000);
  const [requestTimeoutMs, setRequestTimeoutMs]         = useState(15000);
  const [stopAfterFailures, setStopAfterFailures]       = useState(0);
  const [slaP95Ms, setSlaP95Ms]                         = useState(2000);
  const [slaUptimePct, setSlaUptimePct]                 = useState(99.9);
  const [emails, setEmails]                             = useState('');
  const [slackWebhook, setSlackWebhook]                 = useState('');
  const [notifyOnStateChangeOnly, setNotifyOnStateOnly] = useState(true);
  const [tags, setTags]                                 = useState('');

  const [advancedOpen, setAdvancedOpen]   = useState(false);
  const [notifyOpen, setNotifyOpen]       = useState(false);
  const [error, setError] = useState<string | null>(null);

  const specsQ = useQuery({
    queryKey: ['testSpec', 'list', workspaceId, 'ACTIVE', ''],
    queryFn: () => listTestSpecs(workspaceId, { status: 'ACTIVE', size: 100 }),
    enabled: src === 'TEST_SPEC',
  });
  const collsQ = useQuery({
    queryKey: ['collection', 'list', workspaceId],
    queryFn: () => listCollections(workspaceId),
    enabled: src === 'COLLECTION',
  });
  const envsQ = useQuery({
    queryKey: ['environment', 'list', workspaceId],
    queryFn: () => listEnvironments(workspaceId),
  });

  const mut = useMutation({
    mutationFn: () => {
      const body: MonitorCreate = {
        workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        environmentId: environmentId || undefined,
        scheduleCron: scheduleCron.trim(),
        regions: regions.length > 0 ? regions : undefined,
        retryCount, retryDelayMs, requestTimeoutMs,
        stopAfterConsecutiveFailures: stopAfterFailures > 0 ? stopAfterFailures : undefined,
        slaP95Ms: slaP95Ms > 0 ? slaP95Ms : undefined,
        slaUptimePct: slaUptimePct > 0 ? slaUptimePct : undefined,
        notificationEmails: emails.trim() ? emails.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
        notificationSlackWebhook: slackWebhook.trim() || undefined,
        notifyOnStateChangeOnly,
        tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      };
      if (src === 'TEST_SPEC')  body.testSpecId   = testSpecId;
      if (src === 'COLLECTION') body.collectionId = collectionId;
      return createMonitor(body);
    },
    onSuccess: () => onCreated(),
    onError: (e: any) => setError(e?.message ?? 'Failed to create monitor'),
  });

  const canSubmit = useMemo(() =>
    !!name.trim() && !!scheduleCron.trim() &&
    (src === 'TEST_SPEC' ? !!testSpecId : !!collectionId),
  [name, scheduleCron, src, testSpecId, collectionId]);

  return (
    <section data-testid="inline-create-monitor-form" className="rounded-2xl border border-border bg-surface/50 shadow-sm">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Activity className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Configure a new monitor</h2>
          <p className="text-[11px] text-text-muted">Pick a source · set the schedule · expand <em>Advanced</em> for retries, SLA &amp; alerts.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel} className="ml-auto" data-testid="inline-create-monitor-cancel">
          <X className="h-3.5 w-3.5" />
        </Button>
      </header>

      <div className="space-y-5 p-6">
        {/* source cards */}
        <div className="grid gap-2 sm:grid-cols-2" data-testid="monitor-source-cards">
          {SOURCE_TABS.map((t) => {
            const isActive = src === t.src;
            return (
              <button
                key={t.src}
                data-testid={t.testId}
                onClick={() => setSrc(t.src)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                  isActive
                    ? 'border-primary/60 bg-primary/[0.07] shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-probestack-bg hover:border-border-strong hover:bg-hover',
                )}
              >
                <span className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                  isActive ? 'bg-primary/15 text-primary' : 'bg-elevated text-text-muted',
                )}>
                  <t.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold tracking-tight">{t.label}</span>
                  <span className="mt-0.5 block text-[10px] text-text-muted">{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div data-testid="monitor-inline-error" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Source-specific selector */}
        {src === 'TEST_SPEC' ? (
          <Field label="Test spec" required hint="Pick a saved spec from this project.">
            <select data-testid="monitor-inline-spec" value={testSpecId} onChange={(e) => setTestSpecId(e.target.value)} className={inputCls()}>
              <option value="">— select a spec —</option>
              {specsQ.data?.content.map((s) => (
                <option key={s.testSpecId} value={s.testSpecId}>{s.name} · {s.format} · {s.testCaseCount} cases</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Collection" required>
            <select data-testid="monitor-inline-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={inputCls()}>
              <option value="">— select a collection —</option>
              {(collsQ.data ?? []).map((c: any) => (
                <option key={c.id ?? c.collectionId} value={c.id ?? c.collectionId}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Required basics */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Monitor name" required>
            <input data-testid="monitor-inline-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production checkout API" className={inputCls()} />
          </Field>
          <Field label="Environment" hint="Variables / base URLs from a saved environment.">
            <select data-testid="monitor-inline-env" value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)} className={inputCls()}>
              <option value="">— none —</option>
              {(envsQ.data ?? []).map((e: any) => {
                const scope = String(e.scope ?? 'ENVIRONMENT').toUpperCase();
                return (
                  <option key={e.id ?? e.environmentId} value={e.id ?? e.environmentId}>{e.name} ({scope})</option>
                );
              })}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea data-testid="monitor-inline-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this monitor probe?"
            className="block w-full resize-y rounded-md border border-border bg-probestack-bg px-3 py-2 text-xs shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </Field>

        {/* Schedule + regions */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Schedule (cron)" required hint="Quartz 6-field syntax (sec min hr dom mon dow).">
            <input data-testid="monitor-inline-cron" value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} className={`${inputCls()} font-mono`} />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.cron}
                  type="button"
                  data-testid={`monitor-inline-cron-preset-${p.cron.replace(/[\s*/]/g, '_')}`}
                  onClick={() => setScheduleCron(p.cron)}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                    scheduleCron === p.cron
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-probestack-bg text-text-muted hover:bg-hover',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Regions" hint="Multi-select where probes execute.">
            <div className="flex flex-wrap gap-1.5" data-testid="monitor-inline-regions">
              {REGIONS.map((r) => {
                const on = regions.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    data-testid={`monitor-inline-region-${r}`}
                    onClick={() => setRegions((cur) => on ? cur.filter((x) => x !== r) : [...cur, r])}
                    className={cn(
                      'rounded border px-2.5 py-1 font-mono text-[11px] transition-colors',
                      on ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-probestack-bg text-text-muted hover:bg-hover',
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        {/* Advanced (timeouts, retries, SLA) */}
        <div className="rounded-xl border border-border/60 bg-probestack-bg/40">
          <button
            type="button"
            data-testid="monitor-inline-advanced-toggle"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-hover/40"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs font-semibold tracking-tight">Advanced — retries · timeouts · SLA</span>
            <span className="text-[10px] text-text-muted">retryCount · retryDelay · timeoutMs · stopAfter · SLA p95 / uptime</span>
            <ChevronDown className={cn('ml-auto h-4 w-4 text-text-muted transition-transform', advancedOpen && 'rotate-180')} />
          </button>
          {advancedOpen && (
            <div data-testid="monitor-inline-advanced-panel" className="grid gap-4 border-t border-border/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Knob label="Retry count"        value={retryCount}        min={0}    max={5}      onChange={setRetryCount}        testId="monitor-inline-retry" />
              <Knob label="Retry delay (ms)"   value={retryDelayMs}      min={0}    max={60000}  onChange={setRetryDelayMs}      testId="monitor-inline-retry-delay" />
              <Knob label="Request timeout (ms)" value={requestTimeoutMs} min={1000} max={300000} onChange={setRequestTimeoutMs} testId="monitor-inline-timeout" />
              <Knob label="Stop after failures"  hint="0 = never auto-pause" value={stopAfterFailures} min={0} max={50} onChange={setStopAfterFailures} testId="monitor-inline-stopfail" />
              <Knob label="SLA p95 (ms)"       value={slaP95Ms}          min={0}    max={120000} onChange={setSlaP95Ms}          testId="monitor-inline-sla-p95" />
              <Field label="SLA uptime %">
                <input type="number" step="0.01" data-testid="monitor-inline-sla-uptime" min={0} max={100} value={slaUptimePct} onChange={(e) => setSlaUptimePct(Number(e.target.value))} className={`${inputCls()} font-mono`} />
              </Field>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border/60 bg-probestack-bg/40">
          <button
            type="button"
            data-testid="monitor-inline-notify-toggle"
            onClick={() => setNotifyOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-hover/40"
          >
            <Bell className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs font-semibold tracking-tight">Notifications &amp; tagging</span>
            <span className="text-[10px] text-text-muted">emails · Slack · tags</span>
            <ChevronDown className={cn('ml-auto h-4 w-4 text-text-muted transition-transform', notifyOpen && 'rotate-180')} />
          </button>
          {notifyOpen && (
            <div data-testid="monitor-inline-notify-panel" className="grid gap-4 border-t border-border/60 p-4 lg:grid-cols-2">
              <Field label="Notification emails" hint="Comma-separated.">
                <input data-testid="monitor-inline-emails" value={emails} onChange={(e) => setEmails(e.target.value)} className={inputCls()} placeholder="alerts@acme.com, oncall@acme.com" />
              </Field>
              <Field label="Slack webhook">
                <input data-testid="monitor-inline-slack" value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} className={inputCls()} placeholder="https://hooks.slack.com/…" />
              </Field>
              <Field label="Tags" hint="Comma-separated.">
                <input data-testid="monitor-inline-tags" value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls()} placeholder="prod, payments" />
              </Field>
              <label className="flex cursor-pointer items-start gap-2.5 self-end rounded-lg border border-border/60 bg-probestack-bg/60 px-3 py-2.5">
                <input type="checkbox" data-testid="monitor-inline-state-only" checked={notifyOnStateChangeOnly} onChange={(e) => setNotifyOnStateOnly(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-primary" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold tracking-tight">Notify on state-change only</span>
                  <span className="mt-0.5 block text-[10px] text-text-muted">Skip alerts while a monitor stays DOWN.</span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <Target className="h-3 w-3" />
            Cron-driven probe — multi-region, retry-aware, SLA-tracked.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel} data-testid="monitor-inline-cancel">Cancel</Button>
            <Button variant="primary" size="md" onClick={() => mut.mutate()} disabled={!canSubmit || mut.isPending} data-testid="monitor-inline-submit" className="min-w-44">
              {mut.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                : <><Plus className="h-4 w-4" /> Create monitor</>}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

const inputCls = () =>
  'h-9 w-full rounded-md border border-border bg-probestack-bg px-3 text-xs shadow-inner transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

const Field = ({ label, hint, children, required }: {
  label: React.ReactNode; hint?: string; children: React.ReactNode; required?: boolean;
}) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-tight text-text-secondary">
      {label} {required && <span className="text-danger">*</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-[10px] text-text-muted">{hint}</span>}
  </label>
);

const Knob = ({ label, hint, value, onChange, min, max, testId }: {
  label: string; hint?: string; value: number; onChange: (n: number) => void; min: number; max: number; testId: string;
}) => (
  <Field label={label} hint={hint}>
    <input
      type="number" min={min} max={max}
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
      className={`${inputCls()} font-mono`}
    />
  </Field>
);
