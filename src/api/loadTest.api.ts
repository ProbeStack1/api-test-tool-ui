/**
 * Load-Test raw HTTP layer — 1:1 mapping of `load-test-mgmt-svc`
 * (port 8091).
 *
 *   page  →  services/loadTest.service  →  THIS FILE  →  http://<load-test svc>
 *
 * Six controllers covered:
 *   • LoadRunController     /api/v1/load-tests/runs (+ /dashboard, /pause, /resume, /cancel, /stream)
 *   • ScheduleController    /api/v1/load-tests/schedules
 *   • AnalyticsController   /api/v1/load-tests/runs/{id}/diff, /trend, /baselines
 *   • ImportController      /api/v1/load-tests/import/detect
 *   • ReportController      /api/v1/load-tests/runs/{id}/report
 *   • HealthController      /api/v1/load-tests/health
 *
 * Page responses follow Spring's `Page<T>` shape — flattened by the
 * service layer's normaliser.
 */
import { createHttp } from '@/lib/http';
import { serviceUrl } from '@/lib/env';

/* ------------------------------ types ------------------------------------ */
export type RunStatus =
  | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'ERROR' | 'CANCELLED' | string;

export interface SpringPage<T> {
  content: T[];
  pageable?: { pageNumber: number; pageSize: number };
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

/**
 * Mirrors `LoadTestRun.LoadConfig` on Java exactly. Spring's Jackson
 * is strict (`FAIL_ON_UNKNOWN_PROPERTIES=true`) — a stray field will
 * reject the entire payload as `VAL_JSON_MALFORMED`.
 */
export interface LoadConfig {
  concurrency?: number;
  targetRps?: number;
  mode?: string;
  durationSeconds?: number;
  totalRequests?: number;
  rampUpSeconds?: number;
  thinkTimeMs?: number;
  timeoutMs?: number;
  retries?: number;
  retryBackoffMs?: number;
  expectedStatus?: number[];
  percentiles?: number[];
  insecure?: boolean;
  proxyUrl?: string;
  preflightCheck?: boolean;
  respectRateLimit?: boolean;
}

export interface LoadProfile {
  type?: string;
  stages?: Array<{ durationSeconds: number; targetVus: number }>;
}

export interface Thresholds {
  maxAvgLatencyMs?: number;
  maxP95LatencyMs?: number;
  maxP99LatencyMs?: number;
  minActualRps?: number;
  maxErrorRatePct?: number;
}

export interface EndpointResult {
  endpointName?: string;
  method?: string;
  url?: string;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  avgLatencyMs?: number;
  p95Ms?: number;
  p99Ms?: number;
  errorRatePct?: number;
}

export interface LoadRunView {
  runId: string;
  workspaceId: string;
  name?: string;
  sourceType: string;
  testSpecId?: string | null;
  collectionId?: string | null;
  environmentId?: string | null;
  region?: string | null;
  status: RunStatus;
  statusReason?: string | null;
  totalRequests?: number | null;
  successfulRequests?: number | null;
  failedRequests?: number | null;
  actualRps?: number | null;
  successRps?: number | null;
  avgLatencyMs?: number | null;
  percentiles?: Record<string, number> | null;
  statusCodes?: Record<string, number> | null;
  errorTypes?: Record<string, number> | null;
  endpointResults?: EndpointResult[] | null;
  throughputMbps?: number | null;
  thresholdViolations?: string[] | null;
  passed?: boolean | null;
  config?: LoadConfig | null;
  profile?: LoadProfile | null;
  thresholds?: Thresholds | null;
  queuedAt?: number | string | null;
  startedAt?: number | string | null;
  completedAt?: number | string | null;
  pausedAt?: number | string | null;
  triggeredByEmail?: string;
  triggerSource?: string;
  scheduleId?: string | null;
  tags?: string[] | null;
  baselineRunId?: string | null;
}

export interface StartRunRequestBody {
  workspaceId: string;
  testSpecId?: string;
  collectionId?: string;
  inlineContent?: string;
  inlineFormat?: string;
  orderedIds?: string[];
  environmentId?: string;
  extraVars?: Record<string, string>;
  name?: string;
  region?: string;
  tags?: string[];
  config?: LoadConfig;
  profile?: LoadProfile;
  thresholds?: Thresholds;
}

export interface StartRunResponse {
  runId: string;
  status: RunStatus;
  queuedAt: number | string;
}

export interface DashboardStats {
  runsTotal: number;
  runsRunning: number;
  runsSuccess: number;
  runsFailed: number;
  runsError: number;
  runsCancelled: number;
  passRatePct: number;
}

/* analytics */
export interface RunDiff {
  baseRunId: string;
  compareRunId: string;
  baseAvgLatencyMs?: number; compareAvgLatencyMs?: number; avgLatencyDeltaPct?: number;
  baseP95Ms?: number;  compareP95Ms?: number;  p95DeltaPct?: number;
  baseP99Ms?: number;  compareP99Ms?: number;  p99DeltaPct?: number;
  baseErrorRatePct?: number; compareErrorRatePct?: number; errorRateDeltaPct?: number;
  baseActualRps?: number; compareActualRps?: number; rpsDeltaPct?: number;
  verdict: string;
}

export interface TrendPoint {
  at: number | string;
  runId: string;
  status: RunStatus;
  actualRps?: number | null;
  p95Ms?: number | null;
  p99Ms?: number | null;
  errorRatePct?: number | null;
}

export interface BaselineCreateRequest {
  sourceId: string;
  sourceType: string;
  runId: string;
  name?: string;
  note?: string;
}

export interface BaselineView {
  baselineId: string;
  sourceId: string;
  sourceType: string;
  runId: string;
  name?: string;
  note?: string;
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
  avgLatencyMs?: number;
  actualRps?: number;
  errorRatePct?: number;
  createdAt: number | string;
  createdBy?: string;
}

/* schedules */
export interface ScheduleCreateBody {
  workspaceId: string;
  name?: string;
  description?: string;
  testSpecId?: string;
  collectionId?: string;
  orderedIds?: string[];
  environmentId?: string;
  cron: string;
  timezone?: string;
  regions?: string[];
  config?: LoadConfig;
  profile?: LoadProfile;
  thresholds?: Thresholds;
  extraVars?: Record<string, string>;
  tags?: string[];
  notificationEmails?: string[];
  notificationSlackWebhook?: string;
}

export interface ScheduleView {
  scheduleId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  testSpecId?: string | null;
  collectionId?: string | null;
  environmentId?: string | null;
  cron: string;
  timezone?: string;
  regions?: string[] | null;
  status?: string;
  lastRunId?: string | null;
  lastRunStatus?: string | null;
  lastRunAt?: number | string | null;
  nextRunAt?: number | string | null;
  tags?: string[] | null;
  createdAt?: number | string;
}

export interface ImportDetectResponse {
  detectedFormat: string;
  stepCount?: number;
}

export type ReportFormat = 'HTML' | 'JSON' | 'JUNIT';

/* ----------------------------- client ------------------------------------ */
const http = createHttp('loadTest');
const BASE = '/api/v1/load-tests';

/* runs */
export const apiStartRun = (body: StartRunRequestBody) =>
  http.post<StartRunResponse>(`${BASE}/runs`, body).then((r) => r.data);

export const apiListRuns = (
  workspaceId: string,
  opts: { status?: string; page?: number; size?: number } = {},
) =>
  http
    .get<SpringPage<LoadRunView>>(`${BASE}/runs`, {
      params: {
        workspaceId,
        ...(opts.status ? { status: opts.status } : {}),
        page: opts.page ?? 0,
        size: opts.size ?? 20,
      },
    })
    .then((r) => r.data);

export const apiGetRun = (runId: string) =>
  http.get<LoadRunView>(`${BASE}/runs/${runId}`).then((r) => r.data);

export const apiGetDashboard = (workspaceId: string) =>
  http.get<DashboardStats>(`${BASE}/dashboard`, { params: { workspaceId } }).then((r) => r.data);

export const apiPauseRun  = (runId: string) => http.post<void>(`${BASE}/runs/${runId}/pause`).then((r) => r.data);
export const apiResumeRun = (runId: string) => http.post<void>(`${BASE}/runs/${runId}/resume`).then((r) => r.data);
export const apiCancelRun = (runId: string) => http.post<void>(`${BASE}/runs/${runId}/cancel`).then((r) => r.data);

export const openRunStream = (runId: string): EventSource =>
  new EventSource(`${serviceUrl('loadTest')}${BASE}/runs/${runId}/stream`, { withCredentials: true });

/* analytics */
export const apiDiffRuns = (runId: string, compareWith: string) =>
  http.get<RunDiff>(`${BASE}/runs/${runId}/diff`, { params: { compareWith } }).then((r) => r.data);

export const apiGetTrend = (sourceId: string, sourceType: 'TEST_SPEC' | 'COLLECTION', limit = 20) =>
  http.get<TrendPoint[]>(`${BASE}/trend`, { params: { sourceId, sourceType, limit } }).then((r) => r.data);

export const apiCreateBaseline = (body: BaselineCreateRequest) =>
  http.post<BaselineView>(`${BASE}/baselines`, body).then((r) => r.data);

export const apiGetBaseline = (sourceId: string) =>
  http.get<BaselineView>(`${BASE}/baselines/${sourceId}`).then((r) => r.data);

/* schedules */
export const apiCreateSchedule = (body: ScheduleCreateBody) =>
  http.post<ScheduleView>(`${BASE}/schedules`, body).then((r) => r.data);

export const apiListSchedules = (
  workspaceId: string,
  opts: { page?: number; size?: number } = {},
) =>
  http
    .get<SpringPage<ScheduleView>>(`${BASE}/schedules`, {
      params: { workspaceId, page: opts.page ?? 0, size: opts.size ?? 20 },
    })
    .then((r) => r.data);

export const apiPauseSchedule  = (id: string) => http.post<ScheduleView>(`${BASE}/schedules/${id}/pause`).then((r) => r.data);
export const apiResumeSchedule = (id: string) => http.post<ScheduleView>(`${BASE}/schedules/${id}/resume`).then((r) => r.data);
export const apiTriggerSchedule = (id: string) => http.post<StartRunResponse>(`${BASE}/schedules/${id}/trigger`).then((r) => r.data);
export const apiDeleteSchedule = (id: string) => http.delete<void>(`${BASE}/schedules/${id}`).then((r) => r.data);

/* import */
export const apiDetectImport = (content: string, formatHint?: string) =>
  http.post<ImportDetectResponse>(`${BASE}/import/detect`, { content, formatHint }).then((r) => r.data);

/* report */
export const apiDownloadReport = async (runId: string, format: ReportFormat = 'HTML') => {
  const res = await http.get(`${BASE}/runs/${runId}/report`, {
    params: { format },
    responseType: 'blob',
  });
  return {
    blob: res.data as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

/* health */
export const apiGetHealth = () =>
  http.get<{ time: string; status: string; service: string }>(`${BASE}/health`).then((r) => r.data);
