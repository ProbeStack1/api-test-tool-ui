/**
 * SidebarSkeleton — shimmer rows used while a sidebar section is loading.
 * Used for workspace lists AND collection/folder lazy expansions.
 */
import { cn } from '@/utils/cn';

export const SidebarSkeletonRow = ({ indent = 0 }: { indent?: number }) => (
  <div
    data-testid="sidebar-skeleton-row"
    className="flex items-center gap-2 py-1.5"
    style={{ paddingLeft: 4 + indent * 12 + 20 }}
  >
    <span className="h-3 w-3 shrink-0 rounded-sm bg-hover shimmer" />
    <span className="h-3 w-24 rounded bg-hover shimmer" />
  </div>
);

export const SidebarSkeleton = ({
  rows = 3, indent = 0, className,
}: { rows?: number; indent?: number; className?: string }) => (
  <div data-testid="sidebar-skeleton" className={cn('space-y-0.5', className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <SidebarSkeletonRow key={i} indent={indent} />
    ))}
  </div>
);
