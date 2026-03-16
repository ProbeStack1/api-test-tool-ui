import { requestApi } from '../lib/apiClient';

const BASE = '/api/v1/requests';

/**
 * Normalize backend request response to frontend shape
 * Adds missing type and ensures consistent field names
 */
export const normalizeRequest = (req) => ({
  id: req.request_id,
  type: 'request',                    // ← Yeh sabse important line add karo
  name: req.name || 'Untitled Request',
  method: req.method || 'GET',
  path: req.url || '',                // backend url → frontend path
  url: req.url || '',                 // dono rakho agar kahin use ho raha ho
  collectionId: req.collection_id,
  folderId: req.folder_id || null,
  description: req.description || '',
  headers: req.headers || [],
  queryParams: req.query_params || [],
  pathVariables: req.path_variables || [],
  bodyType: req.body_type || 'none',
  bodyMode: req.body_mode || null,
  body: req.body_content || '',      
  authData: req.auth_config || {},       
  tests: req.test_script || '', 
  formData: req.form_data || [],
  authType: req.auth_type || 'none',
//   authConfig: req.auth_config || null,
  preRequestScript: req.pre_request_script || null,
  testScript: req.test_script || null,
  orderIndex: req.order_index ?? 0,
  createdBy: req.created_by,
  createdAt: req.created_at,
  updatedAt: req.updated_at,

});

/**
 * POST /api/v1/requests
 * Create a new request
 */
export const createRequest = (data) =>
  requestApi.post(BASE, data);

/**
 * GET /api/v1/requests?collectionId={id}&limit=...&offset=...&name=...
 * Fetch all requests in a collection (with optional pagination & name filter)
 */
export const fetchRequests = (params = {}) => {
  const { collectionId, limit = 1000, offset = 0, name = '' } = params;

  if (!collectionId) {
    throw new Error('collectionId is required to fetch requests');
  }

  const query = new URLSearchParams({
    collectionId,
    limit: String(limit),
    offset: String(offset),
  });

  if (name?.trim()) {
    query.append('name', name.trim());
  }

  const url = `${BASE}?${query.toString()}`;
  return requestApi.get(url);
};

/**
 * GET /api/v1/requests/{id}
 * Get a single request by ID
 */
export const fetchRequestByID = (id) =>
  requestApi.get(`${BASE}/${id}`);

/**
 * GET /api/v1/requests/history
 * Fetch global execution history for the authenticated user
 */
export const fetchGlobalHistory = (params = {}) => {
  const query = new URLSearchParams({
    limit: params.limit || 50,
    offset: params.offset || 0,
    ...(params.fromDate && { fromDate: params.fromDate }),
    ...(params.toDate && { toDate: params.toDate }),
    ...(params.method && { method: params.method }),
    ...(params.statusCode && { statusCode: params.statusCode })
  });
  const url = `${BASE}/history?${query}`;
  return requestApi.get(url);
};

/**
 * PATCH /api/v1/requests/{id}
 * Update a request
 */
export const updateRequest = (id, data) =>
  requestApi.patch(`${BASE}/${id}`, data);

/**
 * DELETE /api/v1/requests/{id}
 * Soft delete request
 */
export const deleteRequest = (id) =>
  requestApi.delete(`${BASE}/${id}`);

/**
 * POST /api/v1/requests/{id}/clone
 * Clone an existing request (creates a copy in same collection/folder)
 */
export const cloneRequest = (id) =>
  requestApi.post(`${BASE}/${id}/clone`);

/**
 * PATCH /api/v1/requests/{id}/move
 * Move a request to a different collection/folder (drag & drop)
 * @param {Object} moveData - { targetCollectionId, targetFolderId (optional), newOrderIndex (optional) }
 */
export const moveRequest = (id, moveData) =>
  requestApi.patch(`${BASE}/${id}/move`, moveData);

/**
 * POST /api/v1/requests/{id}/execute
 * Execute request
 */
export const executeRequest = (id, data) =>
  requestApi.post(`${BASE}/${id}/execute`, data);

/**
 * POST /requests/execute?collectionId={collectionId}
 * Execute all requests in a collection
 */
export const executeCollection = (collectionId) =>
  requestApi.post(`${BASE}/execute?collectionId=${collectionId}`);

/**
 * GET /api/v1/requests/{id}/history
 * Get execution history
 */
export const fetchRequestHistory = (id) =>
  requestApi.get(`${BASE}/${id}/history`);

/**
 * DELETE /api/v1/requests/{id}/history
 * Delete all execution history
 */
export const deleteAllHistory = (id) =>
  requestApi.delete(`${BASE}/${id}/history`);

/**
 * DELETE /api/v1/requests/{requestId}/history/{historyId}
 * Delete single history entry
 */
export const deleteHistoryItem = (requestId, historyId) =>
  requestApi.delete(`${BASE}/${requestId}/history/${historyId}`);

/**
 * POST /api/v1/requests/{requestId}/examples
 * Create example
 */
export const createExample = (requestId, data) =>
  requestApi.post(`${BASE}/${requestId}/examples`, data);

/**
 * GET /api/v1/requests/{requestId}/examples
 * List examples
 */
export const fetchExamples = (requestId) =>
  requestApi.get(`${BASE}/${requestId}/examples`);

/**
 * GET /api/v1/requests/{requestId}/examples/{exampleId}
 * Get example
 */
export const fetchExample = (requestId, exampleId) =>
  requestApi.get(`${BASE}/${requestId}/examples/${exampleId}`);

/**
 * PATCH /api/v1/requests/{requestId}/examples/{exampleId}
 * Update example
 */
export const updateExample = (requestId, exampleId, data) =>
  requestApi.patch(`${BASE}/${requestId}/examples/${exampleId}`, data);

/**
 * DELETE /api/v1/requests/{requestId}/examples/{exampleId}
 * Delete example
 */
export const deleteExample = (requestId, exampleId) =>
  requestApi.delete(`${BASE}/${requestId}/examples/${exampleId}`);