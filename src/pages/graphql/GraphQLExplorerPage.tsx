/**
 * GraphQLExplorerPage — standalone GraphQL workbench.
 *
 *   • URL input + headers KV
 *   • Introspect button → hits the endpoint with the standard introspection query
 *     and renders a collapsible schema tree (Queries, Mutations, Subscriptions, Types)
 *   • Query editor (plain textarea with monospace) + Variables JSON editor
 *   • Run Query → POSTs { query, variables } and shows JSON response
 *
 *   Reuses the existing axios client and types only — no new backend dependency.
 *   Safe to ship alongside REST: lives at its own route /projects/graphql.
 */
import { useMemo, useState } from 'react';
import axios from 'axios';
import { Play, Search, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

const INTROSPECTION_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      name
      kind
      description
      fields(includeDeprecated: true) {
        name
        description
        args { name type { name kind ofType { name kind } } defaultValue }
        type { name kind ofType { name kind } }
      }
    }
  }
}`.trim();

const EXAMPLE_QUERY = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}`;

const EXAMPLE_VARS = `{
  "id": "42"
}`;

interface Field {
  name: string;
  description?: string;
  args: { name: string; type: any; defaultValue?: string }[];
  type: any;
}

interface GqlType {
  name: string;
  kind: string;
  description?: string;
  fields?: Field[];
}

const typeLabel = (t: any): string => {
  if (!t) return '—';
  if (t.name) return t.name;
  if (t.ofType) return t.kind === 'LIST' ? `[${typeLabel(t.ofType)}]` : `${typeLabel(t.ofType)}!`;
  return t.kind ?? '?';
};

export function GraphQLExplorerPage() {
  const [url, setUrl] = useState('https://countries.trevorblades.com/graphql');
  const [query, setQuery] = useState(EXAMPLE_QUERY);
  const [variables, setVariables] = useState(EXAMPLE_VARS);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [response, setResponse] = useState<any>(null);
  const [schema, setSchema] = useState<GqlType[] | null>(null);
  const [running, setRunning] = useState(false);
  const [introspecting, setIntrospecting] = useState(false);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Query: true });

  const buildHeaders = () =>
    headers.filter((h) => h.key.trim()).reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

  const runQuery = async () => {
    setRunning(true);
    setError(null);
    setResponse(null);
    try {
      let vars: any = undefined;
      if (variables.trim()) {
        try { vars = JSON.parse(variables); }
        catch { throw new Error('Variables must be valid JSON'); }
      }
      const { data } = await axios.post(url, { query, variables: vars }, { headers: buildHeaders() });
      setResponse(data);
    } catch (e: any) {
      setError(e?.response?.data ? JSON.stringify(e.response.data, null, 2) : e.message);
    } finally {
      setRunning(false);
    }
  };

  const introspect = async () => {
    setIntrospecting(true);
    setError(null);
    try {
      const { data } = await axios.post(
        url,
        { query: INTROSPECTION_QUERY },
        { headers: buildHeaders() },
      );
      if (data?.errors) throw new Error(JSON.stringify(data.errors));
      const types: GqlType[] = (data?.data?.__schema?.types ?? [])
        .filter((t: GqlType) => !t.name.startsWith('__'))
        .sort((a: GqlType, b: GqlType) => a.name.localeCompare(b.name));
      setSchema(types);
    } catch (e: any) {
      setError(e?.response?.data ? JSON.stringify(e.response.data, null, 2) : e.message);
      setSchema(null);
    } finally {
      setIntrospecting(false);
    }
  };

  const filteredSchema = useMemo(() => {
    if (!schema) return null;
    if (!filter.trim()) return schema;
    const f = filter.toLowerCase();
    return schema.filter((t) => t.name.toLowerCase().includes(f));
  }, [schema, filter]);

  const toggleHeader = (i: number, key: 'key' | 'value', val: string) => {
    const copy = [...headers];
    copy[i][key] = val;
    setHeaders(copy);
  };

  return (
    <div data-testid="graphql-explorer" className="flex h-[calc(100vh-120px)] flex-col gap-3 p-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <div className="flex h-8 items-center gap-1.5 rounded-md bg-pink-500/10 px-2 text-[11px] font-bold text-pink-500">
          <Sparkles className="h-3.5 w-3.5" />
          GraphQL
        </div>
        <input
          data-testid="graphql-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/graphql"
          className="h-8 flex-1 rounded-md border border-border bg-probestack-bg px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          data-testid="graphql-introspect"
          onClick={introspect}
          disabled={introspecting}
          className="h-8 rounded-md border border-border bg-surface px-3 text-xs font-semibold hover:bg-hover disabled:opacity-50"
        >
          {introspecting ? 'Introspecting…' : 'Introspect schema'}
        </button>
        <button
          data-testid="graphql-run"
          onClick={runQuery}
          disabled={running}
          className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {running ? 'Running…' : 'Run query'}
        </button>
      </div>

      {/* Headers */}
      <details className="rounded-xl border border-border bg-surface">
        <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Headers ({headers.length})
        </summary>
        <div className="flex flex-col gap-1.5 border-t border-border/60 px-3 py-2">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={h.key}
                onChange={(e) => toggleHeader(i, 'key', e.target.value)}
                placeholder="Key"
                className="h-7 flex-1 rounded-md border border-border bg-probestack-bg px-2 text-xs font-mono focus:outline-none"
              />
              <input
                value={h.value}
                onChange={(e) => toggleHeader(i, 'value', e.target.value)}
                placeholder="Value"
                className="h-7 flex-1 rounded-md border border-border bg-probestack-bg px-2 text-xs font-mono focus:outline-none"
              />
              <button
                onClick={() => setHeaders(headers.filter((_, idx) => idx !== i))}
                className="rounded-md border border-border bg-surface px-2 text-xs hover:bg-hover"
              >×</button>
            </div>
          ))}
          <button
            onClick={() => setHeaders([...headers, { key: '', value: '' }])}
            className="self-start rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] hover:bg-hover"
          >+ Add header</button>
        </div>
      </details>

      {/* Body: 3 columns — schema / query+vars / response */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        {/* Schema */}
        <div className="col-span-3 flex min-h-0 flex-col rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-1 border-b border-border/60 px-3 py-2">
            <Search className="h-3 w-3 text-text-muted" />
            <input
              data-testid="graphql-schema-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter types…"
              className="h-6 flex-1 bg-transparent text-[11px] focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-auto p-2 text-xs font-mono">
            {!schema && (
              <div className="p-4 text-center text-[11px] text-text-muted">
                Click <span className="font-semibold">Introspect schema</span> to explore types.
              </div>
            )}
            {filteredSchema?.map((t) => (
              <div key={t.name} className="mb-0.5">
                <button
                  onClick={() => setExpanded((x) => ({ ...x, [t.name]: !x[t.name] }))}
                  className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-hover/50"
                >
                  {expanded[t.name] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="text-[10px] text-text-muted">{t.kind}</span>
                  <span className="font-semibold">{t.name}</span>
                </button>
                {expanded[t.name] && t.fields && (
                  <div className="ml-4 border-l border-border/60 pl-2">
                    {t.fields.map((f) => (
                      <div key={f.name} className="py-0.5 text-[11px]">
                        <span className="text-cyan-400">{f.name}</span>
                        {f.args.length > 0 && (
                          <span className="text-text-muted">({f.args.map((a) => `${a.name}: ${typeLabel(a.type)}`).join(', ')})</span>
                        )}
                        <span className="text-text-muted">: </span>
                        <span className="text-orange-400">{typeLabel(f.type)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Query + Vars */}
        <div className="col-span-5 flex min-h-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-surface">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Query
            </div>
            <textarea
              data-testid="graphql-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 resize-none bg-probestack-bg p-3 font-mono text-xs focus:outline-none"
              spellCheck={false}
            />
          </div>
          <div className="flex h-40 flex-col rounded-xl border border-border bg-surface">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Variables (JSON)
            </div>
            <textarea
              data-testid="graphql-variables"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              className="flex-1 resize-none bg-probestack-bg p-3 font-mono text-xs focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Response */}
        <div className="col-span-4 flex min-h-0 flex-col rounded-xl border border-border bg-surface">
          <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Response
          </div>
          <pre
            data-testid="graphql-response"
            className={cn(
              'flex-1 overflow-auto p-3 font-mono text-[11px] leading-snug',
              error ? 'text-red-400' : 'text-text-primary',
            )}
          >
            {error ? error : response ? JSON.stringify(response, null, 2) : '// Response will appear here'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default GraphQLExplorerPage;
