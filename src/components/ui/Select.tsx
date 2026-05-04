/**
 * Select — Radix-backed custom dropdown that matches our UI tokens.
 * Drop-in replacement for native <select>.
 *
 *   <Select value={value} onChange={setValue} options={[
 *     { value: 'json', label: 'JSON' },
 *     { value: 'text', label: 'Text' },
 *   ]} />
 */
import * as RS from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const Select = ({
  value, onChange, options, className, disabled, testId,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
  testId?: string;
}) => (
  <RS.Root value={value} onValueChange={onChange} disabled={disabled}>
    <RS.Trigger
      data-testid={testId}
      className={cn(
        'inline-flex h-7 items-center justify-between gap-1.5 rounded-md border border-border bg-probestack-bg px-2 text-xs text-text-primary outline-none transition-colors hover:border-primary/50 focus:border-primary disabled:opacity-50',
        className,
      )}
    >
      <RS.Value />
      <RS.Icon>
        <ChevronDown className="h-3 w-3 text-text-muted" />
      </RS.Icon>
    </RS.Trigger>
    <RS.Portal>
      <RS.Content
        position="popper"
        sideOffset={4}
        className="z-[1500] min-w-[8rem] overflow-hidden rounded-md border border-border bg-elevated shadow-xl"
      >
        <RS.Viewport className="p-1">
          {options.map((o) => (
            <RS.Item
              key={o.value}
              value={o.value}
              disabled={o.disabled}
              className="relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-xs text-text-primary outline-none data-[highlighted]:bg-primary-muted data-[highlighted]:text-primary data-[disabled]:opacity-50"
            >
              <RS.ItemIndicator className="absolute left-1">
                <Check className="h-3 w-3 text-primary" />
              </RS.ItemIndicator>
              <RS.ItemText>
                <span className="ml-4">{o.label}</span>
              </RS.ItemText>
            </RS.Item>
          ))}
        </RS.Viewport>
      </RS.Content>
    </RS.Portal>
  </RS.Root>
);
