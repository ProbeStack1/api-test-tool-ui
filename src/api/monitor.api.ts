/**
 * Monitor raw HTTP layer — 1:1 mapping of `monitor-mgmt-svc` (port 8086).
 *
 *   page → services/monitor.service → THIS FILE → http://<monitor svc>
 *
 * Controllers covered (v1):
 *   • MonitorController       /api/v1/monitors           (CRUD + pause/resume + run-now + stats + timeseries + status-page)
 *   • MonitorRunController    /api/v1/monitors/{id}/runs (history + drill-down + CSV)
 *   • IncidentController      /api/v1/monitors/{id}/incidents · /incidents/{id}/{ack,resolve}
 *   • MaintenanceController   /api/v1/monitors/{id}/maintenance + /maintenance/{windowId}
 *   • PublicStatusController  /api/v1/monitors/public/status/{slug}
 *
 * Mirrors Java `MonitorDtos` exactly — Spring Jackson is strict.
 */
import { createHttp } from '@/lib/http';
import { serviceUrl } from '@/lib/env';

/* ───── types ──────────────────────────────────────────────────── */
export interface ExtractorSpec {
  requestId: string;
  variable: string;
  jsonPath?: string;
  header?: string;
}

export interface MonitorCreate {
  workspaceId: string;
  collectionId?: string;
  testSpecId?: string;
  environmentId?: string;
  name: string;
  description?: string;
  scheduleCron: string;
  regions?: string[];
  retryCount?: number;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
  stopAfterConsecutiveFailures?: number;
  slaP95Ms?: number;
  slaUptimePct?: number;
  dependsOn?: string;
  notificationEmails?: string[];
  notificationSlackWebhook?: string;
  notificationWebhooks?: string[];
  notifyOnStateChangeOnly?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  requestIds?: string[];
  chainingEnabled?: boolean;
  extractors?: ExtractorSpec[];
  initialVars?: Record<string, string>;
}

export type MonitorUpdate = Partial<Omit<MonitorCreate, 'workspaceId' | 'collectionId' | 'testSpecId'>>;

export interface MonitorView {
  monitorId: string;
  workspaceId: string;
  collectionId?: string | null;
  testSpecId?: string | null;
  environmentId?: string | null;
  name: string;
  description?: string;
  scheduleCron: string;
  regions?: string[] | null;
  status?: string;
  dependsOn?: string | null;
  retryCount?: number | null;
  retryDelayMs?: number | null;
  requestTimeoutMs?: number | null;
  stopAfterConsecutiveFailures?: number | null;
  slaP95Ms?: number | null;
  slaUptimePct?: number | null;
  statusPageSlug?: string | null;
  statusPagePublic?: boolean | null;
  statusPageUrl?: string | null;
  notificationEmails?: string[] | null;
  notificationSlackWebhook?: string | null;
  notificationWebhooks?: string[] | null;
  notifyOnStateChangeOnly?: boolean | null;
  totalRuns?: number | null;
  successRuns?: number | null;
  failedRuns?: number | null;
  consecutiveFailures?: number | null;
  lastState?: string | null;
  lastRunAt?: number | string | null;
  lastRunId?: string | null;
  nextRunAt?: number | string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  createdByEmail?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  requestIds?: string[] | null;
  chainingEnabled?: boolean | null;
  extractors?: ExtractorSpec[] | null;
  initialVars?: Record<string, string> | null;
}

export interface MonitorStats {
  monitorId: string;
  windowFrom: number | string;
  windowTo: number | string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  uptimePct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  openIncidents: number;
  slaCompliant: boolean;
}

export interface TimeseriesPoint {
  at: number | string;
  durationMs?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  status: string;
  passedRequests?: number;
  failedRequests?: number;
}

export interface MonitorRunView {
  runId: string;
  monitorId: string;
  region?: string;
  status: string;
  triggeredBy?: string;
  triggeredByEmail?: string;
  startedAt?: number | string;
  completedAt?: number | string;
  durationMs?: number;
  totalRequests?: number;
  passedRequests?: number;
  failedRequests?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  maxLatencyMs?: number;
  slaBreached?: boolean;
  errorMessage?: string;
}

export interface AssertionView { name: string; passed: boolean; details?: string }

export interface RequestResultView {
  requestId: string;
  name?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  latencyMs?: number;
  passed?: boolean;
  errorMessage?: string;
  attempt?: number;
  executedAt?: number | string;
  assertions?: AssertionView[];
}

export interface MonitorRunDetail {
  run: MonitorRunView;
  results?: RequestResultView[];
}

export interface IncidentView {
  incidentId: string;
  monitorId: string;
  status: string;
  summary?: string;
  openedAt?: number | string;
  openedByRunId?: string;
  acknowledgedAt?: number | string;
  acknowledgedByEmail?: string;
  resolvedAt?: number | string;
  resolvedByEmail?: string;
  resolutionNote?: string;
  downtimeMinutes?: number;
}

export interface IncidentNote { note?: string }

export interface MaintenanceRequest {
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface MaintenanceView {
  windowId: string;
  monitorId: string;
  startsAt: number | string;
  endsAt: number | string;
  reason?: string;
  createdByEmail?: string;
  createdAt?: number | string;
}

export interface StatusPageRequest { slug?: string; isPublic?: boolean }
export interface PublicStatusView {
  slug: string;
  name: string;
  description?: string;
  lastState?: string;
  lastRunAt?: number | string;
  uptime30dPct?: number;
  avgLatencyMs?: number;
  openIncidents?: number;
  inMaintenance?: boolean;
}

/* ───── client ─────────────────────────────────────────────────── */
const http = createHttp('monitor');
const BASE = '/api/v1/monitor';

/* ===== monitors CRUD ============================================ */
export const apiCreateMonitor = (body: MonitorCreate) =>
  http.post<MonitorView>(BASE, body).then((r) => r.data);

export const apiListMonitors = (
  workspaceId: string,
  opts: { collectionId?: string; page?: number; size?: number } = {},
) =>
  http
    .get<MonitorView[]>(BASE, {
      params: {
        workspaceId,
        ...(opts.collectionId ? { collectionId: opts.collectionId } : {}),
        page: opts.page ?? 0,
        size: opts.size ?? 50,
      },
    })
    .then((r) => r.data);

export const apiGetMonitor = (id: string) =>
  http.get<MonitorView>(`${BASE}/${id}`).then((r) => r.data);

export const apiUpdateMonitor = (id: string, body: MonitorUpdate) =>
  http.put<MonitorView>(`${BASE}/${id}`, body).then((r) => r.data);

export const apiDeleteMonitor = (id: string) =>
  http.delete<void>(`${BASE}/${id}`).then((r) => r.data);

export const apiPauseMonitor  = (id: string) => http.post<MonitorView>(`${BASE}/${id}/pause`).then((r) => r.data);
export const apiResumeMonitor = (id: string) => http.post<MonitorView>(`${BASE}/${id}/resume`).then((r) => r.data);

export const apiRunNow = (id: string) =>
  http.post<{ accepted: boolean; monitorId: string }>(`${BASE}/${id}/run`).then((r) => r.data);

export const apiGetStats = (id: string, days = 7) =>
  http.get<MonitorStats>(`${BASE}/${id}/stats`, { params: { days } }).then((r) => r.data);

export const apiGetTimeseries = (id: string, days = 7) =>
  http.get<TimeseriesPoint[]>(`${BASE}/${id}/timeseries`, { params: { days } }).then((r) => r.data);

export const apiPublishStatusPage = (id: string, body: StatusPageRequest = {}) =>
  http.post<MonitorView>(`${BASE}/${id}/status-page`, body).then((r) => r.data);

export const apiUnpublishStatusPage = (id: string) =>
  http.patch<MonitorView>(`${BASE}/${id}/status-page/unpublish`).then((r) => r.data);

/* ===== runs ===================================================== */
export const apiListRuns = (
  monitorId: string,
  opts: { page?: number; size?: number } = {},
) =>
  http
    .get<MonitorRunView[]>(`${BASE}/${monitorId}/runs`, {
      params: { page: opts.page ?? 0, size: opts.size ?? 50 },
    })
    .then((r) => r.data);

export const apiGetRunDetail = (runId: string) =>
  http.get<MonitorRunDetail>(`${BASE}/runs/${runId}`).then((r) => r.data);

export const apiExportRunsCsv = async (monitorId: string, limit = 1000) => {
  const res = await http.get<Blob>(`${BASE}/${monitorId}/runs.csv`, {
    params: { limit },
    responseType: 'blob',
    transformResponse: (x) => x,                // keep raw blob, skip envelope unwrap
  });
  return {
    blob: res.data as unknown as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

/* ===== incidents ================================================ */
export const apiListIncidents = (
  monitorId: string,
  opts: { status?: string; page?: number; size?: number } = {},
) =>
  http
    .get<IncidentView[]>(`${BASE}/${monitorId}/incidents`, {
      params: {
        ...(opts.status ? { status: opts.status } : {}),
        page: opts.page ?? 0,
        size: opts.size ?? 50,
      },
    })
    .then((r) => r.data);

export const apiGetIncident = (id: string) =>
  http.get<IncidentView>(`${BASE}/incidents/${id}`).then((r) => r.data);

export const apiAckIncident = (id: string, body: IncidentNote = {}) =>
  http.post<IncidentView>(`${BASE}/incidents/${id}/ack`, body).then((r) => r.data);

export const apiResolveIncident = (id: string, body: IncidentNote = {}) =>
  http.post<IncidentView>(`${BASE}/incidents/${id}/resolve`, body).then((r) => r.data);

/* ===== maintenance ============================================== */
export const apiCreateMaintenance = (monitorId: string, body: MaintenanceRequest) =>
  http.post<MaintenanceView>(`${BASE}/${monitorId}/maintenance`, body).then((r) => r.data);

export const apiListMaintenance = (monitorId: string) =>
  http.get<MaintenanceView[]>(`${BASE}/${monitorId}/maintenance`).then((r) => r.data);

export const apiDeleteMaintenance = (windowId: string) =>
  http.delete<void>(`${BASE}/maintenance/${windowId}`).then((r) => r.data);

/* ===== public status page ======================================= */
export const apiGetPublicStatus = (slug: string) =>
  http.get<PublicStatusView>(`${BASE}/public/status/${slug}`).then((r) => r.data);

/* ===== SSE stream =============================================== */
export const openMonitorRunStream = (monitorId: string): EventSource =>
  new EventSource(`${serviceUrl('monitor')}${BASE}/${monitorId}/run/stream`, { withCredentials: true });

/* ===== health =================================================== */
export const apiGetHealth = () =>
  http.get<{ status: string }>('/actuator/health').then((r) => r.data);
