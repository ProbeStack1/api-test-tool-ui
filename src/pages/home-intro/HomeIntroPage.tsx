/**
 * HomeIntroPage — main-pane content for `/home`. Lean intro card; the
 * surrounding shell (logo, sidebar, header, status bar) is rendered by
 * `HomeShell`.
 */
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Rocket, Compass, ClipboardList } from 'lucide-react';

export const HomeIntroPage = () => {
  const nav = useNavigate();
  return (
    <div data-testid="home-intro" className="p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-muted text-primary">
          <HomeIcon className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Welcome back</h2>
        <p className="mx-auto mt-1 max-w-md text-xs text-text-secondary">
          Pick a section from the left rail or jump straight into your project.
          Public &amp; Private API networks, Workspaces, Integrations and Reports
          are all wired up.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => nav('/projects/collections')}
            data-testid="home-cta-builder"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
          >
            <Rocket className="h-3.5 w-3.5" /> Jump to request builder
          </button>
          <button
            onClick={() => nav('/home/api-catalog/public')}
            data-testid="home-cta-catalog"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-primary/30 hover:text-primary"
          >
            <Compass className="h-3.5 w-3.5" /> Browse API Catalog
          </button>
          <button
            onClick={() => nav('/projects/audit')}
            data-testid="home-cta-audit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-primary/30 hover:text-primary"
          >
            <ClipboardList className="h-3.5 w-3.5" /> View audit log
          </button>
        </div>
      </div>
    </div>
  );
};
