/**
 * OverviewPane — KPI tiles + recent webhooks/integrations preview.
 *
 * Pulls from:
 *   - `dashboard()` (workspace-aggregated metrics)
 *   - `listWebhooks(workspaceId)` (recent 5)
 *   - `listIntegrations(workspaceId)` (recent 5)
 */
import { useQuery } from '@tanstack/react-query';
import {
  Webhook, Plug, Pause, Send, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  listWebhooks, listIntegrations, dashboard,
} from '@/services/iwh.service';
import { Tile } from './_shared';
import { DeliveryFanoutTimeline } from './DeliveryFanoutTimeline';
import { cn } from '@/utils/cn';

export const OverviewPane = ({ workspaceId }: { workspaceId: string }) => {
  const dq = useQuery({ queryKey: ['iwh', 'dashboard'], queryFn: dashboard, refetchInterval: 15_000 });
  const wq = useQuery({ queryKey: ['iwh', 'webhooks', workspaceId], queryFn: () => listWebhooks(workspaceId) });
  const iq = useQuery({ queryKey: ['iwh', 'integrations', workspaceId], queryFn: () => listIntegrations(workspaceId) });

  const successPct = dq.data?.successRate24h != null ? Math.round((dq.data.successRate24h ?? 0) * 100) : null;

  return (
    <div className="flex h-full flex-col" data-testid="iwh-overview">
      <header className="flex items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <h1 className="text-base font-semibold">Overview</h1>
        <span className="ml-auto text-[10px] text-text-muted">refreshing every 15s</span>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-3 sm:grid-cols-4" data-testid="iwh-overview-tiles">
          <Tile testId="iwh-tile-active"     label="Active webhooks"     value={dq.data?.webhooksActive ?? '—'}     icon={Webhook}      tone="primary" />
          <Tile testId="iwh-tile-paused"     label="Paused"              value={dq.data?.webhooksPaused ?? '—'}     icon={Pause} />
          <Tile testId="iwh-tile-deliveries" label="Deliveries (24h)"    value={dq.data?.deliveries24h ?? '—'}      icon={Send} />
          <Tile testId="iwh-tile-success"    label="Success rate (24h)"
            value={successPct == null ? '—' : `${successPct}%`} icon={CheckCircle2}
            tone={successPct == null ? 'default' : successPct >= 95 ? 'success' : 'danger'} />
        </div>

        {(dq.data?.integrationsBroken ?? 0) > 0 && (
          <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[12px] text-danger" data-testid="iwh-broken-banner">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <strong>{dq.data?.integrationsBroken}</strong> integration{dq.data?.integrationsBroken === 1 ? '' : 's'} need attention — check the Integrations tab.
            </span>
          </div>
        )}

        {dq.data?.killSwitchEnabled && (
          <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[12px] text-danger" data-testid="iwh-killswitch">
            <strong>Kill-switch is engaged.</strong> All outbound deliveries are paused workspace-wide.
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <PreviewList
            testId="iwh-overview-recent-webhooks"
            title="Recent webhooks"
            count={wq.data?.totalElements ?? 0}
            isLoading={wq.isLoading}
            empty="No webhooks yet"
            items={(wq.data?.content ?? []).slice(0, 5).map((w: any) => ({
              id: w.subscriptionId,
              icon: Webhook,
              title: w.name,
              subtitle: w.url,
              right: w.status,
              tone: w.status === 'ACTIVE' ? 'success' : 'muted',
            }))}
          />
          <PreviewList
            testId="iwh-overview-recent-integrations"
            title="Connected integrations"
            count={iq.data?.totalElements ?? 0}
            isLoading={iq.isLoading}
            empty="No integrations connected"
            items={(iq.data?.content ?? []).slice(0, 5).map((i: any) => ({
              id: i.integrationId,
              icon: Plug,
              title: i.name,
              subtitle: i.provider,
              right: i.status,
              tone: i.status === 'ACTIVE' ? 'success' : (i.status === 'ERROR' || i.health === 'UNHEALTHY') ? 'danger' : 'muted',
            }))}
          />
        </div>

        <div className="mt-6">
          <DeliveryFanoutTimeline workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
};

const PreviewList = ({ testId, title, count, items, isLoading, empty }: {
  testId: string; title: string; count: number; isLoading: boolean; empty: string;
  items: Array<{ id: string; icon: any; title: string; subtitle?: string; right?: string; tone?: 'success' | 'danger' | 'muted' }>;
}) => (
  <section data-testid={testId} className="rounded-2xl border border-border bg-surface/30">
    <header className="flex items-center justify-between border-b border-border px-4 py-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
      <span className="text-[10px] text-text-muted">{count} total</span>
    </header>
    <ul className="divide-y divide-border/60">
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => <li key={i} className="p-3"><Skeleton className="h-8 w-full" /></li>)
        : items.length === 0
          ? <li className="p-6 text-center text-[11px] text-text-muted">{empty}</li>
          : items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 px-4 py-2">
              <it.icon className="h-3.5 w-3.5 text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{it.title}</p>
                {it.subtitle && <p className="truncate font-mono text-[10px] text-text-muted">{it.subtitle}</p>}
              </div>
              {it.right && (
                <span className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                  it.tone === 'success' ? 'border-success/30 bg-success/10 text-success' :
                  it.tone === 'danger'  ? 'border-danger/30 bg-danger/10 text-danger' :
                                          'border-border bg-elevated text-text-muted',
                )}>
                  {it.right}
                </span>
              )}
            </li>
          ))}
    </ul>
  </section>
);
