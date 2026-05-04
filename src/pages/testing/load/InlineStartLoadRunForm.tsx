/**
 * InlineStartLoadRunForm — premium configure form for the Load Tests
 * "Runs" tab. Field names mirror `LoadTestRun.LoadConfig` on the Java
 * side EXACTLY (Spring Jackson is strict, unknown fields fail
 * deserialisation as VAL_JSON_MALFORMED).
 *
 * On submit, hands the runId to `useTestingStore.liveLoadRunId` so
 * the parent tab swaps in the streaming panel.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Play, FileText, FolderTree, Code2, Gauge, ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { listTestSpecs } from '@/services/testSpec.service';
import { listCollections } from '@/services/collection.service';
import { listEnvironments } from '@/services/environment.service';
import { startRun, type StartRunRequestBody } from '@/services/loadTest.service';
import { trackLoadRun } from '@/hooks/useActiveRunsTracker';
import { useTestingStore } from '@/stores/testing.store';
import { cn } from '@/utils/cn';

type Source = 'TEST_SPEC' | 'COLLECTION' | 'INLINE';

const SOURCE_TABS: { src: Source; label: string; hint: string; icon: any; testId: string }[] = [
  { src: 'TEST_SPEC',  label: 'Test Spec',  hint: 'Saved spec',          icon: FileText,   testId: 'load-run-src-spec' },
  { src: 'COLLECTION', label: 'Collection', hint: 'Request collection',  icon: FolderTree, testId: 'load-run-src-collection' },
  { src: 'INLINE',     label: 'Inline',     hint: 'Pasted content',      icon: Code2,      testId: 'load-run-src-inline' },
];
const HINTS = ['POSTMAN', 'OPENAPI', 'HAR', 'INSOMNIA', 'CURL', 'FORGEQ'] as const;

interface Props { workspaceId: string }

export const InlineStartLoadRunForm = ({ workspaceId }: Props) => {
  const qc = useQueryClient();
  const setLiveRun = useTestingStore((s) => s.setLiveLoadRun);

  const [src, setSrc] = useState<Source>('TEST_SPEC');
  const [name, setName] = useState('');
  const [testSpecId, setTestSpecId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [inlineContent, setInlineContent] = useState('');
  const [inlineFormat, setInlineFormat] = useState<typeof HINTS[number]>('POSTMAN');
  const [environmentId, setEnvironmentId] = useState('');

  // Required basics
  const [concurrency, setConcurrency]         = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [targetRps, setTargetRps]             = useState(0);

  // Advanced
  const [rampUpSeconds, setRampUpSeconds]   = useState(5);
  const [thinkTimeMs, setThinkTimeMs]       = useState(0);
  const [timeoutMs, setTimeoutMs]           = useState(5000);
  const [retries, setRetries]               = useState(0);
  const [retryBackoffMs, setRetryBackoffMs] = useState(500);
  const [preflightCheck, setPreflightCheck] = useState(true);
  const [respectRateLimit, setRespectRateLimit] = useState(true);
  const [insecure, setInsecure]             = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  const startMut = useMutation({
    mutationFn: () => {
      const body: StartRunRequestBody = {
        workspaceId,
        name: name.trim() || undefined,
        environmentId: environmentId || undefined,
        config: {
          concurrency, targetRps, durationSeconds, rampUpSeconds,
          thinkTimeMs, timeoutMs, retries, retryBackoffMs,
          preflightCheck, respectRateLimit, insecure,
        },
      };
      if (src === 'TEST_SPEC')   body.testSpecId    = testSpecId;
      if (src === 'COLLECTION')  body.collectionId  = collectionId;
      if (src === 'INLINE') {
        body.inlineContent = inlineContent;
        body.inlineFormat  = inlineFormat;
      }
      return startRun(body);
    },
    onSuccess: (r) => {
      const runName = name.trim() ||
        (src === 'TEST_SPEC' ? `Load Spec ${testSpecId.slice(0,8)}` :
         src === 'COLLECTION' ? `Load Coll ${collectionId.slice(0,8)}` :
                                `Load ${inlineFormat}`);
      trackLoadRun({ runId: r.runId, name: runName });
      qc.invalidateQueries({ queryKey: ['loadTest'] });
      setLiveRun(r.runId);
      setError(null);
      setName('');
      if (src === 'INLINE') setInlineContent('');
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to queue load run'),
  });

  const canSubmit = useMemo(() => {
    if (src === 'TEST_SPEC')  return !!testSpecId;
    if (src === 'COLLECTION') return !!collectionId;
    if (src === 'INLINE')     return inlineContent.trim().length > 0;
    return false;
  }, [src, testSpecId, collectionId, inlineContent]);

  return (
    <section data-testid="inline-load-run-form" className="rounded-2xl border border-border bg-surface/50 shadow-sm">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
          <Gauge className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Configure a load run</h2>
          <p className="text-[11px] text-text-muted">Concurrency · target RPS · duration. Expand <em>Advanced</em> for ramp-up &amp; retries.</p>
        </div>
      </header>

      <div className="space-y-5 p-6">
        {/* Source picker as cards */}
        <div className="grid gap-2 sm:grid-cols-3" data-testid="load-source-cards">
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

        {error && <div data-testid="load-run-error" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

        {/* Source-specific input */}
        {src === 'TEST_SPEC' && (
          <Field label="Test spec" required hint="Pick a saved spec.">
            <select data-testid="load-run-spec" value={testSpecId} onChange={(e) => setTestSpecId(e.target.value)} className={inputCls()}>
              <option value="">— select a spec —</option>
              {specsQ.data?.content.map((s) => (
                <option key={s.testSpecId} value={s.testSpecId}>{s.name} · {s.format} · {s.testCaseCount} cases</option>
              ))}
            </select>
          </Field>
        )}
        {src === 'COLLECTION' && (
          <Field label="Collection" required>
            <select data-testid="load-run-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={inputCls()}>
              <option value="">— select a collection —</option>
              {(collsQ.data ?? []).map((c: any) => (
                <option key={c.id ?? c.collectionId} value={c.id ?? c.collectionId}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}
        {src === 'INLINE' && (
          <>
            <Field label="Format hint">
              <select data-testid="load-run-hint" value={inlineFormat} onChange={(e) => setInlineFormat(e.target.value as any)} className={`${inputCls()} max-w-44`}>
                {HINTS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Content" required>
              <textarea
                data-testid="load-run-content"
                value={inlineContent}
                onChange={(e) => setInlineContent(e.target.value)}
                rows={8}
                placeholder="Paste a Postman collection / OpenAPI / HAR …"
                className="block w-full resize-y rounded-md border border-border bg-probestack-bg px-3 py-2 font-mono text-[12px] leading-snug shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </>
        )}

        {/* Preset mode — one-click aggressive config for stress/spike tests */}
        <div data-testid="load-presets" className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-probestack-bg/40 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Preset</span>
          <button
            type="button"
            data-testid="load-preset-smoke"
            onClick={() => { setConcurrency(5); setDurationSeconds(30); setTargetRps(0); setRampUpSeconds(2); setRetries(0); setTimeoutMs(5000); }}
            className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium hover:bg-hover"
          >Smoke</button>
          <button
            type="button"
            data-testid="load-preset-load"
            onClick={() => { setConcurrency(50); setDurationSeconds(120); setTargetRps(0); setRampUpSeconds(10); setRetries(0); setTimeoutMs(10000); }}
            className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium hover:bg-hover"
          >Load</button>
          <button
            type="button"
            data-testid="load-preset-stress"
            onClick={() => { setConcurrency(500); setDurationSeconds(300); setTargetRps(5000); setRampUpSeconds(30); setRetries(0); setTimeoutMs(15000); setPreflightCheck(false); }}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-500/20"
          >⚡ Stress</button>
          <button
            type="button"
            data-testid="load-preset-spike"
            onClick={() => { setConcurrency(1000); setDurationSeconds(60); setTargetRps(10000); setRampUpSeconds(1); setRetries(0); setTimeoutMs(5000); setPreflightCheck(false); }}
            className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold text-orange-500 hover:bg-orange-500/20"
          >🔥 Spike</button>
          <span className="ml-auto text-[10px] text-text-muted">
            Stress pushes your API past normal limits · Spike = short burst
          </span>
        </div>

        {/* Required basics */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Run name" hint="Auto-generated if empty.">
            <input data-testid="load-run-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 100 VU smoke" className={inputCls()} />
          </Field>
          <Field label="Environment" hint="Variables / base URLs.">
            <select data-testid="load-run-env" value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)} className={inputCls()}>
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

        <div className="grid gap-4 sm:grid-cols-3">
          <Knob label="Concurrency"     hint="Virtual users (1-500)" value={concurrency}     min={1}   max={500}    onChange={setConcurrency}     testId="load-cfg-concurrency" />
          <Knob label="Duration (s)"    hint="How long the test runs" value={durationSeconds} min={1}   max={3600}   onChange={setDurationSeconds} testId="load-cfg-duration" />
          <Knob label="Target RPS"      hint="0 = unlimited"          value={targetRps}       min={0}   max={10000}  onChange={setTargetRps}       testId="load-cfg-rps" />
        </div>

        {/* Advanced — collapsed by default */}
        <div className="rounded-xl border border-border/60 bg-probestack-bg/40">
          <button
            type="button"
            data-testid="load-advanced-toggle"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-hover/40"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs font-semibold tracking-tight">Advanced configuration</span>
            <span className="text-[10px] text-text-muted">ramp-up · think time · timeouts · retries</span>
            <ChevronDown className={cn('ml-auto h-4 w-4 text-text-muted transition-transform', advancedOpen && 'rotate-180')} />
          </button>
          {advancedOpen && (
            <div data-testid="load-advanced-panel" className="grid gap-4 border-t border-border/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Knob label="Ramp-up (s)"      value={rampUpSeconds}   min={0}   max={600}    onChange={setRampUpSeconds}   testId="load-cfg-ramp" />
              <Knob label="Think time (ms)"  value={thinkTimeMs}     min={0}   max={60000}  onChange={setThinkTimeMs}     testId="load-cfg-thinktime" />
              <Knob label="Request timeout (ms)" value={timeoutMs}   min={100} max={300000} onChange={setTimeoutMs}       testId="load-cfg-timeout" />
              <Knob label="Retries"          value={retries}         min={0}   max={5}      onChange={setRetries}         testId="load-cfg-retries" />
              <Knob label="Retry backoff (ms)" value={retryBackoffMs} min={0}  max={60000}  onChange={setRetryBackoffMs}  testId="load-cfg-retry-backoff" />
              <Toggle label="Pre-flight check"  hint="1 VU × 5 req sanity probe"  checked={preflightCheck} onChange={setPreflightCheck} testId="load-cfg-preflight" />
              <Toggle label="Respect 429"       hint="Back off on rate limits"    checked={respectRateLimit} onChange={setRespectRateLimit} testId="load-cfg-respect" />
              <Toggle label="Insecure TLS"      hint="Skip cert validation"       checked={insecure} onChange={setInsecure} testId="load-cfg-insecure" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-text-muted">
            Runs in the background — you can leave this page and a toast will fire on completion.
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={() => startMut.mutate()}
            disabled={!canSubmit || startMut.isPending}
            data-testid="load-run-submit"
            className="min-w-44"
          >
            {startMut.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Queuing…</>
              : <><Play className="h-4 w-4" /> Queue load run</>}
          </Button>
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

const Toggle = ({ label, hint, checked, onChange, testId }: {
  label: string; hint?: string; checked: boolean; onChange: (b: boolean) => void; testId: string;
}) => (
  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-probestack-bg/60 px-3 py-2.5 transition-colors hover:bg-hover/40">
    <input
      type="checkbox"
      data-testid={testId}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-3.5 w-3.5 accent-primary"
    />
    <span className="min-w-0">
      <span className="block text-xs font-semibold tracking-tight">{label}</span>
      {hint && <span className="mt-0.5 block text-[10px] text-text-muted">{hint}</span>}
    </span>
  </label>
);
