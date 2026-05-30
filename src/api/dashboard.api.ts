/**
 * Dashboard API surface.
 *
 *   GET /overview          — KPI tiles + method donut + top monitors/collections
 *   GET /timeseries        — daily counts for charts
 *   GET /recent-activity   — audit log feed
 *   GET /feature-summary   — "everything at a glance" rich payload
 */
import { createHttp } from '@/lib/http';

const http = createHttp('dashboard');
const BASE = '/api/v1/dashboard';

export interface Kpi { total: number; delta: number }
export interface OverviewResponse {
  generatedAt: string;
  kpis: Record<string, Kpi>;
  kpiTrends: Record<string, number[]>;
  methodBreakdown: Record<string, number>;
  topMonitors: { id: string; name: string; subtitle: string; value: number }[];
  topCollections: { id: string; name: string; subtitle: string; value: number }[];
}
export interface TimeseriesResponse {
  days: string[];
  series: { label: string; key: string; values: number[] }[];
}
export interface RecentActivityResponse {
  items: { id: string; timestamp: string; actor: string; action: string;
           entityType: string; entityId: string; description: string }[];
}

// ─── New rich feature-summary payload ────────────────────────────────
export interface FeatureSummaryResponse {
  generatedAt: string;
  workspace: { id?: string; name?: string; ownerEmail?: string;
               totalMembers: number; createdAt?: string };
  aiTesting: { suites: number; cases: number; totalRuns: number; runsLast7d: number;
               passRateLast7d: number; totalCostUsd: number; lastRunAt?: string;
               byProvider: Record<string, number>;
               topModels: { key: string; count: number }[] };
  bugTracker: { total: number; open: number; closed: number;
                bySeverity: Record<string, number>; byStatus: Record<string, number>;
                lastReportedAt?: string };
  testSpecs: { total: number; active: number;
               byFormat: Record<string, number>; lastImportAt?: string };
  webhooks: { total: number; active: number; deliveriesLast7d: number;
              successRateLast7d: number; lastDeliveryAt?: string };
  monitors: { total: number; active: number; paused: number; runsLast7d: number;
              openIncidents: number; lastRunAt?: string };
  mocks: { total: number; active: number; hitsLast7d: number };
  loadTests: { totalRuns: number; runsLast7d: number; lastRunAt?: string };
  security: { totalFindings: number; bySeverity: Record<string, number>;
              openFindings: number };
  requests: { collections: number; savedRequests: number; executionsLast7d: number;
              methodMix: Record<string, number>; lastRunAt?: string };
  chatAndAgents: { aiSessions: number; aiAgentConfigs: number; mcpServers: number;
                   mcpCallsLast7d: number; lastChatAt?: string };
  notifications: { unread: number; total: number };
}

export const getOverview = (workspaceId?: string, signal?: AbortSignal) =>
  http.get<OverviewResponse>(`${BASE}/overview`, {
    params: workspaceId ? { workspaceId } : {},
    signal,
  }).then((r) => r.data);

export const getTimeseries = (range: '7d' | '14d' | '30d' = '7d', workspaceId?: string, signal?: AbortSignal) =>
  http.get<TimeseriesResponse>(`${BASE}/timeseries`, {
    params: workspaceId ? { range, workspaceId } : { range },
    signal,
  }).then((r) => r.data);

export const getRecentActivity = (limit = 20, workspaceId?: string, signal?: AbortSignal) =>
  http.get<RecentActivityResponse>(`${BASE}/recent-activity`, {
    params: workspaceId ? { limit, workspaceId } : { limit },
    signal,
  }).then((r) => r.data);

export const getFeatureSummary = (workspaceId?: string, signal?: AbortSignal) =>
  http.get<FeatureSummaryResponse>(`${BASE}/feature-summary`, {
    params: workspaceId ? { workspaceId } : {},
    signal,
  }).then((r) => r.data);
