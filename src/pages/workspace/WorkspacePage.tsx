/**
 * Workspace — landing page inside the app shell.
 * Phase 3 will replace this placeholder with real workspace switcher + collections tree.
 */
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

export const WorkspacePage = () => (
  <div
    data-testid="workspace-page"
    className="flex h-full items-center justify-center p-8"
  >
    <div className="max-w-md rounded-xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-muted text-primary">
        <Rocket className="h-6 w-6" />
      </div>
      <h2 className="mb-1 text-lg font-semibold">Welcome to ForgeQ</h2>
      <p className="mb-4 text-sm text-text-secondary">
        Scaffold is live. Core request-builder, environments and collections land next.
      </p>
      <Button variant="primary" asChild data-testid="workspace-settings-link">
        <Link to="/projects/settings">Open settings</Link>
      </Button>
    </div>
  </div>
);
