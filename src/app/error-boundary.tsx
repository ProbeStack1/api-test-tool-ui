/**
 * Top-level React error boundary — wraps the entire app inside
 * `providers.tsx`. Catches any render error that bubbles past route
 * boundaries.
 *
 * Two responsibilities:
 *   1. Auto-recover from stale-chunk errors (Vite renames chunks
 *      between builds; older browser tabs reference paths that no
 *      longer exist). One reload, behind a session-scoped cooldown,
 *      lands the user on the latest build.
 *   2. Render a calm, branded fallback otherwise — never the React
 *      development overlay.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  error?: Error;
  recovering: boolean;
}

const STALE_CHUNK_RX =
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;
const STALE_GUARD_KEY    = 'adarsha:root-stale-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, recovering: false };

  static getDerivedStateFromError(error: Error): State {
    if (STALE_CHUNK_RX.test(error.message)) {
      try {
        const lastAt = Number(sessionStorage.getItem(STALE_GUARD_KEY) ?? 0);
        if (Date.now() - lastAt >= RELOAD_COOLDOWN_MS) {
          sessionStorage.setItem(STALE_GUARD_KEY, String(Date.now()));
          window.location.reload();
          return { hasError: true, error, recovering: true };
        }
      } catch { /* sessionStorage may be unavailable */ }
    }
    return { hasError: true, error, recovering: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for any external monitoring; safe in production.
    if (typeof console !== 'undefined') console.error('[app]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, recovering: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.recovering) {
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex h-screen w-screen items-center justify-center bg-bg text-text-secondary"
          data-testid="root-error-recovering"
        >
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="h-4 w-4 animate-spin" />
            Refreshing to load the latest version…
          </div>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex h-screen w-screen items-center justify-center bg-bg p-6"
        data-testid="error-boundary"
      >
        <div className="w-full max-w-md rounded-xl border border-border bg-surface/40 p-6 text-center shadow-md">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">Something went wrong</h1>
          <p className="mt-2 text-xs text-text-secondary break-words">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <p className="mt-3 text-[11px] text-text-muted">
            The page hit an unexpected issue. You can refresh the view or return to the home screen.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              data-testid="error-reload-btn"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
            >
              <RotateCcw className="h-3 w-3" />
              Reload
            </button>
            <button
              type="button"
              onClick={() => { this.reset(); window.location.assign('/'); }}
              data-testid="error-home-btn"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-hover/40 hover:text-text-primary"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
