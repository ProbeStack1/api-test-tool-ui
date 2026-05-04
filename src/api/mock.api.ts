/**
 * Mock raw HTTP layer — 1:1 mapping of `mock-mgmt-svc` (port 8085).
 *
 *   page  →  services/mock.service  →  THIS FILE  →  http://<mock svc>
 *
 * Nine controllers covered:
 *   • MockController             /api/v1/mocks
 *   • EndpointController         /api/v1/mocks/{mockId}/endpoints
 *   • HitLogController           /api/v1/mocks/{mockId}/hits
 *   • ImportController           /api/v1/mocks/import[/{format}]
 *   • MockExportController       /api/v1/mocks/{id}/export
 *   • CollectionBridgeController /api/v1/mocks/from-collection/{collectionId}
 *   • ContractDiffController     /api/v1/mocks/{mockId}/diff/runs
 *   • RuntimeController          /api/v1/mocks/{slug}/**  (request-time path)
 *   • HealthController           /api/v1/mocks/health
 */
import { createHttp } from '@/lib/http';

/* ------------------------------ types ------------------------------------ */
export type MockVisibility = 'PRIVATE' | 'ORG' | 'PUBLIC';
export type PathMatchMode  = 'LITERAL' | 'REGEX';
export type ExportFormat   = 'FORGEQ' | 'POSTMAN' | 'OPENAPI' | 'OPENAPI_YAML' | 'INSOMNIA' | 'HAR';

export interface MockServerDto {
  id: string;
  orgId: string;
  workspaceId: string;
  collectionId?: string | null;
  slug: string;
  name: string;
  description?: string;
  visibility: MockVisibility;
  baseUrl: string;
  latency?: unknown;
  proxy?: unknown;
  cors?: unknown;
  rateLimit?: unknown;
  recordMode: boolean;
  endpointCount: number;
  stats: { totalRequests: number; matched: number; unmatched: number };
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MockResponseVariant {
  statusCode: number;
  headers?: Array<{ key: string; value: string }>;
  body?: string;
  bodyLanguage?: 'json' | 'text' | 'xml' | 'html';
  name?: string;
  weight?: number;
}

export interface MockEndpointDto {
  id: string;
  mockId: string;
  name?: string;
  description?: string;
  method: string;
  pathPattern: string;
  pathMatchMode: PathMatchMode;
  priority: number;
  enabled: boolean;
  responses: MockResponseVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface MockHitDto {
  id: string;
  mockId: string;
  endpointId?: string | null;
  method: string;
  path: string;
  matched: boolean;
  statusCode: number;
  hitAt: string;
  durationMs?: number;
}

export interface ContractDiffFinding {
  endpointId: string;
  method: string;
  path: string;
  status: 'OK' | 'DRIFT';
  drifts: Array<{ kind: string; expected: unknown; actual: unknown }>;
}

export interface ContractDiffRunDto {
  id: string;
  mockId: string;
  upstreamUrl: string;
  ranAt: string;
  totalEndpoints: number;
  matchedCount: number;
  driftCount: number;
  findings: ContractDiffFinding[];
}

/* ----------------------------- client ------------------------------------ */
const http = createHttp('mock');
const BASE = '/api/v1/mocks';

/* ===================== mocks (CRUD + soft-delete + restore) =============== */
export const apiListMocks = (workspaceId?: string) =>
  http
    .get<MockServerDto[]>(BASE, { params: workspaceId ? { workspaceId } : {} })
    .then((r) => r.data);

export const apiGetMock = (id: string) =>
  http.get<MockServerDto>(`${BASE}/${id}`).then((r) => r.data);

export const apiCreateMock = (workspaceId: string, body: Partial<MockServerDto>) =>
  http
    .post<MockServerDto>(BASE, body, { params: { workspaceId } })
    .then((r) => r.data);

export const apiUpdateMock = (id: string, body: Partial<MockServerDto>) =>
  http.put<MockServerDto>(`${BASE}/${id}`, body).then((r) => r.data);

export const apiDeleteMock = (id: string) =>
  http.delete<void>(`${BASE}/${id}`).then((r) => r.data);

export const apiRestoreMock = (id: string) =>
  http.post<MockServerDto>(`${BASE}/${id}/restore`).then((r) => r.data);

/* =========================== endpoints =================================== */

/** Normalise an endpoint variant FROM the wire (backend → frontend).
 *  Java persists response variants with `status` + `bodyTemplate`, but the
 *  UI everywhere reads `statusCode` + `body`. Keeping both names keeps the
 *  form bi-directional without touching 20+ components.                    */
const fromWireVariant = (v: any): MockResponseVariant => ({
  ...v,
  statusCode: v?.statusCode ?? v?.status ?? 200,
  body: v?.body ?? v?.bodyTemplate ?? '',
});

/** Normalise an endpoint TO the wire (frontend → backend). */
const toWireVariant = (v: any): any => ({
  ...v,
  status: v?.status ?? v?.statusCode,
  bodyTemplate: v?.bodyTemplate ?? v?.body,
});

const fromWireEndpoint = (e: any): MockEndpointDto => ({
  ...e,
  responses: Array.isArray(e?.responses) ? e.responses.map(fromWireVariant) : [],
});

const toWireEndpoint = (e: Partial<MockEndpointDto>): any => ({
  ...e,
  responses: Array.isArray(e?.responses) ? e.responses.map(toWireVariant) : undefined,
});

export const apiListEndpoints = (mockId: string) =>
  http.get<MockEndpointDto[]>(`${BASE}/${mockId}/endpoints`)
    .then((r) => (Array.isArray(r.data) ? r.data.map(fromWireEndpoint) : []));

export const apiCreateEndpoint = (mockId: string, body: Partial<MockEndpointDto>) =>
  http
    .post<MockEndpointDto>(`${BASE}/${mockId}/endpoints`, toWireEndpoint(body))
    .then((r) => fromWireEndpoint(r.data));

export const apiUpdateEndpoint = (
  mockId: string,
  endpointId: string,
  body: Partial<MockEndpointDto>,
) =>
  http
    .put<MockEndpointDto>(`${BASE}/${mockId}/endpoints/${endpointId}`, toWireEndpoint(body))
    .then((r) => fromWireEndpoint(r.data));

export const apiDeleteEndpoint = (mockId: string, endpointId: string) =>
  http
    .delete<void>(`${BASE}/${mockId}/endpoints/${endpointId}`)
    .then((r) => r.data);

/* ============================ hit log ==================================== */
export const apiListMockHits = (
  mockId: string,
  opts: { limit?: number; matched?: boolean; method?: string } = {},
) =>
  http
    .get<MockHitDto[]>(`${BASE}/${mockId}/hits`, {
      params: { limit: opts.limit ?? 100, ...(opts.matched != null ? { matched: opts.matched } : {}), ...(opts.method ? { method: opts.method } : {}) },
    })
    .then((r) => r.data);

/* ============================ import ==================================== */
/**
 * Auto-detecting raw text import (JSON / YAML / cURL — server inspects
 * the body). Java accepts `application/octet-stream` or `text/plain`.
 */
export const apiImportMockAuto = (
  workspaceId: string,
  rawText: string,
  opts: { slug?: string; name?: string; forceFormat?: string } = {},
) => {
  const params: Record<string, string> = { workspaceId };
  if (opts.slug) params.slug = opts.slug;
  if (opts.name) params.name = opts.name;
  if (opts.forceFormat) params.forceFormat = opts.forceFormat;
  return http
    .post<MockServerDto>(`${BASE}/import`, rawText, {
      params,
      headers: { 'Content-Type': 'text/plain' },
      transformRequest: [(d) => d],
    })
    .then((r) => r.data);
};

export const apiImportMockFile = (
  workspaceId: string,
  file: File,
  opts: { slug?: string; name?: string; forceFormat?: string } = {},
) => {
  const fd = new FormData();
  fd.append('file', file);
  const params: Record<string, string> = { workspaceId };
  if (opts.slug) params.slug = opts.slug;
  if (opts.name) params.name = opts.name;
  if (opts.forceFormat) params.forceFormat = opts.forceFormat;
  return http
    .post<MockServerDto>(`${BASE}/import`, fd, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

/** Format-specific JSON imports — Postman / OpenAPI / Insomnia / HAR / forgeq. */
export const apiImportMockFormat = (
  workspaceId: string,
  format: 'postman' | 'openapi' | 'insomnia' | 'har' | 'forgeq' | 'curl',
  body: unknown,
  opts: { slug?: string; name?: string } = {},
) => {
  const params: Record<string, string> = { workspaceId };
  if (opts.slug) params.slug = opts.slug;
  if (opts.name) params.name = opts.name;
  return http
    .post<MockServerDto>(`${BASE}/import/${format}`, body, {
      params,
      headers: { 'Content-Type': format === 'curl' ? 'text/plain' : 'application/json' },
    })
    .then((r) => r.data);
};

/* ============================ export ==================================== */
export const apiExportMock = async (id: string, format: ExportFormat = 'FORGEQ') => {
  const res = await http.get(`${BASE}/${id}/export`, {
    params: { format },
    responseType: 'blob',
  });
  return {
    blob: res.data as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

/* ===================== from-collection (build a mock) ==================== */
export const apiBuildMockFromCollection = (
  collectionId: string,
  workspaceId: string,
  opts: { slug?: string; name?: string } = {},
) =>
  http
    .post<MockServerDto>(`${BASE}/from-collection/${collectionId}`, null, {
      params: { workspaceId, ...(opts.slug ? { slug: opts.slug } : {}), ...(opts.name ? { name: opts.name } : {}) },
    })
    .then((r) => r.data);

/* ========================== contract diff ================================ */
export const apiRunContractDiff = (mockId: string, upstreamUrl: string) =>
  http
    .post<ContractDiffRunDto>(`${BASE}/${mockId}/diff/runs`, { upstreamUrl })
    .then((r) => r.data);

export const apiListContractDiffRuns = (mockId: string, limit = 50) =>
  http
    .get<ContractDiffRunDto[]>(`${BASE}/${mockId}/diff/runs`, { params: { limit } })
    .then((r) => r.data);

export const apiGetContractDiffRun = (mockId: string, runId: string) =>
  http
    .get<ContractDiffRunDto>(`${BASE}/${mockId}/diff/runs/${runId}`)
    .then((r) => r.data);

/* ============================= health ==================================== */
export const apiMockHealth = () =>
  http
    .get<{ status: 'UP' | 'DOWN'; details?: Record<string, unknown> }>(`${BASE}/health`)
    .then((r) => r.data);

/* =================== runtime URL (built, not requested) ================== */
/** Public hit URL for a mock slug — used as the "Base URL" in detail page. */
export const mockRuntimeBaseUrl = (slug: string) =>
  `${(http.defaults.baseURL ?? '').replace(/\/$/, '')}${BASE}/${slug}`;
