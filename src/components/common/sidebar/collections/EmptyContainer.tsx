/**
 * EmptyContainer — friendly empty-state shown when an expanded collection
 * or folder has zero children. Shows a tiny hint + "Add folder" + "Add
 * request" shortcut buttons (Postman parity).
 */
import { FolderPlus, FileText } from 'lucide-react';

export const EmptyContainer = ({
  kind, indent = 1, onAddFolder, onAddRequest,
}: {
  kind: 'collection' | 'folder';
  indent?: number;
  onAddFolder: () => void;
  onAddRequest: () => void;
}) => (
  <div
    data-testid={`empty-${kind}`}
    className="space-y-1 py-1.5 pr-2"
    style={{ paddingLeft: 4 + indent * 12 + 20 }}
  >
    <div className="text-[11px] italic text-text-muted">
      {kind === 'collection' ? 'This collection is empty.' : 'This folder is empty.'}
    </div>
    <div className="flex flex-wrap gap-1.5">
      <button
        data-testid={`empty-${kind}-add-folder`}
        onClick={onAddFolder}
        className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-primary/60 hover:text-primary"
      >
        <FolderPlus className="h-3 w-3" /> Add folder
      </button>
      <button
        data-testid={`empty-${kind}-add-request`}
        onClick={onAddRequest}
        className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-primary/60 hover:text-primary"
      >
        <FileText className="h-3 w-3" /> Add request
      </button>
    </div>
  </div>
);
