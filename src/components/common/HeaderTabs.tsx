/**
 * HeaderTabs — centered primary navigation (Collection / History / MCP / Mock / Testing / Dashboard).
 * Sliding indicator removed; active tab gets border-primary, light primary background, primary text,
 * icon colour stays unchanged.
 *
 * Plus: an "API Hub" dropdown trigger at the end — hover/click opens a small menu
 * with two links (API Catalog, API Hub) that open in a new tab. No new route added.
 */
import { useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  History as HistoryIcon,
  Boxes,
  Server,
  TestTube2,
  LayoutDashboard,
  Variable,
  Sparkles,
  FlaskConical,
  Globe,
  BookOpen,
  ExternalLink,
  ChevronDown,
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
  { key: 'aiTesting' as PrimaryTab,  label: 'AI Testing',   icon: FlaskConical, route: '/projects/ai-testing' },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/projects/dashboard' },
];

// External links surfaced under the "API Hub" dropdown.
const API_HUB_LINKS: { label: string; href: string; icon: LucideIcon; description: string }[] = [
  {
    label: 'API Catalog',
    href: '/home/api-catalog/public',
    icon: BookOpen,
    description: 'Browse all published APIs',
  },
  {
    label: 'API Hub',
    href: '/api-hub',
    icon: Globe,
    description: 'Public hub — discover APIs',
  },
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
      className="flex items-center rounded-md border border-border bg-probestack-bg p-0.5"
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
      <ApiHubDropdown />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────
 *  ApiHubDropdown
 *  Header trigger that opens a small menu of external/public routes
 *  ("API Catalog", "API Hub"). Each item opens in a NEW tab via
 *  target="_blank" so the user's project session is preserved.
 *  No new routes / no state in the global layout store — purely local
 *  so this addition cannot affect existing flows.
 *
 *  Added: Divider between the two links (horizontal rule).
 * ────────────────────────────────────────────────────────────────────── */
const ApiHubDropdown = () => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Hover-intent (small grace period so cursor can slide into the menu)
  const handleEnter = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  };
  const handleLeave = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        data-testid="tab-api-hub-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'relative flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-all duration-200',
          'border border-transparent',
          open
            ? 'border-primary bg-primary/10 text-primary'
            : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <Globe className="h-3.5 w-3.5 text-text-secondary" />
        <span>Marketplace</span>
        <ChevronDown
          className={cn('h-3 w-3 text-text-secondary transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          data-testid="api-hub-menu"
          className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-64 -translate-x-1/2 rounded-md border border-border bg-probestack-bg shadow-lg ring-1 ring-black/5 overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150"
        >
          {API_HUB_LINKS.map((link, idx) => (
            <div key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                data-testid={`api-hub-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-hover focus:bg-hover focus:outline-none"
                onClick={() => setOpen(false)}
              >
                <link.icon className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-text-primary">{link.label}</span>
                    <ExternalLink className="h-3 w-3 text-text-tertiary" />
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{link.description}</p>
                </div>
              </a>
              {/* Divider between the two links */}
              {idx < API_HUB_LINKS.length - 1 && (
                <hr className="mx-2 my-0 border-t border-border" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};