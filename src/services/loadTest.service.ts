/**
 * Load-Test service — UI-facing layer.
 * Mirrors `load-test-mgmt-svc` (port 8091).
 */
import {
  apiCancelRun, apiCreateBaseline, apiCreateSchedule, apiDeleteSchedule,
  apiDetectImport, apiDiffRuns, apiDownloadReport, apiGetBaseline, apiGetDashboard,
  apiGetHealth, apiGetRun, apiGetTrend, apiListRuns, apiListSchedules, apiPauseRun,
  apiPauseSchedule, apiResumeRun, apiResumeSchedule, apiStartRun, apiTriggerSchedule,
  openRunStream,
  type BaselineCreateRequest, type BaselineView, type DashboardStats,
  type ImportDetectResponse, type LoadRunView, type ReportFormat, type RunDiff,
  type ScheduleCreateBody, type ScheduleView, type SpringPage,
  type StartRunRequestBody, type StartRunResponse, type TrendPoint,
} from '@/api/loadTest.api';

export type {
  BaselineCreateRequest, BaselineView, DashboardStats, ImportDetectResponse,
  ReportFormat, RunDiff, ScheduleCreateBody, StartRunRequestBody, StartRunResponse,
  TrendPoint,
};
export type LoadRun     = LoadRunView;
export type LoadSchedule = ScheduleView;

export interface Page<T> {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number;
}

const toIso = (v: number | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

const normRun = (r: LoadRunView): LoadRun => ({
  ...r,
  queuedAt:    toIso(r.queuedAt) ?? null,
  startedAt:   toIso(r.startedAt) ?? null,
  completedAt: toIso(r.completedAt) ?? null,
  pausedAt:    toIso(r.pausedAt) ?? null,
});
const normSchedule = (s: ScheduleView): LoadSchedule => ({
  ...s,
  lastRunAt: toIso(s.lastRunAt) ?? null,
  nextRunAt: toIso(s.nextRunAt) ?? null,
  createdAt: toIso(s.createdAt) ?? '',
});
const normTrend = (t: TrendPoint): TrendPoint => ({ ...t, at: toIso(t.at) ?? '' });

const normPage = <T, U>(p: SpringPage<T> | T[] | undefined | null, map: (t: T) => U): Page<U> => {
  if (!p) return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 };
  if (Array.isArray(p)) return { content: p.map(map), page: 0, size: p.length, totalElements: p.length, totalPages: 1 };
  const content = (p.content ?? []).map(map);
  return {
    content,
    page: p.pageable?.pageNumber ?? p.number ?? 0,
    size: p.pageable?.pageSize ?? p.size ?? content.length,
    totalElements: p.totalElements ?? content.length,
    totalPages: p.totalPages ?? (content.length ? 1 : 0),
  };
};

const useDummy     = () => import.meta.env.VITE_LOAD_TEST_USE_DUMMY === 'true';
const dummyOnError = () => import.meta.env.VITE_LOAD_TEST_DUMMY_ON_ERROR === 'true';
const isNetworkError = (e: unknown) => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || status === undefined;
};
const withFallback = async <T>(live: () => Promise<T>, dummy: () => T): Promise<T> => {
  if (useDummy()) return dummy();
  try { return await live(); }
  catch (e) { if (dummyOnError() && isNetworkError(e)) return dummy(); throw e; }
};
const emptyPage = <T>(): Page<T> => ({ content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 });

/* runs */
export const startRun = (body: StartRunRequestBody) => apiStartRun(body);
export const listRuns = (workspaceId: string, opts: { status?: string; page?: number; size?: number } = {}): Promise<Page<LoadRun>> =>
  withFallback(() => apiListRuns(workspaceId, opts).then((p) => normPage(p, normRun)), () => emptyPage<LoadRun>());
export const getRun = (id: string) => apiGetRun(id).then(normRun);
export const getDashboard = (workspaceId: string): Promise<DashboardStats> =>
  withFallback(() => apiGetDashboard(workspaceId), () => ({
    runsTotal: 0, runsRunning: 0, runsSuccess: 0, runsFailed: 0, runsError: 0, runsCancelled: 0, passRatePct: 0,
  }));
export const pauseRun  = (id: string) => apiPauseRun(id);
export const resumeRun = (id: string) => apiResumeRun(id);
export const cancelRun = (id: string) => apiCancelRun(id);
export { openRunStream };

/* analytics */
export const diffRuns       = (id: string, compareWith: string) => apiDiffRuns(id, compareWith);
export const getTrend       = (sourceId: string, sourceType: 'TEST_SPEC' | 'COLLECTION', limit = 20): Promise<TrendPoint[]> =>
  apiGetTrend(sourceId, sourceType, limit).then((arr) => arr.map(normTrend));
export const createBaseline = (body: BaselineCreateRequest) => apiCreateBaseline(body);
export const getBaseline    = (sourceId: string) => apiGetBaseline(sourceId);

/* schedules */
export const createSchedule  = (body: ScheduleCreateBody) => apiCreateSchedule(body).then(normSchedule);
export const listSchedules   = (workspaceId: string, opts: { page?: number; size?: number } = {}): Promise<Page<LoadSchedule>> =>
  withFallback(() => apiListSchedules(workspaceId, opts).then((p) => normPage(p, normSchedule)), () => emptyPage<LoadSchedule>());
export const pauseSchedule   = (id: string) => apiPauseSchedule(id).then(normSchedule);
export const resumeSchedule  = (id: string) => apiResumeSchedule(id).then(normSchedule);
export const triggerSchedule = (id: string) => apiTriggerSchedule(id);
export const deleteSchedule  = (id: string) => apiDeleteSchedule(id);

/* import + report + health */
export const detectImport   = (content: string, formatHint?: string) => apiDetectImport(content, formatHint);
export const downloadReport = (runId: string, format: ReportFormat = 'HTML') => apiDownloadReport(runId, format);
export const downloadReportBlob = (
  blob: Blob, contentDisposition: string | undefined, fallbackName = 'load-report.html',
): void => {
  const cd = contentDisposition ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = decodeURIComponent(filename);
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};
export const getHealth = () => apiGetHealth();
