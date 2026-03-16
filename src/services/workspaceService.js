import {workspaceApi} from '../lib/apiClient';

const BASE = '/api/v1/workspaces';

/**
 * Normalizes the backend WorkspaceResponse to the UI workspace shape.
 * Backend: { id, name, description, visibility, workspaceType, ownerId, ... }
 * UI:      { id, name, description, visibility }
 */
export const normalizeWorkspace = (ws) => ({
  id: ws.id,
  name: ws.name,
  description: ws.description || '',
  workspaceType: ws.workspaceType || 'personal',
  visibility: ws.visibility || 'private',
  createdAt: ws.createdAt,
  updatedAt: ws.updatedAt,
  createdBy: ws.createdBy,
});

/** GET /api/v1/workspaces — list all workspaces the current user belongs to. */
export const fetchWorkspaces = () => workspaceApi.get(BASE);

/**
 * POST /api/v1/workspaces — create a new workspace.
 * @param {{ name: string, description?: string, visibility?: string, workspaceType?: string }} data
 */
export const createWorkspace = (data) => workspaceApi.post(BASE, data);

/**
 * PUT /api/v1/workspaces/{workspaceId} — update workspace name/description/visibility.
 * @param {string} id
 * @param {{ name?: string, description?: string, visibility?: string, workspaceType?: string }} data
 */
export const updateWorkspace = (id, data) => workspaceApi.put(`${BASE}/${id}`, data);

/**
 * DELETE /api/v1/workspaces/{workspaceId} — soft-delete a workspace (owner only).
 * @param {string} id
 */
export const deleteWorkspace = (id) => workspaceApi.delete(`${BASE}/${id}`);
