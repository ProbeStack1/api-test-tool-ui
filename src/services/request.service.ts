/**
 * Request service — UI-facing layer.
 *
 *   page  →  THIS FILE  →  api/request.api  →  http://<request svc>
 *
 * Mirrors `request-mgmt-svc` (port 8083). Public function names are
 * preserved 1:1 with the prior service so existing pages don't change.
 *
 * Adds two normalisers on top of the raw HTTP layer:
 *   - phase shape for `ExecutionResult` (Java emits `step`/`offsetMs`,
 *     UI expects `name`/`startedAtMs`).
 *   - lazy `workspaceId` resolution from the project store when callers
 *     don't pass it explicitly to `createRequest`.
 */
import {
  apiAdhocExecute,
  apiCreateExample,
  apiCreateRequest,
  apiCreateRequestShare,
  apiCreateSavedResponse,
  apiDeleteExample,
  apiDeleteRequest,
  apiDeleteRequestFile,
  apiDeleteSavedResponse,
  apiDuplicateRequest,
  apiExecuteRequest,
  apiGetRequest,
  apiGetRequestFile,
  apiGetRun,
  apiGetSavedResponse,
  apiListExamples,
  apiListRequestShares,
  apiListRequestTrash,
  apiListRequests,
  apiListRuns,
  apiListSavedResponses,
  apiMoveRequest,
  apiReplayRun,
  apiResolvePublicShare,
  apiRestoreRequest,
  apiRevokeRequestShare,
  apiUpdateRequest,
  apiUploadRequestFile,
  type AdhocBody,
  type ApiRequestDto,
  type CanonicalAuth,
  type CanonicalBody,
  type CanonicalHeader,
  type CanonicalUrl,
  type ExecutionResultDto,
  type PublicShareResolution,
  type RequestShareDto,
  type SavedResponseDto,
  type UploadedFileDto,
} from '@/api/request.api';
export { apiExecuteStream as executeStream, type StreamHandlers } from '@/api/request.stream';

/* ───────── re-exported vocabulary ──────────────────────────────────────── */
export type { CanonicalUrl, CanonicalHeader, CanonicalAuth, CanonicalBody };
export type ApiRequest = ApiRequestDto;
/**
 * After the local normaliser rewrites the wire shape, every phase has a
 * non-null `name` and `startedAtMs`. Components rely on those fields so
 * we narrow the type here instead of leaking the loose wire DTO.
 */
export interface ExecutionResultPhase {
  name: string;
  startedAtMs?: number;
  durationMs: number;
  status?: 'pending' | 'running' | 'done' | 'failed';
  error?: string;
}
export type ExecutionResult = Omit<ExecutionResultDto, 'phases'> & {
  phases: ExecutionResultPhase[];
};
export type UploadedFile = UploadedFileDto;
export type RequestShareLink = RequestShareDto;
/**
 * Saved/Example response. Java exposes two parallel surfaces (`/examples`
 * and `/saved-responses`) backed by the same data; the UI treats them as
 * one type and adds legacy aliases so older code paths keep working.
 */
export interface SavedResponse extends SavedResponseDto {
  /* ─── legacy aliases the UI still reads in places ─── */
  request_id?: string;
  status_code?: number;
  status_text?: string;
  method?: string;
  url?: string;
  sent_headers?: Array<{ key: string; value: string }>;
  sent_body?: string;
  response?: { headers?: Array<{ key: string; value: string }>; body?: string; sizeBytes?: number };
  total_ms?: number;
  saved_at?: string;
}

/* ───────── normalisers ────────────────────────────────────────────────── */
/**
 * Java emits raw enum step names ("REQUEST_PREPARE", "DNS_LOOKUP", …) but
 * the UI's `LiveExecutionView` keys friendly names like "Prepare", "DNS
 * Lookup" through its tooltip and suggested-fix tables. The translator
 * below normalises them so the same component works for both stream and
 * non-stream paths without special-casing.
 */
const PHASE_FRIENDLY: Record<string, string> = {
  REQUEST_PREPARE:    'Prepare',
  SOCKET_INIT:        'Socket Initialization',
  DNS_LOOKUP:         'DNS Lookup',
  TCP_CONNECT:        'TCP Handshake',
  TLS_HANDSHAKE:      'SSL Handshake',
  REQUEST_SEND:       'Send',
  WAITING_TTFB:       'Waiting (TTFB)',
  RESPONSE_DOWNLOAD:  'Download',
  RESPONSE_PROCESS:   'Process',
};

const normPhaseStatus = (raw?: string): 'done' | 'failed' | 'pending' | 'running' => {
  const u = String(raw ?? '').toUpperCase();
  if (u === 'FAILED' || u === 'ERROR') return 'failed';
  if (u === 'SKIPPED' || u === 'PENDING') return 'pending';
  if (u === 'RUNNING' || u === 'IN_PROGRESS') return 'running';
  return 'done';
};

const normExecution = (r: ExecutionResultDto): ExecutionResult => {
  const phases = Array.isArray(r?.phases)
    ? r.phases.map((p: any) => {
        const rawName = (p?.name ?? p?.step ?? 'Phase') as string;
        return {
          name: PHASE_FRIENDLY[rawName] ?? rawName,
          startedAtMs: p?.startedAtMs ?? p?.offsetMs ?? p?.startOffsetMs,
          durationMs: typeof p?.durationMs === 'number' ? p.durationMs : 0,
          status: normPhaseStatus(p?.status),
          error: p?.details?.error ?? p?.error,
        };
      })
    : [];
  // Normalize response fields: Java sends httpStatus/bodyBytes, UI expects statusCode/sizeBytes
  const rawResp = (r as any)?.response ?? {};
  const response = {
    ...rawResp,
    statusCode: rawResp.statusCode ?? rawResp.httpStatus ?? 0,
    sizeBytes: rawResp.sizeBytes ?? rawResp.bodyBytes ?? 0,
  };
  return { ...r, phases, response } as ExecutionResult;
};

const normSaved = (s: SavedResponseDto): SavedResponse => ({
  ...s,
  // Legacy aliases — keep UI compat without forcing a rewrite of every caller.
  request_id: s.requestId,
  status_code: s.status,
  saved_at: s.createdAt,
});

/* ───────── dummy fallback (UI-only, OFF by default) ────────────────────── */
const useDummy = (): boolean =>
  import.meta.env.VITE_REQUEST_USE_DUMMY === 'true';
const dummyOnError = (): boolean =>
  import.meta.env.VITE_REQUEST_DUMMY_ON_ERROR === 'true';
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

/* ───────── requests (CRUD + soft-delete + duplicate + move) ──────────── */
export const listRequests = (
  collectionId: string,
  folderId?: string | null,
): Promise<ApiRequest[]> =>
  withFallback(
    () => apiListRequests(collectionId, folderId),
    () => [],
  );

export const getRequest = (id: string): Promise<ApiRequest> => apiGetRequest(id);

/**
 * Lazy-injects `workspaceId` from the project store when the caller does
 * not pass one — Java requires it on POST.
 */
export const createRequest = (
  collectionId: string,
  body: Partial<ApiRequest>,
  workspaceId?: string,
): Promise<ApiRequest> => {
  let ws = workspaceId;
  if (!ws) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useWorkspaceStore } = require('@/stores/workspace.store');
      ws = useWorkspaceStore.getState?.().current?.id;
    } catch { /* store unavailable in non-React contexts */ }
  }
  return apiCreateRequest(collectionId, body, ws);
};

export const updateRequest = (
  id: string,
  body: Partial<ApiRequest>,
): Promise<ApiRequest> => apiUpdateRequest(id, body);

export const deleteRequest = (id: string): Promise<void> => apiDeleteRequest(id);

export const cloneRequest = (id: string): Promise<ApiRequest> =>
  apiDuplicateRequest(id);

export const moveRequest = (
  id: string,
  body: { folderId?: string | null; targetCollectionId?: string; order?: number },
): Promise<ApiRequest> => apiMoveRequest(id, body);

export const listRequestTrash = (collectionId: string): Promise<ApiRequest[]> =>
  withFallback(
    () => apiListRequestTrash(collectionId),
    () => [],
  );

export const restoreRequest = (id: string): Promise<ApiRequest> =>
  apiRestoreRequest(id);

/* ───────── execution ──────────────────────────────────────────────────── */
export const executeRequest = (
  id: string,
  overrides?: Partial<ApiRequest> & {
    workspaceId?: string;
    environmentId?: string;
    extraVars?: Record<string, string>;
  },
  opts?: { signal?: AbortSignal },
): Promise<ExecutionResult> =>
  apiExecuteRequest(id, (overrides ?? {}) as never, opts?.signal).then(normExecution);

/** Ad-hoc execute — for unsaved requests (in-page Mock runner). */
export const adhocExecute = (
  req: AdhocBody | Partial<ApiRequest>,
  opts?: { signal?: AbortSignal },
): Promise<ExecutionResult> =>
  apiAdhocExecute(req as AdhocBody, opts?.signal).then(normExecution);

/* ───────── history ────────────────────────────────────────────────────── */
export const requestHistory = (id: string, limit = 50, offset = 0) =>
  apiListRuns(id, Math.floor(offset / limit), limit);

export const getRun = (runId: string) => apiGetRun(runId).then(normExecution);

export const replayRun = (runId: string) =>
  apiReplayRun(runId).then(normExecution);

/* ───────── examples / saved responses ─────────────────────────────────── */
/**
 * `saveResponse` mirrors the legacy "Save as example" flow that uploads to
 * `/examples`. Accepts the loose shape callers historically passed.
 */
export const saveResponse = (requestId: string, body: any): Promise<SavedResponse> => {
  const payload = {
    name:
      body.name ||
      `${body.method ?? 'Saved'} ${body.statusCode ?? body.status ?? ''}`.trim(),
    status: body.statusCode ?? body.status ?? 0,
    headers: body.response?.headers ?? body.headers ?? [],
    body: body.response?.body ?? body.body ?? '',
    contentType: body.response?.contentType ?? body.contentType ?? '',
  };
  return apiCreateExample(requestId, payload).then(normSaved);
};

export const listSavedResponses = (requestId: string): Promise<SavedResponse[]> =>
  withFallback(
    () => apiListExamples(requestId).then((rows) => rows.map(normSaved)),
    () => [],
  );

/**
 * Java's ExampleController does not expose GET-by-id, so we always hit the
 * dedicated SavedResponseController route `/api/v1/saved-responses/{savedId}`.
 * The `requestId` arg is preserved for source compatibility but is ignored
 * server-side.
 */
export const getSavedResponse = (
  _requestId: string,
  savedId: string,
): Promise<SavedResponse> => apiGetSavedResponse(savedId).then(normSaved);

export const deleteSavedResponse = (
  savedId: string,
  requestId?: string,
): Promise<void> =>
  requestId
    ? apiDeleteExample(requestId, savedId)
    : apiDeleteSavedResponse(savedId);

/** Direct alternative for the parallel `/saved-responses` POST route. */
export const createSavedResponse = (
  requestId: string,
  body: { name: string; status: number; headers?: Array<{ key: string; value: string }>; body: string; contentType?: string },
): Promise<SavedResponse> =>
  apiCreateSavedResponse(requestId, body).then(normSaved);

/* ───────── request files ──────────────────────────────────────────────── */
export const uploadRequestFile = (file: File): Promise<UploadedFile> =>
  apiUploadRequestFile(file);

export const getRequestFile = (fileRef: string): Promise<UploadedFile> =>
  apiGetRequestFile(fileRef);

export const deleteRequestFile = (fileRef: string): Promise<void> =>
  apiDeleteRequestFile(fileRef);

/* ───────── share + public resolver ────────────────────────────────────── */
export const shareRequest = (
  id: string,
  body?: { visibility?: 'PUBLIC' | 'ORG' | 'PRIVATE'; ttlDays?: number; note?: string },
): Promise<RequestShareLink> => apiCreateRequestShare(id, body);

export const listRequestShares = (id: string): Promise<RequestShareLink[]> =>
  withFallback(
    () => apiListRequestShares(id),
    () => [],
  );

export const revokeRequestShare = (id: string, shareId: string): Promise<void> =>
  apiRevokeRequestShare(id, shareId);

export const resolvePublicShare = (
  token: string,
): Promise<PublicShareResolution> => apiResolvePublicShare(token);
