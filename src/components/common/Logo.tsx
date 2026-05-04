/**
 * Brand logo — renders the client-approved image from /public/logo.png.
 * What : Centralized logo component (image + wordmark option).
 * Why  : Used in header, landing nav, auth screens; one source of truth.
 * Usage: <Logo variant="full" /> or <Logo variant="mark" />
 */
import { cn } from '@/utils/cn';

interface LogoProps {
  variant?: 'full' | 'mark';
  className?: string;
}

export const Logo = ({ variant = 'full', className }: LogoProps) => {
  if (variant === 'mark') {
    return (
      <img
        src="/justlogo.png"
        alt="ForgeQ"
        data-testid="logo-mark"
        className={cn('h-7 w-7 object-contain', className)}
      />
    );
  }
  return (
    <img
      src="/logo.png"
      alt="ForgeQ"
      data-testid="logo-full"
      className={cn('h-8 w-auto object-contain', className)}
    />
  );
};
