/**
 * Route-level fallback — rendered while a lazy feature chunk loads.
 *
 * Slim, content-area-only skeleton. Critically does NOT use `h-screen`
 * or `w-full` so when nested under AppShell the header + sidebar stay
 * put — only the outlet flickers. This is the difference between a
 * Postman-feeling instant nav and a "whole UI repaints" feeling.
 */
export const RouteFallback = () => (
  <div
    data-testid="route-fallback"
    className="flex h-full min-h-0 w-full flex-col gap-3 p-6"
  >
    <div className="h-5 w-48 rounded bg-hover shimmer" />
    <div className="h-3 w-72 rounded bg-hover shimmer" />
    <div className="mt-3 h-32 rounded-lg bg-hover shimmer" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-20 rounded-lg bg-hover shimmer" />
      <div className="h-20 rounded-lg bg-hover shimmer" />
    </div>
  </div>
);
