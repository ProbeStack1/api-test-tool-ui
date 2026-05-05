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
  return apiCreateEnvironment(workspaceId, payload).then(normEnv).catch(async (err: any) => {
    /* Idempotency: when the backend says "name already exists" (409),
     * recover the existing env from this workspace and return it instead
     * of bubbling up an error. This keeps every variables page resilient
     * even when:
     *   • list summaries don't carry `tags.collectionId` (so callers can't
     *     match by tag and end up trying to recreate)
     *   • the env was originally created by a different user / older code
     *     path that didn't set the collection tag
     *
     * Lookup order (most → least specific):
     *   1) by collection-tag      (tags.collectionId)
     *   2) by NAME (case-insensitive) within the workspace+scope
     *   3) by NAME alone
     * On (1)/(2)/(3) we PATCH the missing collectionId tag back so the
     * next page-load matches it cleanly through the tag path. */
    const status = err?.response?.status ?? err?.status;
    const msg = String(err?.response?.data?.message ?? err?.message ?? '');
    const looksConflict = status === 409 || /already exists|ENV_NAME_TAKEN/i.test(msg);
    if (!looksConflict) throw err;
    try {
      /* Use the *full* list so we get scope+name+tags hydrated. */
      const all = await listEnvironmentsFull(workspaceId);
      const wantTagCol = (payload.tags as any)?.collectionId as string | undefined;
      const wantName = (payload.name ?? '').trim().toLowerCase();
      const sameWs = (e: Environment) =>
        workspaceId ? (e.workspaceId === workspaceId || e.scope === 'GLOBAL') : true;

      let hit: Environment | undefined;
      /* (1) collection-tag match */
      if (wantTagCol) {
        hit = all.find((e) => {
          const tagId = (e.tags as any)?.collectionId ?? (e as any).collectionId;
          return tagId === wantTagCol;
        });
      }
      /* (2) name + scope + workspace match */
      if (!hit && wantName) {
        hit = all.find((e) =>
          (!payload.scope || e.scope === payload.scope) &&
          sameWs(e) &&
          e.name.trim().toLowerCase() === wantName,
        );
      }
      /* (3) name-only fallback (handles rare cross-scope duplicates) */
      if (!hit && wantName) {
        hit = all.find((e) => e.name.trim().toLowerCase() === wantName);
      }

      if (hit) {
        /* If we matched by name but the existing env doesn't have the
         * collection tag we wanted, PATCH it so future loads find it
         * cleanly through the tag path (no more 409 → recover dance). */
        const haveTagCol = (hit.tags as any)?.collectionId as string | undefined;
        if (wantTagCol && !haveTagCol) {
          try {
            const patched = await updateEnvironment(hit.id, {
              tags: { ...(hit.tags ?? {}), collectionId: wantTagCol },
            } as any);
            return patched;
          } catch {/* tag patch is best-effort */}
        }
        try { return await getEnvironment(hit.id); } catch { return hit; }
      }

      /* (4) Last resort — the conflict env is invisible to us (likely
       *     soft-deleted or owned by a different user/org on the same
       *     workspace). Per product decision: do NOT restore from trash
       *     (the user explicitly asked for fresh creation). Just uniquify
       *     the name — `Foo` → `Foo (1)` → `Foo (2)` … — so the page
       *     never blocks. The user can rename later. */
      const baseName = (payload.name ?? '').trim();
      if (baseName) {
        for (let n = 1; n <= 5; n++) {
          try {
            return await apiCreateEnvironment(workspaceId, {
              ...payload,
              name: `${baseName} (${n})`,
            }).then(normEnv);
          } catch (e: any) {
            const s = e?.response?.status ?? e?.status;
            if (s !== 409) throw e;
          }
        }
      }
    } catch {/* ignore — fall through to original error */}
    throw err;
  });
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
