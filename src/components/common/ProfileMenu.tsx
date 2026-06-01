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
import { User, LogOut, UserCog, HelpCircle, Cog } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useAuth } from '@/stores/auth.store';
import { userMgmtService } from '@/services/userMgmt.service';

const menuItem =
  'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:bg-hover focus:bg-hover';

const initialsOf = (u: { firstName?: string; lastName?: string; username: string; email: string } | null): string => {
  if (!u) return 'U';
  const fn = (u.firstName ?? '').trim();
  const ln = (u.lastName ?? '').trim();
  if (fn || ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || 'U';
  if (u.username) return u.username.slice(0, 2).toUpperCase();
  return (u.email[0] ?? 'U').toUpperCase();
};

export const ProfileMenu = () => {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const accessToken = useAuth((s) => s.accessToken);
  const clear = useAuth((s) => s.clear);

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || user.email
    : 'Guest';
  const initials = initialsOf(user);

  const onSignOut = async () => {
    try {
      if (refreshToken && accessToken) {
        await userMgmtService.logout(refreshToken, accessToken).catch(() => undefined);
      }
    } finally {
      clear();
      toast.success('Signed out');
      navigate('/login', { replace: true });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="profile-menu-trigger"
          aria-label="Profile menu"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
        >
          {user ? initials : <User className="h-4 w-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className={cn(
          'z-50 min-w-[240px] rounded-lg border border-border bg-elevated p-1 shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
        )}
      >
        <DropdownMenuLabel
  className="px-3 pb-1 pt-2 text-xs text-text-secondary"
  data-testid="profile-menu-userblock"
>
  {/* Header row: Signed in as (left) and roles (right) */}
  <div className="flex items-center justify-between">
    <div className="text-[10px] uppercase tracking-wider text-text-muted">
      Signed in as
    </div>
    {user?.roles?.length ? (
      <div className="flex flex-wrap gap-1">
        {user.roles.map((r) => (
          <span
            key={r}
            className="inline-flex items-center rounded bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary"
          >
            {r}
          </span>
        ))}
      </div>
    ) : null}
  </div>

  {/* Name and email remain unchanged */}
  <div
    className="mt-0.5 truncate text-sm font-medium text-text-primary"
    data-testid="profile-menu-name"
  >
    {displayName}
  </div>
  {user?.email && (
    <div
      className="truncate text-[11px] text-text-muted"
      data-testid="profile-menu-email"
    >
      {user.email}
    </div>
  )}
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
          <Link to="/projects/manage" className={menuItem} data-testid="profile-menu-help">
            <Cog className="h-4 w-4" /> Manage Project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/projects/support" className={menuItem} data-testid="profile-menu-help">
            <HelpCircle className="h-4 w-4" /> Help & Support
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 h-px bg-border" />
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); onSignOut(); }}
          className={cn(menuItem, 'text-danger hover:bg-danger-muted')}
          data-testid="profile-menu-signout"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
