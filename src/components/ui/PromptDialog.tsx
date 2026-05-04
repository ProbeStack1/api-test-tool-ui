/**
 * PromptDialog — theme-aware text-input modal to replace native window.prompt().
 * Mirrors the ergonomics of ConfirmDialog (imperative API via usePrompt()).
 *
 * Usage:
 *   const prompt = usePrompt();
 *   const name = await prompt({ title: 'Environment name?', placeholder: 'e.g. Staging' });
 *   if (!name) return; // cancelled / empty
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface PromptOptions {
  title: string;
  description?: React.ReactNode;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  testId?: string;
  /** Validate the value; return an error string to block submit, or null/undefined to accept. */
  validate?: (value: string) => string | null | undefined;
  /** If true, the confirm button is disabled when the input is empty. Default true. */
  requireValue?: boolean;
}

interface PromptContextValue {
  prompt: (opts: PromptOptions) => Promise<string | null>;
}
const PromptContext = createContext<PromptContextValue | null>(null);

interface InternalState extends PromptOptions {
  _open: boolean;
}

export const PromptProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<InternalState | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading] = useState(false);
  const resolverRef = useRef<((v: string | null) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setValue(opts.initialValue ?? '');
      setError(null);
      setState({ ...opts, _open: true });
    });
  }, []);

  const close = (result: string | null) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
    setValue('');
    setError(null);
  };

  const trimmed = value.trim();
  const requireValue = state?.requireValue ?? true;
  const canConfirm = (!requireValue || trimmed.length > 0) && !error;

  const handleSubmit = () => {
    if (!state) return;
    const err = state.validate?.(trimmed);
    if (err) { setError(err); return; }
    close(trimmed);
  };

  useEffect(() => {
    if (!state?._open) return;
    // autofocus
    requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter' && canConfirm && !loading) handleSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?._open, canConfirm, loading]);

  const value_api = useMemo(() => ({ prompt }), [prompt]);

  return (
    <PromptContext.Provider value={value_api}>
      {children}
      {state?._open && (
        <div
          data-testid={state.testId ?? 'prompt-dialog'}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) close(null); }}
        >
          <div className="absolute inset-0 bg-black/60" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
                <Pencil className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary">{state.title}</h3>
                {state.description && (
                  <div className="mt-1 text-xs leading-relaxed text-text-secondary">{state.description}</div>
                )}
                <div className="mt-3 space-y-1">
                  {state.label && (
                    <label className="block text-[11px] font-medium text-text-muted">{state.label}</label>
                  )}
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
                    placeholder={state.placeholder}
                    data-testid={`${state.testId ?? 'prompt-dialog'}-input`}
                    className="h-9 w-full rounded-md border border-border bg-probestack-bg px-3 text-sm text-text-primary outline-none transition-colors hover:border-primary/40 focus:border-primary"
                  />
                  {error && (
                    <div data-testid={`${state.testId ?? 'prompt-dialog'}-error`} className="text-[11px] text-red-400">{error}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-probestack-bg/40 px-4 py-3">
              <button
                data-testid={`${state.testId ?? 'prompt-dialog'}-cancel`}
                disabled={loading}
                onClick={() => close(null)}
                className="h-8 rounded-md border border-border bg-transparent px-3 text-xs text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
              >
                {state.cancelText ?? 'Cancel'}
              </button>
              <button
                data-testid={`${state.testId ?? 'prompt-dialog'}-submit`}
                disabled={!canConfirm || loading}
                onClick={handleSubmit}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                {state.confirmText ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PromptContext.Provider>
  );
};

export const usePrompt = () => {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error('usePrompt must be used inside <PromptProvider>');
  return ctx.prompt;
};
