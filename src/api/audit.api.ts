/**
 * Audit Activity raw HTTP layer (port 8088, `forgeq-audit-activity-svc`).
 *
 * Controllers covered:
 *   • ActivityController  /api/v1/audit-activity/activity/**  (timelines + correlation chain)
 *
 * DTO field names mirror Java exactly. Spring Jackson is strict.
 */
import { createHttp } from '@/lib/http';
import { serviceUrl } from '@/lib/env';

const http = createHttp('audit');
const BASE = '/api/v1/activity';

export type Severity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface TimelineEntry {
  eventId: string;
  service?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  severity?: Severity | string;
  tags?: string[];
  actorEmail?: string;
  actorName?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  latencyMs?: number | null;
  correlationId?: string | null;
  timestamp?: number | string;
}

export interface TimelinePage {
  items: TimelineEntry[];
  total: number;
  page: number;
  size: number;
}

export interface TimelineFilter {
  actions?: string;       // CSV
  severities?: string;    // CSV
  resources?: string;     // CSV
  actorEmail?: string;
  from?: string;          // ISO
  to?: string;            // ISO
  includeDiff?: boolean;
}

export const apiTimelineWorkspace = (wsId: string, opts: TimelineFilter & { page?: number; size?: number } = {}) =>
  http.get<TimelinePage>(`${BASE}/workspace/${wsId}`, {
    params: {
      page: opts.page ?? 0,
      size: opts.size ?? 50,
      ...(opts.actions    ? { actions: opts.actions } : {}),
      ...(opts.severities ? { severities: opts.severities } : {}),
      ...(opts.resources  ? { resources: opts.resources } : {}),
      ...(opts.actorEmail ? { actorEmail: opts.actorEmail } : {}),
      ...(opts.from       ? { from: opts.from } : {}),
      ...(opts.to         ? { to: opts.to } : {}),
      includeDiff: !!opts.includeDiff,
    },
  }).then((r) => r.data);

export const apiTimelineUser = (userId: string, opts: { page?: number; size?: number } = {}) =>
  http.get<TimelinePage>(`${BASE}/user/${userId}`, {
    params: { page: opts.page ?? 0, size: opts.size ?? 50 },
  }).then((r) => r.data);

export const apiTimelineResource = (type: string, id: string, opts: { page?: number; size?: number; includeDiff?: boolean } = {}) =>
  http.get<TimelinePage>(`${BASE}/resource/${type}/${id}`, {
    params: { page: opts.page ?? 0, size: opts.size ?? 50, includeDiff: opts.includeDiff ?? true },
  }).then((r) => r.data);

export const apiCorrelationChain = (correlationId: string) =>
  http.get<TimelineEntry[]>(`${BASE}/correlation/${correlationId}`).then((r) => r.data);

export const apiAuditHealth = () =>
  http.get<{ status: string }>('/actuator/health').then((r) => r.data);

export const auditBaseUrl = () => serviceUrl('audit');
