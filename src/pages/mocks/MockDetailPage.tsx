/**
 * MockDetailPage — premium tab-routed detail view for a single Mock.
 *
 * Tabs (delivered in iter 22):
 *   • Overview      — base URL, stats strip, quick toggles
 *   • Endpoints     — endpoint list / add / edit (uses the existing UI inline)
 *   • Hits          — live hit log
 *   • Settings      — latency / proxy / CORS / rate-limit / record-mode
 *   • Sharing       — visibility + future share grants
 *   • Contract Diff — drift runs vs upstream
 *   • Export        — download FORGEQ / Postman / OpenAPI
 *
 * Tab switching is component-local state (no router round-trip), so it
 * is instant. Each tab is its own file under `tabs/` for modularity.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity, ListTree, History, Settings, Share2, Bug, Download, ChevronLeft, Send,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';
import { getMock, listEndpoints } from '@/services/mock.service';
import { OverviewTab }      from '@/components/mocks/tabs/OverviewTab';
import { EndpointsTab }     from '@/components/mocks/tabs/EndpointsTab';
import { RunnerTab }        from '@/components/mocks/tabs/RunnerTab';
import { HitsTab }          from '@/components/mocks/tabs/HitsTab';
import { SettingsTab }      from '@/components/mocks/tabs/SettingsTab';
import { SharingTab }       from '@/components/mocks/tabs/SharingTab';
import { ContractDiffTab }  from '@/components/mocks/tabs/ContractDiffTab';
import { ExportTab }        from '@/components/mocks/tabs/ExportTab';
import { VisibilityBadge }  from '@/components/mocks/parts/VisibilityBadge';

type TabKey = 'overview' | 'endpoints' | 'runner' | 'hits' | 'settings' | 'sharing' | 'diff' | 'export';

const TABS: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: 'overview',  label: 'Overview',      icon: Activity },
  { key: 'endpoints', label: 'Endpoints',     icon: ListTree },
  { key: 'runner',    label: 'Runner',        icon: Send },
  { key: 'hits',      label: 'Hits',          icon: History },
  { key: 'settings',  label: 'Settings',      icon: Settings },
  { key: 'sharing',   label: 'Sharing',       icon: Share2 },
  // { key: 'diff',      label: 'Contract Diff', icon: Bug },
  { key: 'export',    label: 'Export',        icon: Download },
];

export const MockDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>('overview');

  const { data: mock, isLoading } = useQuery({
    queryKey: ['mock', id],
    queryFn: () => getMock(id!),
    enabled: !!id,
  });
  const { data: endpoints = [] } = useQuery({
    queryKey: ['mock', id, 'endpoints'],
    queryFn: () => listEndpoints(id!),
    enabled: !!id,
  });

  // When the user clicks an endpoint in the left rail (which appends
  // `?ep=…` to the URL), auto-switch to the Runner tab.
  useEffect(() => {
    if (searchParams.get('ep')) setTab('runner');
  }, [searchParams]);

  if (isLoading || !mock) {
    return (
      <div className="space-y-3 p-6" data-testid="mock-detail-skeleton">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
          {[0,1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mock-detail-page">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Tooltip content="Back to mocks">
            <button
              onClick={() => nav('/projects/mocks')}
              data-testid="mock-detail-back"
              className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </Tooltip>
          <div className="min-w-0">
            <h1 data-testid="mock-detail-name" className="truncate text-base font-semibold">
              {mock.name}
            </h1>
            <p data-testid="mock-detail-baseurl" className="truncate font-mono text-[11px] text-text-muted">
              {mock.baseUrl}
            </p>
          </div>
          <VisibilityBadge visibility={mock.visibility} />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span data-testid="mock-detail-endpoint-count">{endpoints.length} endpoints</span>
        </div>
      </header>

      {/* Tab strip */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface/60 px-3" data-testid="mock-detail-tabs">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              data-testid={`mock-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs transition-colors',
                active ? 'border-primary text-primary'
                       : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto" data-testid={`mock-tab-body-${tab}`}>
        {tab === 'overview'  && <OverviewTab  mock={mock} endpoints={endpoints} onJump={(k) => setTab(k as TabKey)} />}
        {tab === 'endpoints' && <EndpointsTab mock={mock} endpoints={endpoints} onRunEndpoint={() => setTab('runner')} />}
        {tab === 'runner'    && <RunnerTab    mock={mock} endpoints={endpoints} />}
        {tab === 'hits'      && <HitsTab      mockId={mock.id} />}
        {tab === 'settings'  && <SettingsTab  mock={mock} />}
        {tab === 'sharing'   && <SharingTab   mock={mock} />}
        {tab === 'diff'      && <ContractDiffTab mock={mock} />}
        {tab === 'export'    && <ExportTab    mock={mock} />}
      </div>
    </div>
  );
};

export default MockDetailPage;
