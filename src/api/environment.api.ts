/**
 * Environment raw HTTP layer — 1:1 mapping of `environment-mgmt-svc` (port 8084).
 *
 *   page  →  services/environment.service  →  THIS FILE  →  http://<env svc>
 *
 * Six controllers:
 *   • EnvironmentController   /api/v1/environments
 *   • SnapshotController      /api/v1/environments/{id}/snapshots
 *   • ShareController         /api/v1/environments/{id}/shares
 *   • ResolveController       /api/v1/environments/resolve
 *   • ImportExportController  /api/v1/environments/import|/globals|/{id}/export
 *   • HealthController        /api/v1/environments/health
 *
 * Strict rules: no hard-coded URLs, no business logic; returns the
 * unwrapped `data` shape (the global axios interceptor handles the
 * `ResponseEnvelope`).
 */
import { createHttp } from '@/lib/http';

/* ------------------------------ types ------------------------------------ */
export type VariableType = 'DEFAULT' | 'SECRET';
export type EnvScope     = 'ENVIRONMENT' | 'WORKSPACE' | 'GLOBAL' | 'COLLECTION';
export type ShareRole    = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface EnvVariableDto {
  key: string;
  value: string;
  type: VariableType;
  enabled: boolean;
  description?: string;
  lastRotatedAt?: string | null;
  rotationDue?: boolean;
}

export interface EnvShareDto {
  user: { userId: string; email?: string; name?: string };
  role: ShareRole;
  canRevealSecrets: boolean;
  grantedAt: string;
  grantedBy?: { userId?: string; email?: string; name?: string };
}

export interface EnvironmentDto {
  id: string;
  orgId: string;
  workspaceId: string | null;
  scope: EnvScope;
  name: string;
  description?: string;
  color?: string;
  variables?: EnvVariableDto[];
  variableCount?: number;
  secretCount?: number;
  rotationDueCount?: number;
  sharedWith?: EnvShareDto[];
  createdBy?: { userId?: string; email: string; name: string };
  tags?: Record<string, string> | null;
  version?: number;
  createdAt?: string;
  updatedAt: string;
  isActive?: boolean;
  deletedAt?: string | null;
}

export interface EnvSnapshotDto {
  id: string;
  environmentId: string;
  version: number;
  label: string;
  createdAt: string;
  createdBy?: {
    userId: string;
    email: string;
    name: string;
  } | null;
  variableCount: number;
  secretCount: number;
  auto: boolean;
}
export interface EnvSnapshotDetailDto extends EnvSnapshotDto {
  variables: EnvVariableDto[];
}

/** Java's wire shape for `POST /resolve`. The service-layer normaliser
 *  remaps this to the legacy UI shape (`variables` / `layers`). */
export interface ResolveResultDto {
  workspaceId: string;
  environmentId?: string | null;
  values: Record<string, string>;
  detail: Array<{ key: string; value: string; winningScope: EnvScope | 'LOCAL'; secret: boolean }>;
  resolvedAt: string;
}

export interface EnvCreateBody {
  name: string;
  scope?: EnvScope;
  description?: string;
  color?: string;
  variables?: Array<Omit<EnvVariableDto, 'lastRotatedAt' | 'rotationDue'>>;
  tags?: Record<string, string>;
}

export interface EnvUpdateBody {
  name?: string;
  description?: string | null;
  color?: string;
  variables?: EnvVariableDto[];
  tags?: Record<string, string> | null;
}

export interface ShareGrantBody {
  userId: string;
  role: ShareRole;
  canRevealSecrets?: boolean;
}

/* ----------------------------- client ------------------------------------ */
const http = createHttp('environment');
const BASE = '/api/v1/environments';

/* ============== environments (CRUD + soft-delete + restore + activate) === */
export const apiListEnvironments = (workspaceId?: string | null, reveal = false) =>
  http
    .get<EnvironmentDto[]>(BASE, {
      params: { ...(workspaceId ? { workspaceId } : {}), reveal },
    })
    .then((r) => r.data);

export const apiGetEnvironment = (id: string, reveal = false) =>
  http
    .get<EnvironmentDto>(`${BASE}/${id}`, { params: { reveal } })
    .then((r) => r.data);

export const apiCreateEnvironment = (
  workspaceId: string | null,
  body: EnvCreateBody,
) =>
  http
    .post<EnvironmentDto>(BASE, body, {
      params: workspaceId ? { workspaceId } : {},
    })
    .then((r) => r.data);

export const apiUpdateEnvironment = (
  id: string,
  body: EnvUpdateBody,
  opts?: { snapshot?: boolean; snapshotLabel?: string },
) =>
  http
    .put<EnvironmentDto>(`${BASE}/${id}`, body, {
      params: opts?.snapshot
        ? { snapshot: true, ...(opts.snapshotLabel ? { snapshotLabel: opts.snapshotLabel } : {}) }
        : undefined,
    })
    .then((r) => r.data);

/** Java exposes both PUT (full) and PATCH (partial) — keep both available. */
export const apiPatchEnvironment = (id: string, body: EnvUpdateBody) =>
  http.patch<EnvironmentDto>(`${BASE}/${id}`, body).then((r) => r.data);

export const apiDeleteEnvironment = (id: string) =>
  http.delete<void>(`${BASE}/${id}`).then((r) => r.data);

export const apiListEnvironmentTrash = (workspaceId: string) =>
  http
    .get<EnvironmentDto[]>(`${BASE}/trash`, { params: { workspaceId } })
    .then((r) => r.data);

export const apiRestoreEnvironment = (id: string) =>
  http.post<EnvironmentDto>(`${BASE}/${id}/restore`).then((r) => r.data);

export const apiActivateEnvironment = (id: string) =>
  http.post<void>(`${BASE}/${id}/activate`).then((r) => r.data);

export const apiDeactivateEnvironment = (id: string) =>
  http.post<void>(`${BASE}/${id}/deactivate`).then((r) => r.data);

/* ============== per-variable PATCH / DELETE (Postman-parity) ============= */
export const apiPatchVariable = (
  id: string,
  key: string,
  body: Partial<EnvVariableDto>,
) =>
  http
    .patch<EnvironmentDto>(`${BASE}/${id}/variables/${encodeURIComponent(key)}`, body)
    .then((r) => r.data);

export const apiDeleteVariable = (id: string, key: string) =>
  http
    .delete<EnvironmentDto>(`${BASE}/${id}/variables/${encodeURIComponent(key)}`)
    .then((r) => r.data);

/* ============================ snapshots ================================== */
export const apiListSnapshots = (id: string) =>
  http.get<EnvSnapshotDto[]>(`${BASE}/${id}/snapshots`).then((r) => r.data);

export const apiCreateSnapshot = (id: string, label?: string) =>
  http
    .post<EnvSnapshotDto>(`${BASE}/${id}/snapshots`, label ? { label } : {})
    .then((r) => r.data);

export const apiGetSnapshot = (id: string, snapshotId: string) =>
  http
    .get<EnvSnapshotDetailDto>(`${BASE}/${id}/snapshots/${snapshotId}`)
    .then((r) => r.data);

export const apiRestoreSnapshot = (id: string, snapshotId: string) =>
  http
    .post<void>(`${BASE}/${id}/snapshots/${snapshotId}/restore`)
    .then((r) => r.data);

/* ============================== shares =================================== */
export const apiGrantShare = (id: string, body: ShareGrantBody) =>
  http
    .post<EnvironmentDto>(`${BASE}/${id}/shares`, body)
    .then((r) => r.data);

export const apiRevokeShare = (id: string, userId: string) =>
  http
    .delete<EnvironmentDto>(`${BASE}/${id}/shares/${userId}`)
    .then((r) => r.data);

/* ============================== resolve ================================== */
export const apiResolveVariables = (
  workspaceId: string,
  body: { environmentId?: string | null; localOverrides?: Record<string, string> } = {},
  reveal = false,
) =>
  http
    .post<ResolveResultDto>(`${BASE}/resolve`, body, {
      params: { workspaceId, reveal },
    })
    .then((r) => r.data);

/* ===================== Postman environment.json import / export ========== */
/** JSON body version (Java accepts either JSON or multipart). */
export const apiImportPostmanEnvironmentJson = (workspaceId: string, json: unknown) =>
  http
    .post<EnvironmentDto>(`${BASE}/import`, json, {
      params: { workspaceId },
      headers: { 'Content-Type': 'application/json' },
    })
    .then((r) => r.data);

export const apiImportPostmanEnvironmentFile = (workspaceId: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return http
    .post<EnvironmentDto>(`${BASE}/import`, fd, {
      params: { workspaceId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const apiImportPostmanGlobalsJson = (json: unknown) =>
  http
    .post<EnvironmentDto>(`${BASE}/globals/import`, json, {
      headers: { 'Content-Type': 'application/json' },
    })
    .then((r) => r.data);

export const apiImportPostmanGlobalsFile = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return http
    .post<EnvironmentDto>(`${BASE}/globals/import`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

/** Returns the raw blob + content-disposition so callers can save the file. */
export const apiExportPostmanEnvironment = async (id: string, reveal = false) => {
  const res = await http.get(`${BASE}/${id}/export`, {
    params: { reveal },
    responseType: 'blob',
  });
  return {
    blob: res.data as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

export const apiExportPostmanGlobals = async (workspaceId?: string, reveal = false) => {
  const res = await http.get(`${BASE}/globals/export`, {
    params: { ...(workspaceId ? { workspaceId } : {}), reveal },
    responseType: 'blob',
  });
  return {
    blob: res.data as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

/* ============================ health ===================================== */
export const apiEnvironmentHealth = () =>
  http
    .get<{ status: 'UP' | 'DOWN'; details?: Record<string, unknown> }>(`${BASE}/health`)
    .then((r) => r.data);
