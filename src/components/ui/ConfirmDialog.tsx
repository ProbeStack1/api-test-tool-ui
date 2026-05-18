/**
 * ConfirmDialog — generic, theme-aware confirmation modal.
 * Used everywhere instead of native window.confirm().
 *
 * Two ways to consume:
 *   1) <ConfirmDialog open={...} onOpenChange={...} ...props />
 *   2) const confirm = useConfirm(); await confirm({ ...props })
 *      — imperative Promise-based API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ConfirmTone = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  /** Require the user to type an exact string to enable the confirm button. */
  requireTypeMatch?: string;
  /** Optional async handler. While pending, the confirm button shows a spinner. */
  onConfirm?: () => void | Promise<void>;
  testId?: string;
  /** Rich body override — if provided, replaces description. */
  body?: React.ReactNode;
}

interface ConfirmProps extends ConfirmOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional anchor coordinates — if provided, the popover floats next
   *  to them (matching the sidebar `RowConfirm` behaviour). */
  lastClick?: { x: number; y: number } | null;
}

const TONE_STYLES: Record<ConfirmTone, { Icon: React.ComponentType<any>; iconCls: string; btnCls: string }> = {
  danger:  { Icon: Trash2,        iconCls: 'text-red-500 bg-red-500/10',        btnCls: 'bg-red-500 hover:bg-red-600 text-white' },
  warning: { Icon: AlertTriangle, iconCls: 'text-yellow-500 bg-yellow-500/10', btnCls: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  info:    { Icon: Info,          iconCls: 'text-primary bg-primary-muted',   btnCls: 'bg-primary hover:bg-primary-hover text-white' },
  success: { Icon: CheckCircle2,  iconCls: 'text-green-500 bg-green-500/10', btnCls: 'bg-green-500 hover:bg-green-600 text-white' },
};

export const ConfirmDialog = ({
  open, onOpenChange, title, description, body,
  confirmText = 'Confirm', cancelText = 'Cancel',
  tone = 'danger', requireTypeMatch, onConfirm, testId = 'confirm-dialog',
  lastClick = null,
}: ConfirmProps) => {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { Icon, iconCls, btnCls } = TONE_STYLES[tone];
  const canConfirm = !requireTypeMatch || typed === requireTypeMatch;

  useEffect(() => {
    if (!open) { setTyped(''); setLoading(false); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'Enter' && canConfirm && !loading) {
        void handleConfirm();
      }
    };
    const onDown = (e: MouseEvent) => {
      // Outside click → close. The popover swallows its own mousedown
      // via stopPropagation so this only fires for clicks elsewhere.
      if (!containerRef.current?.contains(e.target as Node) && !loading) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canConfirm, loading]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      setLoading(true);
      await onConfirm?.();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // Floating popover, NOT a centered modal. We deliberately drop the
  // backdrop/overlay so the page stays visible underneath — matches the
  // sidebar `RowConfirm` idiom (collection delete) and the AI Assisted
  // chat row's inline confirmation. Positioning:
  //   • Anchored to the last user click coordinates when available (the
  //     `useConfirm()` flow stashes them on each invocation).
  //   • Falls back to top-center 80px down from the viewport top if no
  //     coordinate was captured (e.g. keyboard-triggered confirms).
  // We also clamp so it never overflows the viewport.
  const W = 320;
  const H_GUESS = requireTypeMatch ? 220 : 150;
  let top = lastClick?.y != null ? lastClick.y + 12 : 80;
  let left = lastClick?.x != null ? lastClick.x - W / 2 : window.innerWidth / 2 - W / 2;
  if (typeof window !== 'undefined') {
    top  = Math.max(8, Math.min(top,  window.innerHeight - H_GUESS - 8));
    left = Math.max(8, Math.min(left, window.innerWidth  - W       - 8));
  }

  return createPortal(
    <div
      ref={containerRef}
      data-testid={testId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${testId}-title`}
      style={{ position: 'fixed', top, left, width: W, zIndex: 10000 }}
      className="rounded-lg border border-border bg-elevated p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex gap-2.5">
        <div className={cn('mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full', iconCls)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id={`${testId}-title`} className="text-[12px] font-semibold text-text-primary">{title}</h3>
          {body ?? (description && (
            <div className="mt-1 text-[11px] leading-snug text-text-secondary">{description}</div>
          ))}

          {requireTypeMatch && (
            <div className="mt-2 space-y-1">
              <label className="block text-[10px] font-medium text-text-muted">
                Type <span className="rounded bg-hover px-1 font-mono text-text-primary">{requireTypeMatch}</span> to confirm
              </label>
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                data-testid={`${testId}-type-input`}
                className="h-7 w-full rounded-md border border-border bg-probestack-bg px-2 font-mono text-[11px] outline-none transition-colors hover:border-primary/40 focus:border-primary"
              />
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              data-testid={`${testId}-cancel`}
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="h-6 rounded-md border border-border bg-transparent px-2 text-[11px] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              data-testid={`${testId}-confirm`}
              disabled={!canConfirm || loading}
              onClick={handleConfirm}
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                btnCls,
              )}
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/* ─── Imperative confirm hook ──────────────────────────────────────── */
interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}
const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  // Track the last user click anywhere in the app so the confirm
  // popover can anchor next to the thing the user just clicked.
  const lastClickRef = useRef<{ x: number; y: number } | null>(null);
  const [snapshotClick, setSnapshotClick] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { lastClickRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setSnapshotClick(lastClickRef.current);
      setOpts(options);
    });
  }, []);

  const close = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpts(null);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {opts && (
        <ConfirmDialog
          open={true}
          onOpenChange={(o) => { if (!o) close(false); }}
          lastClick={snapshotClick}
          {...opts}
          onConfirm={async () => {
            try { await opts.onConfirm?.(); } catch (_) { /* swallow; dialog stays open on error if thrown */ }
            close(true);
          }}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx.confirm;
};
