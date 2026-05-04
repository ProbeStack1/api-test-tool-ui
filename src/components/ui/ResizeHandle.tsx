/**
 * ResizeHandle — drag handle that nudges parent state via delta.
 * Reports `dragging` via the layout store so CSS transitions can be
 * suppressed during an active drag (prevents trailing lag).
 */
import { useCallback, useRef, type MouseEvent } from 'react';
import { cn } from '@/utils/cn';
import { useLayout } from '@/stores/layout.store';

interface Props {
  direction: 'horizontal' | 'vertical';
  /** Fired with the delta px since the last event. Use store nudge methods. */
  onResize: (delta: number) => void;
  className?: string;
  testId?: string;
  /** Flip the delta sign (useful for right-edge handles). */
  invert?: boolean;
}

export const ResizeHandle = ({ direction, onResize, className, testId, invert }: Props) => {
  const last = useRef(0);
  const setResizing = useLayout((s) => s.setResizing);

  const onMove = useCallback(
    (e: globalThis.MouseEvent) => {
      const current = direction === 'horizontal' ? e.clientX : e.clientY;
      const d = (current - last.current) * (invert ? -1 : 1);
      last.current = current;
      if (d !== 0) onResize(d);
    },
    [direction, onResize, invert],
  );

  const onUp = useCallback(() => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setResizing(false);
  }, [onMove, setResizing]);

  const onDown = (e: MouseEvent) => {
    e.preventDefault();
    last.current = direction === 'horizontal' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    setResizing(true);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      role="separator"
      data-testid={testId}
      onMouseDown={onDown}
      className={cn(
        'group relative shrink-0 transition-colors',
        direction === 'horizontal'
          ? 'w-[4px] cursor-col-resize hover:bg-primary/50'
          : 'h-[4px] cursor-row-resize hover:bg-primary/50',
        className,
      )}
    />
  );
};
