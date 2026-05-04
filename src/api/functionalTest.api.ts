/**
 * Functional-Test raw HTTP layer — 1:1 mapping of `functional-test-mgmt-svc`
 * (port 8089).
 *
 *   page  →  services/functionalTest.service  →  THIS FILE  →  http://<functional-test svc>
 *
 * Five controllers covered:
 *   • FunctionalRunController  /api/v1/functional-tests/runs (+ /dashboard, /pause, /resume, /cancel, /stream)
 *   • AnalyticsController      /api/v1/functional-tests/runs/{id}/diff, /flaky, /trend
 *   • ScheduleController       /api/v1/functional-tests/schedules
 *   • ReportController         /api/v1/functional-tests/runs/{id}/report
 *   • HealthController         /api/v1/functional-tests/health
 *
 * Faithful to Java DTOs — page responses use Spring's `Page<T>` shape
 * (`pageable.pageNumber`, `numberOfElements`, etc.). Service layer
 * normalises that into `{content, page, size, totalElements, totalPages}`.
 */
import { createHttp } from '@/lib/http';
import { serviceUrl } from '@/lib/env';

/* ------------------------------ types ------------------------------------ */
export type RunStatus =
  | 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ERROR' | 'CANCELLED' | 'PAUSED' | string;
export type SourceType = 'TEST_SPEC' | 'COLLECTION' | 'INLINE' | string;
export type ReportFormat = 'HTML' | 'JSON' | 'JUNIT' | 'ALLURE';
export type InlineHint = 'POSTMAN' | 'OPENAPI' | 'HAR' | 'INSOMNIA' | 'CURL' | 'FORGEQ';

/** Spring's Page<T> shape — exactly what Java emits. */
export interface SpringPage<T> {
  content: T[];
  pageable?: { pageNumber: number; pageSize: number };
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface RuntimeOverride {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  bodyMode?: string;
  bodyLanguage?: string;
}

/**
 * Mirrors `FunctionalRun.RunConfig` on the Java side EXACTLY — Spring's
 * Jackson is strict (`FAIL_ON_UNKNOWN_PROPERTIES=true`), so any extra
 * field will reject the entire payload as VAL_JSON_MALFORMED.
 */
export interface RunConfig {
  failFast?: boolean;
  parallel?: boolean;            // step-level parallelism toggle
  maxParallelSteps?: number;     // 1-32 when parallel=true
  retryCount?: number;           // 0-5
  retryDelayMs?: number;
  requestTimeoutMs?: number;
  stepTimeoutMs?: number;
  stopOnFirstFailure?: boolean;
  validateSchema?: boolean;
  captureResponseBody?: boolean;
  iterations?: number;
  dataFileGcs?: string;
  regions?: string[];
}

export interface AssertionOutcome {
  name: string;
  ok: boolean;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

export interface StepView {
  stepId: string;
  stepSeq: number;
  sourceId?: string | null;
  sourceType?: string | null;
  name: string;
  method?: string;
  url?: string;
  statusCode?: number | null;
  status?: RunStatus;
  failureReason?: string | null;
  totalMs?: number | null;
  dnsMs?: number | null;
  connectMs?: number | null;
  tlsMs?: number | null;
  sendMs?: number | null;
  ttfbMs?: number | null;
  receiveMs?: number | null;
  assertions?: AssertionOutcome[] | null;
  extractedVars?: Record<string, string> | null;
  retryCount?: number | null;
  startedAt?: number | string | null;
  completedAt?: number | string | null;
}

export interface RunView {
  runId: string;
  workspaceId: string;
  name: string;
  sourceType: SourceType;
  testSpecId?: string | null;
  collectionId?: string | null;
  environmentId?: string | null;
  region?: string | null;
  status: RunStatus;
  statusReason?: string | null;
  totalSteps?: number | null;
  passedSteps?: number | null;
  failedSteps?: number | null;
  skippedSteps?: number | null;
  totalDurationMs?: number | null;
  avgDurationMs?: number | null;
  queuedAt?: number | string | null;
  startedAt?: number | string | null;
  completedAt?: number | string | null;
  pausedAt?: number | string | null;
  triggeredByEmail?: string;
  triggerSource?: string;
  scheduleId?: string | null;
  tags?: string[] | null;
  steps?: StepView[] | null;
}

export interface StartRunRequestBody {
  workspaceId: string;
  /** Exactly ONE of testSpecId / collectionId / inlineContent must be set. */
  testSpecId?: string;
  collectionId?: string;
  inlineContent?: string;
  inlineHint?: InlineHint;
  orderedIds?: string[];
  environmentId?: string;
  extraVars?: Record<string, string>;
  runtimeOverrides?: Record<string, RuntimeOverride>;
  config?: RunConfig;
  region?: string;
  tags?: string[];
  name?: string;
  scheduleId?: string;
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
  passRatePct: number;
  avgDurationMs: number;
}

/* ----- analytics ---- */
export type StepDiffKind = 'REGRESSED' | 'IMPROVED' | 'LATENCY_REGRESSED' | 'UNCHANGED' | string;

export interface StepDiff {
  sourceId?: string | null;
  name: string;
  baseStatus?: string;
  compareStatus?: string;
  baseStatusCode?: number | null;
  compareStatusCode?: number | null;
  baseTotalMs?: number | null;
  compareTotalMs?: number | null;
  kind: StepDiffKind;
}

export interface RunDiff {
  baseRunId: string;
  compareRunId: string;
  steps: StepDiff[];
  changed: number;
  regressed: number;
  improved: number;
}

export interface FlakyEntry {
  sourceId?: string | null;
  name: string;
  runs: number;
  passes: number;
  fails: number;
  flips: number;
  failureRatePct: number;
}

export interface FlakyReport {
  windowSize: number;
  entries: FlakyEntry[];
}

export interface TrendPoint {
  at: number | string;
  runId: string;
  status: RunStatus;
  passed: number;
  failed: number;
  durationMs: number;
}

/* ----- schedules ---- */
export interface ScheduleCreateBody {
  workspaceId: string;
  testSpecId?: string;
  collectionId?: string;
  orderedIds?: string[];
  environmentId?: string;
  name?: string;
  description?: string;
  cron: string;
  timezone?: string;
  regions?: string[];
  config?: RunConfig;
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

/* ----------------------------- client ------------------------------------ */
const http = createHttp('functionalTest');
const BASE = '/api/v1/functional-tests';

/* =============================== runs ==================================== */
export const apiStartRun = (body: StartRunRequestBody) =>
  http.post<StartRunResponse>(`${BASE}/runs`, body).then((r) => r.data);

export const apiListRuns = (
  workspaceId: string,
  opts: { status?: string; page?: number; size?: number } = {},
) =>
  http
    .get<SpringPage<RunView>>(`${BASE}/runs`, {
      params: {
        workspaceId,
        ...(opts.status ? { status: opts.status } : {}),
        page: opts.page ?? 0,
        size: opts.size ?? 20,
      },
    })
    .then((r) => r.data);

export const apiGetRun = (runId: string) =>
  http.get<RunView>(`${BASE}/runs/${runId}`).then((r) => r.data);

export const apiGetDashboard = (workspaceId: string) =>
  http
    .get<DashboardStats>(`${BASE}/dashboard`, { params: { workspaceId } })
    .then((r) => r.data);

export const apiPauseRun = (runId: string) =>
  http.post<void>(`${BASE}/runs/${runId}/pause`).then((r) => r.data);

export const apiResumeRun = (runId: string) =>
  http.post<void>(`${BASE}/runs/${runId}/resume`).then((r) => r.data);

export const apiCancelRun = (runId: string) =>
  http.post<void>(`${BASE}/runs/${runId}/cancel`).then((r) => r.data);

/**
 * Open a server-sent-events stream of run progress.
 * Returns the EventSource so the caller can `.addEventListener` to:
 *   `run.start` · `step.start` · `step.end` · `run.done`
 * Caller is responsible for closing it on unmount.
 *
 * Note: EventSource cannot send custom headers, so dev-bypass relies on
 *       CORS + cookie. The functional-test service is configured to
 *       accept the origin already.
 */
export const openRunStream = (runId: string): EventSource => {
  const url = `${serviceUrl('functionalTest')}${BASE}/runs/${runId}/stream`;
  return new EventSource(url, { withCredentials: true });
};

/* =============================== analytics =============================== */
export const apiDiffRuns = (runId: string, compareWith: string) =>
  http
    .get<RunDiff>(`${BASE}/runs/${runId}/diff`, { params: { compareWith } })
    .then((r) => r.data);

export const apiGetFlakyReport = (testSpecId: string, window = 10) =>
  http
    .get<FlakyReport>(`${BASE}/flaky`, { params: { testSpecId, window } })
    .then((r) => r.data);

export const apiGetTrend = (testSpecId: string, limit = 20) =>
  http
    .get<TrendPoint[]>(`${BASE}/trend`, { params: { testSpecId, limit } })
    .then((r) => r.data);

/* =============================== schedules =============================== */
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

export const apiPauseSchedule = (id: string) =>
  http.post<ScheduleView>(`${BASE}/schedules/${id}/pause`).then((r) => r.data);

export const apiResumeSchedule = (id: string) =>
  http.post<ScheduleView>(`${BASE}/schedules/${id}/resume`).then((r) => r.data);

export const apiTriggerSchedule = (id: string) =>
  http.post<StartRunResponse>(`${BASE}/schedules/${id}/trigger`).then((r) => r.data);

export const apiDeleteSchedule = (id: string) =>
  http.delete<void>(`${BASE}/schedules/${id}`).then((r) => r.data);

/* =============================== report ================================== */
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

/* =============================== health ================================== */
export const apiGetHealth = () =>
  http.get<{ time: string; status: string; service: string }>(`${BASE}/health`).then((r) => r.data);
