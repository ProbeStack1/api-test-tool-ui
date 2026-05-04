/**
 * Streaming execute client — POSTs to `/api/v1/requests/adhoc/execute/stream`
 * and parses the Server-Sent-Events response into typed callbacks.
 *
 * fetch + ReadableStream is used (not the EventSource API) because we need
 * to send a JSON body via POST — EventSource only allows GET.
 *
 * Flow: page → services/request.service.executeStream → THIS FILE → JVM SSE.
 */
import { serviceUrl, env } from '@/lib/env';

const BASE = () => `${serviceUrl('request')}/api/v1/requests`;

export type StreamPhaseEvent = {
  name: string;
  status: 'running' | 'done';
  durationMs?: number;
  startedAtMs?: number;
};
export type StreamMetaEvent = { network?: Record<string, unknown> };
export type StreamErrorEvent = { kind: string; message: string };

export type StreamHandlers = {
  onPhase?: (e: StreamPhaseEvent) => void;
  onMeta?:  (e: StreamMetaEvent) => void;
  onError?: (e: StreamErrorEvent) => void;
  // Final shape is `ExecutionResultDto` after the inline normaliser below
  // rewrites `step`→`name` and `offsetMs`→`startedAtMs`. Typed as `any`
  // because the wire envelope (`{ type, result }`) and the unwrapped result
  // both reach this callback in different code paths.
  onDone?:  (final: any) => void;
};

const authHeader = (): Record<string, string> =>
  env.devBypassAuth ? { 'X-Dev-Bypass': 'true' } : {};

export async function apiExecuteStream(
  payload: unknown,
  handlers: StreamHandlers,
  signal?: AbortSignal,
) {
  const res = await fetch(`${BASE()}/adhoc/execute/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...authHeader(),
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    /* SSE events are separated by blank lines. */
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let eventName = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      let parsed: any;
      try { parsed = JSON.parse(data); } catch { continue; }
      // Java wraps every SSE payload in ExecutionDtos.StreamEvent
      // { type, step, status:'RUNNING'|'DONE', offsetMs, durationMs, details, result }.
      // Map to the lower-case shape the UI expects so the legacy and Java
      // backends are interchangeable.
      if (eventName === 'phase') {
        const raw = String(parsed.status ?? '').toLowerCase();
        const status =
          raw === 'done' || raw === 'end' || raw === 'failed' || raw === 'skipped'
            ? 'done'
            : 'running';
        handlers.onPhase?.({
          name: parsed.name ?? parsed.step ?? 'Phase',
          status,
          durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : 0,
          startedAtMs: parsed.startedAtMs ?? parsed.offsetMs,
        });
      } else if (eventName === 'meta') {
        handlers.onMeta?.(parsed);
      } else if (eventName === 'error') {
        handlers.onError?.({
          kind: parsed.kind ?? 'error',
          message: parsed.details?.message ?? parsed.message ?? 'stream error',
        });
      } else if (eventName === 'done') {
        const r: any = parsed?.result ?? parsed;
        if (r && Array.isArray(r.phases)) {
          r.phases = r.phases.map((p: any) => ({
            name: p?.name ?? p?.step ?? 'Phase',
            startedAtMs: p?.startedAtMs ?? p?.offsetMs,
            durationMs: typeof p?.durationMs === 'number' ? p.durationMs : 0,
          }));
        }
        // Normalize response fields: Java sends httpStatus/bodyBytes, UI expects statusCode/sizeBytes
        if (r && r.response) {
          r.response = {
            ...r.response,
            statusCode: r.response.statusCode ?? r.response.httpStatus ?? 0,
            sizeBytes: r.response.sizeBytes ?? r.response.bodyBytes ?? 0,
          };
        }
        handlers.onDone?.(r);
      }
    }
  }
}
