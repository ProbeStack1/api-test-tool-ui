/**
 * InlinePopConfirm — tiny popover (NOT a full-screen modal) that appears
 * anchored to the triggering button. Clicking the backdrop or outside the
 * popover cancels. Perfect for per-row delete actions.
 *
 * Usage:
 *   <InlinePopConfirm
 *     message="Delete this request?"
 *     onConfirm={async () => { await deleteIt(); }}
 *   >
 *     {(open) => (
 *       <button onClick={open} aria-label="Delete">
 *         <Trash2 />
 *       </button>
 *     )}
 *   </InlinePopConfirm>
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface Props {
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning';
  side?: 'top' | 'bottom' | 'left' | 'right';
  onConfirm: () => void | Promise<void>;
  children: (open: () => void) => ReactNode;
  testId?: string;
}

export const InlinePopConfirm = ({
  message, confirmText = 'Delete', cancelText = 'Cancel',
  tone = 'danger', side = 'left',
  onConfirm, children, testId = 'inline-confirm',
}: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pos: Record<typeof side, string> = {
    top:    'bottom-full right-0 mb-1',
    bottom: 'top-full right-0 mt-1',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span ref={wrap} className="relative inline-flex">
      {children(() => setOpen(true))}
      {open && (
        <div
          data-testid={testId}
          role="dialog"
          className={cn(
            'absolute z-50 min-w-[220px] rounded-lg border border-border bg-surface p-3 shadow-xl animate-in fade-in zoom-in-95 duration-100',
            pos[side],
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-xs text-text-primary">{message}</div>
          <div className="flex justify-end gap-1.5">
            <button
              data-testid={`${testId}-cancel`}
              onClick={() => setOpen(false)}
              disabled={busy}
              className="h-7 rounded-md border border-border px-2 text-[11px] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              data-testid={`${testId}-confirm`}
              disabled={busy}
              onClick={async () => {
                try { setBusy(true); await onConfirm(); setOpen(false); }
                finally { setBusy(false); }
              }}
              className={cn(
                'h-7 rounded-md px-2 text-[11px] font-medium text-white transition-colors disabled:opacity-50',
                tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600',
              )}
            >
              {busy ? '…' : confirmText}
            </button>
          </div>
        </div>
      )}
    </span>
  );
};
