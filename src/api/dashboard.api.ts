/**
 * Dashboard service — pure read aggregator.
 * Backend: forgeq-dashboard-mgmt-svc on port 8095.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('dashboard');
const BASE = '/api/v1/dashboard';

export interface Kpi { total: number; delta: number; }
export interface TopItem { id: string; name: string; subtitle: string; value: number; }

export interface OverviewResponse {
  generatedAt: string;
  kpis: Record<string, Kpi>;
  kpiTrends: Record<string, number[]>;
  methodBreakdown: Record<string, number>;
  topMonitors: TopItem[];
  topCollections: TopItem[];
}

export interface TimeseriesSeries { label: string; key: string; values: number[]; }
export interface TimeseriesResponse { days: string[]; series: TimeseriesSeries[]; }

export interface ActivityItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
}
export interface RecentActivityResponse { items: ActivityItem[]; }

export const getOverview = (workspaceId?: string) =>
  http.get<OverviewResponse>(`${BASE}/overview`, { params: workspaceId ? { workspaceId } : {} }).then((r) => r.data);

export const getTimeseries = (range: '7d' | '14d' | '30d' = '7d') =>
  http.get<TimeseriesResponse>(`${BASE}/timeseries`, { params: { range } }).then((r) => r.data);

export const getRecentActivity = (limit = 20) =>
  http.get<RecentActivityResponse>(`${BASE}/recent-activity`, { params: { limit } }).then((r) => r.data);
