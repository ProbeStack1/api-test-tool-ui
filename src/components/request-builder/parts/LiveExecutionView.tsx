/**
 * LiveExecutionView — vertical tracer shown inside the Debug Info tab.
 *
 * Reads phase data from TWO sources, merging them — gives the user one
 * unified pipeline view for both NORMAL and STREAMING executions:
 *
 *   1. Streaming  → useStreamStore.byTab[tabId]   (live SSE phases)
 *   2. Normal     → result.phases / result.network / result.sentHeaders / result.error
 *
 * Each phase is a node with an icon, name, duration. Clicking the node
 * expands an inline detail card showing:
 *   • Phase tip (what this step does in plain English)
 *   • Phase metadata (resolved IP, TLS protocol+cipher, bytes sent, etc.)
 *   • Error trace (full message + suggested fix) for FAILED phases
 *
 * A bottom "Network Snapshot" card aggregates across phases:
 *   localAddress · remoteAddress · httpVersion · TLS protocol · cipher
 *   · cert subject + expiry · sent body bytes · response body bytes
 *
 * For NORMAL execution: phases come pre-baked from the BFF so the
 * tracer renders immediately on completion — no streaming required.
 */
import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Circle, XCircle, ChevronRight, ChevronDown, Globe, Lock, Server, ArrowRight } from 'lucide-react';
import { useStreamStore, type LivePhase } from '@/stores/stream.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';
import type { ExecutionResult } from '@/services/request.service';

const PHASE_TIPS: Record<string, string> = {
  'Prepare':                 'Building request line, resolving variables and assembling headers and body before any network IO.',
  'Socket Initialization':   'Allocating a TCP socket file descriptor in the OS kernel.',
  'DNS Lookup':              'Resolving the host name to an IP address through the system resolver.',
  'TCP Handshake':           '3-way handshake (SYN → SYN-ACK → ACK) to open the TCP connection.',
  'SSL Handshake':           'TLS handshake — exchanging certificates, deriving session keys, agreeing on cipher and ALPN.',
  'Send':                    'Writing the request bytes onto the wire (request line + headers + body).',
  'Waiting (TTFB)':          'Server processing — time elapsed until the first response byte arrives.',
  'Download':                'Receiving the response body bytes from the wire.',
  'Process':                 'Decoding compression, parsing the body and assembling the final ExecutionResult.',
};

const SUGGESTED_FIX: Record<string, (msg: string) => string | null> = {
  'DNS Lookup': () => 'Hostname could not be resolved. Check the URL spelling and your DNS / VPN.',
  'TCP Handshake': () => 'Could not connect to the host. The port may be closed or a firewall is blocking the connection.',
  'SSL Handshake': (msg) => /verify|cert/i.test(msg)
    ? 'Certificate verification failed. Try Settings → Disable SSL verification (for trusted hosts only).'
    : 'TLS negotiation failed. The server may not support the chosen TLS version or cipher suite.',
  'Send': () => 'Connection reset before the request could be written. The peer closed the socket early.',
  'Waiting (TTFB)': () => 'Server did not respond in time. Increase the timeout or check upstream health.',
  'Download': () => 'Connection dropped while reading the response body.',
};

export const LiveExecutionView = ({
  tabId, result,
}: { tabId: string; result?: ExecutionResult | null }) => {
  const exec = useStreamStore((s) => s.byTab[tabId]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  /* Merge stream live phases with the post-execution result.phases.
   * Stream takes priority while it's active; once finished the result
   * provides a stable, hydrate-on-mount source. */
  const phases = useMemo<LivePhase[]>(() => {
    if (exec && exec.phases.length > 0) return exec.phases;
    if (result?.phases) {
      return (result.phases as any[]).map((p) => ({
        name: p.name ?? p.step ?? 'Phase',
        status: p.status === 'FAILED' ? 'failed'
              : p.status === 'SKIPPED' ? 'pending'
              : 'done',
        durationMs: p.durationMs ?? 0,
        startedAtMs: p.startedAtMs ?? p.startOffsetMs ?? 0,
        error: p.details?.error,
      }));
    }
    return [];
  }, [exec, result]);

  const network = exec?.network ?? (result?.network ?? {});
  const liveActive = !!exec?.active;
  const totalMs = phases.reduce((acc, p) => acc + (p.durationMs ?? 0), 0);
  const errored = phases.find((p) => p.status === 'failed');

  if (phases.length === 0) {
    return (
      <div className="p-6 text-xs italic text-text-muted" data-testid="live-execution-empty">
        No execution traced yet. Send a request — the full pipeline will appear here, including DNS / TCP / TLS / Send / TTFB / Download timings, network metadata, and full error traces.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="live-execution-view">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Execution Trace</h3>
        <span className="font-mono text-xs text-text-muted">
          {liveActive ? 'streaming…' : `total ${totalMs.toFixed(1)} ms`}
        </span>
      </header>

      {/* Top-level error banner */}
      {(errored || result?.error) && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400" data-testid="live-execution-error">
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="h-3.5 w-3.5" />
            Request failed at {errored?.name ?? 'execution'}
          </div>
          <div className="mt-1 font-mono text-[11px]">
            {errored?.error || (result?.error as any)?.message || (exec?.error as any)?.message || 'Unknown error'}
          </div>
          {errored && SUGGESTED_FIX[errored.name]?.(errored.error || '') && (
            <div className="mt-2 text-[11px] text-yellow-400">
              <strong>Suggested fix: </strong>{SUGGESTED_FIX[errored.name]?.(errored.error || '')}
            </div>
          )}
        </div>
      )}

      {/* Phase pipeline */}
      <ol className="relative">
        {phases.map((p, i) => (
          <PhaseRow
            key={`${p.name}-${i}`}
            phase={p}
            isLast={i === phases.length - 1}
            expanded={expandedIdx === i}
            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
          />
        ))}
      </ol>

      {/* Network snapshot */}
      {Object.keys(network).length > 0 && (
        <NetworkCard network={network} sentBody={result?.sentBody} responseSize={(result?.network as any)?.sizeBytes} />
      )}

      {/* Sent headers */}
      {result?.sentHeaders && result.sentHeaders.length > 0 && (
        <SentHeadersCard headers={result.sentHeaders} />
      )}
    </div>
  );
};

const PhaseRow = ({
  phase, isLast, expanded, onClick,
}: { phase: LivePhase; isLast: boolean; expanded: boolean; onClick: () => void }) => {
  const Icon =
    phase.status === 'done'    ? CheckCircle2
    : phase.status === 'failed' ? XCircle
    : phase.status === 'running' ? Loader2
    : Circle;
  const colour =
    phase.status === 'done'    ? 'text-success'
    : phase.status === 'failed' ? 'text-red-500'
    : phase.status === 'running' ? 'text-primary'
    : 'text-text-muted';
  const Chev = expanded ? ChevronDown : ChevronRight;
  return (
    <li className="relative" data-testid={`phase-${phase.name.replace(/[^a-zA-Z]/g, '')}`}>
      {!isLast && (
        <span
          className={cn(
            'absolute left-[10px] top-7 z-0 w-px',
            phase.status === 'done' ? 'bg-success/60'
            : phase.status === 'failed' ? 'bg-red-500/60'
            : phase.status === 'running' ? 'bg-primary/60'
            : 'bg-border',
          )}
          style={{ height: 'calc(100% - 14px)' }}
        />
      )}
      <button
        onClick={onClick}
        className="relative z-10 flex w-full items-start gap-3 rounded-md py-2 pr-2 text-left transition-colors hover:bg-hover/30"
        data-testid={`phase-row-${phase.name.replace(/[^a-zA-Z]/g, '')}`}
      >
        <div className="z-10 flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon className={cn('h-5 w-5', colour, phase.status === 'running' && 'animate-spin')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('text-xs font-semibold', phase.status === 'pending' ? 'text-text-muted' : 'text-text-primary')}>
              {phase.name}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-text-muted">
              {phase.status === 'done' && phase.durationMs !== undefined ? `${phase.durationMs.toFixed(2)} ms` : ''}
              {phase.status === 'running' && '…'}
              {phase.status === 'pending' && 'queued'}
              {phase.status === 'failed' && 'failed'}
              <Chev className="h-3 w-3" />
            </span>
          </div>
          {!expanded && <p className="mt-0.5 truncate text-[11px] text-text-secondary">{PHASE_TIPS[phase.name] || ''}</p>}
        </div>
      </button>
      {expanded && (
        <div className="ml-8 mb-2 rounded-md border border-border bg-elevated/50 p-3 text-[11px]" data-testid={`phase-detail-${phase.name.replace(/[^a-zA-Z]/g, '')}`}>
          <p className="text-text-secondary">{PHASE_TIPS[phase.name] || 'No description.'}</p>
          {phase.startedAtMs !== undefined && (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-text-muted">
              <span>started @ {phase.startedAtMs.toFixed(2)} ms</span>
              <span>duration {(phase.durationMs ?? 0).toFixed(2)} ms</span>
            </div>
          )}
          {phase.error && (
            <div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 font-mono text-red-400">
              {phase.error}
            </div>
          )}
        </div>
      )}
    </li>
  );
};

const NetworkCard = ({ network, sentBody, responseSize }: {
  network: Record<string, any>;
  sentBody?: string;
  responseSize?: number;
}) => (
  <div className="rounded-md border border-border bg-surface/40 p-3" data-testid="trace-network-card">
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
      <Globe className="h-3.5 w-3.5" /> Network snapshot
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
      {network.localAddress && <Row k="Local" v={network.localAddress} />}
      {network.remoteAddress && <Row k="Remote" v={network.remoteAddress} />}
      {network.httpVersion && <Row k="HTTP" v={network.httpVersion} />}
      {network.tlsProtocol && <Row k={<><Lock className="inline h-3 w-3" /> TLS</>} v={network.tlsProtocol} />}
      {network.cipherName && <Row k="Cipher" v={network.cipherName} />}
      {network.statusCode !== undefined && <Row k="Status" v={String(network.statusCode)} />}
      {sentBody !== undefined && <Row k="Sent" v={`${sentBody?.length ?? 0} bytes`} />}
      {responseSize !== undefined && <Row k="Received" v={`${responseSize} bytes`} />}
      {network.tlsWarning && (
        <div className="col-span-2 rounded border border-yellow-500/40 bg-yellow-500/10 p-1.5 text-[10px] text-yellow-500">
          ⚠ {network.tlsWarning}
        </div>
      )}
    </dl>
  </div>
);

const Row = ({ k, v }: { k: React.ReactNode; v: string }) => (
  <>
    <dt className="text-text-muted">{k}</dt>
    <dd className="truncate text-text-primary" title={v}>{v}</dd>
  </>
);

const SentHeadersCard = ({ headers }: { headers: any[] }) => (
  <div className="rounded-md border border-border bg-surface/40 p-3" data-testid="trace-sent-headers">
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
      <Server className="h-3.5 w-3.5" /> Sent on the wire <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-text-muted">{headers.length}</span>
    </div>
    <div className="space-y-0.5 font-mono text-[11px]">
      {headers.map((h, i) => (
        <div key={i} className="flex items-center gap-2 truncate">
          <ArrowRight className="h-3 w-3 shrink-0 text-text-muted" />
          <span className={cn('shrink-0 rounded px-1 py-0.5 text-[9px]', h.source === 'SYSTEM' ? 'bg-blue-500/10 text-blue-400' : 'bg-elevated text-text-muted')}>
            {h.source ?? 'USER'}
          </span>
          <span className="text-text-primary">{h.key}:</span>
          <span className="truncate text-text-secondary" title={h.value}>{h.isSecret ? '••••••' : h.value}</span>
        </div>
      ))}
    </div>
  </div>
);

/* Compact horizontal stepper rendered just below the URL bar while a
 * streaming execute is in-flight. */
export const LiveStepperStrip = ({ tabId }: { tabId: string }) => {
  const exec = useStreamStore((s) => s.byTab[tabId]);
  if (!exec || exec.phases.length === 0) return null;
  const total = exec.phases.reduce((a, p) => a + (p.durationMs ?? 0), 0);
  return (
    <div data-testid="live-stepper" className="flex items-center gap-1 border-b border-border bg-surface/60 px-3 py-1.5 text-[10px]">
      <span className="mr-2 font-semibold uppercase tracking-wide text-text-muted">Live</span>
      {exec.phases.map((p) => (
        <Tooltip
          key={p.name}
          content={
            <div className="w-52 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{p.name}</span>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {p.status === 'pending'   && 'Not started yet — queued.'}
                {p.status === 'running'   && 'In progress…'}
                {p.status === 'done'      && `Completed in ${(p.durationMs ?? 0).toFixed(2)} ms`}
                {p.status === 'failed'    && (p.error || 'Failed')}
              </div>
            </div>
          }
          side="bottom"
        >
          <div className="flex min-w-0 flex-1 cursor-help items-center gap-1">
            <span className={cn(
              'h-1.5 w-full rounded-full transition-colors',
              p.status === 'done'    ? 'bg-success'
              : p.status === 'failed' ? 'bg-red-500'
              : p.status === 'running' ? 'animate-pulse bg-primary'
              : 'bg-border',
            )} />
          </div>
        </Tooltip>
      ))}
      <span className="ml-2 font-mono text-text-muted">
        {exec.active ? 'streaming…' : `${total.toFixed(0)} ms`}
      </span>
    </div>
  );
};

const StatusBadge = ({ status }: { status: LivePhase['status'] }) => {
  const map: Record<LivePhase['status'], { label: string; cls: string }> = {
    pending: { label: 'Not started', cls: 'bg-hover text-text-muted' },
    running: { label: 'In progress', cls: 'bg-primary-muted text-primary' },
    done:    { label: 'Completed',   cls: 'bg-success-muted text-success' },
    failed:  { label: 'Failed',      cls: 'bg-red-500/15 text-red-500' },
  };
  const m = map[status];
  return <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', m.cls)}>{m.label}</span>;
};
