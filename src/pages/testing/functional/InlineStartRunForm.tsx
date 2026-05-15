/**
 * InlineStartRunForm — premium configure-and-run experience that lives
 * directly on the Functional Tests "Runs" tab. Submitting hands the
 * runId off to the testing store (`liveFunctionalRunId`) so the parent
 * tab swaps in a live-stream panel; the background tracker keeps
 * polling regardless of which page the user is on.
 *
 * Field naming MUST match `FunctionalRun.RunConfig` on the Java side
 * exactly — Spring's Jackson is configured with
 * `FAIL_ON_UNKNOWN_PROPERTIES=true`, so a stray field rejects the
 * entire payload as `VAL_JSON_MALFORMED`.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, FolderTree, Code2, Loader2, ChevronDown, Play, Beaker,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { listTestSpecs } from '@/services/testSpec.service';
import { listCollections } from '@/services/collection.service';
import { listEnvironments } from '@/services/environment.service';
import { startRun, type StartRunRequestBody } from '@/services/functionalTest.service';
import type { InlineHint as InlineHintType } from '@/api/functionalTest.api';
import { trackFunctionalRun } from '@/hooks/useActiveRunsTracker';
import { DataFileUpload } from '@/components/testing/DataFileUpload';
import { useTestingStore } from '@/stores/testing.store';
import { cn } from '@/utils/cn';

type Source = 'TEST_SPEC' | 'COLLECTION' | 'INLINE';

interface Props {
  workspaceId: string;
}

const SOURCE_TABS: { src: Source; label: string; hint: string; icon: any; testId: string }[] = [
  { src: 'TEST_SPEC',  label: 'Test Spec',  hint: 'Run a saved spec',    icon: FileText,   testId: 'inline-run-src-spec' },
  { src: 'COLLECTION', label: 'Collection', hint: 'Run a request set',   icon: FolderTree, testId: 'inline-run-src-collection' },
  { src: 'INLINE',     label: 'Inline',     hint: 'Paste raw content',   icon: Code2,      testId: 'inline-run-src-inline' },
];
const HINTS: InlineHintType[] = ['POSTMAN', 'OPENAPI', 'HAR', 'INSOMNIA', 'CURL', 'FORGEQ'];

export const InlineStartRunForm = ({ workspaceId }: Props) => {
  const qc = useQueryClient();
  const setLiveRun = useTestingStore((s) => s.setLiveFunctionalRun);

  const [src, setSrc] = useState<Source>('TEST_SPEC');
  const [name, setName] = useState('');
  const [testSpecId, setTestSpecId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [inlineContent, setInlineContent] = useState('');
  const [inlineHint, setInlineHint] = useState<InlineHintType>('POSTMAN');
  const [environmentId, setEnvironmentId] = useState('');

  // Java RunConfig field names (parallel/maxParallelSteps/retryCount).
  const [maxParallelSteps, setMaxParallelSteps] = useState(4);
  const [retryCount, setRetryCount]             = useState(0);
  const [retryDelayMs, setRetryDelayMs]         = useState(500);
  const [stepTimeoutMs, setStepTimeoutMs]       = useState(30000);
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(15000);
  const [failFast, setFailFast]                 = useState(false);
  const [validateSchema, setValidateSchema]     = useState(false);
  const [captureResponseBody, setCaptureBody]   = useState(true);
  const [iterations, setIterations]             = useState(1);
  /** Task 3.3 — uploaded data file id + stored path. The executor reads
   *  the file row-by-row and merges row → vars per iteration. */
  const [dataFile, setDataFile] = useState<{ fileId: string; storedPath: string; rowCount: number } | null>(null);
  /** Task 3.4 — Pre/post JS snippets executed around every step. */
  const [preScript, setPreScript] = useState('');
  const [postScript, setPostScript] = useState('');
  /** Task 3.5 — Geographic distribution. Comma-separated regions; the
   *  scheduler will fan out one run per region when > 1 region selected.
   *  Region IDs intentionally generic so the user can map them to any
   *  worker pool / GCP region they have. */
  const [regions, setRegions] = useState<string[]>([]);

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
          failFast,
          parallel: maxParallelSteps > 1,
          maxParallelSteps,
          retryCount,
          retryDelayMs,
          stepTimeoutMs,
          requestTimeoutMs,
          validateSchema,
          captureResponseBody,
          iterations: iterations > 1 ? iterations : undefined,
          regions: regions.length > 0 ? regions : undefined,
          dataFileGcs: dataFile?.storedPath ?? undefined,
          dataFileId:  dataFile?.fileId ?? undefined,
          preScript:   preScript.trim() || undefined,
          postScript:  postScript.trim() || undefined,
        },
      };
      if (src === 'TEST_SPEC')   body.testSpecId    = testSpecId;
      if (src === 'COLLECTION')  body.collectionId  = collectionId;
      if (src === 'INLINE')   {  body.inlineContent = inlineContent; body.inlineHint = inlineHint; }
      return startRun(body);
    },
    onSuccess: (r) => {
      const runName = name.trim() ||
        (src === 'TEST_SPEC' ? `Spec ${testSpecId.slice(0,8)}` :
         src === 'COLLECTION' ? `Collection ${collectionId.slice(0,8)}` :
                                `Inline ${inlineHint}`);
      trackFunctionalRun({ runId: r.runId, name: runName });
      qc.invalidateQueries({ queryKey: ['functionalTest'] });
      // Hand off to the live-stream panel — the Runs tab will swap in.
      setLiveRun(r.runId);
      setError(null);
      setName('');
      if (src === 'INLINE') setInlineContent('');
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to queue run'),
  });

  const canSubmit = useMemo(() => {
    if (src === 'TEST_SPEC')  return !!testSpecId;
    if (src === 'COLLECTION') return !!collectionId;
    if (src === 'INLINE')     return inlineContent.trim().length > 0;
    return false;
  }, [src, testSpecId, collectionId, inlineContent]);

  return (
    <section
      data-testid="inline-run-form"
      className="rounded-2xl border border-border bg-surface/50 shadow-sm"
    >
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Beaker className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Configure a functional run</h2>
          <p className="text-[11px] text-text-muted">Pick a source, set the basics, expand <em>Advanced</em> for fine-tuning, then queue the run.</p>
        </div>
      </header>

      <div className="space-y-5 p-6">
        {/* Source picker as cards — bigger, less compact */}
        <div className="grid gap-2 sm:grid-cols-3" data-testid="inline-run-source-cards">
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
          <div data-testid="inline-run-error" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Required basics */}
        <div className="space-y-4">
          {src === 'TEST_SPEC' && (
            <Field label="Test spec" required hint="Pick a saved spec from this project.">
              <select
                data-testid="inline-run-spec-select"
                value={testSpecId}
                onChange={(e) => setTestSpecId(e.target.value)}
                className={inputCls()}
              >
                <option value="">— select a spec —</option>
                {specsQ.data?.content.map((s) => (
                  <option key={s.testSpecId} value={s.testSpecId}>
                    {s.name} · {s.format} · {s.testCaseCount} cases
                  </option>
                ))}
              </select>
              {specsQ.data && specsQ.data.content.length === 0 && (
                <p className="mt-1.5 text-[11px] text-warning">No specs in this project yet — switch to <strong>Specs</strong> first.</p>
              )}
            </Field>
          )}

          {src === 'COLLECTION' && (
            <Field label="Collection" required hint="Pick a request collection.">
              <select
                data-testid="inline-run-collection-select"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className={inputCls()}
              >
                <option value="">— select a collection —</option>
                {(collsQ.data ?? []).map((c: any) => (
                  <option key={c.id ?? c.collectionId} value={c.id ?? c.collectionId}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}

          {src === 'INLINE' && (
            <>
              <Field label="Inline format hint">
                <select
                  data-testid="inline-run-hint"
                  value={inlineHint}
                  onChange={(e) => setInlineHint(e.target.value as InlineHintType)}
                  className={`${inputCls()} max-w-44`}
                >
                  {HINTS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
              <Field label="Content" required hint="Paste a Postman collection / OpenAPI / HAR / cURL …">
                <textarea
                  data-testid="inline-run-content"
                  value={inlineContent}
                  onChange={(e) => setInlineContent(e.target.value)}
                  rows={8}
                  placeholder="Paste your content here…"
                  className="block w-full resize-y rounded-md border border-border bg-probestack-bg px-3 py-2 font-mono text-[12px] leading-snug shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
            </>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Run name" hint="Auto-generated from source if empty.">
              <input
                data-testid="inline-run-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Smoke test on staging"
                className={inputCls()}
              />
            </Field>
            <Field label="Environment" hint="Inject variables / base URLs from a saved environment.">
              <select
                data-testid="inline-run-env-select"
                value={environmentId}
                onChange={(e) => setEnvironmentId(e.target.value)}
                className={inputCls()}
              >
                <option value="">— none —</option>
                {(envsQ.data ?? []).map((e: any) => {
                  // Show the scope alongside the name so the user can tell
                  // at a glance whether they're picking a PROJECT-level env,
                  // a COLLECTION-scoped variable bag, an ENVIRONMENT card,
                  // or the GLOBAL shared one. Matches the variables tab
                  // naming convention ("<name> (SCOPE)").
                  const scope = String(e.scope ?? 'ENVIRONMENT').toUpperCase();
                  return (
                    <option key={e.id ?? e.environmentId} value={e.id ?? e.environmentId}>
                      {e.name} ({scope})
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>
        </div>

        {/* Advanced — collapsed by default */}
        <div className="rounded-xl border border-border/60 bg-probestack-bg/40">
          <button
            type="button"
            data-testid="inline-run-advanced-toggle"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-hover/40"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs font-semibold tracking-tight">Advanced configuration</span>
            <span className="text-[10px] text-text-muted">parallelism · retries · timeouts · iterations</span>
            <ChevronDown className={cn('ml-auto h-4 w-4 text-text-muted transition-transform', advancedOpen && 'rotate-180')} />
          </button>
          {advancedOpen && (
            <div data-testid="inline-run-advanced-panel" className="grid gap-4 border-t border-border/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Knob label="Max parallel steps" testId="inline-run-parallelism" value={maxParallelSteps} min={1}  max={32}     onChange={setMaxParallelSteps} />
              <Knob label="Retry count"        testId="inline-run-retries"     value={retryCount}      min={0}  max={5}      onChange={setRetryCount} />
              <Knob label="Retry delay (ms)"   testId="inline-run-retry-delay" value={retryDelayMs}    min={0}  max={60000}  onChange={setRetryDelayMs} />
              <Knob label="Step timeout (ms)"  testId="inline-run-step-timeout" value={stepTimeoutMs} min={1000} max={600000} onChange={setStepTimeoutMs} />
              <Knob label="Request timeout (ms)" testId="inline-run-req-timeout" value={requestTimeoutMs} min={1000} max={300000} onChange={setRequestTimeoutMs} />
              <Knob label="Iterations"         testId="inline-run-iterations"  value={iterations}      min={1}  max={1000}   onChange={setIterations} />
              <Toggle label="Fail fast"               testId="inline-run-failfast"  hint="Stop on first failure"     checked={failFast}    onChange={setFailFast} />
              <Toggle label="Validate schema"         testId="inline-run-validate"  hint="OpenAPI response validation" checked={validateSchema} onChange={setValidateSchema} />
              <Toggle label="Capture response body"   testId="inline-run-capture"   hint="Persist bodies for debugging" checked={captureResponseBody} onChange={setCaptureBody} />
              {/* Task 3.5 — Region selector. Multi-select chip group. */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Regions <span className="ml-1 normal-case text-text-muted/70">— pick 1+ regions to fan-out a run per region</span>
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="inline-run-regions">
                  {(['us-central1', 'us-east1', 'europe-west1', 'asia-south1', 'asia-southeast1', 'australia-southeast1'] as const).map((r) => {
                    const active = regions.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        data-testid={`region-chip-${r}`}
                        onClick={() => setRegions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                          active
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border text-text-muted hover:bg-hover',
                        )}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Task 3.3 — Data-file uploader. Each row becomes one iteration. */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Data file (CSV / JSON) <span className="ml-1 normal-case text-text-muted/70">— each row → one iteration; columns map to {`{{var}}`}</span>
                </label>
                <div className="mt-1.5">
                  <DataFileUpload
                    workspaceId={workspaceId}
                    onUploaded={(f) => setDataFile({ fileId: f.fileId, storedPath: f.storedPath, rowCount: f.rowCount })}
                    onCleared={() => setDataFile(null)}
                  />
                </div>
              </div>

              {/* Task 3.4 — Pre/post scripts. JS snippets that run around every step. */}
              <div className="sm:col-span-2 lg:col-span-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Pre-request script
                    <span className="ml-1 normal-case text-text-muted/70">— runs before each step. Access: <code>request</code>, <code>vars</code>, <code>env</code></span>
                  </label>
                  <textarea
                    data-testid="inline-run-pre-script"
                    value={preScript}
                    onChange={(e) => setPreScript(e.target.value)}
                    rows={5}
                    placeholder={`// e.g. vars.timestamp = Date.now();
// request.headers['X-Request-Id'] = crypto.randomUUID();`}
                    className="mt-1.5 w-full rounded border border-border bg-transparent px-2 py-1.5 font-mono text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Post-response script
                    <span className="ml-1 normal-case text-text-muted/70">— runs after each step. Access: <code>request</code>, <code>response</code>, <code>vars</code>, <code>pm.test()</code></span>
                  </label>
                  <textarea
                    data-testid="inline-run-post-script"
                    value={postScript}
                    onChange={(e) => setPostScript(e.target.value)}
                    rows={5}
                    placeholder={`// e.g. pm.test("Status is 200", () => response.status === 200);
// vars.token = response.json.token;`}
                    className="mt-1.5 w-full rounded border border-border bg-transparent px-2 py-1.5 font-mono text-[10px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-text-muted">
            Once queued, the run executes in the background — you can leave this page and we'll toast you on completion.
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={() => startMut.mutate()}
            disabled={!canSubmit || startMut.isPending}
            data-testid="inline-run-submit"
            className="min-w-44"
          >
            {startMut.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Queuing…</>
              : <><Play className="h-4 w-4" /> Queue functional run</>}
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

const Knob = ({ label, value, onChange, min, max, testId }: {
  label: string; value: number; onChange: (n: number) => void; min: number; max: number; testId: string;
}) => (
  <Field label={label}>
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
