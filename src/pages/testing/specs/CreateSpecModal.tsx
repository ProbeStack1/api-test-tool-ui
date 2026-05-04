/**
 * CreateSpecModal — 3-mode entry into a new test-spec.
 *
 *   • Upload (paste/drop a file)   →  POST /api/v1/test-specs
 *   • From URL                     →  POST /api/v1/test-specs/from-url
 *   • From Library                 →  POST /api/v1/test-specs/from-library
 *
 * On success, the parent receives the created spec and routes to its
 * detail page. The modal is intentionally self-contained: the spec
 * service does all the network work.
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Upload, Link as LinkIcon, Library, FileText, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import {
  createTestSpecFromUpload,
  createTestSpecFromUrl,
  createTestSpecFromLibrary,
  detectSpecFormat,
  listLibraryItems,
  type TestSpec,
  type LibraryItem,
} from '@/services/testSpec.service';
import { FormatBadge } from '../shared/Badges';

type Mode = 'UPLOAD' | 'URL' | 'LIBRARY';

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onCreated: (spec: TestSpec) => void;
}

const MODE_TABS: { mode: Mode; label: string; icon: any; testId: string }[] = [
  { mode: 'UPLOAD',  label: 'Upload / paste', icon: Upload,    testId: 'create-spec-mode-upload' },
  { mode: 'URL',     label: 'From URL',       icon: LinkIcon,  testId: 'create-spec-mode-url' },
  { mode: 'LIBRARY', label: 'From Library',   icon: Library,   testId: 'create-spec-mode-library' },
];

export const CreateSpecModal = ({ open, onClose, workspaceId, onCreated }: Props) => {
  const [mode, setMode] = useState<Mode>('UPLOAD');

  // Upload state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [detected, setDetected] = useState<{ format: string; endpointCount?: number | null } | null>(null);

  // URL state
  const [urlName, setUrlName] = useState('');
  const [url, setUrl] = useState('');
  const [urlDescription, setUrlDescription] = useState('');

  // Library state
  const [libName, setLibName] = useState('');
  const [libItemId, setLibItemId] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setMode('UPLOAD');
      setName(''); setDescription(''); setContent(''); setDetected(null);
      setUrlName(''); setUrl(''); setUrlDescription('');
      setLibName(''); setLibItemId('');
      setError(null);
    }
  }, [open]);

  // Auto-detect format as user types content
  useEffect(() => {
    if (mode !== 'UPLOAD' || content.trim().length < 10) { setDetected(null); return; }
    const t = setTimeout(() => {
      detectSpecFormat(content).then(setDetected).catch(() => setDetected(null));
    }, 400);
    return () => clearTimeout(t);
  }, [content, mode]);

  // Library list (only on LIBRARY tab)
  const libQ = useQuery({
    queryKey: ['testSpec', 'library', 'create-modal'],
    queryFn: () => listLibraryItems({ status: 'ACTIVE', size: 50 }),
    enabled: open && mode === 'LIBRARY',
  });

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
    const text = await f.text();
    setContent(text);
  };

  const uploadMut = useMutation({
    mutationFn: () => createTestSpecFromUpload({
      workspaceId,
      name: name.trim(),
      description: description.trim() || undefined,
      content,
    }),
    onSuccess: (s) => onCreated(s),
    onError: (e: any) => setError(e?.message ?? 'Failed to create spec'),
  });
  const urlMut = useMutation({
    mutationFn: () => createTestSpecFromUrl({
      workspaceId,
      name: urlName.trim(),
      url: url.trim(),
      description: urlDescription.trim() || undefined,
    }),
    onSuccess: (s) => onCreated(s),
    onError: (e: any) => setError(e?.message ?? 'Failed to import from URL'),
  });
  const libMut = useMutation({
    mutationFn: () => createTestSpecFromLibrary({
      workspaceId,
      name: libName.trim(),
      libraryItemId: libItemId,
    }),
    onSuccess: (s) => onCreated(s),
    onError: (e: any) => setError(e?.message ?? 'Failed to import from library'),
  });

  const busy = uploadMut.isPending || urlMut.isPending || libMut.isPending;

  const canSubmit = useMemo(() => {
    if (mode === 'UPLOAD')  return name.trim().length > 0 && content.trim().length > 0;
    if (mode === 'URL')     return urlName.trim().length > 0 && /^https?:\/\//i.test(url.trim());
    if (mode === 'LIBRARY') return libName.trim().length > 0 && !!libItemId;
    return false;
  }, [mode, name, content, urlName, url, libName, libItemId]);

  const submit = () => {
    setError(null);
    if (mode === 'UPLOAD')  uploadMut.mutate();
    if (mode === 'URL')     urlMut.mutate();
    if (mode === 'LIBRARY') libMut.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New test spec"
      icon={FileText}
      size="lg"
      testId="create-spec-modal"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} data-testid="create-spec-cancel">Cancel</Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!canSubmit || busy}
            data-testid="create-spec-submit"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create spec
          </Button>
        </>
      }
    >
      {/* Mode tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface/40 p-1" role="tablist">
        {MODE_TABS.map((t) => {
          const isActive = mode === t.mode;
          return (
            <button
              key={t.mode}
              role="tab"
              aria-selected={isActive}
              data-testid={t.testId}
              onClick={() => setMode(t.mode)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/[0.10] text-text-primary shadow-sm ring-1 ring-primary/30'
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary',
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div data-testid="create-spec-error" className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {mode === 'UPLOAD' && (
        <div className="space-y-3">
          <Field label="Spec name" required>
            <input
              data-testid="create-spec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Users API v1"
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
                    id="create-spec-file"
                    data-testid="create-spec-file"
                    accept=".json,.yaml,.yml,.txt,.har"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <label htmlFor="create-spec-file" className="cursor-pointer rounded border border-border px-2 py-0.5 hover:bg-hover">
                    Choose file
                  </label>
                  {detected && (
                    <span className="flex items-center gap-1.5">
                      detected <FormatBadge format={detected.format} />
                      {detected.endpointCount != null && (
                        <span>· {detected.endpointCount} eps</span>
                      )}
                    </span>
                  )}
                </span>
              </span>
            }
            required
          >
            <textarea
              data-testid="create-spec-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste OpenAPI / Postman / HAR / cURL …"
              rows={10}
              className="block w-full resize-y rounded border border-border bg-probestack-bg px-2 py-1.5 font-mono text-[11px] leading-snug"
            />
          </Field>
        </div>
      )}

      {mode === 'URL' && (
        <div className="space-y-3">
          <Field label="Spec name" required>
            <input
              data-testid="create-spec-url-name"
              value={urlName}
              onChange={(e) => setUrlName(e.target.value)}
              placeholder="Petstore"
              className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
            />
          </Field>
          <Field label="Source URL" required>
            <input
              data-testid="create-spec-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
              className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
            />
          </Field>
          <Field label="Description">
            <input
              value={urlDescription}
              onChange={(e) => setUrlDescription(e.target.value)}
              placeholder="optional"
              className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
            />
          </Field>
          <p className="rounded-md bg-elevated/40 px-3 py-2 text-[10px] text-text-muted">
            The Java service fetches the spec on the server side, detects the format and parses
            the endpoints. Both `https://` and `http://` are supported.
          </p>
        </div>
      )}

      {mode === 'LIBRARY' && (
        <div className="space-y-3">
          <Field label="Workspace spec name" required>
            <input
              data-testid="create-spec-lib-name"
              value={libName}
              onChange={(e) => setLibName(e.target.value)}
              placeholder="Imported library spec"
              className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
            />
          </Field>
          <Field label="Library item" required>
            <div
              className="max-h-72 overflow-auto rounded-md border border-border"
              data-testid="create-spec-lib-list"
            >
              {libQ.isLoading && (
                <div className="p-3 text-xs text-text-muted">Loading library items…</div>
              )}
              {!libQ.isLoading && libQ.data?.content.length === 0 && (
                <div className="p-3 text-xs text-text-muted">
                  No library items yet. Create one from <strong>Spec Library</strong> first.
                </div>
              )}
              {libQ.data?.content.map((it: LibraryItem) => {
                const sel = libItemId === it.libraryItemId;
                return (
                  <button
                    key={it.libraryItemId}
                    data-testid={`create-spec-lib-item-${it.libraryItemId}`}
                    onClick={() => setLibItemId(it.libraryItemId)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left text-xs last:border-b-0',
                      sel ? 'bg-primary/[0.08]' : 'hover:bg-hover',
                    )}
                  >
                    <input type="radio" readOnly checked={sel} className="accent-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{it.name}</span>
                      <span className="block truncate text-[10px] text-text-muted">
                        {it.description || it.category || '—'}
                      </span>
                    </span>
                    <FormatBadge format={it.format} />
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      )}
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
