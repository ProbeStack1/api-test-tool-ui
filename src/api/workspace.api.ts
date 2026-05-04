/**
 * Workspace raw HTTP layer — every call here is a 1:1 mapping of a Spring
 * Boot endpoint exposed by `workspace-mgmt-svc` (default port 8081).
 *
 *   page  →  services/workspace.service  →  THIS FILE  →  http://<workspace svc>
 *
 * Strict rules (per playbook):
 *   1. No URL string is hard-coded — base URL comes from `serviceUrl('workspace')`
 *      via the shared `createHttp('workspace')` factory in `lib/http.ts`.
 *   2. Every function returns the unwrapped Java `data` field
 *      (response interceptor in `lib/http.ts` already strips `ResponseEnvelope`).
 *   3. Pure HTTP. No normalisation, no fallback, no business logic — that
 *      lives in `services/workspace.service.ts`.
 */
import { createHttp } from '@/lib/http';

/* ------------------------------ types ------------------------------------ */
export type Visibility = 'PRIVATE' | 'TEAM' | 'PUBLIC';
export type MemberRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type InviteStatus =
  | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export interface PrincipalRef {
  email: string;
  name: string;
}

export interface WorkspaceDto {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string | null;
  workspaceEmail?: string | null;
  projectLead?: string | null;
  owner: PrincipalRef;
  createdBy: PrincipalRef;
  visibility: Visibility;
  settings: Record<string, unknown>;
  memberCount: number;
  collectionCount?: number;
  myRole: MemberRole | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MemberDto {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: MemberRole;
  invitedBy?: string;
  joinedAt: string;
  updatedAt: string;
}

export interface InvitationDto {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedEmail: string;
  invitedRole: MemberRole;
  invitedBy?: string;
  inviterEmail?: string;
  inviterName?: string;
  status: InviteStatus;
  invitedAt: string;
  expiresAt: string;
  resendCount: number;
  linkCopiedCount: number;
  acceptUrl: string;
}

export interface SlugSuggestion {
  slug: string;
  available: boolean;
}

export interface WorkspaceCreateBody {
  name: string;
  slug?: string;
  description?: string;
  workspaceEmail?: string;
  projectLead?: string;
  visibility?: Visibility;
  settings?: Record<string, unknown>;
}

export interface WorkspaceUpdateBody {
  name?: string;
  description?: string | null;
  workspaceEmail?: string | null;
  projectLead?: string | null;
  visibility?: Visibility;
  settings?: Record<string, unknown>;
}

/* ----------------------------- client ------------------------------------ */
const http = createHttp('workspace');
const BASE = '/api/v1/workspaces';

/* ============== workspaces (CRUD + soft-delete + restore) ================ */
export const apiListWorkspaces = () =>
  http.get<WorkspaceDto[]>(BASE).then((r) => r.data);

export const apiGetWorkspace = (id: string) =>
  http.get<WorkspaceDto>(`${BASE}/${id}`).then((r) => r.data);

export const apiCreateWorkspace = (body: WorkspaceCreateBody) =>
  http.post<WorkspaceDto>(BASE, body).then((r) => r.data);

export const apiUpdateWorkspace = (id: string, body: WorkspaceUpdateBody) =>
  http.put<WorkspaceDto>(`${BASE}/${id}`, body).then((r) => r.data);

export const apiDeleteWorkspace = (id: string) =>
  http.delete<void>(`${BASE}/${id}`).then((r) => r.data);

export const apiListTrash = () =>
  http.get<WorkspaceDto[]>(`${BASE}/trash`).then((r) => r.data);

export const apiRestoreWorkspace = (id: string) =>
  http.post<WorkspaceDto>(`${BASE}/${id}/restore`).then((r) => r.data);

export const apiSuggestSlug = (name: string) =>
  http
    .get<SlugSuggestion>(`${BASE}/slug/suggest`, { params: { name } })
    .then((r) => r.data);

/** Workspace-level transfer (newOwnerUserId from outside the members list). */
export const apiTransferWorkspaceOwnership = (
  id: string,
  newOwnerUserId: string,
  keepAsAdmin = true,
) =>
  http
    .post<WorkspaceDto>(`${BASE}/${id}/transfer-ownership`, {
      newOwnerUserId,
      keepAsAdmin,
    })
    .then((r) => r.data);

/* ============================ members ==================================== */
export const apiListMembers = (workspaceId: string) =>
  http.get<MemberDto[]>(`${BASE}/${workspaceId}/members`).then((r) => r.data);

export const apiUpdateMemberRole = (
  workspaceId: string,
  memberId: string,
  role: MemberRole,
) =>
  http
    .patch<MemberDto>(`${BASE}/${workspaceId}/members/${memberId}/role`, { role })
    .then((r) => r.data);

export const apiRemoveMember = (workspaceId: string, memberId: string) =>
  http
    .delete<void>(`${BASE}/${workspaceId}/members/${memberId}`)
    .then((r) => r.data);

/** Member-level transfer (memberId comes from the members list). */
export const apiTransferMemberOwnership = (
  workspaceId: string,
  memberId: string,
) =>
  http
    .post<void>(`${BASE}/${workspaceId}/members/${memberId}/transfer-ownership`)
    .then((r) => r.data);

/* ========================== invitations ================================== */
export const apiListInvitations = (
  workspaceId: string,
  status?: InviteStatus,
) =>
  http
    .get<InvitationDto[]>(`${BASE}/${workspaceId}/invitations`, {
      params: status ? { status } : {},
    })
    .then((r) => r.data);

export const apiInvite = (
  workspaceId: string,
  email: string,
  role: MemberRole,
) =>
  http
    .post<InvitationDto>(`${BASE}/${workspaceId}/invitations`, { email, role })
    .then((r) => r.data);

export const apiResendInvitation = (workspaceId: string, invitationId: string) =>
  http
    .post<InvitationDto>(
      `${BASE}/${workspaceId}/invitations/${invitationId}/resend`,
    )
    .then((r) => r.data);

export const apiRevokeInvitation = (workspaceId: string, invitationId: string) =>
  http
    .post<InvitationDto>(
      `${BASE}/${workspaceId}/invitations/${invitationId}/revoke`,
    )
    .then((r) => r.data);

export const apiTrackLinkCopied = (
  workspaceId: string,
  invitationId: string,
) =>
  http
    .post<InvitationDto>(
      `${BASE}/${workspaceId}/invitations/${invitationId}/link-copied`,
    )
    .then((r) => r.data);

export const apiPeekInvitation = (token: string) =>
  http
    .get<InvitationDto>(`${BASE}/invitations/peek/${token}`)
    .then((r) => r.data);

export const apiAcceptInvitation = (token: string) =>
  http
    .post<InvitationDto>(`${BASE}/invitations/accept`, { token })
    .then((r) => r.data);

export const apiRejectInvitation = (token: string) =>
  http
    .post<InvitationDto>(`${BASE}/invitations/reject`, { token })
    .then((r) => r.data);
