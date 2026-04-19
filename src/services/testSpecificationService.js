import { testSpecificationApi } from '../lib/apiClient';

const BASE = '/api/v1/testspec/spec';

/**
 * Normalize a test spec from backend to frontend shape.
 * NOTE: The new backend stores JSON spec content in GCS. The metadata endpoints
 *       (list/get) no longer return the `content` field — it must be fetched
 *       via GET /spec/{id}/content. We keep `content` on the normalized object
 *       so the existing UI (editor) continues to work as before.
 */
export const normalizeTestSpec = (spec, content = undefined) => ({
  id: spec.id,
  name: spec.name,
  content: content !== undefined ? content : (spec.content ?? ''),
  source: spec.source,
  sourceId: spec.sourceId,
  importUrl: spec.importUrl,
  workspaceId: spec.workspaceId,
  gcsPath: spec.gcsPath,
  contentHash: spec.contentHash,
  fileSize: spec.fileSize,
  status: spec.status,                     // ACTIVE | ARCHIVED
  archiveExpiresAt: spec.archiveExpiresAt, // OffsetDateTime ISO
  archiveRetentionDays: spec.archiveRetentionDays,
  createdBy: spec.createdBy,
  createdAt: spec.createdAt,
  updatedAt: spec.updatedAt,
});

export const normalizeTestCase = (tc) => ({ ...tc });

/** GET /testspec/spec?workspaceId=&search=&limit=&offset= */
export const listTestSpecs = (workspaceId, params = {}) => {
  const { q, search, ...rest } = params;
  const searchParam = search ?? q;
  return testSpecificationApi
    .get(BASE, { params: { workspaceId, ...(searchParam ? { search: searchParam } : {}), ...rest } })
    .then((res) => ({
      total: res.data.total,
      limit: res.data.limit,
      offset: res.data.offset,
      items: (res.data.items || []).map((s) => normalizeTestSpec(s)),
    }));
};

/** GET /testspec/spec/archived?workspaceId=&limit=&offset= */
export const listArchivedTestSpecs = (workspaceId, params = {}) =>
  testSpecificationApi
    .get(`${BASE}/archived`, { params: { workspaceId, ...params } })
    .then((res) => ({
      total: res.data.total,
      limit: res.data.limit,
      offset: res.data.offset,
      items: (res.data.items || []).map((s) => normalizeTestSpec(s)),
    }));

/** GET /testspec/spec/{testSpecId}/content → raw JSON string */
export const getTestSpecContent = (testSpecId) =>
  testSpecificationApi
    .get(`${BASE}/${testSpecId}/content`, { transformResponse: [(data) => data] })
    .then((res) => (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)));

/**
 * GET /testspec/spec/{testSpecId}
 * Fetches metadata AND content in parallel so callers get a unified object
 * that matches the previous (pre-GCS) response shape.
 */
export const getTestSpec = async (testSpecId) => {
  const [metaRes, content] = await Promise.all([
    testSpecificationApi.get(`${BASE}/${testSpecId}`),
    getTestSpecContent(testSpecId).catch(() => ''),
  ]);
  return normalizeTestSpec(metaRes.data, content);
};

/**
 * POST /testspec/spec
 * Accepts the same payload shape as before:
 *   { source: 'upload' | 'url' | 'library', name, workspaceId,
 *     content?, importUrl?, sourceId? }
 */
export const createTestSpec = async (data) => {
  const res = await testSpecificationApi.post(BASE, data);
  const entity = res.data;
  let content = '';
  if (data.source === 'upload' && data.content != null) {
    content = data.content;
  } else if (entity?.id) {
    try { content = await getTestSpecContent(entity.id); } catch { content = ''; }
  }
  return normalizeTestSpec(entity, content);
};

/**
 * PUT /testspec/spec/{testSpecId}
 * Backend supports partial update of { name, content } via PUT.
 */
export const updateTestSpec = async (testSpecId, data) => {
  const res = await testSpecificationApi.put(`${BASE}/${testSpecId}`, data);
  let content;
  if (data && Object.prototype.hasOwnProperty.call(data, 'content')) {
    content = data.content;
  } else {
    try { content = await getTestSpecContent(testSpecId); } catch { content = ''; }
  }
  return normalizeTestSpec(res.data, content);
};

/**
 * DELETE /testspec/spec/{testSpecId}?retentionDays=N
 * Soft-delete (archive). Returns the archived spec entity.
 */
export const deleteTestSpec = (testSpecId, retentionDays) =>
  testSpecificationApi
    .delete(`${BASE}/${testSpecId}`, {
      params: retentionDays != null ? { retentionDays } : {},
    })
    .then((res) => (res.data ? normalizeTestSpec(res.data) : null));

/** POST /testspec/spec/{testSpecId}/restore */
export const restoreTestSpec = (testSpecId) =>
  testSpecificationApi
    .post(`${BASE}/${testSpecId}/restore`)
    .then((res) => normalizeTestSpec(res.data));

/** DELETE /testspec/spec/{testSpecId}/permanent */
export const permanentDeleteTestSpec = (testSpecId) =>
  testSpecificationApi.delete(`${BASE}/${testSpecId}/permanent`);

/**
 * Matches the backend's "content unchanged since last generation" guard.
 * The backend throws IllegalStateException with this exact message, so we
 * can detect it reliably from the error response.
 */
export const isUnchangedContentError = (err) => {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message
    || err?.response?.data?.error
    || err?.message
    || '';
  return (status === 409 || status === 400 || status === 500)
    && /unchanged since last generation|force=true/i.test(String(msg));
};

/**
 * POST /testspec/spec/{testSpecId}/generate?force=&includeNegativeTests=&...
 *
 * Returns { generated, deleted, testCases }.
 * When force=false and the spec content hash is unchanged, the backend
 * throws a 4xx/5xx with a specific message — the caller should handle this
 * via isUnchangedContentError(err) and show the "no changes" UI.
 *
 * @param options.force                      boolean — bypass the hash guard
 * @param options.includeNegativeTests       boolean (default true)
 * @param options.includeSecurityTests       boolean (default true)
 * @param options.includePerformanceTests    boolean (default true)
 * @param options.includeBoundaryTests       boolean (default true)
 * @param options.responseTimeThresholdMs    number  (default 5000)
 * @param options.format                     'openapi' | 'postman' | undefined (auto)
 */
export const generateTestCases = (testSpecId, {
  force = false,
  includeNegativeTests = true,
  includeSecurityTests = true,
  includePerformanceTests = true,
  includeBoundaryTests = true,
  responseTimeThresholdMs = 5000,
  format,
} = {}) =>
  testSpecificationApi
    .post(`${BASE}/${testSpecId}/generate`, null, {
      params: {
        force,
        includeNegativeTests,
        includeSecurityTests,
        includePerformanceTests,
        includeBoundaryTests,
        responseTimeThresholdMs,
        ...(format ? { format } : {}),
      },
    })
    .then((res) => ({
      generated: res.data?.generated ?? 0,
      deleted: res.data?.deleted ?? 0,
      testCases: (res.data?.testCases || []).map(normalizeTestCase),
    }));

/** GET /testspec/spec/{testSpecId}/test-cases?limit=&offset= */
export const listTestCases = (testSpecId, params = {}) =>
  testSpecificationApi.get(`${BASE}/${testSpecId}/test-cases`, { params }).then((res) => ({
    total: res.data.total,
    limit: res.data.limit,
    offset: res.data.offset,
    items: (res.data.items || []).map(normalizeTestCase),
  }));
