/**
 * CollabCommentsPanel — a self-contained comments thread widget that can
 * be slotted into any entity detail page (request, collection, monitor
 * detail, etc.). Talks straight to the Collaboration service.
 *
 * Props:
 *   entityType — "request" / "collection" / "monitor" / ...
 *   entityId   — UUID of the target entity
 *
 * The workspace comes from the global workspace store so callers don't
 * need to pass it. Falls back gracefully when no workspace is selected.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createComment, deleteComment, listComments, type CommentView,
} from '@/api/collab.api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/utils/cn';

function localUserId(): string {
  const k = 'forgeq.support.localUserId';
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

export const CollabCommentsPanel = ({
  entityType, entityId, className,
}: {
  entityType: string; entityId: string; className?: string;
}) => {
  const userId = localUserId();
  const ws = useWorkspaceStore((s) => s.current);
  const workspaceId = ws?.id ?? '';
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');

  const q = useQuery({
    queryKey: ['collab', 'comments', workspaceId, entityType, entityId],
    queryFn: () => listComments(workspaceId, entityType, entityId),
    enabled: !!workspaceId && !!entityId,
    refetchInterval: 20_000,
  });

  const post = useMutation({
    mutationFn: () => createComment(userId, workspaceId, { entityType, entityId, content: draft.trim() }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['collab', 'comments', workspaceId, entityType, entityId] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not post comment'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collab', 'comments', workspaceId, entityType, entityId] }),
    onError: (e: any) => toast.error(e?.message ?? 'Could not delete'),
  });

  const canPost = !!workspaceId && !!entityId && draft.trim().length > 0 && !post.isPending;

  return (
    <section className={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-surface', className)} data-testid="collab-comments-panel">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
          Comments {q.data && `· ${q.data.total}`}
        </h3>
      </header>

      <div className="max-h-80 min-h-[6rem] flex-1 overflow-auto px-3 py-2" data-testid="collab-comments-list">
        {!workspaceId ? (
          <p className="px-2 py-4 text-center text-[11px] text-text-muted">Pick a workspace to see comments.</p>
        ) : q.isLoading ? (
          <p className="flex items-center gap-1 px-2 py-3 text-[11px] text-text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</p>
        ) : (q.data?.items ?? []).length === 0 ? (
          <p className="px-2 py-4 text-center text-[11px] text-text-muted">No comments yet — be the first to weigh in.</p>
        ) : (
          <ul className="space-y-2">
            {(q.data!.items).map((c) => <Row key={c.id} c={c} mine={c.userId === userId} onDelete={() => remove.mutate(c.id)} />)}
          </ul>
        )}
      </div>

      <footer className="border-t border-border bg-elevated/60 p-2">
        <div className="flex items-end gap-2">
          <textarea
            data-testid="collab-comment-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canPost) post.mutate(); }}
            rows={2}
            placeholder="Leave a comment (⌘/Ctrl+Enter to post)"
            className="min-h-[44px] flex-1 resize-none rounded-md border border-border bg-probestack-bg p-2 text-xs outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => canPost && post.mutate()}
            disabled={!canPost}
            data-testid="collab-comment-submit"
            className={cn(
              'inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-semibold text-white transition-all',
              canPost ? 'bg-primary hover:bg-primary-hover' : 'bg-elevated text-text-muted cursor-not-allowed',
            )}
          >
            {post.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Post
          </button>
        </div>
      </footer>
    </section>
  );
};

const Row = ({ c, mine, onDelete }: { c: CommentView; mine: boolean; onDelete: () => void }) => (
  <li
    data-testid={`collab-comment-row-${c.id}`}
    className="group flex items-start gap-2 rounded-md border border-transparent bg-elevated px-3 py-2 text-xs transition-colors hover:border-primary/30"
  >
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
      {(c.userId || '?').slice(0, 2).toUpperCase()}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block whitespace-pre-wrap leading-relaxed">{c.content}</span>
      <span className="mt-1 block text-[10px] text-text-muted">{new Date(c.createdAt).toLocaleString()}</span>
    </span>
    {mine && (
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        data-testid={`collab-comment-delete-${c.id}`}
        aria-label="Delete comment"
      >
        <Trash2 className="h-3 w-3 text-danger" />
      </button>
    )}
  </li>
);
