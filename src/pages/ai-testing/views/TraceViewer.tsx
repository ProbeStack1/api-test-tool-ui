/**
 * TraceViewer — in-app run trace browser (run → case → step), styled to
 * match ForgeFuzz's own theme rather than any external tool.
 *
 * Two-panel layout: a nested waterfall tree on the left (click a node to
 * select it), and that node's detail — timing, cost, and its actual
 * input/output text — on the right. The tree data comes straight from
 * `getRunTrace()`, which mirrors what's already sent out as OpenTelemetry
 * spans (see OtelExportService on the backend) but keeps the real
 * input/output payloads, since this is for our own UI, not an external
 * collector with size limits.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Workflow, FlaskConical, Zap, Cpu, AlertTriangle, CheckCircle2,
  Loader2, Clock, Hash, Coins, ChevronRight,
} from 'lucide-react';
import { getRunTrace, type TraceNode } from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';

const KIND_ICON: Record<TraceNode['kind'], any> = {
  run: Workflow, case: FlaskConical, llm: Zap, tool: Cpu, agent: Cpu,
};
const KIND_TONE: Record<TraceNode['kind'], string> = {
  run:   'text-primary',
  case:  'text-sky-500 dark:text-sky-400',
  llm:   'text-violet-500 dark:text-violet-400',
  tool:  'text-orange-500 dark:text-orange-400',
  agent: 'text-violet-500 dark:text-violet-400',
};

/** Flattened row — one per node, carrying its depth for indentation. */
interface Row { node: TraceNode; depth: number; }

const flatten = (node: TraceNode, depth = 0, out: Row[] = []): Row[] => {
  out.push({ node, depth });
  node.children?.forEach((c) => flatten(c, depth + 1, out));
  return out;
};

/**
 * A realistic, fixed example trace — shown when a workspace has no real
 * runs yet, so "what does tracing actually look like" doesn't require
 * running a suite first. On-brand for ForgeFuzz (an API test agent),
 * not a generic example.
 */
export const SAMPLE_TRACE: TraceNode = {
  id: 'sample-run', name: 'Sample: Verify User API', kind: 'run',
  startMs: 0, endMs: 2400, durationMs: 2400, status: 'ok', errorMessage: null,
  tokensIn: 320, tokensOut: 100, costUsd: 0.00041, model: 'gpt-4o-mini',
  input: null, output: null,
  children: [
    {
      id: 'sample-case', name: 'case: GET /users/{id} returns valid schema', kind: 'case',
      startMs: 0, endMs: 2400, durationMs: 2400, status: 'ok', errorMessage: null,
      tokensIn: 320, tokensOut: 100, costUsd: 0.00041, model: 'gpt-4o-mini',
      input: null,
      output: 'Response matches the expected schema. All required fields present. Passed.',
      children: [
        {
          id: 'sample-step-1', name: 'llm call', kind: 'llm',
          startMs: 0, endMs: 620, durationMs: 620, status: 'ok', errorMessage: null,
          tokensIn: 180, tokensOut: 40, costUsd: 0.00013, model: 'gpt-4o-mini',
          input: 'System: You are an API test agent. Verify that GET /users/42 returns a valid user record.',
          output: "I'll call the API and check the response against the expected schema.",
          children: [],
        },
        {
          id: 'sample-step-2', name: 'tool: http_request', kind: 'tool',
          startMs: 620, endMs: 980, durationMs: 360, status: 'ok', errorMessage: null,
          tokensIn: null, tokensOut: null, costUsd: null, model: null,
          input: '{"method":"GET","url":"/users/42"}',
          output: '{"status":200,"body":{"id":42,"name":"Ada Lovelace","email":"ada@example.com"}}',
          children: [],
        },
        {
          id: 'sample-step-3', name: 'llm call', kind: 'llm',
          startMs: 980, endMs: 2400, durationMs: 1420, status: 'ok', errorMessage: null,
          tokensIn: 140, tokensOut: 60, costUsd: 0.00028, model: 'gpt-4o-mini',
          input: 'Tool result: {"status":200,"body":{"id":42,"name":"Ada Lovelace","email":"ada@example.com"}}',
          output: 'Response matches the expected schema. All required fields present. Passed.',
          children: [],
        },
      ],
    },
  ],
};

export const TraceViewer = ({ workspaceId, runId, sample }: { workspaceId: string; runId: string; sample?: boolean }) => {
  const [root, setRoot] = useState<TraceNode | null>(sample ? SAMPLE_TRACE : null);
  const [loading, setLoading] = useState(!sample);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(sample ? SAMPLE_TRACE.id : null);

  useEffect(() => {
    if (sample) return; // sample data is set synchronously above — nothing to fetch
    let alive = true;
    setLoading(true);
    setError(null);
    getRunTrace(workspaceId, runId)
      .then((t) => { if (!alive) return; setRoot(t); setSelectedId(t.id); })
      .catch((e) => { if (alive) setError(e?.message ?? 'Could not load trace'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [workspaceId, runId, sample]);

  const rows = useMemo(() => (root ? flatten(root) : []), [root]);
  const selected = rows.find((r) => r.node.id === selectedId)?.node ?? root;
  const spanMs = root ? Math.max(1, root.durationMs) : 1;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-text-muted" data-testid="ai-testing-trace-loading">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading trace…
      </div>
    );
  }
  if (error || !root) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted" data-testid="ai-testing-trace-empty">
        {error ?? 'No trace available for this run yet.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr,1fr]" data-testid="ai-testing-trace-viewer">
      {/* ─── Left: waterfall tree ─── */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-surface/60 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Trace
            {sample && (
              <span className="rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-warning">
                Sample data
              </span>
            )}
          </span>
          <span className="font-mono text-[11px] text-text-muted">{root.durationMs.toLocaleString()} ms total</span>
        </div>
        <ol className="max-h-[520px] divide-y divide-border/40 overflow-y-auto" data-testid="ai-testing-trace-tree">
          {rows.map(({ node, depth }) => (
            <TraceRow key={node.id} node={node} depth={depth} spanMs={spanMs} rootStart={root.startMs}
                      active={node.id === selectedId} onClick={() => setSelectedId(node.id)} />
          ))}
        </ol>
      </div>

      {/* ─── Right: selected node detail ─── */}
      <TraceDetail node={selected ?? root} />
    </div>
  );
};

const TraceRow = ({ node, depth, spanMs, rootStart, active, onClick }: {
  node: TraceNode; depth: number; spanMs: number; rootStart: number; active: boolean; onClick: () => void;
}) => {
  const Icon = KIND_ICON[node.kind];
  const tone = KIND_TONE[node.kind];
  const left = Math.min(100, Math.max(0, ((node.startMs - rootStart) / spanMs) * 100));
  const width = Math.min(100 - left, Math.max(0.6, (node.durationMs / spanMs) * 100));
  const tokens = (node.tokensIn ?? 0) + (node.tokensOut ?? 0);

  return (
    <li>
      <button type="button" onClick={onClick} data-testid={`ai-testing-trace-node-${node.id}`}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                active ? 'bg-primary-muted/60' : 'hover:bg-elevated/50',
              )}>
        <span style={{ marginLeft: depth * 14 }} className="flex min-w-0 flex-1 items-center gap-2">
          {depth > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-text-faint" />}
          <Icon className={cn('h-3.5 w-3.5 shrink-0', tone)} />
          <span className="truncate text-[12.5px] font-medium text-text-primary">{node.name}</span>
          {node.status === 'error' && <AlertTriangle className="h-3 w-3 shrink-0 text-danger" />}
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-probestack-bg">
            <span className={cn('absolute inset-y-0 rounded-full', node.status === 'error' ? 'bg-danger' : 'bg-primary/70')}
                  style={{ left: `${left}%`, width: `${width}%` }} />
          </span>
          <span className="w-14 text-right font-mono text-[10.5px] tabular-nums text-text-muted">{node.durationMs.toLocaleString()}ms</span>
        </span>
        {tokens > 0 && (
          <span className="hidden shrink-0 font-mono text-[10.5px] tabular-nums text-text-faint md:inline">{tokens.toLocaleString()}tok</span>
        )}
      </button>
    </li>
  );
};

const TraceDetail = ({ node }: { node: TraceNode }) => {
  const Icon = KIND_ICON[node.kind];
  const tone = KIND_TONE[node.kind];
  const tokens = (node.tokensIn ?? 0) + (node.tokensOut ?? 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface" data-testid="ai-testing-trace-detail">
      <div className="flex items-center gap-2 border-b border-border bg-surface/60 px-3 py-2.5">
        <Icon className={cn('h-4 w-4 shrink-0', tone)} />
        <span className="truncate text-sm font-semibold text-text-primary">{node.name}</span>
        {node.status === 'ok'
          ? <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-success" />
          : <AlertTriangle className="ml-auto h-3.5 w-3.5 shrink-0 text-danger" />}
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border p-3 sm:grid-cols-4">
        <Metric icon={Clock} label="Duration" value={`${node.durationMs.toLocaleString()} ms`} />
        {tokens > 0 && <Metric icon={Hash} label="Tokens" value={tokens.toLocaleString()} />}
        {node.costUsd != null && node.costUsd > 0 && <Metric icon={Coins} label="Cost" value={`$${node.costUsd.toFixed(6)}`} />}
        {node.model && <Metric icon={Icon} label="Model" value={node.model} mono />}
      </div>

      {(node.tokensIn != null || node.tokensOut != null) && tokens > 0 && (
        <div className="border-b border-border p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Token breakdown</div>
          <div className="space-y-1">
            <CostBar label="Input" value={node.tokensIn ?? 0} total={tokens} />
            <CostBar label="Output" value={node.tokensOut ?? 0} total={tokens} />
          </div>
        </div>
      )}

      {node.errorMessage && (
        <div className="border-b border-border bg-danger/5 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-danger">Error</div>
          <p className="text-[12px] text-danger">{node.errorMessage}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {node.input != null && node.input !== '' && <Field label="Input" value={node.input} />}
        {node.output != null && node.output !== '' && <Field label="Output" value={node.output} />}
        {node.input == null && node.output == null && (
          <p className="p-4 text-center text-[12px] text-text-muted">No input/output recorded for this step.</p>
        )}
      </div>
    </div>
  );
};

const Metric = ({ icon: I, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) => (
  <div className="rounded-md border border-border/60 bg-probestack-bg px-2 py-1.5">
    <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-wide text-text-muted">
      <I className="h-2.5 w-2.5" /> {label}
    </div>
    <div className={cn('mt-0.5 truncate text-[12px] font-semibold text-text-primary', mono && 'font-mono')}>{value}</div>
  </div>
);

const CostBar = ({ label, value, total }: { label: string; value: number; total: number }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 shrink-0 text-text-muted">{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-probestack-bg">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-16 shrink-0 text-right font-mono tabular-nums text-text-secondary">{value.toLocaleString()} ({pct}%)</span>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="border-b border-border/40 p-3 last:border-b-0">
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-probestack-bg p-2.5 text-[12px] leading-relaxed text-text-secondary">
      {value}
    </pre>
  </div>
);
