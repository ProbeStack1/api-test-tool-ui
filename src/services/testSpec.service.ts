/**
 * Test-Spec service — UI-facing layer.
 *
 *   page  →  THIS FILE  →  api/testSpec.api  →  http://<test-spec svc>
 *
 * Mirrors `test-spec-mgmt-svc` (port 8092). Provides:
 *   - thin re-exports of the Java DTO vocabulary
 *   - normalisers that flatten Spring's `Page<T>` to a plain
 *     `{content, page, size, totalElements, totalPages}` shape and
 *     convert epoch-second `Instant` timestamps to ISO strings
 *   - the `__dummy` env-gated fallback used by every other service
 */
import {
  apiArchiveLibraryItem,
  apiArchiveTestSpec,
  apiCreateLibraryItem,
  apiCreateTestSpecFromLibrary,
  apiCreateTestSpecFromUpload,
  apiCreateTestSpecFromUrl,
  apiDetectSpecFormat,
  apiExportTestSpec,
  apiGenerateTestCases,
  apiGetLibraryItem,
  apiGetLibraryItemContent,
  apiGetTestCase,
  apiGetTestSpec,
  apiGetTestSpecContent,
  apiListLibraryItems,
  apiListTestCases,
  apiListTestSpecs,
  apiPermanentDeleteLibraryItem,
  apiPermanentDeleteTestSpec,
  apiPreviewTestCases,
  apiRestoreLibraryItem,
  apiRestoreTestSpec,
  apiUpdateLibraryItem,
  apiUpdateTestSpec,
  type CategoryDelta,
  type CreateFromLibraryBody,
  type CreateFromUploadBody,
  type CreateFromUrlBody,
  type CreateLibraryItemBody,
  type DetectFormatResponse,
  type ExportFormat,
  type GenerateRequestBody,
  type GenerateResponse,
  type PreviewResponse,
  type SpecFormat,
  type SpecLibraryView,
  type SpecStatus,
  type SpringPage,
  type TestCaseView,
  type TestSpecContentView,
  type TestSpecView,
  type UpdateLibraryItemBody,
  type UpdateTestSpecBody,
} from '@/api/testSpec.api';

/* ───────── re-exported vocabulary ──────────────────────────────────────── */
export type { SpecFormat, SpecStatus, ExportFormat, CategoryDelta };
export type TestSpec        = TestSpecView;
export type TestSpecContent = TestSpecContentView;
export type TestCase        = TestCaseView;
export type LibraryItem     = SpecLibraryView;
export type {
  DetectFormatResponse,
  GenerateRequestBody,
  GenerateResponse,
  PreviewResponse,
  CreateFromUploadBody,
  CreateFromUrlBody,
  CreateFromLibraryBody,
  CreateLibraryItemBody,
  UpdateTestSpecBody,
  UpdateLibraryItemBody,
};

/** Friendly page envelope (UI-side). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/* ───────── normalisers ────────────────────────────────────────────────── */
/** Java emits epoch seconds (e.g. 1777455230.241) for `Instant`. Convert
 *  to ISO so the UI can `new Date(iso)` safely. Strings pass through. */
const toIso = (v: number | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') {
    const ms = v < 1e12 ? v * 1000 : v;       // seconds vs ms heuristic
    return new Date(ms).toISOString();
  }
  return undefined;
};

const normSpec = (s: TestSpecView): TestSpec => ({
  ...s,
  description:    s.description ?? null,
  testCaseCount:  s.testCaseCount ?? 0,
  tags:           s.tags ?? null,
  archiveExpiresAt: toIso(s.archiveExpiresAt) ?? null,
  createdAt:      toIso(s.createdAt) ?? '',
  updatedAt:      toIso(s.updatedAt) ?? '',
});

const normLibrary = (l: SpecLibraryView): LibraryItem => ({
  ...l,
  description:    l.description ?? null,
  category:       l.category ?? null,
  tags:           l.tags ?? null,
  importCount:    l.importCount ?? 0,
  archiveExpiresAt: toIso(l.archiveExpiresAt) ?? null,
  createdAt:      toIso(l.createdAt) ?? '',
  updatedAt:      toIso(l.updatedAt) ?? '',
});

const normCase = (c: TestCaseView): TestCase => ({
  ...c,
  tags:        c.tags ?? null,
  parameters:  c.parameters ?? [],
  createdAt:   toIso(c.createdAt) ?? '',
  updatedAt:   toIso(c.updatedAt) ?? '',
});

/** Flatten Spring Page<T> → friendly `{content, page, size, totalElements, totalPages}`. */
const normPage = <T, U>(p: SpringPage<T> | T[] | undefined | null, map: (t: T) => U): Page<U> => {
  if (!p) return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 };
  if (Array.isArray(p)) {
    return { content: p.map(map), page: 0, size: p.length, totalElements: p.length, totalPages: 1 };
  }
  const content = (p.content ?? []).map(map);
  return {
    content,
    page: p.pageable?.pageNumber ?? p.number ?? 0,
    size: p.pageable?.pageSize ?? p.size ?? content.length,
    totalElements: p.totalElements ?? content.length,
    totalPages: p.totalPages ?? (content.length ? 1 : 0),
  };
};

/* ───────── dummy fallback (UI-only, OFF by default) ────────────────────── */
const useDummy = (): boolean =>
  import.meta.env.VITE_TEST_SPEC_USE_DUMMY === 'true';
const dummyOnError = (): boolean =>
  import.meta.env.VITE_TEST_SPEC_DUMMY_ON_ERROR === 'true';
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

const emptyPage = <T>(): Page<T> => ({
  content: [], page: 0, size: 0, totalElements: 0, totalPages: 0,
});

/* ───────── format detect ──────────────────────────────────────────────── */
export const detectSpecFormat = (content: string): Promise<DetectFormatResponse> =>
  apiDetectSpecFormat(content);

/* ───────── test-specs (CRUD + soft-delete + restore) ─────────────────── */
export const listTestSpecs = (
  workspaceId: string,
  opts: { status?: SpecStatus; search?: string; page?: number; size?: number } = {},
): Promise<Page<TestSpec>> =>
  withFallback(
    () => apiListTestSpecs(workspaceId, opts).then((p) => normPage(p, normSpec)),
    () => emptyPage<TestSpec>(),
  );

export const getTestSpec = (testSpecId: string): Promise<TestSpec> =>
  apiGetTestSpec(testSpecId).then(normSpec);

export const getTestSpecContent = (testSpecId: string): Promise<TestSpecContent> =>
  apiGetTestSpecContent(testSpecId);

export const createTestSpecFromUpload = (body: CreateFromUploadBody): Promise<TestSpec> =>
  apiCreateTestSpecFromUpload(body).then(normSpec);

export const createTestSpecFromUrl = (body: CreateFromUrlBody): Promise<TestSpec> =>
  apiCreateTestSpecFromUrl(body).then(normSpec);

export const createTestSpecFromLibrary = (body: CreateFromLibraryBody): Promise<TestSpec> =>
  apiCreateTestSpecFromLibrary(body).then(normSpec);

export const updateTestSpec = (testSpecId: string, body: UpdateTestSpecBody): Promise<TestSpec> =>
  apiUpdateTestSpec(testSpecId, body).then(normSpec);

export const archiveTestSpec = (testSpecId: string, retentionDays?: number): Promise<TestSpec> =>
  apiArchiveTestSpec(testSpecId, retentionDays).then(normSpec);

export const restoreTestSpec = (testSpecId: string): Promise<TestSpec> =>
  apiRestoreTestSpec(testSpecId).then(normSpec);

export const permanentDeleteTestSpec = (testSpecId: string): Promise<void> =>
  apiPermanentDeleteTestSpec(testSpecId);

/* ───────── generate (preview + commit) ────────────────────────────────── */
export const previewTestCases = (
  testSpecId: string,
  body: GenerateRequestBody = {},
): Promise<PreviewResponse> => apiPreviewTestCases(testSpecId, body);

export const generateTestCases = (
  testSpecId: string,
  body: GenerateRequestBody = {},
): Promise<GenerateResponse> => apiGenerateTestCases(testSpecId, body);

/* ───────── test cases ─────────────────────────────────────────────────── */
export const listTestCases = (
  testSpecId: string,
  opts: { category?: string; page?: number; size?: number } = {},
): Promise<Page<TestCase>> =>
  withFallback(
    () => apiListTestCases(testSpecId, opts).then((p) => normPage(p, normCase)),
    () => emptyPage<TestCase>(),
  );

export const getTestCase = (testCaseId: string): Promise<TestCase> =>
  apiGetTestCase(testCaseId).then(normCase);

/* ───────── export ─────────────────────────────────────────────────────── */
export const exportTestSpec = (testSpecId: string, format: ExportFormat = 'FORGEQ') =>
  apiExportTestSpec(testSpecId, format);

/* Helper — trigger a browser download from the export blob. */
export const downloadExportBlob = (
  blob: Blob,
  contentDisposition: string | undefined,
  fallbackName = 'export.json',
): void => {
  const cd = contentDisposition ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = decodeURIComponent(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ───────── library ────────────────────────────────────────────────────── */
export const listLibraryItems = (
  opts: { status?: SpecStatus; search?: string; page?: number; size?: number } = {},
): Promise<Page<LibraryItem>> =>
  withFallback(
    () => apiListLibraryItems(opts).then((p) => normPage(p, normLibrary)),
    () => emptyPage<LibraryItem>(),
  );

export const getLibraryItem = (libraryItemId: string): Promise<LibraryItem> =>
  apiGetLibraryItem(libraryItemId).then(normLibrary);

/** Returns the raw spec content as a string (Java endpoint returns `String`). */
export const getLibraryItemContent = (libraryItemId: string): Promise<string> =>
  apiGetLibraryItemContent(libraryItemId);

export const createLibraryItem = (body: CreateLibraryItemBody): Promise<LibraryItem> =>
  apiCreateLibraryItem(body).then(normLibrary);

export const updateLibraryItem = (libraryItemId: string, body: UpdateLibraryItemBody): Promise<LibraryItem> =>
  apiUpdateLibraryItem(libraryItemId, body).then(normLibrary);

export const archiveLibraryItem = (libraryItemId: string, retentionDays?: number): Promise<LibraryItem> =>
  apiArchiveLibraryItem(libraryItemId, retentionDays).then(normLibrary);

export const restoreLibraryItem = (libraryItemId: string): Promise<LibraryItem> =>
  apiRestoreLibraryItem(libraryItemId).then(normLibrary);

export const permanentDeleteLibraryItem = (libraryItemId: string): Promise<void> =>
  apiPermanentDeleteLibraryItem(libraryItemId);
