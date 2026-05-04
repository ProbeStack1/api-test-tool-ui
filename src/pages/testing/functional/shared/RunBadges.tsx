/**
 * Run-status visual primitives shared across Functional Test tabs.
 */
import { cn } from '@/utils/cn';
import {
  CheckCircle2, XCircle, AlertOctagon, Clock, Zap, Pause, Ban,
  type LucideIcon,
} from 'lucide-react';

const STATUS: Record<string, { tone: string; icon: LucideIcon; label: string }> = {
  QUEUED:    { tone: 'bg-blue-500/15 text-blue-400 border-blue-500/30',     icon: Clock,        label: 'Queued' },
  RUNNING:   { tone: 'bg-amber-500/15 text-amber-400 border-amber-500/30',  icon: Zap,          label: 'Running' },
  SUCCESS:   { tone: 'bg-success/15 text-success border-success/30',         icon: CheckCircle2, label: 'Success' },
  FAILED:    { tone: 'bg-rose-500/15 text-rose-400 border-rose-500/30',     icon: XCircle,      label: 'Failed' },
  ERROR:     { tone: 'bg-danger/15 text-danger border-danger/30',           icon: AlertOctagon, label: 'Error' },
  CANCELLED: { tone: 'bg-elevated text-text-muted border-border',            icon: Ban,          label: 'Cancelled' },
  PAUSED:    { tone: 'bg-warning/15 text-warning border-warning/30',         icon: Pause,        label: 'Paused' },
};

export const RunStatusBadge = ({ status, className }: { status: string; className?: string }) => {
  const meta = STATUS[status] ?? { tone: 'bg-elevated text-text-muted border-border', icon: Clock, label: status };
  const Icon = meta.icon;
  return (
    <span
      data-testid={`run-status-${status.toLowerCase()}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
        meta.tone,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" /> {meta.label}
    </span>
  );
};

export const formatDuration = (ms: number | null | undefined): string => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mm = Math.floor(ms / 60_000);
  const ss = Math.floor((ms % 60_000) / 1000);
  return `${mm}m ${ss}s`;
};
