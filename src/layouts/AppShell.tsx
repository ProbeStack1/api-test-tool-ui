/**
 * AppShell — tabs-in-header OR left-rail mode, context sidebar, resizable panels.
 *
 *   Mode 'left' : [Header+search] / [FeatureRail | ContextSidebar | Main | RightPanel | RightRail] / [StatusBar]
 *   Mode 'top'  : [Header+tabs]   / [             ContextSidebar | Main | RightPanel | RightRail] / [StatusBar]
 *
 * Panels are width-transitioned smoothly (disabled during active drag).
 */
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { StatusBar } from '@/components/common/StatusBar';
import { ContextSidebar } from '@/components/common/ContextSidebar';
import { FeatureRail } from '@/components/common/FeatureRail';
import { RightRail, RightPanel } from '@/components/common/RightSidebar';
import { useLayout } from '@/stores/layout.store';
import { usePrimaryTabNavigation } from '@/hooks/usePrimaryTabNavigation';
import { useActiveRunsTracker } from '@/hooks/useActiveRunsTracker';
import { FloatingChatbot } from '@/components/chatbot/FloatingChatbot';

/** Pages where the contextual left sidebar (collections/history/mcp/mock/etc.)
 *  is irrelevant — we hide it so the main content owns the width. */
const HIDE_CONTEXT_SIDEBAR = new Set([
  '/projects/manage',
  '/projects/settings',
  '/projects/profile',
  '/projects/support',
  '/projects/api-docs',
  '/projects/bug-tracker',
  '/projects/integrations',
  '/projects/dashboard',
  '/projects/monitors',
  '/projects/testing',
  '/projects/audit',
  '/projects/trash',
  '/projects/heartbeats',
  '/projects/digests',
]);

/** Right-side rail + panel are also hidden on these narrative/list pages. */
const HIDE_RIGHT = new Set([
  '/projects/manage',
  '/projects/settings',
  '/projects/profile',
  '/projects/support',
  '/projects/bug-tracker',
  '/projects/dashboard',
]);

export const AppShell = () => {
  usePrimaryTabNavigation();
  useActiveRunsTracker();
  const showRight = useLayout((s) => s.showRightSidebar);
  const mode = useLayout((s) => s.sideRailMode);
  const { pathname } = useLocation();
  const hideContext =
    HIDE_CONTEXT_SIDEBAR.has(pathname) ||
    [...HIDE_CONTEXT_SIDEBAR].some((p) => pathname.startsWith(p + '/'));
  const hideRight =
    HIDE_RIGHT.has(pathname) ||
    [...HIDE_RIGHT].some((p) => pathname.startsWith(p + '/'));

  return (
    <div
      data-testid="app-shell"
      className="flex h-screen w-screen flex-col overflow-hidden bg-probestack-bg text-text-primary"
    >
      <Header />
      <div className="flex min-h-0 flex-1">
        {mode === 'left' && <FeatureRail />}
        {!hideContext && <ContextSidebar />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
        {!hideRight && showRight && <RightPanel />}
        {!hideRight && <RightRail />}
      </div>
      <StatusBar />
      <FloatingChatbot />
    </div>
  );
};
