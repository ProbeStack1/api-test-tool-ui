/**
 * KRE Nexus AI — client for the KRE Agentic Backend.
 *
 * Talks DIRECTLY to the public KRE deployment. In practice KRE Nexus
 * enforces a ForgeQ JWT on its marketplace + proxy routes (even though
 * the public docs hint they're "sandbox · no auth"), so this client
 * AUTOMATICALLY attaches the user's logged-in JWT from
 * `useAuth.getAccessToken()` to every call. The user can also pass an
 * explicit token to {@link authenticatedRun} for the full MCP run.
 *
 * Source of truth for the API surface: `/app/api_documentation.md`.
 *
 *   Sandbox routes:
 *     POST /api/proxy/agent-chat/{agentId}      — chat
 *     POST /api/proxy/agent-run/{agentId}       — run task
 *     GET  /api/proxy/agent-info/{agentId}      — info + deployedApis
 *     GET  /api/proxy/agent-status/{agentId}    — runtime status
 *
 *   Authenticated (always require JWT):
 *     GET  /agents/{agentId}                    — full agent details
 *     POST /api/agents/{agentId}/run            — full MCP tool-loop run
 *
 *   Marketplace (JWT required in practice):
 *     GET  /api/marketplace/agents              — list public agents
 *     GET  /api/marketplace/agents/{id}         — single agent details
 */

import { getAccessToken } from '@/stores/auth.store';

const BASE: string =
  (import.meta as any).env?.VITE_KRE_NEXUS_BASE_URL ||
  'https://kre-agentic-backend-113875395623.us-central1.run.app';

/** Read the user's ForgeQ JWT from the auth store. Falls back to a
 *  localStorage probe in case the store hasn't hydrated yet. */
function forgeqJwt(): string | null {
  try {
    const t = getAccessToken();
    if (t) return t;
  } catch { /* fall through */ }
  try {
    const ls = localStorage.getItem('forgefuzz.auth');
    if (!ls) return null;
    const parsed = JSON.parse(ls);
    return parsed?.state?.accessToken ?? null;
  } catch { return null; }
}

/* ────────────────────────── Types ─────────────────────────────────────── */

export interface KreDeployedApi {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  url: string;
  label: string;
  public_token_limit?: number;
}

export interface KreDeploymentInfo {
  url: string;
  status?: string;
  serviceName?: string;
  region?: string;
}

export interface KreAgentSummary {
  id: string;
  name: string;
  description?: string;
  status?: string;              // active | draft | deploy_failed | deploying
  category?: string;
  vendor?: string;
  tags?: string[];
  capabilities?: string[];
  tools?: string[];
  deploymentInfo?: KreDeploymentInfo;
  deployedApis?: KreDeployedApi[];
  public_token_limit?: number;
}

export interface KreTokenUsage {
  tokensUsed: number;
  tokenLimit: number;
  remaining: number;
}

export interface KreChatResponse {
  status: number;
  body: {
    response?: string;
    tool_calls?: any[];
    session_id?: string;
    error?: string;
    token_limit_exceeded?: boolean;
    public_token_usage?: KreTokenUsage;
    tokensUsed?: number;
    tokenLimit?: number;
  };
  latency_ms: number;
}

export interface KreAuthRunResponse {
  ok: boolean;
  answer?: string;
  tool_calls?: any[];
  session_id?: string;
  error?: string;
  token_limit_exceeded?: boolean;
}

/* ────────────────────────── Helpers ───────────────────────────────────── */

function authHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = (token ?? forgeqJwt() ?? '').trim();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/** Same as authHeaders but for GET / no-body requests (omits Content-Type). */
function authHeadersGet(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const t = (forgeqJwt() ?? '').trim();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return { error: `HTTP ${r.status} ${r.statusText}` };
  }
}

/* ────────────────────────── API ───────────────────────────────────────── */

/** Public marketplace list — KRE Nexus requires a ForgeQ JWT even on
 *  the "marketplace" route, so we always attach the user's access token. */
export async function listMarketplaceAgents(): Promise<KreAgentSummary[]> {
  const r = await fetch(`${BASE}/api/marketplace/agents`, {
    method: 'GET',
    headers: authHeadersGet(),
  });
  if (!r.ok) throw new Error(`Marketplace fetch failed (${r.status})`);
  const data = await r.json();
  // The KRE API may wrap items in {agents:[]} or return a bare array. Be tolerant.
  if (Array.isArray(data)) return data as KreAgentSummary[];
  if (Array.isArray(data?.agents)) return data.agents as KreAgentSummary[];
  if (Array.isArray(data?.items)) return data.items as KreAgentSummary[];
  return [];
}

/** Single agent — sandbox info route. Returns `deployedApis`. */
export async function getAgentInfo(agentId: string): Promise<KreAgentSummary> {
  const r = await fetch(`${BASE}/api/proxy/agent-info/${encodeURIComponent(agentId)}`, {
    method: 'GET',
    headers: authHeadersGet(),
  });
  const j = await safeJson(r);
  // The sandbox wraps everything in { status, body, latency_ms }.
  const body = j?.body ?? j;
  return { id: agentId, ...body } as KreAgentSummary;
}

/** Single marketplace agent — auth attached if available. */
export async function getMarketplaceAgent(agentId: string): Promise<KreAgentSummary> {
  const r = await fetch(`${BASE}/api/marketplace/agents/${encodeURIComponent(agentId)}`, {
    method: 'GET',
    headers: authHeadersGet(),
  });
  if (!r.ok) throw new Error(`Marketplace agent fetch failed (${r.status})`);
  return r.json();
}

/** Sandbox chat. Auth header attached when a token is available. */
export async function sandboxChat(
  agentId: string,
  message: string,
  sessionId?: string | null,
): Promise<KreChatResponse> {
  const r = await fetch(`${BASE}/api/proxy/agent-chat/${encodeURIComponent(agentId)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, session_id: sessionId ?? null }),
  });
  const data = await safeJson(r);
  return data as KreChatResponse;
}

/** Sandbox run task. Auth header attached when a token is available. */
export async function sandboxRun(
  agentId: string,
  input: string,
): Promise<KreChatResponse> {
  const r = await fetch(`${BASE}/api/proxy/agent-run/${encodeURIComponent(agentId)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ input }),
  });
  return (await safeJson(r)) as KreChatResponse;
}

/** Sandbox agent status. */
export async function sandboxStatus(agentId: string): Promise<any> {
  const r = await fetch(`${BASE}/api/proxy/agent-status/${encodeURIComponent(agentId)}`, {
    method: 'GET',
    headers: authHeadersGet(),
  });
  return safeJson(r);
}

/** Authenticated agent run via the platform runner (full MCP tool-loop). */
export async function authenticatedRun(
  agentId: string,
  message: string,
  token: string,
  sessionId?: string | null,
  context?: Record<string, unknown>,
): Promise<KreAuthRunResponse> {
  const r = await fetch(`${BASE}/api/agents/${encodeURIComponent(agentId)}/run`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      message,
      session_id: sessionId ?? null,
      context: context ?? {},
    }),
  });
  return (await safeJson(r)) as KreAuthRunResponse;
}

/** Authenticated agent detail (full payload incl. deployedApis). */
export async function getAuthenticatedAgent(
  agentId: string,
  token: string,
): Promise<KreAgentSummary> {
  const r = await fetch(`${BASE}/agents/${encodeURIComponent(agentId)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error(`Agent fetch failed (${r.status})`);
  return r.json();
}

/** Direct cloud-run health check on the agent's own service URL. */
export async function directHealth(deploymentUrl: string): Promise<any> {
  const r = await fetch(`${deploymentUrl.replace(/\/$/, '')}/health`, {
    method: 'GET',
  });
  return safeJson(r);
}

/** The KRE base URL we're talking to — exported for UI banners. */
export const KRE_NEXUS_BASE = BASE;
