/**
 * ShareLinkDialog — create, copy & disable public share links for any
 * entity. Pops up from any "Share" action across the app.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  createSharedLink, disableSharedLink, listSharedLinks, type SharedLinkView,
} from '@/api/collab.api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/utils/cn';

function localUserId(): string {
  const k = 'forgeq.support.localUserId';
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

const publicShareUrl = (token: string) => `${window.location.origin}/shared/${token}`;

export const ShareLinkDialog = ({
  entityType, entityId, entityName, onClose,
}: {
  entityType: string; entityId: string; entityName?: string; onClose: () => void;
}) => {
  const userId = localUserId();
  const ws = useWorkspaceStore((s) => s.current);
  const workspaceId = ws?.id ?? '';
  const qc = useQueryClient();
  const [access, setAccess] = useState<'view' | 'edit'>('view');

  const q = useQuery({
    queryKey: ['collab', 'shared-links', workspaceId, entityType, entityId],
    queryFn: () => listSharedLinks(workspaceId, entityType, entityId),
    enabled: !!workspaceId && !!entityId,
  });

  const create = useMutation({
    mutationFn: () => createSharedLink(userId, workspaceId, { entityType, entityId, accessType: access }),
    onSuccess: () => {
      toast.success('Share link created');
      qc.invalidateQueries({ queryKey: ['collab', 'shared-links', workspaceId, entityType, entityId] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not create link'),
  });

  const disable = useMutation({
    mutationFn: (id: string) => disableSharedLink(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collab', 'shared-links', workspaceId, entityType, entityId] }),
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} data-testid="share-dialog-overlay" />
      <div
        data-testid="share-link-dialog"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Share {entityName ?? entityType}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary" data-testid="share-dialog-close">
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          {!workspaceId && (
            <div className="rounded-md border border-dashed border-warning/40 bg-warning/5 px-3 py-2 text-[11px] text-warning">Pick a workspace first.</div>
          )}

          <div className="flex items-center gap-3">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Access level</span>
              <div className="mt-1 inline-flex items-center rounded-md border border-border bg-elevated p-0.5 text-[11px]">
                {(['view', 'edit'] as const).map((v) => (
                  <button
                    key={v} type="button" onClick={() => setAccess(v)}
                    data-testid={`share-access-${v}`}
                    className={cn(
                      'rounded px-2 py-1 font-semibold uppercase tracking-wider transition-colors',
                      access === v ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary',
                    )}
                  >{v}</button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => create.mutate()}
              disabled={!workspaceId || create.isPending}
              data-testid="share-create-link"
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Create link
            </button>
          </div>

          <div>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Active links</h3>
            {q.isLoading ? (
              <div className="flex items-center gap-1 py-3 text-[11px] text-text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
            ) : (q.data ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-text-muted" data-testid="share-links-empty">No share links yet.</p>
            ) : (
              <ul className="space-y-1.5" data-testid="share-links-list">
                {q.data!.map((s) => <LinkRow key={s.id} s={s} onCopy={() => copy(s.token)} onDisable={() => disable.mutate(s.id)} />)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const LinkRow = ({ s, onCopy, onDisable }: { s: SharedLinkView; onCopy: () => void; onDisable: () => void }) => (
  <li
    data-testid={`share-link-row-${s.id}`}
    className="group flex items-center gap-3 rounded-md border border-border bg-elevated px-3 py-2 text-xs"
  >
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase',
      s.accessType === 'edit' ? 'bg-warning/15 text-warning' : 'bg-primary/15 text-primary',
    )}>{s.accessType}</span>
    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary" title={publicShareUrl(s.token)}>
      {publicShareUrl(s.token)}
    </span>
    <button type="button" onClick={onCopy} className="text-text-muted hover:text-primary" data-testid={`share-copy-${s.id}`} aria-label="Copy link">
      <Copy className="h-3.5 w-3.5" />
    </button>
    <button type="button" onClick={onDisable} className="text-text-muted hover:text-danger" data-testid={`share-disable-${s.id}`} aria-label="Disable link">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </li>
);

function copy(token: string) {
  try { navigator.clipboard.writeText(publicShareUrl(token)); toast.success('Link copied'); }
  catch { toast.error('Could not copy'); }
}
