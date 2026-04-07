import {collectionApi} from '../lib/apiClient';

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
   type: col.type || 'http', 
   nodeType: 'collection',
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
export const fetchCollections = (workspaceId, type = null) => {
  const params = { workspaceId };
  if (type) params.type = type;
  return collectionApi.get(COLLECTIONS_BASE, { params });
};

/**
 * POST /api/v1/collections?workspaceId=
 * Creates a new collection in the given workspace.
 * @param {string} workspaceId
 * @param {{ name: string, description?: string, version?: string, visibility?: string }} data
 */
export const createCollection = (workspaceId, data) =>
  collectionApi.post(COLLECTIONS_BASE, data, { params: { workspaceId } });

/**
 * PUT /api/v1/collections/{collectionId}
 * Updates name/description/version/visibility of a collection.
 * @param {string} id
 * @param {{ name?: string, description?: string, version?: string, visibility?: string }} data
 */
export const updateCollection = (id, data) =>
  collectionApi.put(`${COLLECTIONS_BASE}/${id}`, data);

/**
 * DELETE /api/v1/collections/{collectionId}
 * Soft-deletes a collection.
 * @param {string} id
 */
export const deleteCollection = (id) =>
  collectionApi.delete(`${COLLECTIONS_BASE}/${id}`);

/**
 * POST /api/v1/collections/{collectionId}/fork?targetWorkspaceId=
 * Creates a copy of the collection in the target workspace.
 * Works for both clone (same workspaceId) and fork (different workspaceId).
 * Backend handles " Copy" suffix for clone and " (Fork)" for fork.
 * Folders are also copied recursively by backend.
 *
 * @param {string} collectionId
 * @param {string} targetWorkspaceId
 */
export const forkCollection = (collectionId, targetWorkspaceId) =>
  collectionApi.post(
    `${COLLECTIONS_BASE}/${collectionId}/fork`,
    null,
    { params: { targetWorkspaceId } }
  );

// ─── Folders ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/collections/{collectionId}/folders
 * Returns all non-deleted folders in a collection (flat list).
 * @param {string} collectionId
 */
export const fetchFolders = (collectionId) =>
  collectionApi.get(`${COLLECTIONS_BASE}/${collectionId}/folders`);

/**
 * POST /api/v1/collections/{collectionId}/folders
 * Creates a new folder inside a collection.
 * @param {string} collectionId
 * @param {{ name: string, description?: string, parentFolderId?: string, orderIndex?: number }} data
 */
export const createFolder = (collectionId, data) =>
  collectionApi.post(`${COLLECTIONS_BASE}/${collectionId}/folders`, data);

/**
 * PUT /api/v1/collections/folders/{folderId}
 * Updates a folder's name/description/parentFolderId/orderIndex.
 * @param {string} id
 * @param {{ name?: string, description?: string, parentFolderId?: string, orderIndex?: number }} data
 */
export const updateFolder = (id, data) =>
  collectionApi.put(`${COLLECTIONS_BASE}/folders/${id}`, data);

/**
 * DELETE /api/v1/collections/folders/{folderId}
 * Soft-deletes a folder and all its descendants recursively.
 * @param {string} id
 */
export const deleteFolder = (id) =>
  collectionApi.delete(`${COLLECTIONS_BASE}/folders/${id}`);

/**
 * POST /api/v1/collections/folders/{folderId}/clone
 * Clones a folder and its contents in the same parent folder.
 * Name gets " Copy" suffix (or " Copy 2" etc. if duplicate).
 *
 * @param {string} folderId
 */
export const cloneFolder = (folderId) =>
  collectionApi.post(`${COLLECTIONS_BASE}/folders/${folderId}/clone`);

/**
 * POST /api/v1/collections/{collectionId}/run
 * Starts an asynchronous collection run.
 * @param {string} collectionId
 * @param {object} options - RunCollectionRequest (iterations, delayMs, etc.)
 * @returns {Promise<AxiosResponse<UUID>>} - run ID
 */
export const runCollection = (collectionId, options) =>
  collectionApi.post(`${COLLECTIONS_BASE}/${collectionId}/run`, options);

/**
 * GET /api/v1/collections/runs/{runId}
 * Retrieves the results of a completed run.
 * @param {string} runId
 * @returns {Promise<AxiosResponse<CollectionRun>>} - run data
 */
export const fetchRunResult = (runId) =>
  collectionApi.get(`${COLLECTIONS_BASE}/runs/${runId}`);

/**
 * GET /api/v1/collections/{collectionId}/runs
 * Lists all runs for a collection, newest first.
 * @param {string} collectionId
 * @returns {Promise<AxiosResponse<CollectionRun[]>>}
 */
export const listCollectionRuns = (collectionId) =>
  collectionApi.get(`${COLLECTIONS_BASE}/${collectionId}/runs`);

/**
 * POST /api/v1/collections/{collectionId}/loadtest
 * Start a load test on a collection.
 * @param {string} collectionId
 * @param {object} config - LoadTestConfig object
 * @returns {Promise<AxiosResponse<UUID>>} - load test ID
 */
export const startLoadTest = (collectionId, config) =>
  collectionApi.post(`${COLLECTIONS_BASE}/${collectionId}/loadtest`, config);

/**
 * GET /api/v1/collections/loadtests/{loadTestId}
 * Fetch a load test run by ID.
 * @param {string} loadTestId
 * @returns {Promise<AxiosResponse<LoadTestRun>>}
 */
export const fetchLoadTestRun = (loadTestId) =>
  collectionApi.get(`${COLLECTIONS_BASE}/loadtests/${loadTestId}`);

/**
 * POST /api/v1/collections/loadtests/{loadTestId}/stop
 * Request a running load test to stop.
 * @param {string} loadTestId
 */
export const stopLoadTest = (loadTestId) =>
  collectionApi.post(`${COLLECTIONS_BASE}/loadtests/${loadTestId}/stop`);

/**
 * GET /api/v1/collections/{collectionId}/loadtests
 * List all load test runs for a collection, newest first.
 * @param {string} collectionId
 * @returns {Promise<AxiosResponse<LoadTestRun[]>>}
 */
export const listCollectionLoadTests = (collectionId) =>
  collectionApi.get(`${COLLECTIONS_BASE}/${collectionId}/loadtests`);

/**
 * GET /api/v1/workspaces/{workspaceId}/loadtests
 * List all load test runs for a workspace, newest first.
 * @param {string} workspaceId
 * @returns {Promise<AxiosResponse<LoadTestRun[]>>}
 */
export const listWorkspaceLoadTests = (workspaceId) =>
  collectionApi.get(`${COLLECTIONS_BASE}/loadtests`, { params: { workspaceId } });

/**
 * GET /api/v1/collections/{collectionId}/export
 * Exports a collection as Postman JSON.
 * @param {string} collectionId
 * @returns {Promise<AxiosResponse<string>>} - the raw JSON string
 */
export const exportCollection = (collectionId) =>
  collectionApi.get(`${COLLECTIONS_BASE}/${collectionId}/export`, { responseType: 'text' });