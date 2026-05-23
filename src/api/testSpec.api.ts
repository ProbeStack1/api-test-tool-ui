/**
 * Test-Spec raw HTTP layer — 1:1 mapping of `test-spec-mgmt-svc` (port 8092).
 *
 *   page  →  services/testSpec.service  →  THIS FILE  →  http://<test-spec svc>
 *
 * Four controllers covered:
 *   • TestSpecController         /api/v1/test-specs
 *   • SpecLibraryController      /api/v1/test-specs/library
 *   • TestSpecExportController   /api/v1/test-specs/{id}/export
 *   • TestCaseController         /api/v1/test-specs/{id}/test-cases
 *
 * Strict rules: no hard-coded URLs, no business logic; returns the
 * unwrapped `data` shape (the global axios interceptor handles the
 * `ResponseEnvelope`).
 *
 * Java DTO contracts kept intentionally faithful — page responses use
 * Spring's `Page<T>` shape (`pageable.pageNumber`, `numberOfElements`,
 * etc.). The service layer normalises that into the friendlier
 * `{ content, page, size, totalElements, totalPages }` envelope.
 */
import { createHttp } from '@/lib/http';

/* ------------------------------ types ------------------------------------ */
export type SpecFormat   = 'OPENAPI' | 'POSTMAN' | 'INSOMNIA' | 'HAR' | 'CURL' | 'YAML' | 'FORGEQ' | 'UNKNOWN';
export type SpecStatus   = 'ACTIVE' | 'ARCHIVED';
export type SpecSource   = 'UPLOAD' | 'URL' | 'LIBRARY';
export type ExportFormat = 'FORGEQ' | 'POSTMAN' | 'OPENAPI' | 'INSOMNIA';

export interface DetectFormatResponse {
  format: string;             // OPENAPI | POSTMAN | HAR | INSOMNIA | CURL | YAML | UNKNOWN
  version?: string | null;
  contentType?: string;
  endpointCount?: number | null;
  warnings: string[];
}

/** Spring's Page<T> shape — exactly what Java emits. */
export interface SpringPage<T> {
  content: T[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
    offset?: number;
    paged?: boolean;
    unpaged?: boolean;
    sort?: unknown;
  };
  number?: number;            // current page (0-indexed)
  size?: number;              // page size
  totalElements?: number;
  totalPages?: number;
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface TestSpecView {
  testSpecId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  source: SpecSource;
  sourceLibraryItemId?: string | null;
  importUrl?: string | null;
  format: string;
  contentType: string;
  contentHash: string;
  fileSize: number;
  testCaseCount: number;
  status: SpecStatus | string;
  archiveExpiresAt?: number | string | null;
  archiveRetentionDays?: number | null;
  tags?: string[] | null;
  createdByEmail?: string;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface TestSpecContentView {
  testSpecId: string;
  format: string;
  contentType: string;
  content: string;
}

export interface CreateFromUploadBody {
  workspaceId: string;
  name: string;
  description?: string;
  content: string;
  /** Optional hint — detector auto-picks when null. */
  format?: string;
  tags?: string[];
}

export interface CreateFromUrlBody {
  workspaceId: string;
  name: string;
  url: string;
  description?: string;
  tags?: string[];
}

export interface CreateFromLibraryBody {
  workspaceId: string;
  name: string;
  libraryItemId: string;
}

export interface UpdateTestSpecBody {
  name?: string;
  description?: string | null;
  content?: string;
  tags?: string[] | null;
}

export interface GenerateRequestBody {
  force?: boolean;
  includePositive?: boolean;
  includeNegative?: boolean;
  includeSecurity?: boolean;
  includePerformance?: boolean;
  includeBoundary?: boolean;
  includeValidation?: boolean;
  /** 100 — 300_000 ms */
  responseTimeThresholdMs?: number;
}

export interface CategoryDelta {
  category: string;
  current: number;
  wouldBe: number;
  delta: number;
}

export interface GenerateResponse {
  testSpecId: string;
  format: string;
  generated: number;
  deletedOld: number;
  endpoints: number;
  contentHash: string;
}

export interface PreviewResponse {
  testSpecId: string;
  format: string;
  endpoints: number;
  contentChanged: boolean;
  currentHash: string;
  previewHash: string;
  currentCases: number;
  wouldBeCases: number;
  added: number;
  removed: number;
  unchanged: number;
  byCategory: CategoryDelta[];
  addedSamples?: string[];
  removedSamples?: string[];
}

export interface TestCaseHeaderPair { name: string; value: string }
export interface TestCaseParameterInfo {
  name: string;
  in?: string;
  required?: boolean;
  type?: string;
  example?: unknown;
}

export interface TestCaseView {
  testCaseId: string;
  testSpecId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  category: string;
  priority?: string;
  endpointName?: string;
  method?: string;
  url?: string;
  folderPath?: string;
  testType?: string;
  expectedStatus?: string;
  expectedBehavior?: string;
  summary?: string;
  operationId?: string | null;
  tags?: string[] | null;
  originalBody?: string | null;
  originalBodyMode?: string | null;
  originalBodyLanguage?: string | null;
  originalHeaders?: TestCaseHeaderPair[] | null;
  originalAuth?: Record<string, string> | null;
  overrideMethod?: string | null;
  overrideUrl?: string | null;
  overrideBody?: string | null;
  overrideHeaders?: Record<string, string> | null;
  overrideAuth?: Record<string, string> | null;
  generatedTestScript?: string | null;
  requestBodySample?: string | null;
  responseSample?: string | null;
  parameters?: TestCaseParameterInfo[];
  generatorFormat?: string;
  generatedByEmail?: string;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface SpecLibraryView {
  libraryItemId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  format: string;
  contentType: string;
  contentHash: string;
  fileSize: number;
  status: SpecStatus | string;
  archiveExpiresAt?: number | string | null;
  archiveRetentionDays?: number | null;
  tags?: string[] | null;
  importCount?: number;
  sourceWorkspaceId?: string | null;
  createdByEmail?: string;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface CreateLibraryItemBody {
  name: string;
  description?: string;
  category?: string;
  content: string;
  format?: string;
  tags?: string[];
  sourceWorkspaceId?: string;
}

export interface UpdateLibraryItemBody {
  name?: string;
  description?: string | null;
  category?: string | null;
  content?: string;
  tags?: string[] | null;
}

/* ----------------------------- client ------------------------------------ */
const http = createHttp('testSpec');
const BASE    = '/api/v1/settings/testspec';
const LIBRARY = `${BASE}/library`;

/* =========================== test-specs ================================== */
export const apiDetectSpecFormat = (content: string) =>
  http
    .post<DetectFormatResponse>(`${BASE}/detect-format`, { content })
    .then((r) => r.data);

export const apiCreateTestSpecFromUpload = (body: CreateFromUploadBody) =>
  http.post<TestSpecView>(BASE, body).then((r) => r.data);

export const apiCreateTestSpecFromUrl = (body: CreateFromUrlBody) =>
  http.post<TestSpecView>(`${BASE}/from-url`, body).then((r) => r.data);

export const apiCreateTestSpecFromLibrary = (body: CreateFromLibraryBody) =>
  http.post<TestSpecView>(`${BASE}/from-library`, body).then((r) => r.data);

export const apiListTestSpecs = (
  workspaceId: string,
  opts: { status?: SpecStatus; search?: string; page?: number; size?: number } = {},
) =>
  http
    .get<SpringPage<TestSpecView>>(BASE, {
      params: {
        workspaceId,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.search ? { search: opts.search } : {}),
        page: opts.page ?? 0,
        size: opts.size ?? 20,
      },
    })
    .then((r) => r.data);

export const apiGetTestSpec = (testSpecId: string) =>
  http.get<TestSpecView>(`${BASE}/${testSpecId}`).then((r) => r.data);

export const apiGetTestSpecContent = (testSpecId: string) =>
  http
    .get<TestSpecContentView>(`${BASE}/${testSpecId}/content`)
    .then((r) => r.data);

export const apiUpdateTestSpec = (testSpecId: string, body: UpdateTestSpecBody) =>
  http.put<TestSpecView>(`${BASE}/${testSpecId}`, body).then((r) => r.data);

/** Soft-delete (archive). Optional `retentionDays` (default 30 server-side). */
export const apiArchiveTestSpec = (testSpecId: string, retentionDays?: number) =>
  http
    .delete<TestSpecView>(`${BASE}/${testSpecId}`, {
      params: retentionDays != null ? { retentionDays } : {},
    })
    .then((r) => r.data);

export const apiRestoreTestSpec = (testSpecId: string) =>
  http.post<TestSpecView>(`${BASE}/${testSpecId}/restore`).then((r) => r.data);

export const apiPermanentDeleteTestSpec = (testSpecId: string) =>
  http.delete<void>(`${BASE}/${testSpecId}/permanent`).then((r) => r.data);

/* ============== generate test cases (preview + commit) =================== */
export const apiPreviewTestCases = (testSpecId: string, body: GenerateRequestBody = {}) =>
  http
    .post<PreviewResponse>(`${BASE}/${testSpecId}/generate-preview`, body)
    .then((r) => r.data);

export const apiGenerateTestCases = (testSpecId: string, body: GenerateRequestBody = {}) =>
  http
    .post<GenerateResponse>(`${BASE}/${testSpecId}/generate`, body)
    .then((r) => r.data);

/* =============================== test cases ============================== */
export const apiListTestCases = (
  testSpecId: string,
  opts: { category?: string; page?: number; size?: number } = {},
) =>
  http
    .get<SpringPage<TestCaseView>>(`${BASE}/${testSpecId}/test-cases`, {
      params: {
        ...(opts.category ? { category: opts.category } : {}),
        page: opts.page ?? 0,
        size: opts.size ?? 50,
      },
    })
    .then((r) => r.data);

export const apiGetTestCase = (testCaseId: string) =>
  http.get<TestCaseView>(`${BASE}/test-cases/${testCaseId}`).then((r) => r.data);

/* =============================== export ================================= */
export const apiExportTestSpec = async (id: string, format: ExportFormat = 'FORGEQ') => {
  const res = await http.get(`${BASE}/${id}/export`, {
    params: { format },
    responseType: 'blob',
  });
  return {
    blob: res.data as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

/* ============================= library =================================== */
export const apiCreateLibraryItem = (body: CreateLibraryItemBody) =>
  http.post<SpecLibraryView>(LIBRARY, body).then((r) => r.data);

export const apiUpdateLibraryItem = (libraryItemId: string, body: UpdateLibraryItemBody) =>
  http.put<SpecLibraryView>(`${LIBRARY}/${libraryItemId}`, body).then((r) => r.data);

export const apiListLibraryItems = (
  opts: { status?: SpecStatus; search?: string; page?: number; size?: number } = {},
) =>
  http
    .get<SpringPage<SpecLibraryView>>(LIBRARY, {
      params: {
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.search ? { search: opts.search } : {}),
        page: opts.page ?? 0,
        size: opts.size ?? 20,
      },
    })
    .then((r) => r.data);

export const apiGetLibraryItem = (libraryItemId: string) =>
  http.get<SpecLibraryView>(`${LIBRARY}/${libraryItemId}`).then((r) => r.data);

/** Library content endpoint returns the raw spec text as a string. */
export const apiGetLibraryItemContent = (libraryItemId: string) =>
  http.get<string>(`${LIBRARY}/${libraryItemId}/content`).then((r) => r.data);

export const apiArchiveLibraryItem = (libraryItemId: string, retentionDays?: number) =>
  http
    .delete<SpecLibraryView>(`${LIBRARY}/${libraryItemId}`, {
      params: retentionDays != null ? { retentionDays } : {},
    })
    .then((r) => r.data);

export const apiRestoreLibraryItem = (libraryItemId: string) =>
  http.post<SpecLibraryView>(`${LIBRARY}/${libraryItemId}/restore`).then((r) => r.data);

export const apiPermanentDeleteLibraryItem = (libraryItemId: string) =>
  http.delete<void>(`${LIBRARY}/${libraryItemId}/permanent`).then((r) => r.data);
