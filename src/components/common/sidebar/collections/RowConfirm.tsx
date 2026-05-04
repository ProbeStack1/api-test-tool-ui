/**
 * RowConfirm — portal-rendered delete confirmation popover.
 *
 * - Opens ATTACHED to the row's right edge (floats into the main content
 *   area, so it never feels cramped inside the sidebar).
 * - Fixed positioning: computed from the trigger element's bounding rect.
 * - No background blur, no backdrop — just a tiny floating popover.
 * - Closes on outside click, Escape, or Cancel.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2 } from 'lucide-react';

export const RowConfirm = ({
  anchor, title, description, onCancel, onConfirm,
}: {
  anchor: HTMLElement | null;
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) => {
  const [busy, setBusy] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    // open to the RIGHT of the row, aligned to its top (drops down naturally)
    setPos({ top: r.bottom + 4, left: r.right + 8 });
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) onCancel();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  if (!pos) return null;

  // clamp so the popover never overflows the viewport
  const W = 256;
  const left = Math.min(pos.left, window.innerWidth - W - 8);
  const top = Math.min(pos.top, window.innerHeight - 140);

  return createPortal(
    <div
      ref={popRef}
      data-testid="row-confirm"
      role="dialog"
      style={{ position: 'fixed', top, left, width: W, zIndex: 10000 }}
      className="rounded-lg border border-border bg-elevated p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-1 flex items-start gap-2">
        <Trash2 className="mt-[1px] h-3.5 w-3.5 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1 text-[12px] font-semibold text-text-primary">{title}</div>
      </div>
      {description && (
        <div className="mb-2 pl-[22px] text-[11px] leading-snug text-text-secondary">
          {description}
        </div>
      )}
      <div className="flex justify-end gap-1.5">
        <button
          data-testid="row-confirm-cancel"
          disabled={busy}
          onClick={onCancel}
          className="h-6 rounded-md border border-border px-2 text-[11px] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
        >Cancel</button>
        <button
          data-testid="row-confirm-delete"
          disabled={busy}
          onClick={async () => { try { setBusy(true); await onConfirm(); } finally { setBusy(false); } }}
          className="flex h-6 items-center gap-1 rounded-md bg-red-500 px-2 text-[11px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />} Delete
        </button>
      </div>
    </div>,
    document.body,
  );
};
