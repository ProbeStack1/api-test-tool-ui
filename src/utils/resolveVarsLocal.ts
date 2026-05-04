/**
 * Local `{{variable}}` resolver — replaces Postman-style placeholders in
 * any string using a merged variable map (Local > Env > Project > Global).
 *
 * Used by the Code Snippet panel when the user toggles "Resolve variables"
 * — the panel merges the three env tiers client-side and we do a fast
 * regex-based substitution. Unknown keys stay unchanged (so the user can
 * see what is missing).
 */
import type { Environment } from '@/services/environment.service';

export type VarMap = Record<string, string>;

/** Build the precedence-merged key→value map. Higher tier wins. */
export const buildVarMap = (
  env: Environment | null | undefined,
  project: Environment | null | undefined,
  globals: Environment | null | undefined,
): VarMap => {
  const map: VarMap = {};
  const load = (e?: Environment | null) => {
    if (!e?.variables) return;
    for (const v of e.variables) {
      if (!v.key) continue;
      if (v.enabled === false) continue;
      map[v.key] = v.value ?? '';
    }
  };
  // Apply lowest → highest so last write wins.
  load(globals);
  load(project);
  load(env);
  return map;
};

/** Replace every `{{key}}` in `text` with the matching map value. Leaves
 *  unknown keys untouched (wrapped in the original braces) so the user can
 *  visually spot missing variables. */
export const substitute = (text: string, vars: VarMap): string => {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-zA-Z0-9_.\-]+)\s*\}\}/g, (raw, key: string) => {
    return key in vars ? vars[key] : raw;
  });
};

/** Apply `substitute` to every string in an HAR-like draft snapshot tree. */
export const substituteDeep = <T>(value: T, vars: VarMap): T => {
  if (value == null) return value;
  if (typeof value === 'string') return substitute(value, vars) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => substituteDeep(v, vars)) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteDeep(v, vars);
    }
    return out as T;
  }
  return value;
};
