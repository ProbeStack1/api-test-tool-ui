/**
 * Workspace service — UI-facing layer.
 *
 *   page  →  THIS FILE  →  api/workspace.api  →  http://<workspace svc>
 *
 * Responsibilities
 *   1. Re-export the type vocabulary used by pages/components.
 *   2. Normalise the raw Java response (dates, null-safety, derived fields).
 *   3. Provide a clearly-labelled `__dummy` fallback for offline UI dev.
 *      It is OFF by default and only kicks in when:
 *        - VITE_WORKSPACE_USE_DUMMY=true, OR
 *        - the live call rejects with a network-level error AND
 *          VITE_WORKSPACE_DUMMY_ON_ERROR=true.
 *      Live integration NEVER uses dummy data.
 *   4. Keep the public function signatures stable so existing pages don't
 *      need to change when we refactor the wire layer.
 */
import {
  apiAcceptInvitation,
  apiCreateWorkspace,
  apiDeleteWorkspace,
  apiGetWorkspace,
  apiInvite,
  apiListInvitations,
  apiListMembers,
  apiListTrash,
  apiListWorkspaces,
  apiPeekInvitation,
  apiRejectInvitation,
  apiRemoveMember,
  apiResendInvitation,
  apiRestoreWorkspace,
  apiRevokeInvitation,
  apiSuggestSlug,
  apiTrackLinkCopied,
  apiTransferMemberOwnership,
  apiTransferWorkspaceOwnership,
  apiUpdateMemberRole,
  apiUpdateWorkspace,
  type InvitationDto,
  type InviteStatus,
  type MemberDto,
  type MemberRole,
  type SlugSuggestion,
  type Visibility,
  type WorkspaceCreateBody,
  type WorkspaceDto,
  type WorkspaceUpdateBody,
} from '@/api/workspace.api';

/* ───────── re-exported vocabulary ──────────────────────────────────────── */
export type { Visibility, MemberRole, InviteStatus };
export type Workspace = WorkspaceDto;
export type Member = MemberDto;
export type Invitation = InvitationDto;

/* ───────── normalisers ────────────────────────────────────────────────── */
const normWorkspace = (w: WorkspaceDto): Workspace => ({
  ...w,
  description: w.description ?? null,
  workspaceEmail: w.workspaceEmail ?? null,
  projectLead: w.projectLead ?? null,
  collectionCount: w.collectionCount ?? 0,
  myRole: w.myRole ?? null,
  settings: w.settings ?? {},
});
const normMember = (m: MemberDto): Member => m;
const normInvitation = (i: InvitationDto): Invitation => ({
  ...i,
  resendCount: i.resendCount ?? 0,
  linkCopiedCount: i.linkCopiedCount ?? 0,
});

/* ───────── dummy fallback (UI-only, never used in live integration) ───── */
const DUMMY_FLAG = '__dummy';
const useDummy = (): boolean =>
  import.meta.env.VITE_WORKSPACE_USE_DUMMY === 'true';
const dummyOnError = (): boolean =>
  import.meta.env.VITE_WORKSPACE_DUMMY_ON_ERROR === 'true';

const DUMMY_WS: Workspace = {
  id: DUMMY_FLAG,
  orgId: DUMMY_FLAG,
  name: '[dummy] offline workspace',
  slug: 'dummy',
  description: 'JVM unreachable — UI is rendering local placeholder data.',
  workspaceEmail: null,
  projectLead: null,
  owner: { email: 'dummy@local', name: 'Offline' },
  createdBy: { email: 'dummy@local', name: 'Offline' },
  visibility: 'PRIVATE',
  settings: {},
  memberCount: 0,
  collectionCount: 0,
  myRole: 'OWNER',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  deletedAt: null,
};

const isNetworkError = (e: unknown): boolean => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || status === undefined;
};

/** Run `live`, fall back to `dummy` only when env flags allow. */
const withFallback = async <T>(
  live: () => Promise<T>,
  dummy: () => T,
): Promise<T> => {
  if (useDummy()) return dummy();
  try {
    return await live();
  } catch (e) {
    if (dummyOnError() && isNetworkError(e)) return dummy();
    throw e;
  }
};

/* ───────── workspaces ─────────────────────────────────────────────────── */
export const listWorkspaces = (): Promise<Workspace[]> =>
  withFallback(
    () => apiListWorkspaces().then((rows) => rows.map(normWorkspace)),
    () => [DUMMY_WS],
  );

export const getWorkspace = (id: string): Promise<Workspace> =>
  apiGetWorkspace(id).then(normWorkspace);

export const createWorkspace = (
  body: Partial<Workspace> & { name: string },
): Promise<Workspace> => {
  const payload: WorkspaceCreateBody = {
    name: body.name,
    slug: body.slug,
    description: body.description ?? undefined,
    workspaceEmail: body.workspaceEmail ?? undefined,
    projectLead: body.projectLead ?? undefined,
    visibility: body.visibility,
    settings: body.settings,
  };
  return apiCreateWorkspace(payload).then(normWorkspace);
};

export const updateWorkspace = (
  id: string,
  body: Partial<Workspace>,
): Promise<Workspace> => {
  const payload: WorkspaceUpdateBody = {
    name: body.name,
    description: body.description,
    workspaceEmail: body.workspaceEmail,
    projectLead: body.projectLead,
    visibility: body.visibility,
    settings: body.settings,
  };
  return apiUpdateWorkspace(id, payload).then(normWorkspace);
};

export const deleteWorkspace = (id: string): Promise<void> =>
  apiDeleteWorkspace(id);

export const restoreWorkspace = (id: string): Promise<Workspace> =>
  apiRestoreWorkspace(id).then(normWorkspace);

export const listTrash = (): Promise<Workspace[]> =>
  withFallback(
    () => apiListTrash().then((rows) => rows.map(normWorkspace)),
    () => [],
  );

export const suggestSlug = (name: string): Promise<SlugSuggestion> =>
  apiSuggestSlug(name);

export const transferWorkspaceOwnership = (
  id: string,
  newOwnerUserId: string,
  keepAsAdmin = true,
): Promise<Workspace> =>
  apiTransferWorkspaceOwnership(id, newOwnerUserId, keepAsAdmin).then(
    normWorkspace,
  );

/* ───────── members ────────────────────────────────────────────────────── */
export const listMembers = (workspaceId: string): Promise<Member[]> =>
  withFallback(
    () => apiListMembers(workspaceId).then((rows) => rows.map(normMember)),
    () => [],
  );

export const updateMemberRole = (
  workspaceId: string,
  memberId: string,
  role: MemberRole,
): Promise<Member> =>
  apiUpdateMemberRole(workspaceId, memberId, role).then(normMember);

export const removeMember = (
  workspaceId: string,
  memberId: string,
): Promise<void> => apiRemoveMember(workspaceId, memberId);

/** Member-level ownership transfer — used by the members table action. */
export const transferOwnership = (
  workspaceId: string,
  memberId: string,
): Promise<void> => apiTransferMemberOwnership(workspaceId, memberId);

/* ───────── invitations ────────────────────────────────────────────────── */
export const listInvitations = (
  workspaceId: string,
  status?: InviteStatus,
): Promise<Invitation[]> =>
  withFallback(
    () =>
      apiListInvitations(workspaceId, status).then((rows) =>
        rows.map(normInvitation),
      ),
    () => [],
  );

export const invite = (
  workspaceId: string,
  email: string,
  role: MemberRole,
): Promise<Invitation> =>
  apiInvite(workspaceId, email, role).then(normInvitation);

export const resendInvitation = (
  workspaceId: string,
  invitationId: string,
): Promise<Invitation> =>
  apiResendInvitation(workspaceId, invitationId).then(normInvitation);

export const revokeInvitation = (
  workspaceId: string,
  invitationId: string,
): Promise<Invitation> =>
  apiRevokeInvitation(workspaceId, invitationId).then(normInvitation);

export const trackLinkCopied = (
  workspaceId: string,
  invitationId: string,
): Promise<Invitation> =>
  apiTrackLinkCopied(workspaceId, invitationId).then(normInvitation);

export const peekInvitation = (token: string): Promise<Invitation> =>
  apiPeekInvitation(token).then(normInvitation);

export const acceptInvitation = (token: string): Promise<Invitation> =>
  apiAcceptInvitation(token).then(normInvitation);

export const rejectInvitation = (token: string): Promise<Invitation> =>
  apiRejectInvitation(token).then(normInvitation);
