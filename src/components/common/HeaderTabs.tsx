/**
 * HeaderTabs — centered primary navigation (Collection / History / MCP / Mock / Testing / Dashboard).
 * Sliding indicator removed; active tab gets border-primary, light primary background, primary text,
 * icon colour stays unchanged.
 */
import {
  FolderOpen,
  History as HistoryIcon,
  Boxes,
  Server,
  TestTube2,
  LayoutDashboard,
  Variable,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout, type PrimaryTab } from '@/stores/layout.store';
import { prefetchRoute } from '@/app/router';
import { cn } from '@/utils/cn';

const TABS: { key: PrimaryTab; label: string; icon: LucideIcon; route: string }[] = [
  { key: 'collection', label: 'Collection', icon: FolderOpen, route: '/projects/collections' },
  { key: 'history', label: 'History', icon: HistoryIcon, route: '/projects/collections' },
  { key: 'variables', label: 'Variables', icon: Variable, route: '/projects/variables' },
  { key: 'mcp', label: 'MCP', icon: Boxes, route: '/projects/mcp' },
  { key: 'mock', label: 'Mock', icon: Server, route: '/projects/mocks' },
  { key: 'testing', label: 'Testing', icon: TestTube2, route: '/projects/testing' },
  { key: 'aiAssisted' as PrimaryTab, label: 'AI Assistant', icon: Sparkles, route: '/projects/ai-assisted' },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/projects/dashboard' },
];

/** Pages where none of the primary tabs should appear active. */
const NEUTRAL_ROUTES = [
  '/projects/manage',
  '/projects/settings',
  '/projects/profile',
  '/projects/support',
  '/projects/integrations',
  '/projects/api-docs',
  '/projects/bug-tracker',
  '/projects/audit',
  '/projects/trash',
  '/projects/monitors',
  '/projects/graphql',
  '/projects/security',
  '/projects/governance',
];

export const HeaderTabs = () => {
  const active = useLayout((s) => s.primaryTab);
  const setTab = useLayout((s) => s.setPrimaryTab);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const neutral = NEUTRAL_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  const effectiveActive = neutral ? null : active;

  return (
    <div
      data-testid="header-tabs"
      className="flex items-center rounded-lg border border-border bg-probestack-bg p-0.5"
    >
      {TABS.map(({ key, label, icon: Icon, route }) => {
        const isActive = effectiveActive === key;
        return (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => { setTab(key); nav(route); }}
            onPointerEnter={() => prefetchRoute(route)}
            onFocus={() => prefetchRoute(route)}
            className={cn(
              'relative flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-all duration-200',
              'border border-transparent',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {/* Icon always stays secondary colour, never changes */}
            <Icon className="h-3.5 w-3.5 text-text-secondary" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};