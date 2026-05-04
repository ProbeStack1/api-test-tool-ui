/**
 * DeliveryFanoutTimeline — groups recent webhook deliveries by event id
 * so the user can see, at a glance, how a single event fanned out to
 * multiple subscribed endpoints and which ones succeeded / failed.
 *
 * Layout (tree):
 *   ▸ evt_01HZK3XQ4MX9… · monitor.down · CRITICAL · 2m ago
 *     ├── "Slack on-call"          DELIVERED  HTTP 200  142ms
 *     ├── "Datadog events"         DELIVERED  HTTP 202   98ms
 *     └── "Custom PD bridge"       FAILED     HTTP 503  2391ms  (retrying…)
 *
 * Source: aggregates `webhookDeliveries(...)` across every webhook subscribed
 * to a project. We batch-fetch all subscriptions once, then fetch the last
 * page of deliveries for each in parallel. Re-fetches every 8 seconds.
 */
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Activity, Loader2 } from 'lucide-react';
import {
  listWebhooks, webhookDeliveries, type DeliveryView, type WebhookView,
} from '@/services/iwh.service';
import { FancyEmpty } from '@/components/common/FancyEmpty';
import { fmtRelative } from './_shared';
import { cn } from '@/utils/cn';

interface FanoutEvent {
  eventId: string;
  eventType: string;
  oldestAt: string | null;
  deliveries: Array<{ hook: WebhookView; delivery: DeliveryView }>;
}

export const DeliveryFanoutTimeline = ({ workspaceId }: { workspaceId: string }) => {
  const hooksQ = useQuery({
    queryKey: ['iwh', 'webhooks', workspaceId],
    queryFn: () => listWebhooks(workspaceId),
  });
  const hooks = hooksQ.data?.content ?? [];

  // Fan out: one parallel query per webhook for its most recent deliveries.
  const deliveryQs = useQueries({
    queries: hooks.map((h) => ({
      queryKey: ['iwh', 'deliveries', h.subscriptionId],
      queryFn: () => webhookDeliveries(h.subscriptionId, 0, 25),
      refetchInterval: 8_000,
      enabled: !!h.subscriptionId,
    })),
  });

  const events: FanoutEvent[] = useMemo(() => {
    const byEvent = new Map<string, FanoutEvent>();
    hooks.forEach((h, i) => {
      const list = (deliveryQs[i]?.data?.content ?? []) as DeliveryView[];
      list.forEach((d) => {
        // DeliveryView does not carry a first-class `eventId` — use
        // `deliveryId` as a reasonable fan-out key so each UI node is
        // unique. `createdAt` may arrive as number OR string, so
        // coerce to string before joining / comparing.
        const createdStr = d.createdAt != null ? String(d.createdAt) : null;
        const key = d.deliveryId ?? `${d.eventType}-${createdStr ?? ''}`;
        const existing = byEvent.get(key);
        if (existing) {
          existing.deliveries.push({ hook: h, delivery: d });
          if (createdStr && (!existing.oldestAt || createdStr < existing.oldestAt)) {
            existing.oldestAt = createdStr;
          }
        } else {
          byEvent.set(key, {
            eventId: key,
            eventType: d.eventType ?? 'unknown',
            oldestAt: createdStr,
            deliveries: [{ hook: h, delivery: d }],
          });
        }
      });
    });
    // Newest events first
    return Array.from(byEvent.values()).sort((a, b) =>
      (b.oldestAt ?? '').localeCompare(a.oldestAt ?? ''),
    );
  }, [hooks, deliveryQs.map((q) => q.dataUpdatedAt).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = hooksQ.isLoading || deliveryQs.some((q) => q.isLoading);

  return (
    <section data-testid="iwh-fanout-timeline" className="rounded-2xl border border-border bg-surface/30">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <Activity className="h-3 w-3" /> Event fan-out timeline
        </h3>
        <span className="text-[10px] text-text-muted">Last 25 per subscriber · auto-refresh 8s</span>
      </header>
      <div className="max-h-[60vh] overflow-auto p-3" data-testid="iwh-fanout-body">
        {isLoading && events.length === 0 ? (
          <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-text-muted" />
        ) : events.length === 0 ? (
          <FancyEmpty
            testId="iwh-fanout-empty"
            icon="zap"
            title="No fan-out deliveries yet"
            body="Once an event fires and reaches multiple webhooks, you'll see each destination's delivery status here as a tree."
            steps={[
              'Create 2+ webhooks subscribed to overlapping events',
              'Trigger a test ping on any one of them',
              'Watch the timeline group deliveries by event id',
            ]}
          />
        ) : (
          <ul className="space-y-3">
            {events.slice(0, 15).map((ev) => (
              <EventNode key={ev.eventId} ev={ev} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

const EventNode = ({ ev }: { ev: FanoutEvent }) => {
  const ok = ev.deliveries.filter((d) => d.delivery.status === 'SUCCESS').length;
  const total = ev.deliveries.length;
  const failed = total - ok;
  return (
    <li data-testid={`iwh-fanout-event-${ev.eventId}`} className="rounded-xl border border-border bg-surface/40 p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold text-primary">{ev.eventType}</span>
        <span className="font-mono text-[10px] text-text-muted">{ev.eventId.length > 20 ? `${ev.eventId.slice(0, 20)}…` : ev.eventId}</span>
        <span className="ml-auto text-[10px] text-text-muted">{fmtRelative(ev.oldestAt)}</span>
      </div>
      <div className="mt-1 flex items-center gap-3 text-[10px]">
        <span className="font-mono text-text-muted">{total} destination{total === 1 ? '' : 's'}</span>
        {ok > 0 && <span className="font-mono text-success">✓ {ok}</span>}
        {failed > 0 && <span className="font-mono text-danger">✕ {failed}</span>}
      </div>
      <ul className="mt-2 space-y-1 pl-3 text-[11px]">
        {ev.deliveries.map(({ hook, delivery }, i) => {
          const last = i === ev.deliveries.length - 1;
          const ok = delivery.status === 'SUCCESS';
          return (
            <li key={delivery.deliveryId} className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-muted">{last ? '└─' : '├─'}</span>
              <span className="min-w-0 flex-1 truncate">{hook.name}</span>
              <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase',
                ok ? 'border-success/30 bg-success/10 text-success' :
                delivery.status === 'PENDING' ? 'border-border bg-elevated text-text-muted' :
                'border-danger/30 bg-danger/10 text-danger')}>
                {delivery.status}
              </span>
              {delivery.responseStatus != null && <span className="font-mono text-[10px] text-text-muted">HTTP {delivery.responseStatus}</span>}
              {delivery.durationMs != null && <span className="font-mono text-[10px] text-text-muted">{delivery.durationMs}ms</span>}
            </li>
          );
        })}
      </ul>
    </li>
  );
};
