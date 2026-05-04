/**
 * Spinner — branded loading indicator.
 * Later replaceable with a custom animated logo spinner.
 */
import { cn } from '@/utils/cn';

export const Spinner = ({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const dim = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <span
      data-testid="spinner"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-border border-t-primary',
        dim,
        className,
      )}
    />
  );
};
