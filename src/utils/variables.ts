/**
 * Variables — helpers to classify and look up `{{var}}` references.
 *
 * Three states surfaced to the UI:
 *   • active      — the variable exists in an *active* environment (or in
 *                   a project/global scope which is always active).
 *                   Show in primary color; tooltip shows its value.
 *   • inactive    — the variable exists, but only in an environment that
 *                   isn't currently activated. Show in yellow; tooltip
 *                   asks the user to activate that env first.
 *   • missing     — no environment (active or otherwise) defines this
 *                   variable. Show in red; tooltip says it's undefined.
 *
 * This module exposes:
 *   • `useVariableIndex()` — React hook returning an index for O(1) lookup
 *   • `classifyRef(ref, index)` — pure classifier (unit-testable)
 *   • `VAR_REGEX` — shared regex for tokenising strings
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listEnvironmentsFull, type Environment } from '@/services/environment.service';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useSettings } from '@/stores/settings.store';
import { useRequests } from '@/stores/requests.store';

export type VarStatus = 'active' | 'inactive' | 'missing';
export const VAR_REGEX = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g;

export interface VarHit {
  status: VarStatus;
  /** For 'active' — the resolved value. For 'inactive' — the env name.
   *  For 'missing' — undefined. */
  value?: string;
  envName?: string;
}

export interface VariableIndex {
  lookup: (name: string) => VarHit;
  /** All active variable names — used for autocomplete. */
  activeNames: string[];
}

export const useVariableIndex = (): VariableIndex => {
  const workspaceId = useWorkspaceStore((s) => s.current?.id ?? null);
  const activeEnvId = useSettings((s) => s.activeEnvId);

  // Get the active request's collection ID
  const activeId = useRequests((s) => s.activeId);
  const openRequests = useRequests((s) => s.open);
  const activeRequest = openRequests.find((r) => r.id === activeId);
  const activeCollectionId = activeRequest?.collectionId;

  const { data: envs = [] } = useQuery({
    queryKey: ['envs', workspaceId],
    queryFn: () => listEnvironmentsFull(workspaceId, true),
    enabled: !!workspaceId,
  });

  return useMemo(() => {
    // Precedence order (lowest → highest, later overwrites earlier)
    const PRECEDENCE: Record<string, number> = {
      GLOBAL: 1,
      WORKSPACE: 2,
      COLLECTION: 3,
      ENVIRONMENT: 4,
    };
    const sorted = [...(envs as Environment[])].sort(
      (a, b) => (PRECEDENCE[a.scope] ?? 99) - (PRECEDENCE[b.scope] ?? 99),
    );

    const activeMap = new Map<string, { value: string; envName: string; scope: string }>();
    const inactiveMap = new Map<string, { envName: string; scope: string }>();

    for (const e of sorted) {
      // Determine if this environment's variables should be active
      let isActive = false;

      if (e.scope === 'GLOBAL' || e.scope === 'WORKSPACE') {
        // Global and Workspace are always active
        isActive = true;
      } else if (e.scope === 'ENVIRONMENT') {
        // Environment is active only if it's the selected one
        isActive = !!(e.isActive || e.id === activeEnvId);
      } else if (e.scope === 'COLLECTION') {
        // Collection is active only if the active request belongs to it
        const collId = (e.tags as any)?.collectionId;
        isActive = !!(activeCollectionId && collId === activeCollectionId);
      }

      for (const v of e.variables ?? []) {
        if (!v.enabled) continue;

        if (isActive) {
          // Higher-precedence scope (later in sorted array) overwrites lower.
          activeMap.set(v.key, { value: v.value, envName: e.name, scope: e.scope });
        } else {
          // Only add inactive ENVIRONMENT variables to the inactive map.
          // COLLECTION variables from other collections are ignored completely.
          if (e.scope === 'ENVIRONMENT' && !inactiveMap.has(v.key) && !activeMap.has(v.key)) {
            inactiveMap.set(v.key, { envName: e.name, scope: e.scope });
          }
          // For COLLECTION: if not active, skip entirely (do not add to inactiveMap)
        }
      }
    }

    return {
      lookup: (name: string): VarHit => {
        const a = activeMap.get(name);
        if (a) return { status: 'active', value: a.value, envName: `${a.envName} · ${a.scope}` };
        const o = inactiveMap.get(name);
        if (o) return { status: 'inactive', envName: `${o.envName} · ${o.scope}` };
        return { status: 'missing' };
      },
      activeNames: Array.from(activeMap.keys()).sort(),
    };
  }, [envs, activeEnvId, activeCollectionId]);
};

/* Tailwind colour classes keyed by status — reused by every highlighted input. */
export const STATUS_CLASS: Record<VarStatus, string> = {
  active:   'text-blue-600 dark:text-blue-500',
  inactive: 'text-yellow-500',
  missing:  'text-red-500',
};

export const statusTooltip = (hit: VarHit, name: string): string => {
  if (hit.status === 'active') {
    return `${name} · ${hit.envName ?? ''}\n= ${hit.value ?? ''}`;
  }
  if (hit.status === 'inactive') {
    return `${name}\nPresent in ${hit.envName}. Activate that environment first.`;
  }
  return `${name}\nNo environment variable with this name.`;
};
