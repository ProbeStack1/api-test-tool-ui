/**
 * FilePreview — read-only display of the currently selected file: name,
 * size, detected/forced format, plus a scrollable content snippet.
 */
import { File as FileIcon, X } from 'lucide-react';

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

export const FilePreview = ({
  file, content, onClear,
}: {
  file: File;
  content: string;
  onClear: () => void;
}) => (
  <div className="space-y-2" data-testid="import-file-preview">
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-muted text-primary">
        <FileIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary" data-testid="import-file-name">
          {file.name}
        </div>
        <div className="text-[11px] text-text-muted" data-testid="import-file-size">
          {fmtBytes(file.size)} · {file.type || 'text'}
        </div>
      </div>
      <button
        onClick={onClear}
        data-testid="import-file-clear"
        aria-label="Remove file"
        className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover hover:text-red-500"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
    <pre
      data-testid="import-file-content"
      className="max-h-48 overflow-auto rounded-md border border-border bg-probestack-bg/60 p-3 font-mono text-[11px] leading-relaxed text-text-secondary"
    >
      {(content ?? '').slice(0, 4000)}
      {content.length > 4000 && '\n\n… (truncated)'}
    </pre>
  </div>
);
