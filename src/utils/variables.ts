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
  const { data: envs = [] } = useQuery({
    queryKey: ['envs', workspaceId],
    // Java's list endpoint returns *summaries* (no `variables` array), so
    // we must hydrate each env's detail to resolve `{{var}}` references.
    // `reveal=true` decrypts SECRET values in dev-bypass mode for the
    // tooltip preview.
    queryFn: () => listEnvironmentsFull(workspaceId, true),
    enabled: !!workspaceId,
  });

  return useMemo(() => {
    // Build maps with PRECEDENCE-AWARE ORDER so that the highest-priority
    // scope's value wins when the same KEY exists across multiple scopes.
    //
    // Resolution order (lowest→highest, later overwrites earlier):
    //   1. GLOBAL          (org-wide, lowest priority)
    //   2. WORKSPACE       (project)
    //   3. COLLECTION      (per-collection)
    //   4. ENVIRONMENT     (only the *active* one — others go in inactiveMap)
    //   (LOCAL is runtime-only — handled by the script engine, not here.)
    const PRECEDENCE: Record<string, number> = {
      GLOBAL: 1, WORKSPACE: 2, COLLECTION: 3, ENVIRONMENT: 4,
    };
    const sorted = [...(envs as Environment[])].sort(
      (a, b) => (PRECEDENCE[a.scope] ?? 99) - (PRECEDENCE[b.scope] ?? 99),
    );

    const activeMap = new Map<string, { value: string; envName: string; scope: string }>();
    const inactiveMap = new Map<string, { envName: string; scope: string }>();
    for (const e of sorted) {
      const alwaysActive = e.scope === 'WORKSPACE' || e.scope === 'GLOBAL' || e.scope === 'COLLECTION';
      const isActive = alwaysActive || e.isActive;
      for (const v of e.variables ?? []) {
        if (!v.enabled) continue;
        if (isActive) {
          // Higher-precedence scope (later in sorted array) overwrites lower.
          activeMap.set(v.key, { value: v.value, envName: e.name, scope: e.scope });
        } else if (!inactiveMap.has(v.key) && !activeMap.has(v.key)) {
          inactiveMap.set(v.key, { envName: e.name, scope: e.scope });
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
  }, [envs]);
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
