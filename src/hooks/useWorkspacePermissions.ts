/**
 * useWorkspacePermissions — read the caller's role + permission set for a
 * workspace, then expose two helpers:
 *
 *   const { role, can, ready } = useWorkspacePermissions(workspaceId);
 *   if (can('COLLECTION_DELETE')) { … }
 *
 * Powered by `GET /api/v1/workspaces/{workspaceId}/members/me` which returns
 * the canonical permission list defined by the backend `PermissionMatrix`.
 * Result is cached in-store keyed by workspaceId — re-renders only on
 * actual role change.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/stores/auth.store';
import { serviceUrl } from '@/lib/env';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | null;

export type WorkspacePermission =
  | 'WORKSPACE_VIEW' | 'WORKSPACE_EDIT' | 'WORKSPACE_DELETE' | 'WORKSPACE_INVITE'
  | 'MEMBER_VIEW' | 'MEMBER_INVITE' | 'MEMBER_REMOVE' | 'MEMBER_ROLE_CHANGE'
  | 'COLLECTION_VIEW' | 'COLLECTION_CREATE' | 'COLLECTION_EDIT' | 'COLLECTION_DELETE'
  | 'REQUEST_VIEW' | 'REQUEST_CREATE' | 'REQUEST_EDIT' | 'REQUEST_DELETE' | 'REQUEST_EXECUTE'
  | 'ENVIRONMENT_VIEW' | 'ENVIRONMENT_CREATE' | 'ENVIRONMENT_EDIT' | 'ENVIRONMENT_DELETE' | 'ENVIRONMENT_SECRET_REVEAL'
  | 'TEST_VIEW' | 'TEST_CREATE' | 'TEST_EDIT' | 'TEST_DELETE' | 'TEST_EXECUTE'
  | 'MOCK_VIEW' | 'MOCK_CREATE' | 'MOCK_EDIT' | 'MOCK_DELETE' | 'MOCK_DEPLOY'
  | 'AI_USE' | 'AI_CONFIG_EDIT'
  | 'INTEGRATION_VIEW' | 'INTEGRATION_CREATE' | 'INTEGRATION_EDIT' | 'INTEGRATION_DELETE';

interface MeResponse {
  workspaceId: string;
  email: string | null;
  role: WorkspaceRole;
  permissions: WorkspacePermission[];
}

const CACHE = new Map<string, MeResponse>();

export const useWorkspacePermissions = (workspaceId: string | undefined) => {
  const token = useAuth((s) => s.accessToken);
  const [data, setData] = useState<MeResponse | null>(() =>
    workspaceId ? CACHE.get(workspaceId) ?? null : null,
  );
  const [ready, setReady] = useState(!!data);

  useEffect(() => {
    if (!workspaceId || !token) { setReady(false); return; }
    let cancelled = false;
    const url = `${serviceUrl('workspace')}/api/v1/workspaces/${workspaceId}/members/me`;
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (cancelled) return;
        const me = (r.data?.data ?? r.data) as MeResponse;
        CACHE.set(workspaceId, me);
        setData(me); setReady(true);
      })
      .catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [workspaceId, token]);

  const permSet = useMemo(() => new Set(data?.permissions ?? []), [data]);
  const can = (p: WorkspacePermission) => permSet.has(p);

  return { role: data?.role ?? null, permissions: data?.permissions ?? [], can, ready };
};

/** Imperative variant for places that aren't React (e.g. menu builders). */
export const checkPermission = (workspaceId: string, p: WorkspacePermission): boolean => {
  return !!CACHE.get(workspaceId)?.permissions?.includes(p);
};
