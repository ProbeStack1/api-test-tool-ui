/**
 * Request raw HTTP layer — 1:1 mapping of `request-mgmt-svc` (port 8083).
 *
 *   page  →  services/request.service  →  THIS FILE  →  http://<request svc>
 *
 * Controllers covered (core flow only — MCP lives in api/mcp.api.ts and
 * stream lives in api/request.stream.ts):
 *   • RequestController       /api/v1/requests
 *   • HistoryController       /api/v1/requests
 *   • ExampleController       /api/v1/requests/{requestId}/examples
 *   • SavedResponseController /api/v1/requests/{requestId}/saved-responses + /api/v1/saved-responses/{id}
 *   • RequestFileController   /api/v1/requests/files
 *   • ExecutionController     /api/v1/requests/{id}/execute, /execute-adhoc
 *   • ShareController         /api/v1/requests/{id}/share(s)
 *   • PublicShareController   /api/v1/requests/public/shared/{token}
 *
 * Strict rules: no hard-coded URLs, no business logic; returns the
 * unwrapped `data` shape (interceptor handles `ResponseEnvelope`).
 */
import { createHttp } from '@/lib/http';

/* ------------------------------ types ------------------------------------ */
export interface CanonicalUrl {
  raw?: string;
  protocol?: string;
  host?: string;
  port?: string;
  path?: string;
  query?: Array<{ key: string; value: string; enabled?: boolean; description?: string }>;
  pathParams?: Array<{ key: string; value: string; description?: string }>;
}

export interface CanonicalHeader {
  key: string;
  value: string;
  enabled?: boolean;
  description?: string;
}

export interface CanonicalAuth {
  type: 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2';
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
}

export interface CanonicalBody {
  mode?: 'none' | 'raw' | 'json' | 'urlencoded' | 'formdata' | 'binary' | 'graphql';
  raw?: string;
  language?: 'json' | 'text' | 'xml' | 'html' | 'javascript';
  urlencoded?: Array<{ key: string; value: string; enabled?: boolean }>;
  formdata?: Array<{ key: string; value: string; type?: 'text' | 'file'; enabled?: boolean }>;
  graphql?: { query: string; variables?: string };
}

export interface ApiRequestDto {
  id: string;
  orgId: string;
  workspaceId: string;
  collectionId: string;
  folderId?: string | null;
  name: string;
  description?: string;
  method: string;
  url: CanonicalUrl;
  headers: CanonicalHeader[];
  auth: CanonicalAuth;
  body: CanonicalBody;
  preRequestScript?: string;
  testScript?: string;
  variables: Array<{ key: string; value: string; isSecret?: boolean; description?: string }>;
  order: number;
  createdBy: { email: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionResultDto {
  runId: string;
  status: 'SUCCESS' | 'FAILED';
  totalMs: number;
  finalUrl: string;
  method: string;
  sentHeaders: Array<{ key: string; value: string; source: string; isSecret: boolean }>;
  sentBody: string;
  network: {
    statusCode: number;
    sizeBytes: number;
    localAddress?: string;
    remoteAddress?: string;
    httpVersion?: string;
    tlsProtocol?: string;
    cipherName?: string;
    certCN?: string;
    issuerCN?: string;
    validUntil?: string;
    hostnameWarning?: string;
    tlsWarning?: string;
  };
  phases: Array<{ name?: string; step?: string; startedAtMs?: number; offsetMs?: number; durationMs: number }>;
  response: {
    statusCode: number;
    statusText?: string;
    headers: Array<{ key: string; value: string }>;
    body: string;
    sizeBytes: number;
    contentType: string;
  };
  error: { kind: string; message: string } | null;
  runAt: string;
}

export interface UploadedFileDto {
  fileRef: string;
  name: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

export interface SavedResponseDto {
  id: string;
  requestId: string;
  name: string;
  status: number;
  statusText?: string;
  headers: Array<{ key: string; value: string }>;
  body: string;
  contentType?: string;
  createdAt?: string;
}

export interface RequestShareDto {
  id: string;
  token: string;
  url: string;
  scope: 'REQUEST';
  visibility: 'PUBLIC' | 'ORG' | 'PRIVATE';
  resourceId: string;
  note?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  revoked: boolean;
  viewCount: number;
}

export interface PublicShareResolution {
  scope: 'REQUEST' | 'COLLECTION';
  resourceId: string;
  visibility: string;
  expiresAt?: string;
}

export interface RunHistoryRow {
  runId: string;
  requestId: string;
  status: 'SUCCESS' | 'FAILED';
  statusCode?: number;
  totalMs?: number;
  runAt: string;
}

export interface RunHistoryPage {
  content: RunHistoryRow[];
  page: number;
  size: number;
  totalElements?: number;
  totalPages?: number;
}

export interface ExecuteOverrides {
  workspaceId?: string;
  environmentId?: string;
  extraVars?: Record<string, string>;
  /** Anything else mirrors the canonical request fields for one-off overrides. */
  [k: string]: unknown;
}

export interface AdhocBody {
  method: string;
  url: CanonicalUrl;
  headers?: CanonicalHeader[];
  auth?: CanonicalAuth;
  body?: CanonicalBody;
  workspaceId?: string;
  environmentId?: string;
  extraVars?: Record<string, string>;
}

export interface ShareCreateBody {
  visibility?: 'PUBLIC' | 'ORG' | 'PRIVATE';
  ttlDays?: number;
  note?: string;
}

export interface MoveBody {
  folderId?: string | null;
  targetCollectionId?: string;
  order?: number;
}

/* ----------------------------- client ------------------------------------ */
const http = createHttp('request');
const BASE = '/api/v1/requests';
const SAVED_ROOT = '/api/v1/saved-responses';

/* ============== requests (CRUD + soft-delete + duplicate + move) ========= */
export const apiListRequests = (collectionId: string, folderId?: string | null) =>
  http
    .get<ApiRequestDto[]>(BASE, {
      params: { collectionId, ...(folderId !== undefined ? { folderId } : {}) },
    })
    .then((r) => r.data);

export const apiGetRequest = (id: string) =>
  http.get<ApiRequestDto>(`${BASE}/${id}`).then((r) => r.data);

export const apiCreateRequest = (
  collectionId: string,
  body: Partial<ApiRequestDto>,
  workspaceId?: string,
) =>
  http
    .post<ApiRequestDto>(BASE, body, {
      params: { collectionId, ...(workspaceId ? { workspaceId } : {}) },
    })
    .then((r) => r.data);

export const apiUpdateRequest = (id: string, body: Partial<ApiRequestDto>) =>
  http.put<ApiRequestDto>(`${BASE}/${id}`, body).then((r) => r.data);

export const apiDeleteRequest = (id: string) =>
  http.delete<void>(`${BASE}/${id}`).then((r) => r.data);

export const apiDuplicateRequest = (id: string) =>
  http.post<ApiRequestDto>(`${BASE}/${id}/duplicate`).then((r) => r.data);

export const apiMoveRequest = (id: string, body: MoveBody) =>
  http.post<ApiRequestDto>(`${BASE}/${id}/move`, body).then((r) => r.data);

export const apiListRequestTrash = (collectionId: string) =>
  http
    .get<ApiRequestDto[]>(`${BASE}/trash`, { params: { collectionId } })
    .then((r) => r.data);

export const apiRestoreRequest = (id: string) =>
  http.post<ApiRequestDto>(`${BASE}/${id}/restore`).then((r) => r.data);

/* ============================ history ==================================== */
export const apiListRuns = (requestId: string, page = 0, size = 50) =>
  http
    .get<RunHistoryPage | RunHistoryRow[]>(`${BASE}/${requestId}/runs`, {
      params: { page, size },
    })
    .then((r) => r.data);

export const apiGetRun = (runId: string) =>
  http.get<ExecutionResultDto>(`${BASE}/runs/${runId}`).then((r) => r.data);

export const apiReplayRun = (runId: string) =>
  http.post<ExecutionResultDto>(`${BASE}/runs/${runId}/replay`).then((r) => r.data);

/* =========================== execution =================================== */
export const apiExecuteRequest = (
  id: string,
  overrides: ExecuteOverrides = {},
  signal?: AbortSignal,
) =>
  http
    .post<ExecutionResultDto>(`${BASE}/${id}/execute`, overrides, {
      signal: signal as never,
    })
    .then((r) => r.data);

/** Java exposes both /execute-adhoc and the alias /adhoc/execute — using the canonical one. */
export const apiAdhocExecute = (body: AdhocBody, signal?: AbortSignal) =>
  http
    .post<ExecutionResultDto>(`${BASE}/execute-adhoc`, body, {
      signal: signal as never,
    })
    .then((r) => r.data);

/* ============================ examples =================================== */
export const apiCreateExample = (
  requestId: string,
  body: { name: string; status: number; headers?: Array<{ key: string; value: string }>; body: string; contentType?: string },
) =>
  http
    .post<SavedResponseDto>(`${BASE}/${requestId}/examples`, body)
    .then((r) => r.data);

export const apiListExamples = (requestId: string) =>
  http
    .get<SavedResponseDto[]>(`${BASE}/${requestId}/examples`)
    .then((r) => r.data);

export const apiDeleteExample = (requestId: string, id: string) =>
  http.delete<void>(`${BASE}/${requestId}/examples/${id}`).then((r) => r.data);

/* ========================= saved-responses =============================== */
/** Parallel store to /examples — exposes a global GET-by-id route. */
export const apiCreateSavedResponse = (
  requestId: string,
  body: { name: string; status: number; headers?: Array<{ key: string; value: string }>; body: string; contentType?: string },
) =>
  http
    .post<SavedResponseDto>(`${BASE}/${requestId}/saved-responses`, body)
    .then((r) => r.data);

export const apiListSavedResponses = (requestId: string) =>
  http
    .get<SavedResponseDto[]>(`${BASE}/${requestId}/saved-responses`)
    .then((r) => r.data);

export const apiGetSavedResponse = (savedId: string) =>
  http.get<SavedResponseDto>(`${SAVED_ROOT}/${savedId}`).then((r) => r.data);

export const apiDeleteSavedResponse = (savedId: string) =>
  http.delete<void>(`${SAVED_ROOT}/${savedId}`).then((r) => r.data);

/* ========================== request files ================================ */
export const apiUploadRequestFile = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return http
    .post<UploadedFileDto>(`${BASE}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const apiGetRequestFile = (fileRef: string) =>
  http.get<UploadedFileDto>(`${BASE}/files/${fileRef}`).then((r) => r.data);

export const apiDeleteRequestFile = (fileRef: string) =>
  http.delete<void>(`${BASE}/files/${fileRef}`).then((r) => r.data);

/* ============================== shares =================================== */
export const apiCreateRequestShare = (id: string, body?: ShareCreateBody) =>
  http
    .post<RequestShareDto>(`${BASE}/${id}/share`, body ?? {})
    .then((r) => r.data);

export const apiListRequestShares = (id: string) =>
  http.get<RequestShareDto[]>(`${BASE}/${id}/shares`).then((r) => r.data);

export const apiRevokeRequestShare = (id: string, shareId: string) =>
  http.delete<void>(`${BASE}/${id}/shares/${shareId}`).then((r) => r.data);

/** Public route — no auth header required server-side. */
export const apiResolvePublicShare = (token: string) =>
  http
    .get<PublicShareResolution>(`${BASE}/public/shared/${token}`)
    .then((r) => r.data);
