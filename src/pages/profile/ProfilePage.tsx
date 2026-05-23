/**
 * Profile page — premium presentation backed by the live auth session.
 *
 * Hydrates the form from `useAuth.user` (the `UserView` returned by
 * `forgeq-test-user-mgmt-svc` after login). Email is treated as the
 * source-of-truth identifier and is rendered read-only — a future
 * "change email" flow will need a verification round-trip, so we don't
 * pretend the inline input can save it. Optional profile-only fields
 * (title, company, location, timezone, bio) live in localStorage until
 * the user-mgmt service exposes a real PATCH /me endpoint.
 *
 * Password change IS wired to `userMgmtService.changePassword` so the
 * security tab works end-to-end against the deployed service.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Bell, Camera, CircleUser, Globe, KeyRound, Mail, MapPin, Save,
  ShieldCheck, User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useAuth } from '@/stores/auth.store';
import { userMgmtService } from '@/services/userMgmt.service';
import { notificationsApi, type NotificationPreferences } from '@/services/notifications.service';

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
  } catch { return DEFAULT_EXTRAS; }
};

const fullNameOf = (u: { firstName?: string; lastName?: string; username: string; email: string } | null): string => {
  if (!u) return '';
  const fn = (u.firstName ?? '').trim();
  const ln = (u.lastName ?? '').trim();
  if (fn || ln) return `${fn} ${ln}`.trim();
  if (u.username) return u.username;
  return u.email.split('@')[0] ?? '';
};

export const ProfilePage = () => {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  const fullName = useMemo(() => fullNameOf(user), [user]);

  const [extras, setExtras] = useState<ProfileExtras>(() =>
    user?.userId ? loadExtras(user.userId) : DEFAULT_EXTRAS,
  );

  // Re-hydrate extras whenever the logged-in user changes (login / switch account).
  useEffect(() => {
    if (user?.userId) setExtras(loadExtras(user.userId));
  }, [user?.userId]);

  if (!user) {
    return (
      <div className="grid h-full place-items-center bg-probestack-bg p-10" data-testid="profile-page-unauth">
        <div className="text-center">
          <CircleUser className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <h2 className="text-base font-semibold">You're signed out</h2>
          <p className="mt-1 text-xs text-text-muted">Sign in to view and edit your profile.</p>
        </div>
      </div>
    );
  }

  const profile = {
    fullName,
    email: user.email,
    ...extras,
  };

  const onSave = () => {
    try {
      localStorage.setItem(EXTRAS_KEY(user.userId), JSON.stringify(extras));
      toast.success('Profile updated', { description: 'Your changes have been saved.' });
    } catch {
      toast.error('Could not save profile', { description: 'Local storage is unavailable.' });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-probestack-bg" data-testid="profile-page">
      <header className="flex items-center gap-3 border-b border-border bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent px-6 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <CircleUser className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Your profile</h1>
          <p className="text-xs text-text-muted">Manage your account, security &amp; notification preferences.</p>
        </div>
      </header>

      {/* Hero card */}
      <div className="border-b border-border bg-surface/30 px-6 py-6">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-5">
          <button
            type="button"
            data-testid="profile-avatar-upload"
            className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-purple-500 text-2xl font-bold text-white shadow-lg ring-2 ring-primary/30"
          >
            {profile.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-tight" data-testid="profile-hero-name">{profile.fullName}</h2>
            <p className="text-xs text-text-muted">
              {profile.title || user.roles?.[0] || 'Member'}
              {profile.company && <> · {profile.company}</>}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
              <span className="inline-flex items-center gap-1" data-testid="profile-hero-email"><Mail className="h-3 w-3" /> {profile.email}</span>
              {profile.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>}
              <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {profile.timezone}</span>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-success" data-testid="profile-hero-verified">verified</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-warning" data-testid="profile-hero-unverified">unverified</span>
              )}
              {user.roles?.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">{r}</span>
              ))}
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Stat label="Workspaces" value="3" />
            <Stat label="Collections" value="42" />
            <Stat label="Monitors" value="9" />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface/40 px-4">
        <Tab active={tab === 'profile'}       onClick={() => setTab('profile')}       icon={UserIcon}       label="Profile"       testId="profile-tab-profile" />
        <Tab active={tab === 'security'}      onClick={() => setTab('security')}      icon={ShieldCheck}    label="Security"      testId="profile-tab-security" />
        <Tab active={tab === 'notifications'} onClick={() => setTab('notifications')} icon={Bell}           label="Notifications" testId="profile-tab-notifications" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl p-6">
          {tab === 'profile'       && <ProfileTab profile={profile} extras={extras} setExtras={setExtras} onSave={onSave} />}
          {tab === 'security'      && <SecurityTab />}
          {tab === 'notifications' && <NotificationsTab onSave={onSave} />}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
    <div className="text-base font-semibold tabular-nums">{value}</div>
    <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
  </div>
);

const Tab = ({ active, onClick, icon: Icon, label, testId }: any) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={cn(
      'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
      active ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary',
    )}
  >
    <Icon className="h-3.5 w-3.5" /> {label}
  </button>
);

const ProfileTab = ({ profile, extras, setExtras, onSave }: any) => (
  <div className="space-y-5" data-testid="profile-tab-profile-pane">
    <Section title="Personal information" subtitle="Synced from your ForgeFuzz account. Email and name come from the user-mgmt service.">
      <Grid>
        <Field label="Full name"><Input value={profile.fullName} readOnly testId="profile-fullName" /></Field>
        <Field label="Email"><Input type="email" value={profile.email} readOnly testId="profile-email" /></Field>
        <Field label="Job title"><Input value={extras.title} onChange={(v: string) => setExtras({ ...extras, title: v })} testId="profile-title" /></Field>
        <Field label="Company"><Input value={extras.company} onChange={(v: string) => setExtras({ ...extras, company: v })} testId="profile-company" /></Field>
        <Field label="Location"><Input value={extras.location} onChange={(v: string) => setExtras({ ...extras, location: v })} testId="profile-location" /></Field>
        <Field label="Timezone"><Input value={extras.timezone} onChange={(v: string) => setExtras({ ...extras, timezone: v })} testId="profile-timezone" /></Field>
      </Grid>
    </Section>

    <Section title="About" subtitle="A short bio shown on team pages.">
      <textarea
        data-testid="profile-bio"
        value={extras.bio}
        onChange={(e) => setExtras({ ...extras, bio: e.target.value })}
        rows={4}
        className="w-full resize-none rounded-md border border-border bg-probestack-bg p-2 text-xs outline-none focus:border-primary"
      />
    </Section>

    <SaveBar onSave={onSave} />
  </div>
);

const SecurityTab = () => {
  const accessToken = useAuth((s) => s.accessToken);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!accessToken) { toast.error('You must be signed in.'); return; }
    if (!current || !next) { toast.error('Fill current and new password.'); return; }
    if (next.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { toast.error('New passwords do not match.'); return; }
    setBusy(true);
    try {
      await userMgmtService.changePassword(current, next, accessToken);
      toast.success('Password changed', { description: 'Sign in again on other devices.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e: any) {
      toast.error('Could not change password', { description: e?.message ?? 'Unexpected error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="profile-tab-security-pane">
      <Section title="Password" subtitle="Pick a strong, unique password (min 8 characters).">
        <Grid>
          <Field label="Current password"><Input type="password" value={current} onChange={setCurrent} testId="profile-currentPassword" /></Field>
          <Field label="New password"><Input type="password" value={next} onChange={setNext} testId="profile-newPassword" /></Field>
          <Field label="Confirm new password"><Input type="password" value={confirm} onChange={setConfirm} testId="profile-confirmPassword" /></Field>
        </Grid>
      </Section>

      <Section title="Two-factor authentication" subtitle="Add an extra layer to keep your account safe.">
        <div className="flex items-center justify-between rounded-md border border-border bg-elevated px-4 py-3">
          <div className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-medium">Authenticator app</div>
              <div className="text-[11px] text-text-muted">Use Google Authenticator, 1Password or any TOTP app.</div>
            </div>
          </div>
          <button type="button" data-testid="profile-2fa-enable" className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20" disabled>Coming soon</button>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-2">
        <button type="button" data-testid="profile-cancel" onClick={() => { setCurrent(''); setNext(''); setConfirm(''); }} className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-elevated">Cancel</button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          data-testid="profile-change-password"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-md hover:shadow-primary/30 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {busy ? 'Updating…' : 'Change password'}
        </button>
      </div>
    </div>
  );
};

const NotificationsTab = ({ onSave: _onSave }: any) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    let cancelled = false;
    notificationsApi.prefs()
      .then((p) => { if (!cancelled && p) setPrefs(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || !prefs) {
    return <div className="grid place-items-center py-8 text-xs text-text-muted">Loading preferences…</div>;
  }

  const setFlag = (key: keyof NotificationPreferences) => (v: boolean) =>
    setPrefs({ ...prefs, [key]: v } as NotificationPreferences);
  const setInApp = (type: string) => (v: boolean) =>
    setPrefs({ ...prefs, inApp: { ...prefs.inApp, [type]: v } });
  const setEmail = (type: string) => (v: boolean) =>
    setPrefs({ ...prefs, emailChannel: { ...prefs.emailChannel, [type]: v } });

  const inAppOn  = (type: string) => prefs.inApp?.[type] !== false;          // default ON
  const emailOn  = (type: string) => prefs.emailChannel?.[type] === true;    // default OFF

  // Events that always have BOTH toggles available to the user.
  const events: { type: string; label: string; sub: string }[] = [
    { type: 'INVITE_RECEIVED', label: 'Invitations received',  sub: 'Someone invited you to a workspace.' },
    { type: 'INVITE_ACCEPTED', label: 'Invitations accepted',  sub: 'A user accepted an invitation you sent.' },
    { type: 'INVITE_REJECTED', label: 'Invitations declined',  sub: 'A user declined an invitation you sent.' },
    { type: 'ROLE_CHANGED',    label: 'Role changes',          sub: 'Your role in a workspace was updated.' },
    { type: 'MEMBER_REMOVED',  label: 'Removed from workspace', sub: 'You were removed from a workspace.' },
    { type: 'TEST_FAILED',     label: 'Test failures',         sub: 'A functional or load run finished as FAILED.' },
    { type: 'MONITOR_ALERT',   label: 'Monitor alerts',        sub: 'A monitor went DOWN or recovered.' },
  ];

  const save = async () => {
    setBusy(true);
    try {
      const updated = await notificationsApi.savePrefs(prefs);
      if (updated) setPrefs(updated);
      toast.success('Preferences saved');
    } catch (e: any) {
      toast.error('Could not save preferences', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5" data-testid="profile-tab-notifications-pane">
      <Section title="Global toggles" subtitle="Master switches applied across all event types.">
        <ul className="divide-y divide-border rounded-md border border-border bg-elevated">
          <Row label="Brand newsletter"
               sub="Occasional product news, hand-curated. Off by default."
               checked={prefs.brandNewsletter}
               onChange={setFlag('brandNewsletter')}
               testId="profile-pref-brandNewsletter" />
          <Row label="Product updates"
               sub="Release notes & changelog highlights."
               checked={prefs.productUpdates}
               onChange={setFlag('productUpdates')}
               testId="profile-pref-productUpdates" />
          <Row label="Email on every login"
               sub="Off by default — we already keep an audit log."
               checked={prefs.loginEmailAlert}
               onChange={setFlag('loginEmailAlert')}
               testId="profile-pref-loginEmail" />
          <Row label="In-app notification on every login"
               sub="On by default — single bell entry per device + browser."
               checked={prefs.loginInAppAlert}
               onChange={setFlag('loginInAppAlert')}
               testId="profile-pref-loginInApp" />
        </ul>
      </Section>

      <Section title="Event preferences" subtitle="Choose which events reach your bell and which also go to email.">
        <ul className="divide-y divide-border rounded-md border border-border bg-elevated">
          <li className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-1.5 text-[10px] uppercase tracking-wider text-text-muted">
            <span>Event</span>
            <span className="w-14 text-center">Bell</span>
            <span className="w-14 text-center">Email</span>
          </li>
          {events.map((e) => (
            <li key={e.type} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">{e.label}</div>
                <div className="text-[11px] text-text-muted">{e.sub}</div>
              </div>
              <div className="flex w-14 justify-center">
                <Toggle checked={inAppOn(e.type)} onChange={setInApp(e.type)} testId={`profile-pref-inApp-${e.type}`} />
              </div>
              <div className="flex w-14 justify-center">
                <Toggle checked={emailOn(e.type)} onChange={setEmail(e.type)} testId={`profile-pref-email-${e.type}`} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-[11px] text-text-muted">
          Security-critical events (password / email change, account lock) ignore these toggles and are always delivered.
        </p>
      </Section>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          data-testid="profile-pref-save"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
};

const Row = ({ label, sub, checked, onChange, testId }:
  { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) => (
  <li className="flex items-center justify-between gap-4 px-4 py-2.5">
    <div className="min-w-0">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-[11px] text-text-muted">{sub}</div>
    </div>
    <Toggle checked={checked} onChange={onChange} testId={testId} />
  </li>
);

const Toggle = ({ checked, onChange, testId }: { checked: boolean; onChange: (v: boolean) => void; testId: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    data-testid={testId}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
      checked ? 'bg-primary' : 'bg-elevated border border-border',
    )}
  >
    <span className={cn(
      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
      checked ? 'left-[18px]' : 'left-0.5',
    )} />
  </button>
);

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="rounded-lg border border-border bg-surface p-5">
    <header className="mb-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="text-[11px] text-text-muted">{subtitle}</p>}
    </header>
    {children}
  </section>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
    {children}
  </label>
);

const Input = ({ type = 'text', value, onChange, testId, readOnly }: { type?: string; value?: string; onChange?: (v: string) => void; testId?: string; readOnly?: boolean }) => (
  <input
    type={type}
    value={value ?? ''}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    data-testid={testId}
    readOnly={readOnly}
    className={cn(
      'h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary',
      readOnly && 'cursor-not-allowed text-text-muted',
    )}
  />
);

const SaveBar = ({ onSave }: { onSave: () => void }) => (
  <div className="flex items-center justify-end gap-2">
    <button type="button" data-testid="profile-cancel" className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-elevated">Cancel</button>
    <button
      type="button"
      onClick={onSave}
      data-testid="profile-save"
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-md hover:shadow-primary/30"
    >
      <Save className="h-3.5 w-3.5" /> Save changes
    </button>
  </div>
);
