/**
 * DropdownMenu — custom-styled wrapper over Radix dropdown.
 * Use for collection/folder/request action menus.
 *
 * Usage:
 *   <Dropdown trigger={<button>…</button>}>
 *     <DropdownItem icon={Plus} onClick={…}>Add folder</DropdownItem>
 *     <DropdownSep />
 *     <DropdownItem destructive icon={Trash2}>Delete</DropdownItem>
 *   </Dropdown>
 */
import {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  Separator,
} from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Dropdown = ({
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  testId,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  testId?: string;
}) => (
  <Root>
    <Trigger asChild>{trigger}</Trigger>
    <Portal>
      <Content
        align={align}
        side={side}
        sideOffset={4}
        data-testid={testId}
        /*
         * By default Radix returns focus to the trigger when the menu closes.
         * That steals focus from rename inputs / popovers that a menu item
         * just opened. Preventing the default hands focus back to React's
         * mount logic, letting inputs autoFocus normally.
         */
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn(
          'z-[120] min-w-[200px] rounded-lg border border-border bg-elevated p-1 shadow-lg',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        )}
      >
        {children}
      </Content>
    </Portal>
  </Root>
);

export const DropdownItem = ({
  icon: Icon,
  onClick,
  children,
  destructive,
  shortcut,
  testId,
  disabled,
}: {
  icon?: LucideIcon;
  onClick?: () => void;
  children: ReactNode;
  destructive?: boolean;
  shortcut?: string;
  testId?: string;
  disabled?: boolean;
}) => (
  <Item
    onSelect={onClick}
    disabled={disabled}
    data-testid={testId}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-xs outline-none transition-colors',
      'focus:bg-hover data-[highlighted]:bg-hover',
      destructive
        ? 'text-danger focus:bg-danger-muted data-[highlighted]:bg-danger-muted'
        : 'text-text-primary',
      disabled && 'pointer-events-none opacity-50',
    )}
  >
    {Icon && <Icon className="h-3.5 w-3.5" />}
    <span className="flex-1">{children}</span>
    {shortcut && (
      <kbd className="font-mono text-[10px] text-text-muted">{shortcut}</kbd>
    )}
  </Item>
);

export const DropdownSep = () => (
  <Separator className="my-1 h-px bg-border" />
);

export const DropdownLabel = ({ children }: { children: ReactNode }) => (
  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
    {children}
  </div>
);
