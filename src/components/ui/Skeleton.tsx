/**
 * Skeleton — shimmering placeholder block. Used to indicate loading
 * states with the same shape as the eventual content (so the layout
 * doesn't jump on hydrate).
 *
 * Uses the SAME shimmer treatment as the collection sidebar (`bg-hover`
 * base + `.shimmer` keyframe) so every page feels coherent during loads.
 *
 * Composition:
 *   <Skeleton className="h-4 w-32" />   // single bar
 *   <SkeletonRow cols={[2,3,3,2,1]} />   // a Postman-style table row
 */
import { cn } from '@/utils/cn';

export const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div
    style={style}
    className={cn(
      'shimmer rounded-md bg-hover',
      className,
    )}
  />
);

/** A single row of `cols` skeleton bars whose flex-grow ratios match
 *  the surrounding table — keeps the loading state shaped like the
 *  real key-value editor. */
export const SkeletonRow = ({
  cols, height = 'h-3.5', gap = 'gap-2',
}: { cols: number[]; height?: string; gap?: string }) => (
  <div className={cn('flex items-center px-3 py-2', gap)}>
    {cols.map((c, i) => (
      <Skeleton key={i} className={cn(height, 'flex-1')} style={{ flexGrow: c }} />
    ))}
  </div>
);

/** Common preset: a Postman-style key/value table skeleton. Renders a
 *  header bar + N body rows that match the actual table grid. */
export const KvTableSkeleton = ({
  rows = 4, cols = [1, 3, 3, 3, 3, 1], testId,
}: { rows?: number; cols?: number[]; testId?: string }) => (
  <div data-testid={testId} className="overflow-hidden rounded-md border border-border">
    <SkeletonRow cols={cols} height="h-2.5" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="border-t border-border/50">
        <SkeletonRow cols={cols} height="h-3" />
      </div>
    ))}
  </div>
);
