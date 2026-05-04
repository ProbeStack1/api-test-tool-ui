/**
 * Hook: when the user clicks a primary tab (in the FeatureRail or TopNav),
 * navigate to the matching route — kept ONLY as a fallback for places
 * that call `setPrimaryTab` programmatically without doing their own
 * `nav()`. Click handlers in FeatureRail/HeaderTabs navigate
 * synchronously, so this hook is now a no-op for normal user flow
 * (and therefore does not cause the perceived delay between sidebar
 * swap and main-area re-render).
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout, type PrimaryTab } from '@/stores/layout.store';

export const PRIMARY_ROUTE: Record<PrimaryTab, string> = {
  collection: '/projects/collections',
  history: '/projects/history',
  variables: '/projects/variables',
  mcp: '/projects/mcp',
  mock: '/projects/mocks',
  testing: '/projects/testing',
  aiAssisted: '/projects/ai-assisted',
  ai: '/projects/ai-assisted',
  dashboard: '/projects/dashboard',
};

export const usePrimaryTabNavigation = () => {
  const tab = useLayout((s) => s.primaryTab);
  const stamp = useLayout((s) => s.primaryTabStamp);
  const { pathname } = useLocation();
  const nav = useNavigate();
  const seen = useRef<number>(stamp);

  useEffect(() => {
    if (stamp === seen.current) return;
    seen.current = stamp;
    const target = PRIMARY_ROUTE[tab];
    // If the user is already deep inside the target tab (e.g. on
    // `/projects/testing/functional` while the target is `/projects/testing`),
    // don't redirect them back to the parent. Only navigate when we're on
    // a totally different tab's route.
    if (target && pathname !== target && !pathname.startsWith(target + '/')) {
      nav(target, { replace: false });
    }
  }, [tab, stamp, pathname, nav]);
};
