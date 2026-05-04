/**
 * HomeShell — Postman/web app shell for the public-facing surfaces of
 * ForgeQ. Slim left sidebar (Home / Workspaces / Integrations / API Catalog
 * / Reports + Private/Public API Network at the bottom). Main area renders
 * the matched child route via `<Outlet/>`.
 *
 * Why a separate shell from `AppShell`?
 *   • This shell is "discovery" / "directory" mode — no workspace context,
 *     no FeatureRail, no per-request right sidebar. It stays clean.
 *   • Switching to a project hands off to `/projects/*` which mounts
 *     `AppShell` with the full collection / request builder UI.
 *
 * StatusBar is reused from the projects shell so the bottom-bar Home menu
 * is identical across the entire product.
 */
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Rocket,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { StatusBar } from '@/components/common/StatusBar';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';
import { cn } from '@/utils/cn';

interface NavItem { to: string; label: string; icon: IconName; exact?: boolean; matchPrefix?: string }

const NAV: NavItem[] = [
  { to: '/home',                     label: 'Home',         icon: 'dashboard',  exact: true },
  { to: '/projects/manage',          label: 'Projects',     icon: 'project' },
  { to: '/projects/integrations',    label: 'Integrations', icon: 'integration' },
  { to: '/home/api-catalog/public',  label: 'API Catalog',  icon: 'apidoc',     matchPrefix: '/home/api-catalog' },
  { to: '/home/graphql',             label: 'GraphQL',      icon: 'sparkles' },
  { to: '/home/governance',          label: 'Governance',   icon: 'shield' },
  { to: '/home/reports',             label: 'Reports',      icon: 'reports' },
];
const FOOT: NavItem[] = [
  { to: '/home/api-catalog/private', label: 'Private API Network', icon: 'lock' },
  { to: '/home/api-catalog/public',  label: 'Public API Network',  icon: 'globe' },
];

const ROUTE_TITLE: Array<[RegExp, string]> = [
  [/^\/home\/?$/,                     'Home'],
  [/^\/home\/api-catalog\/private/,   'API Catalog · Private API Network'],
  [/^\/home\/api-catalog\/public/,    'API Catalog · Public API Network'],
  [/^\/home\/graphql/,                'GraphQL Explorer'],
  [/^\/home\/governance/,             'Governance'],
  [/^\/home\/api-catalog\/?$/,        'API Catalog'],
  [/^\/home\/reports/,                'Reports'],
];

export const HomeShell = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const title = (ROUTE_TITLE.find(([re]) => re.test(pathname))?.[1]) ?? 'Home';

  return (
    <div data-testid="home-shell" className="flex h-screen flex-col bg-probestack-bg text-text-primary">
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <aside
          data-testid="home-sidebar"
          className="flex w-56 shrink-0 flex-col border-r border-border bg-surface"
        >
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <Link
              to="/"
              data-testid="app-header-logo"
              className="flex items-center gap-0.5"
            >
              <Logo variant="mark" className="h-9 w-8" />
              <div className="text-left">
                <div className="text-xs text-text-secondary font-semibold tracking-tight leading-tight mb-[-8px]">
                  probestack
                </div>
                <div className="font-semibold  text-xl tracking-tight leading-tight gradient-text">
                  ForgeQ
                </div>
              </div>
            </Link>
          </div>
          <nav className="flex-1 overflow-auto px-2 py-3">
            <ul className="space-y-0.5">
              {NAV.map(({ to, label, icon, exact, matchPrefix }) => (
                <li key={label}>
                  <NavLink
                    to={to}
                    end={exact}
                    data-testid={`home-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={({ isActive }) => {
                      const active = isActive || (matchPrefix ? pathname.startsWith(matchPrefix) : false);
                      return cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
                        active ? 'bg-primary-muted text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                      );
                    }}
                  >
                    <AppIcon name={icon} animated className="h-3.5 w-3.5" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                API Network
              </p>
              <ul className="space-y-0.5">
                {FOOT.map(({ to, label, icon }) => (
                  <li key={label}>
                    <NavLink
                      to={to}
                      data-testid={`home-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                      className={({ isActive }) => cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
                        isActive ? 'bg-primary-muted text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                      )}
                    >
                      <AppIcon name={icon} animated className="h-3.5 w-3.5" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
          <div className="border-t border-border p-2">
            <button
              data-testid="home-open-app"
              onClick={() => nav('/projects/collections')}
              className="flex w-full items-center gap-2 rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-primary-hover"
            >
              <Rocket className="h-3.5 w-3.5" /> Open testing hub
            </button>
          </div>
        </aside>

        {/* Main pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-4">
            <h1 className="text-sm font-semibold tracking-tight" data-testid="home-pane-title">{title}</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => nav('/projects/settings')}
                data-testid="home-settings-btn"
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary"
                aria-label="Settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-auto" data-testid="home-pane">
            <Outlet />
          </main>
        </div>
      </div>
      <StatusBar />
    </div>
  );
};
