/**
 * Profile page — UI-only premium presentation.
 *
 * For now the data is local (read from `auth.store` if available, otherwise
 * sane defaults). All save buttons are wired to a noop with a "saved"
 * toast so the page feels alive — backed by a real profile service in a
 * future iteration.
 */
import { useState } from 'react';
import {
  Bell, Camera, Check, CircleUser, Globe, KeyRound, Mail, MapPin, Save,
  Settings as SettingsIcon, ShieldCheck, Sparkles, User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

export const ProfilePage = () => {
  const [tab, setTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  const [profile, setProfile] = useState({
    fullName: 'Adarsha Forgeq',
    email: 'adarsha@forgeq.dev',
    title: 'Software engineer',
    company: 'ForgeQ',
    location: 'Bengaluru, IN',
    timezone: 'Asia/Kolkata',
    bio: 'Building the future of API testing & observability — one workspace at a time.',
  });

  const onSave = () => toast.success('Profile updated', { description: 'Your changes have been saved.' });

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
            <h2 className="truncate text-xl font-semibold tracking-tight">{profile.fullName}</h2>
            <p className="text-xs text-text-muted">{profile.title} · {profile.company}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {profile.email}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>
              <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {profile.timezone}</span>
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
          {tab === 'profile'       && <ProfileTab profile={profile} setProfile={setProfile} onSave={onSave} />}
          {tab === 'security'      && <SecurityTab onSave={onSave} />}
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

const ProfileTab = ({ profile, setProfile, onSave }: any) => (
  <div className="space-y-5" data-testid="profile-tab-profile-pane">
    <Section title="Personal information" subtitle="How others see you across ForgeQ.">
      <Grid>
        <Field label="Full name"><Input value={profile.fullName} onChange={(v: string) => setProfile({ ...profile, fullName: v })} testId="profile-fullName" /></Field>
        <Field label="Email"><Input type="email" value={profile.email} onChange={(v: string) => setProfile({ ...profile, email: v })} testId="profile-email" /></Field>
        <Field label="Job title"><Input value={profile.title} onChange={(v: string) => setProfile({ ...profile, title: v })} testId="profile-title" /></Field>
        <Field label="Company"><Input value={profile.company} onChange={(v: string) => setProfile({ ...profile, company: v })} testId="profile-company" /></Field>
        <Field label="Location"><Input value={profile.location} onChange={(v: string) => setProfile({ ...profile, location: v })} testId="profile-location" /></Field>
        <Field label="Timezone"><Input value={profile.timezone} onChange={(v: string) => setProfile({ ...profile, timezone: v })} testId="profile-timezone" /></Field>
      </Grid>
    </Section>

    <Section title="About" subtitle="A short bio shown on team pages.">
      <textarea
        data-testid="profile-bio"
        value={profile.bio}
        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        rows={4}
        className="w-full resize-none rounded-md border border-border bg-probestack-bg p-2 text-xs outline-none focus:border-primary"
      />
    </Section>

    <SaveBar onSave={onSave} />
  </div>
);

const SecurityTab = ({ onSave }: any) => (
  <div className="space-y-5" data-testid="profile-tab-security-pane">
    <Section title="Password" subtitle="Pick a strong, unique password.">
      <Grid>
        <Field label="Current password"><Input type="password" testId="profile-currentPassword" /></Field>
        <Field label="New password"><Input type="password" testId="profile-newPassword" /></Field>
        <Field label="Confirm new password"><Input type="password" testId="profile-confirmPassword" /></Field>
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
        <button type="button" data-testid="profile-2fa-enable" className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">Enable</button>
      </div>
    </Section>

    <Section title="Active sessions" subtitle="Sign out of devices you no longer use.">
      <ul className="divide-y divide-border rounded-md border border-border bg-elevated">
        <SessionRow device="MacBook Pro · Chrome" location="Bengaluru, IN" current />
        <SessionRow device="iPhone · Safari" location="Bengaluru, IN" />
      </ul>
    </Section>

    <SaveBar onSave={onSave} />
  </div>
);

const SessionRow = ({ device, location, current }: { device: string; location: string; current?: boolean }) => (
  <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
    <div>
      <div className="font-medium">{device} {current && <span className="ml-1 rounded bg-success/20 px-1 text-[9px] font-semibold uppercase text-success">Current</span>}</div>
      <div className="text-[11px] text-text-muted">{location}</div>
    </div>
    {!current && <button type="button" className="text-[11px] text-danger hover:underline">Sign out</button>}
  </li>
);

const NotificationsTab = ({ onSave }: any) => {
  const [prefs, setPrefs] = useState({
    monitorIncidents: true,
    monitorRecovered: true,
    runFailures: true,
    weeklyDigest: true,
    productNews: false,
  });
  const items: { key: keyof typeof prefs; label: string; sub: string }[] = [
    { key: 'monitorIncidents', label: 'Monitor incidents',  sub: 'When a monitor goes DOWN.' },
    { key: 'monitorRecovered', label: 'Monitor recoveries', sub: 'When a previously down monitor comes back UP.' },
    { key: 'runFailures',      label: 'Run failures',       sub: 'Functional & load test runs that finish with FAILED status.' },
    { key: 'weeklyDigest',     label: 'Weekly digest',      sub: 'Friday recap with usage, top failures, and trends.' },
    { key: 'productNews',      label: 'Product news',       sub: 'Occasional announcements about new ForgeQ features.' },
  ];
  return (
    <div className="space-y-5" data-testid="profile-tab-notifications-pane">
      <Section title="Email preferences" subtitle="Choose which events ForgeQ emails you about.">
        <ul className="divide-y divide-border rounded-md border border-border bg-elevated">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">{it.label}</div>
                <div className="text-[11px] text-text-muted">{it.sub}</div>
              </div>
              <Toggle
                checked={prefs[it.key]}
                onChange={(v) => setPrefs({ ...prefs, [it.key]: v })}
                testId={`profile-pref-${it.key}`}
              />
            </li>
          ))}
        </ul>
      </Section>

      <SaveBar onSave={onSave} />
    </div>
  );
};

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

const Input = ({ type = 'text', value, onChange, testId }: { type?: string; value?: string; onChange?: (v: string) => void; testId?: string }) => (
  <input
    type={type}
    value={value ?? ''}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    data-testid={testId}
    className="h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary"
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
