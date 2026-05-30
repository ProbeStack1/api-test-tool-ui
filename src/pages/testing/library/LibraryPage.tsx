/**
 * LibraryPage — `/projects/testing/library`.
 * Org-shared spec library: reusable Postman/OpenAPI specs that any
 * workspace can adopt via the "From Library" create flow.
 *
 * UI mirrors SpecsListPage (cards) but works against the org-scoped
 * `/api/v1/test-specs/library` endpoints.
 */
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Library, Plus, Search, Trash2, ArchiveRestore, Hash, FileText,
  RefreshCw, Loader2, Pencil, Maximize2, Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import {
  listLibraryItems, createLibraryItem, archiveLibraryItem, restoreLibraryItem,
  detectSpecFormat, updateLibraryItem, getLibraryItemContent,
  type LibraryItem, type SpecStatus,
} from '@/services/testSpec.service';
import { FormatBadge, StatusBadge, formatBytes, formatRelative } from '../shared/Badges';
import { cn } from '@/utils/cn';

export const LibraryPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SpecStatus>('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<LibraryItem | null>(null);
  const [editTarget, setEditTarget] = useState<LibraryItem | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['testSpec', 'library', status, search],
    queryFn: () => listLibraryItems({ status, search: search.trim() || undefined, size: 50 }),
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveLibraryItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testSpec', 'library'] }),
  });
  const restoreMut = useMutation({
    mutationFn: (id: string) => restoreLibraryItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testSpec', 'library'] }),
  });

  const items = data?.content ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="library-page">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/30 px-6 py-3">
        <div>
          <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Library className="h-4 w-4 text-primary" /> Spec Library
          </h1>
          <p className="text-[11px] text-text-muted">
            Org-shared reusable specs — adopt them into any workspace via the "From Library" tab in
            create-spec.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="library-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library…"
              className="h-8 w-56 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs"
            />
          </div>
          <div className="flex h-8 items-center rounded-md border border-border bg-probestack-bg p-0.5 text-[11px]">
            {(['ACTIVE', 'ARCHIVED'] as SpecStatus[]).map((s) => (
              <button
                key={s}
                data-testid={`library-filter-${s.toLowerCase()}`}
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
          <Button size="sm" variant="ghost" onClick={() => refetch()} data-testid="library-refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
          <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)} data-testid="library-create-btn">
            <Plus className="h-3.5 w-3.5" /> New library item
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="library-loading">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} archived={status === 'ARCHIVED'} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="library-grid">
            {items.map((it) => (
              <LibraryCard
                key={it.libraryItemId}
                item={it}
                onEdit={() => setEditTarget(it)}
                onArchive={() => setArchiveTarget(it)}
                onRestore={() => restoreMut.mutate(it.libraryItemId)}
              />
            ))}
          </ul>
        )}
      </div>

      <CreateLibraryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ['testSpec', 'library'] }); }}
      />

      <EditLibraryModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); qc.invalidateQueries({ queryKey: ['testSpec', 'library'] }); }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}
        title="Archive library item?"
        description={archiveTarget ? `"${archiveTarget.name}" will be archived for 30 days.` : ''}
        confirmText="Archive"
        tone="warning"
        onConfirm={async () => {
          if (archiveTarget) await archiveMut.mutateAsync(archiveTarget.libraryItemId);
        }}
      />
    </div>
  );
};

const LibraryCard = ({ item, onEdit, onArchive, onRestore }: { item: LibraryItem; onEdit: () => void; onArchive: () => void; onRestore: () => void }) => {
  const isArchived = item.status === 'ARCHIVED';
  return (
    <li
      data-testid={`library-card-${item.libraryItemId}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface/40 p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">{item.name}</h3>
        <FormatBadge format={item.format} />
      </div>
      <p className="line-clamp-2 min-h-[2.4em] text-[11px] text-text-muted">{item.description ?? '—'}</p>
      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        {item.category && <span className="rounded bg-elevated px-1.5 py-0.5">{item.category}</span>}
        <span className="flex items-center gap-1"><Hash className="h-3 w-3" /><span className="font-mono">{item.contentHash.slice(0, 8)}</span></span>
        <span>{formatBytes(item.fileSize)}</span>
        <span className="ml-auto">{formatRelative(typeof item.updatedAt === 'string' ? item.updatedAt : '')}</span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <StatusBadge status={String(item.status)} />
        <div className="flex items-center gap-1">
          {!isArchived && (
            <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`library-edit-${item.libraryItemId}`} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {isArchived ? (
            <Button size="sm" variant="ghost" onClick={onRestore} data-testid={`library-restore-${item.libraryItemId}`} aria-label="Restore">
              <ArchiveRestore className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onArchive} data-testid={`library-archive-${item.libraryItemId}`} aria-label="Archive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
};

const EmptyState = ({ onCreate, archived }: { onCreate: () => void; archived: boolean }) => (
  <div className="flex h-full items-center justify-center" data-testid="library-empty">
    <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/[0.06]">
        <Library className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-sm font-semibold">{archived ? 'No archived items' : 'Library is empty'}</h2>
      <p className="mx-auto mt-2 max-w-xs text-xs text-text-muted">
        {archived
          ? 'Archived items live here for 30 days before being purged.'
          : 'Add reusable OpenAPI/Postman/HAR specs once and adopt them across multiple workspaces.'}
      </p>
      {!archived && (
        <Button size="sm" variant="primary" onClick={onCreate} className="mt-4" data-testid="library-empty-create">
          <Plus className="h-3.5 w-3.5" /> Add first library item
        </Button>
      )}
    </div>
  </div>
);

/* ─────── create modal ─────────────────────────────────────────────── */
const CreateLibraryModal = ({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [detected, setDetected] = useState<{ format: string; endpointCount?: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName(''); setDescription(''); setCategory(''); setContent(''); setDetected(null); setError(null);
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
    setContent(await f.text());
  };

  const detect = async () => {
    if (content.trim().length < 10) return;
    try { setDetected(await detectSpecFormat(content)); } catch { setDetected(null); }
  };

  const mut = useMutation({
    mutationFn: () => createLibraryItem({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      content,
    }),
    onSuccess: () => { reset(); onCreated(); },
    onError: (e: any) => setError(e?.message ?? 'Failed to create library item'),
  });

  const canSubmit = name.trim().length > 0 && content.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="New library item"
      icon={Library}
      size="lg"
      testId="library-create-modal"
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} data-testid="library-create-cancel">Cancel</Button>
          <Button
            variant="primary"
            onClick={() => mut.mutate()}
            disabled={!canSubmit || mut.isPending}
            data-testid="library-create-submit"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add to library
          </Button>
        </>
      }
    >
      {error && (
        <div data-testid="library-create-error" className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <Field label="Name" required>
          <input
            data-testid="library-create-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Petstore reference"
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </Field>
        <Field label="Category">
          <input
            data-testid="library-create-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. payments / auth / public"
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="optional"
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </Field>
        <Field
          label={
            <span className="flex items-center justify-between gap-2">
              <span>Content</span>
              <span className="flex items-center gap-2 text-[10px] text-text-muted">
                <input
                  type="file"
                  id="library-create-file"
                  data-testid="library-create-file"
                  accept=".json,.yaml,.yml,.txt,.har"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <label htmlFor="library-create-file" className="cursor-pointer rounded border border-border px-2 py-0.5 hover:bg-hover">
                  Choose file
                </label>
                <button onClick={detect} type="button" className="rounded border border-border px-2 py-0.5 hover:bg-hover">
                  Detect format
                </button>
                {detected && <FormatBadge format={detected.format} />}
              </span>
            </span>
          }
          required
        >
          <textarea
            data-testid="library-create-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste OpenAPI / Postman / HAR / cURL …"
            rows={10}
            className="block w-full resize-y rounded border border-border bg-probestack-bg px-2 py-1.5 font-mono text-[11px] leading-snug"
          />
        </Field>
      </div>
    </Modal>
  );
};

const Field = ({ label, children, required }: { label: React.ReactNode; children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs">
    <span className="mb-1 block font-medium text-text-secondary">
      {label} {required && <span className="text-danger">*</span>}
    </span>
    {children}
  </label>
);


/* ─────── edit modal ────────────────────────────────────────────────
 * Lazily fetches the existing spec content the first time the modal
 * opens for a target item, then PATCHes name/description/category/
 * content via `updateLibraryItem`. Editing content is allowed because
 * library items are versioned by `contentHash`; the backend
 * regenerates hash + `fileSize` automatically on update.
 * Includes a maximize/minimize button so users can edit large specs
 * comfortably in an almost-full-screen Monaco editor.
 * ────────────────────────────────────────────────────────────────── */
const EditLibraryModal = ({
  target, onClose, onSaved,
}: { target: LibraryItem | null; onClose: () => void; onSaved: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [origContent, setOrigContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);

  // Pick the Monaco language based on the library item's declared format
  // so JSON/YAML syntax-highlight + lint work correctly.
  const lang = (() => {
    const f = (target?.format ?? '').toLowerCase();
    if (f.includes('yaml')) return 'yaml' as const;
    if (f === 'curl')      return 'shell' as const;
    return 'json' as const;
  })();

  // Reset form whenever a fresh target slides in.
  useEffect(() => {
    if (!target) return;
    setName(target.name ?? '');
    setDescription(target.description ?? '');
    setCategory(target.category ?? '');
    setContent('');
    setOrigContent('');
    setError(null);
    setMaximized(false);
    setLoading(true);
    getLibraryItemContent(target.libraryItemId)
      .then((c) => { setContent(c); setOrigContent(c); })
      .catch((e: any) => setError(e?.message ?? 'Could not load existing content'))
      .finally(() => setLoading(false));
  }, [target?.libraryItemId]);

  const mut = useMutation({
    mutationFn: () => updateLibraryItem(target!.libraryItemId, {
      name: name.trim() || undefined,
      description: description.trim() || null,
      category: category.trim() || null,
      // Only ship `content` when the user actually changed it — that
      // keeps the contentHash stable for metadata-only edits.
      content: content !== origContent ? content : undefined,
    }),
    onSuccess: () => onSaved(),
    onError: (e: any) => setError(e?.message ?? 'Failed to save'),
  });

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Edit "${target?.name ?? ''}"`}
      icon={Pencil}
      size={maximized ? 'xl' : 'lg'}
      testId="library-edit-modal"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || loading || !name.trim()}
            data-testid="library-edit-save"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </Button>
        </>
      }
    >
      {error && <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
      <div className="space-y-3">
        {!maximized && (
          <>
            <Field label="Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className="block w-full rounded border border-border bg-probestack-bg px-2 py-1.5 text-xs" data-testid="library-edit-name" />
            </Field>
            <Field label="Description">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="block w-full rounded border border-border bg-probestack-bg px-2 py-1.5 text-xs" />
            </Field>
            <Field label="Category">
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full rounded border border-border bg-probestack-bg px-2 py-1.5 text-xs" />
            </Field>
          </>
        )}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              {loading ? 'Loading existing content…' : `Content (${lang})`}
            </span>
            <button
              type="button"
              onClick={() => setMaximized((m) => !m)}
              data-testid="library-edit-maximize"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
              title={maximized ? 'Exit full-editor view' : 'Maximize editor'}
            >
              {maximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              {maximized ? 'Exit' : 'Maximize'}
            </button>
          </div>
          <div
            className="overflow-hidden rounded border border-border"
            style={{ height: maximized ? '72vh' : '320px' }}
            data-testid="library-edit-content"
          >
            <MonacoEditor
              value={content}
              onChange={setContent}
              language={lang}
              readOnly={loading}
              minimap={maximized}
              testId="library-edit-monaco"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
