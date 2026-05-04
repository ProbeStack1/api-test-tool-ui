/**
 * ImportModal — Postman-style import.
 *
 * Flow:
 *   1. User clicks "Import" in Collections sidebar.
 *   2. Modal opens with a dropzone; clicking opens the native file picker
 *      (restricted to our supported extensions).
 *   3. When a file is chosen:
 *       - read as text client-side (≤ 5 MB),
 *       - POST to /collections/import/detect to sniff the format,
 *       - show the FilePreview + FormatPicker (Auto-detect highlighted
 *         with the detected format badge).
 *   4. User clicks "Import" → file is uploaded with the chosen format,
 *      backend parses & persists, modal closes, collections refetch.
 *
 *  No junk files: the <input accept=""> restricts selection AND we
 *  validate extension client-side before accepting a drop.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, X, Loader2, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  detectImportFormat, importCollectionFile, listImportFormats,
} from '@/services/collection.service';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { FormatPicker } from './FormatPicker';
import { FilePreview } from './FilePreview';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const ImportModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const { data: formats = [] } = useQuery({
    queryKey: ['import-formats'],
    queryFn: listImportFormats,
    enabled: open,
  });
  const acceptAttr = useMemo(
    () => Array.from(new Set(formats.flatMap((f) => f.extensions))).join(','),
    [formats],
  );
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [detected, setDetected] = useState<string | null>(null);
  const [format, setFormat] = useState<string>('auto');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) { setFile(null); setContent(''); setDetected(null); setFormat('auto'); }
  }, [open]);

  const isSupportedExt = (name: string) =>
    formats.some((f) => f.extensions.some((ext) => name.toLowerCase().endsWith(ext)));

  const pickFile = async (f: File) => {
    if (!isSupportedExt(f.name)) {
      toast.error(`Unsupported file. Allowed: ${acceptAttr}`);
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      return;
    }
    const text = await f.text();
    setFile(f);
    setContent(text);
    try {
      const det = await detectImportFormat(text);
      setDetected(det);
    } catch { setDetected(null); }
  };

  const onImport = async () => {
    if (!file || !ws) return;
    try {
      setBusy(true);
      const summary = await importCollectionFile(ws.id, file, format);
      const name = summary?.name ?? file.name.replace(/\.[^.]+$/, '');
      const reqCount = summary?.requestCount ?? 0;
      const folderCount = summary?.folderCount ?? 0;
      toast.success(
        `Imported "${name}" · ${folderCount} folder${folderCount === 1 ? '' : 's'} · ${reqCount} request${reqCount === 1 ? '' : 's'}`,
      );
      // Refresh every queue that surfaces the freshly-imported entities so
      // the sidebar shows the new collection + its folders + its requests
      // immediately, no F5 needed.
      qc.invalidateQueries({ queryKey: ['collections', ws.id] });
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['environments'] });
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="import-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FolderPlus className="h-4 w-4 text-primary" />
            Import collection
          </h2>
          <button
            onClick={onClose}
            data-testid="import-close"
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-auto px-5 py-4">
          {!file ? (
            <div
              data-testid="import-dropzone"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) await pickFile(f);
              }}
              onClick={() => fileInput.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary-muted' : 'border-border hover:border-primary/60 hover:bg-hover/50'
              }`}
            >
              <UploadCloud className="h-8 w-8 text-text-muted" />
              <div className="text-sm font-medium text-text-primary">
                Drop your collection file here, or click to browse
              </div>
              <div className="text-[11px] text-text-muted">
                Supported: Postman · OpenAPI · Insomnia · HAR · cURL · ForgeQ
              </div>
              <div className="mt-1 text-[10px] text-text-muted">
                Max 5 MB · {acceptAttr}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept={acceptAttr}
                data-testid="import-file-input"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await pickFile(f);
                  e.target.value = ''; // allow re-picking the same file
                }}
              />
            </div>
          ) : (
            <>
              <FilePreview
                file={file}
                content={content}
                onClear={() => { setFile(null); setContent(''); setDetected(null); setFormat('auto'); }}
              />
              <FormatPicker
                formats={formats}
                value={format}
                onChange={setFormat}
                detected={detected}
              />
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose} data-testid="import-cancel">Cancel</Button>
          <Button
            variant="primary"
            disabled={!file || busy || !ws}
            onClick={onImport}
            data-testid="import-submit"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Import
          </Button>
        </footer>
      </div>
    </div>
  );
};
