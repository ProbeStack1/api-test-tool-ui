/**
 * FeatureRail — narrow left icon column (primary tab selector).
 *
 * Theme-friendly: every icon uses {@link AppIcon} (Lordicon) which adapts
 * its accent colour from the live CSS theme variable. The selected state
 * highlights the rail with a primary-muted background + a left accent
 * stripe — same look in light and dark themes.
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout, type PrimaryTab } from '@/stores/layout.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { prefetchRoute } from '@/app/router';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';
import { cn } from '@/utils/cn';

const ITEMS: { key: PrimaryTab; icon: IconName; label: string; route: string }[] = [
  { key: 'collection',   icon: 'collection',  label: 'Collection',   route: '/projects/collections' },
  { key: 'history',      icon: 'history',     label: 'History',      route: '/projects/history' },
  { key: 'variables',    icon: 'variables',   label: 'Variables',    route: '/projects/variables' },
  { key: 'mcp',          icon: 'mcp',         label: 'MCP',          route: '/projects/mcp' },
  { key: 'mock',         icon: 'mock',        label: 'Mock',         route: '/projects/mocks' },
  { key: 'testing',      icon: 'testing',     label: 'Testing',      route: '/projects/testing' },
  { key: 'aiAssisted',   icon: 'zap',         label: 'AI Assisted',  route: '/projects/ai-assisted' },
  { key: 'dashboard',    icon: 'dashboard',   label: 'Dashboard',    route: '/projects/dashboard' },
];

const ROUTE_TAB: Array<[RegExp, PrimaryTab]> = [
  [/^\/projects\/variables/,    'variables'],
  [/^\/projects\/mcp/,          'mcp'],
  [/^\/projects\/mocks/,        'mock'],
  [/^\/projects\/testing/,      'testing'],
  [/^\/projects\/dashboard/,    'dashboard'],
  [/^\/projects\/ai-assisted/,  'aiAssisted'],
  [/^\/projects\/history/,      'history'],
  [/^\/projects\/collections/,  'collection'],
];

export const FeatureRail = () => {
  const active = useLayout((s) => s.primaryTab);
  const setTab = useLayout((s) => s.setPrimaryTab);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const match = ROUTE_TAB.find(([re]) => re.test(loc.pathname));
    if (match && match[1] !== active) setTab(match[1]);
  }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const matched = ROUTE_TAB.find(([re]) => re.test(loc.pathname));
  const visualActive = matched ? matched[1] : null;

  return (
    <aside
      data-testid="feature-rail"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-2"
    >
      {ITEMS.map(({ key, icon, label, route }) => {
        const isActive = visualActive === key;
        return (
          <Tooltip key={key} content={label} side="right">
            <button
              data-testid={`rail-${key}`}
              onClick={() => { setTab(key); nav(route); }}
              onPointerEnter={() => prefetchRoute(route)}
              onFocus={() => prefetchRoute(route)}
              className={cn(
                'group relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-150',
                isActive
                  ? 'bg-primary-muted/40 text-primary'
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-primary" />
              )}
              <AppIcon name={icon} animated active={isActive} className="h-[17px] w-[17px]" />
            </button>
          </Tooltip>
        );
      })}
    </aside>
  );
};
