import apiClient from '../lib/apiClient';

const COLLECTIONS_BASE = '/api/v1/collections';

/**
 * Normalizes backend CollectionResponse to the UI collection shape.
 *
 * Backend: { collectionId, workspaceId, name, description, version, visibility, ... }
 * UI:      { id, name, type, project, projectName, items: [] }
 *
 * @param {object} col  - raw CollectionResponse from backend
 * @param {{ id: string, name: string }} workspace - parent workspace
 */
export const normalizeCollection = (col, workspace) => ({
  id: col.collectionId,
  name: col.name,
  description: col.description || '',
  version: col.version || '',
  visibility: col.visibility || 'private',
  type: 'collection',
  project: workspace.id,
  projectName: workspace.name,
  items: [],
});

/**
 * Normalizes backend FolderResponse to the UI folder shape.
 * Note: backend serialises the id field as "FolderId" (capital F) — this is
 * a known backend bug. We accept both casings defensively.
 *
 * Backend: { FolderId, collectionId, name, description, parentFolderId, orderIndex }
 * UI:      { id, name, type: 'folder', collectionId, parentFolderId, items: [] }
 *
 * @param {object} folder - raw FolderResponse from backend
 */
export const normalizeFolder = (folder) => ({
  id: folder.FolderId || folder.folderId || folder.id,
  name: folder.name,
  description: folder.description || '',
  type: 'folder',
  collectionId: folder.collectionId,
  parentFolderId: folder.parentFolderId || null,
  orderIndex: folder.orderIndex ?? 0,
  items: [],
});

// ─── Collections ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/collections?workspaceId=
 * Lists all non-deleted collections in a workspace.
 * @param {string} workspaceId
 */
export const fetchCollections = (workspaceId) =>
  apiClient.get(COLLECTIONS_BASE, { params: { workspaceId } });

/**
 * POST /api/v1/collections?workspaceId=
 * Creates a new collection in the given workspace.
 * @param {string} workspaceId
 * @param {{ name: string, description?: string, version?: string, visibility?: string }} data
 */
export const createCollection = (workspaceId, data) =>
  apiClient.post(COLLECTIONS_BASE, data, { params: { workspaceId } });

/**
 * PUT /api/v1/collections/{collectionId}
 * Updates name/description/version/visibility of a collection.
 * @param {string} id
 * @param {{ name?: string, description?: string, version?: string, visibility?: string }} data
 */
export const updateCollection = (id, data) =>
  apiClient.put(`${COLLECTIONS_BASE}/${id}`, data);

/**
 * DELETE /api/v1/collections/{collectionId}
 * Soft-deletes a collection.
 * @param {string} id
 */
export const deleteCollection = (id) =>
  apiClient.delete(`${COLLECTIONS_BASE}/${id}`);

// ─── Folders ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/collections/{collectionId}/folders
 * Returns all non-deleted folders in a collection (flat list).
 * @param {string} collectionId
 */
export const fetchFolders = (collectionId) =>
  apiClient.get(`${COLLECTIONS_BASE}/${collectionId}/folders`);

/**
 * POST /api/v1/collections/{collectionId}/folders
 * Creates a new folder inside a collection.
 * @param {string} collectionId
 * @param {{ name: string, description?: string, parentFolderId?: string, orderIndex?: number }} data
 */
export const createFolder = (collectionId, data) =>
  apiClient.post(`${COLLECTIONS_BASE}/${collectionId}/folders`, data);

/**
 * PUT /api/v1/collections/folders/{folderId}
 * Updates a folder's name/description/parentFolderId/orderIndex.
 * @param {string} id
 * @param {{ name?: string, description?: string, parentFolderId?: string, orderIndex?: number }} data
 */
export const updateFolder = (id, data) =>
  apiClient.put(`${COLLECTIONS_BASE}/folders/${id}`, data);

/**
 * DELETE /api/v1/collections/folders/{folderId}
 * Soft-deletes a folder and all its descendants recursively.
 * @param {string} id
 */
export const deleteFolder = (id) =>
  apiClient.delete(`${COLLECTIONS_BASE}/folders/${id}`);
