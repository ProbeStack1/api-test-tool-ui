/**
 * BugTrackerPage — in-app bug tracker, wired to
 * /api/v1/functional-tests/bugs/*.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Stats strip (Open / Critical / Security / Unassigned)│
 *   ├─────────────────────────────────────────────────────┤
 *   │  Filters: status / severity / source                 │
 *   ├──────────────┬──────────────────────────────────────┤
 *   │  Bug list    │  Selected bug detail (description,    │
 *   │  cards       │  comments, status dropdown, evidence) │
 *   └──────────────┴──────────────────────────────────────┘
 *
 * "New bug" button at top right opens a creation drawer.
 *
 * Designed so Jira/Linear can mirror a bug later — every row has
 * externalId/externalProvider/externalUrl fields, and the UI
 * exposes them when populated.
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bug as BugIcon, Plus, RefreshCw, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { serviceUrl } from '@/lib/env';

const BASE = `${serviceUrl('functionalTest')}/api/v1/functional-tests/bugs`;

interface Bug {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'WONT_FIX';
  assigneeEmail?: string;
  reporterEmail?: string;
  source: 'MANUAL' | 'SECURITY_SCAN' | 'FUNCTIONAL_TEST' | 'MONITOR' | 'LOAD_TEST';
  sourceRunId?: string;
  sourceFindingId?: string;
  sourceEvidence?: string;
  tags?: string[];
  comments?: { id: string; author: string; body: string; at: string }[];
  externalId?: string;
  externalProvider?: string;
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const SEV_COLOR = {
  CRITICAL: 'border-red-500/40 bg-red-500/10 text-red-400',
  HIGH:     'border-red-500/30 bg-red-500/5  text-red-300',
  MEDIUM:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
  LOW:      'border-sky-500/30 bg-sky-500/10 text-sky-400',
} as const;

const STATUS_COLOR = {
  OPEN:        'border-blue-500/30 bg-blue-500/10 text-blue-400',
  IN_PROGRESS: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  RESOLVED:    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  CLOSED:      'border-border bg-elevated text-text-muted',
  WONT_FIX:    'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
} as const;

export const BugTrackerPage = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<{ status?: string; severity?: string; source?: string }>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter.status)   params.status = filter.status;
      if (filter.severity) params.severity = filter.severity;
      if (filter.source)   params.source = filter.source;
      const [list, st] = await Promise.all([
        axios.get<Bug[]>(BASE, { params }),
        axios.get(`${BASE}/stats`),
      ]);
      setBugs(list.data);
      setStats(st.data);
    } catch (e) { /* offline */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filter.status, filter.severity, filter.source]);

  const selected = bugs.find((b) => b.id === selectedId);

  return (
    <div className="flex h-full flex-col" data-testid="bug-tracker-page">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <BugIcon className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Bug Tracker</h1>
        <span className="text-xs text-text-muted">{bugs.length} bug{bugs.length === 1 ? '' : 's'}</span>
        <button data-testid="bug-refresh" onClick={fetchAll} className="ml-auto rounded p-1 hover:bg-hover" title="Refresh">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
        <button
          data-testid="bug-new-btn"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" /> New bug
        </button>
      </header>

      {/* Stats strip */}
      <div className="flex flex-wrap gap-2 px-6 py-3 text-[11px]" data-testid="bug-stats">
        <Chip label="Open" value={stats.status_open ?? 0} color="blue" />
        <Chip label="In progress" value={stats.status_in_progress ?? 0} color="purple" />
        <Chip label="Resolved" value={stats.status_resolved ?? 0} color="emerald" />
        <Chip label="Critical" value={stats.severity_critical ?? 0} color="red" />
        <Chip label="High" value={stats.severity_high ?? 0} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 border-b border-border px-6 pb-3 text-[11px]" data-testid="bug-filters">
        <FilterDropdown label="Status" value={filter.status} options={['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX']} onChange={(v) => setFilter((f) => ({ ...f, status: v }))} testId="filter-status" />
        <FilterDropdown label="Severity" value={filter.severity} options={['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']} onChange={(v) => setFilter((f) => ({ ...f, severity: v }))} testId="filter-severity" />
        <FilterDropdown label="Source" value={filter.source} options={['MANUAL', 'SECURITY_SCAN', 'FUNCTIONAL_TEST', 'MONITOR', 'LOAD_TEST']} onChange={(v) => setFilter((f) => ({ ...f, source: v }))} testId="filter-source" />
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <ul className="w-[420px] shrink-0 overflow-y-auto border-r border-border" data-testid="bug-list">
          {bugs.map((b) => (
            <li key={b.id}>
              <button
                data-testid={`bug-row-${b.id}`}
                onClick={() => setSelectedId(b.id)}
                className={cn(
                  'w-full border-b border-border/50 px-4 py-3 text-left hover:bg-hover/30',
                  selectedId === b.id && 'bg-primary/10 border-l-2 border-l-primary'
                )}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold', SEV_COLOR[b.severity])}>{b.severity}</span>
                  <span className={cn('rounded border px-1.5 py-0.5 text-[9px]', STATUS_COLOR[b.status])}>{b.status.replace('_', ' ')}</span>
                  <span className="ml-auto rounded border border-border bg-elevated px-1.5 py-0.5 text-[9px] text-text-muted">{b.source}</span>
                </div>
                <div className="mt-1 truncate text-sm font-medium text-text-primary">{b.title}</div>
                <div className="mt-0.5 truncate text-[10px] text-text-muted">
                  {b.assigneeEmail ? `Assigned: ${b.assigneeEmail}` : 'Unassigned'} · {new Date(b.createdAt).toLocaleDateString()}
                </div>
              </button>
            </li>
          ))}
          {bugs.length === 0 && (
            <li className="p-8 text-center text-xs text-text-muted">No bugs match these filters.</li>
          )}
        </ul>

        <div className="flex-1 overflow-y-auto p-6" data-testid="bug-detail">
          {selected ? (
            <BugDetail bug={selected} onChange={() => fetchAll()} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-muted">Select a bug to inspect.</div>
          )}
        </div>
      </div>

      {creating && <CreateBugDrawer onClose={() => setCreating(false)} onCreated={() => { setCreating(false); fetchAll(); }} />}
    </div>
  );
};

function Chip({ label, value, color }: { label: string; value: number; color: string }) {
  const tones: Record<string, string> = {
    blue:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
    purple:  'border-purple-500/30 bg-purple-500/10 text-purple-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    red:     'border-red-500/30 bg-red-500/10 text-red-400',
  };
  return <span className={cn('rounded border px-2 py-0.5', tones[color])}><b>{value}</b> {label}</span>;
}

function FilterDropdown({ label, value, options, onChange, testId }: {
  label: string; value?: string; options: string[]; onChange: (v?: string) => void; testId: string;
}) {
  return (
    <label className="flex items-center gap-1 text-text-muted">
      {label}:
      <select
        data-testid={testId}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="rounded border border-border bg-transparent px-1.5 py-0.5"
      >
        <option value="">all</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

/** Robust date formatter — backend Comment.at can arrive as ISO string,
 *  epoch seconds (number with fraction) or epoch milliseconds. Auto-detect. */
function fmtCommentAt(raw: unknown): string {
  if (raw == null) return '—';
  let d: Date;
  if (typeof raw === 'number') {
    // Heuristic: anything < 1e12 is seconds, anything larger is millis.
    d = new Date(raw < 1e12 ? raw * 1000 : raw);
  } else if (typeof raw === 'string') {
    // Try ISO first; if it fails, try numeric.
    const n = Number(raw);
    if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(raw)) {
      d = new Date(n < 1e12 ? n * 1000 : n);
    } else {
      d = new Date(raw);
    }
  } else {
    d = new Date(String(raw));
  }
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function BugDetail({ bug, onChange, onClose }: { bug: Bug; onChange: () => void; onClose: () => void }) {
  const [status, setStatus] = useState(bug.status);
  const [assignee, setAssignee] = useState(bug.assigneeEmail ?? '');
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setStatus(bug.status); setAssignee(bug.assigneeEmail ?? ''); }, [bug.id]);

  const save = async () => {
    setBusy(true);
    try {
      await axios.patch(`${BASE}/${bug.id}`, { status, assigneeEmail: assignee || null });
      onChange();
    } finally { setBusy(false); }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      await axios.post(`${BASE}/${bug.id}/comments`, { author: 'me@team.com', body: commentText });
      setCommentText('');
      onChange();
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <h2 className="flex-1 text-base font-semibold text-text-primary">{bug.title}</h2>
        <button data-testid="bug-detail-close" onClick={onClose} className="rounded p-1 hover:bg-hover"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className={cn('rounded border px-2 py-0.5', SEV_COLOR[bug.severity])}>{bug.severity}</span>
        <span className="rounded border border-border bg-elevated px-2 py-0.5">{bug.source}</span>
        {bug.sourceRunId && <span className="rounded border border-border bg-elevated px-2 py-0.5 font-mono">run: {bug.sourceRunId.slice(0, 8)}</span>}
        {bug.externalUrl && (
          <a href={bug.externalUrl} target="_blank" rel="noreferrer" className="rounded border border-border bg-elevated px-2 py-0.5 text-primary hover:underline">
            {bug.externalProvider}: {bug.externalId}
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <label>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status</span>
          <select
            data-testid="bug-status-select"
            value={status} onChange={(e) => setStatus(e.target.value as any)}
            className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1"
          >
            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX'] as const).map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Assignee email</span>
          <input
            data-testid="bug-assignee-input"
            value={assignee} onChange={(e) => setAssignee(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1 font-mono"
            placeholder="dev@team.com"
          />
        </label>
      </div>
      <button
        data-testid="bug-save-btn"
        onClick={save} disabled={busy}
        className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null} Save changes
      </button>

      {bug.description && (
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Description</h3>
          <pre className="whitespace-pre-wrap rounded border border-border bg-transparent p-3 text-xs">{bug.description}</pre>
        </section>
      )}

      {bug.sourceEvidence && (
        <details>
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-text-muted">Source evidence</summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded border border-border bg-transparent p-2 text-[10px] font-mono">{bug.sourceEvidence}</pre>
        </details>
      )}

      <section data-testid="bug-comments">
        <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Comments ({bug.comments?.length ?? 0})</h3>
        <ul className="space-y-1.5">
          {(bug.comments ?? []).map((c) => (
            <li key={c.id} className="rounded border border-border bg-transparent p-2 text-xs">
              <div className="mb-0.5 text-[10px] text-text-muted">{c.author} · {fmtCommentAt(c.at)}</div>
              <div>{c.body}</div>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-1">
          <input
            data-testid="bug-comment-input"
            value={commentText} onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs"
          />
          <button
            data-testid="bug-comment-send"
            onClick={addComment} disabled={busy || !commentText.trim()}
            className="rounded bg-primary/15 px-2 py-1 text-xs text-primary hover:bg-primary/25 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </section>
    </div>
  );
}

function CreateBugDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await axios.post(BASE, { title, description, severity, status: 'OPEN', source: 'MANUAL', reporterEmail: 'me@team.com' });
      onCreated();
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="create-bug-drawer" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-background-elevated p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-sm font-semibold">New bug</h2>
        <div className="space-y-2 text-xs">
          <input
            data-testid="create-bug-title"
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded border border-border bg-transparent px-2 py-1.5"
          />
          <textarea
            data-testid="create-bug-description"
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (markdown supported)" rows={4}
            className="w-full rounded border border-border bg-transparent px-2 py-1.5 font-mono"
          />
          <select
            data-testid="create-bug-severity"
            value={severity} onChange={(e) => setSeverity(e.target.value as any)}
            className="w-full rounded border border-border bg-transparent px-2 py-1.5"
          >
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-border px-3 py-1 text-xs">Cancel</button>
          <button
            data-testid="create-bug-submit"
            onClick={submit} disabled={busy || !title.trim()}
            className="rounded bg-primary px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null} Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default BugTrackerPage;
