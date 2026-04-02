import { mockserverApi } from '../lib/apiClient';

const BASE = '/api/v1/mocks';

// ----------------------------------------------------------------------
// Mock Server Management
// ----------------------------------------------------------------------

/**
 * POST /api/v1/mocks/mock-server?workspaceId={workspaceId}
 * Create a new mock server
 * @param {string} workspaceId - ID of the workspace to create the mock in
 * @param {Object} data - Mock server configuration (name, description, etc.)
 */
export const createMockServer = (workspaceId, data) => {
  const query = new URLSearchParams({ workspaceId }).toString();
  return mockserverApi.post(`${BASE}/mock-server?${query}`, data);
};

/**
 * GET /api/v1/mocks/mock-server
 * Get all mock servers accessible to the user (optionally filtered by workspace)
 * @param {Object} params - Query parameters (e.g., workspaceId, limit, offset, search)
 */
export const getAllMockServers = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${BASE}/mock-server?${query}` : `${BASE}/mock-server`;
  return mockserverApi.get(url);
};

/**
 * GET /api/v1/mocks/mock-server/{mockServerId}
 * Get a single mock server by its ID
 */
export const getMockServerById = (mockServerId) =>
  mockserverApi.get(`${BASE}/mock-server/${mockServerId}`);

/**
 * PATCH /api/v1/mocks/mock-server/{mockServerId}
 * Update a mock server's metadata (name, description, etc.)
 */
export const updateMockServer = (mockServerId, data) =>
  mockserverApi.patch(`${BASE}/mock-server/${mockServerId}`, data);

/**
 * PATCH /api/v1/mocks/mock-server/{mockServerId}/toggle
 * Toggle the mock server's visibility (Private/Public)
 */
export const toggleMockServer = (mockServerId) =>
  mockserverApi.patch(`${BASE}/mock-server/${mockServerId}/toggle`);

/**
 * DELETE /api/v1/mocks/mock-server/{mockServerId}
 * Delete a mock server (and all its endpoints)
 */
export const deleteMockServer = (mockServerId) =>
  mockserverApi.delete(`${BASE}/mock-server/${mockServerId}`);

/**
 * POST /api/v1/mocks/mock-server/{mockServerId}/run
 * Execute all endpoints of a mock server and return aggregated results
 */
export const runMockServer = (mockServerId) =>
  mockserverApi.post(`${BASE}/mock-server/${mockServerId}/run`);


// ----------------------------------------------------------------------
// Endpoint Management inside a Mock Server
// ----------------------------------------------------------------------

/**
 * POST /api/v1/mocks/{mockServerId}/endpoints
 * Create a new endpoint inside a mock server
 */
export const createEndpoint = (mockServerId, data) =>
  mockserverApi.post(`${BASE}/${mockServerId}/endpoints`, data);

/**
 * GET /api/v1/mocks/{mockServerId}/endpoints
 * Get all endpoints of a specific mock server (with optional filtering/pagination)
 */
export const getEndpoints = (mockServerId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${BASE}/${mockServerId}/endpoints?${query}`
    : `${BASE}/${mockServerId}/endpoints`;
  return mockserverApi.get(url);
};

/**
 * GET /api/v1/mocks/endpoints/{endpointId}
 * Get a single endpoint by its ID
 */
export const getEndpointById = (endpointId) =>
  mockserverApi.get(`${BASE}/endpoints/${endpointId}`);

/**
 * PATCH /api/v1/mocks/endpoints/{endpointId}
 * Update an endpoint (method, path, response, etc.)
 */
export const updateEndpoint = (endpointId, data) =>
  mockserverApi.patch(`${BASE}/endpoints/${endpointId}`, data);

/**
 * PATCH /api/v1/mocks/endpoints/{endpointId}/toggle
 * Enable or disable an endpoint
 */
export const toggleEndpoint = (endpointId) =>
  mockserverApi.patch(`${BASE}/endpoints/${endpointId}/toggle`);

/**
 * DELETE /api/v1/mocks/endpoints/{endpointId}
 * Delete an endpoint
 */
export const deleteEndpoint = (endpointId) =>
  mockserverApi.delete(`${BASE}/endpoints/${endpointId}`);

// ----------------------------------------------------------------------
// Execute Requests against a Live Mock Endpoint
// ----------------------------------------------------------------------

/**
 * Execute an HTTP request against a mock server endpoint.
 * 
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {string} fullUrl - The full URL including the mock base and path
 * @param {Object} [data] - Request body (for POST, PUT, PATCH)
 * @param {Object} [headers] - Optional headers to send
 */
const executeMockRequest = (method, fullUrl, data = null, headers = {}) => {
  const config = { headers };
  switch (method.toUpperCase()) {
    case 'GET':
      return mockserverApi.get(fullUrl, config);
    case 'POST':
      return mockserverApi.post(fullUrl, data, config);
    case 'PUT':
      return mockserverApi.put(fullUrl, data, config);
    case 'DELETE':
      return mockserverApi.delete(fullUrl, config);
    case 'PATCH':
      return mockserverApi.patch(fullUrl, data, config);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
};









/**
 * POST /api/v1/mocks/{mockUrl}/{path}
 * Execute a POST request on a mock endpoint
 */
export const executePostOnMock = (fullUrl, data, headers) =>
  executeMockRequest('POST', fullUrl, data, headers);

/**
 * GET /api/v1/mocks/{mockUrl}/{path}
 * Execute a GET request on a mock endpoint
 */
export const executeGetOnMock = (fullUrl, headers) =>
  executeMockRequest('GET', fullUrl, null, headers);
/**
 * PUT /api/v1/mocks/{mockUrl}/{path}
 * Execute a PUT request on a mock endpoint
 */
export const executePutOnMock = (fullUrl, data, headers) =>
  executeMockRequest('PUT', fullUrl, data, headers);

/**
 * DELETE /api/v1/mocks/{mockUrl}/{path}
 * Execute a DELETE request on a mock endpoint
 */

export const executeDeleteOnMock = (fullUrl, headers) =>
  executeMockRequest('DELETE', fullUrl, null, headers);

/**
 * PATCH /api/v1/mocks/{mockUrl}/{path}
 * Execute a PATCH request on a mock endpoint
 */
export const executePatchOnMock = (fullUrl, data, headers) =>
  executeMockRequest('PATCH', fullUrl, data, headers);


/**
 * GET /api/v1/mocks/executions/latest?requestId={requestId}
 * Fetch latest execution result for a request
 */
export const getLatestExecution = (requestId) =>
  mockserverApi.get(`${BASE}/executions/latest`, {
    params: { requestId }
  });

  /**
 * GET /api/v1/mocks/endpoints/{endpointId}/logs
 * Fetch execution history for a specific mock endpoint
 * @param {string} endpointId - UUID of the mock endpoint
 * @param {number} limit - Max results (default 50)
 * @param {number} offset - Pagination offset
 */
export const getMockEndpointHistory = (endpointId, limit = 500, offset = 0) => {
  const query = new URLSearchParams({ limit, offset }).toString();
  return mockserverApi.get(`${BASE}/endpoints/${endpointId}/logs?${query}`);
};