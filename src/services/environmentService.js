import { environmentApi } from '../lib/apiClient';

const BASE = '/api/v1/environments';

/**
 * Normalize backend environment response to frontend shape
 * Converts snake_case to camelCase and adds sensible defaults
 */
export const normalizeEnvironment = (env) => ({
  id: env.environment_id,
  name: env.name || '',
  description: env.description || '',
  workspaceId: env.workspace_id,
  collectionId: env.collection_id,            // may be null for global environments
  environmentType: env.environment_type,      // e.g., "collection" or "global"
  isActive: env.is_active ?? false,
  variables: env.variables || [],             // array of variable objects
  createdBy: env.created_by,
  createdAt: env.created_at,
  updatedAt: env.updated_at,
  // Optionally keep raw fields if needed
  // raw: env
});

/**
 * POST /api/v1/environments?workspaceId={workspaceId}
 * Create a new environment
 * @param {UUID} workspaceId - ID of the workspace where the environment will be created
 * @param {Object} data - environment data (name, description, variables, etc.)
 * @returns {Promise<Object>} - the created environment object
 */
export const createEnvironment = (workspaceId, data) => {
  const query = new URLSearchParams({ workspaceId });
  const url = `${BASE}?${query.toString()}`;
  return environmentApi.post(url, data);
};

/**
 * GET /api/v1/environments
 * List all environments accessible to the user.
 * - If workspaceId is provided, returns environments in that workspace.
 * - If workspaceId is omitted, returns global environments.
 * @param {Object} params - { workspaceId (optional), limit (default 20), offset (default 0) }
 * @returns {Promise<Array>} - array of environment objects
 */
export const listEnvironments = (params = {}) => {
  const { workspaceId, limit = 20, offset = 0 } = params;
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (workspaceId) {
    query.append('workspaceId', workspaceId);
  }
  const url = `${BASE}?${query.toString()}`;
  return environmentApi.get(url);
};

/**
 * GET /api/v1/environments/{environmentId}
 * Fetch a single environment by ID
 * @param {UUID} environmentId
 * @returns {Promise<Object>} - environment object
 */
export const getEnvironmentById = (environmentId) =>
  environmentApi.get(`${BASE}/${environmentId}`);

/**
 * PATCH /api/v1/environments/{environmentId}
 * Partially update an environment (e.g., name, description, variables)
 * @param {UUID} environmentId
 * @param {Object} data - fields to update
 * @returns {Promise<Object>} - updated environment object
 */
export const updateEnvironment = (environmentId, data) =>
  environmentApi.patch(`${BASE}/${environmentId}`, data);

/**
 * DELETE /api/v1/environments/{environmentId}
 * Soft delete an environment
 * @param {UUID} environmentId
 * @returns {Promise<void>}
 */
export const deleteEnvironment = (environmentId) =>
  environmentApi.delete(`${BASE}/${environmentId}`);

/**
 * POST /api/v1/environments/{environmentId}/activate
 * Activate the specified environment (deactivates others in the same workspace)
 * @param {UUID} environmentId
 * @returns {Promise<void>}
 */
export const activateEnvironment = (environmentId) =>
  environmentApi.post(`${BASE}/${environmentId}/activate`);

/**
 * POST /api/v1/environments/{environmentId}/deactivate
 * Deactivate the specified environment
 * @param {UUID} environmentId
 * @returns {Promise<void>}
 */
export const deactivateEnvironment = (environmentId) =>
  environmentApi.post(`${BASE}/${environmentId}/deactivate`);