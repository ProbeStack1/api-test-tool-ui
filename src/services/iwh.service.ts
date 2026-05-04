/**
 * Integrations + Webhooks service-layer wrappers.
 *
 * Normalises the shape gap between Java's `IntegrationsWebhooksController`
 * responses and the UI's expected types:
 *   - Java emits `subscriptionsActive/Paused`, `integrationsActive/Broken`,
 *     `deliveriesDelivered/Failed/Dead/Pending`, `killSwitchOn` —
 *     UI consumes `webhooksActive/Paused`, `deliveries24h`, `successRate24h`,
 *     `failures24h`, `killSwitchEnabled`.
 *   - Event catalog comes back as `{events: string[], severities: {...}}` —
 *     UI consumes `{events: Array<{type, sampleSeverity}>}`.
 *   - Integration view exposes `lastHealthCheck` / `lastHealthError` /
 *     `health` instead of `lastTestedAt` / `lastError`.
 *   - Instant epoch-second timestamps are converted to ISO strings.
 */
import {
  apiCreateWebhook, apiListWebhooks, apiGetWebhook, apiPingWebhook,
  apiRotateWebhookSecret, apiPauseWebhook, apiResumeWebhook, apiDeleteWebhook,
  apiWebhookDeliveries, apiReplayDelivery,
  apiCreateIntegration, apiListIntegrations, apiTestIntegration,
  apiPauseIntegration, apiResumeIntegration, apiDeleteIntegration,
  apiEventCatalog, apiProviders, apiDashboard,
  type WebhookCreate, type WebhookView, type DeliveryView,
  type IntegrationCreate, type IntegrationView, type EventCatalog, type DashboardStats,
} from '@/api/iwh.api';

export type { WebhookCreate, WebhookView, DeliveryView, IntegrationCreate, IntegrationView, EventCatalog, DashboardStats };

const toIso = (v: number | string | null | undefined): string | null => {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

const normHook = (h: WebhookView): WebhookView => ({
  ...h, lastDeliveryAt: toIso(h.lastDeliveryAt),
  createdAt: toIso(h.createdAt) ?? undefined, updatedAt: toIso(h.updatedAt) ?? undefined,
});
const normDelivery = (d: DeliveryView): DeliveryView => ({
  ...d, createdAt: toIso(d.createdAt) ?? undefined, completedAt: toIso(d.completedAt),
});
const normInt = (raw: any): IntegrationView => ({
  ...raw,
  // Java fields → UI aliases (raw fields preserved for extra tooltips)
  lastTestedAt: toIso(raw.lastTestedAt ?? raw.lastHealthCheck),
  lastError:    raw.lastError ?? raw.lastHealthError ?? null,
  createdAt:    toIso(raw.createdAt) ?? undefined,
});

/* webhooks ---------------------------------------------------------- */
export const createWebhook = (b: WebhookCreate) => apiCreateWebhook(b).then(normHook);
export const listWebhooks  = (wsId: string) => apiListWebhooks(wsId).then((p) => ({ ...p, content: (p.content ?? []).map(normHook) }));
export const getWebhook    = (id: string) => apiGetWebhook(id).then(normHook);
export const pingWebhook   = (id: string) => apiPingWebhook(id).then(normDelivery);
export const rotateWebhookSecret = (id: string) => apiRotateWebhookSecret(id).then(normHook);
export const pauseWebhook  = (id: string) => apiPauseWebhook(id).then(normHook);
export const resumeWebhook = (id: string) => apiResumeWebhook(id).then(normHook);
export const deleteWebhook = (id: string) => apiDeleteWebhook(id);
export const webhookDeliveries = (id: string, page = 0, size = 50) =>
  apiWebhookDeliveries(id, page, size).then((p) => ({ ...p, content: (p.content ?? []).map(normDelivery) }));
export const replayDelivery = (deliveryId: string) => apiReplayDelivery(deliveryId).then(normDelivery);

/* integrations ------------------------------------------------------ */
export const createIntegration = (b: IntegrationCreate) => apiCreateIntegration(b).then(normInt);
export const listIntegrations  = (wsId: string) => apiListIntegrations(wsId).then((p) => ({ ...p, content: (p.content ?? []).map(normInt) }));
export const testIntegration   = (id: string) => apiTestIntegration(id).then(normInt);
export const pauseIntegration  = (id: string) => apiPauseIntegration(id);
export const resumeIntegration = (id: string) => apiResumeIntegration(id);
export const deleteIntegration = (id: string) => apiDeleteIntegration(id);

/* meta -------------------------------------------------------------- */
export interface NormalisedDashboard {
  webhooksActive: number;
  webhooksPaused: number;
  integrationsActive: number;
  integrationsBroken: number;
  deliveries24h: number;
  successRate24h: number; // 0..1
  failures24h: number;
  killSwitchEnabled: boolean;
  raw: any;
}
export const dashboard = (): Promise<NormalisedDashboard> =>
  apiDashboard().then((raw: any) => {
    const subsActive = raw.webhooksActive ?? raw.subscriptionsActive ?? 0;
    const subsPaused = raw.webhooksPaused ?? raw.subscriptionsPaused ?? 0;
    const intsActive = raw.integrationsActive ?? 0;
    const intsBroken = raw.integrationsBroken ?? 0;
    const deliveries24h = raw.deliveries24h ?? (
      (raw.deliveriesDelivered ?? 0) + (raw.deliveriesFailed ?? 0) +
      (raw.deliveriesDead ?? 0) + (raw.deliveriesPending ?? 0)
    );
    const failures = raw.failures24h ?? ((raw.deliveriesFailed ?? 0) + (raw.deliveriesDead ?? 0));
    const successRate = raw.successRate24h ??
      (deliveries24h > 0 ? (deliveries24h - failures) / deliveries24h : 0);
    return {
      webhooksActive: subsActive,
      webhooksPaused: subsPaused,
      integrationsActive: intsActive,
      integrationsBroken: intsBroken,
      deliveries24h,
      successRate24h: successRate,
      failures24h: failures,
      killSwitchEnabled: raw.killSwitchEnabled ?? raw.killSwitchOn ?? false,
      raw,
    };
  });

export interface NormalisedCatalog {
  events: Array<{ type: string; description?: string; sampleSeverity?: string; schemaUrl?: string }>;
  severities: Record<string, string[] | string>;
}
export const eventCatalog = (): Promise<NormalisedCatalog> =>
  apiEventCatalog().then((raw: any) => {
    const sev = raw?.severities ?? {};
    // Build a reverse map: event-type → severity
    const sevMap: Record<string, string> = {};
    Object.entries(sev).forEach(([level, list]: any) => {
      if (Array.isArray(list)) list.forEach((ev: string) => { sevMap[ev] = level; });
    });
    const rawEvents = raw?.events ?? [];
    const events = (Array.isArray(rawEvents) ? rawEvents : []).map((ev: any) =>
      typeof ev === 'string'
        ? { type: ev, sampleSeverity: sevMap[ev] ?? 'INFO' }
        : { type: ev.type, description: ev.description, sampleSeverity: ev.sampleSeverity ?? sevMap[ev.type] ?? 'INFO', schemaUrl: ev.schemaUrl }
    );
    return { events, severities: sev };
  });

export const providers = () => apiProviders();
