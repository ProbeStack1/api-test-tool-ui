import { dashboardApi } from '../lib/apiClient';

const DASHBOARD_BASE = '/api/v1/dashboard/summary';

const normalizeDashboardSummary = (data) => ({
  userId: data.userId,
  summary: data.summary,
  modules: data.modules,
  lastUpdated: data.lastUpdated,
});

export const getDashboardSummary = (workspaceId, modules = []) => {
  const params = {};
  if (workspaceId) params.workspaceId = workspaceId;
  if (modules.length) params.modules = modules.join(',');
  return dashboardApi
    .get(DASHBOARD_BASE, { params })
    .then((res) => normalizeDashboardSummary(res.data));
};

export const getTotalCollections = (d) =>
  d?.summary?.collections?.total ?? 0;

export const getTotalFolders = (d) =>
  d?.summary?.collections?.totalFolders ?? 0;

export const getTotalRequests = (d) =>
  d?.summary?.requests?.total ?? 0;

export const getRequestsByMethod = (d) =>
  d?.summary?.requests?.byMethod ?? {};

export const getTotalEnvironments = (d) =>
  d?.summary?.environments?.total ?? 0;

export const getActiveEnvironments = (d) =>
  d?.summary?.environments?.active ?? 0;

export const getModuleCount = (d, moduleName) =>
  d?.modules?.[moduleName]?.count ?? 0;

export const getModuleDetails = (d, moduleName) =>
  d?.modules?.[moduleName]?.details ?? {};

export const getRequestTypeBreakdown = (d) => {
  const details = d?.modules?.requestTypes?.details ?? {};
  const http = details.http ?? {};
  const mcp = details.mcp ?? {};
  const httpTotal = Object.values(http).reduce((sum, v) => sum + v, 0);
  const mcpTotal = Object.values(mcp).reduce((sum, v) => sum + v, 0);
  return { http, mcp, httpTotal, mcpTotal };
};

export const getMockServerDetails = (d) => {
  const details = d?.modules?.mockServers?.details ?? {};
  return {
    count: d?.modules?.mockServers?.count ?? 0,
    endpointsByMethod: details.endpointsByMethod ?? {},
  };
};

export const getFunctionalRunDetails = (d) => {
  const details = d?.modules?.functionalTestRuns?.details ?? {};
  return {
    count: d?.modules?.functionalTestRuns?.count ?? 0,
    completed: details.completed ?? 0,
    scheduled: details.scheduled ?? {},
    manual: details.manual ?? {},
  };
};

export const getScheduledRunDetails = (d) => {
  const details = d?.modules?.scheduledRuns?.details ?? {};
  return {
    count: d?.modules?.scheduledRuns?.count ?? 0,
    active: details.active ?? 0,
    paused: details.paused ?? 0,
    totalExecutions: details.totalExecutions ?? 0,
  };
};
