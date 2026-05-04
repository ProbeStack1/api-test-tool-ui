/**
 * Toggle — single source of truth for every switch/toggle in the app.
 * Change the design here and every settings/preference toggle updates.
 *
 * Sizes: sm (h-4), md (h-5 default), lg (h-6)
 * Tone : primary (brand) or success (green)
 */
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export type ToggleSize = 'sm' | 'md' | 'lg';
export type ToggleTone = 'primary' | 'success';

export interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  size?: ToggleSize;
  tone?: ToggleTone;
  disabled?: boolean;
  'data-testid'?: string;
  label?: string;
  className?: string;
}

const TRACK: Record<ToggleSize, string> = {
  sm: 'h-4 w-8',
  md: 'h-5 w-9',
  lg: 'h-6 w-11',
};
const KNOB: Record<ToggleSize, string> = {
  sm: 'h-3 w-3 top-0.5',
  md: 'h-4 w-4 top-0.5',
  lg: 'h-5 w-5 top-0.5',
};
const TRANSLATE: Record<ToggleSize, [string, string]> = {
  sm: ['translate-x-[2px]', 'translate-x-[18px]'],
  md: ['translate-x-0.5', 'translate-x-[18px]'],
  lg: ['translate-x-0.5', 'translate-x-[22px]'],
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ value, onChange, size = 'md', tone = 'primary', disabled, label, className, ...rest }, ref) => {
    const onBg =
      tone === 'success' ? 'bg-green-500' : 'bg-[var(--color-primary)]';
    const [offPos, onPos] = TRANSLATE[size];
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        data-testid={rest['data-testid']}
        className={cn(
          'relative shrink-0 rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          TRACK[size],
          value ? onBg : 'bg-[var(--color-border)]',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
      >
        <span
          className={cn(
            'absolute rounded-full bg-white shadow-sm transition-transform duration-150',
            KNOB[size],
            value ? onPos : offPos,
          )}
        />
      </button>
    );
  },
);
Toggle.displayName = 'Toggle';
