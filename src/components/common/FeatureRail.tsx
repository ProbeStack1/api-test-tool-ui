// /**
//  * FeatureRail — narrow left icon column (primary tab selector).
//  *
//  * Theme-friendly: every icon uses {@link AppIcon} (Lordicon) which adapts
//  * its accent colour from the live CSS theme variable. The selected state
//  * highlights the rail with a primary-muted background + a left accent
//  * stripe — same look in light and dark themes.
//  */
// import { useEffect, useRef, useState } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { useLayout, type PrimaryTab } from '@/stores/layout.store';
// import { Tooltip } from '@/components/ui/Tooltip';
// import { prefetchRoute } from '@/app/router';
// import { AppIcon, type IconName } from '@/components/icons/AppIcons';
// import { Globe, BookOpen, ExternalLink } from 'lucide-react';
// import { cn } from '@/utils/cn';

// const ITEMS: { key: PrimaryTab; icon: IconName; label: string; route: string }[] = [
//   { key: 'collection',   icon: 'collection',  label: 'Collection',   route: '/projects/collections' },
//   { key: 'history',      icon: 'history',     label: 'History',      route: '/projects/history' },
//   { key: 'variables',    icon: 'variables',   label: 'Variables',    route: '/projects/variables' },
//   { key: 'mcp',          icon: 'mcp',         label: 'MCP',          route: '/projects/mcp' },
//   { key: 'mock',         icon: 'mock',        label: 'Mock',         route: '/projects/mocks' },
//   { key: 'testing',      icon: 'testing',     label: 'Testing',      route: '/projects/testing' },
//   { key: 'aiAssisted',   icon: 'zap',         label: 'AI Assisted',  route: '/projects/ai-assisted' },
//   { key: 'aiTesting',    icon: 'flask',       label: 'AI Testing',   route: '/projects/ai-testing' },
//   { key: 'dashboard',    icon: 'dashboard',   label: 'Dashboard',    route: '/projects/dashboard' },
// ];

// const ROUTE_TAB: Array<[RegExp, PrimaryTab]> = [
//   [/^\/projects\/variables/,    'variables'],
//   [/^\/projects\/mcp/,          'mcp'],
//   [/^\/projects\/mocks/,        'mock'],
//   [/^\/projects\/testing/,      'testing'],
//   [/^\/projects\/dashboard/,    'dashboard'],
//   [/^\/projects\/ai-assisted/,  'aiAssisted'],
//   [/^\/projects\/ai-testing/,   'aiTesting'],
//   [/^\/projects\/history/,      'history'],
//   [/^\/projects\/collections/,  'collection'],
// ];

// export const FeatureRail = () => {
//   const active = useLayout((s) => s.primaryTab);
//   const setTab = useLayout((s) => s.setPrimaryTab);
//   const nav = useNavigate();
//   const loc = useLocation();

//   useEffect(() => {
//     const match = ROUTE_TAB.find(([re]) => re.test(loc.pathname));
//     if (match && match[1] !== active) setTab(match[1]);
//   }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

//   const matched = ROUTE_TAB.find(([re]) => re.test(loc.pathname));
//   const visualActive = matched ? matched[1] : null;

//   return (
//     <aside
//       data-testid="feature-rail"
//       className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-2"
//     >
//       {ITEMS.map(({ key, icon, label, route }) => {
//         const isActive = visualActive === key;
//         return (
//           <Tooltip key={key} content={label} side="right">
//             <button
//               data-testid={`rail-${key}`}
//               onClick={() => { setTab(key); nav(route); }}
//               onPointerEnter={() => prefetchRoute(route)}
//               onFocus={() => prefetchRoute(route)}
//               className={cn(
//                 'group relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-150',
//                 isActive
//                   ? 'bg-primary-muted/40 text-primary'
//                   : 'text-text-secondary hover:bg-hover hover:text-text-primary',
//               )}
//             >
//               {isActive && (
//                 <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-primary" />
//               )}
//               <AppIcon name={icon} animated active={isActive} className="h-[17px] w-[17px]" />
//             </button>
//           </Tooltip>
//         );
//       })}
//       <ApiHubRailItem />
//     </aside>
//   );
// };

// /* ──────────────────────────────────────────────────────────────────────
//  *  ApiHubRailItem
//  *  Globe icon at the bottom of the rail with a right-flyout menu listing
//  *  "API Catalog" (/home/api-catalog/public) and "API Hub" (/api-hub).
//  *  Both links open in a NEW tab. No routing state is touched — purely
//  *  local hover/click handling.
//  * ────────────────────────────────────────────────────────────────────── */
// const RAIL_LINKS: { label: string; href: string; icon: typeof Globe; description: string }[] = [
//   {
//     label: 'API Catalog',
//     href: '/home/api-catalog/public',
//     icon: BookOpen,
//     description: 'Browse all published APIs',
//   },
//   {
//     label: 'API Hub',
//     href: '/api-hub',
//     icon: Globe,
//     description: 'Public hub — discover APIs',
//   },
// ];

// const ApiHubRailItem = () => {
//   const [open, setOpen] = useState(false);
//   const wrapRef = useRef<HTMLDivElement>(null);
//   const closeTimer = useRef<number | null>(null);

//   useEffect(() => {
//     if (!open) return;
//     const onDoc = (e: MouseEvent) => {
//       if (!wrapRef.current) return;
//       if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
//     };
//     const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
//     document.addEventListener('mousedown', onDoc);
//     document.addEventListener('keydown', onEsc);
//     return () => {
//       document.removeEventListener('mousedown', onDoc);
//       document.removeEventListener('keydown', onEsc);
//     };
//   }, [open]);

//   const onEnter = () => {
//     if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
//     setOpen(true);
//   };
//   const onLeave = () => {
//     if (closeTimer.current) window.clearTimeout(closeTimer.current);
//     closeTimer.current = window.setTimeout(() => setOpen(false), 180);
//   };

//   return (
//     <div
//       ref={wrapRef}
//       className="relative mt-1"
//       onMouseEnter={onEnter}
//       onMouseLeave={onLeave}
//     >
//       <button
//         data-testid="rail-api-hub-trigger"
//         type="button"
//         onClick={() => setOpen((o) => !o)}
//         aria-haspopup="menu"
//         aria-expanded={open}
//         className={cn(
//           'group relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-150',
//           open
//             ? 'bg-primary-muted/40 text-primary'
//             : 'text-text-secondary hover:bg-hover hover:text-text-primary',
//         )}
//       >
//         {open && (
//           <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-primary" />
//         )}
//         <Globe className="h-[17px] w-[17px]" />
//       </button>

//       {open && (
//         <div
//           role="menu"
//           data-testid="rail-api-hub-menu"
//           className="absolute left-[calc(100%+6px)] top-0 z-50 w-60 rounded-md border border-border bg-probestack-bg shadow-lg ring-1 ring-black/5 overflow-hidden animate-in fade-in-0 slide-in-from-left-1 duration-150"
//         >
//           <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
//             Marketplace
//           </div>
//           {RAIL_LINKS.map(({ label, href, icon: Icon, description }) => (
//             <a
//               key={href}
//               href={href}
//               target="_blank"
//               rel="noopener noreferrer"
//               role="menuitem"
//               data-testid={`rail-api-hub-link-${label.toLowerCase().replace(/\s+/g, '-')}`}
//               className="flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-hover focus:bg-hover focus:outline-none"
//               onClick={() => setOpen(false)}
//             >
//               <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
//               <div className="min-w-0 flex-1">
//                 <div className="flex items-center gap-1.5">
//                   <span className="text-xs font-semibold text-text-primary">{label}</span>
//                   <ExternalLink className="h-3 w-3 text-text-tertiary" />
//                 </div>
//                 <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{description}</p>
//               </div>
//             </a>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };



















/**
 * FeatureRail — narrow left icon column (primary tab selector).
 *
 * Theme-friendly: every icon uses {@link AppIcon} (Lordicon) which adapts
 * its accent colour from the live CSS theme variable. The selected state
 * highlights the rail with a primary-muted background + a left accent
 * stripe — same look in light and dark themes.
 *
 * Hover behavior: rail visually expands/collapses (labels show/hide) but
 * does NOT affect the right-side content area. Only manual toggle
 * (via layout store) shifts the content.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout, type PrimaryTab } from '@/stores/layout.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { prefetchRoute } from '@/app/router';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';
import { Globe, BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const ITEMS: { key: PrimaryTab; icon: IconName; label: string; route: string }[] = [
  { key: 'collection',   icon: 'collection',  label: 'Collection',   route: '/projects/collections' },
  { key: 'history',      icon: 'history',     label: 'History',      route: '/projects/history' },
  { key: 'variables',    icon: 'variables',   label: 'Variables',    route: '/projects/variables' },
  { key: 'mcp',          icon: 'mcp',         label: 'MCP',          route: '/projects/mcp' },
  { key: 'mock',         icon: 'mock',        label: 'Mock',         route: '/projects/mocks' },
  { key: 'testing',      icon: 'testing',     label: 'Testing',      route: '/projects/testing' },
  { key: 'aiAssisted',   icon: 'zap',         label: 'AI Assistant',  route: '/projects/ai-assistant' },
  { key: 'aiTesting',    icon: 'flask',       label: 'AI Testing',   route: '/projects/ai-testing' },
  { key: 'dashboard',    icon: 'dashboard',   label: 'Dashboard',    route: '/projects/dashboard' },
];

const ROUTE_TAB: Array<[RegExp, PrimaryTab]> = [
  [/^\/projects\/variables/,    'variables'],
  [/^\/projects\/mcp/,          'mcp'],
  [/^\/projects\/mocks/,        'mock'],
  [/^\/projects\/testing/,      'testing'],
  [/^\/projects\/dashboard/,    'dashboard'],
  [/^\/projects\/ai-assistant/,  'aiAssisted'],
  [/^\/projects\/ai-testing/,   'aiTesting'],
  [/^\/projects\/history/,      'history'],
  [/^\/projects\/collections/,  'collection'],
];

export const FeatureRail = () => {
  const active = useLayout((s) => s.primaryTab);
  const setTab = useLayout((s) => s.setPrimaryTab);
  const nav = useNavigate();
  const loc = useLocation();

  // Rail expand/collapse state
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Hover handlers for each button
  const handleButtonMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleButtonMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  // Keep expanded when hovering submenu items
  const handleSubmenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const match = ROUTE_TAB.find(([re]) => re.test(loc.pathname));
    if (match && match[1] !== active) setTab(match[1]);
  }, [loc.pathname]);

  const matched = ROUTE_TAB.find(([re]) => re.test(loc.pathname));
  const visualActive = matched ? matched[1] : null;

  return (
    <aside
      data-testid="feature-rail"
      // 🔥 Removed onMouseEnter/Leave from here — now handled per button
      className="relative w-12 shrink-0 flex flex-col py-2 overflow-visible"
    >
      {/* Inner container that visually expands on hover */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full flex flex-col gap-1 border-r border-border bg-surface py-2 transition-all duration-500 ease-in-out overflow-hidden z-100',
          isHovered ? 'w-48' : 'w-12'
        )}
        style={{ willChange: 'width' }}
      >
        {ITEMS.map(({ key, icon, label, route }) => {
          const isActive = visualActive === key;

          const button = (
            <button
              data-testid={`rail-${key}`}
              onClick={() => { setTab(key); nav(route); }}
              onPointerEnter={() => prefetchRoute(route)}
              onFocus={() => prefetchRoute(route)}
              // 🔥 Hover handlers on button
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
              className={cn(
                'group relative flex h-9 items-center justify-start rounded-md px-3 transition-all duration-300 ease-in-out',
                isHovered ? 'w-full' : 'w-9',
                isActive
                  ? 'border-l-2 border-primary bg-gradient-to-r from-primary/15 to-primary/2 text-primary'
                  : 'text-text-secondary hover:bg-hover',
              )}
            >
              <AppIcon
                name={icon}
                animated
                active={isActive}
                className={cn(
                  'h-[17px] w-[17px] shrink-0 transition-colors duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-text-secondary group-hover:text-primary',
                )}
              />
              <span
                className={cn(
                  'ml-2 text-sm font-medium transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap',
                  isHovered ? 'max-w-48 opacity-100' : 'max-w-0 opacity-0',
                  isActive ? 'text-primary' : 'text-text-secondary',
                )}
              >
                {label}
              </span>
            </button>
          );

          return (
            <div key={key} className="flex w-full items-center justify-start">
              {isHovered ? (
                button
              ) : (
                <Tooltip content={label} side="right">
                  {button}
                </Tooltip>
              )}
            </div>
          );
        })}
        <ApiHubRailItem
          isHovered={isHovered}
          onHoverEnter={handleButtonMouseEnter}
          onHoverLeave={handleButtonMouseLeave}
          onSubmenuEnter={handleSubmenuMouseEnter}
        />
      </div>
    </aside>
  );
};

/* ──────────────────────────────────────────────────────────────────────
 *  ApiHubRailItem
 * ────────────────────────────────────────────────────────────────────── */
const RAIL_LINKS: { label: string; href: string; icon: typeof Globe }[] = [
  { label: 'API Catalog', href: '/home/api-catalog/public', icon: BookOpen },
  { label: 'API Hub', href: '/api-hub', icon: Globe },
];

const ApiHubRailItem = ({
  isHovered,
  onHoverEnter,
  onHoverLeave,
  onSubmenuEnter,
}: {
  isHovered: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onSubmenuEnter: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

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

  const handleOpen = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  };

  const handleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  };

  const subVisible = isHovered && open;

  const renderInlineSubItems = () => (
    <div
      className="w-full overflow-hidden transition-all duration-300 ease-in-out"
      style={{ maxHeight: subVisible ? '80px' : '0px' }}
    >
      <div className="flex flex-col gap-0.5 px-3 pb-1">
        {RAIL_LINKS.map(({ label, href, icon: Icon }, idx) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            data-testid={`rail-api-hub-inline-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={cn(
              'group flex h-9 items-center gap-3 rounded-md px-2 text-sm font-medium text-text-secondary transition-all duration-300 ease-out hover:bg-hover',
              subVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none',
            )}
            style={{ transitionDelay: subVisible ? `${idx * 60}ms` : '0ms' }}
            onClick={() => setOpen(false)}
          >
            <Icon className="h-4 w-4 shrink-0 transition-colors duration-200 group-hover:text-primary" />
            <span className="truncate">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className="relative mt-1 flex w-full flex-col items-start"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        data-testid="rail-api-hub-trigger"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        // 🔥 Hover handlers from parent
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
        className={cn(
          'group relative flex h-9 items-center justify-start rounded-md px-3 transition-all duration-300 ease-in-out',
          isHovered ? 'w-full' : 'w-9',
          open
            ? 'border-l-2 border-primary bg-gradient-to-r from-primary/20 to-transparent text-primary'
            : 'text-text-secondary hover:bg-hover',
        )}
      >
        <Globe
          className={cn(
            'h-[17px] w-[17px] shrink-0 transition-colors duration-200',
            open ? 'text-primary' : 'text-text-secondary group-hover:text-primary',
          )}
        />
        <span
          className={cn(
            'ml-2 text-sm font-medium transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap',
            isHovered ? 'max-w-48 opacity-100' : 'max-w-0 opacity-0',
            open ? 'text-primary' : 'text-text-secondary',
          )}
        >
          API Hub
        </span>
        {isHovered && (
          <ChevronDown
            className={cn(
              'ml-auto h-4 w-4 shrink-0 transition-transform duration-300 ease-in-out',
              open ? 'text-primary rotate-180' : 'text-text-secondary',
            )}
          />
        )}
      </button>

      {/* Inline sub-items — only when expanded */}
      {isHovered && (
        <div onMouseEnter={onSubmenuEnter}>
          {renderInlineSubItems()}
        </div>
      )}
    </div>
  );
};