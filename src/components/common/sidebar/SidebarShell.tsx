/**
 * SidebarShell — standard layout shared by every primary-tab panel.
 * Structure: Heading (icon + title + collapse) → action buttons → search → body.
 */
import { ChevronsLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLayout } from '@/stores/layout.store';
import { Tooltip } from '@/components/ui/Tooltip';

interface Props {
  icon: LucideIcon;
  title: string;
  actions?: React.ReactNode;
  search?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Optional pinned region at the bottom of the sidebar — used for
   * "Trash drawer" style controls that must always be reachable
   * regardless of scroll position. Mirrors the layout that
   * AiAssistedPanel uses for its Trash collapse toggle.
   */
  footer?: React.ReactNode;
  testId?: string;
}

export const SidebarShell = ({ icon: Icon, title, actions, search, children, footer, testId }: Props) => {
  const toggle = useLayout((s) => s.toggleLeft);
  return (
    <div className="flex h-full flex-col" data-testid={testId}>
      <div className="flex h-10 items-center justify-between border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {title}
          </span>
        </div>
        <Tooltip content="Collapse" shortcut="⌘B">
          <button
            onClick={toggle}
            data-testid="sidebar-collapse-btn"
            className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover hover:text-primary"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
      {actions && <div className="border-b border-border p-2">{actions}</div>}
      {search && <div className="border-b border-border p-2">{search}</div>}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-border">{footer}</div>}
    </div>
  );
};

export const ActionButton = ({
  icon: Icon, label, testId, onClick,
}: { icon: LucideIcon; label: string; testId: string; onClick?: () => void }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-probestack-bg text-xs text-text-primary transition-all hover:border-primary/60 hover:text-primary"
  >
    <Icon className="h-3.5 w-3.5" /> {label}
  </button>
);

export const SearchInput = ({
  placeholder, testId, value, onChange,
}: { placeholder: string; testId: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <input
    data-testid={testId}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="h-8 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none transition-colors placeholder:text-text-muted hover:border-primary/40 focus:border-primary"
  />
);
