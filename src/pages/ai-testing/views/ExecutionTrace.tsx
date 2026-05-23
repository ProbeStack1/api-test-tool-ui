/**
 * ExecutionTrace v2 — proper visualizer for LLM / agent / MCP runs.
 *
 *   • Renders a waterfall (Postman-style) with absolute-positioned bars
 *     so users can SEE timing relationships, not just read numbers.
 *   • Steps named by purpose (not "LLM step 1, 2, 3"). For Direct-agent
 *     traces we infer: "Plan", "Reason", "Tool: calculate", "Finalize".
 *   • Collapsible — closed by default; user opens to drill in.
 *   • Per-step token / cost / model badges so users can pinpoint cost
 *     hotspots without leaving the trace.
 *   • Summary bar shows total cost / tokens / latency before expand.
 */
import { useMemo, useState } from 'react';
import {
  Activity, Clock, Wifi, Lock, Server, Send, Zap, Hash, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronRight, Coins, Cpu, Workflow, Bot,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export interface TraceStep {
  name: string;
  durationMs: number;
  description?: string;
  icon?: 'prep' | 'dns' | 'tcp' | 'tls' | 'send' | 'wait' | 'recv' |
         'llm' | 'tool' | 'plan' | 'reason' | 'finalize' | 'session' | 'error';
  meta?: Record<string, any>;
  status?: 'ok' | 'error';
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  model?: string;
  /** body preview (first 240 chars or so) to show inside the expanded row */
  preview?: string;
}

const ICONS: Record<string, any> = {
  prep:     Clock,    dns:    Wifi,     tcp:   Activity, tls: Lock,
  send:     Send,     wait:   Server,   recv:  Hash,
  llm:      Zap,      tool:   Cpu,      plan:  Workflow,
  reason:   Bot,      finalize: CheckCircle2, session: Activity,
  error:    AlertTriangle,
};
const COLORS: Record<string, string> = {
  prep:     'bg-slate-400',
  dns:      'bg-cyan-500',
  tcp:      'bg-blue-500',
  tls:      'bg-indigo-500',
  send:     'bg-emerald-500',
  wait:     'bg-amber-500',
  recv:     'bg-teal-500',
  llm:      'bg-violet-500',
  tool:     'bg-orange-500',
  plan:     'bg-fuchsia-500',
  reason:   'bg-purple-500',
  finalize: 'bg-green-500',
  session:  'bg-slate-500',
  error:    'bg-red-500',
};
const DESCRIPTIONS: Record<string, string> = {
  prep:    'Building request line, resolving variables, assembling headers and body.',
  dns:     'Resolving host name to IP address through the system resolver.',
  tcp:     '3-way handshake (SYN → SYN-ACK → ACK) to open the TCP connection.',
  tls:     'TLS handshake — certificates, session keys, cipher / ALPN negotiation.',
  send:    'Request bytes written to the wire.',
  wait:    'Server processing — time until first response byte (TTFB).',
  recv:    'Receiving the response body bytes from the wire.',
  llm:     'LLM provider round-trip (chat completion).',
  tool:    'Local tool invocation — result fed back into the next LLM call.',
  plan:    'Model parses the user request and decides which tool(s) to invoke.',
  reason:  'Model reads the tool output and reasons about the next action.',
  finalize:'Model writes the final natural-language answer.',
  session: 'MCP session handshake (initialize + tools handshake).',
  error:   'Step failed — see error details.',
};

export const ExecutionTrace = ({ result }: { result: any }) => {
  // Default-collapsed (user must click to expand) — keeps the result
  // panel compact, especially for short traces.
  const [open, setOpen] = useState(false);
  const steps = useMemo<TraceStep[]>(() => extractSteps(result), [result]);
  if (steps.length === 0) return null;

  const total       = steps.reduce((s, x) => s + (x.durationMs || 0), 0);
  // For MCP envelope, prefer the top-level latency_ms when available —
  // it's more accurate than the sum of step deltas which may have gaps.
  const inspLatency = Number(result?.body?.latency_ms ?? 0);
  const totalDisplay = inspLatency > 0 && inspLatency >= total ? inspLatency : total;

  const totalCost   = steps.reduce((s, x) => s + (x.costUsd  || 0), 0);
  const totalTokens = steps.reduce((s, x) => s + (x.tokensIn || 0) + (x.tokensOut || 0), 0);
  const llmCount    = steps.filter((s) => ['llm','plan','reason','finalize'].includes(s.icon ?? '')).length;
  const toolCount   = steps.filter((s) => s.icon === 'tool').length;
  const errors      = steps.filter((s) => s.status === 'error').length;
  const allOk       = errors === 0;
  const net         = result?.body ?? result;

  return (
    <div className={cn(
      'overflow-hidden rounded-lg border bg-surface transition-colors',
      allOk ? 'border-border' : 'border-red-500/40',
    )} data-testid="ai-testing-execution-trace">
      {/* ─── Compact summary bar (always visible) ─── */}
      <button type="button"
              onClick={() => setOpen((o) => !o)}
              data-testid="ai-testing-execution-trace-toggle"
              aria-expanded={open}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                open ? 'border-b border-border bg-elevated/50' : 'hover:bg-elevated/40',
              )}>
        <div className={cn(
          'grid h-5 w-5 shrink-0 place-items-center rounded transition-transform',
          open ? 'rotate-90 bg-primary/15 text-primary' : 'text-text-muted',
        )}>
          <ChevronRight className="h-3 w-3" />
        </div>
        <Activity className={cn('h-3.5 w-3.5 shrink-0', allOk ? 'text-primary' : 'text-red-500')} />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Execution Trace
        </span>
        <span className="rounded-full bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          {steps.length} step{steps.length === 1 ? '' : 's'}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-xs">
          <Pill icon={Clock}  label={totalDisplay.toFixed(0) + ' ms'} tone="muted" />
          {llmCount > 0    && <Pill icon={Zap}   label={`${llmCount} LLM`}   tone="violet" />}
          {toolCount > 0   && <Pill icon={Cpu}   label={`${toolCount} tool`} tone="orange" />}
          {totalTokens > 0 && <Pill icon={Hash}  label={totalTokens.toLocaleString() + ' tok'} tone="muted" />}
          {totalCost > 0   && <Pill icon={Coins} label={'$' + totalCost.toFixed(6)} tone="muted" />}
          {errors > 0      && <Pill icon={AlertTriangle} label={`${errors} err`} tone="danger" />}
          {allOk && errors === 0 && (
            <Pill icon={CheckCircle2} label="ok" tone="success" />
          )}
        </div>
      </button>

      {/* Mini waterfall always visible — gives at-a-glance timing without expanding */}
      <MiniWaterfall steps={steps} total={total || totalDisplay} />

      {/* ─── Expanded body — waterfall + per-step drilldown ─── */}
      {open && (
        <>
          <Waterfall steps={steps} total={total || totalDisplay} />
          <ol className="divide-y divide-border/40">
            {steps.map((s, i) => <StepRow key={i} step={s} index={i} total={total || totalDisplay} />)}
          </ol>

          {net && (net.status_code || net.session_id || net.target) && (
            <div className="border-t border-border bg-elevated/20 px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <Wifi className="h-3 w-3" />Network snapshot
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs md:grid-cols-3">
                {net.status_code  != null && <KV label="HTTP status" value={net.status_code} />}
                {net.session_id        && <KV label="Session"     value={net.session_id} />}
                {net.target            && <KV label="Target"      value={net.target} />}
                {net.method            && <KV label="Method"      value={net.method} />}
                {net.latency_ms != null && <KV label="Total"      value={net.latency_ms + ' ms'} />}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Mini waterfall (visible when collapsed) ─── */
const MiniWaterfall = ({ steps, total }: { steps: TraceStep[]; total: number }) => {
  if (!total) return null;
  let offset = 0;
  return (
    <div className="relative h-2 w-full bg-elevated/30"
         data-testid="ai-testing-execution-mini-waterfall">
      {steps.map((s, i) => {
        const start = offset;
        offset += s.durationMs;
        const left  = (start / total) * 100;
        const width = Math.max(0.5, (s.durationMs / total) * 100);
        return (
          <div key={i}
               className={cn('absolute top-0 h-full', COLORS[s.icon ?? 'wait'])}
               style={{ left: left + '%', width: width + '%' }}
               title={`${s.name} · ${s.durationMs.toFixed(0)} ms`} />
        );
      })}
    </div>
  );
};

/* ─── Full waterfall with per-step labels (expanded view) ─── */
const Waterfall = ({ steps, total }: { steps: TraceStep[]; total: number }) => {
  if (!total) return null;
  let offset = 0;
  return (
    <div className="border-b border-border bg-surface/40 p-3" data-testid="ai-testing-execution-waterfall">
      <div className="mb-2 flex items-center justify-between text-[11px] text-text-muted">
        <span>Timeline · {steps.length} step{steps.length === 1 ? '' : 's'}</span>
        <span className="tabular-nums">0 ms → {total.toFixed(0)} ms</span>
      </div>
      <div className="space-y-1">
        {steps.map((s, i) => {
          const start = offset;
          offset += s.durationMs;
          const left  = (start / total) * 100;
          const width = Math.max(0.5, (s.durationMs / total) * 100);
          const Icon = ICONS[s.icon ?? 'wait'];
          return (
            <div key={i} className="grid grid-cols-[140px,1fr,80px] items-center gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <Icon className="h-3 w-3 shrink-0 text-text-secondary" />
                <span className="truncate font-mono">{s.name}</span>
              </div>
              <div className="relative h-3 rounded bg-elevated/40">
                <div className={cn('absolute top-0 h-full rounded',
                  s.status === 'error' ? 'bg-red-500' : COLORS[s.icon ?? 'wait'])}
                  style={{ left: left + '%', width: width + '%' }} />
              </div>
              <div className="text-right font-mono tabular-nums text-text-secondary">{s.durationMs.toFixed(0)} ms</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Per-step drill row ─── */
const StepRow = ({ step, index, total }: { step: TraceStep; index: number; total: number }) => {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[step.icon ?? 'wait'];
  const colour =
    step.status === 'error' ? 'border-red-500/40 bg-red-500/5' :
    step.icon === 'llm' || step.icon === 'plan' || step.icon === 'reason' || step.icon === 'finalize'
      ? 'border-violet-500/30 bg-violet-500/5' :
    step.icon === 'tool' ? 'border-orange-500/30 bg-orange-500/5' :
    'border-border';
  const sharePct = total ? Math.round((step.durationMs / total) * 100) : 0;
  return (
    <li className={cn('border-l-[3px] px-3 py-2.5', colour)}
        data-testid={`ai-testing-trace-step-${index}`}>
      <button type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex w-full items-start gap-2 text-left">
        <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0',
          step.status === 'error' ? 'text-red-500' : 'text-text-secondary')} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold">{step.name}</span>
            {step.model && <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">{step.model}</span>}
            {step.tokensIn != null && step.tokensOut != null && (step.tokensIn + step.tokensOut > 0) && (
              <span className="font-mono text-[10px] text-text-muted">
                {step.tokensIn}+{step.tokensOut} tok
              </span>
            )}
            {step.costUsd != null && step.costUsd > 0 && (
              <span className="font-mono text-[10px] text-text-muted">
                ${step.costUsd.toFixed(6)}
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] text-text-secondary">
              {step.durationMs.toFixed(0)} ms <span className="text-text-muted">· {sharePct}%</span>
            </span>
          </div>
          {step.description && <div className="mt-0.5 text-[11px] text-text-muted">{step.description}</div>}
        </div>
        {(step.preview || step.meta) && (open
          ? <ChevronDown className="h-3 w-3 shrink-0 text-text-muted" />
          : <ChevronRight className="h-3 w-3 shrink-0 text-text-muted" />)}
      </button>

      {open && step.preview && (
        <div className="mt-1.5 ml-5 rounded border border-border/60 bg-elevated/30 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Output preview</div>
          <pre className="whitespace-pre-wrap text-[11px] text-text-secondary">{step.preview}</pre>
        </div>
      )}
      {open && step.meta && Object.keys(step.meta).length > 0 && (
        <details className="ml-5 mt-1 rounded border border-border/60 bg-elevated/30 p-2 text-[11px]">
          <summary className="cursor-pointer text-text-muted">Raw meta</summary>
          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-text-secondary">
            {JSON.stringify(step.meta, null, 2)}
          </pre>
        </details>
      )}
    </li>
  );
};

const Pill = ({ icon: I, label, tone }: { icon: any; label: string; tone: 'muted'|'violet'|'orange'|'danger'|'success' }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px]',
    tone === 'muted'   && 'border-border bg-elevated text-text-muted',
    tone === 'violet'  && 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300',
    tone === 'orange'  && 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300',
    tone === 'danger'  && 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300',
    tone === 'success' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  )}>
    <I className="h-2.5 w-2.5" /> {label}
  </span>
);

const KV = ({ label, value }: { label: string; value: any }) => (
  <div className="flex min-w-0 items-center gap-2">
    <span className="shrink-0 text-text-muted">{label}</span>
    <span className="min-w-0 truncate font-mono text-text-primary">{String(value)}</span>
  </div>
);

/* ─── Extract steps from any of the supported trace shapes ─── */
function extractSteps(result: any): TraceStep[] {
  if (!result) return [];

  // 1. MCP inspector envelope: { ok, body: {trace_steps: [...] } }
  const inspBody = result.body;
  if (inspBody && Array.isArray(inspBody.trace_steps) && inspBody.trace_steps.length > 0) {
    const raw = inspBody.trace_steps;
    // Compute durations from started_at / ended_at (epoch millis) — this
    // is what the backend actually returns. Falls back to duration_ms
    // for older shapes.
    return raw.map((s: any, i: number) => {
      const start = Number(s.started_at ?? s.startedAt ?? 0);
      const end   = Number(s.ended_at   ?? s.endedAt   ?? 0);
      let duration = Number(s.duration_ms ?? s.durationMs ?? 0);
      if (!duration && end > start && start > 0) duration = end - start;
      // If still 0, distribute the overall latency_ms across steps so the
      // user sees *some* relative timing (rough, but better than 0/0/0).
      if (!duration && inspBody.latency_ms != null && raw.length > 0) {
        duration = Math.max(1, Math.round(Number(inspBody.latency_ms) / raw.length));
      }
      return {
        name:        cleanName(s.name),
        durationMs:  duration,
        description: s.description ?? guessDescription(s.name),
        icon:        guessIcon(s.name),
        meta:        s.meta ?? s.details,
        status:      (s.ok === false || s.is_success === false || s.error) ? 'error' : 'ok',
        preview:     typeof s.detail === 'string' ? s.detail : (s.detail ? JSON.stringify(s.detail) : undefined),
      } as TraceStep;
    });
  }

  // 2. Direct-agent trace: result.trace = [{step,type,text,latencyMs,tokensIn,tokensOut,costUsd,...}]
  if (Array.isArray(result.trace) && result.trace.length > 0) {
    const traceArr = result.trace;
    // Build llm-step counter so we can label them as "Plan" / "Reason" / "Finalize"
    let llmIdx = 0;
    const llmTotal = traceArr.filter((s: any) => s.type === 'llm').length;
    return traceArr.map((s: any, _i: number) => {
      if (s.type === 'tool') {
        return {
          name:        s.tool ? `Tool: ${s.tool}` : 'Tool call',
          durationMs:  Number(s.latencyMs ?? 0),
          description: 'Local tool invocation — result fed back into the next LLM step.',
          icon:        'tool',
          status:      s.error ? 'error' : 'ok',
          preview:     s.args ? `args: ${s.args}` : (s.output ? JSON.stringify(s.output).slice(0, 200) : undefined),
          meta:        s.output ?? s.args,
        } as TraceStep;
      }
      if (s.agent) {
        return {
          name: `Agent: ${s.agent}` + (s.role ? ` · ${s.role}` : ''),
          durationMs: Number(s.latencyMs ?? 0),
          description: 'Specialist agent round-trip.',
          icon: 'reason',
          status: s.error ? 'error' : 'ok',
          tokensIn:  Number(s.tokensIn  ?? 0) || undefined,
          tokensOut: Number(s.tokensOut ?? 0) || undefined,
          costUsd:   Number(s.costUsd   ?? 0) || undefined,
          model:     s.model,
          preview:   s.text ? clamp(s.text, 240) : undefined,
        } as TraceStep;
      }
      // Plain LLM step — label by position
      llmIdx++;
      let purpose: TraceStep['icon'] = 'llm';
      let name = 'LLM round-trip';
      if (llmTotal > 1) {
        if (llmIdx === 1) { purpose = 'plan';     name = 'Plan · choose tool'; }
        else if (llmIdx === llmTotal) { purpose = 'finalize'; name = 'Finalize · write answer'; }
        else { purpose = 'reason'; name = `Reason #${llmIdx - 1} · read tool output`; }
      }
      return {
        name,
        durationMs:  Number(s.latencyMs ?? 0),
        description: DESCRIPTIONS[purpose],
        icon:        purpose,
        status:      s.error ? 'error' : 'ok',
        tokensIn:    Number(s.tokensIn  ?? 0) || undefined,
        tokensOut:   Number(s.tokensOut ?? 0) || undefined,
        costUsd:     Number(s.costUsd   ?? 0) || undefined,
        model:       s.model,
        preview:     s.text ? clamp(s.text, 240) : undefined,
      } as TraceStep;
    });
  }

  // 3. Quick test envelope
  if (result.latencyMs != null && (result.tokensPrompt != null || result.tokensCompletion != null)) {
    return [
      { name: 'Prepare',        durationMs: 0,                              icon: 'prep',
        description: DESCRIPTIONS.prep },
      { name: 'LLM round-trip', durationMs: Number(result.latencyMs ?? 0),  icon: 'llm',
        description: DESCRIPTIONS.llm,
        tokensIn:  Number(result.tokensPrompt     ?? 0) || undefined,
        tokensOut: Number(result.tokensCompletion ?? 0) || undefined,
        costUsd:   Number(result.costUsd          ?? 0) || undefined,
        model:     result.model,
        preview:   result.text ? clamp(result.text, 240) : undefined,
        meta:      { provider: result.provider, model: result.model, finishReason: result.finishReason } },
    ];
  }

  return [];
}

/* ─── helpers ─── */
function guessIcon(name?: string): TraceStep['icon'] {
  const n = (name ?? '').toLowerCase();
  if (n.includes('session') || n.includes('init')) return 'session';
  if (n.includes('dns'))                           return 'dns';
  if (n.includes('tcp'))                           return 'tcp';
  if (n.includes('tls') || n.includes('ssl'))      return 'tls';
  if (n.includes('send') || n.includes('request_sent')) return 'send';
  if (n.includes('wait') || n.includes('ttfb') || n.includes('process')) return 'wait';
  if (n.includes('download') || n.includes('receiv')) return 'recv';
  if (n.includes('prepar'))                        return 'prep';
  if (n.includes('llm') || n.includes('model'))    return 'llm';
  if (n.includes('tool') || n.includes('call'))    return 'tool';
  return 'wait';
}
function guessDescription(name?: string): string | undefined {
  const i = guessIcon(name);
  return i ? DESCRIPTIONS[i] : undefined;
}
function cleanName(s?: string): string {
  if (!s) return 'Step';
  // tools/list → "Tools list" ; tools/call → "Tool call"
  if (s === 'tools/list') return 'Discover tools';
  if (s === 'tools/call') return 'Invoke tool';
  if (s === 'initialize') return 'Session handshake';
  return s.replace(/_/g, ' ');
}
function clamp(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
