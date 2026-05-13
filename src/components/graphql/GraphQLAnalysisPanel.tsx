/**
 * GraphQLAnalysisPanel — compact, collapsible readout shown below the
 * GraphQL body editor. Two sections:
 *
 *   • Query Complexity — depth · fields · aliases · cost. Cost is
 *     banded into low / medium / high / severe with a coloured badge.
 *   • Schema Lint — runs `lintSchema()` once the user introspects and
 *     lists the rule violations with severity dots.
 */
import { useMemo, useState } from 'react';
import { Activity, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { analyzeQueryComplexity, lintSchema, type LintSeverity } from '@/components/graphql/analyzers';
import { buildClientSchema, type IntrospectionQuery } from 'graphql';

const TIER_CLASS: Record<'low' | 'medium' | 'high' | 'severe', string> = {
  low:    'bg-green-500/10 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  high:   'bg-orange-500/10 text-orange-400 border-orange-500/30',
  severe: 'bg-red-500/10 text-red-400 border-red-500/30',
};
const SEV_DOT: Record<LintSeverity, string> = {
  info:    'bg-sky-400',
  warning: 'bg-yellow-400',
  error:   'bg-red-400',
};

export function GraphQLAnalysisPanel({
  query, introspection,
}: {
  query: string;
  introspection: IntrospectionQuery | null;
}) {
  const complexity = useMemo(() => analyzeQueryComplexity(query), [query]);
  const schema = useMemo(() => {
    if (!introspection) return null;
    try { return buildClientSchema(introspection); } catch { return null; }
  }, [introspection]);
  const lint = useMemo(() => lintSchema(schema), [schema]);
  const [open, setOpen] = useState(false);

  return (
    <div
      data-testid="gql-analysis-root"
      className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-elevated/40 px-3 py-1.5 text-[10px]"
    >
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3 text-text-muted" />
        <span className="text-text-muted">Complexity</span>
        <span data-testid="gql-analysis-cost" className="font-mono font-semibold text-text-primary">
          cost={complexity.cost}
        </span>
        <span className="text-text-muted">·</span>
        <span className="font-mono">depth {complexity.depth}</span>
        <span className="text-text-muted">·</span>
        <span className="font-mono">{complexity.fields} field{complexity.fields === 1 ? '' : 's'}</span>
        {complexity.aliases > 0 && (
          <>
            <span className="text-text-muted">·</span>
            <span className="font-mono">{complexity.aliases} alias</span>
          </>
        )}
        <span
          data-testid="gql-analysis-tier"
          className={cn('rounded-full border px-1.5 py-0 font-semibold uppercase tracking-wide', TIER_CLASS[complexity.tier])}
        >
          {complexity.tier}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-text-muted" />
        <span className="text-text-muted">Schema lint</span>
        <button
          data-testid="gql-analysis-lint-toggle"
          onClick={() => setOpen((o) => !o)}
          disabled={!schema}
          className="flex items-center gap-0.5 rounded px-1 hover:bg-hover disabled:opacity-40"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="font-semibold">
            {schema ? `${lint.length} issue${lint.length === 1 ? '' : 's'}` : 'introspect first'}
          </span>
        </button>
      </div>

      {open && (
        <ul
          data-testid="gql-analysis-lint-list"
          className="basis-full divide-y divide-border/40 rounded-md border border-border/60 bg-elevated/40 text-[11px]"
        >
          {lint.length === 0 ? (
            <li className="px-3 py-2 text-center text-text-muted">No lint issues</li>
          ) : (
            lint.map((f, i) => (
              <li
                key={`${f.rule}-${i}`}
                data-testid={`gql-analysis-lint-row-${f.rule}`}
                className="flex items-start gap-2 px-3 py-1.5"
              >
                <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', SEV_DOT[f.severity])} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-text-muted">{f.rule}{f.location ? ` · ${f.location}` : ''}</div>
                  <div className="text-text-primary">{f.message}</div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
