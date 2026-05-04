/**
 * Skeleton atoms — reusable loading placeholders.
 * What : Small primitives compose into any page-level skeleton.
 * Why  : Avoid hand-building loading states per page; one set of atoms forever.
 */
import { cn } from '@/utils/cn';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('shimmer rounded-md', className)} data-testid="skeleton" />
);

export const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-2" data-testid="skeleton-text">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-3/5' : 'w-full')} />
    ))}
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-3 p-2" data-testid="skeleton-row">
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  </div>
);

export const SkeletonCard = () => (
  <div
    className="space-y-3 rounded-lg border border-border bg-surface p-4"
    data-testid="skeleton-card"
  >
    <Skeleton className="h-5 w-2/5" />
    <SkeletonText lines={2} />
  </div>
);

export const SkeletonTable = ({ rows = 6 }: { rows?: number }) => (
  <div className="space-y-2" data-testid="skeleton-table">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 rounded-md border border-border bg-surface p-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    ))}
  </div>
);
