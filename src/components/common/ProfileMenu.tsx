import { ProfileDropdown } from '@probestack/probestack-ui-library';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Settings, HelpCircle, Cog } from 'lucide-react';
import { useAuth } from '@/stores/auth.store';
import { userMgmtService } from '@/services/userMgmt.service';
import { useSettings } from '@/stores/settings.store';

export const ProfileMenu = () => {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const accessToken = useAuth((s) => s.accessToken);
  const clear = useAuth((s) => s.clear);
  const accountType = useAuth((s) => s.accountType);
  const isEnterprise = accountType === 'ENTERPRISE';

  // Theme from global store
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || user.email
    : 'Guest';

  const initials = (() => {
    if (!user) return 'U';
    const fn = (user.firstName ?? '').trim();
    const ln = (user.lastName ?? '').trim();
    if (fn || ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || 'U';
    if (user.username) return user.username.slice(0, 2).toUpperCase();
    return (user.email[0] ?? 'U').toUpperCase();
  })();

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

  // ─── Items (only custom items, exclude Profile and Sign Out) ──────
  const items = [
    {
      // Moved here from the header's standalone gear icon button — same
      // destination (/projects/settings), just consolidated into the
      // dropdown so the right slot only carries the bell + this dropdown.
      label: 'Settings',
      onClick: () => navigate('/projects/settings'),
      icon: <Settings size={16} />,
    },
    {
      label: isEnterprise ? 'Enterprise' : 'Manage Project',
      onClick: () => navigate(isEnterprise ? '/onboarding/bu' : '/projects/manage'),
      icon: <Cog size={16} />,
    },
    {
      label: 'Help & Support',
      onClick: () => navigate('/projects/support'),
      icon: <HelpCircle size={16} />,
    },
  ];

  // ─── User for dropdown ─────────────────────────────────────────────
  const dropdownUser = {
    name: displayName,
    email: user?.email || '',
    accountType: (isEnterprise ? 'enterprise' : 'starter') as 'enterprise' | 'starter',
  };

  // ─── Custom trigger ────────────────────────────────────────────────
  const trigger = (
    <button className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-surface hover:bg-hover transition-colors cursor-pointer relative max-w-[180px]">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-text-inverse">
        {initials}
      </span>
      <div className="text-left leading-tight min-w-0">
        <div className="text-xs font-medium text-text-primary truncate">{displayName}</div>
        <div className="text-[10px] text-text-muted truncate">{user?.email}</div>
      </div>
      {isEnterprise && (
        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/20 text-[6px] font-bold text-primary ring-2 ring-surface">
          E
        </span>
      )}
    </button>
  );

  return (
    <div className="flex items-center gap-2 probestack-ui-library">
      <ProfileDropdown
      items={items}
      user={dropdownUser}
      trigger={trigger}
      theme={theme}
      onThemeChange={setTheme}
      onSignOut={onSignOut}
      onProfileClick={() => navigate('/projects/profile')}
    />
    </div>
  );
};