/**
 * CollectionsPanel — sidebar for the selected workspace.
 *
 * Integrates:
 *   • Skeleton shimmer while workspaces load AND while a collection's
 *     contents are being fetched (no more centered spinner).
 *   • Empty-state with Add-folder / Add-request quick buttons whenever an
 *     expanded collection / folder has zero children.
 *   • Drag-and-drop: requests and folders can be dragged onto any
 *     collection or folder in the same workspace.
 *   • Delete confirm is rendered via a portal (RowConfirm) and floats
 *     next to the row — NOT centered, NOT behind a blurred backdrop.
 *   • Active request's parent collection + folder auto-expand.
 *   • Import modal (ImportModal) triggered from the Import action button.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight, ChevronDown, FolderOpen, FolderPlus, FileText, Plus, Upload,
  MoreHorizontal, Copy, Pencil, Trash2, Trash, Undo2, PlayCircle, Share2, BookOpen,
  Check, X, CornerDownRight, Download, RotateCcw, Globe, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';
import { Dropdown, DropdownItem, DropdownSep, DropdownLabel } from '@/components/ui/DropdownMenu';
import { useRowContextMenu } from '@/components/ui/RowContextMenu';
import type { RowContextItem } from '@/components/ui/RowContextMenu';
import { CollectionRunDrawer } from '@/components/collection-runner/CollectionRunDrawer';
import { cn } from '@/utils/cn';
import { SidebarShell, ActionButton, SearchInput } from './SidebarShell';
import { useRequests, type RequestMethod } from '@/stores/requests.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useSettings } from '@/stores/settings.store';
import { useSavedResponsePreview } from '@/stores/savedResponsePreview.store';
import {
  listCollections, createCollection, updateCollection, deleteCollection,
  cloneCollection, moveFolder, exportCollection,
  listFolders, createFolder, updateFolder, deleteFolder, cloneFolder,
  listCollectionTrash, restoreCollection,
  type Folder,
} from '@/services/collection.service';
import {
  listRequests, createRequest, updateRequest, deleteRequest, cloneRequest,
  moveRequest, listSavedResponses, deleteSavedResponse, type ApiRequest, type SavedResponse,
} from '@/services/request.service';
import { ImportModal } from '@/components/collection-import';
import { SidebarSkeleton } from './collections/SidebarSkeleton';
import { EmptyContainer } from './collections/EmptyContainer';
import { RowConfirm } from './collections/RowConfirm';
import { makeDragStart, useDropTarget, type DnDPayload } from './collections/useDnd';
import { ShareLinkDialog } from '@/components/collab/ShareLinkDialog';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const MC: Record<string, string> = {
  GET: 'text-method-get', POST: 'text-method-post', PUT: 'text-method-put',
  PATCH: 'text-method-patch', DELETE: 'text-method-delete',
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Protocol-mode toggle (HTTP vs GraphQL)                                 */
/* ────────────────────────────────────────────────────────────────────── */

export type ProtocolMode = 'http' | 'graphql';
const PROTOCOL_STORAGE_KEY = 'forgeq.collections.protocolMode';
const readProtocolMode = (): ProtocolMode => {
  try {
    const v = localStorage.getItem(PROTOCOL_STORAGE_KEY);
    return v === 'graphql' ? 'graphql' : 'http';
  } catch { return 'http'; }
};
const writeProtocolMode = (m: ProtocolMode) => {
  try { localStorage.setItem(PROTOCOL_STORAGE_KEY, m); } catch { /* ignore */ }
};

/**
 * Is this saved request a GraphQL request?
 *   • Java service stores body.mode as the upper-cased canonical enum
 *     (e.g. 'GRAPHQL'); UI types it lowercase ('graphql'). Accept both.
 *   • A request with `body.graphql` populated but missing mode is also
 *     treated as GraphQL — defensive against partial imports.
 */
const isGraphqlRequest = (r: ApiRequest): boolean => {
  const mode = String((r as any).body?.mode ?? '').toLowerCase();
  if (mode === 'graphql') return true;
  if (mode === '' && (r as any).body?.graphql) return true;
  return false;
};

/** Keep requests that match the active protocol mode. */
const filterByProtocol = (rows: ApiRequest[], mode: ProtocolMode): ApiRequest[] =>
  rows.filter((r) => (mode === 'graphql' ? isGraphqlRequest(r) : !isGraphqlRequest(r)));

/* ────────────────────────────────────────────────────────────────────── */
/*  Main panel                                                            */
/* ────────────────────────────────────────────────────────────────────── */

/* ─── Export download helpers ──────────────────────────────────── */
const FORMAT_EXTS: Record<string, string> = {
  FORGEQ:       'forgeq.json',
  POSTMAN_V2_1: 'postman.json',
  OPENAPI_3:    'openapi.yaml',
  INSOMNIA_V4:  'insomnia.json',
  HAR_1_2:      'har',
  CURL:         'sh',
  SOURCE:       'bin',
};
const defaultExtFor = (format: string) => FORMAT_EXTS[format] ?? 'bin';
const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const CollectionsPanel = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [newInline, setNewInline] = useState<{ parent: string; type: 'folder' | 'request' } | null>(null);
  const [newCollInline, setNewCollInline] = useState(false);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashDrawerOpen, setTrashDrawerOpen] = useState(false);
  const [protocolMode, setProtocolMode] = useState<ProtocolMode>(() => readProtocolMode());
  const setProtocol = (m: ProtocolMode) => { setProtocolMode(m); writeProtocolMode(m); };
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections', ws?.id],
    queryFn: () => listCollections(ws!.id),
    enabled: !!ws?.id && !showTrash,
  });

  const { data: trashed = [], isLoading: trashLoading } = useQuery({
    queryKey: ['collections-trash', ws?.id],
    queryFn: () => listCollectionTrash(ws!.id),
    enabled: !!ws?.id && (showTrash || trashDrawerOpen),
    staleTime: 5_000,
  });

  /* Auto-expand the active request's collection + folder (controlled by setting). */
  const activeId = useRequests((s) => s.activeId);
  const openReq = useRequests((s) => s.open.find((x) => x.id === activeId));
  const autoExpand = useSettings((s) => s.autoExpandSidebar);
  useEffect(() => {
    if (!autoExpand) return;
    if (!openReq?.collectionId) return;
    setOpen((prev) => ({
      ...prev,
      [openReq.collectionId!]: true,
      ...(openReq.folderId ? { [openReq.folderId]: true } : {}),
    }));
  }, [autoExpand, openReq?.id, openReq?.collectionId, openReq?.folderId]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['collections', ws?.id] });
    qc.invalidateQueries({ queryKey: ['collections-trash', ws?.id] });
    qc.invalidateQueries({ queryKey: ['folders'] });
    qc.invalidateQueries({ queryKey: ['requests'] });
  };

  return (
    <>
      <SidebarShell
        icon={FolderOpen}
        title={showTrash ? 'Trash · Collections' : (protocolMode === 'graphql' ? 'Collections · GraphQL' : 'Collections')}
        testId="collections-panel"
        actions={
          <div className="flex flex-col gap-2">
  {!showTrash && (
    <>
      {/* Protocol toggle row */}
      <div className="flex items-center gap-2">
        <ProtocolToggle mode={protocolMode} onChange={setProtocol} />
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-2">
        <ActionButton
          icon={Plus}
          label="Create"
          testId="collections-create-btn"
          onClick={() => setNewCollInline(true)}
        />
        <ActionButton
          icon={Upload}
          label="Import"
          testId="collections-import-btn"
          onClick={() => setImportOpen(true)}
        />
      </div>
    </>
  )}

  {showTrash && (
    <button
      type="button"
      data-testid="collections-trash-back"
      onClick={() => setShowTrash(false)}
      title="Back to active collections"
      className="inline-flex h-7 items-center gap-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 text-[11px] text-yellow-500 transition-colors hover:bg-yellow-500/20"
    >
      <X className="h-3.5 w-3.5" /> Close Trash
    </button>
  )}
</div>
        }
        search={
          showTrash ? null : (
            <SearchInput
              placeholder={protocolMode === 'graphql' ? 'Search GraphQL requests' : 'Search collections'}
              testId="collections-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )
        }
        footer={
          /* Bottom-pinned Trash drawer — same pattern as AiAssistedPanel. */
          <CollectionsTrashFooter
            isOpen={trashDrawerOpen}
            onToggle={() => setTrashDrawerOpen((v) => !v)}
            count={trashed.length}
            loading={trashLoading}
            items={trashed}
            onOpenFullView={() => { setTrashDrawerOpen(false); setShowTrash(true); }}
            onRestore={async (id) => {
              await restoreCollection(id);
              invalidate();
              toast.success('Collection restored');
            }}
            onPurge={async (id, name) => {
              const ok = await confirm({
                title: `Permanently delete "${name}"?`,
                description: 'This cannot be undone. All requests, folders, and saved responses under this collection will be lost forever.',
                confirmText: 'Delete forever',
                tone: 'danger',
                requireTypeMatch: name,
                testId: 'collection-purge-confirm',
              });
              if (!ok) return;
              await deleteCollection(id);
              invalidate();
              toast.success('Collection permanently deleted');
            }}
          />
        }
      >
        <div className="p-1">
          {!ws && <div className="p-3 text-xs text-text-muted">Select a project first.</div>}

          {ws && showTrash && (
            <CollectionTrashView
              loading={trashLoading}
              items={trashed}
              onClose={() => setShowTrash(false)}
              onRestore={async (id) => {
                await restoreCollection(id);
                invalidate();
                toast.success('Collection restored');
              }}
              onPurge={async (id, name) => {
                const ok = await confirm({
                  title: `Permanently delete "${name}"?`,
                  description: 'This cannot be undone. All requests, folders, and saved responses under this collection will be lost forever.',
                  confirmText: 'Delete forever',
                  tone: 'danger',
                  requireTypeMatch: name,
                  testId: 'collection-purge-confirm',
                });
                if (!ok) return;
                await deleteCollection(id);
                invalidate();
                toast.success('Collection permanently deleted');
              }}
            />
          )}

          {ws && !showTrash && isLoading && <SidebarSkeleton rows={4} />}
          {ws && !showTrash && newCollInline && (
            <InlineCreate
              placeholder="Collection name"
              onCancel={() => setNewCollInline(false)}
              onSubmit={async (name) => {
                setNewCollInline(false);
                await createCollection(ws!.id, { name });
                invalidate();
                toast.success('Collection created');
              }}
            />
          )}
          {ws && !showTrash && !isLoading &&
            collections
              .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
              .map((c) => (
                <CollectionNode
                  key={c.id}
                  collection={c}
                  expanded={!!open[c.id]}
                  onToggle={() => toggle(c.id)}
                  editing={editing}
                  setEditing={setEditing}
                  openMap={open}
                  toggleOpen={toggle}
                  newInline={newInline}
                  setNewInline={setNewInline}
                  invalidate={invalidate}
                  protocolMode={protocolMode}
                />
              ))}
          {ws && !showTrash && !isLoading && collections.length === 0 && !newCollInline && (
            <button
              data-testid="collections-empty-create"
              onClick={() => setNewCollInline(true)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-text-muted hover:bg-hover hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Create your first collection
            </button>
          )}
        </div>
      </SidebarShell>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Trash view — inline replacement for the active list                    */
/* ────────────────────────────────────────────────────────────────────── */

const CollectionTrashView = ({
  loading, items, onClose, onRestore, onPurge,
}: {
  loading: boolean;
  items: Array<{ id: string; name: string; description?: string | null; deletedAt?: string | null; updatedAt?: string }>;
  onClose: () => void;
  onRestore: (id: string) => void | Promise<void>;
  onPurge: (id: string, name: string) => void | Promise<void>;
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) return <SidebarSkeleton rows={3} />;
  if (items.length === 0) {
    return (
      <div
        className="m-2 rounded-md border border-dashed border-border bg-elevated p-4 text-center text-xs text-text-muted"
        data-testid="collections-trash-empty"
      >
        <Trash2 className="mx-auto mb-2 h-5 w-5 opacity-50" />
        Trash is empty.
        <button
          onClick={onClose}
          className="mt-2 block w-full text-[11px] text-primary hover:underline"
          data-testid="collections-trash-back"
        >
          ← Back to collections
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1" data-testid="collections-trash-list">
      <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-text-muted">
        {items.length} deleted · auto-purges in 30 days
      </div>
      {items.map((c) => (
        <div
          key={c.id}
          className="group flex items-center gap-2 rounded-md border border-border bg-elevated/50 px-2 py-1.5"
          data-testid={`collections-trash-row-${c.id}`}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-text-primary">{c.name}</div>
            {(c.deletedAt || c.updatedAt) && (
              <div className="truncate text-[10px] text-text-muted">
                deleted {fmtRel(c.deletedAt ?? c.updatedAt)}
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={busy === c.id}
            onClick={async () => {
              setBusy(c.id);
              try { await onRestore(c.id); } finally { setBusy(null); }
            }}
            title="Restore this collection"
            data-testid={`collections-trash-restore-${c.id}`}
            className="inline-flex h-6 items-center gap-1 rounded border border-border bg-surface px-1.5 text-[10px] text-text-secondary opacity-0 transition-opacity hover:border-primary/40 hover:text-primary group-hover:opacity-100 disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" /> Restore
          </button>
          <button
            type="button"
            disabled={busy === c.id}
            onClick={async () => {
              setBusy(c.id);
              try { await onPurge(c.id, c.name); } finally { setBusy(null); }
            }}
            title="Delete forever"
            data-testid={`collections-trash-purge-${c.id}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-[10px] text-red-400 opacity-0 transition-opacity hover:border-red-500/40 hover:bg-red-500/10 group-hover:opacity-100 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

const fmtRel = (iso?: string | null) => {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
};

/* ────────────────────────────────────────────────────────────────────── */
/*  ProtocolToggle — pill segmented control [HTTP] [GraphQL]              */
/* ────────────────────────────────────────────────────────────────────── */

const ProtocolToggle = ({ mode, onChange }: { mode: ProtocolMode; onChange: (m: ProtocolMode) => void }) => {
  const Seg = ({
    id, icon: Icon, label, tooltipTitle, tooltipBody,
  }: {
    id: ProtocolMode; icon: typeof Globe; label: string;
    tooltipTitle: string; tooltipBody: string;
  }) => {
    const active = mode === id;
    return (
      <Tooltip
        side="bottom"
        content={
          <div className="max-w-[220px]">
            <div className="mb-0.5 font-semibold text-text-primary">{tooltipTitle}</div>
            <div className="text-[10px] leading-snug text-text-muted">{tooltipBody}</div>
          </div>
        }
      >
        <button
          type="button"
          data-testid={`collections-protocol-${id}`}
          aria-pressed={active}
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors',
            active
              ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(99,102,241,0.45)]'
              : 'text-text-secondary hover:bg-hover hover:text-text-primary',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      </Tooltip>
    );
  };
  return (
    <div
  data-testid="collections-protocol-toggle"
  className="grid grid-cols-2 w-full gap-0.5 rounded-md border border-border bg-elevated p-0.5"
>
  <Seg
    id="http"
    icon={Globe}
    label="HTTP"
    tooltipTitle="HTTP / REST requests"
    tooltipBody="Show standard REST collections — GET, POST, PUT, etc. New requests created here use the HTTP body editor."
  />
  <Seg
    id="graphql"
    icon={Sparkles}
    label="GraphQL"
    tooltipTitle="GraphQL requests"
    tooltipBody="Show GraphQL-mode requests only. The Body tab switches to a query editor with IntelliSense."
  />
</div>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  CollectionsTrashFooter — bottom-pinned collapse drawer                */
/* ────────────────────────────────────────────────────────────────────── */

const CollectionsTrashFooter = ({
  isOpen, onToggle, count, loading, items, onOpenFullView, onRestore, onPurge,
}: {
  isOpen: boolean;
  onToggle: () => void;
  count: number;
  loading: boolean;
  items: Array<{ id: string; name: string; description?: string | null; deletedAt?: string | null; updatedAt?: string }>;
  onOpenFullView: () => void;
  onRestore: (id: string) => void | Promise<void>;
  onPurge: (id: string, name: string) => void | Promise<void>;
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        data-testid="collections-trash-drawer-toggle"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-hover"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Trash className="h-3.5 w-3.5" />
        Trash
        <span className="ml-auto rounded bg-elevated px-1.5 text-[10px] text-text-muted" data-testid="collections-trash-count">
          {count}
        </span>
      </button>
      {isOpen && (
        <div className="max-h-56 overflow-y-auto border-t border-border bg-probestack-bg/40" data-testid="collections-trash-drawer">
          {loading ? (
            <div className="px-3 py-3 text-[10px] text-text-muted">Loading…</div>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-center text-[10px] text-text-muted">Trash is empty.</p>
          ) : (
            <>
              <ul className="space-y-0.5 p-1">
                {items.slice(0, 8).map((c) => (
                  <li
                    key={c.id}
                    data-testid={`collections-trash-drawer-row-${c.id}`}
                    className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-text-muted transition-colors hover:bg-hover"
                  >
                    <Trash2 className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="min-w-0 flex-1 truncate" title={c.name}>{c.name}</span>
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={async () => { setBusy(c.id); try { await onRestore(c.id); } finally { setBusy(null); } }}
                      title="Restore"
                      data-testid={`collections-trash-drawer-restore-${c.id}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary disabled:opacity-50"
                    >
                      <Undo2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={async () => { setBusy(c.id); try { await onPurge(c.id, c.name); } finally { setBusy(null); } }}
                      title="Delete permanently"
                      data-testid={`collections-trash-drawer-purge-${c.id}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              {items.length > 8 && (
                <button
                  type="button"
                  data-testid="collections-trash-drawer-view-all"
                  onClick={onOpenFullView}
                  className="flex w-full items-center justify-center gap-1 border-t border-border px-2 py-1.5 text-[10px] text-primary hover:bg-hover"
                >
                  View all {items.length} deleted →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Collection node                                                       */
/* ────────────────────────────────────────────────────────────────────── */

const CollectionNode = ({
  collection, expanded, onToggle, editing, setEditing, openMap, toggleOpen, newInline, setNewInline, invalidate, protocolMode,
}: any) => {
  const ws = useWorkspaceStore((s) => s.current);
  const [shareOpen, setShareOpen] = useState(false);
  /** Right-click → Run · top-right menu → Run · open the lightweight
   *  Postman-style sequential runner drawer. */
  const [runnerOpen, setRunnerOpen] = useState(false);
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', collection.id],
    queryFn: () => listFolders(collection.id),
    enabled: expanded,
  });
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['requests', collection.id],
    queryFn: () => listRequests(collection.id),
    enabled: expanded,
  });
  const rootFolders = folders.filter((f: Folder) => !f.parentFolderId);
  // Apply protocol filter — HTTP toggle hides GraphQL-mode requests and
  // vice versa. Collections themselves stay visible so the tree shape
  // doesn't change between toggles.
  const allRequests = requests as ApiRequest[];
  const filteredRequests = filterByProtocol(allRequests, protocolMode);
  const rootRequests = filteredRequests.filter((r) => !r.folderId);
  const isLoading = foldersLoading || requestsLoading;
  const isEmpty = !isLoading && rootFolders.length === 0 && rootRequests.length === 0;

  const onDrop = async (payload: DnDPayload) => {
    try {
      if (payload.kind === 'request') {
        await moveRequest(payload.id, { folderId: null, targetCollectionId: collection.id });
        toast.success('Moved request');
      } else if (payload.kind === 'folder') {
        if (payload.collectionId !== collection.id) {
          toast.error('Moving across collections is not yet supported');
          return;
        }
        await moveFolder(collection.id, payload.id, null);
        toast.success('Moved folder to root');
      }
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'Move failed');
    }
  };

  const onShare = () => setShareOpen(true);
  const onClone = async () => {
    await cloneCollection(collection.id);
    invalidate();
    toast.success(`"${collection.name}" cloned`);
  };

  // Export — pulls collection + folders + requests from Mongo, hands to the
  // matching exporter, and triggers a browser download. Available formats
  // mirror the importer registry on the Java side. SOURCE downloads the
  // ORIGINAL uploaded file from GCS (when available); the others rebuild
  // the file fresh from our forgeq-native data so nothing is ever lost.
  const onExport = async (format: string, label: string) => {
    const t = toast.loading(`Preparing ${label}…`);
    try {
      const { blob, contentDisposition } = await exportCollection(collection.id, format);
      let filename = `${collection.name || 'collection'}.${defaultExtFor(format)}`;
      const m = /filename="([^"]+)"/i.exec(contentDisposition ?? '');
      if (m) filename = m[1];
      triggerDownload(blob, filename);
      toast.success(`Exported ${label}`, { id: t });
    } catch (e: any) {
      toast.error(e?.message || 'Export failed', { id: t });
    }
  };

  return (
    <>
    <Row
    size="lg" 
      expanded={expanded}
      onToggle={onToggle}
      icon={<FolderOpen className="h-3.5 w-3.5 text-primary" />}
      label={collection.name}
      bold
      editing={editing === collection.id}
      onRenameDone={async (newName) => {
        setEditing(null);
        if (newName && newName !== collection.name) {
          await updateCollection(collection.id, { name: newName } as any);
          invalidate();
          toast.success('Renamed');
        }
      }}
      testId={`collection-${collection.id}`}
      deleteTitle={`Delete "${collection.name}"?`}
      deleteDescription="All folders and requests inside will be deleted."
      onDelete={async () => {
        await deleteCollection(collection.id);
        invalidate();
        toast.success('Collection deleted');
      }}
      dropHandlers={useDropTarget(onDrop)}
      menu={(askDelete) => (
        <>
          <DropdownLabel>Collection</DropdownLabel>
          <DropdownItem icon={FolderPlus} onClick={() => { if (!expanded) onToggle(); setNewInline({ parent: `col:${collection.id}`, type: 'folder' }); }}>Add folder</DropdownItem>
          <DropdownItem icon={FileText} onClick={() => { if (!expanded) onToggle(); setNewInline({ parent: `col:${collection.id}`, type: 'request' }); }}>Add request</DropdownItem>
          <DropdownSep />
          <DropdownItem icon={PlayCircle} onClick={() => setRunnerOpen(true)}>Run</DropdownItem>
          <DropdownItem icon={BookOpen} onClick={async () => {
            try {
              toast.message('Generating API documentation…');
              const { createDoc } = await import('@/services/apiDocs.service');
              const doc = await createDoc({
                workspaceId: collection.workspaceId,
                collectionId: collection.id,
                title: collection.name,
                subtitle: collection.description || `Auto-generated from collection "${collection.name}"`,
                format: 'AUTO',
                visibility: 'WORKSPACE',
              });
              toast.success(`Documentation "${doc.title}" created`);
              window.location.assign(`/projects/api-docs?docId=${doc.docId}`);
            } catch (e: any) {
              toast.error(e?.message ?? 'Failed to generate documentation');
            }
          }}>Generate API documentation</DropdownItem>
          <DropdownItem icon={Share2} onClick={onShare}>Share</DropdownItem>
          <DropdownSep />
          <DropdownItem icon={Copy} onClick={onClone}>Clone</DropdownItem>
          <DropdownItem icon={Pencil} onClick={() => setEditing(collection.id)}>Rename</DropdownItem>
          <DropdownSep />
          <DropdownLabel>Export as</DropdownLabel>
          <DropdownItem icon={Download} onClick={() => onExport('FORGEQ', 'ForgeFuzz JSON')}>ForgeFuzz JSON (lossless)</DropdownItem>
          <DropdownItem icon={Download} onClick={() => onExport('POSTMAN_V2_1', 'Postman v2.1')}>Postman v2.1</DropdownItem>
          <DropdownItem icon={Download} onClick={() => onExport('OPENAPI_3', 'OpenAPI 3.0')}>OpenAPI 3.0</DropdownItem>
          <DropdownItem icon={Download} onClick={() => onExport('INSOMNIA_V4', 'Insomnia v4')}>Insomnia v4</DropdownItem>
          <DropdownItem icon={Download} onClick={() => onExport('HAR_1_2', 'HAR 1.2')}>HAR 1.2</DropdownItem>
          <DropdownItem icon={Download} onClick={() => onExport('CURL', 'cURL bundle')}>cURL bundle</DropdownItem>
          <DropdownItem icon={Download} onClick={() => onExport('SOURCE', 'original file')}>Original uploaded file</DropdownItem>
          <DropdownSep />
          <DropdownItem icon={Trash2} destructive onClick={askDelete}>Delete</DropdownItem>
        </>
      )}
      contextItems={(askDelete): RowContextItem[] => {
        const generateDocs = async () => {
          try {
            toast.message('Generating API documentation…');
            const { createDoc } = await import('@/services/apiDocs.service');
            const doc = await createDoc({
              workspaceId: collection.workspaceId,
              collectionId: collection.id,
              title: collection.name,
              subtitle: collection.description || `Auto-generated from collection "${collection.name}"`,
              format: 'AUTO',
              visibility: 'WORKSPACE',
            });
            toast.success(`Documentation "${doc.title}" created`);
            window.location.assign(`/projects/api-docs?docId=${doc.docId}`);
          } catch (e: any) {
            toast.error(e?.message ?? 'Failed to generate documentation');
          }
        };
        const runAsTest = async () => {
          // Task 3.11 — Collection runner. Spins up a functional run
          // that uses this collection as the request source. The
          // backend already understands `collectionId` on the start-run
          // body; we just need to wire it from the sidebar.
          try {
            const { startRun } = await import('@/services/functionalTest.service');
            toast.message('Starting test run from collection…');
            const r = await startRun({
              workspaceId: collection.workspaceId,
              collectionId: collection.id,
              triggeredBy: 'COLLECTION_SIDEBAR',
            } as any);
            if (r?.runId) {
              toast.success('Run started');
              window.location.assign(`/projects/testing?runId=${r.runId}`);
            }
          } catch (e: any) {
            toast.error(e?.message ?? 'Failed to start run');
          }
        };
        return [
          { groupLabel: 'Collection' },
          { icon: FolderPlus, label: 'Add folder',  onClick: () => { if (!expanded) onToggle(); setNewInline({ parent: `col:${collection.id}`, type: 'folder' }); } },
          { icon: FileText,   label: 'Add request', onClick: () => { if (!expanded) onToggle(); setNewInline({ parent: `col:${collection.id}`, type: 'request' }); } },
          { separator: true },
          { icon: PlayCircle, label: 'Run',         onClick: () => setRunnerOpen(true) },
          { icon: PlayCircle, label: 'Run as test', onClick: runAsTest },
          { icon: BookOpen,   label: 'Generate API documentation',   onClick: generateDocs },
          { icon: Share2,     label: 'Share',                        onClick: onShare },
          { separator: true },
          { icon: Copy,       label: 'Clone',  onClick: onClone },
          { icon: Pencil,     label: 'Rename', onClick: () => setEditing(collection.id) },
          { separator: true },
          { groupLabel: 'Export as' },
          { icon: Download, label: 'ForgeFuzz JSON (lossless)',     onClick: () => onExport('FORGEQ', 'ForgeFuzz JSON') },
          { icon: Download, label: 'Postman v2.1',               onClick: () => onExport('POSTMAN_V2_1', 'Postman v2.1') },
          { icon: Download, label: 'OpenAPI 3.0',                onClick: () => onExport('OPENAPI_3', 'OpenAPI 3.0') },
          { icon: Download, label: 'Insomnia v4',                onClick: () => onExport('INSOMNIA_V4', 'Insomnia v4') },
          { icon: Download, label: 'HAR 1.2',                    onClick: () => onExport('HAR_1_2', 'HAR 1.2') },
          { icon: Download, label: 'cURL bundle',                onClick: () => onExport('CURL', 'cURL bundle') },
          { icon: Download, label: 'Original uploaded file',     onClick: () => onExport('SOURCE', 'original file') },
          { separator: true },
          { icon: Trash2, label: 'Delete', destructive: true, onClick: askDelete },
        ];
      }}
    >
      {newInline?.parent === `col:${collection.id}` && (
        <InlineCreate
          indent={1}
          placeholder={newInline.type === 'folder' ? 'Folder name' : (protocolMode === 'graphql' ? 'GraphQL request name' : 'Request name')}
          onCancel={() => setNewInline(null)}
          onSubmit={async (name) => {
            setNewInline(null);
            const safeName = (name ?? '').trim() || (newInline.type === 'folder'
              ? 'New Folder'
              : (protocolMode === 'graphql' ? 'New GraphQL Request' : 'New Request'));
            if (newInline.type === 'folder') {
              await createFolder(collection.id, { name: safeName });
            } else if (protocolMode === 'graphql') {
              // GraphQL requests are always POST. Seed body.mode='graphql'
              // so the editor opens straight into the query editor and
              // the protocol-toggle filter recognises this request.
              await createRequest(collection.id, {
                name: safeName,
                method: 'POST',
                url: { raw: '' },
                body: { mode: 'graphql', graphql: { query: '', variables: '' } },
              } as any);
            } else {
              await createRequest(collection.id, { name: safeName, method: 'GET', url: { raw: '' } } as any);
            }
            invalidate();
          }}
        />
      )}
      {isLoading && <SidebarSkeleton rows={3} indent={1} />}
      {!isLoading && isEmpty && !newInline && (
        <EmptyContainer
          kind="collection"
          onAddFolder={() => setNewInline({ parent: `col:${collection.id}`, type: 'folder' })}
          onAddRequest={() => setNewInline({ parent: `col:${collection.id}`, type: 'request' })}
        />
      )}
      {rootFolders.map((f: Folder) => (
        <FolderNode
          key={f.id}
          collectionId={collection.id}
          workspaceId={ws?.id}
          folder={f}
          folders={folders}
          requests={filteredRequests}
          expanded={!!openMap[f.id]}
          onToggle={() => toggleOpen(f.id)}
          editing={editing}
          setEditing={setEditing}
          openMap={openMap}
          toggleOpen={toggleOpen}
          newInline={newInline}
          setNewInline={setNewInline}
          invalidate={invalidate}
          indent={1}
          protocolMode={protocolMode}
        />
      ))}
      {rootRequests.map((r) => (
        <RequestItem
          key={r.id}
          r={r}
          editing={editing === r.id}
          setEditing={setEditing}
          invalidate={invalidate}
          indent={1}
        />
      ))}
    </Row>
    {shareOpen && (
      <ShareLinkDialog
        entityType="collection"
        entityId={collection.id}
        entityName={collection.name}
        onClose={() => setShareOpen(false)}
      />
    )}
    {runnerOpen && (
      <CollectionRunDrawer
        collectionId={collection.id}
        collectionName={collection.name}
        onClose={() => setRunnerOpen(false)}
      />
    )}
  </>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Folder node (recursive)                                               */
/* ────────────────────────────────────────────────────────────────────── */

const FolderNode = ({
  collectionId, folder, folders, requests, expanded, onToggle, editing, setEditing,
  openMap, toggleOpen, newInline, setNewInline, invalidate, indent, protocolMode,
}: any) => {
  const children = folders.filter((f: Folder) => f.parentFolderId === folder.id);
  const myReqs = (requests as ApiRequest[]).filter((r) => r.folderId === folder.id);
  const isEmpty = children.length === 0 && myReqs.length === 0;

  const onDrop = async (payload: DnDPayload) => {
    try {
      if (payload.id === folder.id) return;           // no-op drop onto self
      if (payload.kind === 'request') {
        await moveRequest(payload.id, { folderId: folder.id, targetCollectionId: collectionId });
        toast.success('Moved request');
      } else if (payload.kind === 'folder') {
        if (payload.collectionId !== collectionId) {
          toast.error('Moving across collections is not yet supported');
          return;
        }
        await moveFolder(collectionId, payload.id, folder.id);
        toast.success('Moved folder');
      }
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'Move failed');
    }
  };

  return (
    <Row
    size="md"
      expanded={expanded}
      onToggle={onToggle}
      icon={<FolderOpen className="h-3.5 w-3.5 text-text-secondary" />}
      label={folder.name}
      indent={indent}
      editing={editing === folder.id}
      onRenameDone={async (n) => {
        setEditing(null);
        if (n && n !== folder.name) {
          await updateFolder(collectionId, folder.id, { name: n } as any);
          invalidate();
          toast.success('Renamed');
        }
      }}
      testId={`folder-${folder.id}`}
      deleteTitle={`Delete folder "${folder.name}"?`}
      deleteDescription="Cascade-deletes nested folders and requests."
      onDelete={async () => {
        await deleteFolder(collectionId, folder.id);
        invalidate();
        toast.success('Folder deleted');
      }}
      draggable
      dragPayload={{ kind: 'folder', id: folder.id, collectionId }}
      dropHandlers={useDropTarget(onDrop)}
      menu={(askDelete) => (
        <>
          <DropdownLabel>Folder</DropdownLabel>
          <DropdownItem icon={FolderPlus} onClick={() => { if (!expanded) onToggle(); setNewInline({ parent: `fol:${folder.id}`, type: 'folder' }); }}>Add folder</DropdownItem>
          <DropdownItem icon={FileText} onClick={() => { if (!expanded) onToggle(); setNewInline({ parent: `fol:${folder.id}`, type: 'request' }); }}>Add request</DropdownItem>
          <DropdownSep />
          <DropdownItem icon={Copy} onClick={async () => { await cloneFolder(collectionId, folder.id); invalidate(); toast.success('Folder cloned'); }}>Clone (deep)</DropdownItem>
          <DropdownItem icon={Pencil} onClick={() => setEditing(folder.id)}>Rename</DropdownItem>
          <DropdownItem icon={Trash2} destructive onClick={askDelete}>Delete</DropdownItem>
        </>
      )}
      contextItems={(askDelete): RowContextItem[] => [
        { groupLabel: 'Folder' },
        { icon: FolderPlus, label: 'Add folder',  onClick: () => { if (!expanded) onToggle(); setNewInline({ parent: `fol:${folder.id}`, type: 'folder' }); } },
        { icon: FileText,   label: 'Add request', onClick: () => { if (!expanded) onToggle(); setNewInline({ parent: `fol:${folder.id}`, type: 'request' }); } },
        { separator: true },
        { icon: Copy,   label: 'Clone (deep)', onClick: async () => { await cloneFolder(collectionId, folder.id); invalidate(); toast.success('Folder cloned'); } },
        { icon: Pencil, label: 'Rename',       onClick: () => setEditing(folder.id) },
        { icon: Trash2, label: 'Delete', destructive: true, onClick: askDelete },
      ]}
    >
      {newInline?.parent === `fol:${folder.id}` && (
        <InlineCreate
          indent={indent + 1}
          placeholder={newInline.type === 'folder' ? 'Folder name' : (protocolMode === 'graphql' ? 'GraphQL request name' : 'Request name')}
          onCancel={() => setNewInline(null)}
          onSubmit={async (name) => {
            setNewInline(null);
            const safeName = (name ?? '').trim() || (newInline.type === 'folder'
              ? 'New Folder'
              : (protocolMode === 'graphql' ? 'New GraphQL Request' : 'New Request'));
            if (newInline.type === 'folder') {
              await createFolder(collectionId, { name: safeName, parentFolderId: folder.id });
            } else if (protocolMode === 'graphql') {
              await createRequest(collectionId, {
                name: safeName,
                folderId: folder.id,
                method: 'POST',
                url: { raw: '' },
                body: { mode: 'graphql', graphql: { query: '', variables: '' } },
              } as any);
            } else {
              await createRequest(collectionId, { name: safeName, folderId: folder.id, method: 'GET', url: { raw: '' } } as any);
            }
            invalidate();
          }}
        />
      )}
      {isEmpty && !newInline && (
        <EmptyContainer
          kind="folder"
          indent={indent + 1}
          onAddFolder={() => setNewInline({ parent: `fol:${folder.id}`, type: 'folder' })}
          onAddRequest={() => setNewInline({ parent: `fol:${folder.id}`, type: 'request' })}
        />
      )}
      {children.map((f: Folder) => (
        <FolderNode
          key={f.id}
          collectionId={collectionId}
          folder={f}
          folders={folders}
          requests={requests}
          expanded={!!openMap[f.id]}
          onToggle={() => toggleOpen(f.id)}
          editing={editing}
          setEditing={setEditing}
          openMap={openMap}
          toggleOpen={toggleOpen}
          newInline={newInline}
          setNewInline={setNewInline}
          invalidate={invalidate}
          indent={indent + 1}
          protocolMode={protocolMode}
        />
      ))}
      {myReqs.map((r) => (
        <RequestItem key={r.id} r={r} editing={editing === r.id} setEditing={setEditing} invalidate={invalidate} indent={indent + 1} />
      ))}
    </Row>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Request row                                                           */
/* ────────────────────────────────────────────────────────────────────── */

const RequestItem = ({
  r, editing, setEditing, invalidate, indent = 0,
}: { r: ApiRequest; editing: boolean; setEditing: (id: string | null) => void; invalidate: () => void; indent?: number }) => {
  const openRequest = useRequests((s) => s.openRequest);
  const activeId = useRequests((s) => s.activeId);
  const rename = useRequests((s) => s.rename);
  const ws = useWorkspaceStore((s) => s.current);
  const isActive = activeId === r.id;
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const ctx = useRowContextMenu();

  const buildContextItems = (): RowContextItem[] => [
    { groupLabel: 'Request' },
    { icon: Pencil, label: 'Rename', onClick: () => setEditing(r.id) },
    { icon: Copy,   label: 'Clone',  onClick: async () => { await cloneRequest(r.id); invalidate(); toast.success('Request cloned'); } },
    { icon: Share2, label: 'Share',  onClick: () => setShareOpen(true) },
    { separator: true },
    { icon: Trash2, label: 'Delete', destructive: true, onClick: () => setConfirmDelete(true) },
  ];

  return (
    <>
    <div
      ref={rowRef}
      data-testid={`request-${r.id}`}
      draggable
      onDragStart={makeDragStart({ kind: 'request', id: r.id, collectionId: r.collectionId })}
      onContextMenu={(e) => ctx.openAt(e, buildContextItems())}
      className={cn(
        'group relative flex w-full items-center gap-1 rounded pr-1 text-[11px] text-text-primary transition-colors',
        isActive ? 'bg-primary-muted' : 'hover:bg-hover',
      )}
      style={{ paddingLeft: 4 + indent * 12 + 20 }}
    >
      {isActive && <span className="absolute left-0 top-0 h-5 w-[1px] rounded-l bg-primary" />}
      {isGraphqlRequest(r) ? (
        <span className="w-10 shrink-0 font-mono text-[10px] font-bold text-pink-400" title="GraphQL request">GQL</span>
      ) : (
        <span className={cn('w-10 shrink-0 font-mono text-[10px] font-bold', MC[r.method])}>{r.method}</span>
      )}
      {editing ? (
        <RowRenameInputInline
          defaultValue={r.name}
          onCancel={() => setEditing(null)}
          onSubmit={async (v) => {
            if (v && v !== r.name) { await updateRequest(r.id, { name: v }); invalidate(); rename(r.id, v); }
            setEditing(null);
          }}
        />
      ) : (
        <button
          onClick={() =>
            openRequest({
              id: r.id,
              method: r.method as RequestMethod,
              name: r.name,
              url: r.url?.raw,
              workspaceId: ws?.id,
              collectionId: r.collectionId,
              folderId: r.folderId ?? null,
              source: 'collection',
            })
          }
          onDoubleClick={() => setEditing(r.id)}
          className="min-w-0 flex-1 truncate text-left"
        >
          {r.name}
        </button>
      )}
      <NodeMenuButton>
        <DropdownLabel>Request</DropdownLabel>
        <DropdownItem icon={Pencil} onClick={() => setEditing(r.id)}>Rename</DropdownItem>
        <DropdownItem icon={Copy} onClick={async () => { await cloneRequest(r.id); invalidate(); toast.success('Request cloned'); }}>Clone</DropdownItem>
        <DropdownItem
          icon={Share2}
          onClick={() => setShareOpen(true)}
        >Share</DropdownItem>
        <DropdownSep />
        <DropdownItem icon={Trash2} destructive onClick={() => setConfirmDelete(true)}>Delete</DropdownItem>
      </NodeMenuButton>

      {shareOpen && (
        <ShareLinkDialog
          entityType="request"
          entityId={r.id}
          entityName={r.name}
          onClose={() => setShareOpen(false)}
        />
      )}

      {confirmDelete && (
        <RowConfirm
          anchor={rowRef.current}
          title={`Delete request "${r.name}"?`}
          description="This action cannot be undone."
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteRequest(r.id);
            invalidate();
            toast.success('Request deleted');
            setConfirmDelete(false);
          }}
        />
      )}
    </div>
    {ctx.portal}
    {isActive && <SavedResponseChildren requestId={r.id} indent={indent} />}
    </>
  );
};

/* Saved-response children rendered below the active request, with a
 * tiny status pill + name. Click to load the saved response into the
 * current tab's response panel. */
const SavedResponseChildren = ({ requestId, indent }: { requestId: string; indent: number }) => {
  const { data: items } = useQuery({
    queryKey: ['saved-responses', requestId],
    queryFn: () => listSavedResponses(requestId),
    refetchOnWindowFocus: false,
  });
  const setSavedResponse = useSavedResponsePreview((s) => s.show);
  const qc = useQueryClient();
  if (!items?.length) return null;
  return (
    <div data-testid={`saved-responses-${requestId}`}>
      {items.map((sr) => {
        const code = sr.status ?? sr.status_code ?? 0;
        const cls = code >= 200 && code < 300 ? 'text-success'
          : code >= 400 ? 'text-warning' : 'text-info';
        return (
          <div
            key={sr.id}
            data-testid={`saved-response-${sr.id}`}
            className="group flex items-center gap-1 rounded py-0.5 pr-1 text-[11px] text-text-secondary hover:bg-hover hover:text-text-primary"
            style={{ paddingLeft: 4 + (indent + 1) * 12 + 32 }}
          >
            <CornerDownRight className="h-3 w-3 shrink-0 text-text-muted" />
            <span className={cn('shrink-0 font-mono text-[10px] font-bold', cls)}>{code}</span>
            <button onClick={() => setSavedResponse(requestId, sr)} className="min-w-0 flex-1 truncate text-left">{sr.name}</button>
            <button
              onClick={async () => {
                await deleteSavedResponse(sr.id, requestId);
                qc.invalidateQueries({ queryKey: ['saved-responses', requestId] });
                toast.success('Saved response removed');
              }}
              className="opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              title="Delete saved response"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Inline-create input                                                   */
/* ────────────────────────────────────────────────────────────────────── */

const InlineCreate = ({
  placeholder, onSubmit, onCancel, indent = 0,
}: { placeholder: string; onSubmit: (name: string) => void | Promise<void>; onCancel: () => void; indent?: number }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="flex items-center gap-1 rounded py-1 pr-1" style={{ paddingLeft: 4 + indent * 12 }}>
      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
      <input
        ref={inputRef}
        placeholder={placeholder}
        data-testid="inline-create-input"
        onBlur={onCancel}
        onKeyDown={async (e) => {
          if (e.key === 'Enter') {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v) await onSubmit(v);
            else onCancel();
          }
          if (e.key === 'Escape') onCancel();
        }}
        className="min-w-0 flex-1 rounded border border-primary bg-probestack-bg px-1 py-0.5 text-xs outline-none"
      />
    </div>
  );
};

/* Inline rename input for request rows — forces focus after Radix
 * dropdown closes (it otherwise restores focus to the ... trigger). */
const RowRenameInputInline = ({
  defaultValue, onSubmit, onCancel,
}: { defaultValue: string; onSubmit: (v: string) => void | Promise<void>; onCancel: () => void }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) { el.focus(); el.select(); }
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <input
      ref={inputRef}
      defaultValue={defaultValue}
      onBlur={onCancel}
      onKeyDown={async (e) => {
        if (e.key === 'Enter') {
          await onSubmit((e.target as HTMLInputElement).value);
        }
        if (e.key === 'Escape') onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
      data-testid="row-rename-input"
      className="min-w-0 flex-1 rounded border border-primary bg-probestack-bg px-1 text-xs outline-none"
    />
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Row primitive (shared by collection + folder)                         */
/* ────────────────────────────────────────────────────────────────────── */

interface RowProps {
  expanded: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  indent?: number;
  bold?: boolean;
  testId?: string;
  menu?: (askDelete: () => void) => React.ReactNode;
  /** Right-click menu items — must mirror what `menu` renders. */
  contextItems?: (askDelete: () => void) => RowContextItem[];
  editing?: boolean;
  onRenameDone?: (newName: string | null) => void;
  deleteTitle?: string;
  deleteDescription?: string;
  onDelete?: () => void | Promise<void>;
  children?: React.ReactNode;
  draggable?: boolean;
  dragPayload?: DnDPayload;
  dropHandlers?: ReturnType<typeof useDropTarget>;
  size?: 'lg' | 'md' | 'sm';
}

const Row = ({
  expanded, onToggle, icon, label, indent = 0, bold, testId,
  menu, contextItems, editing, onRenameDone, deleteTitle, deleteDescription, onDelete, children,
  draggable, dragPayload, dropHandlers,size = 'md'
}: RowProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const askDelete = () => setConfirmDelete(true);
  const ctx = useRowContextMenu();

  // Add this map right before the return statement
const sizeClasses = {
  lg: 'text-sm py-1',      // For Collections (bigger than current)
  md: 'text-xs py-0.5',    // For Folders (same as current default)
  sm: 'text-[10px] py-0.5',// For Requests (smaller)
};
 const currentSize = sizeClasses[size];

  return (
    <div>
      <div
        ref={rowRef}
        draggable={!!draggable}
        onContextMenu={contextItems ? (e) => ctx.openAt(e, contextItems(askDelete)) : undefined}
        onDragStart={draggable && dragPayload ? makeDragStart(dragPayload) : undefined}
        {...(dropHandlers?.dropHandlers ?? {})}
        className={cn(
          'group relative flex items-center gap-1 rounded pr-1 text-left text-xs text-text-primary transition-colors',
          dropHandlers?.over ? 'bg-primary-muted ring-1 ring-primary/40' : 'hover:bg-hover',
        )}
        style={{ paddingLeft: 4 + indent * 12 }}
      >
        <button
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="flex h-5 w-4 shrink-0 items-center justify-center text-text-muted"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <span className="flex shrink-0 items-center">{icon}</span>
        {editing ? (
          <RowRenameInput
            defaultValue={label}
            onCommit={(v) => onRenameDone?.(v)}
            onCancel={() => onRenameDone?.(null)}
            busy={busy}
            setBusy={setBusy}
          />
        ) : (
          <button
            onClick={onToggle}
            data-testid={testId}
            className={cn('min-w-0 flex-1 truncate py-1 text-left', bold && 'font-medium')}
          >
            {label}
          </button>
        )}
        {menu && <NodeMenuButton>{menu(askDelete)}</NodeMenuButton>}
        {ctx.portal}

        {confirmDelete && deleteTitle && onDelete && (
          <RowConfirm
            anchor={rowRef.current}
            title={deleteTitle}
            description={deleteDescription}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={async () => {
              await onDelete();
              setConfirmDelete(false);
            }}
          />
        )}
      </div>
      {expanded && <div>{children}</div>}
    </div>
  );
};

const RowRenameInput = ({
  defaultValue, onCommit, onCancel, busy, setBusy,
}: {
  defaultValue: string;
  onCommit: (v: string) => void | Promise<void>;
  onCancel: () => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) => {
  const [val, setVal] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Forceful focus — Radix dropdown returns focus to its trigger when closing,
  // which races with React's autoFocus. Re-assert focus after the next frame.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) { el.focus(); el.select(); }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const commit = async () => {
    if (!val.trim() || val === defaultValue) { onCancel(); return; }
    try { setBusy(true); await onCommit(val.trim()); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit();
          if (e.key === 'Escape') onCancel();
        }}
        data-testid="row-rename-input"
        className="min-w-0 flex-1 rounded border border-primary bg-probestack-bg px-1 py-0.5 text-xs outline-none"
      />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => void commit()}
        disabled={busy}
        aria-label="Save rename"
        data-testid="row-rename-confirm"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-green-500 hover:bg-green-500/10"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCancel}
        aria-label="Cancel rename"
        data-testid="row-rename-cancel"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-red-500 hover:bg-red-500/10"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

const NodeMenuButton = ({ children }: { children: React.ReactNode }) => (
  <Dropdown
    side="right"
    align="start"
    trigger={
      <button
        data-testid="row-menu-trigger"
        className="flex h-5 w-5 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-hover hover:text-text-primary group-hover:opacity-100 data-[state=open]:opacity-100"
        aria-label="More actions"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    }
  >
    {children}
  </Dropdown>
);

export { SidebarShell as PanelHeader } from './SidebarShell';
export { SearchInput } from './SidebarShell';
