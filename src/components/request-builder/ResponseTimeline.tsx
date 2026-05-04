/**
 * ResponseTimeline — Postman-style waterfall showing phase breakdown.
 * Appears as a small popover on hover over the status/time chip.
 */
import { cn } from '@/utils/cn';

interface Phase { label: string; ms: number; color: string; }

const PHASES: Phase[] = [
  { label: 'Prepare',              ms: 24.16,  color: 'bg-warning' },
  { label: 'Socket Initialization', ms: 7.31,   color: 'bg-primary' },
  { label: 'DNS Lookup',            ms: 4.33,   color: 'bg-info' },
  { label: 'TCP Handshake',         ms: 124.0,  color: 'bg-info' },
  { label: 'SSL Handshake',         ms: 159.63, color: 'bg-info' },
  { label: 'Waiting (TTFB)',        ms: 710.0,  color: 'bg-danger' },
  { label: 'Download',              ms: 5.41,   color: 'bg-success' },
  { label: 'Process',               ms: 0.59,   color: 'bg-text-muted' },
];

export const ResponseTimeline = ({ total }: { total: number }) => {
  const max = Math.max(...PHASES.map((p) => p.ms));
  return (
    <div data-testid="response-timeline" className="w-[320px] p-3">
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="inline-block h-3 w-3 rounded-full border border-border" />
          Response Time
        </span>
        <span className="text-xs font-semibold text-text-primary">{(total / 1000).toFixed(2)} s</span>
      </div>
      <div className="space-y-1.5">
        {PHASES.map((p) => (
          <div key={p.label} className="grid grid-cols-[120px_1fr_60px] items-center gap-2 text-[11px]">
            <span className="truncate text-text-secondary">{p.label}</span>
            <div className="relative h-1.5 rounded bg-hover">
              <span
                className={cn('absolute inset-y-0 left-0 rounded', p.color)}
                style={{ width: `${Math.max(2, (p.ms / max) * 100)}%` }}
              />
            </div>
            <span className="text-right font-mono text-text-primary">{p.ms.toFixed(2)} ms</span>
          </div>
        ))}
      </div>
    </div>
  );
};
