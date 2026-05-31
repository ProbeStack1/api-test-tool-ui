/**
 * ProjectStandaloneLayout — minimal chrome for the /project create/manage page.
 * Shows only: logo, theme toggle, settings, profile. No collections sidebar,
 * no primary-tab rail, no right panel. The feature page itself renders its
 * own left tab rail + main content.
 */
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, LogOut, User } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { StatusBar } from '@/components/common/StatusBar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSep } from '@/components/ui/DropdownMenu';

export const ProjectStandaloneLayout = () => {
  const nav = useNavigate();
  return (
    <div data-testid="project-standalone-layout" className="flex h-screen flex-col bg-probestack-bg text-text-primary">
      <header className="flex h-17 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        <Link
              to="/"
              data-testid="app-header-logo"
              className="flex items-center gap-1"
            >
              <Logo variant="mark" className="h-12 w-10" />
              <div className="text-left">
                <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
                  ProbeStack
                </div>
                <div className="font-bold  text-2xl tracking-normal leading-tight gradient-text">
                  ForgeFuzz
                </div>
              </div>
            </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => nav('/projects/settings')}
            data-testid="project-settings-btn"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
          <Dropdown
            align="end"
            trigger={
              <button
                data-testid="project-profile-btn"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#1fbf9a] text-[11px] font-bold text-white"
                aria-label="Profile"
              >
                <User className="h-4 w-4" />
              </button>
            }
          >
            <DropdownLabel>My account</DropdownLabel>
            <DropdownItem icon={User} onClick={() => nav('/projects/profile')}>Profile</DropdownItem>
            <DropdownSep />
            <DropdownItem icon={LogOut} destructive onClick={() => nav('/login')}>Logout</DropdownItem>
          </Dropdown>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <StatusBar />
    </div>
  );
};
