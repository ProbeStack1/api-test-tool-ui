/**
 * ProjectManagementPage — workspace management UI.
 *
 * Layout (per user's spec, no second navbar):
 *   ┌───────────────────────────┬─────────────────────────────────────┐
 *   │ ▸ Workspaces · [+New] [←] │                                      │
 *   │  · workspace-1            │   <selected workspace form>          │
 *   │  ✓ workspace-2            │                                      │
 *   │  · workspace-3            │                                      │
 *   └───────────────────────────┴─────────────────────────────────────┘
 *
 *  - NO top back-button bar; back arrow lives at sidebar header's top-right.
 *  - Selected project renders in a spacious fieldset-style form that mirrors
 *    the screenshot shared by the user.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban, Users, Mail, Trash2, Plus, Copy, UserPlus, Crown, Check, X,
  Globe, Lock, Building2, AlertTriangle, Loader2, ArrowLeft, Settings as SettingsIcon,
  Pencil, CheckCheck, User as UserIcon, Calendar, Clock, ChevronRight,
  FolderOpen, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Fieldset } from '@/components/ui/Fieldset';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonRow } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';
import {
  listWorkspaces, updateWorkspace, deleteWorkspace,
  listMembers, removeMember, updateMemberRole, transferOwnership,
  transferWorkspaceOwnership,
  listInvitations, invite, resendInvitation, revokeInvitation, trackLinkCopied,
  listTrash, restoreWorkspace,
  type Workspace, type MemberRole, type Visibility,
} from '@/services/workspace.service';
import { useWorkspaceStore } from '@/stores/workspace.store';

type Tab = 'details' | 'members' | 'invitations' | 'danger';

export const ProjectManagementPage = () => {
  const nav = useNavigate();
  const { current, setCurrent } = useWorkspaceStore();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });

  const selected = useMemo(
    () => workspaces.find((w) => w.id === current?.id) || workspaces[0] || null,
    [workspaces, current?.id],
  );

  const [tab, setTab] = useState<Tab>('details');
  const [showTrash, setShowTrash] = useState(false);

  return (
    <div data-testid="project-management-page" className="flex h-full min-h-0">
      {/* Left workspace rail — fixed 288px (w-72), back arrow at top-right */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Projects
          </span>
          <div className="flex items-center gap-1">
            <button
              data-testid="pm-new-workspace-btn"
              onClick={() => nav('/project')}
              title="New project"
              className="flex h-6 items-center gap-1 rounded-md border border-primary/60 bg-transparent px-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-muted"
            >
              <Plus className="h-3 w-3" /> New
            </button>
            <button
              data-testid="pm-trash-btn"
              onClick={() => setShowTrash(true)}
              title="Trash"
              aria-label="Project trash"
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              data-testid="pm-back-collections"
              onClick={() => nav('/projects/collections')}
              title="Back to collections"
              aria-label="Back to collections"
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-1">
          {isLoading && (
            <div className="space-y-1" data-testid="pm-ws-loading">
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          )}
          {!isLoading && workspaces.length === 0 && (
            <div className="p-3 text-xs text-text-muted">No projects yet. Create one.</div>
          )}
          {!isLoading && workspaces.map((w) => (
            <button
              key={w.id}
              data-testid={`pm-ws-${w.id}`}
              onClick={() => setCurrent(w)}
              className={cn(
                'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                selected?.id === w.id
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-primary hover:bg-hover',
              )}
            >
              {selected?.id === w.id
                ? <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                : <VisIcon v={w.visibility} />}
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              <span className="shrink-0 rounded bg-hover px-1.5 py-0.5 text-[10px] text-text-muted">
                {w.memberCount}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main panel */}
      <div className="min-w-0 flex-1 overflow-auto">
        {!selected ? (
          <EmptyState onCreate={() => nav('/project')} />
        ) : (
          <div className="mx-auto max-w-5xl space-y-6 px-8 py-8">
            {/* ── Header: lock icon · title · id · owner · Private chip ─── */}
            <ProjectHeader
              ws={selected}
              onRename={async (name) => {
                await updateWorkspace(selected.id, { name } as any);
                await qc.invalidateQueries({ queryKey: ['workspaces'] });
                toast.success('Project renamed');
              }}
            />

            {/* ── Tab bar (scoped to project) ───────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-border">
              {([
                { k: 'details', i: SettingsIcon, label: 'Details' },
                { k: 'members', i: Users, label: 'Members' },
                { k: 'invitations', i: Mail, label: 'Invitations' },
                { k: 'danger', i: AlertTriangle, label: 'Danger' },
              ] as const).map(({ k, i: Ico, label }) => (
                <button
                  key={k}
                  data-testid={`pm-tab-${k}`}
                  onClick={() => setTab(k as Tab)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-2 text-xs transition-colors',
                    tab === k && k !== 'danger' && 'text-primary',
                    tab === k && k === 'danger' && 'text-red-500',
                    tab !== k && k === 'danger' && 'text-text-secondary hover:text-red-500',
                    tab !== k && k !== 'danger' && 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Ico className="h-3.5 w-3.5" />
                  {label}
                  {tab === k && (
                    <span className={cn(
                      'absolute inset-x-2 -bottom-px h-[2px] rounded-t',
                      k === 'danger' ? 'bg-red-500' : 'bg-primary',
                    )} />
                  )}
                </button>
              ))}
            </div>

            {tab === 'details' && (
              <DetailsForm
                ws={selected}
                onSave={async (body) => {
                  await updateWorkspace(selected.id, body);
                  await qc.invalidateQueries({ queryKey: ['workspaces'] });
                  toast.success('Saved');
                }}
              />
            )}
            {tab === 'members' && <MembersTab workspaceId={selected.id} />}
            {tab === 'invitations' && <InvitationsTab workspaceId={selected.id} />}
            {tab === 'danger' && (
              <DangerZone
                ws={selected}
                onDelete={async () => {
                  const ok = await confirm({
                    title: `Move "${selected.name}" to trash?`,
                    description: <>Restorable for <b>30 days</b>.</>,
                    confirmText: 'Move to trash',
                    tone: 'danger',
                    requireTypeMatch: selected.slug,
                  });
                  if (!ok) return;
                  await deleteWorkspace(selected.id);
                  await qc.invalidateQueries({ queryKey: ['workspaces'] });
                  setCurrent(null);
                  toast.success('Project moved to trash');
                }}
              />
            )}
          </div>
        )}
      </div>
      {showTrash && <TrashModal onClose={() => setShowTrash(false)} />}
    </div>
  );
};

/* ─── Trash modal ──────────────────────────────────────────────────────── */
const TrashModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['workspaces', 'trash'],
    queryFn: listTrash,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <div
      data-testid="trash-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Project trash</h3>
            <p className="text-[11px] text-text-secondary">
              Soft-deleted projects are restorable for 30 days.
            </p>
          </div>
          <button
            onClick={onClose}
            data-testid="trash-close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading && (
          <div className="space-y-2 py-2" data-testid="trash-loading-skeleton">
            {[0,1,2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-probestack-bg px-3 py-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
                <Skeleton className="h-6 w-16 shrink-0" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="rounded-md border border-border bg-elevated p-6 text-center text-xs text-text-secondary" data-testid="trash-empty">
            Trash is empty.
          </div>
        )}
        {!isLoading && data.length > 0 && (
          <ul className="max-h-[60vh] space-y-1 overflow-auto" data-testid="trash-list">
            {data.map((ws) => (
              <li
                key={ws.id}
                data-testid={`trash-row-${ws.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-probestack-bg px-3 py-2"
              >
                <FolderKanban className="h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{ws.name}</div>
                  <div className="truncate text-[10px] text-text-secondary">
                    Deleted: {ws.deletedAt ?? '—'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  data-testid={`trash-restore-${ws.id}`}
                  disabled={busyId !== null}
                  onClick={async () => {
                    setBusyId(ws.id);
                    try {
                      await restoreWorkspace(ws.id);
                      toast.success(`"${ws.name}" restored`);
                      await refetch();
                      await qc.invalidateQueries({ queryKey: ['workspaces'] });
                    } catch (e: any) {
                      toast.error(e?.message ?? 'Restore failed');
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {busyId === ws.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/* ─── Header: large lock icon · title · project id · owner pill · private chip ─── */
const ProjectHeader = ({
  ws, onRename,
}: { ws: Workspace; onRename: (name: string) => Promise<void> }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ws.name);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const commit = async () => {
    if (draft.trim() === ws.name || !draft.trim()) { setEditing(false); setDraft(ws.name); return; }
    try { setBusy(true); await onRename(draft.trim()); setEditing(false); } finally { setBusy(false); }
  };
  const copyId = async () => {
    await navigator.clipboard.writeText(ws.id);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const VIco = ws.visibility === 'PUBLIC' ? Globe : ws.visibility === 'TEAM' ? Building2 : Lock;

  return (
    <header className="flex items-start gap-4">
      {/* Lock/vis icon */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
        <VIco className="h-7 w-7 text-text-muted" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void commit(); if (e.key === 'Escape') { setDraft(ws.name); setEditing(false); } }}
                className="h-9 rounded-md border border-primary bg-probestack-bg px-2 text-lg font-semibold outline-none"
                data-testid="pm-name-input"
              />
              <button onClick={() => void commit()} disabled={busy} data-testid="pm-name-confirm"
                className="flex h-7 w-7 items-center justify-center rounded text-green-500 hover:bg-green-500/10">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button onClick={() => { setDraft(ws.name); setEditing(false); }} data-testid="pm-name-cancel"
                className="flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-500/10">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <h1 data-testid="pm-project-name" className="text-2xl font-bold tracking-tight text-text-primary">{ws.name}</h1>
              <button
                onClick={() => { setDraft(ws.name); setEditing(true); }}
                data-testid="pm-name-edit"
                className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover hover:text-primary"
                aria-label="Edit name"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <span className="ml-1 flex h-6 items-center rounded-full bg-red-500/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                {ws.myRole || 'OWNER'}
              </span>
            </>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="font-mono text-[11px] text-text-muted">{ws.id}</code>
          <button
            data-testid="pm-copy-project-id"
            onClick={copyId}
            aria-label="Copy project id"
            className="flex h-5 w-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover hover:text-primary"
          >
            {copied ? <CheckCheck className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Private chip (right) */}
      <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs text-text-secondary">
        <VIco className="h-3.5 w-3.5" />
        <span className="capitalize">{ws.visibility.toLowerCase()}</span>
      </div>
    </header>
  );
};

const VisIcon = ({ v }: { v: Visibility }) => {
  const Ico = v === 'PUBLIC' ? Globe : v === 'TEAM' ? Building2 : Lock;
  return <Ico className="h-3.5 w-3.5 shrink-0 text-text-muted" />;
};

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
    <FolderKanban className="h-10 w-10 text-primary" />
    <div className="text-sm font-semibold">No project yet</div>
    <div className="max-w-xs text-xs text-text-muted">
      Create your first workspace to start building collections, requests and mocks.
    </div>
    <Button variant="primary" data-testid="pm-empty-create" onClick={onCreate}>
      <Plus className="h-4 w-4" /> Create project
    </Button>
  </div>
);

/* ─── Inline-editable text row (used inside Fieldsets) ─── */
const InlineEdit = ({
  value, placeholder, icon: Icon, onSave, testId, multiline = false,
}: {
  value: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSave: (v: string) => Promise<void>;
  testId?: string;
  multiline?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);

  const commit = async () => {
    if (draft === value) { setEditing(false); return; }
    try { setBusy(true); await onSave(draft); setEditing(false); } finally { setBusy(false); }
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="flex min-h-[2rem] items-center justify-between gap-3">
      {editing ? (
        <>
          {multiline ? (
            <textarea
              autoFocus
              data-testid={`${testId}-input`}
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void commit(); }
                if (e.key === 'Escape') cancel();
              }}
              rows={2}
              className="flex-1 resize-none rounded-md border border-primary bg-probestack-bg px-2 py-1.5 text-sm text-text-primary outline-none"
            />
          ) : (
            <input
              autoFocus
              data-testid={`${testId}-input`}
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void commit(); if (e.key === 'Escape') cancel(); }}
              className="h-8 flex-1 rounded-md border border-primary bg-probestack-bg px-2 text-sm text-text-primary outline-none"
            />
          )}
          <div className="flex items-center gap-1">
            <button
              data-testid={`${testId}-confirm`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void commit()}
              disabled={busy}
              className="flex h-7 w-7 items-center justify-center rounded text-green-500 hover:bg-green-500/10"
              aria-label="Save"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              data-testid={`${testId}-cancel`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancel}
              disabled={busy}
              className="flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-500/10"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-text-muted" />}
            <span
              className={cn(
                'truncate text-sm',
                value ? 'text-text-primary' : 'italic text-text-muted',
              )}
            >
              {value || placeholder || '—'}
            </span>
          </div>
          <button
            data-testid={testId}
            onClick={() => { setDraft(value); setEditing(true); }}
            aria-label="Edit"
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

const DetailsForm = ({
  ws, onSave,
}: { ws: Workspace; onSave: (body: Partial<Workspace>) => Promise<void> }) => {
  const saveField = (patch: Partial<Workspace>) => onSave(patch);

  return (
    <section className="space-y-5" data-testid="pm-details">
      {/* Description (full width) */}
      <Fieldset label="Description" testId="pm-fs-desc">
        <InlineEdit
          value={ws.description ?? ''}
          placeholder="Add a description"
          onSave={(v) => saveField({ description: v } as any)}
          testId="pm-edit-desc"
          multiline
        />
      </Fieldset>

      {/* Email (full width) */}
      <Fieldset label="Email" testId="pm-fs-email">
        <InlineEdit
          value={ws.workspaceEmail ?? ''}
          placeholder="team@company.com"
          icon={Mail}
          onSave={(v) => saveField({ workspaceEmail: v } as any)}
          testId="pm-edit-email"
        />
      </Fieldset>

      {/* ORG ID | Project SME */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Fieldset label="Organization ID" testId="pm-fs-org">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="truncate font-mono text-sm text-text-primary">{ws.orgId}</span>
          </div>
        </Fieldset>
        <Fieldset label="Project SME" testId="pm-fs-lead">
          <InlineEdit
            value={ws.projectLead ?? ''}
            placeholder="someone@company.com"
            icon={UserIcon}
            onSave={(v) => saveField({ projectLead: v } as any)}
            testId="pm-edit-lead"
          />
        </Fieldset>
      </div>

      {/* Visibility */}
      <Fieldset label="Visibility" testId="pm-fs-vis">
        <EditableVisibilityRow
          value={ws.visibility}
          testId="pm-edit-vis"
          onSave={(v) => saveField({ visibility: v } as any)}
        />
      </Fieldset>

      {/* Collections | Info */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Fieldset label="Collections" testId="pm-fs-collections">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-primary" />
            <span className="text-3xl font-bold text-text-primary">{ws.collectionCount ?? 0}</span>
            <span className="ml-auto text-[11px] text-text-muted">
              <a href="/projects/collections" className="inline-flex items-center gap-0.5 hover:text-primary">
                View all <ChevronRight className="h-3 w-3" />
              </a>
            </span>
          </div>
        </Fieldset>
        <Fieldset label="Info" testId="pm-fs-info">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <UserIcon className="h-3.5 w-3.5 text-text-muted" />
              <span>Created by: <span className="text-text-primary">{ws.createdBy.name || ws.createdBy.email || '—'}</span></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              <span>Created: <span className="text-text-primary">{fmtDate(ws.createdAt)}</span></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              <span>Updated: <span className="text-text-primary">{fmtDate(ws.updatedAt)}</span></span>
            </div>
          </div>
        </Fieldset>
      </div>
    </section>
  );
};

const EditableVisibilityRow = ({
  value, testId, onSave,
}: { value: Visibility; testId?: string; onSave: (v: Visibility) => Promise<void> }) => {
  const [draft, setDraft] = useState<Visibility>(value);
  const [busy, setBusy] = useState(false);
  const changed = draft !== value;
  const commit = async () => {
    try { setBusy(true); await onSave(draft); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(['PRIVATE', 'TEAM', 'PUBLIC'] as Visibility[]).map((v) => (
        <button
          key={v}
          data-testid={`${testId}-${v.toLowerCase()}`}
          onClick={() => setDraft(v)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
            draft === v
              ? 'border-primary bg-primary-muted text-primary'
              : 'border-border text-text-secondary hover:border-primary/40',
          )}
        >
          <VisIcon v={v} /> <span className="capitalize">{v.toLowerCase()}</span>
        </button>
      ))}
      {changed && (
        <button
          data-testid={`${testId}-confirm`}
          onClick={() => void commit()}
          disabled={busy}
          className="ml-auto flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
        </button>
      )}
    </div>
  );
};

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
};

const MembersTab = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
  });
  return (
    <section className="space-y-3" data-testid="pm-members">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Members ({members.length})</h3>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
        {isLoading && (
          <div className="divide-y divide-border"><SkeletonRow /><SkeletonRow /></div>
        )}
        {!isLoading && members.length === 0 && (
          <div className="p-8 text-center text-xs text-text-muted">No members</div>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted text-[10px] font-semibold text-primary">
              {(m.userName || m.userEmail).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-primary">{m.userName || m.userEmail}</div>
              <div className="truncate text-[11px] text-text-muted">{m.userEmail}</div>
            </div>
            {m.role === 'OWNER' ? (
              <span className="flex items-center gap-1 rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-500">
                <Crown className="h-3 w-3" /> OWNER
              </span>
            ) : (
              <select
                data-testid={`pm-role-${m.id}`}
                value={m.role}
                onChange={async (e) => {
                  await updateMemberRole(workspaceId, m.id, e.target.value as MemberRole);
                  await qc.invalidateQueries({ queryKey: ['members', workspaceId] });
                  toast.success('Role updated');
                }}
                className="rounded border border-border bg-probestack-bg px-2 py-1 text-[11px]"
              >
                <option>ADMIN</option><option>EDITOR</option><option>VIEWER</option>
              </select>
            )}
            {m.role !== 'OWNER' && (
              <button
                data-testid={`pm-transfer-${m.id}`}
                title="Transfer ownership"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Transfer ownership to ${m.userEmail}?`,
                    description: 'You will become an ADMIN. The new owner can transfer it back if needed.',
                    confirmText: 'Transfer',
                    tone: 'warning',
                  });
                  if (!ok) return;
                  await transferOwnership(workspaceId, m.id);
                  await qc.invalidateQueries({ queryKey: ['members', workspaceId] });
                  toast.success('Ownership transferred');
                }}
                className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary"
              >
                <Crown className="h-3.5 w-3.5" />
              </button>
            )}
            {m.role !== 'OWNER' && (
              <button
                data-testid={`pm-remove-${m.id}`}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Remove ${m.userEmail}?`,
                    description: 'They will lose access to this project immediately.',
                    confirmText: 'Remove',
                    tone: 'danger',
                  });
                  if (!ok) return;
                  await removeMember(workspaceId, m.id);
                  await qc.invalidateQueries({ queryKey: ['members', workspaceId] });
                  toast.success('Member removed');
                }}
                className="rounded p-1 text-text-muted hover:bg-hover hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const InvitationsTab = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations', workspaceId],
    queryFn: () => listInvitations(workspaceId),
  });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('EDITOR');
  const send = useMutation({
    mutationFn: () => invite(workspaceId, email, role),
    onSuccess: async () => {
      setEmail('');
      await qc.invalidateQueries({ queryKey: ['invitations', workspaceId] });
      toast.success('Invitation sent');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to invite'),
  });
  return (
    <section className="space-y-4" data-testid="pm-invitations">
      <Fieldset label="Invite team members">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-text-muted" />
          <input
            data-testid="pm-invite-email"
            placeholder="someone@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 flex-1 rounded-md border border-border bg-probestack-bg px-3 text-sm outline-none hover:border-primary/40 focus:border-primary"
          />
          <select
            data-testid="pm-invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="h-9 rounded-md border border-border bg-probestack-bg px-2 text-xs"
          >
            <option>ADMIN</option><option>EDITOR</option><option>VIEWER</option>
          </select>
          <Button
            variant="primary"
            data-testid="pm-invite-send"
            disabled={!email.includes('@') || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send
          </Button>
        </div>
      </Fieldset>

      <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
        {isLoading && <div className="divide-y divide-border"><SkeletonRow /><SkeletonRow /></div>}
        {!isLoading && invitations.length === 0 && (
          <div className="p-8 text-center text-xs text-text-muted">No invitations yet</div>
        )}
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{inv.invitedEmail}</div>
              <div className="text-[11px] text-text-muted">
                {inv.invitedRole} · <StatusBadge status={inv.status} />
                {inv.resendCount > 0 && <> · resent {inv.resendCount}×</>}
              </div>
            </div>
            {inv.status === 'PENDING' && (
              <>
                <button
                  data-testid={`pm-copy-${inv.id}`}
                  title="Copy invite link"
                  onClick={async () => {
                    const url = `${window.location.origin}${inv.acceptUrl}`;
                    await navigator.clipboard.writeText(url);
                    await trackLinkCopied(workspaceId, inv.id);
                    toast.success('Link copied');
                  }}
                  className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  data-testid={`pm-resend-${inv.id}`}
                  title="Resend"
                  onClick={async () => {
                    await resendInvitation(workspaceId, inv.id);
                    await qc.invalidateQueries({ queryKey: ['invitations', workspaceId] });
                    toast.success('Invitation resent');
                  }}
                  className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                </button>
                <button
                  data-testid={`pm-revoke-${inv.id}`}
                  title="Revoke"
                  onClick={async () => {
                    await revokeInvitation(workspaceId, inv.id);
                    await qc.invalidateQueries({ queryKey: ['invitations', workspaceId] });
                    toast.success('Invitation revoked');
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
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const cls: Record<string, string> = {
    PENDING: 'text-yellow-500',
    ACCEPTED: 'text-green-500',
    REJECTED: 'text-red-500',
    REVOKED: 'text-text-muted',
    EXPIRED: 'text-text-muted',
  };
  return <span className={cn('font-semibold', cls[status] || 'text-text-muted')}>{status}</span>;
};

const DangerZone = ({
  ws, onDelete,
}: { ws: Workspace; onDelete: () => void }) => (
  <section className="space-y-4" data-testid="pm-danger">
    <TransferOwnershipCard ws={ws} />
    <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-red-500">
        <AlertTriangle className="h-4 w-4" /> Delete project
      </h3>
      <p className="text-xs text-text-secondary">
        Deleting this project moves it to trash for 30 days. All collections, requests, environments and mocks remain there for restore.
      </p>
      <Button variant="destructive" data-testid="pm-delete-project" onClick={onDelete}>
        <Trash2 className="h-4 w-4" /> Move project to trash
      </Button>
    </div>
  </section>
);

/* ─── Transfer ownership card (workspace-level, gives keepAsAdmin control) ── */
const TransferOwnershipCard = ({ ws }: { ws: Workspace }) => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: members = [] } = useQuery({
    queryKey: ['members', ws.id],
    queryFn: () => listMembers(ws.id),
  });
  const eligible = useMemo(
    () => members.filter((m) => m.role !== 'OWNER'),
    [members],
  );
  const [target, setTarget] = useState<string>('');
  const [keepAsAdmin, setKeepAsAdmin] = useState(true);
  const [busy, setBusy] = useState(false);
  const isOwner = ws.myRole === 'OWNER';

  const submit = async () => {
    const m = eligible.find((x) => x.userId === target);
    if (!m) return;
    const ok = await confirm({
      title: `Transfer ownership to ${m.userEmail}?`,
      description: (
        <>
          You will {keepAsAdmin ? <>stay as <b>ADMIN</b></> : <>be downgraded to <b>EDITOR</b></>}.
          The new owner can transfer it back if needed.
        </>
      ),
      confirmText: 'Transfer ownership',
      tone: 'warning',
      requireTypeMatch: ws.slug,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await transferWorkspaceOwnership(ws.id, m.userId, keepAsAdmin);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['workspaces'] }),
        qc.invalidateQueries({ queryKey: ['members', ws.id] }),
      ]);
      toast.success(`Ownership transferred to ${m.userEmail}`);
      setTarget('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Transfer failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="space-y-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5"
      data-testid="pm-transfer-card"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-500">
        <Crown className="h-4 w-4" /> Transfer ownership
      </h3>
      <p className="text-xs text-text-secondary">
        Hand over OWNER rights to another member of this project. Optionally
        keep your old account as ADMIN for continued access.
      </p>

      {!isOwner && (
        <div className="rounded-md border border-border bg-elevated p-3 text-xs text-text-muted" data-testid="pm-transfer-no-owner">
          Only the project OWNER can transfer ownership.
        </div>
      )}

      {isOwner && eligible.length === 0 && (
        <div className="rounded-md border border-border bg-elevated p-3 text-xs text-text-muted" data-testid="pm-transfer-no-eligible">
          Add at least one other member before transferring ownership.
        </div>
      )}

      {isOwner && eligible.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            data-testid="pm-transfer-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9 min-w-[260px] flex-1 rounded-md border border-border bg-probestack-bg px-2 text-xs"
          >
            <option value="">Select new owner…</option>
            {eligible.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userName ? `${m.userName} · ${m.userEmail}` : m.userEmail} ({m.role})
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 rounded-md border border-border bg-probestack-bg px-2 py-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              data-testid="pm-transfer-keep-admin"
              checked={keepAsAdmin}
              onChange={(e) => setKeepAsAdmin(e.target.checked)}
              className="h-3.5 w-3.5 accent-yellow-500"
            />
            Keep me as ADMIN
          </label>
          <Button
            variant="outline"
            data-testid="pm-transfer-confirm"
            disabled={!target || busy}
            onClick={submit}
            className="border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
            Transfer
          </Button>
        </div>
      )}
    </div>
  );
};
