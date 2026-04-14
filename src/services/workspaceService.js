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
  workspaceEmail: ws.workspaceEmail,
  organizationId: ws.organizationId,
  projectSme: ws.projectSme,
});

/** GET /api/v1/workspaces — list all workspaces the current user belongs to. */
export const fetchWorkspaces = () => workspaceApi.get(BASE);

/**
 * POST /api/v1/workspaces — create a new workspace.
 * @param {{ name: string, description?: string, visibility?: string, workspaceType?: string, workspaceEmail?: string, organizationId?: string, projectSme?: string }} data
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

/**
 * Create an invitation link for a user by email.
 * @param {string} workspaceId
 * @param {{ email: string, role: string }} data
 */
export const createInvitation = async (workspaceId, data) => {
  const response = await workspaceApi.post(`${BASE}/${workspaceId}/invitations`, data);
  return response.data; // { invitationId, invitationLink, expiresAt }
};

/**
 * Accept an invitation using token.
 * @param {string} token
 */
export const acceptInvitation = async (token) => {
  const response = await workspaceApi.post(`${BASE}/invitations/${token}/accept`);
  return response.data;
};

/**
 * Reject an invitation using token.
 * @param {string} token
 */
export const rejectInvitation = async (token) => {
  const response = await workspaceApi.post(`${BASE}/invitations/${token}/reject`);
  return response.data;
};