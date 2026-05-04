/**
 * Integrations + Webhooks raw HTTP layer (port 8090, `forgeq-integrations-webhooks-mgmt-svc`).
 *
 * Backend base path: `/api/v1/integrations-webhooks`.
 * Covers: webhook subscriptions, delivery audit log + replay, integration
 * connections (Slack/Teams/Discord/PagerDuty etc.), event catalog.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('integrations');
const BASE = '/api/v1/integrations-webhooks';

export interface WebhookCreate {
  workspaceId: string;
  name: string;
  url: string;
  events: string[];
  description?: string;
  retryPolicy?: 'NONE' | 'EXPONENTIAL' | 'LINEAR';
  maxRetries?: number;
}
export interface WebhookView {
  subscriptionId: string;
  workspaceId: string;
  name: string;
  url: string;
  description?: string;
  events: string[];
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED' | string;
  retryPolicy?: string;
  maxRetries?: number;
  successCount?: number;
  failureCount?: number;
  lastDeliveryAt?: number | string | null;
  /** Returned only on create / rotate-secret. Subsequent reads are null. */
  signingSecret?: string | null;
  createdByEmail?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}
export interface DeliveryView {
  deliveryId: string;
  subscriptionId: string;
  eventType: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  attempts?: number;
  responseStatus?: number | null;
  responseBodySnippet?: string | null;
  errorMessage?: string | null;
  payload?: Record<string, unknown> | null;
  durationMs?: number | null;
  createdAt?: number | string;
  completedAt?: number | string | null;
}
export interface IntegrationCreate {
  workspaceId: string;
  provider: string; // SLACK, TEAMS, DISCORD, PAGERDUTY, OPSGENIE etc
  name: string;
  config: Record<string, unknown>;
  events?: string[];
}
export interface IntegrationView {
  integrationId: string;
  workspaceId: string;
  provider: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | string;
  events?: string[];
  lastTestedAt?: number | string | null;
  lastError?: string | null;
  createdAt?: number | string;
}
export interface EventCatalog {
  events: Array<{
    type: string;
    description?: string;
    sampleSeverity?: string;
    schemaUrl?: string;
  }>;
}
export interface DashboardStats {
  webhooksActive: number;
  webhooksPaused: number;
  deliveries24h: number;
  successRate24h: number; // 0..1
  failures24h: number;
  killSwitchEnabled?: boolean;
}
export interface PageEnvelope<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/* webhook ----------------------------------------------------------- */
export const apiCreateWebhook = (b: WebhookCreate) => http.post<WebhookView>(`${BASE}/webhooks`, b).then((r) => r.data);
export const apiListWebhooks = (workspaceId: string, page = 0, size = 50) =>
  http.get<PageEnvelope<WebhookView>>(`${BASE}/webhooks`, { params: { workspaceId, page, size } }).then((r) => r.data);
export const apiGetWebhook = (id: string) => http.get<WebhookView>(`${BASE}/webhooks/${id}`).then((r) => r.data);
export const apiPingWebhook = (id: string) => http.post<DeliveryView>(`${BASE}/webhooks/${id}/ping`, {}).then((r) => r.data);
export const apiRotateWebhookSecret = (id: string) => http.post<WebhookView>(`${BASE}/webhooks/${id}/rotate-secret`, {}).then((r) => r.data);
export const apiPauseWebhook = (id: string) => http.post<WebhookView>(`${BASE}/webhooks/${id}/pause`, {}).then((r) => r.data);
export const apiResumeWebhook = (id: string) => http.post<WebhookView>(`${BASE}/webhooks/${id}/resume`, {}).then((r) => r.data);
export const apiDeleteWebhook = (id: string) => http.delete(`${BASE}/webhooks/${id}`).then(() => undefined);
export const apiWebhookDeliveries = (id: string, page = 0, size = 50) =>
  http.get<PageEnvelope<DeliveryView>>(`${BASE}/webhooks/${id}/deliveries`, { params: { page, size } }).then((r) => r.data);
export const apiReplayDelivery = (deliveryId: string) =>
  http.post<DeliveryView>(`${BASE}/deliveries/${deliveryId}/replay`, {}).then((r) => r.data);

/* integration ------------------------------------------------------- */
export const apiCreateIntegration = (b: IntegrationCreate) => http.post<IntegrationView>(`${BASE}/integrations`, b).then((r) => r.data);
export const apiListIntegrations = (workspaceId: string, page = 0, size = 50) =>
  http.get<PageEnvelope<IntegrationView>>(`${BASE}/integrations`, { params: { workspaceId, page, size } }).then((r) => r.data);
export const apiTestIntegration = (id: string) => http.post<IntegrationView>(`${BASE}/integrations/${id}/test`, {}).then((r) => r.data);
export const apiPauseIntegration = (id: string) => http.post(`${BASE}/integrations/${id}/pause`, {}).then(() => undefined);
export const apiResumeIntegration = (id: string) => http.post(`${BASE}/integrations/${id}/resume`, {}).then(() => undefined);
export const apiDeleteIntegration = (id: string) => http.delete(`${BASE}/integrations/${id}`).then(() => undefined);

/* meta -------------------------------------------------------------- */
export const apiEventCatalog = () => http.get<EventCatalog>(`${BASE}/events/catalog`).then((r) => r.data);
export const apiProviders = () => http.get<string[]>(`${BASE}/providers`).then((r) => r.data);
export const apiDashboard = () => http.get<DashboardStats>(`${BASE}/dashboard`).then((r) => r.data);
