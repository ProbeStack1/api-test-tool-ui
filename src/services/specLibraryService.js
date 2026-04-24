import { testSpecificationApi } from '../lib/apiClient';

const BASE = '/api/v1/testspecs/library';
const SPEC_BASE = '/api/v1/testspecs/spec';

/**
 * Normalize a library item from backend to frontend shape.
 * NOTE: The new backend stores JSON spec content in GCS. Metadata endpoints
 *       (list/get) no longer return the `content` field — it must be fetched
 *       via GET /library/{id}/content. We keep `content` populated on the
 *       normalized object so the existing UI keeps working.
 */
export const normalizeLibraryItem = (item, content = undefined) => ({
  id: item.id,
  name: item.name,
  description: item.description || '',
  category: item.category || '',
  content: content !== undefined ? content : (item.content ?? ''),
  gcsPath: item.gcsPath,
  contentHash: item.contentHash,
  fileSize: item.fileSize,
  // Preserve legacy `isActive` for any consumer that still reads it.
  isActive: item.status ? item.status === 'ACTIVE' : item.isActive,
  status: item.status,                     // ACTIVE | ARCHIVED
  archiveExpiresAt: item.archiveExpiresAt, // OffsetDateTime ISO
  archiveRetentionDays: item.archiveRetentionDays,
  workspaceId: item.workspaceId,
  createdBy: item.createdBy,
  lastUpdatedBy: item.lastUpdatedBy,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

/** GET /testspec/library?search= */
export const listLibraryItems = (q = '') =>
  testSpecificationApi
    .get(BASE, { params: q ? { search: q } : {} })
    .then((res) => (res.data || []).map((i) => normalizeLibraryItem(i)));

/** GET /testspec/library/archived */
export const listArchivedLibraryItems = () =>
  testSpecificationApi
    .get(`${BASE}/archived`)
    .then((res) => (res.data || []).map((i) => normalizeLibraryItem(i)));

/** GET /testspec/library/{id}/content → raw JSON string */
export const getLibraryItemContent = (libraryItemId) =>
  testSpecificationApi
    .get(`${BASE}/${libraryItemId}/content`, { transformResponse: [(data) => data] })
    .then((res) => (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)));

/**
 * GET /testspec/library/{libraryItemId}
 * Fetches metadata + content in parallel to preserve the previous response shape.
 */
export const getLibraryItem = async (libraryItemId) => {
  const [metaRes, content] = await Promise.all([
    testSpecificationApi.get(`${BASE}/${libraryItemId}`),
    getLibraryItemContent(libraryItemId).catch(() => ''),
  ]);
  return normalizeLibraryItem(metaRes.data, content);
};

/**
 * POST /testspec/library
 * Body: { workspaceId, name, description, category, content }
 * The new backend REQUIRES `workspaceId` — callers must supply it.
 */
export const createLibraryItem = async (data) => {
  const res = await testSpecificationApi.post(BASE, data);
  return normalizeLibraryItem(res.data, data.content);
};

/**
 * PUT /testspec/library/{libraryItemId}
 * Backend supports partial update of { name, description, category, content }.
 */
export const updateLibraryItem = async (libraryItemId, data) => {
  const res = await testSpecificationApi.put(`${BASE}/${libraryItemId}`, data);
  let content;
  if (data && Object.prototype.hasOwnProperty.call(data, 'content')) {
    content = data.content;
  } else {
    try { content = await getLibraryItemContent(libraryItemId); } catch { content = ''; }
  }
  return normalizeLibraryItem(res.data, content);
};

/**
 * DELETE /testspec/library/{libraryItemId}?retentionDays=N
 * Soft-delete (archive). Returns the archived library item.
 */
export const deleteLibraryItem = (libraryItemId, retentionDays) =>
  testSpecificationApi
    .delete(`${BASE}/${libraryItemId}`, {
      params: retentionDays != null ? { retentionDays } : {},
    })
    .then((res) => (res.data ? normalizeLibraryItem(res.data) : null));

/** POST /testspec/library/{libraryItemId}/restore */
export const restoreLibraryItem = (libraryItemId) =>
  testSpecificationApi
    .post(`${BASE}/${libraryItemId}/restore`)
    .then((res) => normalizeLibraryItem(res.data));

/** DELETE /testspec/library/{libraryItemId}/permanent */
export const permanentDeleteLibraryItem = (libraryItemId) =>
  testSpecificationApi.delete(`${BASE}/${libraryItemId}/permanent`);

/**
 * Import a library item into a workspace as a test spec.
 * The legacy POST /library/{id}/import endpoint no longer exists — instead we
 * create a test spec whose source is LIBRARY. We preserve the same public
 * signature `importLibraryItem(libraryItemId, workspaceId)` so the existing UI
 * keeps working unchanged.
 */
export const importLibraryItem = async (libraryItemId, workspaceId) => {
  // Need the library item's name for the new spec.
  const metaRes = await testSpecificationApi.get(`${BASE}/${libraryItemId}`);
  const name = metaRes.data?.name || 'Imported Spec';
  const res = await testSpecificationApi.post(SPEC_BASE, {
    source: 'library',
    name,
    sourceId: libraryItemId,
    workspaceId,
  });
  return res.data;
};
