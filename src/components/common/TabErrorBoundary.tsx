/**
 * TabErrorBoundary — catches render-time exceptions inside a single
 * workspace tab so a misbehaving panel (for example the MCP inspector
 * mishandling an upstream payload) never nukes the whole app shell.
 *
 * Shows a compact, on-brand fallback with a retry button that resets
 * the boundary so the user can recover without a full reload.
 */
import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Shown in the fallback heading; helps locate the failure. */
  scope?: string;
}
interface State {
  err: Error | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: unknown) {
    /* eslint-disable no-console */
    console.error('[TabErrorBoundary]', this.props.scope ?? 'unknown', err, info);
    /* eslint-enable no-console */
  }

  reset = () => this.setState({ err: null });

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div
        role="alert"
        data-testid="tab-error-boundary"
        className="flex h-full w-full items-center justify-center p-6"
      >
        <div className="w-full max-w-md rounded-xl border border-danger/30 bg-surface/60 p-5 text-center backdrop-blur-md">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-semibold text-text-primary">
            {this.props.scope ? `${this.props.scope} hit an issue` : 'This panel hit an issue'}
          </h2>
          <p className="mt-2 break-words text-[11px] text-text-secondary">
            {this.state.err.message || 'Something went wrong rendering this view.'}
          </p>
          <button
            type="button"
            onClick={this.reset}
            data-testid="tab-error-retry"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
          >
            <RotateCcw className="h-3 w-3" />
            Retry this panel
          </button>
        </div>
      </div>
    );
  }
}
