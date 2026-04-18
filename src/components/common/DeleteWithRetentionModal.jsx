import React, { useState, useEffect, useRef } from 'react';
import { Archive, Trash2, AlertTriangle, X } from 'lucide-react';

/**
 * Compact, anchored delete-confirm popover (no full-screen blur). Positions
 * itself near the element that opened it — mirroring the mock-server delete
 * confirmation UX.
 *
 * Actions:
 *   • Archive (with 7/14/21/30 retention dropdown)
 *   • Delete Permanently (2-step confirm)
 *   • Cancel (implicit — click outside / Escape)
 *
 * Props:
 *   - open:         boolean
 *   - anchorRect:   DOMRect | null — rect of the element that opened us
 *   - itemName:     string
 *   - itemType:     'Test Spec' | 'Library Item' | string
 *   - onCancel:     () => void
 *   - onArchive:    (retentionDays: number) => void | Promise<void>
 *   - onDelete:     () => void | Promise<void>
 *   - busy:         boolean
 */
export default function DeleteWithRetentionModal({
  open,
  anchorRect,
  itemName,
  itemType = 'item',
  onCancel,
  onArchive,
  onDelete,
  busy = false,
}) {
  const [retentionDays, setRetentionDays] = useState(7);
  const [confirmHardDelete, setConfirmHardDelete] = useState(false);
  const popoverRef = useRef(null);

  // Reset the "second-press confirm" state whenever the popover re-opens.
  useEffect(() => {
    if (!open) setConfirmHardDelete(false);
  }, [open]);

  // Dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel?.(); };
    const onClick = (e) => {
      if (busy) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKey);
    // Capture-phase so we run before any child handlers.
    window.addEventListener('mousedown', onClick, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick, true);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  // Calculate position — prefer right-of-anchor, fall back to left if no room.
  const POP_WIDTH = 320;
  const POP_HEIGHT_ESTIMATE = 340;
  let left = 0;
  let top = 0;
  if (anchorRect) {
    left = anchorRect.right + 8;
    top = anchorRect.top;
    if (left + POP_WIDTH > window.innerWidth - 16) {
      // Flip to the left of the anchor.
      left = Math.max(16, anchorRect.left - POP_WIDTH - 8);
    }
    if (top + POP_HEIGHT_ESTIMATE > window.innerHeight - 16) {
      top = Math.max(16, window.innerHeight - POP_HEIGHT_ESTIMATE - 16);
    }
  } else {
    left = window.innerWidth / 2 - POP_WIDTH / 2;
    top = window.innerHeight / 2 - POP_HEIGHT_ESTIMATE / 2;
  }

  const handleArchive = () => onArchive?.(retentionDays);
  const handleDelete = () => {
    if (!confirmHardDelete) {
      setConfirmHardDelete(true);
      return;
    }
    onDelete?.();
  };

  return (
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${POP_WIDTH}px`, zIndex: 60 }}
      className="bg-[var(--color-input-bg)] border border-dark-700 rounded-lg shadow-2xl overflow-hidden"
      data-testid="delete-retention-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-dark-700 bg-[var(--color-card-bg)] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Delete <i className='text-sm'>{itemName || 'Untitled'}</i></p>
            <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
              {itemType}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          disabled={busy}
          className="p-1 rounded text-gray-400 hover:text-white cursor-pointer hover:bg-dark-700 disabled:opacity-50 shrink-0"
          data-testid="delete-retention-close"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Archive */}
      <div className="px-3.5 py-3 space-y-2 border-b border-dark-700">
        <div className="flex items-center gap-1.5">
          <Archive className="h-3.5 w-3.5 text-amber-400" />
          <p className="text-xs font-medium text-[var(--color-text-primary)]">Archive (recoverable)</p>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            disabled={busy}
            className="flex-1 bg-[var(--color-input-bg)] border border-dark-700 rounded-md px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40 disabled:opacity-60"
            data-testid="delete-retention-select"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={21}>21 days</option>
            <option value={30}>30 days</option>
          </select>
          <button
            onClick={handleArchive}
            disabled={busy}
            className="px-2.5 py-1 rounded-md text-xs cursor-pointer font-medium bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            data-testid="delete-retention-archive"
          >
            {busy ? '…' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Permanent delete */}
      <div className="px-3.5 py-3 space-y-2 bg-red-500/5">
        <div className="flex items-center gap-1.5">
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
          <p className="text-xs font-medium text-[var(--color-text-primary)]">Delete permanently</p>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
          {confirmHardDelete
            ? 'Press again to confirm — this cannot be undone.'
            : 'GCS content will also be removed. Cannot be undone.'}
        </p>
        <button
          onClick={handleDelete}
          disabled={busy}
          className={
            'w-full px-2.5 py-1.5 rounded-md text-xs cursor-pointer font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors ' +
            (confirmHardDelete
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30')
          }
          data-testid="delete-retention-permanent"
        >
          {busy ? 'Working…' : confirmHardDelete ? 'Confirm permanent delete' : 'Delete permanently'}
        </button>
      </div>
    </div>
  );
}
