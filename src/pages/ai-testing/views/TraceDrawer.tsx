/**
 * TraceDrawer — slide-over panel hosting TraceViewer, so opening a trace
 * doesn't push the run page's own layout around. Same slide-over pattern
 * already used for the audit log's correlation drawer, just wider (the
 * trace needs room for its two-panel tree + detail layout).
 */
import { X, Workflow } from 'lucide-react';
import { TraceViewer } from './TraceViewer';

export const TraceDrawer = ({ workspaceId, runId, title, sample, onClose }: {
  workspaceId: string;
  runId: string;
  title?: string;
  sample?: boolean;
  onClose: () => void;
}) => (
  <div data-testid="ai-testing-trace-drawer" className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex h-full w-full max-w-5xl flex-col border-l border-border bg-surface shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b border-border bg-surface/80 px-5 py-3.5">
        <Workflow className="h-4 w-4 text-primary" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight">{title ?? 'Trace'}</h2>
          <p className="text-[11px] text-text-muted">Step-by-step waterfall of this run</p>
        </div>
        <button onClick={onClose} data-testid="ai-testing-trace-drawer-close"
                className="ml-auto rounded p-1.5 text-text-muted hover:bg-hover hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <TraceViewer workspaceId={workspaceId} runId={runId} sample={sample} />
      </div>
    </div>
  </div>
);
