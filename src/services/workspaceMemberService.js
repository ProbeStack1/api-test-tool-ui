import { workspaceApi } from '../lib/apiClient';

const BASE = (workspaceId) => `/api/v1/workspaces/${workspaceId}/members`;

/**
 * GET /workspaces/{workspaceId}/members – list all members
 */
export const fetchWorkspaceMembers = (workspaceId) => workspaceApi.get(BASE(workspaceId));

/**
 * POST /workspaces/{workspaceId}/members – add a new member
 * @param {string} workspaceId
 * @param {{ email: string, role: string }} data
 */
export const addWorkspaceMember = (workspaceId, data) => workspaceApi.post(BASE(workspaceId), data);

/**
 * PUT /workspaces/{workspaceId}/members/{memberId} – update member role
 * @param {string} workspaceId
 * @param {string} memberId
 * @param {{ role: string }} data
 */
export const updateWorkspaceMemberRole = (workspaceId, memberId, data) =>
  workspaceApi.put(`${BASE(workspaceId)}/${memberId}`, data);

/**
 * DELETE /workspaces/{workspaceId}/members/{memberId} – remove a member
 */
export const removeWorkspaceMember = (workspaceId, memberId) =>
  workspaceApi.delete(`${BASE(workspaceId)}/${memberId}`);