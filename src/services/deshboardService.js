import { dashboardApi } from '../lib/apiClient';

const DASHBOARD_BASE = '/api/v1/dashboard/summary';

const normalizeDashboardSummary = (data) => ({
  userId: data.userId,
  summary: data.summary,
  modules: data.modules,
  lastUpdated: data.lastUpdated,
});

export const getDashboardSummary = (modules = []) => {
  const params = modules.length ? { modules: modules.join(',') } : {};
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
