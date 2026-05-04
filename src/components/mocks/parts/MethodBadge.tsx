/**
 * MethodBadge — coloured pill that renders an HTTP method in a
 * uniform way across the entire app. Same colour mapping as the
 * Postman style guide.
 */
import { cn } from '@/utils/cn';

const COLOURS: Record<string, string> = {
  GET:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  POST:   'bg-amber-500/15 text-amber-400 border-amber-500/40',
  PUT:    'bg-blue-500/15 text-blue-400 border-blue-500/40',
  PATCH:  'bg-purple-500/15 text-purple-400 border-purple-500/40',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/40',
  HEAD:   'bg-slate-500/15 text-slate-400 border-slate-500/40',
  OPTIONS:'bg-slate-500/15 text-slate-400 border-slate-500/40',
  '*':    'bg-violet-500/15 text-violet-400 border-violet-500/40',
};

export const MethodBadge = ({
  method, size = 'sm', className,
}: { method: string; size?: 'xs' | 'sm' | 'md'; className?: string }) => {
  const m = (method || 'GET').toUpperCase();
  const cls = COLOURS[m] ?? COLOURS.GET;
  return (
    <span
      data-testid={`method-badge-${m}`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded border font-mono font-bold',
        size === 'xs' ? 'h-4 px-1 text-[9px]'
        : size === 'sm' ? 'h-5 px-1.5 text-[10px]'
        : 'h-6 px-2 text-xs',
        cls, className,
      )}
    >
      {m === '*' ? 'ANY' : m}
    </span>
  );
};
