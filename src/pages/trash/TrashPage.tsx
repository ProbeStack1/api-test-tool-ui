/**
 * TrashPage — unified recovery surface for soft-deleted resources.
 *
 * Tabs:
 *   • Workspaces    (org-scoped)
 *   • Collections   (project-scoped)
 *   • Environments  (project-scoped)
 *   • Requests      (per-collection drilldown — pick a collection, see its
 *                    deleted requests, restore individually or in bulk)
 *
 * Each tab supports:
 *   - Multi-select with row checkboxes + "select all"
 *   - Bulk restore action (parallel calls)
 *   - Permanent delete is exposed but disabled with a "needs backend
 *     endpoint" tooltip — the auto-purge scheduler reaps after 90 days.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2, Boxes, FolderOpen, Server, RotateCcw, Search,
  RefreshCw, Loader2, AlertTriangle, FileText, Info, X, FileCode2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { listTrash as listWorkspaceTrash, restoreWorkspace } from '@/services/workspace.service';
import { listCollections, listCollectionTrash, restoreCollection } from '@/services/collection.service';
import { listEnvironmentTrash, restoreEnvironment } from '@/services/environment.service';
import { listRequestTrash, restoreRequest } from '@/services/request.service';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';
import { FancyEmpty } from '@/components/common/FancyEmpty';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import type { IconName } from '@/components/icons/AppIcons';

type TabKey = 'workspaces' | 'collections' | 'environments' | 'requests';

const TABS: { key: TabKey; label: string; icon: any; testId: string }[] = [
  { key: 'workspaces',    label: 'Projects',      icon: Boxes,      testId: 'trash-tab-workspaces' },
  { key: 'collections',   label: 'Collections',   icon: FolderOpen, testId: 'trash-tab-collections' },
  { key: 'environments',  label: 'Environments',  icon: Server,     testId: 'trash-tab-environments' },
  { key: 'requests',      label: 'Requests',      icon: FileCode2,  testId: 'trash-tab-requests' },
];

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
};
const fmtRelative = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  } catch { return '—'; }
};

export const TrashPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('workspaces');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<TabKey, Set<string>>>({
    workspaces: new Set(), collections: new Set(), environments: new Set(), requests: new Set(),
  });
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  /* clear selection on tab switch */
  useEffect(() => { setSearch(''); }, [tab]);

  const wsTrashQ  = useQuery({ queryKey: ['trash', 'workspaces'],            queryFn: () => listWorkspaceTrash(),         refetchInterval: 12_000 });
  const colTrashQ = useQuery({ queryKey: ['trash', 'collections',  ws?.id],  queryFn: () => listCollectionTrash(ws!.id),   enabled: !!ws?.id, refetchInterval: 12_000 });
  const envTrashQ = useQuery({ queryKey: ['trash', 'environments', ws?.id],  queryFn: () => listEnvironmentTrash(ws!.id),  enabled: !!ws?.id, refetchInterval: 12_000 });

  /* requests tab — pick a collection, show its trashed requests */
  const collectionsQ = useQuery({
    queryKey: ['trash', 'collections-list', ws?.id],
    queryFn: () => listCollections(ws!.id),
    enabled: !!ws?.id && tab === 'requests',
  });
  // Auto-select the first collection when entering Requests tab
  useEffect(() => {
    if (tab === 'requests' && !collectionId && (collectionsQ.data?.length ?? 0) > 0) {
      setCollectionId(collectionsQ.data![0].id);
    }
  }, [tab, collectionId, collectionsQ.data]);

  const reqTrashQ = useQuery({
    queryKey: ['trash', 'requests', collectionId],
    queryFn: () => listRequestTrash(collectionId!),
    enabled: tab === 'requests' && !!collectionId,
    refetchInterval: 12_000,
  });

  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['trash'] });

  const restoreWsMut  = useMutation({ mutationFn: (id: string) => restoreWorkspace(id),   onSuccess: invalidateAll });
  const restoreColMut = useMutation({ mutationFn: (id: string) => restoreCollection(id),  onSuccess: invalidateAll });
  const restoreEnvMut = useMutation({ mutationFn: (id: string) => restoreEnvironment(id), onSuccess: invalidateAll });
  const restoreReqMut = useMutation({ mutationFn: (id: string) => restoreRequest(id),     onSuccess: invalidateAll });

  const all = useMemo(() => ({
    workspaces:    wsTrashQ.data ?? [],
    collections:   colTrashQ.data ?? [],
    environments:  envTrashQ.data ?? [],
    requests:      reqTrashQ.data ?? [],
  }), [wsTrashQ.data, colTrashQ.data, envTrashQ.data, reqTrashQ.data]);

  const counts = {
    workspaces:   all.workspaces.length,
    collections:  all.collections.length,
    environments: all.environments.length,
    requests:     all.requests.length,
  };
  const grandTotal = counts.workspaces + counts.collections + counts.environments + counts.requests;

  const refetchActive = () => {
    if (tab === 'workspaces')   wsTrashQ.refetch();
    if (tab === 'collections')  colTrashQ.refetch();
    if (tab === 'environments') envTrashQ.refetch();
    if (tab === 'requests')     reqTrashQ.refetch();
  };

  const isActiveLoading =
    (tab === 'workspaces'   && wsTrashQ.isLoading) ||
    (tab === 'collections'  && colTrashQ.isLoading) ||
    (tab === 'environments' && envTrashQ.isLoading) ||
    (tab === 'requests'     && (collectionsQ.isLoading || reqTrashQ.isLoading));
  const isActiveFetching =
    (tab === 'workspaces'   && wsTrashQ.isFetching) ||
    (tab === 'collections'  && colTrashQ.isFetching) ||
    (tab === 'environments' && envTrashQ.isFetching) ||
    (tab === 'requests'     && reqTrashQ.isFetching);

  const filterByName = <T extends Record<string, any>>(rows: T[]): T[] => {
    if (!search.trim()) return rows;
    const k = search.trim().toLowerCase();
    return rows.filter((r) =>
      ((r as any).name ?? '').toString().toLowerCase().includes(k) ||
      ((r as any).description ?? '').toString().toLowerCase().includes(k) ||
      JSON.stringify((r as any).url ?? '').toLowerCase().includes(k),
    );
  };

  const filteredWs  = useMemo(() => filterByName(all.workspaces),    [all.workspaces, search]);
  const filteredCol = useMemo(() => filterByName(all.collections),   [all.collections, search]);
  const filteredEnv = useMemo(() => filterByName(all.environments),  [all.environments, search]);
  const filteredReq = useMemo(() => filterByName(all.requests),      [all.requests, search]);

  const activeRows: { id: string }[] =
    tab === 'workspaces' ? filteredWs :
    tab === 'collections' ? filteredCol :
    tab === 'environments' ? filteredEnv : filteredReq;

  /* ── selection helpers ── */
  const sel = selected[tab];
  const toggleOne = (id: string) => setSelected((prev) => {
    const next = new Set(prev[tab]);
    next.has(id) ? next.delete(id) : next.add(id);
    return { ...prev, [tab]: next };
  });
  const toggleAll = (rows: { id: string }[]) => setSelected((prev) => {
    const ids = rows.map((r) => r.id);
    const allOn = ids.length > 0 && ids.every((i) => prev[tab].has(i));
    return { ...prev, [tab]: allOn ? new Set() : new Set(ids) };
  });
  const clearSelection = () => setSelected((prev) => ({ ...prev, [tab]: new Set() }));

  const allSelected = activeRows.length > 0 && activeRows.every((r) => sel.has(r.id));
  const someSelected = sel.size > 0;

  /* ── bulk restore ── */
  const bulkRestore = async () => {
    const ids = Array.from(sel);
    if (!ids.length) return;
    setBulkRunning(true);
    let ok = 0, fail = 0;
    const fn: (id: string) => Promise<unknown> =
      tab === 'workspaces'   ? (id: string) => restoreWorkspace(id) :
      tab === 'collections'  ? (id: string) => restoreCollection(id) :
      tab === 'environments' ? (id: string) => restoreEnvironment(id) :
                               (id: string) => restoreRequest(id);
    const results = await Promise.allSettled(ids.map(fn));
    results.forEach((r) => r.status === 'fulfilled' ? ok++ : fail++);
    setBulkRunning(false);
    clearSelection();
    invalidateAll();
    if (fail) toast.error(`Restored ${ok}/${ids.length} — ${fail} failed`);
    else toast.success(`Restored ${ok} item${ok === 1 ? '' : 's'}`);
  };

  // Early return AFTER all hooks are called (React rules of hooks)
  if (!ws && tab !== 'workspaces') {
    return <NoProjectEmpty testId="trash-no-workspace" icon="trash" surface="the trash bin" />;
  }

  return (
    <div className="flex h-full flex-col" data-testid="trash-page">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/40 px-6 py-3">
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Trash2 className="h-4 w-4 text-primary" /> Trash
        </h1>
        <span className="text-[11px] text-text-muted">
          · Recover soft-deleted items. Auto-purges after 90 days.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="trash-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trash…"
              className="h-8 w-72 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={refetchActive} data-testid="trash-refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', isActiveFetching && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-7xl px-6 py-6">
          <div className="flex h-full flex-col gap-4">
            {/* Hero / counts */}
            <section data-testid="trash-hero" className="grid gap-3 sm:grid-cols-5">
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 sm:col-span-1">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <Trash2 className="h-3 w-3" /> In trash
                </div>
                <div className="text-3xl font-semibold tracking-tight" data-testid="trash-grand-total">{grandTotal}</div>
                <p className="mt-1 text-[10px] text-text-muted">Across all categories.</p>
              </div>
              {TABS.map((t) => (
                <CountTile
                  key={t.key}
                  label={t.label}
                  value={counts[t.key]}
                  icon={t.icon}
                  active={tab === t.key}
                  onClick={() => setTab(t.key)}
                  testId={`trash-count-${t.key}`}
                />
              ))}
            </section>

            {/* Tabs */}
            <nav data-testid="trash-tabs" className="flex items-center gap-1 border-b border-border">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  data-testid={t.testId}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                    tab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-muted hover:text-text-primary',
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                  <span className="rounded-full bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{counts[t.key]}</span>
                </button>
              ))}
            </nav>

            {/* Per-tab toolbar (collection picker for requests + bulk action bar) */}
            {tab === 'requests' && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/40 px-3 py-2" data-testid="trash-collection-picker-bar">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Collection</span>
                <select
                  data-testid="trash-collection-picker"
                  value={collectionId ?? ''}
                  onChange={(e) => { setCollectionId(e.target.value || null); clearSelection(); }}
                  className="h-8 max-w-md rounded-md border border-border bg-probestack-bg px-2 text-xs"
                >
                  {(collectionsQ.data ?? []).length === 0 && <option value="">— No collections —</option>}
                  {(collectionsQ.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="text-[10px] text-text-muted">
                  Showing trashed requests for the selected collection. Auto-purges with the collection.
                </span>
              </div>
            )}

            {someSelected && (
              <div data-testid="trash-bulk-bar" className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.06] px-3 py-2">
                <span className="text-[11px] font-semibold text-primary" data-testid="trash-bulk-count">
                  {sel.size} selected
                </span>
                <Button size="sm" variant="ghost" onClick={clearSelection} data-testid="trash-bulk-clear">
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={bulkRestore}
                    disabled={bulkRunning}
                    data-testid="trash-bulk-restore"
                  >
                    {bulkRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Restore selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Permanent delete needs a backend endpoint — auto-purge runs after 90 days"
                    data-testid="trash-bulk-permanent-delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Permanent delete (auto-purge)
                  </Button>
                </div>
              </div>
            )}

            {/* Select-all bar */}
            {!isActiveLoading && activeRows.length > 0 && (
              <div className="flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  data-testid="trash-select-all"
                  checked={allSelected}
                  onChange={() => toggleAll(activeRows)}
                  className="h-3.5 w-3.5 rounded border-border bg-probestack-bg accent-primary"
                />
                <span className="text-[10px] uppercase tracking-wider text-text-muted">
                  {allSelected ? 'Deselect all' : 'Select all visible'}
                </span>
              </div>
            )}

            {/* List */}
            <section className="flex-1 overflow-hidden rounded-2xl border border-border bg-surface/30">
              <div className="h-full overflow-auto" data-testid="trash-list">
                {isActiveLoading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : tab === 'workspaces' ? (
                  filteredWs.length === 0 ? <EmptyState kind="workspaces" filtered={!!search} /> : (
                    <ul className="divide-y divide-border">
                      {filteredWs.map((w) => (
                        <TrashRow
                          key={w.id}
                          testId={`trash-ws-row-${w.id}`}
                          icon={Boxes}
                          tone="primary"
                          name={w.name}
                          subtitle={w.slug ? `@${w.slug}` : undefined}
                          description={w.description ?? undefined}
                          deletedAt={w.deletedAt ?? undefined}
                          checked={sel.has(w.id)}
                          onToggle={() => toggleOne(w.id)}
                          isPending={restoreWsMut.isPending}
                          onRestore={() => restoreWsMut.mutate(w.id, {
                            onSuccess: () => toast.success(`Restored ${w.name}`),
                            onError: (e: any) => toast.error(e?.message ?? 'Restore failed'),
                          })}
                        />
                      ))}
                    </ul>
                  )
                ) : tab === 'collections' ? (
                  filteredCol.length === 0 ? <EmptyState kind="collections" filtered={!!search} /> : (
                    <ul className="divide-y divide-border">
                      {filteredCol.map((c) => (
                        <TrashRow
                          key={c.id}
                          testId={`trash-col-row-${c.id}`}
                          icon={FolderOpen}
                          tone="success"
                          name={c.name}
                          subtitle={c.sourceFormat}
                          description={c.description ?? undefined}
                          deletedAt={c.deletedAt ?? undefined}
                          checked={sel.has(c.id)}
                          onToggle={() => toggleOne(c.id)}
                          isPending={restoreColMut.isPending}
                          onRestore={() => restoreColMut.mutate(c.id, {
                            onSuccess: () => toast.success(`Restored ${c.name}`),
                            onError: (e: any) => toast.error(e?.message ?? 'Restore failed'),
                          })}
                        />
                      ))}
                    </ul>
                  )
                ) : tab === 'environments' ? (
                  filteredEnv.length === 0 ? <EmptyState kind="environments" filtered={!!search} /> : (
                    <ul className="divide-y divide-border">
                      {filteredEnv.map((e) => (
                        <TrashRow
                          key={e.id}
                          testId={`trash-env-row-${e.id}`}
                          icon={Server}
                          tone="amber"
                          name={e.name}
                          subtitle={e.scope}
                          description={e.description}
                          deletedAt={(e as any).deletedAt}
                          checked={sel.has(e.id)}
                          onToggle={() => toggleOne(e.id)}
                          isPending={restoreEnvMut.isPending}
                          onRestore={() => restoreEnvMut.mutate(e.id, {
                            onSuccess: () => toast.success(`Restored ${e.name}`),
                            onError: (err: any) => toast.error(err?.message ?? 'Restore failed'),
                          })}
                        />
                      ))}
                    </ul>
                  )
                ) : (
                  // requests tab
                  !collectionId ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="trash-no-collection">
                      <FileCode2 className="mb-3 h-10 w-10 text-text-muted" />
                      <p className="text-sm font-semibold">Pick a collection</p>
                      <p className="mt-1 max-w-md text-xs text-text-muted">Each collection has its own request bin. Choose one above to see its trashed requests.</p>
                    </div>
                  ) : filteredReq.length === 0 ? <EmptyState kind="requests" filtered={!!search} /> : (
                    <ul className="divide-y divide-border">
                      {filteredReq.map((r: any) => (
                        <TrashRow
                          key={r.id}
                          testId={`trash-req-row-${r.id}`}
                          icon={FileCode2}
                          tone="primary"
                          name={r.name ?? '(unnamed request)'}
                          subtitle={r.method}
                          description={typeof r.url === 'string' ? r.url : (r.url?.raw ?? r.url?.full ?? '—')}
                          deletedAt={r.deletedAt ?? r.updatedAt}
                          checked={sel.has(r.id)}
                          onToggle={() => toggleOne(r.id)}
                          isPending={restoreReqMut.isPending}
                          onRestore={() => restoreReqMut.mutate(r.id, {
                            onSuccess: () => toast.success(`Restored ${r.name}`),
                            onError: (e: any) => toast.error(e?.message ?? 'Restore failed'),
                          })}
                        />
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>

            {/* Footer hint */}
            <p className="flex items-center gap-1.5 text-[10px] text-text-muted" data-testid="trash-footer-hint">
              <Info className="h-3 w-3" /> Trashed items auto-purge after 90 days. Permanent-delete UI is wired but disabled until backend exposes the endpoint.
              <FileText className="ml-2 inline h-3 w-3 align-text-bottom" /> Requests bin lives per-collection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TONE_RING: Record<string, string> = {
  primary: 'bg-primary/10 text-primary ring-primary/20',
  success: 'bg-success/10 text-success ring-success/20',
  amber:   'bg-amber-500/10 text-amber-400 ring-amber-500/20',
};

const TrashRow = ({
  testId, icon: Icon, tone, name, subtitle, description, deletedAt,
  checked, onToggle, isPending, onRestore,
}: {
  testId: string; icon: any; tone: keyof typeof TONE_RING;
  name: string; subtitle?: string; description?: string;
  deletedAt?: string | null;
  checked: boolean; onToggle: () => void;
  isPending: boolean; onRestore: () => void;
}) => (
  <li data-testid={testId} className={cn('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover/40', checked && 'bg-primary/[0.04]')}>
    <input
      type="checkbox"
      data-testid={`${testId}-checkbox`}
      checked={checked}
      onChange={onToggle}
      className="h-3.5 w-3.5 shrink-0 rounded border-border bg-probestack-bg accent-primary"
    />
    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1', TONE_RING[tone])}>
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <h3 className="truncate text-sm font-semibold tracking-tight" data-testid={`${testId}-name`}>{name}</h3>
        {subtitle && <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">{subtitle}</span>}
      </div>
      {description && <p className="line-clamp-1 text-[11px] text-text-muted">{description}</p>}
      <p className="mt-0.5 text-[10px] text-text-muted">
        Deleted <span title={fmtDate(deletedAt)}>{fmtRelative(deletedAt)}</span>
      </p>
    </div>
    <Button
      size="sm"
      variant="primary"
      onClick={onRestore}
      disabled={isPending}
      data-testid={`${testId}-restore`}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Restore
    </Button>
  </li>
);

const CountTile = ({
  label, value, icon: Icon, active, onClick, testId,
}: {
  label: string; value: number; icon: any; active: boolean; onClick: () => void; testId: string;
}) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className={cn(
      'rounded-2xl border p-4 text-left transition-all',
      active
        ? 'border-primary/40 bg-primary/[0.06] ring-1 ring-primary/30'
        : 'border-border bg-surface/40 hover:border-primary/30',
    )}
  >
    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <div className="text-2xl font-semibold tracking-tight">{value}</div>
  </button>
);

const EmptyState = ({ kind, filtered }: { kind: string; filtered: boolean }) => {
  const iconMap: Record<string, IconName> = {
    workspaces: 'project', collections: 'collection',
    environments: 'environment', requests: 'request',
  };
  return (
    <FancyEmpty
      testId={`trash-empty-${kind}`}
      icon={filtered ? 'search' : (iconMap[kind] ?? 'trash')}
      title={filtered ? `No matching ${kind}` : `Trash is empty`}
      body={filtered
        ? 'Try a different search term or clear it to see everything.'
        : `Nothing in the ${kind === 'workspaces' ? 'projects' : kind} bin right now — deleted items show up here for safe recovery.`}
      steps={filtered ? undefined : [
        'Deleted items auto-move here (soft delete)',
        'Hit Restore to put them back exactly where they were',
        'Auto-purges after 90 days',
      ]}
    />
  );
};

export default TrashPage;
