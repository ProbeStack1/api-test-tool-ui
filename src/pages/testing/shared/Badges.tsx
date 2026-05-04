/**
 * Shared visual primitives for the Testing module.
 * Single source of truth for format / status / category colour codes
 * so badges look identical across every page.
 */
import { cn } from '@/utils/cn';

const FORMAT_TONE: Record<string, string> = {
  OPENAPI:  'bg-blue-500/15   text-blue-400   border-blue-500/30',
  POSTMAN:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  INSOMNIA: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  HAR:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CURL:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  YAML:     'bg-cyan-500/15   text-cyan-400   border-cyan-500/30',
  FORGEQ:   'bg-primary/15    text-primary    border-primary/30',
  UNKNOWN:  'bg-elevated      text-text-muted border-border',
};

export const FormatBadge = ({ format, className }: { format?: string; className?: string }) => (
  <span
    data-testid={`spec-format-${(format ?? 'UNKNOWN').toLowerCase()}`}
    className={cn(
      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
      FORMAT_TONE[format ?? 'UNKNOWN'] ?? FORMAT_TONE.UNKNOWN,
      className,
    )}
  >
    {format ?? 'unknown'}
  </span>
);

const STATUS_TONE: Record<string, string> = {
  ACTIVE:   'bg-success/15  text-success  border-success/30',
  ARCHIVED: 'bg-warning/15  text-warning  border-warning/30',
  DELETED:  'bg-danger/15   text-danger   border-danger/30',
};
export const StatusBadge = ({ status, className }: { status: string; className?: string }) => (
  <span
    data-testid={`spec-status-${status.toLowerCase()}`}
    className={cn(
      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
      STATUS_TONE[status] ?? STATUS_TONE.ACTIVE,
      className,
    )}
  >
    {status}
  </span>
);

const CATEGORY_TONE: Record<string, string> = {
  POSITIVE:    'bg-emerald-500/15 text-emerald-400',
  NEGATIVE:    'bg-rose-500/15    text-rose-400',
  VALIDATION:  'bg-blue-500/15    text-blue-400',
  PERFORMANCE: 'bg-purple-500/15  text-purple-400',
  SECURITY:    'bg-amber-500/15   text-amber-400',
  BOUNDARY:    'bg-cyan-500/15    text-cyan-400',
};
export const CategoryBadge = ({ category, className }: { category: string; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
      CATEGORY_TONE[category] ?? 'bg-elevated text-text-muted',
      className,
    )}
  >
    {category}
  </span>
);

const METHOD_TONE: Record<string, string> = {
  GET:    'text-emerald-400',
  POST:   'text-amber-400',
  PUT:    'text-blue-400',
  PATCH:  'text-purple-400',
  DELETE: 'text-rose-400',
};
export const MethodTag = ({ method, className }: { method?: string; className?: string }) => (
  <span className={cn('font-mono text-[10px] font-bold uppercase tracking-wider', METHOD_TONE[method ?? 'GET'] ?? 'text-text-muted', className)}>
    {method ?? '—'}
  </span>
);

export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

export const formatRelative = (iso: string): string => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleString();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};
