/**
 * AI-Assisted dedicated tab — chat sessions API client.
 *
 * Wraps every endpoint exposed by the Java `forgeq-ai-assistant-svc` chat
 * controller. The frontend ships an {@code X-Forgeq-User} header (dev
 * shim today, Auth0 sub later) so sessions are scoped per user.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('aiAssistant');

/** Stable owner id for the dev environment. The Java service falls back
 *  to "dev-user" when the X-Forgeq-User header is missing, so we don't
 *  send it from the browser (avoids the extra CORS-allowed-header dance). */
const ownerHeader = {} as Record<string, string>;

export interface SessionView {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  trashedAt?: string | null;
  messageCount: number;
}
export interface MessageView {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
export interface SessionDetail {
  session: SessionView;
  messages: MessageView[];
}

const base = '/api/v1/ai/chat';

export const createSession = (title?: string): Promise<SessionView> =>
  http.post<SessionView>(`${base}/sessions`, { title }, { headers: ownerHeader }).then((r) => r.data);

export const listSessions = (): Promise<SessionView[]> =>
  http.get<SessionView[]>(`${base}/sessions`, { headers: ownerHeader }).then((r) => r.data);

export const getSession = (id: string): Promise<SessionDetail> =>
  http.get<SessionDetail>(`${base}/sessions/${id}`).then((r) => r.data);

export const renameSession = (id: string, title: string): Promise<SessionView> =>
  http.patch<SessionView>(`${base}/sessions/${id}`, { title }).then((r) => r.data);

export const sendMessage = (id: string, content: string): Promise<MessageView> =>
  http.post<MessageView>(`${base}/sessions/${id}/messages`, { content }).then((r) => r.data);

export const trashSession = (id: string): Promise<void> =>
  http.delete<void>(`${base}/sessions/${id}`).then(() => undefined);

export const listTrash = (): Promise<SessionView[]> =>
  http.get<SessionView[]>(`${base}/trash`, { headers: ownerHeader }).then((r) => r.data);

export const restoreSession = (id: string): Promise<SessionView> =>
  http.post<SessionView>(`${base}/trash/${id}/restore`, {}).then((r) => r.data);

export const purgeSession = (id: string): Promise<void> =>
  http.delete<void>(`${base}/trash/${id}`).then(() => undefined);
