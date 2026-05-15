/**
 * useBackendHistoryLoader — hydrates the in-browser run-history store
 * from the request-svc `GET /api/v1/requests/runs` endpoint.
 *
 * Why we need this:
 *   • The store (`runHistory.store.ts`) was originally browser-local
 *     (IndexedDB). Great for the demo but lost across browsers /
 *     sessions and not visible to other workspace members.
 *   • Backend already records every `Send` in `request_runs` Mongo
 *     collection.  We now expose `/runs?workspaceId=...` for a
 *     workspace-wide list.
 *   • This hook reads that list once on mount and **merges** any
 *     server entries that aren't already in the local store.
 *     We never *remove* local-only entries (e.g. ad-hoc requests
 *     that weren't tied to a saved request).
 *
 * Side-effects:
 *   • Sets `hasHydrated = true` once the first fetch completes so the
 *     panel can stop showing the skeleton.
 *
 * Consumed by:
 *   • `<HistoryPanel />` (sidebar list)
 *   • `<HistoryPage />` (detail pane)
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listWorkspaceRuns } from '@/services/request.service';
import { useRunHistoryStore, type HistoryEntry } from '@/stores/runHistory.store';
import { useWorkspaceStore } from '@/stores/workspace.store';

const KIND = 'request';

const toEntry = (row: any): HistoryEntry => {
  const snap = row.snapshot ?? {};
  const resp = row.response ?? {};
  const net  = row.network  ?? {};
  return {
    id: row.id,
    kind: KIND as any,
    at:   row.run_at ?? row.runAt ?? new Date().toISOString(),
    snapshot: {
      name:    snap.name ?? row.request_name ?? '',
      method:  snap.method ?? row.method ?? 'GET',
      url:     snap.final_url ?? snap.finalUrl ?? snap.url?.raw ?? '',
      headers: (snap.user_headers ?? snap.userHeaders ?? []).map((h: any) => ({
        key: h.key, value: h.value, enabled: h.enabled !== false,
      })),
      params:  (snap.url?.queryParams ?? snap.url?.query_params ?? []).map((p: any) => ({
        key: p.key, value: p.value, enabled: p.enabled !== false,
      })),
      body:    snap.body,
      auth:    snap.auth,
      preScript:  snap.pre_request_script ?? snap.preRequestScript,
      testScript: snap.test_script        ?? snap.testScript,
    },
    result: {
      response: {
        statusCode: resp.http_status ?? resp.httpStatus,
        statusText: resp.status_text ?? resp.statusText,
        headers:    resp.headers,
        body:       resp.body,
        contentType: resp.content_type ?? resp.contentType,
        sizeBytes:  resp.body_bytes ?? resp.bodyBytes,
      },
      network: {
        statusCode: resp.http_status ?? resp.httpStatus,
        totalMs:    row.total_ms ?? row.totalMs,
        requestSizeBytes:  net.request_size_total  ?? net.requestSizeTotal,
        responseSizeBytes: net.response_size_total ?? net.responseSizeTotal,
      },
      totalMs: row.total_ms ?? row.totalMs,
      status:  row.status,
    } as any,
  };
};

export const useBackendHistoryLoader = () => {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.current?.id);

  const q = useQuery({
    queryKey: ['workspace-runs', workspaceId ?? 'all'],
    queryFn: () => listWorkspaceRuns({ workspaceId: workspaceId ?? undefined, size: 100 }),
    refetchInterval: 15_000,
  });

  // Merge backend rows into the local store every time the query refreshes.
  useEffect(() => {
    if (!q.data) return;
    const body: any = q.data;
    const rows: any[] = Array.isArray(body) ? body : Array.isArray(body.content) ? body.content : [];
    if (rows.length === 0) {
      useRunHistoryStore.setState((s) => (s.hasHydrated ? s : { ...s, hasHydrated: true }));
      return;
    }
    useRunHistoryStore.setState((s) => {
      const existing = new Set(s.entries.map((e) => e.id));
      const fresh: HistoryEntry[] = rows
        .map(toEntry)
        .filter((e) => !existing.has(e.id));
      if (fresh.length === 0) return { ...s, hasHydrated: true };
      // Server is authoritative for ordering — merge then sort by `at` desc.
      const merged = [...fresh, ...s.entries]
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .slice(0, 500);
      return { ...s, entries: merged, hasHydrated: true };
    });
  }, [q.data, qc]);

  return q;
};
