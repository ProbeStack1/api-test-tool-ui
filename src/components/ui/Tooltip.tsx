/**
 * Tooltip — custom-styled Radix tooltip.
 * Branded surface, subtle arrow, fast show/hide.
 *
 * Usage:
 *   <Tooltip content="Send request">
 *     <button>…</button>
 *   </Tooltip>
 */
import {
  Root,
  Trigger,
  Portal,
  Content,
  Arrow,
} from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delay?: number;
  shortcut?: string;
}

export const Tooltip = ({
  content,
  children,
  side = 'bottom',
  align = 'center',
  delay = 120,
  shortcut,
}: TooltipProps) => (
  <Root delayDuration={delay}>
    <Trigger asChild>{children}</Trigger>
    <Portal>
      <Content
        side={side}
        align={align}
        sideOffset={6}
        className={cn(
          'z-[100] flex items-center gap-2 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-[11px] text-text-primary shadow-md',
          'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        )}
      >
        <span>{content}</span>
        {shortcut && (
          <kbd className="rounded border border-border bg-probestack-bg px-1 font-mono text-[10px] text-text-secondary">
            {shortcut}
          </kbd>
        )}
        <Arrow className="fill-[var(--color-elevated)] stroke-[var(--color-border)]" strokeWidth={1} />
      </Content>
    </Portal>
  </Root>
);
