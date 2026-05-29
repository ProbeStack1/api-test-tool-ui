/**
 * ApiDocsPage — project-scoped API documentation surface backed by
 * `forgeq-api-documentation-mgmt-svc` (port 8087).
 *
 * Single-URL contract: stays at `/projects/api-docs`. All section/doc
 * navigation is held in local state — no nested routes.
 *
 * Sections (left rail):
 *   • Docs    — list/grid + inline create + detail editor with live HTML preview
 *   • Schemas — OpenAPI / Swagger / GraphQL / gRPC schemas with validate
 *   • Public  — quick glance at what published docs look like to anonymous readers
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, FileCode2, Globe2, Plus, Search, RefreshCw, Loader2, Save,
  Trash2, Globe, Eye, Send, Layers, History, Download, ExternalLink,
  CheckCircle2, AlertTriangle, Sparkles, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  listDocs, createDoc, getDoc, updateDoc, regenerateDoc, deleteDoc,
  publishDoc, unpublishDoc, snapshotDoc, listVersions, exportDoc, downloadBlob,
  listSchemas, createSchema, deleteSchema, validateSchema,
  type DocView, type SchemaView, type ExportFormat,
} from '@/services/apiDocs.service';
import { listCollections } from '@/services/collection.service';
import { cn } from '@/utils/cn';
import { Field, cls } from './components/_shared';
import { MarkdownEditor } from './components/MarkdownEditor';
import { DocPreviewPane } from './components/DocPreviewPane';

type Section = 'docs' | 'schemas' | 'public';

const SECTIONS: { key: Section; label: string; icon: any; testId: string; hint: string }[] = [
  { key: 'docs',    label: 'Documentation', icon: FileText,    testId: 'api-docs-nav-docs',    hint: 'Pages with rendered HTML' },
  { key: 'schemas', label: 'Schemas',       icon: FileCode2,   testId: 'api-docs-nav-schemas', hint: 'OpenAPI / Swagger / GraphQL' },
  { key: 'public',  label: 'Public',        icon: Globe2,      testId: 'api-docs-nav-public',  hint: 'Status of published pages' },
];

export const ApiDocsPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const [section, setSection] = useState<Section>('docs');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Deep link: collection 3-dot → "Generate doc" lands here with ?docId=…
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const docId = sp.get('docId');
    if (docId) {
      setSection('docs');
      setSelectedDocId(docId);
      // strip the param so a refresh doesn't keep re-applying it
      const url = new URL(window.location.href);
      url.searchParams.delete('docId');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  if (!ws) {
    return (
      <NoProjectEmpty testId="apidocs-no-workspace" icon="apidoc" surface="API docs" />
    );
  }

  return (
    <div className="flex h-full w-full" data-testid="api-docs-page">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface/40" data-testid="api-docs-subnav">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">API Documentation</h2>
          <p className="mt-0.5 text-[10px] text-text-muted">Docs · Schemas · Public</p>
        </div>
        <nav className="flex-1 overflow-auto p-2">
          {SECTIONS.map((n) => {
            const isActive = section === n.key;
            return (
              <button
                key={n.key}
                data-testid={n.testId}
                onClick={() => { setSection(n.key); setSelectedDocId(null); }}
                className={cn(
                  'mb-1 flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                  isActive ? 'bg-primary/10 text-text-primary ring-1 ring-primary/30' : 'text-text-secondary hover:bg-hover',
                )}
              >
                <n.icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-text-muted')} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold tracking-tight">{n.label}</span>
                  <span className="mt-0.5 block text-[10px] text-text-muted">{n.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">
        {section === 'docs' && (selectedDocId
          ? <DocDetailView docId={selectedDocId} onBack={() => setSelectedDocId(null)} workspaceId={ws.id} />
          : <DocsListView workspaceId={ws.id} onOpen={(id) => setSelectedDocId(id)} />)}
        {section === 'schemas' && <SchemasListView workspaceId={ws.id} />}
        {section === 'public' && <PublicDocsListView workspaceId={ws.id} onOpen={(id) => { setSection('docs'); setSelectedDocId(id); }} />}
      </main>
    </div>
  );
};

/* ────────────────────── DOCS LIST ─────────────────────────── */
const DocsListView = ({ workspaceId, onOpen }: { workspaceId: string; onOpen: (id: string) => void }) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [delTarget, setDelTarget] = useState<DocView | null>(null);

  const q = useQuery({
    queryKey: ['apiDocs', 'list', workspaceId],
    queryFn: () => listDocs(workspaceId, { size: 100 }),
    refetchInterval: 8000,
  });
  const all = q.data ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return all;
    const k = search.trim().toLowerCase();
    return all.filter((d) =>
      d.title.toLowerCase().includes(k) ||
      (d.subtitle ?? '').toLowerCase().includes(k) ||
      (d.tags ?? []).some((t) => t.toLowerCase().includes(k)),
    );
  }, [all, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['apiDocs', 'list'] });
  const delMut = useMutation({ mutationFn: (id: string) => deleteDoc(id), onSuccess: invalidate });

  const total     = all.length;
  const published = all.filter((d) => d.isPublished).length;
  const auto      = all.filter((d) => d.format === 'AUTO' || d.format === 'HYBRID').length;
  const manual    = all.filter((d) => d.format === 'MANUAL').length;

  return (
    <div className="flex h-full flex-col" data-testid="api-docs-list-view">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <FileText className="h-4 w-4 text-primary" /> Documentation
        </h1>
        <span className="text-[11px] text-text-muted">· Auto-generated or hand-written API pages with OpenAPI/Markdown export.</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" data-testid="api-docs-search"
              className="h-8 w-56 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs" />
          </div>
          <Button size="sm" variant="ghost" onClick={() => q.refetch()} data-testid="api-docs-refresh"><RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} /></Button>
          <Button size="sm" variant="primary" onClick={() => setCreating(true)} data-testid="api-docs-create-btn" disabled={creating}><Plus className="h-3.5 w-3.5" /> New doc</Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
          {/* KPIs */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="api-docs-kpi-grid">
            <Tile icon={FileText} label="Total"      value={total}     testId="api-docs-kpi-total" />
            <Tile icon={Globe2}   label="Published"  value={published} tone="success" testId="api-docs-kpi-pub" />
            <Tile icon={Sparkles} label="Auto / Hybrid" value={auto}    tone="amber"   testId="api-docs-kpi-auto" />
            <Tile icon={FileText} label="Manual"     value={manual}    tone="muted"   testId="api-docs-kpi-manual" />
          </section>

          {creating && (
            <InlineCreateDocForm
              workspaceId={workspaceId}
              onCreated={(d) => { setCreating(false); invalidate(); onOpen(d.docId); }}
              onCancel={() => setCreating(false)}
            />
          )}

          {q.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          ) : filtered.length === 0 && !creating ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center" data-testid="api-docs-empty">
              <FileText className="mb-3 h-10 w-10 text-text-muted" />
              <p className="text-sm font-semibold">{search ? 'No docs match your search' : 'No documentation yet'}</p>
              <p className="mb-4 mt-1 text-xs text-text-muted">{search ? 'Try a different keyword.' : 'Create your first page — pick MANUAL for hand-written content or AUTO/HYBRID to generate from a collection.'}</p>
              {!search && <Button variant="primary" onClick={() => setCreating(true)} data-testid="api-docs-create-empty"><Plus className="h-3.5 w-3.5" /> New doc</Button>}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="api-docs-grid">
              {filtered.map((d) => <DocCard key={d.docId} doc={d} onOpen={() => onOpen(d.docId)} onDelete={() => setDelTarget(d)} />)}
            </div>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={!!delTarget} onOpenChange={(o) => { if (!o) setDelTarget(null); }}
        title="Delete documentation?" description={delTarget ? `"${delTarget.title}" and all its versions will be permanently removed.` : ''}
        confirmText="Delete" tone="danger"
        onConfirm={async () => { if (delTarget) { await delMut.mutateAsync(delTarget.docId); setDelTarget(null); } }}
      />
    </div>
  );
};

const DocCard = ({ doc: d, onOpen, onDelete }: { doc: DocView; onOpen: () => void; onDelete: () => void }) => (
  <article data-testid={`api-doc-card-${d.docId}`}
    className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface/50 p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
    <div className="flex items-start gap-2">
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <h3 className="truncate text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">{d.title}</h3>
        {d.subtitle && <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{d.subtitle}</p>}
      </button>
      <FormatBadge format={d.format} />
    </div>
    <div className="flex flex-wrap items-center gap-1">
      <VisibilityBadge v={d.visibility} />
      {d.isPublished && (
        <span className="inline-flex items-center gap-1 rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">
          <Globe className="h-2.5 w-2.5" /> live
        </span>
      )}
      {(d.tags ?? []).slice(0, 3).map((t) => (
        <span key={t} className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[9px] font-medium text-primary">#{t}</span>
      ))}
    </div>
    <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-[10px] text-text-muted">
      <span data-testid={`api-doc-card-version-${d.docId}`}>v{d.version ?? 1} · {d.viewCount ?? 0} views</span>
      <span className="ml-auto flex items-center gap-0.5">
        <Button size="sm" variant="ghost" onClick={onOpen} aria-label="Open" data-testid={`api-doc-open-${d.docId}`}><Eye className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete" data-testid={`api-doc-delete-${d.docId}`}><Trash2 className="h-3.5 w-3.5" /></Button>
      </span>
    </div>
  </article>
);

const FormatBadge = ({ format }: { format: string }) => {
  const map: Record<string, string> = {
    MANUAL: 'border-border bg-elevated text-text-secondary',
    AUTO:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
    HYBRID: 'border-primary/30 bg-primary/10 text-primary',
  };
  return (
    <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider', map[format] ?? map.MANUAL)}>
      {format}
    </span>
  );
};
const VisibilityBadge = ({ v }: { v: string }) => (
  <span className="rounded border border-border bg-elevated px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-text-muted">{v}</span>
);
const Tile = ({ icon: Icon, label, value, tone = 'default', testId }: {
  icon: any; label: string; value: number | string; tone?: 'default' | 'success' | 'amber' | 'muted'; testId: string;
}) => {
  const tones: Record<string, string> = { default: 'text-text-primary', success: 'text-success', amber: 'text-amber-400', muted: 'text-text-muted' };
  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-surface/40 p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn('text-xl font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};

/* ────────────────────── INLINE CREATE DOC ─────────────────────────── */
const InlineCreateDocForm = ({ workspaceId, onCreated, onCancel }: {
  workspaceId: string; onCreated: (d: DocView) => void; onCancel: () => void;
}) => {
  const [format, setFormat] = useState<'MANUAL' | 'AUTO' | 'HYBRID'>('MANUAL');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  const collsQ = useQuery({
    queryKey: ['collection', 'list', workspaceId],
    queryFn: () => listCollections(workspaceId),
    enabled: format !== 'MANUAL',
  });

  const mut = useMutation({
    mutationFn: () => createDoc({
      workspaceId, title: title.trim(), subtitle: subtitle.trim() || undefined,
      format, collectionId: format !== 'MANUAL' ? collectionId : undefined,
      content: format === 'MANUAL' ? content : undefined,
      tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    }),
    onSuccess: (d) => onCreated(d),
    onError: (e: any) => setError(e?.message ?? 'Failed to create documentation'),
  });

  const canSubmit = !!title.trim() && (format === 'MANUAL' || !!collectionId);

  return (
    <section data-testid="inline-create-doc-form" className="rounded-2xl border border-border bg-surface/50 shadow-sm">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Create documentation page</h2>
          <p className="text-[11px] text-text-muted">Pick the source format · MANUAL for free-form Markdown · AUTO/HYBRID generates from a saved collection.</p>
        </div>
      </header>
      <div className="space-y-5 p-6">
        <div className="grid gap-2 sm:grid-cols-3" data-testid="api-doc-format-cards">
          {(['MANUAL', 'AUTO', 'HYBRID'] as const).map((f) => (
            <button
              key={f}
              data-testid={`api-doc-format-${f.toLowerCase()}`}
              onClick={() => setFormat(f)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left transition-all',
                format === f ? 'border-primary/60 bg-primary/[0.07] ring-1 ring-primary/30' : 'border-border bg-probestack-bg hover:bg-hover',
              )}
            >
              <div className="text-xs font-semibold tracking-tight">{f}</div>
              <div className="mt-0.5 text-[10px] text-text-muted">
                {f === 'MANUAL' ? 'Hand-written content' :
                 f === 'AUTO'   ? 'Generated from a collection' :
                                  'Generated + manual overrides'}
              </div>
            </button>
          ))}
        </div>

        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" data-testid="api-doc-create-error">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Title" required>
            <input data-testid="api-doc-create-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Payments API v2" className={cls()} />
          </Field>
          <Field label="Subtitle">
            <input data-testid="api-doc-create-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Public-facing payments endpoints" className={cls()} />
          </Field>
        </div>

        {format !== 'MANUAL' && (
          <Field label="Source collection" required hint="The collection's saved requests will be turned into a structured doc.">
            <select data-testid="api-doc-create-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={cls()}>
              <option value="">— select a collection —</option>
              {(collsQ.data ?? []).map((c: any) => (
                <option key={c.id ?? c.collectionId} value={c.id ?? c.collectionId}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        {format === 'MANUAL' && (
          <Field label="Content (Markdown)" hint="You can edit this and add OpenAPI snippets later.">
            <textarea data-testid="api-doc-create-content" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="# Welcome&#10;&#10;Endpoints …"
              className="block w-full resize-y rounded-md border border-border bg-probestack-bg px-3 py-2 font-mono text-xs leading-snug shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
        )}

        <Field label="Tags" hint="Comma-separated.">
          <input data-testid="api-doc-create-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="payments, public" className={cls()} />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} data-testid="api-doc-create-cancel">Cancel</Button>
          <Button variant="primary" onClick={() => mut.mutate()} disabled={!canSubmit || mut.isPending} data-testid="api-doc-create-submit">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create &amp; open
          </Button>
        </div>
      </div>
    </section>
  );
};


/* ────────────────────── DOC DETAIL EDITOR ─────────────────────────── */
const DocDetailView = ({ docId, onBack, workspaceId }: { docId: string; onBack: () => void; workspaceId: string }) => {
  const qc = useQueryClient();
  const docQ = useQuery({ queryKey: ['apiDocs', 'detail', docId], queryFn: () => getDoc(docId), refetchInterval: 8000 });
  const versionsQ = useQuery({ queryKey: ['apiDocs', 'versions', docId], queryFn: () => listVersions(docId) });

  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exportBusy, setExportBusy] = useState<ExportFormat | null>(null);
  const [publishSlug, setPublishSlug] = useState('');

  const d = docQ.data;
  // sync editor when doc loads
  useEffect(() => {
    if (!d) return;
    setEditTitle(d.title);
    setEditSubtitle(d.subtitle ?? '');
    setEditContent(d.content ?? '');
    setEditTags((d.tags ?? []).join(', '));
    setPublishSlug(d.slug ?? '');
  }, [d?.docId]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['apiDocs'] });
  const updateMut    = useMutation({ mutationFn: () => updateDoc(docId, {
    title: editTitle.trim(), subtitle: editSubtitle.trim() || undefined,
    content: editContent, tags: editTags.trim() ? editTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  }),
    onSuccess: () => { invalidate(); toast.success('Doc updated'); },
    onError: (e: any) => { setError(e?.message ?? 'Failed to save'); toast.error('Failed to save doc', { description: e?.message }); } });
  const regenMut     = useMutation({ mutationFn: () => regenerateDoc(docId),
    onSuccess: () => { invalidate(); toast.success('Doc regenerated from collection'); },
    onError: (e: any) => toast.error('Regenerate failed', { description: e?.message }) });
  const snapshotMut  = useMutation({ mutationFn: () => snapshotDoc(docId),
    onSuccess: () => { invalidate(); toast.success('Version snapshotted'); },
    onError: (e: any) => toast.error('Snapshot failed', { description: e?.message }) });
  // Publish & Unpublish need the loudest feedback — the user sees a
  // public URL change. Toast surfaces success + any backend conflict.
  const publishMut   = useMutation({ mutationFn: () => publishDoc(docId, { slug: publishSlug.trim() || undefined }),
    onSuccess: (res: any) => {
      invalidate();
      toast.success('Doc published', {
        description: res?.slug ? `Live at /docs/${res.slug}` : 'Live now',
      });
    },
    onError: (e: any) => {
      // The backend may return DOC_SLUG_TAKEN (409). Show a precise hint
      // instead of the misleading rate-limit copy users saw before.
      const code = e?.response?.data?.code || e?.code;
      const desc = e?.response?.data?.message || e?.message || 'Unknown error';
      toast.error(code === 'DOC_SLUG_TAKEN' ? 'Slug already in use' : 'Publish failed', { description: desc });
    },
  });
  const unpublishMut = useMutation({ mutationFn: () => unpublishDoc(docId),
    onSuccess: () => { invalidate(); toast.success('Doc unpublished — public link disabled'); },
    onError: (e: any) => toast.error('Unpublish failed', { description: e?.message }) });
  const deleteMut    = useMutation({ mutationFn: () => deleteDoc(docId),
    onSuccess: () => { invalidate(); toast.success('Doc deleted'); onBack(); },
    onError: (e: any) => toast.error('Delete failed', { description: e?.message }) });

  const onExport = async (fmt: ExportFormat) => {
    setExportBusy(fmt);
    try {
      const { blob, contentDisposition } = await exportDoc(docId, fmt);
      const ext = fmt === 'OPENAPI' ? 'openapi.json' : fmt === 'OPENAPI_YAML' ? 'openapi.yaml' :
                  fmt === 'FORGEQ' ? 'forgeq.apidoc.json' : fmt === 'HTML' ? 'html' : 'md';
      downloadBlob(blob, contentDisposition, `${(d?.title || docId).replace(/\s+/g, '-')}.${ext}`);
    } finally { setExportBusy(null); }
  };

  if (!d) return <div className="space-y-3 p-6"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="flex h-full flex-col" data-testid="api-doc-detail-view">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <Button size="sm" variant="ghost" onClick={onBack} aria-label="Back" data-testid="api-doc-back"><ArrowLeft className="h-3.5 w-3.5" /></Button>
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <FileText className="h-4 w-4 text-primary" />
          <span data-testid="api-doc-title">{d.title}</span>
        </h1>
        <FormatBadge format={d.format} />
        <VisibilityBadge v={d.visibility} />
        {d.isPublished && (
          <span className="inline-flex items-center gap-1 rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">
            <Globe className="h-2.5 w-2.5" /> published v{d.version}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {d.format !== 'MANUAL' && (
            <Button size="sm" variant="outline" onClick={() => regenMut.mutate()} disabled={regenMut.isPending} data-testid="api-doc-regenerate">
              {regenMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Regenerate
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => snapshotMut.mutate()} disabled={snapshotMut.isPending} data-testid="api-doc-snapshot">
            {snapshotMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />} Snapshot
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDel(true)} data-testid="api-doc-delete-btn"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </header>

      <div className="grid h-full grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
        {/* Editor */}
        <section className="flex h-full flex-col overflow-hidden border-r border-border bg-surface/30" data-testid="api-doc-editor">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Editor</h3>
            <Button size="sm" variant="primary" onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="ml-auto" data-testid="api-doc-save">
              {updateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          </div>
          {error && <div className="m-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-3">
              <Field label="Title"><input data-testid="api-doc-edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={cls()} /></Field>
              <Field label="Subtitle"><input data-testid="api-doc-edit-subtitle" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} className={cls()} /></Field>
              <Field label="Tags (comma-separated)"><input data-testid="api-doc-edit-tags" value={editTags} onChange={(e) => setEditTags(e.target.value)} className={cls()} /></Field>
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                helperHint={d.format !== 'MANUAL' ? 'Auto/Hybrid: hit Regenerate to refresh from the linked collection.' : undefined}
              />

              {/* Publish + export */}
              <section className="rounded-xl border border-border/60 bg-probestack-bg/40 p-3" data-testid="api-doc-publish-card">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-tight">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Publish &amp; share
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <input data-testid="api-doc-publish-slug" value={publishSlug} onChange={(e) => setPublishSlug(e.target.value)} placeholder="payments-v2" className={`${cls()} max-w-48 font-mono`} />
                  <Button size="sm" variant="primary" onClick={() => publishMut.mutate()} disabled={publishMut.isPending} data-testid="api-doc-publish-btn">
                    {publishMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} {d.isPublished ? 'Update slug' : 'Publish'}
                  </Button>
                  {d.isPublished && (
                    <Button size="sm" variant="outline" onClick={() => unpublishMut.mutate()} disabled={unpublishMut.isPending} data-testid="api-doc-unpublish-btn">
                      {unpublishMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Unpublish
                    </Button>
                  )}
                  {d.publicUrl && (
                    <a href={d.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-probestack-bg px-2 py-1 font-mono text-[10px] text-primary hover:bg-hover" data-testid="api-doc-public-url">
                      <ExternalLink className="h-3 w-3" /> {d.publicUrl}
                    </a>
                  )}
                </div>
                {/* Send the user back into the Request Builder, focused
                 *  on the SAME collection the doc was generated from.
                 *  We deliberately do NOT clone or re-import — that would
                 *  spawn duplicate collections each time. Instead, we
                 *  set the sidebar focus via URL params; the workspace
                 *  store reads them on mount. */}
                {d.collectionId && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <div className="flex-1 text-[11px] text-text-secondary">
                      This doc is linked to a Collection. Open it in the Request Builder to run the endpoints with variables, env, and assertions.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="api-doc-open-in-builder"
                      onClick={() => {
                        const wsId = d.workspaceId;
                        const cid  = d.collectionId!;
                        // Persist the focus hint so the sidebar can pick it up.
                        try {
                          sessionStorage.setItem('forgeq:sidebar:focusCollection', JSON.stringify({ workspaceId: wsId, collectionId: cid }));
                        } catch { /* ignore */ }
                        window.location.assign(`/projects/request-builder?collectionId=${encodeURIComponent(cid)}&workspaceId=${encodeURIComponent(wsId)}`);
                      }}
                    >
                      Open in Request Builder
                    </Button>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted">
                  <span>Export:</span>
                  {(['FORGEQ', 'OPENAPI', 'OPENAPI_YAML', 'HTML', 'MARKDOWN'] as ExportFormat[]).map((f) => (
                    <button key={f} onClick={() => onExport(f)} disabled={exportBusy !== null} data-testid={`api-doc-export-${f.toLowerCase()}`}
                      className="inline-flex items-center gap-1 rounded border border-border bg-probestack-bg px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50">
                      {exportBusy === f ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} {f}
                    </button>
                  ))}
                </div>
              </section>

              {/* Versions */}
              <section className="rounded-xl border border-border/60 bg-probestack-bg/40 p-3" data-testid="api-doc-versions-card">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-tight"><History className="h-3.5 w-3.5 text-primary" /> Version history</h4>
                {versionsQ.isLoading ? <Skeleton className="h-12 w-full" />
                  : (versionsQ.data ?? []).length === 0
                    ? <p className="text-[10px] text-text-muted">No snapshots yet — use <strong>Snapshot</strong> to freeze the current content as a version.</p>
                    : <ul className="space-y-1" data-testid="api-doc-versions-list">
                        {(versionsQ.data ?? []).map((v) => (
                          <li key={v.versionId} className="flex items-center gap-2 text-[10px]">
                            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-text-secondary">v{v.version}</span>
                            <span className="text-text-muted">{v.title}</span>
                            <span className="ml-auto text-text-muted">{v.createdByEmail}</span>
                          </li>
                        ))}
                      </ul>}
              </section>
            </div>
          </div>
        </section>

        {/* Right column — Preview / Try-It */}
        <DocPreviewPane doc={d} markdown={editContent} workspaceId={workspaceId} />
      </div>

      <ConfirmDialog
        open={confirmDel} onOpenChange={(o) => { if (!o) setConfirmDel(false); }}
        title="Delete documentation?"
        description={`"${d.title}" and all its versions will be permanently removed.`}
        confirmText="Delete" tone="danger"
        onConfirm={async () => { await deleteMut.mutateAsync(); setConfirmDel(false); }}
      />

      {/* Workspace ID kept available for any deep-linking actions */}
      <span className="hidden" data-testid={`api-doc-ws-${workspaceId}`} />
    </div>
  );
};

/* ────────────────────── SCHEMAS LIST ─────────────────────── */
const SchemasListView = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [delTarget, setDelTarget] = useState<SchemaView | null>(null);

  const q = useQuery({
    queryKey: ['apiDocs', 'schemas', workspaceId],
    queryFn: () => listSchemas(workspaceId, { size: 100 }),
    refetchInterval: 8000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['apiDocs', 'schemas'] });
  const validateMut = useMutation({ mutationFn: (id: string) => validateSchema(id), onSuccess: invalidate });
  const delMut      = useMutation({ mutationFn: (id: string) => deleteSchema(id),   onSuccess: invalidate });

  const items = q.data ?? [];
  return (
    <div className="flex h-full flex-col" data-testid="api-schemas-view">
      <header className="flex items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <FileCode2 className="h-4 w-4 text-primary" /> Schemas
        </h1>
        <span className="text-[11px] text-text-muted">· OpenAPI · Swagger · GraphQL · gRPC — validated server-side.</span>
        <Button size="sm" variant="primary" onClick={() => setCreating(true)} className="ml-auto" data-testid="api-schemas-create-btn" disabled={creating}>
          <Plus className="h-3.5 w-3.5" /> New schema
        </Button>
      </header>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
          {creating && <InlineCreateSchemaForm workspaceId={workspaceId} onCreated={() => { setCreating(false); invalidate(); }} onCancel={() => setCreating(false)} />}
          {q.isLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : items.length === 0 && !creating
              ? <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center" data-testid="api-schemas-empty">
                  <FileCode2 className="mb-3 h-10 w-10 text-text-muted" />
                  <p className="text-sm font-semibold">No schemas yet</p>
                  <p className="mb-4 mt-1 text-xs text-text-muted">Drop in an OpenAPI / Swagger / GraphQL / gRPC schema and validate it.</p>
                  <Button variant="primary" onClick={() => setCreating(true)} data-testid="api-schemas-create-empty"><Plus className="h-3.5 w-3.5" /> New schema</Button>
                </div>
              : items.length > 0
                ? <ul className="divide-y divide-border rounded-2xl border border-border bg-surface/40" data-testid="api-schemas-list">
                    {items.map((s) => (
                      <li key={s.schemaId} className="flex items-center gap-3 px-4 py-3 text-xs" data-testid={`api-schema-row-${s.schemaId}`}>
                        <FileCode2 className="h-4 w-4 text-text-muted" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{s.name}</span>
                            <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">{s.schemaType}</span>
                            <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">{s.schemaFormat}</span>
                            {s.version && <span className="font-mono text-[10px] text-text-muted">v{s.version}</span>}
                            {s.isValid === true && <span className="inline-flex items-center gap-1 rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success"><CheckCircle2 className="h-2.5 w-2.5" /> valid</span>}
                            {s.isValid === false && <span className="inline-flex items-center gap-1 rounded border border-danger/30 bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-danger"><AlertTriangle className="h-2.5 w-2.5" /> invalid</span>}
                          </div>
                          {s.description && <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted">{s.description}</p>}
                          {s.isValid === false && (s.validationErrors ?? []).length > 0 && (
                            <ul className="mt-1 list-disc pl-4 text-[10px] text-danger">
                              {(s.validationErrors ?? []).slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => validateMut.mutate(s.schemaId)} disabled={validateMut.isPending} data-testid={`api-schema-validate-${s.schemaId}`}>Validate</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDelTarget(s)} data-testid={`api-schema-delete-${s.schemaId}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </li>
                    ))}
                  </ul>
                : null
          }
        </div>
      </div>
      <ConfirmDialog
        open={!!delTarget} onOpenChange={(o) => { if (!o) setDelTarget(null); }}
        title="Delete schema?" description={delTarget ? `"${delTarget.name}" will be permanently removed.` : ''}
        confirmText="Delete" tone="danger"
        onConfirm={async () => { if (delTarget) { await delMut.mutateAsync(delTarget.schemaId); setDelTarget(null); } }}
      />
    </div>
  );
};

const InlineCreateSchemaForm = ({ workspaceId, onCreated, onCancel }: {
  workspaceId: string; onCreated: () => void; onCancel: () => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schemaType, setSchemaType] = useState<'openapi' | 'swagger' | 'graphql' | 'grpc'>('openapi');
  const [schemaFormat, setSchemaFormat] = useState<'json' | 'yaml'>('json');
  const [schemaContent, setSchemaContent] = useState('');
  const [version, setVersion] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => createSchema({
      workspaceId, name: name.trim(), description: description.trim() || undefined,
      schemaType, schemaFormat, schemaContent,
      version: version.trim() || undefined, sourceUrl: sourceUrl.trim() || undefined,
    }),
    onSuccess: () => onCreated(),
    onError: (e: any) => setError(e?.message ?? 'Failed to create schema'),
  });
  const canSubmit = !!name.trim() && !!schemaContent.trim();

  return (
    <section data-testid="inline-create-schema-form" className="rounded-2xl border border-border bg-surface/50 shadow-sm">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"><FileCode2 className="h-4 w-4" /></span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Add a schema</h2>
          <p className="text-[11px] text-text-muted">Paste content directly · server validates on submit.</p>
        </div>
      </header>
      <div className="space-y-4 p-6">
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" data-testid="api-schema-create-error">{error}</div>}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Name" required>
            <input data-testid="api-schema-create-name" value={name} onChange={(e) => setName(e.target.value)} className={cls()} placeholder="Payments OpenAPI v2" />
          </Field>
          <Field label="Source URL" hint="Optional original URL.">
            <input data-testid="api-schema-create-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={cls()} placeholder="https://api.acme.com/openapi.json" />
          </Field>
        </div>
        <Field label="Description"><input data-testid="api-schema-create-desc" value={description} onChange={(e) => setDescription(e.target.value)} className={cls()} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type" required>
            <select data-testid="api-schema-create-type" value={schemaType} onChange={(e) => setSchemaType(e.target.value as any)} className={cls()}>
              <option value="openapi">openapi</option><option value="swagger">swagger</option>
              <option value="graphql">graphql</option><option value="grpc">grpc</option>
            </select>
          </Field>
          <Field label="Format" required>
            <select data-testid="api-schema-create-format" value={schemaFormat} onChange={(e) => setSchemaFormat(e.target.value as any)} className={cls()}>
              <option value="json">json</option><option value="yaml">yaml</option>
            </select>
          </Field>
          <Field label="Version"><input data-testid="api-schema-create-version" value={version} onChange={(e) => setVersion(e.target.value)} className={cls()} placeholder="2.1.0" /></Field>
        </div>
        <Field label="Content" required>
          <textarea data-testid="api-schema-create-content" rows={10} value={schemaContent} onChange={(e) => setSchemaContent(e.target.value)} placeholder="paste schema…"
            className="block w-full resize-y rounded-md border border-border bg-probestack-bg px-3 py-2 font-mono text-[11px] leading-snug shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </Field>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} data-testid="api-schema-create-cancel">Cancel</Button>
          <Button variant="primary" onClick={() => mut.mutate()} disabled={!canSubmit || mut.isPending} data-testid="api-schema-create-submit">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create &amp; validate
          </Button>
        </div>
      </div>
    </section>
  );
};

/* ────────────────────── PUBLIC OVERVIEW ─────────────────────────── */
const PublicDocsListView = ({ workspaceId, onOpen }: { workspaceId: string; onOpen: (id: string) => void }) => {
  const q = useQuery({ queryKey: ['apiDocs', 'list', workspaceId], queryFn: () => listDocs(workspaceId, { size: 100 }) });
  const published = (q.data ?? []).filter((d) => d.isPublished);

  return (
    <div className="flex h-full flex-col" data-testid="api-public-view">
      <header className="flex items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Globe2 className="h-4 w-4 text-primary" /> Public documentation
        </h1>
        <span className="text-[11px] text-text-muted">· What anonymous readers see at <code className="rounded bg-elevated px-1.5 py-0.5 font-mono">/docs/&lt;slug&gt;</code></span>
      </header>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {q.isLoading ? <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
            : published.length === 0
              ? <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center" data-testid="api-public-empty">
                  <Globe2 className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                  <p className="text-sm font-semibold">No published pages yet</p>
                  <p className="mt-1 text-xs text-text-muted">Open a doc &amp; hit <strong>Publish</strong> to make it public.</p>
                </div>
              : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="api-public-grid">
                  {published.map((d) => (
                    <li key={d.docId} data-testid={`api-public-card-${d.docId}`}>
                      <button onClick={() => onOpen(d.docId)}
                        className="group flex w-full flex-col gap-2 rounded-2xl border border-success/30 bg-success/[0.04] p-4 text-left shadow-sm transition-all hover:border-success/60 hover:shadow-md">
                        <div className="flex items-start gap-2">
                          <Globe className="mt-0.5 h-4 w-4 text-success" />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold tracking-tight">{d.title}</h3>
                            {d.subtitle && <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{d.subtitle}</p>}
                          </div>
                          <span className="rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[9px] text-success">v{d.version}</span>
                        </div>
                        {d.publicUrl && <code className="truncate rounded bg-elevated px-2 py-1 font-mono text-[10px] text-primary">{d.publicUrl}</code>}
                      </button>
                    </li>
                  ))}
                </ul>
          }
        </div>
      </div>
    </div>
  );
};

