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
export type PathMatchMode  = 'EXACT' | 'PATH_PARAMS' | 'REGEX' | 'WILDCARD';
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
  when?: string[];  // Conditional JSONPath expressions
}

export interface MockEndpointMatchers {
  query?: Array<{ key: string; value: string }>;
  requiredQueries?: string[];
  headers?: Array<{ key: string; value: string }>;
  requiredHeaders?: string[];
  jsonPath?: Array<{ path: string; equals: string }>;
  bodyContains?: string;
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
  responseSelection?: 'FIRST' | 'ROUND_ROBIN' | 'WEIGHTED' | 'CONDITIONAL';
  latency?: any;
  chaos?: any;
  activeWindow?: any;
  validation?: any; 
  scenarioId?: string | null;
  matchers?: MockEndpointMatchers;
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
  when: v?.when || [],
});

/** Normalise an endpoint TO the wire (frontend → backend). */
const toWireVariant = (v: any): any => ({
  ...v,
  status: v?.status ?? v?.statusCode,
  bodyTemplate: v?.bodyTemplate ?? v?.body,
  when: v?.when || undefined,
});

/** Normalise an endpoint FROM the wire (backend → frontend). */
const fromWireEndpoint = (e: any): MockEndpointDto => {
  const matchers = e.matchers ? { ...e.matchers } : undefined;
  // Map backend field names to UI names for the form
  if (matchers) {
    // Convert backend queryParams map to UI query array
    if (matchers.queryParams) {
      matchers.query = Object.entries(matchers.queryParams).map(([key, value]) => ({ key, value }));
      delete matchers.queryParams;
    }
    // Convert backend headers map to UI header array
    if (matchers.headers) {
      matchers.header = Object.entries(matchers.headers).map(([key, value]) => ({ key, value }));
      delete matchers.headers;
    }
    // Convert backend jsonpathAsserts map to UI jsonPath array
    if (matchers.jsonpathAsserts) {
      matchers.jsonPath = Object.entries(matchers.jsonpathAsserts).map(([key, value]) => ({ key, value }));
      delete matchers.jsonpathAsserts;
    }
    // Copy bodyRegex to bodyContains
    if (matchers.bodyRegex) {
      matchers.bodyContains = matchers.bodyRegex;
      delete matchers.bodyRegex;
    }
    // Ensure requiredQueries and requiredHeaders are arrays
    if (matchers.requiredQueries && !Array.isArray(matchers.requiredQueries)) {
      matchers.requiredQueries = [];
    }
    if (matchers.requiredHeaders && !Array.isArray(matchers.requiredHeaders)) {
      matchers.requiredHeaders = [];
    }
  }

let validation = undefined;
if (e.validation) {
  const val = e.validation;
  const uiVal: any = {};
  if (val.authMode && val.authMode !== 'NONE') {
    uiVal.authMode = val.authMode;
    if (val.authExpected) uiVal.authExpected = val.authExpected;
    if (val.authKeyName) uiVal.authKeyName = val.authKeyName;
  }
  if (val.requiredContentTypes) {
    if (val.requiredContentTypes.includes('application/json') && val.requiredContentTypes.length === 1) {
      uiVal.requireContentTypeJson = true;
    } else {
      uiVal.requiredContentTypes = val.requiredContentTypes;
    }
  }
  if (val.requiredHeaders) uiVal.requiredHeaders = val.requiredHeaders;
  if (val.bodySchema) uiVal.jsonSchema = val.bodySchema;
  if (Object.keys(uiVal).length > 0) {
    validation = uiVal;
  }
}

  // -------- Chaos mapping (backend → UI) --------
  let chaos = undefined;
  if (e.chaos) {
    const backendChaos = e.chaos;
    chaos = {
      enabled: backendChaos.enabled ?? true,
      errorRatePct: backendChaos.errorRatePct ?? 0,
      errorStatus: backendChaos.errorStatus ?? 500,
      latencyMs: backendChaos.latencyMs ?? 0,
      latencyJitterMs: backendChaos.latencyJitterMs ?? 0,
      partialBodyPct: backendChaos.partialBodyPct ?? 0,
      latencySpikePct: backendChaos.latencySpikePct ?? 0,
      latencySpikeMs: backendChaos.latencySpikeMs ?? 0,
    };
  }

  return {
    ...e,
    responses: Array.isArray(e?.responses) ? e.responses.map(fromWireVariant) : [],
    responseSelection: e?.responseSelection || 'FIRST',
    matchers,
    validation,
    chaos,
  };
};

const arrayToMap = (arr: Array<{ key: string; value: string }> | undefined): Record<string, string> | undefined => {
  if (!arr || !arr.length) return undefined;
  return arr.reduce((acc, { key, value }) => {
    if (key) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
};

/** Normalise an endpoint TO the wire (frontend → backend). */
const toWireEndpoint = (e: Partial<MockEndpointDto>): any => {
  // Build the payload with only the fields the backend accepts
  const payload: any = {};

  // Required fields
  payload.method = e.method || 'GET';
  payload.pathPattern = e.pathPattern || '/';
  payload.pathMatchMode = e.pathMatchMode || 'EXACT';
  payload.responseSelection = e.responseSelection || 'FIRST';

  // Optional fields – only include if defined
  if (e.name !== undefined) payload.name = e.name;
  if (e.description !== undefined) payload.description = e.description;
  if (e.priority !== undefined) payload.priority = e.priority;
  if (e.enabled !== undefined) payload.enabled = e.enabled;
  if (e.latency !== undefined) payload.latency = e.latency;
  if (e.chaos !== undefined) payload.chaos = e.chaos;
  if (e.activeWindow !== undefined) payload.activeWindow = e.activeWindow;
  if (e.scenarioId !== undefined) payload.scenarioId = e.scenarioId;

  // Responses – use toWireVariant for consistency
  if (e.responses) {
    payload.responses = e.responses.map(toWireVariant);
  }

  // Matchers – map UI fields to backend names
  const m = e.matchers as any;
  if (m) {
    const matchers: any = {};
    if (m.query && m.query.length) matchers.queryParams = arrayToMap(m.query);
    if (m.requiredQueries && m.requiredQueries.length) matchers.requiredQueries = m.requiredQueries;
    // 🔥 FIX: use m.header (singular) for header matchers
    if (m.header && m.header.length) matchers.headers = arrayToMap(m.header);
    if (m.requiredHeaders && m.requiredHeaders.length) matchers.requiredHeaders = m.requiredHeaders;
    if (m.jsonPath && m.jsonPath.length) matchers.jsonpathAsserts = arrayToMap(m.jsonPath);
    if (m.bodyContains) matchers.bodyRegex = m.bodyContains;
    if (Object.keys(matchers).length > 0) {
      payload.matchers = matchers;
    }
  }

  // -------- NEW: validation mapping (fully mapped) --------
  const v = e.validation as any;
  if (v) {
    const backendVal: any = {};

    // --- Auth ---
    if (v.authMode && v.authMode !== 'NONE') {
      backendVal.authMode = v.authMode;
      if (v.authExpected) backendVal.authExpected = v.authExpected;
      if (v.authKeyName) backendVal.authKeyName = v.authKeyName;
    }

    // --- Content Types ---
    // If user provided explicit list, use that; otherwise fallback to the checkbox.
    if (v.requiredContentTypes && v.requiredContentTypes.length) {
      backendVal.requiredContentTypes = v.requiredContentTypes;
    } else if (v.requireContentTypeJson) {
      backendVal.requiredContentTypes = ['application/json'];
    }

    // --- Required Headers ---
    if (v.requiredHeaders && v.requiredHeaders.length) {
      backendVal.requiredHeaders = v.requiredHeaders;
    }

      // -------- Chaos mapping --------
  const chaos = e.chaos as any;
  if (chaos) {
    const backendChaos: any = {};
    
    // Map UI field names to backend field names
    if (chaos.enabled !== undefined) backendChaos.enabled = chaos.enabled;
    if (chaos.errorRatePct !== undefined) backendChaos.errorRatePct = chaos.errorRatePct;
    if (chaos.errorStatus !== undefined) backendChaos.errorStatus = chaos.errorStatus;
    if (chaos.latencyMs !== undefined) backendChaos.latencyMs = chaos.latencyMs;
    if (chaos.latencyJitterMs !== undefined) backendChaos.latencyJitterMs = chaos.latencyJitterMs;
    if (chaos.partialBodyPct !== undefined) backendChaos.partialBodyPct = chaos.partialBodyPct;
    if (chaos.latencySpikePct !== undefined) backendChaos.latencySpikePct = chaos.latencySpikePct;
    if (chaos.latencySpikeMs !== undefined) backendChaos.latencySpikeMs = chaos.latencySpikeMs;

    if (Object.keys(backendChaos).length > 0) {
      payload.chaos = backendChaos;
    }
  }

    // --- JSON Schema ---
    if (v.jsonSchema) {
      backendVal.bodySchema = v.jsonSchema;
      backendVal.bodyMode = 'JSON_SCHEMA';
    }

    // If any field is set, add to payload
    if (Object.keys(backendVal).length > 0) {
      payload.validation = backendVal;
    }
  }

  // Remove any undefined values
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  // Final safety: stringify and parse to ensure valid JSON
  return JSON.parse(JSON.stringify(payload));
};

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
