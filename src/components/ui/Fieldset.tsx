/**
 * Fieldset — fieldset-style card: rounded border with a floating legend
 * (label sitting inside the border at the top-left).
 *
 * Used everywhere the app needs a labeled form container (project details,
 * project creation, settings panels). Single place to tweak its look.
 */
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export const Fieldset = ({
  label,
  children,
  className,
  testId,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) => (
  <fieldset
    data-testid={testId}
    className={cn(
      'relative rounded-xl border border-border bg-surface/40 px-5 pb-4 pt-5',
      className,
    )}
  >
    <legend className="ml-2 px-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
      {label}
    </legend>
    {children}
  </fieldset>
);
