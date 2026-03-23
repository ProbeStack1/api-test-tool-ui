import { dashboardApi } from '../lib/apiClient'; // adjust import based on your actual dashboardApi location

const DASHBOARD_BASE = '/api/v1/dashboard/summary';

/**
 * Normalize dashboard summary response
 */
const normalizeDashboardSummary = (data) => ({
  userId: data.userId,
  summary: data.summary,            // { collections, requests, environments }
  modules: data.modules,             // { mockServers, workspaces, testSpecs, libraryItems, ... }
  lastUpdated: data.lastUpdated,
});

/**
 * Fetch dashboard summary for the authenticated user.
 * The X-User-Id header should be automatically added by the dashboardApi interceptor.
 *
 * @param {string[]} [modules] - optional array of module names to include (e.g., ['mockServers', 'testSpecs']).
 *                                If omitted, all available modules are returned.
 * @returns {Promise<Object>} normalized dashboard summary object.
 */
export const getDashboardSummary = (modules = []) => {
  const params = modules.length ? { modules: modules.join(',') } : {};
  return dashboardApi
    .get(DASHBOARD_BASE, { params })
    .then((res) => normalizeDashboardSummary(res.data));
};

// ----------------------------------------------------------------------
// Convenience helpers to extract specific counts (optional)
// ----------------------------------------------------------------------

/**
 * Get total collections from dashboard summary.
 */
export const getTotalCollections = (dashboardData) =>
  dashboardData?.summary?.collections?.total ?? 0;

/**
 * Get total folders from dashboard summary.
 */
export const getTotalFolders = (dashboardData) =>
  dashboardData?.summary?.collections?.totalFolders ?? 0;

/**
 * Get total requests from dashboard summary.
 */
export const getTotalRequests = (dashboardData) =>
  dashboardData?.summary?.requests?.total ?? 0;

/**
 * Get request breakdown by method.
 */
export const getRequestsByMethod = (dashboardData) =>
  dashboardData?.summary?.requests?.byMethod ?? {};

/**
 * Get total environments.
 */
export const getTotalEnvironments = (dashboardData) =>
  dashboardData?.summary?.environments?.total ?? 0;

/**
 * Get active environments.
 */
export const getActiveEnvironments = (dashboardData) =>
  dashboardData?.summary?.environments?.active ?? 0;

/**
 * Get count from a specific module (e.g., 'mockServers', 'workspaces', 'testSpecs', 'libraryItems').
 */
export const getModuleCount = (dashboardData, moduleName) =>
  dashboardData?.modules?.[moduleName]?.count ?? 0;

/**
 * Get additional details from a module.
 */
export const getModuleDetails = (dashboardData, moduleName) =>
  dashboardData?.modules?.[moduleName]?.details ?? {};