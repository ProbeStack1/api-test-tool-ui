/**
 * Audit AI insight client — calls the Gemini-backed Java endpoint inside
 * `forgeq-audit-activity-svc`.
 *
 * Endpoint: `POST /api/v1/activity/activity/workspace/{wsId}/insight`
 * Backend: Java HttpClient → Google Gemini (gemini-2.5-flash). No Python.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('audit');
const BASE = '/api/v1/activity';

export interface InsightActor {
  email: string;
  count: number;
}
export interface InsightResponse {
  summary: string;
  highlights: string[];
  actorTop: InsightActor[];
  severityCounts: Record<string, number>;
}

export const fetchAuditInsight = async (
  wsId: string,
  events: Array<Record<string, unknown>>,
  workspaceName?: string,
): Promise<InsightResponse> => {
  const resp = await http.post<InsightResponse>(`${BASE}/activity/workspace/${wsId}/insight`, {
    workspaceName,
    events,
  });
  return resp.data;
};
