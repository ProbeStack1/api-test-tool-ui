/**
 * Saved webhook URLs — user-managed presets stored in localStorage.
 *
 * Why not .env?  The user correctly pointed out that URLs/credentials
 * should be manageable in the UI, not in a build-time env file. Different
 * users on different machines need their own presets without touching
 * source or env files.
 *
 * Shape stored in localStorage key `forgeq.savedWebhookUrls.v1`:
 *   [
 *     { id, label, url, provider, createdAt }
 *   ]
 *
 * The `provider` field is optional and keyed to the backend enum
 * (SLACK / TEAMS / DISCORD / PAGERDUTY / …) so the IntegrationsPane can
 * auto-filter presets to the currently chosen provider.
 */
import { useCallback, useEffect, useState } from 'react';

export interface SavedWebhookUrl {
  id: string;
  label: string;
  url: string;
  provider?: string;       // e.g. "SLACK" | "DISCORD" | "" (generic webhook)
  createdAt: string;       // ISO
}

const KEY = 'forgeq.savedWebhookUrls.v1';

const read = (): SavedWebhookUrl[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedWebhookUrl[]) : [];
  } catch { return []; }
};

const write = (list: SavedWebhookUrl[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota / private mode */ }
};

const mkId = () => `swu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * React hook — exposes the saved-URL list + CRUD helpers that sync across
 * tabs via the `storage` event.
 */
export const useSavedWebhookUrls = () => {
  const [list, setList] = useState<SavedWebhookUrl[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setList(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((entry: Omit<SavedWebhookUrl, 'id' | 'createdAt'>) => {
    const next: SavedWebhookUrl = { id: mkId(), createdAt: new Date().toISOString(), ...entry };
    setList((prev) => {
      const out = [next, ...prev.filter((e) => e.url !== next.url)];
      write(out);
      return out;
    });
    return next;
  }, []);

  const remove = useCallback((id: string) => {
    setList((prev) => {
      const out = prev.filter((e) => e.id !== id);
      write(out);
      return out;
    });
  }, []);

  const clear = useCallback(() => { setList([]); write([]); }, []);

  /** Filter presets to a given provider — "" shows only generic webhooks. */
  const filtered = useCallback((provider?: string): SavedWebhookUrl[] => {
    if (!provider) return list;
    const p = provider.toUpperCase();
    return list.filter((e) => !e.provider || e.provider === p);
  }, [list]);

  return { list, add, remove, clear, filtered };
};
