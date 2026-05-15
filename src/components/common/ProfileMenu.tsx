/**
 * Profile dropdown — avatar trigger with user actions.
 * What : Header profile menu (profile, preferences, sign out).
 * Why  : Keeps header lean; expandable without bloating Header.tsx.
 * Usage: <ProfileMenu /> inside Header right-cluster.
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { User, LogOut, UserCog, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

const menuItem =
  'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:bg-hover focus:bg-hover';

export const ProfileMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="profile-menu-trigger"
          aria-label="Profile menu"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted text-primary transition-colors hover:bg-primary/25"
        >
          <User className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className={cn(
          'z-50 min-w-[220px] rounded-lg border border-border bg-elevated p-1 shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
        )}
      >
        <DropdownMenuLabel className="px-3 pb-1 pt-2 text-xs text-text-secondary">
          Signed in as <span className="text-text-primary">you@forgefuzz.dev</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 h-px bg-border" />
        <DropdownMenuItem asChild>
          <Link to="/projects/profile" className={menuItem} data-testid="profile-menu-profile">
            <User className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/projects/settings" className={menuItem} data-testid="profile-menu-settings">
            <UserCog className="h-4 w-4" /> Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/projects/support" className={menuItem} data-testid="profile-menu-help">
            <HelpCircle className="h-4 w-4" /> Help & docs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 h-px bg-border" />
        <DropdownMenuItem
          className={cn(menuItem, 'text-danger hover:bg-danger-muted')}
          data-testid="profile-menu-signout"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
