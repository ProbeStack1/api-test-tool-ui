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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === containerRef.current && !loading) onOpenChange(false); }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex gap-4 p-5">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconCls)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id={`${testId}-title`} className="text-sm font-semibold text-text-primary">{title}</h3>
            {body ?? (description && (
              <div className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</div>
            ))}

            {requireTypeMatch && (
              <div className="mt-3 space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">
                  Type <span className="rounded bg-hover px-1 font-mono text-text-primary">{requireTypeMatch}</span> to confirm
                </label>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  data-testid={`${testId}-type-input`}
                  className="h-8 w-full rounded-md border border-border bg-probestack-bg px-2 font-mono text-xs outline-none transition-colors hover:border-primary/40 focus:border-primary"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-probestack-bg/40 px-4 py-3">
          <button
            data-testid={`${testId}-cancel`}
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-md border border-border bg-transparent px-3 text-xs text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            data-testid={`${testId}-confirm`}
            disabled={!canConfirm || loading}
            onClick={handleConfirm}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              btnCls,
            )}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
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

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
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
