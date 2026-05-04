/**
 * useAuditStream — opens an EventSource against the Java SSE endpoint and
 * pushes new audit events into the React Query cache so the timeline
 * updates in real time without polling.
 *
 * Note: EventSource doesn't support custom headers, so the dev-bypass
 * principal is established via cookie / auth proxy on the backend.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { serviceUrl } from '@/lib/env';
import type { TimelineEntry } from '@/services/audit.service';

const toIso = (v: number | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

export const useAuditStream = (workspaceId: string | undefined) => {
  const qc = useQueryClient();
  const ref = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const url = `${serviceUrl('audit')}/api/v1/audit-activity/activity/workspace/${workspaceId}/stream`;
    const es = new EventSource(url);
    ref.current = es;

    es.addEventListener('audit', (ev: MessageEvent) => {
      try {
        const e = JSON.parse(ev.data) as TimelineEntry;
        if (e.timestamp) e.timestamp = toIso(e.timestamp as any);
        // Prepend into every cached audit page query for this project.
        qc.setQueriesData<{ items: TimelineEntry[]; total: number; page: number; size: number } | undefined>(
          { queryKey: ['audit', 'workspace', workspaceId] },
          (old) => {
            if (!old) return old;
            // De-dupe by eventId.
            if (old.items.some((x) => x.eventId === e.eventId)) return old;
            return { ...old, items: [e, ...old.items], total: old.total + 1 };
          },
        );
      } catch { /* swallow malformed event */ }
    });

    es.addEventListener('error', () => {
      // EventSource auto-reconnects; nothing to do here.
    });

    return () => { es.close(); ref.current = null; };
  }, [workspaceId, qc]);

  return { connected: !!ref.current };
};
