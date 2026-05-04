/**
 * HeartbeatsPage — top-level route at `/projects/heartbeats`.
 *
 * Wraps the underlying {@link HeartbeatsPanel} (which still lives inside
 * the legacy monitor module so we don't fork it) with a project-aware
 * page header, matching the look of /projects/audit and /projects/trash.
 *
 * Why a dedicated route (not nested inside Monitor)?
 *   The user explicitly flagged that two Monitor surfaces (one in
 *   /projects/testing, one new) is confusing. Heartbeats and Digests
 *   stand on their own — push monitors and scheduled emails respectively.
 */
import { Heart } from 'lucide-react';
import { HeartbeatsPanel } from '../monitors/HeartbeatsPanel';

export const HeartbeatsPage = () => (
  <div className="flex h-full flex-col" data-testid="heartbeats-page">
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/40 px-6 py-3">
      <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <Heart className="h-4 w-4 text-primary" /> Heartbeats
      </h1>
      <span className="text-[11px] text-text-muted">
        · Push monitors. Drop the unique ping URL into your cron job; if a ping is missed
        we&rsquo;ll alert your on-call channels automatically.
      </span>
    </header>
    <div className="flex-1 overflow-hidden">
      <HeartbeatsPanel />
    </div>
  </div>
);

export default HeartbeatsPage;
