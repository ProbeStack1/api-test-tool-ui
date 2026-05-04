/**
 * AiAssistedPanel — left sidebar for the AI-Assisted dedicated tab.
 *
 * Plugged into `ContextSidebar` exactly like every other primary-tab
 * panel (Collections, History, Variables, …) so the heading + collapse
 * toggle + outlined action button + search input look identical across
 * tabs. Body holds the chat-history list grouped by date with a hover
 * kebab (Rename / Delete) and a collapsible Trash drawer.
 *
 * Conversation rendering happens in {@link AiAssistedPage} on the right.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2, Trash, Undo2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createSession, listSessions, listTrash, renameSession,
  trashSession, restoreSession, purgeSession,
  type SessionView,
} from '@/services/aiChat.service';
import { SidebarShell, ActionButton, SearchInput } from './SidebarShell';
import { writeActiveSession } from '@/pages/ai-assistant/aiSessionStorage';
import { cn } from '@/utils/cn';

/** Group sessions by Today / Yesterday / Last 7 days / Older. */
function groupByDate(sessions: SessionView[]): Record<string, SessionView[]> {
  const out: Record<string, SessionView[]> = { Today: [], Yesterday: [], 'Last 7 days': [], Older: [] };
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = day(new Date());
  const yest = today - 86_400_000;
  const week = today - 7 * 86_400_000;
  for (const s of sessions) {
    const t = day(new Date(s.lastMessageAt || s.updatedAt || s.createdAt));
    if (t === today) out.Today.push(s);
    else if (t === yest) out.Yesterday.push(s);
    else if (t > week) out['Last 7 days'].push(s);
    else out.Older.push(s);
  }
  return out;
}

export const AiAssistedPanel = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('session');
  const setSelectedId = (id: string | null) =>
    setSearchParams(id ? { session: id } : {}, { replace: true });

  const sessionsQ = useQuery({ queryKey: ['ai-chat', 'sessions'], queryFn: listSessions, staleTime: 5_000 });
  const trashQ    = useQuery({ queryKey: ['ai-chat', 'trash'],    queryFn: listTrash,    staleTime: 5_000 });

  /* No auto-select: empty state is the friendly default. The page
     hydrates `selectedId` from localStorage on its own mount; if nothing
     is stored, the user starts a fresh chat by typing — first send
     auto-creates a session. */

  /* Search filter. */
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!sessionsQ.data) return [];
    if (!search.trim()) return sessionsQ.data;
    const q = search.toLowerCase();
    return sessionsQ.data.filter((s) => s.title?.toLowerCase().includes(q));
  }, [sessionsQ.data, search]);
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  /* Mutations. */
  const createMut = useMutation({
    mutationFn: () => createSession(),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['ai-chat', 'sessions'] });
      writeActiveSession(s.id);
      setSelectedId(s.id);
      toast.success('New chat ready');
    },
  });
  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameSession(id, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-chat', 'sessions'] });
      qc.invalidateQueries({ queryKey: ['ai-chat', 'detail'] });
      toast.success('Renamed');
    },
  });
  const trashMut = useMutation({
    mutationFn: trashSession,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['ai-chat', 'sessions'] });
      qc.invalidateQueries({ queryKey: ['ai-chat', 'trash'] });
      if (selectedId === id) {
        writeActiveSession(null);
        setSelectedId(null);
      }
      toast.success('Moved to trash');
    },
  });
  const restoreMut = useMutation({
    mutationFn: restoreSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-chat', 'sessions'] });
      qc.invalidateQueries({ queryKey: ['ai-chat', 'trash'] });
      toast.success('Restored');
    },
  });
  const purgeMut = useMutation({
    mutationFn: purgeSession,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['ai-chat', 'trash'] });
      if (selectedId === id) {
        writeActiveSession(null);
        setSelectedId(null);
      }
      toast.success('Permanently deleted');
    },
  });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [trashOpen, setTrashOpen]   = useState(false);

  const startRename = (s: SessionView) => { setRenamingId(s.id); setDraftTitle(s.title || 'New chat'); };
  const commitRename = () => {
    if (renamingId && draftTitle.trim()) renameMut.mutate({ id: renamingId, title: draftTitle.trim() });
    setRenamingId(null);
  };

  return (
    <SidebarShell
      icon={Sparkles}
      title="AI Assisted"
      testId="ai-assisted-panel"
      actions={
        <ActionButton
          icon={createMut.isPending ? Loader2 : Plus}
          label={createMut.isPending ? 'Creating…' : 'New chat'}
          testId="chat-create-btn"
          onClick={() => createMut.mutate()}
        />
      }
      search={
        <SearchInput
          placeholder="Search chats…"
          testId="chat-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      <div className="flex h-full flex-col" data-testid="chat-history-sidebar">
        {/* Sessions list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2" data-testid="chat-list">
          {sessionsQ.isLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-12 text-center">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary opacity-60" />
              <p className="text-xs text-text-muted">
                {search ? 'No chats match your search.' : 'No chats yet — click "New chat" to start.'}
              </p>
            </div>
          ) : (
            (Object.entries(groups) as [string, SessionView[]][])
              .filter(([, list]) => list.length > 0)
              .map(([label, list]) => (
                <section key={label} className="mb-3">
                  <div className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                    {label}
                  </div>
                  <ul className="space-y-0.5">
                    {list.map((s) => (
                      <SessionRow
                        key={s.id}
                        s={s}
                        selected={selectedId === s.id}
                        renaming={renamingId === s.id}
                        draftTitle={draftTitle}
                        onDraftChange={setDraftTitle}
                        onCommitRename={commitRename}
                        onCancelRename={() => setRenamingId(null)}
                        onSelect={() => setSelectedId(s.id)}
                        onStartRename={() => startRename(s)}
                        onTrash={() => trashMut.mutate(s.id)}
                      />
                    ))}
                  </ul>
                </section>
              ))
          )}
        </div>

        {/* Trash drawer */}
        <div className="border-t border-border">
          <button
            data-testid="chat-trash-toggle"
            type="button"
            onClick={() => setTrashOpen(!trashOpen)}
            className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-hover"
          >
            {trashOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Trash className="h-3.5 w-3.5" />
            Trash
            <span className="ml-auto rounded bg-elevated px-1.5 text-[10px] text-text-muted">
              {trashQ.data?.length ?? 0}
            </span>
          </button>
          {trashOpen && (
            <div className="max-h-48 overflow-y-auto px-2 pb-2" data-testid="chat-trash-list">
              {(trashQ.data ?? []).length === 0 ? (
                <p className="px-2 py-3 text-center text-[10px] text-text-muted">Trash is empty.</p>
              ) : (
                <ul className="space-y-0.5">
                  {trashQ.data!.map((s) => (
                    <li
                      key={s.id}
                      data-testid={`trash-row-${s.id}`}
                      className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-text-muted transition-colors hover:bg-hover"
                    >
                      <span className="min-w-0 flex-1 truncate" title={s.title}>{s.title || 'Untitled'}</span>
                      <button
                        data-testid={`trash-restore-${s.id}`}
                        type="button"
                        onClick={() => restoreMut.mutate(s.id)}
                        title="Restore"
                        className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
                      >
                        <Undo2 className="h-3 w-3" />
                      </button>
                      <button
                        data-testid={`trash-purge-${s.id}`}
                        type="button"
                        onClick={() => purgeMut.mutate(s.id)}
                        title="Delete permanently"
                        className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </SidebarShell>
  );
};

/* =========================================================================
 *  Single session row with hover kebab + inline-rename.
 * ========================================================================= */
const SessionRow = ({
  s, selected, renaming, draftTitle, onDraftChange, onCommitRename, onCancelRename,
  onSelect, onStartRename, onTrash,
}: {
  s: SessionView;
  selected: boolean;
  renaming: boolean;
  draftTitle: string;
  onDraftChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onStartRename: () => void;
  onTrash: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (renaming) setTimeout(() => inputRef.current?.select(), 0); }, [renaming]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <li
      data-testid={`chat-row-${s.id}`}
      className={cn(
        'group relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
        selected ? 'bg-primary-muted/40 text-primary' : 'text-text-primary hover:bg-hover',
      )}
    >
      {renaming ? (
        <input
          ref={inputRef}
          data-testid={`chat-rename-input-${s.id}`}
          value={draftTitle}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          onBlur={onCommitRename}
          className="min-w-0 flex-1 rounded border border-primary bg-probestack-bg px-1.5 py-0.5 text-xs outline-none"
        />
      ) : (
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left" title={s.title}>
          {s.title || 'Untitled chat'}
        </button>
      )}
      <span className="shrink-0 text-[9px] text-text-muted">{s.messageCount}</span>
      {!renaming && (
        <div className="relative" ref={menuRef}>
          <button
            data-testid={`chat-kebab-${s.id}`}
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className={cn(
              'rounded p-0.5 text-text-muted transition-opacity',
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              'hover:bg-elevated hover:text-text-primary',
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div
              data-testid={`chat-menu-${s.id}`}
              className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-md border border-border bg-surface shadow-xl"
            >
              <button
                data-testid={`chat-action-rename-${s.id}`}
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onStartRename(); }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-text-primary transition-colors hover:bg-hover"
              >
                <Pencil className="h-3 w-3" /> Rename
              </button>
              <button
                data-testid={`chat-action-trash-${s.id}`}
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onTrash(); }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-danger transition-colors hover:bg-danger/10"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
};
