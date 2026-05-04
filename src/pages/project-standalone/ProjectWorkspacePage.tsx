/**
 * ProjectWorkspacePage — standalone page at /project (and /project/:id).
 *
 * LEFT RAIL tabs:
 *   • Create new project    – appears when no :id yet
 *   • Project details       – org id, project id, email, created_at/by, updated_at, visibility, inline editable
 *   • Add member / Invite   – invite new members by email + role
 *   • Audit trail           – (placeholder, feeds from /api/v1/workspaces/{id}/audit — stub)
 *   • Delete this project   – destructive action with typed-confirmation
 *
 * FLOW:
 *   /project                → Create form. On submit → POST /api/v1/workspaces.
 *   On success → navigate to /project/:id, show Project details tab, and show
 *   a 10-second countdown toast "Go to collections / Stay here". On timeout
 *   (or Go-to-collections click) → redirect to /projects/collections.
 *
 *   Inline-editable details track `dirty` state — a sticky "Save details" CTA
 *   appears on the details tab while dirty; Cancel reverts to server state.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FolderPlus, Settings, UserPlus, History, Trash2, Check, X,
  Loader2, Mail, Crown, Globe, Lock, Building2, Clock,
  ArrowLeft, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Fieldset } from '@/components/ui/Fieldset';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace,
  invite, listInvitations, listMembers, removeMember, resendInvitation,
  revokeInvitation, trackLinkCopied, transferOwnership, updateMemberRole,
  suggestSlug,
  type Workspace, type Visibility, type MemberRole,
} from '@/services/workspace.service';
import { useWorkspaceStore } from '@/stores/workspace.store';

type Tab = 'create' | 'details' | 'members' | 'audit' | 'delete';

export const ProjectWorkspacePage = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const [tab, setTab] = useState<Tab>(id ? 'details' : 'create');

  useEffect(() => { setTab(id ? 'details' : 'create'); }, [id]);

  const { data: ws } = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => getWorkspace(id!),
    enabled: !!id,
  });

  const tabs: Array<{ key: Tab; label: string; icon: React.ComponentType<any>; enabled: boolean; destructive?: boolean }> = [
    { key: 'create',  label: 'Create new project', icon: FolderPlus, enabled: true },
    { key: 'details', label: 'Project details',    icon: Settings,   enabled: !!id },
    { key: 'members', label: 'Add member / Invite', icon: UserPlus,  enabled: !!id },
    { key: 'audit',   label: 'Audit trail',        icon: History,    enabled: !!id },
    { key: 'delete',  label: 'Delete this project', icon: Trash2,    enabled: !!id, destructive: true },
  ];

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Project</div>
            <div className="truncate text-sm font-semibold">
              {ws?.name ?? (id ? 'Loading…' : 'New project')}
            </div>
          </div>
          <button
            data-testid="proj-back-main"
            onClick={() => nav('/projects/manage')}
            title="Back to project management"
            aria-label="Back to project management"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {tabs.map(({ key, label, icon: Icon, enabled, destructive }) => (
              <li key={key}>
                <button
                  disabled={!enabled}
                  onClick={() => setTab(key)}
                  data-testid={`proj-tab-${key}`}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                    tab === key && !destructive && 'bg-primary-muted text-primary',
                    tab === key && destructive && 'bg-red-500/10 text-red-500',
                    tab !== key && destructive && 'text-text-secondary hover:bg-red-500/5 hover:text-red-500',
                    tab !== key && !destructive && 'text-text-secondary hover:bg-hover hover:text-text-primary',
                    !enabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {id && ws && (
          <div className="border-t border-border p-3 text-[11px] text-text-muted">
            <div className="truncate">ID: <span className="font-mono text-text-primary">{ws.id.slice(0, 8)}…</span></div>
            <div>Members: <span className="text-text-primary">{ws.memberCount}</span></div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1 overflow-auto">
        {tab === 'create' && (
          <CreateProjectTab
            onCreated={async (newWs) => {
              setCurrent(newWs);
              await qc.invalidateQueries({ queryKey: ['workspaces'] });
              // After create → go to Project Management page with the new
              // workspace auto-selected. User can iterate details there.
              nav('/projects/manage', { replace: true });
              showPostCreateToast(newWs, nav);
            }}
          />
        )}
        {tab === 'details' && ws && <DetailsTab ws={ws} />}
        {tab === 'members' && ws && <MembersInviteTab ws={ws} />}
        {tab === 'audit' && ws && <AuditStubTab ws={ws} />}
        {tab === 'delete' && ws && <DeleteTab ws={ws} onDeleted={() => nav('/projects/manage')} />}
      </div>
    </div>
  );
};

/* ─── Create form ─────────────────────────────────────────────────── */
const CreateProjectTab = ({ onCreated }: { onCreated: (ws: Workspace) => void }) => {
  // Pre-fill orgId from an imaginary auth context — for now the BFF uses `default-org`.
  const PREFILL_ORG = 'default-org';
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');
  const [projectLead, setProjectLead] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('TEAM');
  const [suggesting, setSuggesting] = useState(false);

  const create = useMutation({
    mutationFn: () => createWorkspace({
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      workspaceEmail: workspaceEmail.trim() || undefined,
      projectLead: projectLead.trim() || undefined,
      visibility,
    } as any),
    onSuccess: (ws) => { toast.success('Project created'); onCreated(ws); },
    onError: (e: any) => toast.error(e.message || 'Failed to create'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-8 py-8" data-testid="proj-create-form">
      <header className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
          <FolderPlus className="h-7 w-7 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Create a new project</h1>
          <p className="mt-1 text-xs text-text-secondary">
            A project (workspace) groups your collections, environments, mocks and team members.
          </p>
        </div>
      </header>

      <Fieldset label="Project name" testId="proj-fs-name">
        <Inp testId="proj-name" value={name} onChange={setName} placeholder="e.g. Payments API QA" />
      </Fieldset>

      <Fieldset label="Slug" testId="proj-fs-slug">
        <div className="flex items-center gap-2">
          <Inp
            testId="proj-slug"
            value={slug}
            onChange={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="auto-generated from name"
          />
          <Button
            variant="outline"
            disabled={!name.trim() || suggesting}
            data-testid="proj-slug-suggest"
            onClick={async () => {
              setSuggesting(true);
              try {
                const r = await suggestSlug(name.trim());
                setSlug(r.slug);
              } catch (e: any) {
                toast.error(e.message || 'Could not suggest slug');
              } finally {
                setSuggesting(false);
              }
            }}
          >
            {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Suggest
          </Button>
        </div>
      </Fieldset>

      <Fieldset label="Description" testId="proj-fs-desc">
        <textarea
          data-testid="proj-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this project about?"
          rows={2}
          className="w-full resize-none rounded-md border border-border bg-probestack-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:border-primary/40 focus:border-primary"
        />
      </Fieldset>

      <Fieldset label="Email" testId="proj-fs-email">
        <Inp testId="proj-email" value={workspaceEmail} onChange={setWorkspaceEmail} placeholder="team@company.com" type="email" />
      </Fieldset>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Fieldset label="Organization ID" testId="proj-fs-org">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-text-muted" />
            <span className="truncate font-mono text-text-primary">{PREFILL_ORG}</span>
          </div>
        </Fieldset>
        <Fieldset label="Project SME" testId="proj-fs-lead">
          <Inp testId="proj-lead" value={projectLead} onChange={setProjectLead} placeholder="sme@company.com" />
        </Fieldset>
      </div>

      <Fieldset label="Visibility" testId="proj-fs-vis">
        <div className="flex flex-wrap gap-2">
          {(['PRIVATE', 'TEAM', 'PUBLIC'] as Visibility[]).map((v) => (
            <button
              key={v}
              data-testid={`proj-vis-${v.toLowerCase()}`}
              onClick={() => setVisibility(v)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
                visibility === v
                  ? 'border-primary bg-primary-muted text-primary'
                  : 'border-border text-text-secondary hover:border-primary/40',
              )}
            >
              <VisIcon v={v} /> <span className="capitalize">{v.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </Fieldset>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="primary" data-testid="proj-submit" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
          Create project
        </Button>
      </div>
    </div>
  );
};

/* ─── Details tab with dirty-state detection ──────────────────────── */
const DetailsTab = ({ ws }: { ws: Workspace }) => {
  const qc = useQueryClient();
  const initial = useMemo(() => ({
    name: ws.name,
    description: ws.description ?? '',
    workspaceEmail: ws.workspaceEmail ?? '',
    projectLead: ws.projectLead ?? '',
    visibility: ws.visibility,
  }), [ws.id, ws.updatedAt]); // eslint-disable-line

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  const save = useMutation({
    mutationFn: () => updateWorkspace(ws.id, {
      name: form.name, description: form.description || null as any,
      workspaceEmail: form.workspaceEmail || null as any,
      projectLead: form.projectLead || null as any,
      visibility: form.visibility,
    } as any),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['workspace', ws.id] });
      await qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-8 py-8" data-testid="proj-details">
      {/* Header: large vis icon · title · id · myRole pill · visibility chip */}
      <header className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
          {ws.visibility === 'PUBLIC'
            ? <Globe className="h-7 w-7 text-text-muted" />
            : ws.visibility === 'TEAM'
              ? <Building2 className="h-7 w-7 text-text-muted" />
              : <Lock className="h-7 w-7 text-text-muted" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{ws.name}</h1>
            <span className="ml-1 flex h-6 items-center rounded-full bg-red-500/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
              {ws.myRole || 'OWNER'}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="font-mono text-[11px] text-text-muted">{ws.id}</code>
            <button
              data-testid="detail-copy-id"
              onClick={() => { navigator.clipboard.writeText(ws.id); toast.success('Copied'); }}
              className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary"
              aria-label="Copy project id"
            >
              <Check className="h-0 w-0" />
              <span className="sr-only">Copy</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
          </div>
        </div>
        <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs text-text-secondary">
          {ws.visibility === 'PUBLIC'
            ? <Globe className="h-3.5 w-3.5" />
            : ws.visibility === 'TEAM'
              ? <Building2 className="h-3.5 w-3.5" />
              : <Lock className="h-3.5 w-3.5" />}
          <span className="capitalize">{ws.visibility.toLowerCase()}</span>
        </div>
      </header>

      <Fieldset label="Project name" testId="detail-fs-name">
        <Inp value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} testId="detail-name" placeholder="e.g. Payments API QA" />
      </Fieldset>

      <Fieldset label="Description" testId="detail-fs-desc">
        <textarea
          data-testid="detail-desc"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Add a description"
          rows={2}
          className="w-full resize-none rounded-md border border-border bg-probestack-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:border-primary/40 focus:border-primary"
        />
      </Fieldset>

      <Fieldset label="Email" testId="detail-fs-email">
        <Inp value={form.workspaceEmail} onChange={(v) => setForm((f) => ({ ...f, workspaceEmail: v }))} testId="detail-email" placeholder="team@company.com" type="email" />
      </Fieldset>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Fieldset label="Organization ID" testId="detail-fs-org">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-text-muted" />
            <span className="truncate font-mono text-text-primary">{ws.orgId}</span>
          </div>
        </Fieldset>
        <Fieldset label="Project SME" testId="detail-fs-lead">
          <Inp value={form.projectLead} onChange={(v) => setForm((f) => ({ ...f, projectLead: v }))} testId="detail-lead" placeholder="sme@company.com" />
        </Fieldset>
      </div>

      <Fieldset label="Visibility" testId="detail-fs-vis">
        <div className="flex flex-wrap gap-2">
          {(['PRIVATE', 'TEAM', 'PUBLIC'] as Visibility[]).map((v) => (
            <button
              key={v}
              data-testid={`detail-vis-${v.toLowerCase()}`}
              onClick={() => setForm((f) => ({ ...f, visibility: v }))}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
                form.visibility === v
                  ? 'border-primary bg-primary-muted text-primary'
                  : 'border-border text-text-secondary hover:border-primary/40',
              )}
            >
              <VisIcon v={v} /> <span className="capitalize">{v.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </Fieldset>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Fieldset label="Info" testId="detail-fs-info">
          <div className="space-y-2 text-xs">
            <div className="text-text-secondary">
              Created by: <span className="text-text-primary">{ws.createdBy.name || ws.createdBy.email || '—'}</span>
            </div>
            <div className="text-text-secondary">Created: <span className="text-text-primary">{fmt(ws.createdAt)}</span></div>
            <div className="text-text-secondary">Updated: <span className="text-text-primary">{fmt(ws.updatedAt)}</span></div>
          </div>
        </Fieldset>
        <Fieldset label="Owner" testId="detail-fs-owner">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted text-[10px] font-bold text-primary">
              {(ws.owner.name || ws.owner.email).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-text-primary">{ws.owner.name || ws.owner.email}</div>
              {ws.owner.name && <div className="truncate text-[11px] text-text-muted">{ws.owner.email}</div>}
            </div>
          </div>
        </Fieldset>
      </div>

      {dirty && (
        <div
          data-testid="detail-dirty-bar"
          className="sticky bottom-4 flex items-center justify-between rounded-md border border-primary/40 bg-primary-muted px-4 py-2.5 shadow-lg"
        >
          <span className="text-xs">You have unsaved changes.</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setForm(initial)} data-testid="detail-cancel">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={() => save.mutate()} data-testid="detail-save">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Members + Invitations ───────────────────────────────────────── */
const MembersInviteTab = ({ ws }: { ws: Workspace }) => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: members = [] } = useQuery({
    queryKey: ['members', ws.id],
    queryFn: () => listMembers(ws.id),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', ws.id],
    queryFn: () => listInvitations(ws.id),
  });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('EDITOR');

  const send = useMutation({
    mutationFn: () => invite(ws.id, email, role),
    onSuccess: async () => {
      setEmail('');
      await qc.invalidateQueries({ queryKey: ['invitations', ws.id] });
      toast.success('Invitation sent');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8" data-testid="proj-members">
      <section>
        <h2 className="text-lg font-semibold">Invite members</h2>
        <p className="mt-1 text-xs text-text-secondary">Send an email invitation with a role.</p>
        <div className="mt-3 flex gap-2">
          <input
            data-testid="proj-inv-email"
            placeholder="someone@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 flex-1 rounded-md border border-border bg-probestack-bg px-3 text-xs outline-none hover:border-primary/40 focus:border-primary"
          />
          <select
            data-testid="proj-inv-role"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="h-9 rounded-md border border-border bg-probestack-bg px-2 text-xs"
          >
            <option>ADMIN</option><option>EDITOR</option><option>VIEWER</option>
          </select>
          <Button
            variant="primary"
            data-testid="proj-inv-send"
            disabled={!email.includes('@') || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Members ({members.length})</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          {members.length === 0 && <div className="p-4 text-center text-xs text-text-muted">No members yet.</div>}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-muted text-[10px] font-bold text-primary">
                {(m.userName || m.userEmail).slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{m.userName || m.userEmail}</div>
                <div className="truncate text-[11px] text-text-muted">{m.userEmail}</div>
              </div>
              {m.role === 'OWNER' ? (
                <span className="flex items-center gap-1 rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-500">
                  <Crown className="h-3 w-3" /> OWNER
                </span>
              ) : (
                <>
                  <select
                    data-testid={`proj-mrole-${m.id}`}
                    value={m.role}
                    onChange={async (e) => {
                      await updateMemberRole(ws.id, m.id, e.target.value as MemberRole);
                      qc.invalidateQueries({ queryKey: ['members', ws.id] });
                      toast.success('Role updated');
                    }}
                    className="rounded border border-border bg-probestack-bg px-2 py-1 text-[11px]"
                  >
                    <option>ADMIN</option><option>EDITOR</option><option>VIEWER</option>
                  </select>
                  <button
                    data-testid={`proj-transfer-${m.id}`}
                    title="Transfer ownership"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Transfer ownership?',
                        description: <>You will become an <b>ADMIN</b> and <b>{m.userEmail}</b> will become the <b>OWNER</b>. This can be undone by the new owner.</>,
                        confirmText: 'Transfer',
                        tone: 'warning',
                      });
                      if (!ok) return;
                      await transferOwnership(ws.id, m.id);
                      qc.invalidateQueries({ queryKey: ['members', ws.id] });
                      qc.invalidateQueries({ queryKey: ['workspace', ws.id] });
                      toast.success('Ownership transferred');
                    }}
                    className="rounded p-1 text-text-muted hover:bg-hover hover:text-yellow-500"
                  >
                    <Crown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    data-testid={`proj-mremove-${m.id}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Remove ${m.userEmail}?`,
                        description: 'They will lose access to this project immediately.',
                        confirmText: 'Remove',
                        tone: 'danger',
                      });
                      if (!ok) return;
                      await removeMember(ws.id, m.id);
                      qc.invalidateQueries({ queryKey: ['members', ws.id] });
                      toast.success('Removed');
                    }}
                    className="rounded p-1 text-text-muted hover:bg-hover hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Pending invitations</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          {invitations.length === 0 && <div className="p-4 text-center text-xs text-text-muted">No invitations.</div>}
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{inv.invitedEmail}</div>
                <div className="text-[11px] text-text-muted">{inv.invitedRole} · <StatusBadge status={inv.status} /></div>
              </div>
              {inv.status === 'PENDING' && (
                <>
                  <button
                    data-testid={`proj-inv-copy-${inv.id}`}
                    title="Copy link"
                    onClick={async () => {
                      const url = `${window.location.origin}${inv.acceptUrl}`;
                      await navigator.clipboard.writeText(url);
                      await trackLinkCopied(ws.id, inv.id);
                      toast.success('Link copied');
                    }}
                    className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary"
                  >
                    <span className="text-[10px]">⧉</span>
                  </button>
                  <button
                    data-testid={`proj-inv-resend-${inv.id}`}
                    title="Resend"
                    onClick={async () => {
                      await resendInvitation(ws.id, inv.id);
                      qc.invalidateQueries({ queryKey: ['invitations', ws.id] });
                      toast.success('Invitation resent');
                    }}
                    className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                  <button
                    data-testid={`proj-inv-revoke-${inv.id}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Revoke invitation?`,
                        description: `The link sent to ${inv.invitedEmail} will stop working.`,
                        confirmText: 'Revoke',
                        tone: 'warning',
                      });
                      if (!ok) return;
                      await revokeInvitation(ws.id, inv.id);
                      qc.invalidateQueries({ queryKey: ['invitations', ws.id] });
                      toast.success('Revoked');
                    }}
                    className="rounded p-1 text-text-muted hover:bg-hover hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const AuditStubTab = ({ ws }: { ws: Workspace }) => (
  <div className="mx-auto max-w-3xl p-8" data-testid="proj-audit">
    <h2 className="text-lg font-semibold">Audit trail</h2>
    <div className="mt-4 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center text-xs text-text-muted">
      <History className="mx-auto mb-2 h-6 w-6" />
      Audit log wiring is scheduled for the observability service.
      For <span className="font-mono text-text-primary">{ws.name}</span> we'll stream create/update/delete
      events here once <code className="text-text-primary">events_bus</code> is connected.
    </div>
  </div>
);

const DeleteTab = ({ ws, onDeleted }: { ws: Workspace; onDeleted: () => void }) => {
  const confirm = useConfirm();
  return (
    <div className="mx-auto max-w-2xl p-8" data-testid="proj-delete">
      <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 text-red-500">
          <Trash2 className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Delete this project</h2>
        </div>
        <p className="text-xs text-text-secondary">
          Moving <b className="text-text-primary">{ws.name}</b> to trash will preserve it for 30 days before
          permanent deletion. All members lose access. Collections, requests, environments, and mocks remain
          restorable from <code>/projects/manage → Trash</code>.
        </p>
        <Button
          variant="destructive"
          data-testid="proj-delete-btn"
          onClick={async () => {
            const ok = await confirm({
              title: `Delete "${ws.name}"?`,
              description: <>This moves the project and all its content to trash. You can restore within <b>30 days</b>.</>,
              confirmText: 'Delete project',
              tone: 'danger',
              requireTypeMatch: ws.slug,
            });
            if (!ok) return;
            await deleteWorkspace(ws.id);
            toast.success('Project moved to trash');
            onDeleted();
          }}
        >
          <Trash2 className="h-4 w-4" /> Move project to trash
        </Button>
      </div>
    </div>
  );
};

/* ─── post-create 10-sec redirect toast ───────────────────────────── */
function showPostCreateToast(ws: Workspace, nav: (to: string) => void) {
  const total = 10;
  let remaining = total;
  const goCollections = () => { toast.dismiss(id); nav('/projects/collections'); };
  const id = toast.custom(
    (t) => (
      <div className="flex min-w-[320px] items-center gap-3 rounded-md border border-primary/40 bg-surface px-4 py-3 shadow-xl">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-semibold text-text-primary">Project "{ws.name}" is ready</div>
          <div className="text-text-muted">
            Redirecting to collections in <span data-testid="post-create-countdown" id={`cd-${t}`}>{remaining}</span>s…
          </div>
        </div>
        <button
          data-testid="post-create-go"
          onClick={goCollections}
          className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-white hover:bg-primary-hover"
        >
          Go now
        </button>
        <button
          data-testid="post-create-stay"
          onClick={() => toast.dismiss(id)}
          className="rounded-md border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:bg-hover"
        >
          Stay
        </button>
      </div>
    ),
    { duration: total * 1000 },
  );
  // tick updater
  const tick = window.setInterval(() => {
    remaining -= 1;
    const el = document.getElementById(`cd-${id}`);
    if (el) el.textContent = String(Math.max(0, remaining));
    if (remaining <= 0) { window.clearInterval(tick); goCollections(); }
  }, 1000);
}

/* ─── tiny primitives ─────────────────────────────────────────────── */
const Inp = ({ value, onChange, placeholder, testId, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; testId?: string; type?: string;
}) => (
  <input
    type={type}
    data-testid={testId}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 w-full rounded-md border border-border bg-probestack-bg px-3 text-sm outline-none transition-colors hover:border-primary/40 focus:border-primary"
  />
);
const VisIcon = ({ v }: { v: Visibility }) => {
  const Ico = v === 'PUBLIC' ? Globe : v === 'TEAM' ? Building2 : Lock;
  return <Ico className="h-3.5 w-3.5" />;
};
const StatusBadge = ({ status }: { status: string }) => {
  const cls: Record<string, string> = {
    PENDING: 'text-yellow-500', ACCEPTED: 'text-green-500',
    REJECTED: 'text-red-500', REVOKED: 'text-text-muted', EXPIRED: 'text-text-muted',
  };
  return <span className={cn('font-semibold', cls[status] || 'text-text-muted')}>{status}</span>;
};
const fmt = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
};
