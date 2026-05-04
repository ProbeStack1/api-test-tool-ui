/**
 * Body generator — translates a free-form intent into a fully-formed
 * request body via the Java AI service.
 *
 * Used by:
 *   • The "Generate" button on the body editor toolbar.
 *   • The `// generate: …` comment shortcut inside Monaco.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('aiAssistant');

export interface BodyGenerateRequest {
  intent: string;
  method?: string;
  url?: string;
  language?: 'json' | 'text' | 'xml' | string;
  existingBody?: string;
  headersHint?: string;
}

export interface BodyGenerateResponse {
  body: string;
  language: string;
  requestId: string;
}

export const generateBody = async (
  body: BodyGenerateRequest,
  signal?: AbortSignal,
): Promise<BodyGenerateResponse> => {
  const { data } = await http.post<BodyGenerateResponse>(
    '/api/v1/ai/generate-body',
    body,
    { signal },
  );
  return data;
};
