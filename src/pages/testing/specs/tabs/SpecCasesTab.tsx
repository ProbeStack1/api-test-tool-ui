/**
 * SpecCasesTab — paginated list of test cases for the spec.
 * Filters: category dropdown.
 * Each row expands to show the generated assertion script + sample
 * request body + response sample.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Filter, Sparkles, ListChecks } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import {
  listTestCases,
  type TestSpec,
  type TestCase,
} from '@/services/testSpec.service';
import { CategoryBadge, MethodTag } from '../../shared/Badges';
import { cn } from '@/utils/cn';

interface Props { spec: TestSpec; onGoToGenerate?: () => void }

const CATEGORIES = ['ALL', 'POSITIVE', 'NEGATIVE', 'VALIDATION', 'PERFORMANCE', 'SECURITY', 'BOUNDARY'] as const;
type Cat = typeof CATEGORIES[number];

export const SpecCasesTab = ({ spec, onGoToGenerate }: Props) => {
  const [category, setCategory] = useState<Cat>('ALL');
  const [page, setPage] = useState(0);
  const size = 20;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['testSpec', 'cases', spec.testSpecId, category, page],
    queryFn: () => listTestCases(spec.testSpecId, {
      category: category === 'ALL' ? undefined : category,
      page, size,
    }),
  });

  const cases = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex h-full flex-col p-6" data-testid="spec-cases-tab">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ListChecks className="h-4 w-4 text-primary" /> Test cases
          <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">
            {totalElements}
          </span>
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-text-muted" />
          <select
            data-testid="spec-cases-category"
            value={category}
            onChange={(e) => { setCategory(e.target.value as Cat); setPage(0); }}
            className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'All categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border">
        {isLoading ? (
          <div className="space-y-1 p-2" data-testid="spec-cases-loading">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : cases.length === 0 ? (
          <EmptyState onGoToGenerate={onGoToGenerate} />
        ) : (
          <ul className="divide-y divide-border" data-testid="spec-cases-list">
            {cases.map((c) => (
              <li key={c.testCaseId} data-testid={`spec-case-row-${c.testCaseId}`}>
                <button
                  onClick={() => toggle(c.testCaseId)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-hover/40"
                >
                  <ChevronRight
                    className={cn('h-3.5 w-3.5 shrink-0 text-text-muted transition-transform', expanded.has(c.testCaseId) && 'rotate-90')}
                  />
                  <CategoryBadge category={c.category} />
                  <MethodTag method={c.method} className="w-12 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  {c.priority && (
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                      {c.priority}
                    </span>
                  )}
                </button>
                {expanded.has(c.testCaseId) && (
                  <CaseDetail c={c} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            data-testid="spec-cases-prev"
          >
            Prev
          </Button>
          <span className="text-text-muted">Page {page + 1} of {totalPages}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            data-testid="spec-cases-next"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

const CaseDetail = ({ c }: { c: TestCase }) => (
  <div className="space-y-2 border-t border-border/40 bg-elevated/20 px-6 py-3 text-[11px]">
    <Row label="URL"  value={c.url ?? '—'} mono />
    {c.description &&    <Row label="Description"   value={c.description} />}
    {c.expectedStatus &&  <Row label="Expected"      value={c.expectedStatus} />}
    {c.expectedBehavior && <Row label="Behavior"     value={c.expectedBehavior} />}
    {c.summary &&         <Row label="Summary"       value={c.summary} />}
    {c.endpointName &&    <Row label="Endpoint"      value={c.endpointName} mono />}
    {c.testType &&        <Row label="Test type"     value={c.testType} mono />}

    {c.generatedTestScript && (
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <Sparkles className="h-3 w-3" /> Generated assertion
        </div>
        <pre
          data-testid={`spec-case-script-${c.testCaseId}`}
          className="overflow-x-auto rounded border border-border bg-probestack-bg p-2 font-mono text-[10px] leading-relaxed text-text-secondary"
        >{c.generatedTestScript}</pre>
      </div>
    )}

    {c.requestBodySample && (
      <details>
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Request body sample
        </summary>
        <pre className="mt-1 overflow-x-auto rounded border border-border bg-probestack-bg p-2 font-mono text-[10px] leading-relaxed text-text-secondary">
          {c.requestBodySample}
        </pre>
      </details>
    )}

    {c.parameters && c.parameters.length > 0 && (
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Parameters</div>
        <ul className="space-y-0.5">
          {c.parameters.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center gap-2 font-mono text-[10px] text-text-secondary">
              <span className="rounded bg-elevated px-1">{p.in ?? 'query'}</span>
              <span className="font-semibold">{p.name}</span>
              {p.type && <span className="text-text-muted">{p.type}</span>}
              {p.required && <span className="text-warning">required</span>}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex gap-3">
    <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
    <span className={cn('min-w-0 flex-1 break-all text-text-secondary', mono && 'font-mono text-[10px]')}>{value}</span>
  </div>
);

const EmptyState = ({ onGoToGenerate }: { onGoToGenerate?: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center" data-testid="spec-cases-empty">
    <ListChecks className="h-8 w-8 text-text-muted" />
    <p className="text-sm font-medium">No test cases yet</p>
    <p className="max-w-xs text-xs text-text-muted">
      Derive cases automatically from this spec — or try a different category filter.
    </p>
    {onGoToGenerate && (
      <Button
        variant="primary"
        size="sm"
        data-testid="spec-cases-go-generate"
        onClick={onGoToGenerate}
      >
        <Sparkles className="h-3.5 w-3.5" /> Generate test cases
      </Button>
    )}
  </div>
);
