/**
 * FilePickerPopover — Postman-parity file chooser opened from a form-data
 * value cell when its row type is "file".
 *
 * Behaviour:
 *   • "Upload from local machine" → opens the native picker. The chosen
 *     file becomes the row's value immediately so the request can be
 *     sent, BUT it is marked as "local-only": a yellow warning badge
 *     renders next to the value, and a "Upload file to ForgeQ" icon
 *     appears on the right. Clicking it pushes the file to the backend
 *     (GCS if configured, local fallback otherwise) and swaps the row
 *     to a "forgeq" file reference.
 *   • List of already-uploaded workspace files below (fetched live from
 *     GET /api/v1/files?workspaceId=…). Clicking a file sets the row
 *     value to the forgeq file reference.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, File as FileIcon, AlertTriangle, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { listFiles, uploadFile, type ForgeQFile } from '@/services/files.service';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/utils/cn';

/** The row's value shape when its type is "file". */
export type FileValue =
  | { kind: 'none' }
  /** Freshly picked local file — not yet uploaded to ForgeQ. */
  | { kind: 'local'; file: File; name: string; size: number }
  /** Reference to an already-uploaded ForgeQ file. */
  | { kind: 'forgeq'; id: string; name: string; size: number; url?: string };

export const FilePickerPopover = ({
  value, onChange, anchorRef, onClose,
}: {
  value: FileValue;
  onChange: (v: FileValue) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const { data: files = [] } = useQuery({
    queryKey: ['files', ws?.id],
    queryFn: () => listFiles(ws!.id),
    enabled: !!ws?.id,
  });
  const fileInput = useRef<HTMLInputElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 360) });
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !a.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;

  const pick = (f: File) => {
    onChange({ kind: 'local', file: f, name: f.name, size: f.size });
    onClose();
  };

  return (
    <div
      ref={popRef}
      data-testid="file-picker-popover"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 1500 }}
      className="rounded-lg border border-border bg-elevated p-2 shadow-2xl"
    >
      <button
        data-testid="file-pick-local"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInput.current?.click(); }}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-text-primary transition-colors hover:bg-primary-muted hover:text-primary"
      >
        <UploadCloud className="h-4 w-4 text-primary" />
        <span className="flex-1">Upload from local machine</span>
      </button>
      <input
        ref={fileInput}
        type="file"
        data-testid="file-pick-local-input"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -9999 }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = '';
        }}
      />

      {files.length > 0 && (
        <>
          <div className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Files in this project
          </div>
          <div className="mt-1 max-h-56 overflow-auto">
            {files.map((f) => (
              <button
                key={f.id}
                data-testid={`file-pick-remote-${f.id}`}
                onClick={() => { onChange({ kind: 'forgeq', id: f.id, name: f.name, size: f.size, url: f.url }); onClose(); }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[11px] text-text-primary transition-colors hover:bg-hover"
              >
                <FileIcon className="h-3.5 w-3.5 text-text-muted" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-[10px] text-text-muted">{fmtBytes(f.size)}</span>
                {f.provider === 'gcs' && <Cloud className="h-3 w-3 text-green-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const FileValueDisplay = ({
  value, onChange,
}: { value: FileValue; onChange: (v: FileValue) => void }) => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (value.kind !== 'local' || !ws) return;
    try {
      setUploading(true);
      const up = await uploadFile(ws.id, value.file);
      onChange({ kind: 'forgeq', id: up.id, name: up.name, size: up.size, url: up.url });
      qc.invalidateQueries({ queryKey: ['files', ws.id] });
      toast.success(`Uploaded "${up.name}" to ForgeQ`);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (value.kind === 'none') return null;

  const isLocal = value.kind === 'local';
  return (
    <div
      data-testid="file-value-display"
      className={cn(
        'flex items-center gap-2 rounded-md border px-2 py-1',
        isLocal ? 'border-yellow-500/60 bg-yellow-500/10' : 'border-border bg-surface/50',
      )}
    >
      {isLocal ? (
        <span
          data-testid="file-local-warning"
          title={
            `${value.name}\n${fmtBytes(value.size)}, Using this file from a local system\n\n` +
            `The file above is not in your working directory, and will be unavailable to your teammates when you share the request. ` +
            `You can either set up your working directory in Settings, or upload the file to ForgeQ.`
          }
          className="flex items-center text-yellow-500"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      ) : (
        <Cloud className="h-3.5 w-3.5 text-green-500" />
      )}
      <span className="min-w-0 flex-1 truncate text-[11px] text-text-primary" data-testid="file-value-name">{value.name}</span>
      <span className="shrink-0 text-[10px] text-text-muted">{fmtBytes(value.size)}</span>
      {isLocal && (
        <button
          data-testid="file-upload-forgeq"
          onClick={upload}
          disabled={uploading}
          title="Upload file to ForgeQ"
          className="flex h-5 w-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-primary-muted hover:text-primary disabled:opacity-50"
        >
          <UploadCloud className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};
