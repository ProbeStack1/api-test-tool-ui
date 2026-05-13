/**
 * GraphQLDocsPanel — collapsible schema documentation drawer.
 *
 *  Shows Queries, Mutations, Subscriptions, and any Object types in a
 *  searchable tree. Clicking a field calls `onInsertField` so the
 *  editor can drop the selection-set right at the cursor.
 *
 *  Designed to be cheap: receives the raw `types` array straight from
 *  the introspection payload — no schema-building per render. We only
 *  expand a group when the user clicks it, so very large schemas
 *  (hundreds of types) stay snappy.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

type GqlField = { name: string; description?: string | null; type: any };
type GqlType  = {
  name: string;
  kind: string;
  description?: string | null;
  fields?: GqlField[] | null;
  enumValues?: { name: string; description?: string | null }[] | null;
};

interface Props {
  schema: GqlType[] | null;
  queryTypeName?: string;
  mutationTypeName?: string;
  subscriptionTypeName?: string;
  onInsertField?: (typeName: string, fieldName: string) => void;
}

const renderType = (t: any): string => {
  if (!t) return 'Unknown';
  if (t.kind === 'NON_NULL') return renderType(t.ofType) + '!';
  if (t.kind === 'LIST')     return '[' + renderType(t.ofType) + ']';
  return t.name || 'Unknown';
};

export function GraphQLDocsPanel({
  schema, queryTypeName, mutationTypeName, subscriptionTypeName, onInsertField,
}: Props) {
  const [q, setQ] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Query: true });

  const groups = useMemo(() => {
    if (!schema) return [] as { label: string; types: GqlType[] }[];
    const byName = new Map<string, GqlType>();
    for (const t of schema) byName.set(t.name, t);

    const ops: { label: string; types: GqlType[] }[] = [];
    if (queryTypeName && byName.get(queryTypeName))
      ops.push({ label: 'Query', types: [byName.get(queryTypeName)!] });
    if (mutationTypeName && byName.get(mutationTypeName))
      ops.push({ label: 'Mutation', types: [byName.get(mutationTypeName)!] });
    if (subscriptionTypeName && byName.get(subscriptionTypeName))
      ops.push({ label: 'Subscription', types: [byName.get(subscriptionTypeName)!] });

    const otherObjects = schema
      .filter((t) => t.kind === 'OBJECT' &&
                     !t.name.startsWith('__') &&
                     t.name !== queryTypeName &&
                     t.name !== mutationTypeName &&
                     t.name !== subscriptionTypeName)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (otherObjects.length) ops.push({ label: 'Object Types', types: otherObjects });
    return ops;
  }, [schema, queryTypeName, mutationTypeName, subscriptionTypeName]);

  const matches = (s?: string | null) => !q || (s ?? '').toLowerCase().includes(q.toLowerCase());

  return (
    <div className="flex h-full flex-col" data-testid="graphql-docs-panel">
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            data-testid="graphql-docs-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search schema"
            className="h-7 w-full rounded border border-border bg-elevated pl-7 pr-2 text-[11px] text-text-primary focus:border-primary focus:outline-none"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1 text-[11px]">
        {!schema && (
          <div className="p-3 text-text-muted">No schema loaded.</div>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-1">
            <button
              data-testid={`graphql-docs-group-${g.label}`}
              onClick={() => setOpenGroups((s) => ({ ...s, [g.label]: !s[g.label] }))}
              className="flex w-full items-center gap-1 rounded px-2 py-1 text-left font-semibold uppercase tracking-wide text-text-secondary hover:bg-hover"
            >
              {openGroups[g.label] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {g.label}
              <span className="ml-auto text-[10px] text-text-muted">{g.types.length}</span>
            </button>
            {openGroups[g.label] && g.types.map((t) => (
              <div key={t.name} className="mb-1 ml-3">
                <div className="px-2 py-0.5 font-mono text-cyan-300">{t.name}</div>
                <ul className="ml-2 space-y-0.5">
                  {(t.fields ?? []).filter((f) => matches(f.name) || matches(f.description)).map((f) => (
                    <li key={f.name}>
                      <button
                        data-testid={`graphql-docs-field-${t.name}-${f.name}`}
                        onClick={() => onInsertField?.(t.name, f.name)}
                        className={cn(
                          'group flex w-full items-center gap-2 rounded px-2 py-0.5 text-left',
                          'hover:bg-hover',
                        )}
                        title={f.description ?? ''}
                      >
                        <span className="truncate font-mono text-text-primary">{f.name}</span>
                        <span className="ml-auto truncate font-mono text-[10px] text-orange-300">{renderType(f.type)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
