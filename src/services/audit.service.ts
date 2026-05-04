/**
 * Audit Activity service — UI-facing layer with epoch→ISO date normalisation.
 */
import {
  apiTimelineWorkspace, apiTimelineUser, apiTimelineResource,
  apiCorrelationChain, apiAuditHealth,
  type TimelineEntry, type TimelinePage, type TimelineFilter, type Severity,
} from '@/api/audit.api';

export type { TimelineEntry, TimelinePage, TimelineFilter, Severity };

const toIso = (v: number | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

const normEntry = (e: TimelineEntry): TimelineEntry => ({
  ...e,
  timestamp: toIso(e.timestamp),
});

const normPage = (p: TimelinePage): TimelinePage => ({
  ...p,
  items: (p.items ?? []).map(normEntry),
});

export const timelineWorkspace = (wsId: string, opts?: TimelineFilter & { page?: number; size?: number }) =>
  apiTimelineWorkspace(wsId, opts).then(normPage);

export const timelineUser = (userId: string, opts?: { page?: number; size?: number }) =>
  apiTimelineUser(userId, opts).then(normPage);

export const timelineResource = (type: string, id: string, opts?: { page?: number; size?: number; includeDiff?: boolean }) =>
  apiTimelineResource(type, id, opts).then(normPage);

export const correlationChain = (correlationId: string) =>
  apiCorrelationChain(correlationId).then((arr) => (arr ?? []).map(normEntry));

export const getAuditHealth = () => apiAuditHealth();
