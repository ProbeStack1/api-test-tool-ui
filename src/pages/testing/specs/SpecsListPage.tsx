/**
 * SpecsListPage — project-scoped test spec list (default landing for
 * `/projects/testing` and `/projects/testing/specs`).
 *
 * Top toolbar: search · status filter · "+ New spec" with 3-mode modal.
 * Body: card grid (one card per spec) with format/status badges, hash,
 * test-case count, last update, and quick "Open" / "Archive" actions.
 *
 * Selecting a card navigates to `/projects/testing/specs/:id`.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Search, Inbox, ArchiveRestore, Trash2, ListChecks,
  Hash, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTestingStore } from '@/stores/testing.store';
import {
  listTestSpecs,
  archiveTestSpec,
  restoreTestSpec,
  type TestSpec,
  type SpecStatus,
} from '@/services/testSpec.service';
import { CreateSpecModal } from './CreateSpecModal';
import { FormatBadge, StatusBadge, formatBytes, formatRelative } from '../shared/Badges';
import { cn } from '@/utils/cn';

export const SpecsListPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const openSpec = useTestingStore((s) => s.openSpec);
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SpecStatus>('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<TestSpec | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['testSpec', 'list', ws?.id, status, search],
    queryFn: () => listTestSpecs(ws!.id, { status, search: search.trim() || undefined, size: 50 }),
    enabled: !!ws?.id,
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveTestSpec(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testSpec', 'list', ws?.id] }),
  });
  const restoreMut = useMutation({
    mutationFn: (id: string) => restoreTestSpec(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testSpec', 'list', ws?.id] }),
  });

  const items = useMemo(() => data?.content ?? [], [data]);

  if (!ws) {
    return <NoProjectEmpty testId="specs-no-workspace" icon="spec" surface="the spec library" />;
  }

  return (
    <div className="flex h-full flex-col" data-testid="specs-list-page">
      {/* Header / toolbar */}
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/30 px-6 py-3">
        <div>
          <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <FileText className="h-4 w-4 text-primary" /> Test Specs
          </h1>
          <p className="text-[11px] text-text-muted">
            OpenAPI · Postman · HAR · cURL — auto-detected and persisted in
            project <span className="font-mono text-text-secondary">{ws.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="specs-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search specs…"
              className="h-8 w-56 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs"
            />
          </div>
          <div className="flex h-8 items-center rounded-md border border-border bg-probestack-bg p-0.5 text-[11px]">
            {(['ACTIVE', 'ARCHIVED'] as SpecStatus[]).map((s) => (
              <button
                key={s}
                data-testid={`specs-filter-${s.toLowerCase()}`}
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-sm px-2.5 py-0.5 transition-colors',
                  status === s
                    ? 'bg-primary/[0.10] text-text-primary ring-1 ring-primary/30'
                    : 'text-text-secondary hover:bg-hover',
                )}
              >
                {s === 'ACTIVE' ? 'Active' : 'Archived'}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            data-testid="specs-refresh"
            aria-label="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setCreateOpen(true)}
            data-testid="specs-create-btn"
          >
            <Plus className="h-3.5 w-3.5" /> New spec
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="specs-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} archived={status === 'ARCHIVED'} />
        ) : (
          <ul
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="specs-grid"
          >
            {items.map((s) => (
              <SpecCard
                key={s.testSpecId}
                spec={s}
                onOpen={() => openSpec(s.testSpecId)}
                onArchive={() => setArchiveTarget(s)}
                onRestore={() => restoreMut.mutate(s.testSpecId)}
              />
            ))}
          </ul>
        )}
      </div>

      <CreateSpecModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        workspaceId={ws.id}
        onCreated={(s) => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ['testSpec', 'list', ws.id] });
          openSpec(s.testSpecId);
        }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}
        title="Archive test spec?"
        description={
          archiveTarget
            ? `"${archiveTarget.name}" will be archived for 30 days, then permanently deleted. You can restore it any time before that.`
            : ''
        }
        confirmText="Archive"
        tone="warning"
        onConfirm={() => {
          if (archiveTarget) archiveMut.mutate(archiveTarget.testSpecId);
        }}
      />
    </div>
  );
};

const SpecCard = ({
  spec, onOpen, onArchive, onRestore,
}: {
  spec: TestSpec;
  onOpen: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) => {
  const isArchived = spec.status === 'ARCHIVED';
  return (
    <li
      data-testid={`spec-card-${spec.testSpecId}`}
      className="group relative flex flex-col gap-2 rounded-lg border border-border bg-surface/40 p-4 transition-colors hover:border-primary/40 hover:bg-surface/60"
    >
      <button
        onClick={onOpen}
        data-testid={`spec-open-${spec.testSpecId}`}
        className="absolute inset-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`Open ${spec.name}`}
      />
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">
          {spec.name}
        </h3>
        <FormatBadge format={spec.format} />
      </div>
      <p className="line-clamp-2 min-h-[2.4em] text-[11px] text-text-muted">
        {spec.description ?? '—'}
      </p>
      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1" title="Test cases">
          <ListChecks className="h-3 w-3" /> {spec.testCaseCount} cases
        </span>
        <span className="flex items-center gap-1" title="Hash">
          <Hash className="h-3 w-3" /> <span className="font-mono">{spec.contentHash.slice(0, 8)}</span>
        </span>
        <span title="Size">{formatBytes(spec.fileSize)}</span>
        <span className="ml-auto" title={typeof spec.updatedAt === 'string' ? spec.updatedAt : ''}>
          {formatRelative(typeof spec.updatedAt === 'string' ? spec.updatedAt : '')}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <StatusBadge status={String(spec.status)} />
        <div className="relative z-10 flex items-center gap-1">
          {isArchived ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              data-testid={`spec-restore-${spec.testSpecId}`}
              aria-label="Restore"
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onArchive(); }}
              data-testid={`spec-archive-${spec.testSpecId}`}
              aria-label="Archive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
};

const EmptyState = ({ onCreate, archived }: { onCreate: () => void; archived: boolean }) => (
  <div className="flex h-full items-center justify-center" data-testid="specs-empty">
    <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/[0.06]">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-sm font-semibold">
        {archived ? 'No archived specs' : 'No test specs yet'}
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-xs text-text-muted">
        {archived
          ? 'When you archive a spec it lives here for 30 days before being purged.'
          : 'Drop an OpenAPI / Postman / HAR / cURL file or paste from URL to generate test cases automatically.'}
      </p>
      {!archived && (
        <Button size="sm" variant="primary" onClick={onCreate} className="mt-4" data-testid="specs-empty-create">
          <Plus className="h-3.5 w-3.5" /> Create your first spec
        </Button>
      )}
    </div>
  </div>
);
