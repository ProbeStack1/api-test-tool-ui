/**
 * ContextSidebar — left workspace sidebar whose content swaps based on the
 * active primary tab. Smoothly animates collapse/expand (CSS transition on
 * width) and suppresses the transition during active drag for lag-free resize.
 */
import { ChevronsRight } from 'lucide-react';
import { useLayout } from '@/stores/layout.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { cn } from '@/utils/cn';
import { CollectionsPanel } from './sidebar/CollectionsPanel';
import { HistoryPanel } from './sidebar/HistoryPanel';
import { VariablesPanel } from './sidebar/VariablesPanel';
import { MCPPanel } from './sidebar/MCPPanel';
import { MockPanel } from './sidebar/MockPanel';
import { TestingPanel } from './sidebar/TestingPanel';
import { DashboardPanel } from './sidebar/DashboardPanel';
import { AiAssistedPanel } from './sidebar/AiAssistedPanel';

export const ContextSidebar = () => {
  const expanded = useLayout((s) => s.showLeftSidebar);
  const toggle = useLayout((s) => s.toggleLeft);
  const width = useLayout((s) => s.leftSidebarWidth);
  const nudge = useLayout((s) => s.nudgeLeftSidebar);
  const tab = useLayout((s) => s.primaryTab);
  const isResizing = useLayout((s) => s.isResizing);
  void toggle;

  if (!expanded) {
    return (
      <div
        data-testid="context-sidebar-collapsed"
        className="flex w-8 shrink-0 flex-col items-center border-r border-border bg-surface py-2 transition-[width] duration-200 ease-out"
      >
        <Tooltip content="Expand sidebar" shortcut="⌘B">
          <button
            onClick={toggle}
            data-testid="sidebar-expand-btn"
            aria-label="Expand sidebar"
            className="group flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-all hover:bg-hover hover:text-primary"
          >
            <ChevronsRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <>
      <aside
        data-testid="context-sidebar"
        style={{ width }}
        className={cn(
          'relative flex shrink-0 flex-col overflow-hidden border-r border-border bg-surface',
          !isResizing && 'transition-[width] duration-200 ease-out',
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {tab === 'collection' && <CollectionsPanel />}
          {tab === 'history' && <HistoryPanel />}
          {tab === 'variables' && <VariablesPanel />}
          {tab === 'mcp' && <MCPPanel />}
          {tab === 'mock' && <MockPanel />}
          {tab === 'testing' && <TestingPanel />}
          {tab === 'dashboard' && <DashboardPanel />}
          {tab === 'aiAssisted' && <AiAssistedPanel />}
        </div>
      </aside>
      <ResizeHandle
        direction="horizontal"
        onResize={nudge}
        testId="left-sidebar-resize"
      />
    </>
  );
};
