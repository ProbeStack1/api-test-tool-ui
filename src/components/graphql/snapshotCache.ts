/**
 * snapshotCache — localStorage-backed introspection cache + APQ hasher.
 *
 *  - The GraphQL editor caches the live introspection payload per URL so
 *    IntelliSense + Docs hydrate instantly on reload (no second network
 *    round-trip just to draw the schema).
 *  - `persistedQueryHash` returns the SHA-256 string that Apollo
 *    Persisted Queries use as a stand-in for the full query body.
 */
import type { IntrospectionQuery } from 'graphql';

const KEY = (url: string) => `forgeq.gql.snapshot.${url}`;

export interface Snapshot {
  introspection: IntrospectionQuery;
  savedAt: number;
}

export const saveSnapshot = (url: string, introspection: IntrospectionQuery): void => {
  try {
    localStorage.setItem(KEY(url), JSON.stringify({ introspection, savedAt: Date.now() }));
  } catch { /* quota / sandbox — ignore */ }
};

export const loadSnapshot = (url: string): Snapshot | null => {
  try {
    const raw = localStorage.getItem(KEY(url));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch { return null; }
};

export const clearSnapshot = (url: string): void => {
  try { localStorage.removeItem(KEY(url)); } catch { /* ignore */ }
};

/**
 * SHA-256 hex of a string — used for the APQ footer.
 * Falls back to '' if the browser doesn't expose crypto.subtle.
 */
export const persistedQueryHash = async (query: string): Promise<string> => {
  try {
    const enc = new TextEncoder().encode(query);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return ''; }
};
