/**
 * Top-level error boundary used by every protected and public route.
 *
 * Two concerns it handles transparently:
 *
 *   1. Stale-chunk recovery — when the static bundle on the server has
 *      been replaced (a fresh deploy, or a hot-reload), older browser
 *      tabs keep references to chunks that no longer exist. Vite throws
 *      "Failed to fetch dynamically imported module". The boundary
 *      auto-reloads once so the user sees the latest build instead of a
 *      broken screen.
 *
 *   2. Anything else — render a calm, branded message with a single
 *      "Reload" action so the experience never falls back to the
 *      generic React Router developer page.
 */
import { useEffect, useState } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, MessageSquare } from 'lucide-react';
import { useChatbot } from '@/stores/chatbot.store';

const STALE_CHUNK_RX =
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;

const STALE_GUARD_KEY = 'adarsha:stale-chunk-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

const reloadIfStaleChunk = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (!STALE_CHUNK_RX.test(message)) return false;

  // Cooldown so we don't loop if the bundle is genuinely missing.
  try {
    const lastAt = Number(sessionStorage.getItem(STALE_GUARD_KEY) ?? 0);
    if (Date.now() - lastAt < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(STALE_GUARD_KEY, String(Date.now()));
  } catch { /* sessionStorage may be unavailable */ }

  window.location.reload();
  return true;
};

export const RouteErrorBoundary = () => {
  const err = useRouteError();
  const nav = useNavigate();
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    setRecovering(reloadIfStaleChunk(err));
  }, [err]);

  /* ─ Auto-pop the AI chatbot with the error context so the user can
   *   immediately ask "why did this break?" instead of staring at a
   *   generic "Something went wrong" card. The chatbot state is a
   *   tiny zustand slice so this is side-effect-free to invoke. */
  useEffect(() => {
    if (!err || recovering) return;
    const msg = err instanceof Error ? err.message : String((err as any)?.message ?? err ?? '');
    try {
      useChatbot.getState().triggerError({
        errorMessage: msg,
        location: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      } as any);
    } catch { /* never break the recovery UI because of the chatbot */ }
  }, [err, recovering]);

  if (recovering) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-screen w-screen items-center justify-center bg-bg text-text-secondary"
        data-testid="route-error-recovering"
      >
        <div className="flex items-center gap-2 text-sm">
          <RotateCcw className="h-4 w-4 animate-spin" />
          Refreshing to load the latest version…
        </div>
      </div>
    );
  }

  const heading = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : 'Something went wrong';
  const detail  = err instanceof Error ? err.message : isRouteErrorResponse(err) ? String(err.data ?? '') : '';

  return (
    <div
      role="alert"
      className="flex h-screen w-screen items-center justify-center bg-bg p-6"
      data-testid="route-error-boundary"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface/40 p-6 text-center shadow-md">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">{heading}</h1>
        {detail && (
          <p className="mt-2 text-xs text-text-secondary break-words">{detail}</p>
        )}
        <p className="mt-3 text-[11px] text-text-muted">
          The page hit an unexpected issue. You can refresh the view or return to the home screen.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                useChatbot.getState().triggerError({
                  errorMessage: detail || heading,
                  location: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
                } as any);
              } catch {}
            }}
            data-testid="route-error-ask-ai"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <MessageSquare className="h-3 w-3" />
            Ask AI
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            data-testid="route-error-reload"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
          >
            <RotateCcw className="h-3 w-3" />
            Reload
          </button>
          <button
            type="button"
            onClick={() => nav('/')}
            data-testid="route-error-home"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-hover/40 hover:text-text-primary"
          >
            <Home className="h-3 w-3" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
