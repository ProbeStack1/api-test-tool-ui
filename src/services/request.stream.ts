/**
 * @deprecated since 2026-04-29 — moved to `@/api/request.stream`.
 * This file is kept as a thin re-export so legacy imports keep working
 * during Shot 3 of the integration playbook. Prefer importing
 * `executeStream` from `@/services/request.service` directly.
 */
export {
  apiExecuteStream as executeStream,
  type StreamHandlers,
  type StreamPhaseEvent,
  type StreamMetaEvent,
  type StreamErrorEvent,
} from '@/api/request.stream';
