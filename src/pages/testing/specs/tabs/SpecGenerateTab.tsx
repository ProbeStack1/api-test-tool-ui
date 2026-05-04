/**
 * SpecGenerateTab — preview + commit flow for case generation.
 *
 *   1. User picks categories with toggles (Positive, Negative,
 *      Validation, Performance, Security, Boundary) + an optional
 *      `responseTimeThresholdMs` for performance asserts.
 *   2. "Preview" calls `/generate-preview` → server returns the
 *      diff (added / removed / unchanged + per-category breakdown +
 *      first 25 sample names).
 *   3. "Generate" calls `/generate` to commit.
 *
 * `force=true` toggle replaces the existing case set. When unchecked,
 * the server only acts when `contentChanged`.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Eye, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  previewTestCases, generateTestCases,
  type GenerateRequestBody, type PreviewResponse, type GenerateResponse,
  type TestSpec,
} from '@/services/testSpec.service';
import { CategoryBadge } from '../../shared/Badges';
import { cn } from '@/utils/cn';

interface Props { spec: TestSpec }

const CATEGORY_TOGGLES: { key: keyof GenerateRequestBody; label: string; cat: string }[] = [
  { key: 'includePositive',    label: 'Positive',     cat: 'POSITIVE' },
  { key: 'includeNegative',    label: 'Negative',     cat: 'NEGATIVE' },
  { key: 'includeValidation',  label: 'Validation',   cat: 'VALIDATION' },
  { key: 'includePerformance', label: 'Performance',  cat: 'PERFORMANCE' },
  { key: 'includeSecurity',    label: 'Security',     cat: 'SECURITY' },
  { key: 'includeBoundary',    label: 'Boundary',     cat: 'BOUNDARY' },
];

export const SpecGenerateTab = ({ spec }: Props) => {
  const qc = useQueryClient();
  const [opts, setOpts] = useState<GenerateRequestBody>({
    includePositive: true,
    includeNegative: true,
    includeValidation: true,
    includePerformance: true,
    includeSecurity: false,
    includeBoundary: false,
    responseTimeThresholdMs: 5000,
    force: false,
  });
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [committed, setCommitted] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewMut = useMutation({
    mutationFn: () => previewTestCases(spec.testSpecId, opts),
    onSuccess: (r) => { setPreview(r); setCommitted(null); setError(null); },
    onError: (e: any) => setError(e?.message ?? 'Preview failed'),
  });
  const commitMut = useMutation({
    mutationFn: () => generateTestCases(spec.testSpecId, opts),
    onSuccess: (r) => {
      setCommitted(r);
      qc.invalidateQueries({ queryKey: ['testSpec', 'cases', spec.testSpecId] });
      qc.invalidateQueries({ queryKey: ['testSpec', 'detail', spec.testSpecId] });
    },
    onError: (e: any) => setError(e?.message ?? 'Generate failed'),
  });

  const setOpt = <K extends keyof GenerateRequestBody>(k: K, v: GenerateRequestBody[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  return (
    <div className="space-y-4 p-6" data-testid="spec-generate-tab">
      <section className="rounded-lg border border-border bg-surface/40 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Sparkles className="h-4 w-4 text-primary" /> Generate options
        </h3>
        <p className="mb-3 text-[11px] text-text-muted">
          Pick which categories of test cases to derive from this spec's endpoints. Preview first to
          see the diff, then commit when satisfied.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_TOGGLES.map((t) => (
            <label
              key={t.key}
              data-testid={`spec-gen-toggle-${t.key}`}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors',
                opts[t.key]
                  ? 'border-primary/50 bg-primary/[0.06]'
                  : 'border-border bg-probestack-bg hover:bg-hover',
              )}
            >
              <input
                type="checkbox"
                checked={!!opts[t.key]}
                onChange={(e) => setOpt(t.key, e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <CategoryBadge category={t.cat} />
              <span className="font-medium">{t.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-medium text-text-secondary">Performance threshold (ms):</span>
            <input
              type="number"
              data-testid="spec-gen-threshold"
              min={100}
              max={300000}
              value={opts.responseTimeThresholdMs ?? 5000}
              onChange={(e) => setOpt('responseTimeThresholdMs', Number(e.target.value))}
              className="h-7 w-32 rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              data-testid="spec-gen-force"
              checked={!!opts.force}
              onChange={(e) => setOpt('force', e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span className="font-medium text-text-secondary">Force replace existing cases</span>
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => previewMut.mutate()}
            disabled={previewMut.isPending}
            data-testid="spec-gen-preview-btn"
          >
            {previewMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Preview diff
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => commitMut.mutate()}
            disabled={commitMut.isPending}
            data-testid="spec-gen-commit-btn"
          >
            {commitMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate
          </Button>
        </div>

        {error && (
          <p
            data-testid="spec-gen-error"
            className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </p>
        )}
      </section>

      {preview && <PreviewBlock preview={preview} />}
      {committed && (
        <section
          data-testid="spec-gen-committed"
          className="rounded-lg border border-success/30 bg-success/[0.06] p-4 text-xs"
        >
          <div className="mb-1 flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Test cases generated
          </div>
          <div className="text-text-secondary">
            <strong>{committed.generated}</strong> created
            {committed.deletedOld > 0 && <> · <strong>{committed.deletedOld}</strong> deleted</>}
            {' '}across <strong>{committed.endpoints}</strong> endpoints. Switch to the
            <strong> Test Cases</strong> tab to inspect them.
          </div>
        </section>
      )}
    </div>
  );
};

const PreviewBlock = ({ preview }: { preview: PreviewResponse }) => (
  <section
    data-testid="spec-gen-preview"
    className="rounded-lg border border-border bg-surface/40 p-4 text-xs"
  >
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight">
      <Eye className="h-4 w-4 text-primary" /> Preview
    </h3>
    <div className="grid gap-3 sm:grid-cols-4">
      <Stat label="Endpoints"   value={String(preview.endpoints)} />
      <Stat label="Would be"    value={String(preview.wouldBeCases)} />
      <Stat label="Added"       value={`+${preview.added}`} tone="success" />
      <Stat label="Removed"     value={`-${preview.removed}`} tone={preview.removed > 0 ? 'warning' : 'muted'} />
    </div>

    {!preview.contentChanged && (
      <p className="mt-3 flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/[0.06] px-3 py-2 text-warning">
        <AlertTriangle className="h-3.5 w-3.5" />
        Content hasn't changed since the last generation. Enable
        <strong className="mx-1">Force replace</strong> to regenerate anyway.
      </p>
    )}

    {preview.byCategory.length > 0 && (
      <div className="mt-3">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">By category</div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {preview.byCategory.map((b) => (
            <li
              key={b.category}
              data-testid={`spec-gen-cat-${b.category}`}
              className="flex items-center gap-2 rounded-md border border-border bg-probestack-bg px-2 py-1"
            >
              <CategoryBadge category={b.category} />
              <span className="text-text-secondary">
                {b.current} → {b.wouldBe}
              </span>
              <span
                className={cn(
                  'ml-auto font-mono',
                  b.delta > 0 ? 'text-success' : b.delta < 0 ? 'text-warning' : 'text-text-muted',
                )}
              >
                {b.delta > 0 ? `+${b.delta}` : b.delta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {preview.addedSamples && preview.addedSamples.length > 0 && (
      <details className="mt-3" data-testid="spec-gen-added-samples">
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Added samples ({preview.addedSamples.length})
        </summary>
        <ul className="mt-1 space-y-0.5">
          {preview.addedSamples.map((n, i) => (
            <li key={i} className="font-mono text-[10px] text-text-secondary">
              <span className="text-success">+</span> {n}
            </li>
          ))}
        </ul>
      </details>
    )}
  </section>
);

const Stat = ({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'muted' }) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    muted:   'text-text-muted',
  };
  return (
    <div className="rounded-md border border-border bg-probestack-bg p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className={cn('text-base font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};
