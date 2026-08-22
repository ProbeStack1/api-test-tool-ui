/**
 * TraceViewer — in-app run trace browser (run → case → step), styled to
 * match ForgeFuzz's own theme rather than any external tool.
 *
 * Left panel is a real collapsible tree — not a flattened indent list —
 * with a connector line down each branch so the run → case → step
 * hierarchy actually reads as a hierarchy. Hovering a row pops a tooltip
 * with its real start/end clock time and a token/cost breakdown; clicking
 * selects it and loads the detail panel on the right, which renders the
 * node's input/output as role-labeled message cards (System / User / AI /
 * Tool) instead of a raw text dump, with per-card copy buttons.
 *
 * The tree data comes straight from `getRunTrace()`, which mirrors what's
 * already sent out as OpenTelemetry spans (see OtelExportService on the
 * backend) but keeps the real input/output payloads, since this is for
 * our own UI, not an external collector with size limits.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Workflow, FlaskConical, Zap, Cpu, AlertTriangle, CheckCircle2,
  Loader2, Clock, Hash, Coins, ChevronRight, ChevronDown,
  Bot, User, Terminal, Wrench, Copy, Check, FileText,
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
      input: 'System: You are an API test agent. Verify that GET /users/42 returns a valid user record.\n\nUser: Run the check and report pass/fail.',
      output: 'Response matches the expected schema. All required fields present. Passed.',
      children: [
        {
          id: 'sample-step-1', name: 'llm call', kind: 'llm',
          startMs: 0, endMs: 620, durationMs: 620, status: 'ok', errorMessage: null,
          tokensIn: 180, tokensOut: 40, costUsd: 0.00013, model: 'gpt-4o-mini',
          input: null,
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
          input: null,
          output: 'Response matches the expected schema. All required fields present. Passed.',
          children: [],
        },
      ],
    },
  ],
};

const findNode = (node: TraceNode, id: string | null): TraceNode | null => {
  if (!id || node.id === id) return node;
  for (const c of node.children ?? []) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
};

/** Root → target chain of ids, inclusive of both ends. Used to light up the whole path down to the selected node, not just its own last hop. */
const pathToNode = (node: TraceNode, targetId: string | null, acc: string[] = []): string[] | null => {
  if (!targetId) return null;
  const next = [...acc, node.id];
  if (node.id === targetId) return next;
  for (const c of node.children ?? []) {
    const found = pathToNode(c, targetId, next);
    if (found) return found;
  }
  return null;
};

const fmtClock = (ms: number) => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
};

/* ─── Input/output → role-labeled message cards ──────────────────────── */
type MsgRole = 'system' | 'user' | 'assistant' | 'tool' | 'other';
const ROLE_ICON: Record<MsgRole, any> = { system: Terminal, user: User, assistant: Bot, tool: Wrench, other: FileText };
const ROLE_LABEL: Record<MsgRole, string> = { system: 'System', user: 'User', assistant: 'AI', tool: 'Tool', other: 'Result' };

interface Msg { role: MsgRole; text: string; }

const roleFromPrefix = (prefix: string): MsgRole => {
  const k = prefix.toLowerCase();
  if (k === 'system') return 'system';
  if (k === 'user') return 'user';
  if (k === 'assistant' || k === 'ai') return 'assistant';
  return 'tool'; // "Tool result"
};

/** Splits a "System: …\n\nUser: …" style blob into separate role cards. Falls back to one card in `fallback` role if there's no recognizable prefix. */
const splitMessages = (raw: string, fallback: MsgRole): Msg[] => {
  const chunks = raw.split(/\n\n(?=(?:System|User|Assistant|AI|Tool result):)/);
  const out: Msg[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^(System|User|Assistant|AI|Tool result):\s*([\s\S]*)$/);
    out.push(m ? { role: roleFromPrefix(m[1]), text: m[2].trim() } : { role: fallback, text: chunk.trim() });
  }
  return out.filter((m) => m.text.length > 0);
};

/** JSON-object-shaped text (tool args/results) renders as a "Fields" key/value grid instead of a text blob. */
const tryParseFields = (text: string): [string, string][] | null => {
  const t = text.trim();
  if (!(t.startsWith('{') && t.endsWith('}'))) return null;
  try {
    const obj = JSON.parse(t);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]);
    }
  } catch { /* not JSON — render as plain text */ }
  return null;
};

export const TraceViewer = ({ workspaceId, runId, sample }: { workspaceId: string; runId: string; sample?: boolean }) => {
  const [root, setRoot] = useState<TraceNode | null>(sample ? SAMPLE_TRACE : null);
  const [loading, setLoading] = useState(!sample);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(sample ? SAMPLE_TRACE.id : null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<{ node: TraceNode; top: number; left: number } | null>(null);
  const hoverTimer = useRef<number | null>(null);

  // Show the tooltip only after a short pause on one row — an immediate
  // popup flickers badly when the mouse just passes over several rows.
  // Hiding stays instant so it never feels sticky.
  const handleHover = (h: { node: TraceNode; top: number; left: number } | null) => {
    if (hoverTimer.current != null) { window.clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (h == null) { setHover(null); return; }
    hoverTimer.current = window.setTimeout(() => { setHover(h); hoverTimer.current = null; }, 350);
  };
  useEffect(() => () => { if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current); }, []);

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

  const selected = useMemo(() => (root ? findNode(root, selectedId) : null), [root, selectedId]);
  // Every id from the root down to the selected node — lights up the whole
  // path, not just the selected row's own last hop.
  const selectedPath = useMemo(
    () => (root ? new Set(pathToNode(root, selectedId) ?? []) : new Set<string>()),
    [root, selectedId],
  );
  const spanMs = root ? Math.max(1, root.durationMs) : 1;

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
      {/* ─── Left: hierarchy tree ─── */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-surface/60 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Trace
            {sample && (
              <span className="rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-warning">
                Sample data
              </span>
            )}
          </span>
          <span className="font-mono text-xs text-text-muted">{root.durationMs.toLocaleString()} ms total</span>
        </div>
        <div className="max-h-[560px] overflow-y-auto p-2">
          <ul data-testid="ai-testing-trace-tree">
            <TraceTreeNode
              node={root} rootStart={root.startMs} spanMs={spanMs}
              selectedId={selectedId} selectedPath={selectedPath} onSelect={setSelectedId}
              collapsed={collapsed} onToggle={toggleCollapse}
              onHover={handleHover}
            />
          </ul>
        </div>
      </div>

      {/* ─── Right: selected node detail ─── */}
      <TraceDetail node={selected ?? root} />

      {hover && <TraceTooltip node={hover.node} top={hover.top} left={hover.left} />}
    </div>
  );
};

/* ─── Recursive tree node ──────────────────────────────────────────────
 * Every row is a fixed height, so a sibling group's connector geometry is
 * fully known ahead of render — that lets the whole group draw as ONE
 * <svg> (one trunk line + one curved branch per child) instead of stacked
 * HTML boxes, which is what was reading as "separate spare parts" instead
 * of a single continuous line. All lines share the same neutral `border`
 * color except the ones lying on the path from the root down to whatever
 * node is currently selected — those turn `primary`, so selecting a step
 * lights up its whole ancestry, not just its last hop. */
const ROW_H = 32;   // px — exact row height: py-1.5 (6+6) + text-sm line-height (20)
const ELBOW_Y = 16; // px — vertical reach of the elbow = the row's exact icon/text center
const CURVE_R = 8;  // px — corner radius of each branch

/** Total vertical space a node occupies, including its expanded subtree — pure function of fixed row heights, so no DOM measurement is needed. */
const subtreeHeight = (node: TraceNode, collapsed: Set<string>): number => {
  const kids = node.children ?? [];
  if (kids.length === 0 || collapsed.has(node.id)) return ROW_H;
  return ROW_H + kids.reduce((sum, c) => sum + subtreeHeight(c, collapsed), 0);
};

const ConnectorGroup = ({ siblings, collapsed, selectedPath }: {
  siblings: TraceNode[]; collapsed: Set<string>; selectedPath: Set<string>;
}) => {
  let y = 0;
  const centers = siblings.map((c) => {
    const cy = y + ELBOW_Y;
    y += subtreeHeight(c, collapsed);
    return cy;
  });
  const total = y;
  const firstR = Math.min(CURVE_R, centers[0]);
  const stemTop = ELBOW_Y - ROW_H; // the parent row's own icon center, one row above this group
  // Index of the one sibling (if any) that the selected path actually
  // branches into. Every segment of trunk ABOVE that branch point is on
  // the path too — the line runs straight past any earlier, unrelated
  // siblings on its way down, it doesn't stop and restart at each one.
  const onPathIdx = siblings.findIndex((s) => selectedPath.has(s.id));

  return (
    <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={17} height={total} aria-hidden focusable="false">
      {/* stem: the parent's own icon down to the first branch point — without this the line looks like it starts out of nowhere instead of hanging off the parent row */}
      <line x1={1} y1={stemTop} x2={1} y2={centers[0] - firstR}
            strokeWidth={2} stroke="currentColor" className={onPathIdx !== -1 ? 'text-primary' : 'text-border'} />
      {/* trunk backbone, one segment per gap between siblings — stays lit through every segment the path runs down past, not just the last hop */}
      {centers.slice(0, -1).map((cy, i) => (
        <line key={`trunk-${siblings[i + 1].id}`} x1={1} y1={cy} x2={1} y2={centers[i + 1]}
              strokeWidth={2} stroke="currentColor"
              className={onPathIdx !== -1 && onPathIdx >= i + 1 ? 'text-primary' : 'text-border'} />
      ))}
      {/* curved branch into each child */}
      {siblings.map((c, i) => {
        const cy = centers[i];
        const r = Math.min(CURVE_R, cy);
        return (
          <path key={c.id}
                d={`M 1 ${cy - r} A ${r} ${r} 0 0 0 ${1 + r} ${cy} L 17 ${cy}`}
                fill="none" strokeWidth={2} strokeLinecap="round" stroke="currentColor"
                className={selectedPath.has(c.id) ? 'text-primary' : 'text-border'} />
        );
      })}
    </svg>
  );
};

const TraceTreeNode = ({ node, rootStart, spanMs, selectedId, selectedPath, onSelect, collapsed, onToggle, onHover }: {
  node: TraceNode; rootStart: number; spanMs: number;
  selectedId: string | null; selectedPath: Set<string>; onSelect: (id: string) => void;
  collapsed: Set<string>; onToggle: (id: string) => void;
  onHover: (h: { node: TraceNode; top: number; left: number } | null) => void;
}) => {
  const hasChildren = !!node.children && node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const active = node.id === selectedId;
  const Icon = KIND_ICON[node.kind];
  const tone = KIND_TONE[node.kind];
  const left = Math.min(100, Math.max(0, ((node.startMs - rootStart) / spanMs) * 100));
  const width = Math.min(100 - left, Math.max(0.6, (node.durationMs / spanMs) * 100));
  const tokens = (node.tokensIn ?? 0) + (node.tokensOut ?? 0);

  const toggle = (e: React.MouseEvent) => { e.stopPropagation(); onToggle(node.id); };
  const handleHover = (e: React.MouseEvent) => {
    const row = e.currentTarget.getBoundingClientRect();
    const tooltipW = 248;
    const panel = document.querySelector<HTMLElement>('[data-trace-panel]');
    let x: number;
    if (panel) {
      // Outside the drawer, hugging its left edge — never over the drawer's own content.
      x = Math.max(8, panel.getBoundingClientRect().left - tooltipW - 12);
    } else {
      x = Math.min(row.left, window.innerWidth - tooltipW - 8);
    }
    const y = Math.max(8, Math.min(row.top, window.innerHeight - 220));
    onHover({ node, top: y, left: x });
  };

  return (
    <li className="relative">
      <div
        role="button" tabIndex={0}
        data-testid={`ai-testing-trace-node-${node.id}`}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.id); } }}
        onMouseEnter={handleHover}
        onMouseLeave={() => onHover(null)}
        style={{ height: ROW_H }}
        className={cn(
          'relative flex cursor-pointer items-center gap-1.5 rounded-md px-2 transition-colors',
          active ? 'bg-primary-muted/70 ring-1 ring-inset ring-primary/30' : 'hover:bg-hover',
        )}
      >
        {/* Icon doubles as an expand/collapse toggle when this node has children. */}
        {hasChildren ? (
          <button type="button" onClick={toggle}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-hover"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
            <Icon className={cn('h-5 w-5', tone)} />
          </button>
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center">
            <Icon className={cn('h-4 w-4', tone)} />
          </span>
        )}
        <span className={cn('min-w-0 flex-1 truncate text-sm', active ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary')}>
          {node.name}
        </span>
        {node.status === 'error' && <AlertTriangle className="h-3 w-3 shrink-0 text-danger" />}
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-probestack-bg">
            <span className={cn('absolute inset-y-0 rounded-full', node.status === 'error' ? 'bg-danger' : 'bg-primary/70')}
                  style={{ left: `${left}%`, width: `${width}%` }} />
          </span>
          <span className="w-14 text-right font-mono text-xs tabular-nums text-text-muted">{node.durationMs.toLocaleString()}ms</span>
        </span>
        {tokens > 0 && (
          <span className="hidden shrink-0 font-mono text-xs tabular-nums text-text-faint md:inline">{tokens.toLocaleString()}tok</span>
        )}
        {/* Chevron toggle, on the right — same expand/collapse as the icon, just also here. */}
        {hasChildren ? (
          <button type="button" onClick={toggle}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded text-text-faint hover:text-text-primary"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div className="relative ml-[7px] pl-[17px]">
          <ConnectorGroup siblings={node.children!} collapsed={collapsed} selectedPath={selectedPath} />
          <ul>
            {node.children!.map((c) => (
              <TraceTreeNode
                key={c.id} node={c} rootStart={rootStart} spanMs={spanMs}
                selectedId={selectedId} selectedPath={selectedPath} onSelect={onSelect}
                collapsed={collapsed} onToggle={onToggle} onHover={onHover}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
};

/* ─── Hover tooltip: real start/end clock time + cost breakdown ────────
 * Mounted only after the caller's own show-delay already elapsed, so all
 * that's left here is a short fade + rise on mount — no instant pop, no
 * flicker when the mouse crosses several rows on its way somewhere else. */
const TraceTooltip = ({ node, top, left }: { node: TraceNode; top: number; left: number }) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const tokens = (node.tokensIn ?? 0) + (node.tokensOut ?? 0);
  const inPct = tokens > 0 ? Math.round(((node.tokensIn ?? 0) / tokens) * 100) : 0;
  const outPct = tokens > 0 ? 100 - inPct : 0;

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-50 w-60 rounded-lg border border-border bg-elevated p-3 text-xs shadow-xl',
        'transition-[opacity,transform] duration-150 ease-out',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
      )}
      style={{ top, left }}
    >
      <div className="mb-1.5 truncate text-sm font-semibold text-text-primary">{node.name}</div>
      <div className="space-y-0.5">
        <div className="flex justify-between text-text-muted">
          <span>Start</span><span className="font-mono tabular-nums text-text-secondary">{fmtClock(node.startMs)}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>End</span><span className="font-mono tabular-nums text-text-secondary">{fmtClock(node.endMs)}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>Duration</span><span className="font-mono tabular-nums text-text-secondary">{node.durationMs.toLocaleString()} ms</span>
        </div>
      </div>

      {tokens > 0 && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-faint">
                <th className="text-left font-medium"> </th>
                <th className="text-right font-medium">Tokens</th>
                <th className="text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr>
                <td>Input</td>
                <td className="text-right font-mono tabular-nums">{(node.tokensIn ?? 0).toLocaleString()}</td>
                <td className="text-right font-mono tabular-nums">{inPct}%</td>
              </tr>
              <tr>
                <td>Output</td>
                <td className="text-right font-mono tabular-nums">{(node.tokensOut ?? 0).toLocaleString()}</td>
                <td className="text-right font-mono tabular-nums">{outPct}%</td>
              </tr>
              <tr className="font-semibold text-text-primary">
                <td>Total</td>
                <td className="text-right font-mono tabular-nums">{tokens.toLocaleString()}</td>
                <td className="text-right font-mono tabular-nums">100%</td>
              </tr>
            </tbody>
          </table>
          {node.costUsd != null && node.costUsd > 0 && (
            <div className="mt-1.5 flex justify-between">
              <span className="text-text-muted">Cost</span>
              <span className="font-mono tabular-nums text-text-secondary">${node.costUsd.toFixed(6)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TraceDetail = ({ node }: { node: TraceNode }) => {
  const Icon = KIND_ICON[node.kind];
  const tone = KIND_TONE[node.kind];
  const tokens = (node.tokensIn ?? 0) + (node.tokensOut ?? 0);

  const inputMsgs = node.input ? splitMessages(node.input, node.kind === 'tool' ? 'tool' : 'user') : [];
  const outputMsgs = node.output
    ? splitMessages(node.output, node.kind === 'tool' ? 'tool' : (node.kind === 'llm' || node.kind === 'agent') ? 'assistant' : 'other')
    : [];

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
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Token breakdown</div>
          <div className="space-y-1">
            <CostBar label="Input" value={node.tokensIn ?? 0} total={tokens} />
            <CostBar label="Output" value={node.tokensOut ?? 0} total={tokens} />
          </div>
        </div>
      )}

      {node.errorMessage && (
        <div className="border-b border-border bg-danger/5 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-danger">Error</div>
          <p className="text-sm text-danger">{node.errorMessage}</p>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {inputMsgs.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Input</div>
            <div className="space-y-2">
              {inputMsgs.map((m, i) => <MessageCard key={i} msg={m} />)}
            </div>
          </div>
        )}
        {outputMsgs.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Output</div>
            <div className="space-y-2">
              {outputMsgs.map((m, i) => <MessageCard key={i} msg={m} />)}
            </div>
          </div>
        )}
        {inputMsgs.length === 0 && outputMsgs.length === 0 && (
          <p className="p-4 text-center text-sm text-text-muted">No input/output recorded for this step.</p>
        )}
      </div>
    </div>
  );
};

const MessageCard = ({ msg }: { msg: Msg }) => {
  const Icon = ROLE_ICON[msg.role];
  const fields = tryParseFields(msg.text);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(msg.text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); })
      .catch(() => {});
  };

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-probestack-bg">
      <div className="flex items-center gap-1.5 border-b border-border/60 px-2.5 py-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{ROLE_LABEL[msg.role]}</span>
        <button type="button" onClick={copy} title="Copy"
                className="ml-auto grid h-5 w-5 place-items-center rounded text-text-faint hover:bg-hover hover:text-text-primary">
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <div className="p-2.5">
        {fields ? <FieldsGrid fields={fields} /> : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">{msg.text}</p>
        )}
      </div>
    </div>
  );
};

const FieldsGrid = ({ fields }: { fields: [string, string][] }) => (
  <div className="space-y-1">
    {fields.map(([k, v]) => (
      <div key={k} className="flex items-start gap-2 text-sm">
        <span className="w-28 shrink-0 truncate text-xs font-medium uppercase tracking-wide text-text-faint">{k}</span>
        <span className="min-w-0 flex-1 break-words font-mono text-xs text-text-secondary">{v}</span>
      </div>
    ))}
  </div>
);

const Metric = ({ icon: I, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) => (
  <div className="rounded-md border border-border/60 bg-probestack-bg px-2 py-1.5">
    <div className="flex items-center gap-1 text-xs text-text-muted">
      <I className="h-3 w-3" /> {label}
    </div>
    <div className={cn('mt-0.5 truncate text-sm font-semibold text-text-primary', mono && 'font-mono')}>{value}</div>
  </div>
);

const CostBar = ({ label, value, total }: { label: string; value: number; total: number }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-14 shrink-0 text-xs text-text-muted">{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-probestack-bg">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-text-secondary">{value.toLocaleString()} ({pct}%)</span>
    </div>
  );
};
