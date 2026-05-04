/**
 * AI guide / error chatbot — backend client.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('aiAssistant');

export interface AiKV { name: string; value: string }
export interface ErrorContext {
  method?: string;
  url?: string;
  statusCode?: number;
  statusText?: string;
  durationMs?: number;
  headers?: AiKV[];
  body?: string;
  errorMessage?: string;
  location?: string;
}

export interface GuideRequest {
  mode: 'guide' | 'error';
  kbDigest?: string;
  errorContext?: ErrorContext;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
}
export interface GuideResponse {
  answer: string;
  suggestions?: string[];
  requestId?: string;
  model?: string;
}

export const askGuide = (body: GuideRequest): Promise<GuideResponse> =>
  http.post<GuideResponse>('/api/v1/ai/guide', body).then((r) => r.data);
