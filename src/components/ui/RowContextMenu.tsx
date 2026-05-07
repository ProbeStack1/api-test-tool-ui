/**
 * RowContextMenu — portal-based context menu for sidebar rows.
 *
 * Why a custom build (not Radix ContextMenu):
 *   The 3-dot dropdown items are already Radix DropdownMenu.Items, which only
 *   render correctly inside a DropdownMenu.Root. We need the *same* options
 *   on right-click — so this primitive accepts a serialisable item array and
 *   renders them as styled buttons that visually match DropdownItem.
 *
 * Usage:
 *   const ctx = useRowContextMenu();
 *
 *   <div onContextMenu={(e) => ctx.openAt(e, [
 *     { icon: Pencil, label: 'Rename', onClick: () => setEditing(id) },
 *     { separator: true },
 *     { icon: Trash2, label: 'Delete', destructive: true, onClick: askDelete },
 *   ])}>...</div>
 *
 *   {ctx.portal}
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export type RowContextItem =
  | RowContextAction
  | RowContextSeparator
  | RowContextGroupLabel;

export interface RowContextAction {
  icon?: LucideIcon;
  label: string;
  /** Required unless `submenu` is provided. */
  onClick?: () => void;
  /** When set, hovering this row reveals a nested menu. `onClick` is ignored. */
  submenu?: RowContextItem[];
  destructive?: boolean;
  shortcut?: string;
  disabled?: boolean;
  separator?: false;
  groupLabel?: false;
}
interface RowContextSeparator { separator: true; groupLabel?: false; label?: undefined; onClick?: undefined; icon?: undefined; }
interface RowContextGroupLabel { groupLabel: string; separator?: false; label?: undefined; onClick?: undefined; icon?: undefined; }

const isSeparator = (it: RowContextItem): it is RowContextSeparator =>
  (it as RowContextSeparator).separator === true;
const isGroupLabel = (it: RowContextItem): it is RowContextGroupLabel =>
  typeof (it as RowContextGroupLabel).groupLabel === 'string';

interface MenuPos { x: number; y: number }

export function useRowContextMenu() {
  const [items, setItems] = useState<RowContextItem[]>([]);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setPos(null), []);

  const openAt = useCallback((e: MouseEvent, nextItems: RowContextItem[]) => {
    if (!nextItems.length) return;
    e.preventDefault();
    e.stopPropagation();
    setItems(nextItems);
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  // Dismiss on outside click / Escape / scroll / resize / blur.
  useEffect(() => {
    if (!pos) return;
    const onDown = (ev: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) close();
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close(); };
    const onScroll = () => close();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [pos, close]);

  // Clamp to viewport so the menu never overflows.
  const adjusted = (() => {
    if (!pos || !menuRef.current) return pos;
    const rect = menuRef.current.getBoundingClientRect();
    const pad = 6;
    const maxX = window.innerWidth  - rect.width  - pad;
    const maxY = window.innerHeight - rect.height - pad;
    return { x: Math.min(pos.x, maxX), y: Math.min(pos.y, maxY) };
  })();

  const portal: ReactNode = pos ? createPortal(
    <SubmenuAwareMenu
      ref={menuRef}
      items={items}
      style={{ position: 'fixed', top: adjusted!.y, left: adjusted!.x, zIndex: 200 }}
      onClose={close}
    />,
    document.body,
  ) : null;

  return { openAt, close, portal, isOpen: !!pos };
}

/* -----------------------------------------------------------------------
 * Internal: a menu shell that knows how to fan-out submenus on hover.
 * Mounted both for the top-level (via portal) and any nested levels.
 * -------------------------------------------------------------------- */
import { ChevronRight } from 'lucide-react';
import { forwardRef } from 'react';

interface MenuProps {
  items: RowContextItem[];
  style?: React.CSSProperties;
  onClose: () => void;
}

const SubmenuAwareMenu = forwardRef<HTMLDivElement, MenuProps>(({ items, style, onClose }, ref) => {
  const [openSubAt, setOpenSubAt] = useState<number | null>(null);
  const itemRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  return (
    <div
      ref={ref}
      data-testid="row-context-menu"
      role="menu"
      style={style}
      className="min-w-[200px] rounded-lg border border-border bg-elevated p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
    >
      {items.map((it, i) => {
        if (isSeparator(it)) {
          return <div key={`sep-${i}`} className="my-1 h-px bg-border" />;
        }
        if (isGroupLabel(it)) {
          return (
            <div key={`lbl-${i}`} className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {it.groupLabel}
            </div>
          );
        }
        const action = it as RowContextAction;
        const Icon = action.icon;
        const hasSub = !!action.submenu?.length;
        const isOpen = openSubAt === i;
        const subAnchor = itemRefs.current[i]?.getBoundingClientRect();

        return (
          <div key={`${action.label}-${i}`} className="relative" onMouseEnter={() => hasSub && setOpenSubAt(i)} onMouseLeave={() => hasSub && setOpenSubAt((v) => (v === i ? null : v))}>
            <button
              type="button"
              role="menuitem"
              ref={(el) => { itemRefs.current[i] = el; }}
              disabled={action.disabled}
              data-testid={`row-context-item-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => {
                if (hasSub) { setOpenSubAt(isOpen ? null : i); return; }
                action.onClick?.();
                onClose();
              }}
              className={cn(
                'flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-xs outline-none transition-colors',
                'hover:bg-hover focus:bg-hover',
                action.destructive
                  ? 'text-danger hover:bg-danger-muted focus:bg-danger-muted'
                  : 'text-text-primary',
                action.disabled && 'pointer-events-none opacity-50',
                isOpen && 'bg-hover',
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span className="flex-1 text-left">{action.label}</span>
              {action.shortcut && (
                <kbd className="font-mono text-[10px] text-text-muted">{action.shortcut}</kbd>
              )}
              {hasSub && <ChevronRight className="h-3 w-3 text-text-muted" />}
            </button>

            {hasSub && isOpen && subAnchor && (
              <SubmenuAwareMenu
                items={action.submenu!}
                onClose={onClose}
                style={{
                  position: 'fixed',
                  // Position to the right of the parent item, with a small gap.
                  top: subAnchor.top - 4,
                  left: Math.min(subAnchor.right + 4, window.innerWidth - 240),
                  zIndex: 201,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
SubmenuAwareMenu.displayName = 'SubmenuAwareMenu';

/**
 * Render a `RowContextItem[]` list as the children of a Radix Dropdown,
 * so the same array can power BOTH the 3-dot menu and the right-click menu.
 *
 *   <Dropdown trigger={...}>
 *     {renderDropdownItems(items)}
 *   </Dropdown>
 */
import { DropdownItem, DropdownSep, DropdownLabel } from './DropdownMenu';

export function renderDropdownItems(items: RowContextItem[]): ReactNode {
  return items.map((it, i) => {
    if (isSeparator(it)) return <DropdownSep key={`sep-${i}`} />;
    if (isGroupLabel(it)) return <DropdownLabel key={`lbl-${i}`}>{it.groupLabel}</DropdownLabel>;
    const action = it as RowContextAction;
    return (
      <DropdownItem
        key={`${action.label}-${i}`}
        icon={action.icon}
        destructive={action.destructive}
        shortcut={action.shortcut}
        disabled={action.disabled}
        onClick={action.onClick ?? (() => {})}
      >
        {action.label}
      </DropdownItem>
    );
  });
}
