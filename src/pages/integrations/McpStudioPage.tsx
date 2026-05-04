/**
 * McpStudioPage — sidebar-driven studio. NO top tab strip; URL stays as
 * a clean `/projects/mcp`. The active section + active server live in
 * `useMcpStudioStore` so reloading keeps your place.
 */
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import { ServersTab } from '@/components/integrations/tabs/ServersTab';
import { InspectorTab } from '@/components/integrations/tabs/InspectorTab';
import { CollectionsTab } from '@/components/integrations/tabs/CollectionsTab';
import { HistoryTab } from '@/components/integrations/tabs/HistoryTab';
import { MocksTab } from '@/components/integrations/tabs/MocksTab';
import { RestBridgeTab } from '@/components/integrations/tabs/RestBridgeTab';
import { AiGenTab } from '@/components/integrations/tabs/AiGenTab';
import { StatusBar } from '@/components/integrations/parts/StatusBar';
import { TabErrorBoundary } from '@/components/common/TabErrorBoundary';
import { status as fetchStatus, breakerState } from '@/services/mcp.service';

export const McpStudioPage = () => {
  const tab = useMcpStudioStore((s) => s.activeTab);
  const { data: stat }  = useQuery({ queryKey: ['mcp-status'],  queryFn: fetchStatus,  refetchInterval: 30_000 });
  const { data: br }    = useQuery({ queryKey: ['mcp-breaker'], queryFn: breakerState, refetchInterval: 30_000 });

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mcp-studio-page">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{tabTitle(tab)}</h1>
            <p className="truncate text-[11px] text-text-muted">{tabSubtitle(tab)}</p>
          </div>
        </div>
        <StatusBar stat={stat} breaker={br} />
      </header>

      <div className="min-h-0 flex-1 overflow-auto" data-testid={`mcp-tab-body-${tab}`}>
        <TabErrorBoundary scope={tabTitle(tab)}>
          {tab === 'servers'     && <ServersTab />}
          {tab === 'inspector'   && <InspectorTab />}
          {tab === 'collections' && <CollectionsTab />}
          {tab === 'history'     && <HistoryTab />}
          {tab === 'mocks'       && <MocksTab />}
          {tab === 'rest'        && <RestBridgeTab />}
          {tab === 'aigen'       && <AiGenTab />}
        </TabErrorBoundary>
      </div>
    </div>
  );
};

const tabTitle = (t: string) => ({
  servers:     'MCP Servers',
  inspector:   'Inspector',
  collections: 'Collections',
  mocks:       'Mock Servers',
  rest:        'MCP ↔ REST Bridge',
  aigen:       'AI Test Generator',
  history:     'Call History',
}[t] ?? 'MCP Studio');

const tabSubtitle = (t: string) => ({
  servers:     'Discover open-source MCPs · connect, inspect, share.',
  inspector:   'Connect to a server, browse tools, run them with schema-aware args.',
  collections: 'Save batches of tool calls + assertions for repeatable runs.',
  mocks:       'Spin up fake MCP servers — perfect for parallel client development.',
  rest:        'Call MCP tools over plain HTTP from Postman / curl.',
  aigen:       'Gemini-drafts assertion suites from your tool inputSchemas.',
  history:     'Every MCP call · 30-day audit log.',
}[t] ?? '');
