/**
 * AiTestingPage — main area for the AI Testing primary tab.
 *
 * The LEFT side is the platform's standard ContextSidebar (with
 * {@link AiTestingPanel}) — we don't render our own sidebar here. The
 * main area renders one of five views driven by the {@code ?view=…}
 * URL search param:
 *
 *   overview  →  dashboard cards + cost/run trend chart
 *   quick     →  one-shot LLM probe
 *   suites    →  detail of {@code ?suite=ID} (cases + run actions)
 *                or a "create new suite" form when {@code ?new=1}
 *   runs      →  per-run drill-down (results + verdict grid) for
 *                {@code ?run=ID}, otherwise a recent-runs list
 *   keys      →  per-workspace LLM provider key configuration
 *
 * No "Audit" view here on purpose — the platform's audit-activity
 * service already has a dedicated tab for cross-service activity.
 * AI Testing run history lives in the Runs view itself.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { OverviewView } from './views/OverviewView';
import { QuickTestView } from './views/QuickTestView';
import { SuitesView } from './views/SuitesView';
import { RunsView } from './views/RunsView';
import { KeysView } from './views/KeysView';
import { AgentsView } from './views/AgentsView';
import { McpServersView } from './views/McpServersView';
import { WebhooksView } from './views/WebhooksView';
import { AnalyticsView } from './views/AnalyticsView';
import { AgentTestingView } from './views/AgentTestingView';
import { AgentMarketplaceView } from './views/AgentMarketplaceView';
import { DocsView } from './views/DocsView';

type View =
  | 'overview' | 'quick' | 'suites' | 'runs'
  | 'agents'   | 'agent-testing' | 'marketplace'
  | 'mcp'      | 'webhooks' | 'analytics' | 'keys' | 'docs';

const ALL_VIEWS: View[] = [
  'overview', 'quick', 'suites', 'runs', 'agents', 'agent-testing',
  'marketplace', 'mcp', 'webhooks', 'analytics', 'keys', 'docs',
];

function viewComponent(v: View, workspaceId: string) {
  switch (v) {
    case 'overview':      return <OverviewView workspaceId={workspaceId} />;
    case 'quick':         return <QuickTestView workspaceId={workspaceId} />;
    case 'suites':        return <SuitesView workspaceId={workspaceId} />;
    case 'runs':          return <RunsView workspaceId={workspaceId} />;
    case 'agent-testing': return <AgentTestingView workspaceId={workspaceId} />;
    case 'marketplace':   return <AgentMarketplaceView workspaceId={workspaceId} />;
    case 'agents':        return <AgentsView workspaceId={workspaceId} />;
    case 'mcp':           return <McpServersView workspaceId={workspaceId} />;
    case 'webhooks':      return <WebhooksView workspaceId={workspaceId} />;
    case 'analytics':     return <AnalyticsView workspaceId={workspaceId} />;
    case 'keys':          return <KeysView workspaceId={workspaceId} />;
    case 'docs':          return <DocsView workspaceId={workspaceId} />;
  }
}

export const AiTestingPage = () => {
  const workspaceId = useWorkspaceStore((s) => s.currentId);
  const [params] = useSearchParams();
  const view = (params.get('view') as View) || 'overview';

  // Keep-alive: once a view has been visited, keep it mounted (hidden via
  // CSS) so re-entering the tab is instant — no skeleton flash, no refetch.
  // Views are still reactive to URL params via useSearchParams.
  const [mounted, setMounted] = useState<Set<View>>(new Set([view]));
  useEffect(() => {
    setMounted((prev) => (prev.has(view) ? prev : new Set(prev).add(view)));
  }, [view]);

  // Reset cached views when the workspace changes — different ws = different data.
  useEffect(() => {
    setMounted(new Set([view]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="grid h-full place-items-center text-text-muted" data-testid="ai-testing-no-workspace">
        <div className="text-center">
          <FlaskConical className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Pick a workspace to access AI Testing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-probestack-bg" data-testid="ai-testing-page">
      {ALL_VIEWS.filter((v) => mounted.has(v)).map((v) => (
        <div key={v}
             data-testid={`ai-testing-view-${v}`}
             aria-hidden={v !== view}
             style={{ display: v === view ? 'block' : 'none' }}>
          {viewComponent(v, workspaceId)}
        </div>
      ))}
    </div>
  );
};
