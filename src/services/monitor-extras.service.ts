/**
 * Service-layer wrappers over `monitor-extras.api` — normalises Java
 * Instant epoch-second timestamps to ISO strings for UI consumption.
 */
import {
  apiCreateHeartbeat, apiUpdateHeartbeat, apiListHeartbeats, apiGetHeartbeat,
  apiDeleteHeartbeat, apiRotateHeartbeatToken,
  apiCreateDigest, apiUpdateDigest, apiListDigests, apiDeleteDigest, apiSendDigestNow,
  type HeartbeatCreate, type HeartbeatUpdate, type HeartbeatView,
  type DigestCreate, type DigestUpdate, type DigestView,
} from '@/api/monitor-extras.api';

export type { HeartbeatCreate, HeartbeatUpdate, HeartbeatView, DigestCreate, DigestUpdate, DigestView };

const toIso = (v: number | string | null | undefined): string | null => {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

const normHb = (h: HeartbeatView): HeartbeatView => ({
  ...h,
  lastPingAt:  toIso(h.lastPingAt),
  missedSince: toIso(h.missedSince),
  createdAt:   toIso(h.createdAt) ?? undefined,
  updatedAt:   toIso(h.updatedAt) ?? undefined,
});
const normDg = (d: DigestView): DigestView => ({
  ...d,
  lastSentAt: toIso(d.lastSentAt),
  createdAt:  toIso(d.createdAt) ?? undefined,
  updatedAt:  toIso(d.updatedAt) ?? undefined,
});

export const createHeartbeat = (b: HeartbeatCreate) => apiCreateHeartbeat(b).then(normHb);
export const updateHeartbeat = (id: string, b: HeartbeatUpdate) => apiUpdateHeartbeat(id, b).then(normHb);
export const listHeartbeats = (wsId: string) => apiListHeartbeats(wsId).then((arr) => (arr ?? []).map(normHb));
export const getHeartbeat   = (id: string) => apiGetHeartbeat(id).then(normHb);
export const deleteHeartbeat = (id: string) => apiDeleteHeartbeat(id);
export const rotateHeartbeatToken = (id: string) => apiRotateHeartbeatToken(id).then(normHb);

export const createDigest = (b: DigestCreate) => apiCreateDigest(b).then(normDg);
export const updateDigest = (id: string, b: DigestUpdate) => apiUpdateDigest(id, b).then(normDg);
export const listDigests  = (wsId: string) => apiListDigests(wsId).then((arr) => (arr ?? []).map(normDg));
export const deleteDigest = (id: string) => apiDeleteDigest(id);
export const sendDigestNow = (id: string) => apiSendDigestNow(id).then(normDg);
