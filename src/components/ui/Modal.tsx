/**
 * Modal — single source of truth for modal styling across the app.
 *
 * Mirrors the Collection ImportModal aesthetic exactly so every modal
 * (mock create / mock import / future ones) looks identical out of the
 * box. Theme tokens (`bg-elevated`, `border-border`, `text-text-*`) flow
 * from one place, so changing the theme cascades everywhere.
 *
 * Composition:
 *   <Modal open={open} onClose={...} title="…" icon={Icon}
 *          footer={<><Button>Cancel</Button><Button>Submit</Button></>}>
 *     ...body
 *   </Modal>
 */
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  testId?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** When true, clicks on the dim backdrop close the modal. Default true. */
  closeOnBackdrop?: boolean;
}

const SIZE: Record<NonNullable<Props['size']>, string> = {
  sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl',
};

export const Modal = ({
  open, onClose, title, icon: Icon, size = 'md',
  testId, footer, children, closeOnBackdrop = true,
}: Props) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(
        'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-2xl',
        SIZE[size],
      )}>
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </h2>
          <button
            onClick={onClose}
            data-testid={testId ? `${testId}-close` : undefined}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
