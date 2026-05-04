/**
 * Ad-hoc execute — thin re-export over `services/request.service.adhocExecute`,
 * which itself proxies to `api/request.api.apiAdhocExecute`. Kept as a
 * separate file because legacy imports use this path.
 */
import {
  adhocExecute as serviceAdhoc,
  type ExecutionResult,
} from '@/services/request.service';
import type {
  AdhocBody,
} from '@/api/request.api';

export type { AdhocBody as AdhocExecuteBody };
export type { ExecutionResult };

export const adhocExecute = (
  body: AdhocBody,
  opts: { signal?: AbortSignal } = {},
): Promise<ExecutionResult> => serviceAdhoc(body, opts);
