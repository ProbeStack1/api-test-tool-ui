/**
 * Mock service — UI-facing layer.
 *
 *   page  →  THIS FILE  →  api/mock.api  →  http://<mock svc>
 *
 * Mirrors `mock-mgmt-svc` (port 8085). Public function names are preserved
 * 1:1 with the prior service so the 14 mock UI consumers don't change.
 *
 * Adds two normalisers:
 *   1. Hit-log: Java emits camelCase `{ mockId, endpointId, hitAt, statusCode }`
 *      but UI legacy code reads snake_case `mock_id, endpoint_id, hit_at,
 *      status_code`. The alias mapping keeps both shapes available.
 *   2. Defensive defaults for `stats` and `endpointCount`.
 */
import {
  apiBuildMockFromCollection,
  apiCreateEndpoint,
  apiCreateMock,
  apiDeleteEndpoint,
  apiDeleteMock,
  apiExportMock,
  apiGetContractDiffRun,
  apiGetMock,
  apiImportMockAuto,
  apiImportMockFile,
  apiImportMockFormat,
  apiListContractDiffRuns,
  apiListEndpoints,
  apiListMockHits,
  apiListMocks,
  apiMockHealth,
  apiRestoreMock,
  apiRunContractDiff,
  apiUpdateEndpoint,
  apiUpdateMock,
  mockRuntimeBaseUrl,
  type ContractDiffRunDto,
  type ExportFormat,
  type MockEndpointDto,
  type MockHitDto,
  type MockResponseVariant,
  type MockServerDto,
  type MockVisibility,
  type PathMatchMode,
} from '@/api/mock.api';

/* ───────── re-exported vocabulary ──────────────────────────────────────── */
export type { MockVisibility, PathMatchMode, ExportFormat, MockResponseVariant };
export type MockServer   = MockServerDto;
export type MockEndpoint = MockEndpointDto;
/** Legacy snake_case + Java camelCase fields — both populated by the
 *  service-layer normaliser so old & new UI code keep working. */
export interface MockHit extends MockHitDto {
  mock_id?: string;
  endpoint_id?: string | null;
  status_code?: number;
  hit_at?: string;
  remoteIp?: string;    
  userAgent?: string;    
  durationMs?: number; 
}
export type ContractDiffRun = ContractDiffRunDto;
export type { ContractDiffFinding } from '@/api/mock.api';

/* ───────── normalisers ────────────────────────────────────────────────── */
const normMock = (m: MockServerDto): MockServer => ({
  ...m,
  endpointCount: m.endpointCount ?? 0,
  stats: m.stats ?? { totalRequests: 0, matched: 0, unmatched: 0 },
  recordMode: !!m.recordMode,
});
const normHit = (h: any): MockHit => ({
  id: h.id,
  mockId: h.mockId,
  endpointId: h.endpointId ?? null,
  method: h.method,
  path: h.path,
  matched: h.outcome === 'match',   
  statusCode: h.status ?? 200,     
  hitAt: h.timestamp,            
  durationMs: h.totalMs ?? 0,   
  remoteIp: h.remoteIp,
  userAgent: h.userAgent,
  // preserve legacy snake_case fields
  mock_id: h.mockId,
  endpoint_id: h.endpointId ?? null,
  status_code: h.status ?? 200,
  hit_at: h.timestamp,
});

/* ───────── dummy fallback (UI-only, OFF by default) ────────────────────── */
const useDummy = (): boolean =>
  import.meta.env.VITE_MOCK_USE_DUMMY === 'true';
const dummyOnError = (): boolean =>
  import.meta.env.VITE_MOCK_DUMMY_ON_ERROR === 'true';
const isNetworkError = (e: unknown): boolean => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || status === undefined;
};
const withFallback = async <T>(
  live: () => Promise<T>,
  dummy: () => T,
): Promise<T> => {
  if (useDummy()) return dummy();
  try {
    return await live();
  } catch (e) {
    if (dummyOnError() && isNetworkError(e)) return dummy();
    throw e;
  }
};

/* ───────── mocks (CRUD + soft-delete + restore) ─────────────────────── */
export const listMocks = (workspaceId?: string): Promise<MockServer[]> =>
  withFallback(
    () => apiListMocks(workspaceId).then((rows) => rows.map(normMock)),
    () => [],
  );

export const getMock = (id: string): Promise<MockServer> =>
  apiGetMock(id).then(normMock);

export const createMock = (
  workspaceId: string,
  body: Partial<MockServer>,
): Promise<MockServer> => apiCreateMock(workspaceId, body).then(normMock);

export const updateMock = (
  id: string,
  body: Partial<MockServer>,
): Promise<MockServer> => apiUpdateMock(id, body).then(normMock);

/**
 * Visibility toggle — Java does not expose a dedicated `/toggle` route;
 * cycle through PRIVATE → ORG → PUBLIC → PRIVATE on the client and PUT it.
 * `getMock` first to read the current value.
 */
export const toggleMockVisibility = async (id: string): Promise<MockServer> => {
  const cur = await apiGetMock(id);
  const next: MockVisibility =
    cur.visibility === 'PRIVATE' ? 'ORG' : cur.visibility === 'ORG' ? 'PUBLIC' : 'PRIVATE';
  return apiUpdateMock(id, { visibility: next }).then(normMock);
};

export const deleteMock = (id: string): Promise<void> => apiDeleteMock(id);
export const restoreMock = (id: string): Promise<MockServer> =>
  apiRestoreMock(id).then(normMock);

/* ───────── endpoints ─────────────────────────────────────────────────── */
export const listEndpoints = (mockId: string): Promise<MockEndpoint[]> =>
  withFallback(() => apiListEndpoints(mockId), () => []);

/**
 * Java does not expose a GET-by-id for endpoints — fetch the list and
 * find the row. Source-compat helper for older callers.
 */
export const getEndpoint = async (
  mockId: string,
  endpointId: string,
): Promise<MockEndpoint | undefined> =>
  (await apiListEndpoints(mockId)).find((e) => e.id === endpointId);

export const createEndpoint = (
  mockId: string,
  body: Partial<MockEndpoint>,
): Promise<MockEndpoint> => apiCreateEndpoint(mockId, body);

export const updateEndpoint = (
  mockId: string,
  endpointId: string,
  body: Partial<MockEndpoint>,
): Promise<MockEndpoint> => apiUpdateEndpoint(mockId, endpointId, body);

export const toggleEndpoint = (
  mockId: string,
  endpointId: string,
  enabled: boolean,
): Promise<MockEndpoint> => apiUpdateEndpoint(mockId, endpointId, { enabled });

export const deleteEndpoint = (
  mockId: string,
  endpointId: string,
): Promise<void> => apiDeleteEndpoint(mockId, endpointId);

/**
 * Per-endpoint logs — the JVM does not have a `/endpoints/{id}/logs`
 * route, so this is a client-side filter over the mock-level hit log.
 * Old callers were bound to the BFF shape; we preserve the function
 * name and produce equivalent results for free.
 */
export const getEndpointLogs = async (
  mockId: string,
  endpointId: string,
  limit = 200,
): Promise<MockHit[]> => {
  const all = await apiListMockHits(mockId, { limit });
  return all.filter((h) => h.endpointId === endpointId).map(normHit);
};

/* ───────── hit log ───────────────────────────────────────────────────── */
export const listMockHits = (
  mockId: string,
  limit = 100,
): Promise<MockHit[]> =>
  withFallback(
    () => apiListMockHits(mockId, { limit }).then((rows) => rows.map(normHit)),
    () => [],
  );

/* ───────── from-collection ──────────────────────────────────────────── */
export const buildMockFromCollection = (
  collectionId: string,
  workspaceId: string,
  opts: { slug?: string; name?: string } = {},
): Promise<MockServer> =>
  apiBuildMockFromCollection(collectionId, workspaceId, opts).then(normMock);

/* ───────── contract diff ────────────────────────────────────────────── */
export const runContractDiff = (
  mockId: string,
  upstreamUrl: string,
): Promise<ContractDiffRun> => apiRunContractDiff(mockId, upstreamUrl);

export const listContractDiffRuns = (
  mockId: string,
  limit = 50,
): Promise<ContractDiffRun[]> => apiListContractDiffRuns(mockId, limit);

export const getContractDiffRun = (
  mockId: string,
  runId: string,
): Promise<ContractDiffRun> => apiGetContractDiffRun(mockId, runId);

/* ───────── import / export ──────────────────────────────────────────── */
export const exportMock = async (
  mockId: string,
  format: ExportFormat = 'FORGEQ',
): Promise<Blob> => {
  const { blob } = await apiExportMock(mockId, format);
  return blob;
};

export const exportMockWithDisposition = (
  mockId: string,
  format: ExportFormat = 'FORGEQ',
) => apiExportMock(mockId, format);

export const importMockAuto = (
  workspaceId: string,
  rawText: string,
  opts: { slug?: string; name?: string; forceFormat?: string } = {},
): Promise<MockServer> =>
  apiImportMockAuto(workspaceId, rawText, opts).then(normMock);

export const importMockFile = (
  workspaceId: string,
  file: File,
  opts: { slug?: string; name?: string; forceFormat?: string } = {},
): Promise<MockServer> =>
  apiImportMockFile(workspaceId, file, opts).then(normMock);

export const importMockFormat = (
  workspaceId: string,
  format: 'postman' | 'openapi' | 'insomnia' | 'har' | 'forgeq' | 'curl',
  body: unknown,
  opts: { slug?: string; name?: string } = {},
): Promise<MockServer> =>
  apiImportMockFormat(workspaceId, format, body, opts).then(normMock);

/* ───────── runtime URL helper + health ──────────────────────────────── */
export const runtimeBaseUrl = (slug: string) => mockRuntimeBaseUrl(slug);
export const mockHealth = () => apiMockHealth();
