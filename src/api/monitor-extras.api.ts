/**
 * Heartbeat + Digest HTTP layer for the monitor service. Kept separate from
 * `monitor.api.ts` so the existing Monitor module stays untouched.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('monitor');
const HB = '/api/v1/monitor/heartbeats';
const DG = '/api/v1/monitor/digests';

/* ─── Heartbeats ───────────────────────────────────────────────────── */
export interface HeartbeatCreate {
  workspaceId: string;
  name: string;
  description?: string;
  expectedIntervalSec: number;
  gracePeriodSec?: number;
  notificationEmails?: string[];
  notificationSlackWebhook?: string;
  notificationWebhooks?: string[];
  tags?: string[];
}
export interface HeartbeatUpdate {
  name?: string;
  description?: string;
  expectedIntervalSec?: number;
  gracePeriodSec?: number;
  notificationEmails?: string[];
  notificationSlackWebhook?: string;
  notificationWebhooks?: string[];
  tags?: string[];
}
export interface HeartbeatView {
  heartbeatId: string;
  workspaceId: string;
  name: string;
  description?: string;
  /** Returned only on create / rotate. Subsequent reads return null. */
  token?: string | null;
  pingUrl?: string | null;
  expectedIntervalSec: number;
  gracePeriodSec?: number;
  status: 'HEALTHY' | 'PENDING' | 'MISSED' | string;
  lastPingAt?: number | string | null;
  lastPingIp?: string | null;
  missedSince?: number | string | null;
  totalPings?: number;
  notificationEmails?: string[];
  notificationSlackWebhook?: string | null;
  notificationWebhooks?: string[];
  tags?: string[];
  createdByEmail?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export const apiCreateHeartbeat = (body: HeartbeatCreate) =>
  http.post<HeartbeatView>(HB, body).then((r) => r.data);
export const apiUpdateHeartbeat = (id: string, body: HeartbeatUpdate) =>
  http.put<HeartbeatView>(`${HB}/${id}`, body).then((r) => r.data);
export const apiListHeartbeats = (workspaceId: string) =>
  http.get<HeartbeatView[]>(HB, { params: { workspaceId, size: 200 } }).then((r) => r.data);
export const apiGetHeartbeat = (id: string) =>
  http.get<HeartbeatView>(`${HB}/${id}`).then((r) => r.data);
export const apiDeleteHeartbeat = (id: string) =>
  http.delete(`${HB}/${id}`).then(() => undefined);
export const apiRotateHeartbeatToken = (id: string) =>
  http.post<HeartbeatView>(`${HB}/${id}/rotate-token`, {}).then((r) => r.data);

/* ─── Digests ──────────────────────────────────────────────────────── */
export interface DigestCreate {
  workspaceId: string;
  recipients: string[];
  frequency: 'DAILY' | 'WEEKLY';
  sendHourUtc?: number;
  enabled?: boolean;
}
export interface DigestUpdate {
  recipients?: string[];
  frequency?: 'DAILY' | 'WEEKLY';
  sendHourUtc?: number;
  enabled?: boolean;
}
export interface DigestView {
  subscriptionId: string;
  workspaceId: string;
  recipients: string[];
  frequency: 'DAILY' | 'WEEKLY';
  sendHourUtc?: number;
  enabled: boolean;
  lastSentAt?: number | string | null;
  createdByEmail?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export const apiCreateDigest = (body: DigestCreate) =>
  http.post<DigestView>(DG, body).then((r) => r.data);
export const apiUpdateDigest = (id: string, body: DigestUpdate) =>
  http.put<DigestView>(`${DG}/${id}`, body).then((r) => r.data);
export const apiListDigests = (workspaceId: string) =>
  http.get<DigestView[]>(DG, { params: { workspaceId } }).then((r) => r.data);
export const apiDeleteDigest = (id: string) =>
  http.delete(`${DG}/${id}`).then(() => undefined);
export const apiSendDigestNow = (id: string) =>
  http.post<DigestView>(`${DG}/${id}/send-now`, {}).then((r) => r.data);
