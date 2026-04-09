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
  protocol: req.protocol || 'HTTP',   // <-- ADD
  mcpType: req.mcpType || 'sse',
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
  savedResponses: req.saved_responses || [],
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

export const fetchHistoryEntry = (historyId) =>
  requestApi.get(`${BASE}/history/${historyId}`);

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

/**
 * Execute a request with real‑time trace streaming (SSE)
 * @param {string} requestId - UUID of the request to execute
 * @param {Object} overrides - same as executeRequest overrides (optional)
 * @param {Function} onStep - callback for each trace step event
 * @param {Function} onResult - callback for final ExecutionResult
 * @param {Function} onError - callback for any error
 * @returns {EventSource} the EventSource instance (call .close() to stop)
 */
export const executeRequestStream = (requestId, overrides, onStep, onResult, onError) => {
  // If overrides has an 'overrides' property, unwrap it (for compatibility)
  const payload = overrides?.overrides ? overrides.overrides : overrides;
  const params = new URLSearchParams();
  if (payload) {
    params.append('overrides', JSON.stringify({ overrides: payload }));
  }
  const baseURL = requestApi.defaults?.baseURL || '';
  const url = `${baseURL}/api/v1/requests/${requestId}/execute-stream?${params.toString()}`;
  
  const eventSource = new EventSource(url, { withCredentials: true });
  
  eventSource.addEventListener('step', (event) => {
    try {
      const step = JSON.parse(event.data);
      onStep?.(step);
    } catch (e) {
      console.error('Failed to parse step event', e);
    }
  });
  
  eventSource.addEventListener('result', (event) => {
    try {
      const result = JSON.parse(event.data);
      onResult?.(result);
      eventSource.close();
    } catch (e) {
      console.error('Failed to parse result event', e);
      onError?.(e);
    }
  });
  
  eventSource.onerror = (err) => {
    console.error('SSE error', err);
    onError?.(err);
    eventSource.close();
  };
  
  return eventSource;
};

/**
 * POST /api/v1/requests/{id}/saved-responses
 * Save an execution result as a saved response for the request
 * @param {string} requestId - UUID of the request
 * @param {string} historyId - UUID of the execution history entry
 * @param {string} name - optional custom name (auto-generated if not provided)
 */
export const saveResponseFromHistory = (requestId, historyId, name) =>
  requestApi.post(`${BASE}/${requestId}/saved-responses`, {
    history_id: historyId,
    name: name || undefined,
  });

  /**
 * PATCH /api/v1/requests/{id}/saved-responses/{responseId}
 * Update the name of a saved response
 * @param {string} requestId - UUID of the parent request
 * @param {string} responseId - UUID of the saved response
 * @param {string} name - new name
 */
export const updateSavedResponseName = (requestId, responseId, name) =>
  requestApi.patch(`${BASE}/${requestId}/saved-responses/${responseId}`, { name });

/**
 * DELETE /api/v1/requests/{id}/saved-responses/{responseId}
 * Delete a saved response by ID
 * @param {string} requestId - UUID of the parent request
 * @param {string} responseId - UUID of the saved response
 */
export const deleteSavedResponse = (requestId, responseId) =>
  requestApi.delete(`${BASE}/${requestId}/saved-responses/${responseId}`);