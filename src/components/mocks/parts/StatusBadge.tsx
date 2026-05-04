/**
 * StatusBadge — coloured pill for HTTP status codes. Single source of
 * truth for status colouring across the app.
 *
 *   2xx → green
 *   3xx → blue
 *   4xx → amber
 *   5xx → red
 */
import { cn } from '@/utils/cn';

export const StatusBadge = ({
  status, className,
}: { status: number; className?: string }) => {
  const cls =
    status >= 500 ? 'bg-red-500/15 text-red-400 border-red-500/40'
    : status >= 400 ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
    : status >= 300 ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
    : status >= 200 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
    : 'bg-slate-500/15 text-slate-400 border-slate-500/40';
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={cn(
        'inline-flex h-5 items-center justify-center rounded border px-1.5 font-mono text-[10px] font-bold',
        cls, className,
      )}
    >
      {status}
    </span>
  );
};
