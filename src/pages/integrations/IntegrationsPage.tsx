/**
 * IntegrationsPage — `/projects/integrations`.
 *
 * Postman-style left subnav (Overview / Webhooks / Integrations / Catalog)
 * with the active pane in the right column. All four panes live in their
 * own files under `./components/` so the surface scales cleanly.
 *
 * Icons are routed through `<AppIcon>` so a single `AppIcons.tsx` change
 * propagates here.
 *
 * Service: `forgeq-integrations-webhooks-mgmt-svc` (port 8090).
 */
import { useState } from 'react';
import { Plug } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { cn } from '@/utils/cn';
import { OverviewPane } from './components/OverviewPane';
import { WebhooksPane } from './components/WebhooksPane';
import { IntegrationsPane } from './components/IntegrationsPane';
import { CatalogPane } from './components/CatalogPane';

type Section = 'overview' | 'webhooks' | 'integrations' | 'catalog';

const NAV: { key: Section; label: string; icon: IconName; testId: string }[] = [
  { key: 'overview',     label: 'Overview',      icon: 'dashboard',   testId: 'iwh-nav-overview' },
  { key: 'webhooks',     label: 'Webhooks',      icon: 'webhook',     testId: 'iwh-nav-webhooks' },
  { key: 'integrations', label: 'Integrations',  icon: 'integration', testId: 'iwh-nav-integrations' },
  { key: 'catalog',      label: 'Event catalog', icon: 'apidoc',      testId: 'iwh-nav-catalog' },
];

export const IntegrationsPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const [section, setSection] = useState<Section>('overview');

  if (!ws) {
    return <NoProjectEmpty testId="iwh-no-workspace" icon="integration" surface="webhooks & integrations" />;
  }

  return (
    <div className="flex h-full" data-testid="iwh-page">
      <aside data-testid="iwh-subnav" className="flex w-52 shrink-0 flex-col border-r border-border bg-surface/40">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Plug className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Webhooks &amp; integrations</h2>
        </header>
        <nav className="flex-1 overflow-auto p-2">
          <ul className="space-y-0.5">
            {NAV.map(({ key, label, icon, testId }) => (
              <li key={key}>
                <button
                  data-testid={testId}
                  onClick={() => setSection(key)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors',
                    section === key
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                  )}
                >
                  <AppIcon name={icon} animated className="h-3.5 w-3.5" /> {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-hidden">
        {section === 'overview'     && <OverviewPane workspaceId={ws.id} />}
        {section === 'webhooks'     && <WebhooksPane workspaceId={ws.id} />}
        {section === 'integrations' && <IntegrationsPane workspaceId={ws.id} />}
        {section === 'catalog'      && <CatalogPane />}
      </div>
    </div>
  );
};

export default IntegrationsPage;
