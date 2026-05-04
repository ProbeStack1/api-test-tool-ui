/**
 * AI-assistant API client.
 *
 * The right-sidebar "AI" tab posts a full request snapshot + the user's
 * question to the Java `forgeq-ai-assistant-svc` (port 8093) and receives
 * a Markdown-formatted answer. Stateless — no session id is sent. The
 * frontend keeps the conversation in component state and ships the
 * tail-end of the history on every call.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('aiAssistant');

export interface AiKV { name: string; value: string }
export interface AiChatTurn { role: 'user' | 'assistant'; content: string }

export interface AiAnalyzeRequest {
  request: {
    method?: string;
    url?: string;
    queryParams?: AiKV[];
    headers?: AiKV[];
    authType?: string | null;
    bodyKind?: string | null;
    bodyText?: string | null;
    meta?: Record<string, string>;
  };
  lastResponse?: {
    statusCode?: number;
    statusText?: string;
    durationMs?: number;
    headers?: AiKV[];
    body?: string;
  };
  history?: AiChatTurn[];
  userMessage: string;
}

export interface AiAnalyzeResponse {
  answer: string;
  suggestions?: string[];
  requestId?: string;
  model?: string;
  usage?: { promptTokens?: number; candidatesTokens?: number; totalTokens?: number };
}

export const analyze = (body: AiAnalyzeRequest): Promise<AiAnalyzeResponse> =>
  http.post<AiAnalyzeResponse>('/api/v1/ai/analyze', body).then((r) => r.data);

export const ping = (): Promise<string> =>
  http.get<string>('/api/v1/ai/ping').then((r) => r.data);
