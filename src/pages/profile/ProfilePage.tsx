/**
 * Profile page — uses the generic `ProfilePage` from the UI library.
 * 
 * Verified badge is automatically injected by the library in the
 * "Personal information" section title based on user.emailVerified.
 * Security tab shows sign-in methods, API token, and active sessions
 * with real device info + green status indicator on the right.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { CircleUser, Lock, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { userMgmtService } from '@/services/userMgmt.service';
import { useSettings } from '@/stores/settings.store';
import {
  auth,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from '@/lib/firebase';

import { ProfilePage as LibraryProfilePage } from '@probestack/probestack-ui-library';
import type { ProfilePageConfig } from '@probestack/probestack-ui-library';
import '@probestack/probestack-ui-library/style.css';

// ─── Types & helpers ──────────────────────────────────────────────

interface ProfileExtras {
  title: string;
  company: string;
  location: string;
  timezone: string;
  bio: string;
}

const DEFAULT_EXTRAS: ProfileExtras = {
  title: '',
  company: '',
  location: '',
  timezone: 'Asia/Kolkata',
  bio: '',
};

const EXTRAS_KEY = (userId: string) => `forgeq.profile.extras.${userId}`;

const loadExtras = (userId: string): ProfileExtras => {
  try {
    const raw = localStorage.getItem(EXTRAS_KEY(userId));
    if (!raw) return DEFAULT_EXTRAS;
    return { ...DEFAULT_EXTRAS, ...(JSON.parse(raw) as Partial<ProfileExtras>) };
  } catch {
    return DEFAULT_EXTRAS;
  }
};

// ─── Change password / change email ────────────────────────────
//
// Both endpoints accept `currentPassword` but the backend (Firebase Admin
// SDK) can't actually verify it server-side — the comment in
// AuthService.changePassword/requestEmailChange says so explicitly: "the
// client must re-authenticate before calling this endpoint." Without that
// re-auth step, `currentPassword` would be pure decoration — anyone with a
// valid session token could change the password/email without knowing the
// current one. So both cards call Firebase's reauthenticateWithCredential
// FIRST (throws on a wrong password) and only call our backend on success.

const inputCls =
  'h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary';

const ChangePasswordCard = ({ email }: { email: string }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const accessToken = useAuth((s) => s.accessToken);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!accessToken || !auth.currentUser) {
      toast.error('You must be signed in.');
      return;
    }
    setBusy(true);
    try {
      await reauthenticateWithCredential(
        auth.currentUser,
        EmailAuthProvider.credential(email, currentPassword),
      );
      await userMgmtService.changePassword(currentPassword, newPassword, accessToken);
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      const msg = e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
        ? 'Current password is incorrect'
        : e?.message ?? 'Could not change password';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2" data-testid="profile-change-password-form">
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Lock className="h-3.5 w-3.5" /> Change password
      </span>
      <input type="password" placeholder="Current password" value={currentPassword}
             onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password"
             maxLength={128} data-testid="profile-current-password" className={inputCls} />
      <input type="password" placeholder="New password" value={newPassword}
             onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password"
             maxLength={128} data-testid="profile-new-password" className={inputCls} />
      <input type="password" placeholder="Confirm new password" value={confirmPassword}
             onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password"
             maxLength={128} data-testid="profile-confirm-password" className={inputCls} />
      <button type="submit" disabled={busy} data-testid="profile-change-password-submit"
              className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
        Update password
      </button>
    </form>
  );
};

const ChangeEmailCard = ({ email }: { email: string }) => {
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const accessToken = useAuth((s) => s.accessToken);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail.trim().toLowerCase() === email.toLowerCase()) {
      toast.error('Enter a different email address');
      return;
    }
    if (!accessToken || !auth.currentUser) {
      toast.error('You must be signed in.');
      return;
    }
    setBusy(true);
    try {
      await reauthenticateWithCredential(
        auth.currentUser,
        EmailAuthProvider.credential(email, currentPassword),
      );
      await userMgmtService.changeEmail(newEmail.trim(), currentPassword, accessToken);
      toast.success('Check your new email to confirm the change');
      setNewEmail('');
      setCurrentPassword('');
    } catch (e: any) {
      const msg = e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
        ? 'Current password is incorrect'
        : e?.message ?? 'Could not start email change';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2" data-testid="profile-change-email-form">
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Mail className="h-3.5 w-3.5" /> Change email
      </span>
      <input type="email" placeholder="New email address" value={newEmail}
             onChange={(e) => setNewEmail(e.target.value)} required autoComplete="email"
             maxLength={254} data-testid="profile-new-email" className={inputCls} />
      <input type="password" placeholder="Current password" value={currentPassword}
             onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password"
             maxLength={128} data-testid="profile-email-current-password" className={inputCls} />
      <button type="submit" disabled={busy} data-testid="profile-change-email-submit"
              className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
        Send confirmation
      </button>
    </form>
  );
};

// ─── Main Component ──────────────────────────────────────────────

export const ProfilePage = () => {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const theme = useSettings((s) => s.theme);

  const [extras, setExtras] = useState<ProfileExtras>(() =>
    user?.userId ? loadExtras(user.userId) : DEFAULT_EXTRAS
  );

  useEffect(() => {
    if (user?.userId) setExtras(loadExtras(user.userId));
  }, [user?.userId]);

  if (!user) {
    return (
      <div className="grid h-full place-items-center bg-probestack-bg p-10">
        <div className="text-center">
          <CircleUser className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <h2 className="text-base font-semibold">You're signed out</h2>
          <p className="mt-1 text-xs text-text-muted">Sign in to view and edit your profile.</p>
        </div>
      </div>
    );
  }

  // ─── Handle profile save ───────────────────────────────────────

  const handleProfileChange = (updatedUser: any) => {
    if (!user?.userId) return;
    const newExtras: ProfileExtras = {
      title: updatedUser.jobTitle || '',
      company: updatedUser.company || '',
      location: updatedUser.location || '',
      timezone: updatedUser.timezone || 'Asia/Kolkata',
      bio: updatedUser.bio || '',
    };
    try {
      localStorage.setItem(EXTRAS_KEY(user.userId), JSON.stringify(newExtras));
      setExtras(newExtras);
      toast.success('Profile updated');
    } catch {
      toast.error('Could not save profile');
    }
  };

  // ─── Get current device info for security session ─────────────

  const getCurrentDevice = () => {
    const ua = navigator.userAgent;
    let device = 'Unknown Device';
    let browser = 'Unknown Browser';

    // Device detection
    if (/iPhone|iPad|iPod/.test(ua)) device = 'iPhone';
    else if (/Macintosh|Mac OS X/.test(ua)) device = 'Mac';
    else if (/Windows NT/.test(ua)) device = 'Windows PC';
    else if (/Android/.test(ua)) device = 'Android';
    else if (/Linux/.test(ua) && !/Android/.test(ua)) device = 'Linux';

    // Browser detection (Edge first)
    if (/Edg/.test(ua)) browser = 'Edge';
    else if (/OPR|Opera/.test(ua)) browser = 'Opera';
    else if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

    return `${device} — ${browser}`;
  };

  // ─── Send verification email ───────────────────────────────────

  const handleSendVerification = async () => {
    // BUG FIX: this was passing the JWT access token as the `email` field
    // (resendVerification expects an email address) — the request would
    // fail @Email validation server-side, so "Resend verification" from
    // this page silently never worked.
    if (!user?.email) {
      toast.error('You must be signed in.');
      return;
    }
    try {
      await userMgmtService.resendVerification(user.email);
      toast.success('Verification email sent! Check your inbox.');
    } catch (e: any) {
      toast.error('Failed to send verification email', {
        description: e?.message || 'Please try again later.',
      });
    }
  };

  // ─── Build config ──────────────────────────────────────────────

  const config: ProfilePageConfig = {
    tabs: {
      profile: {
        sections: {
          personal: {
            description: 'Synced from your account. Email and username are read-only.',
            fields: {
              firstName: { label: 'First name', value: user.firstName || '', editable: true },
              lastName: { label: 'Last name', value: user.lastName || '', editable: true },
              email: { label: 'Email', value: user.email || '', editable: false, helper: 'Managed by your identity provider' },
              username: { label: 'Username', value: user.username || '', editable: false, helper: 'Used for API and CLI authentication' },
              jobTitle: { label: 'Job title', value: extras.title || '', editable: true },
              role: { label: 'Role', value: user.roles?.[0] || 'Member', editable: false },
              company: { label: 'Company', value: extras.company || '', editable: true },
              location: { label: 'Location', value: extras.location || '', editable: true },
              timezone: { label: 'Timezone', value: extras.timezone || 'Asia/Kolkata', editable: true },
              bio: { label: 'Bio', value: extras.bio || '', editable: true, type: 'textarea' },
              department: { label: 'Department', value: (user as any)?.department || '', editable: true, enabled: false },
              phone: { label: 'Phone', value: (user as any)?.phone || '', editable: true, enabled: false },
            },
          },
        },
      },
      // ── Security: custom render for session  ──
      security: {
        sections: {
          sessions: {
            fields: {
              session: {
                // No label needed – render handles everything
                render: () => {
                  const sessionInfo = getCurrentDevice();
                  return (
                    <div className="flex flex-col w-full gap-1">
                      <span className="text-xs font-medium text-text-muted">Current session</span>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-primary">{sessionInfo}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-success">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                          </span>
                          Active now
                        </span>
                      </div>
                    </div>
                  );
                },
              },
            },
          },
          // Previously there was no way to change your password or email
          // from anywhere in the app — the backend endpoints existed
          // (change-password / change-email + confirm-email-change) but
          // nothing in the UI called them.
          credentials: {
            fields: {
              changePassword: {
                render: () => <ChangePasswordCard email={user.email || ''} />,
              },
              changeEmail: {
                render: () => <ChangeEmailCard email={user.email || ''} />,
              },
            },
          },
        },
      },
      // ── Notifications ──
      notifications: {
        sections: {
          groups: {
            fields: {
              notifications: {
                label: 'Notifications',
                type: 'notificationGroup',
                options: [
                  { id: 'deployments', label: 'Deployments', description: 'Build results, rollbacks' },
                  { id: 'securityAlerts', label: 'Security alerts', description: 'New sign-ins, failed logins' },
                  { id: 'quota', label: 'Quota & usage', description: '80% and 100% thresholds' },
                  { id: 'governance', label: 'Governance & approvals', description: 'Access requests, policy changes' },
                ],
                value: {
                  deployments: { inApp: true, email: false },
                  securityAlerts: { inApp: true, email: false },
                  quota: { inApp: false, email: false },
                  governance: { inApp: true, email: false },
                },
              },
            },
          },
        },
      },
    },
  };

  // ─── Map user to library's expected type ──────────────────────

  const libraryUser = {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    username: user.username || '',
    jobTitle: (user as any).jobTitle || '',
    department: (user as any).department || '',
    phone: (user as any).phone || '',
    accountType: (user.accountType?.toLowerCase() as any) || 'enterprise',
    emailVerified: user.emailVerified || false,
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    // `data-theme` applied explicitly here for the same reason as
    // Header.tsx — the library's dark palette is declared directly on
    // `.probestack-ui-library`, so without this the page always renders
    // dark regardless of the app's actual theme.
    <div data-theme={theme}>
      <LibraryProfilePage
        user={libraryUser}
        config={config}
        onBack={() => navigate('/projects')}
        onChange={handleProfileChange}
        onVerifyEmail={handleSendVerification}
        theme={theme}
      />
    </div>
  );
};