/**
 * DigestsPage — top-level route at `/projects/digests`. Wraps
 * {@link DigestsPanel} with a page header matching audit / trash.
 */
import { Mail } from 'lucide-react';
import { DigestsPanel } from '../monitors/DigestsPanel';

export const DigestsPage = () => (
  <div className="flex h-full flex-col" data-testid="digests-page">
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/40 px-6 py-3">
      <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <Mail className="h-4 w-4 text-primary" /> Digests
      </h1>
      <span className="text-[11px] text-text-muted">
        · Schedule daily or weekly uptime summary emails. Recipients receive a tidy report
        even when nothing is on fire.
      </span>
    </header>
    <div className="flex-1 overflow-hidden">
      <DigestsPanel />
    </div>
  </div>
);

export default DigestsPage;
