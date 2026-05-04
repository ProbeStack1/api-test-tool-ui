/**
 * Inline AI completion — Postbot-style ghost text inside Monaco.
 *
 * Wraps `POST /api/v1/ai/inline-completion` on the Java
 * `forgeq-ai-assistant-svc`. The endpoint always returns 200 with an
 * (possibly empty) completion string — failures upstream are silently
 * absorbed so the editor never surfaces an AI error toast for what is a
 * non-essential UX delight.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('aiAssistant');

export interface InlineCompletionRequest {
  prefix: string;
  suffix?: string;
  language?: string;
  intent?: 'body' | 'pre-request' | 'tests' | 'url' | 'header' | string;
}

export interface InlineCompletionResponse {
  completion: string;
  requestId: string;
}

/**
 * Fetch a single inline completion for the given context.
 *
 * Network failure → resolves to an empty completion (never throws) so
 * the Monaco provider keeps the editor usable in offline mode.
 */
export const fetchInlineCompletion = async (
  body: InlineCompletionRequest,
  signal?: AbortSignal,
): Promise<string> => {
  try {
    const { data } = await http.post<InlineCompletionResponse>(
      '/api/v1/ai/inline-completion',
      body,
      { signal },
    );
    return data?.completion ?? '';
  } catch {
    return '';
  }
};
