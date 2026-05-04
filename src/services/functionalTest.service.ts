/**
 * Functional-Test service — UI-facing layer.
 *
 *   page  →  THIS FILE  →  api/functionalTest.api  →  http://<functional-test svc>
 *
 * Mirrors `functional-test-mgmt-svc` (port 8089). Provides:
 *   - thin re-exports of the Java DTO vocabulary
 *   - normalisers that flatten Spring's `Page<T>` and convert
 *     epoch-second `Instant` timestamps to ISO strings
 *   - the `__dummy` env-gated fallback used by every other service
 */
import {
  apiCancelRun,
  apiCreateSchedule,
  apiDeleteSchedule,
  apiDiffRuns,
  apiDownloadReport,
  apiGetDashboard,
  apiGetFlakyReport,
  apiGetHealth,
  apiGetRun,
  apiGetTrend,
  apiListRuns,
  apiListSchedules,
  apiPauseRun,
  apiPauseSchedule,
  apiResumeRun,
  apiResumeSchedule,
  apiStartRun,
  apiTriggerSchedule,
  openRunStream,
  type DashboardStats,
  type FlakyReport,
  type ReportFormat,
  type RunDiff,
  type RunView,
  type ScheduleCreateBody,
  type ScheduleView,
  type SpringPage,
  type StartRunRequestBody,
  type StartRunResponse,
  type StepView,
  type TrendPoint,
} from '@/api/functionalTest.api';

/* ───────── re-exported vocabulary ──────────────────────────────────────── */
export type {
  DashboardStats, FlakyReport, ReportFormat, RunDiff, ScheduleCreateBody,
  StartRunRequestBody, StartRunResponse, TrendPoint,
};
export type Run        = RunView;
export type Step       = StepView;
export type Schedule   = ScheduleView;

/** Friendly page envelope (UI-side). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/* ───────── normalisers ────────────────────────────────────────────────── */
/** Java emits epoch seconds (e.g. `1777455230.241`) for `Instant`. */
const toIso = (v: number | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

const normStep = (s: StepView): Step => ({
  ...s,
  startedAt:   toIso(s.startedAt) ?? null,
  completedAt: toIso(s.completedAt) ?? null,
});

const normRun = (r: RunView): Run => ({
  ...r,
  steps: r.steps ? r.steps.map(normStep) : null,
  queuedAt:    toIso(r.queuedAt) ?? null,
  startedAt:   toIso(r.startedAt) ?? null,
  completedAt: toIso(r.completedAt) ?? null,
  pausedAt:    toIso(r.pausedAt) ?? null,
});

const normSchedule = (s: ScheduleView): Schedule => ({
  ...s,
  lastRunAt: toIso(s.lastRunAt) ?? null,
  nextRunAt: toIso(s.nextRunAt) ?? null,
  createdAt: toIso(s.createdAt) ?? '',
});

const normTrend = (t: TrendPoint): TrendPoint => ({
  ...t,
  at: toIso(t.at) ?? '',
});

const normPage = <T, U>(p: SpringPage<T> | T[] | undefined | null, map: (t: T) => U): Page<U> => {
  if (!p) return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 };
  if (Array.isArray(p)) {
    return { content: p.map(map), page: 0, size: p.length, totalElements: p.length, totalPages: 1 };
  }
  const content = (p.content ?? []).map(map);
  return {
    content,
    page: p.pageable?.pageNumber ?? p.number ?? 0,
    size: p.pageable?.pageSize ?? p.size ?? content.length,
    totalElements: p.totalElements ?? content.length,
    totalPages: p.totalPages ?? (content.length ? 1 : 0),
  };
};

/* ───────── dummy fallback (UI-only, OFF by default) ────────────────────── */
const useDummy = (): boolean =>
  import.meta.env.VITE_FUNCTIONAL_TEST_USE_DUMMY === 'true';
const dummyOnError = (): boolean =>
  import.meta.env.VITE_FUNCTIONAL_TEST_DUMMY_ON_ERROR === 'true';
const isNetworkError = (e: unknown): boolean => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || status === undefined;
};
const withFallback = async <T>(live: () => Promise<T>, dummy: () => T): Promise<T> => {
  if (useDummy()) return dummy();
  try { return await live(); }
  catch (e) {
    if (dummyOnError() && isNetworkError(e)) return dummy();
    throw e;
  }
};

const emptyPage = <T>(): Page<T> => ({
  content: [], page: 0, size: 0, totalElements: 0, totalPages: 0,
});

/* ───────── runs ───────────────────────────────────────────────────────── */
export const startRun = (body: StartRunRequestBody): Promise<StartRunResponse> =>
  apiStartRun(body);

export const listRuns = (
  workspaceId: string,
  opts: { status?: string; page?: number; size?: number } = {},
): Promise<Page<Run>> =>
  withFallback(
    () => apiListRuns(workspaceId, opts).then((p) => normPage(p, normRun)),
    () => emptyPage<Run>(),
  );

export const getRun = (runId: string): Promise<Run> =>
  apiGetRun(runId).then(normRun);

export const getDashboard = (workspaceId: string): Promise<DashboardStats> =>
  withFallback(
    () => apiGetDashboard(workspaceId),
    () => ({ runsTotal: 0, runsRunning: 0, runsSuccess: 0, runsFailed: 0, runsError: 0, passRatePct: 0, avgDurationMs: 0 }),
  );

export const pauseRun  = (runId: string) => apiPauseRun(runId);
export const resumeRun = (runId: string) => apiResumeRun(runId);
export const cancelRun = (runId: string) => apiCancelRun(runId);

export { openRunStream };

/* ───────── analytics ──────────────────────────────────────────────────── */
export const diffRuns = (runId: string, compareWith: string): Promise<RunDiff> =>
  apiDiffRuns(runId, compareWith);

export const getFlakyReport = (testSpecId: string, window = 10): Promise<FlakyReport> =>
  apiGetFlakyReport(testSpecId, window);

export const getTrend = (testSpecId: string, limit = 20): Promise<TrendPoint[]> =>
  apiGetTrend(testSpecId, limit).then((arr) => arr.map(normTrend));

/* ───────── schedules ──────────────────────────────────────────────────── */
export const createSchedule = (body: ScheduleCreateBody): Promise<Schedule> =>
  apiCreateSchedule(body).then(normSchedule);

export const listSchedules = (
  workspaceId: string,
  opts: { page?: number; size?: number } = {},
): Promise<Page<Schedule>> =>
  withFallback(
    () => apiListSchedules(workspaceId, opts).then((p) => normPage(p, normSchedule)),
    () => emptyPage<Schedule>(),
  );

export const pauseSchedule  = (id: string) => apiPauseSchedule(id).then(normSchedule);
export const resumeSchedule = (id: string) => apiResumeSchedule(id).then(normSchedule);
export const triggerSchedule = (id: string) => apiTriggerSchedule(id);
export const deleteSchedule = (id: string) => apiDeleteSchedule(id);

/* ───────── reports ────────────────────────────────────────────────────── */
export const downloadReport = (runId: string, format: ReportFormat = 'HTML') =>
  apiDownloadReport(runId, format);

export const downloadReportBlob = (
  blob: Blob,
  contentDisposition: string | undefined,
  fallbackName = 'report.html',
): void => {
  const cd = contentDisposition ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = decodeURIComponent(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ───────── health ─────────────────────────────────────────────────────── */
export const getHealth = () => apiGetHealth();
