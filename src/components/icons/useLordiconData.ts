/**
 * useLordiconData — fetch a Lordicon Lottie JSON once and cache it in memory.
 *
 * The `@lordicon/react` Player accepts the raw Lottie JSON object; it does
 * NOT fetch from a URL. We lazy-load each unique URL on demand and dedupe
 * across components, so hovering the same icon twice never re-downloads.
 */
import { useEffect, useState } from 'react';

const CACHE = new Map<string, unknown>();
const PENDING = new Map<string, Promise<unknown>>();

const fetchIcon = (url: string): Promise<unknown> => {
  const cached = CACHE.get(url);
  if (cached) return Promise.resolve(cached);
  const pending = PENDING.get(url);
  if (pending) return pending;
  const p = fetch(url, { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`lordicon ${r.status}`))))
    .then((json) => { CACHE.set(url, json); PENDING.delete(url); return json; })
    .catch((e) => { PENDING.delete(url); throw e; });
  PENDING.set(url, p);
  return p;
};

export const useLordiconData = (url: string | undefined): unknown | null => {
  const [data, setData] = useState<unknown | null>(() => (url ? CACHE.get(url) ?? null : null));
  useEffect(() => {
    if (!url) return;
    const cached = CACHE.get(url);
    if (cached) { setData(cached); return; }
    let cancelled = false;
    fetchIcon(url).then((d) => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [url]);
  return data;
};
