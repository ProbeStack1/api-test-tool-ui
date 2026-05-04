/**
 * Monitor service — UI-facing layer with epoch-second → ISO normalisation
 * for every Java `Instant` field.
 */
import {
  apiCreateMonitor, apiListMonitors, apiGetMonitor, apiUpdateMonitor, apiDeleteMonitor,
  apiPauseMonitor, apiResumeMonitor, apiRunNow,
  apiGetStats, apiGetTimeseries,
  apiPublishStatusPage, apiUnpublishStatusPage,
  apiListRuns, apiGetRunDetail, apiExportRunsCsv,
  apiListIncidents, apiGetIncident, apiAckIncident, apiResolveIncident,
  apiCreateMaintenance, apiListMaintenance, apiDeleteMaintenance,
  apiGetPublicStatus, apiGetHealth, openMonitorRunStream,
  type MonitorCreate, type MonitorUpdate, type MonitorView,
  type MonitorStats, type TimeseriesPoint, type MonitorRunView,
  type MonitorRunDetail, type IncidentView, type MaintenanceRequest, type MaintenanceView,
  type PublicStatusView, type StatusPageRequest, type IncidentNote,
} from '@/api/monitor.api';

export type {
  MonitorCreate, MonitorUpdate, MonitorView, MonitorStats, TimeseriesPoint,
  MonitorRunView, MonitorRunDetail, IncidentView, MaintenanceRequest, MaintenanceView,
  PublicStatusView, StatusPageRequest, IncidentNote,
};
export type Monitor = MonitorView;

const toIso = (v: number | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

const normMonitor = (m: MonitorView): Monitor => ({
  ...m,
  lastRunAt:  toIso(m.lastRunAt) ?? null,
  nextRunAt:  toIso(m.nextRunAt) ?? null,
  createdAt:  toIso(m.createdAt) ?? '',
  updatedAt:  toIso(m.updatedAt) ?? '',
});

const normRun = (r: MonitorRunView): MonitorRunView => ({
  ...r,
  startedAt:   toIso(r.startedAt),
  completedAt: toIso(r.completedAt),
});

const normTrend = (t: TimeseriesPoint): TimeseriesPoint => ({ ...t, at: toIso(t.at) ?? '' });

const normIncident = (i: IncidentView): IncidentView => ({
  ...i,
  openedAt:        toIso(i.openedAt),
  acknowledgedAt:  toIso(i.acknowledgedAt),
  resolvedAt:      toIso(i.resolvedAt),
});

const normMaintenance = (m: MaintenanceView): MaintenanceView => ({
  ...m,
  startsAt:  toIso(m.startsAt) ?? '',
  endsAt:    toIso(m.endsAt) ?? '',
  createdAt: toIso(m.createdAt),
});

/* ───── monitors ──────────────────────────────────────────────── */
export const createMonitor = (body: MonitorCreate) => apiCreateMonitor(body).then(normMonitor);

export const listMonitors = (
  workspaceId: string,
  opts: { collectionId?: string; page?: number; size?: number } = {},
): Promise<Monitor[]> => apiListMonitors(workspaceId, opts).then((arr) => (arr ?? []).map(normMonitor));

export const getMonitor = (id: string) => apiGetMonitor(id).then(normMonitor);
export const updateMonitor = (id: string, body: MonitorUpdate) => apiUpdateMonitor(id, body).then(normMonitor);
export const deleteMonitor = (id: string) => apiDeleteMonitor(id);
export const pauseMonitor  = (id: string) => apiPauseMonitor(id).then(normMonitor);
export const resumeMonitor = (id: string) => apiResumeMonitor(id).then(normMonitor);
export const runMonitorNow = (id: string) => apiRunNow(id);

export const getMonitorStats = (id: string, days = 7) => apiGetStats(id, days).then((s) => ({
  ...s, windowFrom: toIso(s.windowFrom) ?? '', windowTo: toIso(s.windowTo) ?? '',
}));
export const getMonitorTimeseries = (id: string, days = 7) =>
  apiGetTimeseries(id, days).then((arr) => (arr ?? []).map(normTrend));

export const publishStatusPage = (id: string, body: StatusPageRequest = {}) =>
  apiPublishStatusPage(id, body).then(normMonitor);
export const unpublishStatusPage = (id: string) => apiUnpublishStatusPage(id).then(normMonitor);

/* ───── runs ──────────────────────────────────────────────────── */
export const listMonitorRuns = (
  monitorId: string,
  opts: { page?: number; size?: number } = {},
): Promise<MonitorRunView[]> =>
  apiListRuns(monitorId, opts).then((arr) => (arr ?? []).map(normRun));

export const getMonitorRunDetail = (runId: string) =>
  apiGetRunDetail(runId).then((d) => ({ ...d, run: normRun(d.run) }));

export const exportMonitorRunsCsv = (monitorId: string, limit = 1000) =>
  apiExportRunsCsv(monitorId, limit);

export const downloadCsvBlob = (
  blob: Blob, contentDisposition: string | undefined, fallback = 'monitor-runs.csv',
): void => {
  const cd = contentDisposition ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] ?? fallback;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = decodeURIComponent(filename);
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

/* ───── incidents ─────────────────────────────────────────────── */
export const listIncidents = (
  monitorId: string,
  opts: { status?: string; page?: number; size?: number } = {},
): Promise<IncidentView[]> =>
  apiListIncidents(monitorId, opts).then((arr) => (arr ?? []).map(normIncident));

export const getIncident = (id: string) => apiGetIncident(id).then(normIncident);
export const ackIncident = (id: string, body: IncidentNote = {}) => apiAckIncident(id, body).then(normIncident);
export const resolveIncident = (id: string, body: IncidentNote = {}) => apiResolveIncident(id, body).then(normIncident);

/* ───── maintenance ───────────────────────────────────────────── */
export const createMaintenance = (monitorId: string, body: MaintenanceRequest) =>
  apiCreateMaintenance(monitorId, body).then(normMaintenance);
export const listMaintenance = (monitorId: string) =>
  apiListMaintenance(monitorId).then((arr) => (arr ?? []).map(normMaintenance));
export const deleteMaintenance = (windowId: string) => apiDeleteMaintenance(windowId);

/* ───── public ────────────────────────────────────────────────── */
export const getPublicStatus = (slug: string): Promise<PublicStatusView> =>
  apiGetPublicStatus(slug).then((p) => ({ ...p, lastRunAt: toIso(p.lastRunAt) }));

/* ───── stream + health ───────────────────────────────────────── */
export { openMonitorRunStream };
export const getHealth = () => apiGetHealth();

/** Computed: aggregate workspace summary (Java has no /summary endpoint). */
export interface WorkspaceMonitorSummary {
  totalMonitors: number;
  activeMonitors: number;
  pausedMonitors: number;
  currentlyFailing: number;
  failedMonitors: number;
  successMonitors: number;
  avgUptimePct: number;
}

export const computeWorkspaceSummary = (monitors: Monitor[]): WorkspaceMonitorSummary => {
  let active = 0, paused = 0, failing = 0, success = 0, failed = 0;
  let totalRuns = 0, successRuns = 0;
  for (const m of monitors) {
    if (m.status === 'PAUSED') paused++;
    else active++;
    if ((m.consecutiveFailures ?? 0) > 0) failing++;
    if (m.lastState === 'FAILED' || m.lastState === 'DOWN') failed++;
    if (m.lastState === 'SUCCESS' || m.lastState === 'UP') success++;
    totalRuns   += m.totalRuns ?? 0;
    successRuns += m.successRuns ?? 0;
  }
  return {
    totalMonitors: monitors.length,
    activeMonitors: active,
    pausedMonitors: paused,
    currentlyFailing: failing,
    failedMonitors: failed,
    successMonitors: success,
    avgUptimePct: totalRuns > 0 ? (successRuns / totalRuns) * 100 : 100,
  };
};
