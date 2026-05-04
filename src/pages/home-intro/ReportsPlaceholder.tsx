/**
 * ReportsPlaceholder — `/home/reports` lean placeholder for the Reports
 * surface. Keeps the left rail honest (link doesn't 404) while we design
 * cross-workspace reporting in a later iteration.
 */
import { BarChart3, Sparkles } from 'lucide-react';

export const ReportsPlaceholder = () => (
  <div data-testid="home-reports" className="p-6">
    <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-muted text-primary">
        <BarChart3 className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold">Reports — coming soon</h2>
      <p className="mx-auto mt-2 max-w-md text-xs text-text-secondary">
        Cross-workspace analytics — request volume, monitor uptime, top runners,
        flaky tests &mdash; will land here. We&rsquo;ll wire it to the existing
        functional / load / monitor services without a fresh service.
      </p>
      <p className="mt-4 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
        <Sparkles className="h-3 w-3" /> v1 ships in the next milestone
      </p>
    </div>
  </div>
);

export default ReportsPlaceholder;
