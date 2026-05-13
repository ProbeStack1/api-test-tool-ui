/**
 * StatusBar — bottom bar with TWO discoverability menus:
 *
 *   • Left  : "Home" — landing pages and API networks (Home, Projects,
 *             Public/Private API Network).
 *   • Right : "Tools" — project-scoped power tools (Runners, Monitor,
 *             Audit, Trash, Webhooks, anonymous Public API Hub).
 *
 * The split was an explicit user ask — the two menus serve different
 * mental models (where am I? vs what can I do here?) so cramming them
 * into one dropdown was confusing.
 *
 * Layout toggles (left rail / right rail / sideRailMode) live on the far
 * right and are unchanged.
 */
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon, PanelLeft, PanelRight, LayoutPanelTop, LayoutPanelLeft,
  TestTube2, Activity, Compass, ClipboardList, Trash2, ChevronUp,
  Lock, Globe, FolderKanban, Plug, Wrench, Heart, Mail, Bug,
} from 'lucide-react';
import { useLayout } from '@/stores/layout.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSep } from '@/components/ui/DropdownMenu';
import { AttributionFooter } from './AttributionFooter';
import { cn } from '@/utils/cn';

const Tog = ({
  active, onClick, title, icon: Icon, testId, shortcut,
}: {
  active: boolean; onClick: () => void; title: string;
  icon: typeof PanelLeft; testId: string; shortcut?: string;
}) => (
  <Tooltip content={title} shortcut={shortcut} side="top">
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded transition-colors',
        active ? 'text-primary' : 'text-text-secondary hover:text-text-primary',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  </Tooltip>
);

export const StatusBar = () => {
  const {
    showLeftSidebar, showRightSidebar, sideRailMode,
    toggleLeft, toggleRight, toggleSideRailMode,
  } = useLayout();
  const nav = useNavigate();

  return (
    <footer
      data-testid="status-bar"
      className="flex h-6 items-center justify-between border-t border-border bg-surface px-3 text-[11px] text-text-secondary"
    >
      {/* LEFT — Home menu */}
      <div className="flex items-center gap-3">
        <Dropdown
          align="start"
          side="top"
          testId="home-menu-content"
          trigger={
            <button
              data-testid="status-home-menu"
              className="flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-hover hover:text-primary"
            >
              <HomeIcon className="h-3 w-3" />
              Home
              <ChevronUp className="h-2.5 w-2.5 opacity-60" />
            </button>
          }
        >
          <DropdownLabel>Project home</DropdownLabel>
          <DropdownItem icon={HomeIcon}     onClick={() => nav('/home')}                          testId="home-menu-home">
            Home <span className="ml-auto text-[9px] text-text-muted">/home</span>
          </DropdownItem>
          <DropdownItem icon={FolderKanban} onClick={() => nav('/projects/collections')}          testId="home-menu-projects">
            Projects <span className="ml-auto text-[9px] text-text-muted">/projects</span>
          </DropdownItem>
          <DropdownSep />
          <DropdownLabel>API Catalog</DropdownLabel>
          <DropdownItem icon={Globe} onClick={() => nav('/home/api-catalog/public')}              testId="home-menu-public-network">
            Public API Network <span className="ml-auto text-[9px] text-text-muted">/home/api-catalog/public</span>
          </DropdownItem>
          <DropdownItem icon={Lock}  onClick={() => nav('/home/api-catalog/private')}             testId="home-menu-private-network">
            Private API Network <span className="ml-auto text-[9px] text-text-muted">/home/api-catalog/private</span>
          </DropdownItem>
          <DropdownSep />
          <DropdownItem icon={Compass} onClick={() => window.open('/api-hub', '_blank', 'noopener,noreferrer')} testId="home-menu-public-hub">
            Public API Hub (anonymous) <span className="ml-auto text-[9px] text-text-muted">↗ /api-hub</span>
          </DropdownItem>
        </Dropdown>
        <Dropdown
          align="end"
          side="top"
          testId="tools-menu-content"
          trigger={
            <button
              data-testid="status-tools-menu"
              className="flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-hover hover:text-primary"
            >
              <Wrench className="h-3 w-3" />
              Tools
              <ChevronUp className="h-2.5 w-2.5 opacity-60" />
            </button>
          }
        >
          <DropdownLabel>Project tools</DropdownLabel>
          <DropdownItem icon={TestTube2}     onClick={() => nav('/projects/testing')}      testId="tools-menu-runners">
            Runners <span className="ml-auto text-[9px] text-text-muted">/projects/testing</span>
          </DropdownItem>
          <DropdownItem icon={Activity}      onClick={() => nav('/projects/monitors')}     testId="tools-menu-monitor">
            Monitors <span className="ml-auto text-[9px] text-text-muted">/projects/monitors</span>
          </DropdownItem>
          <DropdownItem icon={Heart}         onClick={() => nav('/projects/heartbeats')}   testId="tools-menu-heartbeats">
            Heartbeats <span className="ml-auto text-[9px] text-text-muted">/projects/heartbeats</span>
          </DropdownItem>
          <DropdownItem icon={Mail}          onClick={() => nav('/projects/digests')}      testId="tools-menu-digests">
            Digest emails <span className="ml-auto text-[9px] text-text-muted">/projects/digests</span>
          </DropdownItem>
          <DropdownItem icon={ClipboardList} onClick={() => nav('/projects/audit')}        testId="tools-menu-audit">
            Audit log <span className="ml-auto text-[9px] text-text-muted">/projects/audit</span>
          </DropdownItem>
          <DropdownItem icon={Bug}           onClick={() => nav('/projects/bug-tracker')} testId="tools-menu-bug-tracker">
            Bug Tracker <span className="ml-auto text-[9px] text-text-muted">/projects/bug-tracker</span>
          </DropdownItem>
          <DropdownItem icon={Trash2}        onClick={() => nav('/projects/trash')}        testId="tools-menu-trash">
            Trash <span className="ml-auto text-[9px] text-text-muted">/projects/trash</span>
          </DropdownItem>
          <DropdownSep />
          <DropdownItem icon={Plug}          onClick={() => nav('/projects/integrations')} testId="tools-menu-webhooks">
            Webhooks &amp; integrations <span className="ml-auto text-[9px] text-text-muted">/projects/integrations</span>
          </DropdownItem>
        </Dropdown>
      </div>

      {/* RIGHT — Tools menu + layout toggles */}
      <div className="flex items-center gap-3">
        <span className="mx-1 h-3 w-px bg-border" />
        <Tog
          active={sideRailMode === 'top'}
          onClick={toggleSideRailMode}
          title={sideRailMode === 'left' ? 'Move navigation to top bar' : 'Move navigation to left rail'}
          icon={sideRailMode === 'left' ? LayoutPanelTop : LayoutPanelLeft}
          testId="toggle-siderail-mode"
        />
        <span className="mx-1 h-3 w-px bg-border" />
        <Tog
          active={showLeftSidebar}
          onClick={toggleLeft}
          title="Toggle left sidebar"
          icon={PanelLeft}
          testId="toggle-left-sidebar"
          shortcut="⌘B"
        />
        <Tog
          active={showRightSidebar}
          onClick={toggleRight}
          title="Toggle right sidebar"
          icon={PanelRight}
          testId="toggle-right-sidebar"
          shortcut="⌘⌥B"
        />
        <span className="mx-1 h-3 w-px bg-border" />
        <AttributionFooter />
      </div>
    </footer>
  );
};
