/**
 * DataFileUpload — upload widget for parameterising functional/load
 * runs with CSV/JSON iteration data (Task 3.3).
 *
 * Flow:
 *   1. User drops a `.csv` or `.json` file on the dropzone.
 *   2. Component POSTs to /data-files/upload with workspaceId.
 *   3. Backend stores file, returns id + preview (first 5 rows).
 *   4. Component bubbles up the fileId / path via `onUploaded` so the
 *      caller can stamp it into RunConfig.dataFileGcs.
 *
 * The preview table makes "did I upload the right file?" obvious
 * before the user kicks off a 200-iteration run.
 */
import { useRef, useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle2, Loader2, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { serviceUrl } from '@/lib/env';
import { createHttp } from '@/lib/http';

const BASE = `${serviceUrl('functionalTest')}/functional-tests/data-files`;
const http = createHttp('functionalTest');

interface UploadResult {
  fileId: string;
  fileName: string;
  storedPath: string;
  sizeBytes: number;
  rowCount: number;
  headers: string[];
  preview: Record<string, string>[];
}

interface Props {
  workspaceId?: string;
  onUploaded?: (file: UploadResult) => void;
  onCleared?: () => void;
  className?: string;
}

export function DataFileUpload({ workspaceId, onUploaded, onCleared, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const doUpload = async (f: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      if (workspaceId) fd.append('workspaceId', workspaceId);
      const r = await http.post(`${BASE}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = (r.data?.data ?? r.data) as UploadResult;
      setFile(data);
      onUploaded?.(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void doUpload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void doUpload(f);
  };

  const clear = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onCleared?.();
  };

  return (
    <div className={cn('rounded-md border border-border bg-surface', className)} data-testid="data-file-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        onChange={onPick}
        className="hidden"
        data-testid="data-file-input"
      />

      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-hover/30',
          )}
          data-testid="data-file-dropzone"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Upload className="h-5 w-5 text-text-muted" />}
          <div className="text-xs font-medium">
            {uploading ? 'Uploading…' : 'Drop CSV / JSON here, or click to browse'}
          </div>
          <div className="text-[10px] text-text-muted">First row is treated as the header in CSV mode</div>
        </div>
      ) : (
        <div className="p-3" data-testid="data-file-preview">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{file.fileName}</div>
                <div className="text-[10px] text-text-muted">
                  {file.rowCount} rows · {file.headers.length} columns · {(file.sizeBytes / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <button
                data-testid="data-file-clear"
                onClick={clear}
                className="rounded p-0.5 text-text-muted hover:bg-hover hover:text-danger"
                title="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {file.preview.length > 0 && (
            <div className="mt-2 overflow-x-auto rounded border border-border/60 bg-probestack-bg/30">
              <table className="w-full text-[10px]">
                <thead className="bg-elevated text-text-muted">
                  <tr>
                    {file.headers.slice(0, 8).map((h) => (
                      <th key={h} className="px-2 py-1 text-left font-semibold uppercase">{h}</th>
                    ))}
                    {file.headers.length > 8 && <th className="px-2 py-1 text-text-muted">+{file.headers.length - 8} more</th>}
                  </tr>
                </thead>
                <tbody>
                  {file.preview.map((row, i) => (
                    <tr key={i} className="border-t border-border/40">
                      {file.headers.slice(0, 8).map((h) => (
                        <td key={h} className="truncate px-2 py-1 font-mono">{row[h]}</td>
                      ))}
                      {file.headers.length > 8 && <td className="px-2 py-1 text-text-muted">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="m-2 flex items-start gap-1.5 rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-400">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default DataFileUpload;
