/**
 * GraphqlBodyEditor — sub-editor mounted by BodyEditor when the saved
 * request's `body.mode === 'graphql'`.
 *
 * Layout decisions (per the user's feedback Tues 12/05):
 *   • The body-mode radio strip + tabs row above us (Params / Headers /
 *     Body / Auth / Pre-request Script / Tests / Comments) stay
 *     visible — we render INSIDE the existing body container, not as a
 *     full takeover. That means a GraphQL request gets the same
 *     surrounding shell as a REST request.
 *   • Complexity + schema-lint live behind a single **Insights**
 *     toggle in the toolbar, not as a fixed strip below the editor.
 *     When the Response panel expands and steals vertical space,
 *     the inline metrics no longer get clipped.
 *   • **AI Build does NOT open a modal**. It opens the right-rail AI
 *     panel and feeds the existing chat UI a GraphQL-tuned prompt,
 *     with Insert / Reject / Retry available on every assistant turn.
 *   • Pre-request and Tests scripts come from the standard tabs
 *     (`Pre-request Script` and `Tests`) — same code path as REST.
 *   • Editor uses Monaco (the same instance as raw bodies / response
 *     viewer) with a Monarch GraphQL language registered on-demand.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Loader2, Play, BookOpen, X, Sparkles, Link2, Copy, Check, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { getIntrospectionQuery, type IntrospectionQuery } from 'graphql';
import {
  GraphQLQueryEditor, type GraphQLQueryEditorHandle,
} from '@/components/graphql/GraphQLQueryEditor';
import { GraphQLDocsPanel } from '@/components/graphql/GraphQLDocsPanel';
import { GraphQLVariablesPanel } from '@/components/graphql/GraphQLVariablesPanel';
import { GraphQLAnalysisPanel } from '@/components/graphql/GraphQLAnalysisPanel';
import { detectFederation } from '@/components/graphql/gqlExtras';
import {
  loadSnapshot, saveSnapshot, persistedQueryHash,
} from '@/components/graphql/snapshotCache';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';
import { useLayout } from '@/stores/layout.store';
import { useGraphqlAiBridge } from '@/stores/graphqlAiBridge.store';

export interface GraphqlBodyState {
  query: string;
  variables: string;
}

interface Props {
  url: string;
  value: GraphqlBodyState;
  onChange: (v: GraphqlBodyState) => void;
}

/** Compress an introspection schema into a short SDL summary that the
 *  AI service can ingest without blowing past the LLM's context. */
const summariseSchema = (intro: IntrospectionQuery | null): string => {
  if (!intro?.__schema) return '';
  const types = (intro.__schema.types ?? []).filter((t: any) =>
    !String(t.name).startsWith('__') &&
    (t.kind === 'OBJECT' || t.kind === 'INTERFACE' || t.kind === 'INPUT_OBJECT' || t.kind === 'ENUM'),
  );
  const renderRef = (t: any): string => {
    if (!t) return 'Unknown';
    if (t.kind === 'NON_NULL') return renderRef(t.ofType) + '!';
    if (t.kind === 'LIST')     return '[' + renderRef(t.ofType) + ']';
    return t.name || 'Unknown';
  };
  return types.map((t: any) => {
    if (t.kind === 'ENUM') {
      const vals = (t.enumValues ?? []).map((v: any) => v.name).join(' | ');
      return `enum ${t.name} { ${vals} }`;
    }
    const fields = (t.fields ?? t.inputFields ?? []).map((f: any) => {
      const ret = renderRef(f.type);
      const args = (f.args ?? []).length
        ? '(' + f.args.map((a: any) => `${a.name}: ${renderRef(a.type)}`).join(', ') + ')'
        : '';
      return `  ${f.name}${args}: ${ret}`;
    }).join('\n');
    return `${t.kind === 'INPUT_OBJECT' ? 'input' : 'type'} ${t.name} {\n${fields}\n}`;
  }).join('\n\n');
};

export const GraphqlBodyEditor = ({ url, value, onChange }: Props) => {
  const [introspection, setIntrospection] = useState<IntrospectionQuery | null>(null);
  const [introspecting, setIntrospecting] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [subTab, setSubTab] = useState<'query' | 'variables'>('query');
  const [pqHash, setPqHash] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState(false);
  const editorRef = useRef<GraphQLQueryEditorHandle>(null);

  const setRightTab = useLayout((s) => s.setRightTab);
  const toggleRight = useLayout((s) => s.toggleRight);
  const showRightSidebar = useLayout((s) => s.showRightSidebar);
  const requestBuild = useGraphqlAiBridge((s) => s.requestBuild);

  /* Hydrate cached introspection on URL change. */
  useEffect(() => {
    if (!url) { setIntrospection(null); return; }
    const snap = loadSnapshot(url);
    setIntrospection(snap?.introspection ?? null);
  }, [url]);

  /* Recompute APQ SHA-256 footer on every query change. */
  useEffect(() => {
    let cancelled = false;
    if (!value.query.trim()) { setPqHash(''); return; }
    persistedQueryHash(value.query).then((h) => { if (!cancelled) setPqHash(h); });
    return () => { cancelled = true; };
  }, [value.query]);

  const opTypes = useMemo(() => {
    const s: any = introspection?.__schema;
    return {
      query: s?.queryType?.name ?? 'Query',
      mutation: s?.mutationType?.name as string | undefined,
      subscription: s?.subscriptionType?.name as string | undefined,
    };
  }, [introspection]);

  const isFederated = useMemo(() => detectFederation(introspection), [introspection]);

  const introspect = async () => {
    if (!url.trim()) {
      toast.error('Set a URL first');
      return;
    }
    setIntrospecting(true);
    try {
      const { data } = await axios.post(url, { query: getIntrospectionQuery() });
      if (data?.errors) {
        toast.error('Introspection rejected: ' + (data.errors[0]?.message ?? 'unknown error'));
        return;
      }
      const intro = data?.data as IntrospectionQuery | undefined;
      if (!intro?.__schema) {
        toast.error('Endpoint returned no schema');
        return;
      }
      setIntrospection(intro);
      saveSnapshot(url, intro);
      toast.success('Schema introspected. Docs are now live.');
    } catch (e: any) {
      toast.error(e?.response?.data ? 'Introspection failed (see Response)' : (e?.message ?? 'Introspection failed'));
    } finally {
      setIntrospecting(false);
    }
  };

  const copyHash = async () => {
    if (!pqHash) return;
    try {
      await navigator.clipboard.writeText(pqHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  /** Open the right-rail AI tab in GraphQL-build mode. The tab reads
   *  from `useGraphqlAiBridge`, switches to a dedicated prompt UI, and
   *  on Accept calls `editorRef.current.insertAtCursor(query)`. */
  const openAiInRightRail = () => {
    requestBuild({
      schemaSdl: summariseSchema(introspection),
      onInsert: (q) => {
        // Land the AI suggestion at the current cursor (or replace
        // selection if any). Keep editor focused so the user can keep
        // typing.
        editorRef.current?.insertAtCursor(q);
        setSubTab('query');
        toast.success('Inserted into editor');
      },
    });
    // Open the right-rail AI tab. `RequestAwareAiTab` subscribes to
    // the bridge store and morphs into a GraphQL builder while
    // `pending` is true.
    setRightTab('ai');
    if (!showRightSidebar) toggleRight();
  };

  return (
    <div className="flex h-full flex-col gap-2" data-testid="graphql-body-editor">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex h-7 items-center gap-0.5 rounded-md border border-border bg-elevated p-0.5">
          {(['query', 'variables'] as const).map((t) => (
            <button
              key={t}
              type="button"
              data-testid={`graphql-subtab-${t}`}
              onClick={() => setSubTab(t)}
              className={cn(
                'inline-flex h-6 items-center rounded px-2 text-[11px] font-medium transition-colors',
                subTab === t ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
              )}
            >
              {t === 'query' ? 'Query' : 'Variables'}
            </button>
          ))}
        </div>

        <Tooltip content="Fetch schema from the endpoint">
          <Button
            size="sm"
            variant="outline"
            data-testid="graphql-introspect-btn"
            onClick={introspect}
            disabled={introspecting || !url.trim()}
            className="gap-1.5"
          >
            {introspecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Introspect
          </Button>
        </Tooltip>

        <Tooltip content="Open the AI panel on the right to build a query">
          <Button
            size="sm"
            variant="outline"
            data-testid="graphql-ai-builder-btn"
            onClick={openAiInRightRail}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Build
          </Button>
        </Tooltip>

        <Tooltip content={introspection ? 'Schema documentation' : 'Introspect first to see schema docs'}>
          <Button
            size="sm"
            variant={showDocs ? 'primary' : 'outline'}
            data-testid="graphql-docs-toggle"
            onClick={() => setShowDocs((v) => !v)}
            className="gap-1.5"
            disabled={!introspection}
          >
            {showDocs ? <X className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
            Docs
          </Button>
        </Tooltip>

        <Tooltip content="Show query complexity + schema lint">
          <Button
            size="sm"
            variant={showInsights ? 'primary' : 'outline'}
            data-testid="graphql-insights-toggle"
            onClick={() => setShowInsights((v) => !v)}
            className="gap-1.5"
          >
            <Activity className="h-3.5 w-3.5" />
            Insights
          </Button>
        </Tooltip>

        {isFederated && (
          <span
            data-testid="graphql-federation-badge"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/10 px-2 text-[11px] text-purple-400"
            title="Apollo Federation markers detected (_service, _entities)"
          >
            <Link2 className="h-3.5 w-3.5" /> Federated
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 text-[10px] text-text-muted" data-testid="graphql-schema-status">
          {introspection
            ? <>Schema loaded · {introspection.__schema?.types?.length ?? 0} types</>
            : <>No schema · click Introspect</>}
          {pqHash && (
            <button
              type="button"
              data-testid="graphql-apq-hash"
              onClick={copyHash}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-muted transition-colors hover:border-primary/40 hover:text-text-primary"
              title="Copy SHA-256 persisted-query hash"
            >
              {copiedHash ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              <span>sha256:{pqHash.slice(0, 10)}…</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor (+ optional docs side panel) */}
      <div className="flex min-h-[260px] flex-1 gap-2">
        <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border">
          {subTab === 'query' ? (
            <GraphQLQueryEditor
              ref={editorRef}
              value={value.query}
              onChange={(q) => onChange({ ...value, query: q })}
              introspection={introspection}
              testId="graphql-query-editor"
            />
          ) : (
            <GraphQLVariablesPanel
              query={value.query}
              value={value.variables || ''}
              onChange={(v) => onChange({ ...value, variables: v })}
            />
          )}
        </div>

        {showDocs && introspection && (
          <div
            className="w-[320px] shrink-0 overflow-hidden rounded-md border border-border bg-surface"
            data-testid="graphql-docs-side-panel"
          >
            <GraphQLDocsPanel
              schema={(introspection.__schema?.types as any) ?? null}
              queryTypeName={opTypes.query}
              mutationTypeName={opTypes.mutation}
              subscriptionTypeName={opTypes.subscription}
              onInsertField={(_t, fieldName) => {
                editorRef.current?.insertAtCursor(`${fieldName} { id }`);
                setSubTab('query');
              }}
            />
          </div>
        )}
      </div>

      {/* Insights — collapsible, only renders when the user opens it.
          Living below the editor used to collide with the Response
          panel — now it's hidden by default and shown on demand. */}
      {showInsights && (
        <GraphQLAnalysisPanel query={value.query} introspection={introspection} />
      )}
    </div>
  );
};
