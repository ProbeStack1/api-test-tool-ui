/**
 * ProbeTransparencyCard — expandable card explaining what a security
 * probe actually does, what it tests, which endpoints it hit, and the
 * result. Solves the user pain "mujhe pata hi nahi chalta scan kya
 * actually kar raha hai".
 *
 * Each probe has 4 sections (expandable):
 *   • What it tests (1-line plain English)
 *   • How it works (payload sample, expected behaviour)
 *   • Endpoints tested (URLs probed + count)
 *   • Status + remediation
 *
 * Right-click on any FAIL finding → context menu (Notify, Copy, Export).
 * Keyboard: Enter on focused card toggles details.
 *
 * data-testid coverage:
 *   probe-card-{checkId}, probe-card-toggle-{checkId},
 *   probe-card-notify-{checkId}, probe-card-evidence-{checkId}
 */
import { useState } from 'react';
import {
  ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle,
  Send, Clock, Globe, Code2, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/utils/cn';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface ProbeResult {
  /** Unique probe id, e.g. "sql-injection" */
  checkId: string;
  /** Human-readable name, e.g. "SQL Injection probe" */
  name: string;
  passed: boolean;
  severity: Severity;
  detail: string;
  remediation?: string;
  evidence?: string;
  /** What this probe tests in plain English */
  whatItTests: string;
  /** How the probe is executed (payloads, expected response) */
  howItWorks: string;
  /** URLs that were hit during this probe */
  endpointsTested: string[];
  /** Total time taken in ms */
  durationMs?: number;
}

interface Props {
  result: ProbeResult;
  onNotify?: (result: ProbeResult) => void;
}

const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: 'bg-red-600/15 text-red-500 border-red-500/40',
  HIGH:     'bg-red-500/10 text-red-400 border-red-500/30',
  MEDIUM:   'bg-amber-500/10 text-amber-400 border-amber-500/30',
  LOW:      'bg-sky-500/10 text-sky-400 border-sky-500/30',
  INFO:     'bg-muted/30 text-text-muted border-border',
};

export function ProbeTransparencyCard({ result, onNotify }: Props) {
  const [open, setOpen] = useState(!result.passed); // auto-expand failures
  const StatusIcon = result.passed ? CheckCircle2 : XCircle;

  return (
    <div
      data-testid={`probe-card-${result.checkId}`}
      className={cn(
        'rounded-lg border bg-background-elevated transition-colors',
        result.passed ? 'border-border' : 'border-red-500/30',
      )}
    >
      {/* Header (always visible) */}
      <button
        data-testid={`probe-card-toggle-${result.checkId}`}
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/20 rounded-t-lg"
      >
        {open ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
        <StatusIcon className={cn('w-5 h-5 shrink-0', result.passed ? 'text-emerald-500' : 'text-red-500')} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground">{result.name}</div>
          <div className="text-xs text-text-muted truncate">{result.detail}</div>
        </div>
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border', SEV_COLOR[result.severity])}>
          {result.severity}
        </span>
        {result.durationMs != null && (
          <span className="text-[10px] text-text-faint flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {result.durationMs}ms
          </span>
        )}
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-3 text-sm">
          {/* What */}
          <Section icon={ShieldAlert} title="What it tests">
            <p className="text-text-muted">{result.whatItTests}</p>
          </Section>

          {/* How */}
          <Section icon={Code2} title="How it works">
            <pre className="text-xs bg-muted/30 rounded p-2 overflow-x-auto font-mono whitespace-pre-wrap text-text-muted">
              {result.howItWorks}
            </pre>
          </Section>

          {/* Endpoints */}
          <Section
            icon={Globe}
            title={`Endpoints tested (${result.endpointsTested.length})`}
          >
            <ul className="space-y-0.5">
              {result.endpointsTested.map((u, i) => (
                <li key={i} className="text-xs font-mono text-text-muted truncate">{u}</li>
              ))}
              {result.endpointsTested.length === 0 && (
                <li className="text-xs text-text-faint italic">(no endpoints — probe was skipped)</li>
              )}
            </ul>
          </Section>

          {/* Evidence */}
          {result.evidence && (
            <details className="text-xs">
              <summary
                data-testid={`probe-card-evidence-${result.checkId}`}
                className="cursor-pointer text-text-muted hover:text-foreground"
              >
                Evidence snippet
              </summary>
              <pre className="mt-1 bg-muted/30 rounded p-2 overflow-x-auto font-mono text-[11px] text-text-muted whitespace-pre-wrap max-h-40">
                {result.evidence}
              </pre>
            </details>
          )}

          {/* Remediation + Actions */}
          {!result.passed && (
            <div className="flex items-start gap-3 p-3 rounded bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-amber-300 mb-0.5">Recommended fix</div>
                <p className="text-text-muted">{result.remediation || 'Review server-side input handling and authorization checks.'}</p>
              </div>
              {onNotify && (
                <button
                  data-testid={`probe-card-notify-${result.checkId}`}
                  onClick={() => onNotify(result)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25 text-xs font-medium"
                >
                  <Send className="w-3 h-3" /> Notify developer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
        <Icon className="w-3 h-3" />
        {title}
      </div>
      {children}
    </div>
  );
}

export default ProbeTransparencyCard;
