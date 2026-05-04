/**
 * Environment service — UI-facing layer.
 *
 *   page  →  THIS FILE  →  api/environment.api  →  http://<env svc>
 *
 * Mirrors `environment-mgmt-svc` (port 8084). Public function names are
 * preserved 1:1 with the prior service so existing pages don't change.
 *
 * Adds two normalisers on top of the raw HTTP layer:
 *   1. `Environment.variables` defaults to [] (the Java list endpoint
 *      returns summaries without variables; pages expect the field to
 *      exist).
 *   2. `ResolveResult` — Java emits `{ values, detail }`; the UI
 *      historically reads `{ variables, layers }`. The normaliser
 *      provides BOTH shapes so old and new consumers work.
 */
import {
  apiActivateEnvironment,
  apiCreateEnvironment,
  apiCreateSnapshot,
  apiDeactivateEnvironment,
  apiDeleteEnvironment,
  apiDeleteVariable,
  apiExportPostmanEnvironment,
  apiExportPostmanGlobals,
  apiGetEnvironment,
  apiGetSnapshot,
  apiGrantShare,
  apiImportPostmanEnvironmentFile,
  apiImportPostmanEnvironmentJson,
  apiImportPostmanGlobalsFile,
  apiImportPostmanGlobalsJson,
  apiListEnvironmentTrash,
  apiListEnvironments,
  apiListSnapshots,
  apiPatchVariable,
  apiResolveVariables,
  apiRestoreEnvironment,
  apiRestoreSnapshot,
  apiRevokeShare,
  apiUpdateEnvironment,
  type EnvCreateBody,
  type EnvScope,
  type EnvShareDto,
  type EnvSnapshotDetailDto,
  type EnvSnapshotDto,
  type EnvUpdateBody,
  type EnvVariableDto,
  type EnvironmentDto,
  type ResolveResultDto,
  type ShareRole,
  type VariableType,
} from '@/api/environment.api';

/* ───────── re-exported vocabulary ──────────────────────────────────────── */
export type { VariableType, EnvScope, ShareRole };
export type EnvVariable  = EnvVariableDto;
export type EnvShareOut  = EnvShareDto;
export type Environment  = EnvironmentDto;
export type EnvSnapshot  = EnvSnapshotDto;
export type EnvSnapshotDetail = EnvSnapshotDetailDto;

/**
 * Legacy-friendly shape exposed to the UI. Includes BOTH the Java native
 * fields (`values`, `detail`) and the UI legacy ones (`variables`, `layers`)
 * so consumers keep working without source changes.
 */
export interface ResolveResult {
  workspaceId: string;
  environmentId?: string | null;
  /** Java native field. */
  values: Record<string, string>;
  /** Legacy UI alias of `values`. */
  variables: Record<string, string>;
  /** Java native field. */
  detail: Array<{ key: string; value: string; winningScope: EnvScope | 'LOCAL'; secret: boolean }>;
  /** Legacy UI alias of `detail` (with extra `scope`/`type` fields). */
  layers: Array<{ scope: EnvScope | 'LOCAL'; envId?: string; key: string; value: string; type: VariableType }>;
  resolvedAt?: string;
}

/* ───────── normalisers ────────────────────────────────────────────────── */
const normEnv = (e: EnvironmentDto): Environment => ({
  ...e,
  variables: Array.isArray(e.variables) ? e.variables : (e as any).variables ?? [],
  variableCount: e.variableCount ?? (e.variables?.length ?? 0),
  secretCount: e.secretCount ?? (e.variables?.filter((v) => v.type === 'SECRET').length ?? 0),
  sharedWith: e.sharedWith ?? [],
  tags: e.tags ?? null,
});

const normResolve = (r: ResolveResultDto): ResolveResult => ({
  workspaceId: r.workspaceId,
  environmentId: r.environmentId ?? null,
  values: r.values ?? {},
  variables: r.values ?? {},
  detail: r.detail ?? [],
  layers: (r.detail ?? []).map((d) => ({
    scope: d.winningScope,
    key: d.key,
    value: d.value,
    type: d.secret ? 'SECRET' : 'DEFAULT',
  })),
  resolvedAt: r.resolvedAt,
});

/* ───────── dummy fallback (UI-only, OFF by default) ────────────────────── */
const useDummy = (): boolean =>
  import.meta.env.VITE_ENVIRONMENT_USE_DUMMY === 'true';
const dummyOnError = (): boolean =>
  import.meta.env.VITE_ENVIRONMENT_DUMMY_ON_ERROR === 'true';
const isNetworkError = (e: unknown): boolean => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || status === undefined;
};
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

/* ───────── environments (CRUD + soft-delete + restore + activate) ────── */
export const listEnvironments = (
  workspaceId?: string | null,
  reveal = false,
): Promise<Environment[]> =>
  withFallback(
    () => apiListEnvironments(workspaceId, reveal).then((rows) => rows.map(normEnv)),
    () => [],
  );

/**
 * Java's GET / list returns *summaries* without the `variables` array.
 * Many UI flows (`{{var}}` resolution, dropdowns) need the full set, so
 * this helper hydrates each summary in parallel. If a summary already
 * carries `variables` we skip the per-id round-trip.
 */
export const listEnvironmentsFull = async (
  workspaceId?: string | null,
  reveal = false,
): Promise<Environment[]> => {
  const summaries = await listEnvironments(workspaceId, reveal);
  return Promise.all(
    summaries.map((s) =>
      Array.isArray(s.variables) && s.variables.length === (s.variableCount ?? s.variables.length)
        ? Promise.resolve(s)
        : getEnvironment(s.id, reveal).catch(() => ({ ...s, variables: [] as EnvVariable[] })),
    ),
  );
};

export const getEnvironment = (id: string, reveal = false): Promise<Environment> =>
  apiGetEnvironment(id, reveal).then(normEnv);

export const createEnvironment = (
  workspaceId: string | null,
  body: Partial<Environment> & { variables?: Array<Omit<EnvVariable, 'lastRotatedAt' | 'rotationDue'>> },
): Promise<Environment> => {
  const payload: EnvCreateBody = {
    name: body.name ?? 'New environment',
    scope: body.scope,
    description: body.description ?? undefined,
    color: body.color ?? undefined,
    variables: body.variables,
    tags: body.tags ?? undefined,
  };
  return apiCreateEnvironment(workspaceId, payload).then(normEnv);
};

export const updateEnvironment = (
  id: string,
  body: Partial<Environment>,
  opts?: { snapshot?: boolean; snapshotLabel?: string },
): Promise<Environment> => {
  const payload: EnvUpdateBody = {
    name: body.name,
    description: body.description ?? undefined,
    color: body.color,
    variables: body.variables,
    tags: body.tags,
  };
  return apiUpdateEnvironment(id, payload, opts).then(normEnv);
};

export const deleteEnvironment = (id: string): Promise<void> =>
  apiDeleteEnvironment(id);

export const restoreEnvironment = (id: string): Promise<Environment> =>
  apiRestoreEnvironment(id).then(normEnv);

export const listEnvironmentTrash = (workspaceId: string): Promise<Environment[]> =>
  withFallback(
    () => apiListEnvironmentTrash(workspaceId).then((rows) => rows.map(normEnv)),
    () => [],
  );

/* Active-env is exposed by Java; the UI store still mirrors it locally. */
export const activateEnvironment = (id: string): Promise<void> =>
  apiActivateEnvironment(id);
export const deactivateEnvironment = (id: string): Promise<void> =>
  apiDeactivateEnvironment(id);

/* ───────── per-variable PATCH / DELETE ────────────────────────────────── */
export const patchVariable = (
  id: string,
  key: string,
  body: Partial<EnvVariable>,
): Promise<Environment> => apiPatchVariable(id, key, body).then(normEnv);

export const deleteVariable = (id: string, key: string): Promise<Environment> =>
  apiDeleteVariable(id, key).then(normEnv);

/* ───────── snapshots ──────────────────────────────────────────────────── */
export const listSnapshots = (id: string): Promise<EnvSnapshot[]> =>
  withFallback(() => apiListSnapshots(id), () => []);

export const createSnapshot = (id: string, label?: string): Promise<EnvSnapshot> =>
  apiCreateSnapshot(id, label);

export const getSnapshot = (
  id: string,
  snapshotId: string,
): Promise<EnvSnapshotDetail> => apiGetSnapshot(id, snapshotId);

export const restoreSnapshot = (id: string, snapshotId: string): Promise<void> =>
  apiRestoreSnapshot(id, snapshotId);

/* ───────── sharing ────────────────────────────────────────────────────── */
export const grantShare = (
  id: string,
  body: { userId: string; role: ShareRole; canRevealSecrets?: boolean },
): Promise<Environment> => apiGrantShare(id, body).then(normEnv);

export const revokeShare = (id: string, userId: string): Promise<Environment> =>
  apiRevokeShare(id, userId).then(normEnv);

/* ───────── resolve ────────────────────────────────────────────────────── */
export const resolveVariables = (
  workspaceId: string,
  body: { environmentId?: string | null; localOverrides?: Record<string, string> } = {},
  reveal = false,
): Promise<ResolveResult> =>
  apiResolveVariables(workspaceId, body, reveal).then(normResolve);

/* ───────── Postman environment.json import / export ────────────────────── */
export const importPostmanEnvironment = (
  workspaceId: string,
  fileOrJson: File | string,
): Promise<Environment> =>
  typeof fileOrJson === 'string'
    ? apiImportPostmanEnvironmentJson(workspaceId, JSON.parse(fileOrJson)).then(normEnv)
    : apiImportPostmanEnvironmentFile(workspaceId, fileOrJson).then(normEnv);

export const importPostmanGlobals = (
  fileOrJson: File | string,
): Promise<Environment> =>
  typeof fileOrJson === 'string'
    ? apiImportPostmanGlobalsJson(JSON.parse(fileOrJson)).then(normEnv)
    : apiImportPostmanGlobalsFile(fileOrJson).then(normEnv);

export const exportPostmanEnvironment = (id: string, reveal = false) =>
  apiExportPostmanEnvironment(id, reveal);

export const exportPostmanGlobals = (workspaceId?: string, reveal = false) =>
  apiExportPostmanGlobals(workspaceId, reveal);
