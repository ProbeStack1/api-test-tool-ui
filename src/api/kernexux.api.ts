/**
 * KRE Nexus marketplace HTTP client.
 *
 *  KRE Nexus is a third-party AI-agent platform. Its production
 *  marketplace endpoints are PUBLIC (no auth) which makes them
 *  ideal for an embedded "browse agents → try in sandbox" flow
 *  inside the ForgeFuzz AI Testing tab.
 *
 *  Endpoints we wrap (all GET / POST against `VITE_KRE_NEXUS_URL`):
 *    GET  /api/marketplace/agents                      → list public agents
 *    GET  /api/marketplace/agents/{id}                 → agent detail
 *    POST /api/proxy/agent-chat/{id}                   → sandbox chat
 *    POST /api/proxy/agent-run/{id}                    → sandbox task run
 *    POST /api/marketplace/agents/{id}/request-access  → ask the owner for full access
 *
 *  We intentionally do NOT go through the ForgeFuzz backend / JWT —
 *  the doc states these are no-auth public endpoints and routing them
 *  through our backend would burn an extra hop + break CORS handling.
 *  All other ForgeFuzz endpoints continue to use the authenticated http
 *  client.
 */
import axios from 'axios';
import { getAccessToken } from '@/stores/auth.store';

/** Base URL — overridable via Vite env. Defaults to the URL pinned in
 *  the senior team's doc so the page works out of the box. */
const KRE_BASE_URL: string =
  (import.meta as any).env.VITE_KRE_NEXUS_URL ||
  (import.meta as any).env.VITE_KRE_NEXUS_BASE_URL ||
  'https://kre-agentic-backend-113875395623.us-central1.run.app';

const client = axios.create({
  baseURL: KRE_BASE_URL,
  timeout: 30_000,
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
});

/** KRE Nexus enforces a ForgeQ JWT on every route (marketplace + sandbox
 *  proxy + auth runner). We attach the user's logged-in token from the
 *  global auth store; if not yet hydrated we probe localStorage so the
 *  first marketplace fetch on app-load still authenticates correctly. */
client.interceptors.request.use((config) => {
  let token: string | null = null;
  try { token = getAccessToken(); } catch { /* store not ready */ }
  if (!token) {
    try {
      const ls = localStorage.getItem('forgefuzz.auth');
      if (ls) token = JSON.parse(ls)?.state?.accessToken ?? null;
    } catch { /* ignore */ }
  }
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ─────────────────────────── types ────────────────────────────────────── */

export interface KreDeployedApi {
  method:     string;          // GET | POST | PUT | DELETE
  path:       string;          // e.g. /api/proxy/agent-chat/{id}
  url:        string;          // absolute URL, ready to copy
  label?:     string;          // human-readable name from KRE response
  description?: string;
  authRequired?: boolean;
  requestBody?: unknown;       // example body (JSON object/string)
  responseFormat?: unknown;    // example response
}

export interface KreDeploymentInfo {
  url?:         string;        // Cloud Run base URL
  status?:      string;        // deployed | deploying | failed
  serviceName?: string;
  region?:      string;
}

export interface KreAgent {
  id:                       string;
  name:                     string;
  description?:             string;
  agentType?:               string;
  ownerName?:               string;
  organization?:            string;
  capabilities?:            string[];
  tools?:                   string[];
  avatarUrl?:               string;
  tags?:                    string[];
  status?:                  'available' | 'maintenance' | 'deprecated' | string;
  publicAccess?:            boolean;
  publicTokenLimit?:        number;    // sandbox token cap per external user
  publicCallsRemaining?:    number;    // optional usage counter (if upstream sends one)
  publicCallLimit?:         number;
  modelName?:               string;
  framework?:               string;
  averageLatencyMs?:        number;
  popularity?:              number;
  lastUpdatedAt?:           string;
  version?:                 string;
  endpoints?:               Array<{ method: string; path: string; description?: string }>;
  deploymentInfo?:          KreDeploymentInfo;
  deployedApis?:            KreDeployedApi[];
}

export interface KreAgentList {
  agents: KreAgent[];
  total?: number;
}

export interface KreChatRequest {
  message:   string;
  sessionId?: string;
  metadata?:  Record<string, unknown>;
}

export interface KreChatResponse {
  reply:           string;
  sessionId?:      string;
  tokensUsed?:     number;
  tokensRemaining?: number;
  latencyMs?:      number;
  raw?:            unknown;
}

export interface KreRunRequest {
  task:      string;
  inputs?:   Record<string, unknown>;
  sessionId?: string;
}

export interface KreRunResponse {
  output:          unknown;
  sessionId?:      string;
  tokensUsed?:     number;
  tokensRemaining?: number;
  latencyMs?:      number;
  raw?:            unknown;
}

/* ─────────────────────────── normalisers ──────────────────────────────── */

/** Defensive — the upstream payload schema is documented but live data
 *  occasionally shifts. We also handle the `{ status, body, latency_ms }`
 *  wrapper used by `/api/proxy/agent-info/{id}` by unwrapping `body`
 *  transparently. Unknown fields are silently ignored. */
function normalizeAgent(raw: any): KreAgent {
  // Auto-unwrap `{ status, body, latency_ms }` envelopes from proxy routes.
  if (raw && raw.body && typeof raw.body === 'object' && (raw.status !== undefined || raw.latency_ms !== undefined)) {
    raw = raw.body;
  }
  return {
    id:                   String(raw.id ?? raw.agentId ?? raw._id ?? raw.agent_id ?? ''),
    name:                 String(raw.name ?? raw.agentName ?? 'Untitled agent'),
    description:          raw.description ?? raw.summary ?? undefined,
    agentType:            raw.agentType ?? raw.type ?? undefined,
    ownerName:            raw.ownerName ?? raw.owner ?? raw.author ?? raw.created_by ?? undefined,
    organization:         raw.organization ?? raw.org ?? undefined,
    capabilities:         Array.isArray(raw.capabilities) ? raw.capabilities : [],
    tools:                Array.isArray(raw.tools) ? raw.tools : [],
    avatarUrl:            raw.avatarUrl ?? raw.avatar ?? undefined,
    tags:                 Array.isArray(raw.tags) ? raw.tags : [],
    status:               raw.status ?? 'available',
    publicAccess:         raw.publicAccess ?? raw.public ?? true,
    publicTokenLimit:     raw.publicTokenLimit ?? raw.public_token_limit ?? raw.tokenLimit ?? undefined,
    publicCallsRemaining: raw.publicCallsRemaining ?? raw.callsRemaining ?? undefined,
    publicCallLimit:      raw.publicCallLimit ?? raw.callLimit ?? undefined,
    modelName:            raw.modelName ?? raw.model ?? raw.model_name ?? undefined,
    framework:            raw.framework ?? undefined,
    averageLatencyMs:     raw.averageLatencyMs ?? raw.avgLatencyMs ?? undefined,
    popularity:           raw.popularity ?? raw.score ?? undefined,
    lastUpdatedAt:        raw.lastUpdatedAt ?? raw.updatedAt ?? raw.updated_at ?? undefined,
    version:              raw.version ?? raw.agent_version ?? undefined,
    endpoints:            Array.isArray(raw.endpoints)
                            ? raw.endpoints.map((e: any) => ({
                                method: String(e.method ?? 'GET').toUpperCase(),
                                path: String(e.path ?? ''),
                                description: e.description ?? undefined,
                              }))
                            : undefined,
    deploymentInfo:       raw.deploymentInfo
                            ? {
                                url:         raw.deploymentInfo.url ?? undefined,
                                status:      raw.deploymentInfo.status ?? undefined,
                                serviceName: raw.deploymentInfo.serviceName ?? raw.deploymentInfo.service_name ?? undefined,
                                region:      raw.deploymentInfo.region ?? undefined,
                              }
                            : undefined,
    deployedApis:         Array.isArray(raw.deployedApis)
                            ? raw.deployedApis.map(normalizeDeployedApi)
                            : [],
  };
}

function normalizeDeployedApi(raw: any): KreDeployedApi {
  return {
    method:         String(raw.method ?? 'GET').toUpperCase(),
    path:           String(raw.path ?? raw.endpoint ?? ''),
    url:            String(raw.url ?? raw.fullUrl ?? ''),
    label:          raw.label ?? undefined,
    description:    raw.description ?? raw.summary ?? raw.label ?? undefined,
    authRequired:   raw.authRequired ?? raw.auth ?? false,
    requestBody:    raw.requestBody ?? raw.body ?? undefined,
    responseFormat: raw.responseFormat ?? raw.response ?? undefined,
  };
}

/* ─────────────────────────── public API ───────────────────────────────── */

export const krenexusApi = {
  /** Marketplace browse — paginated list of public agents. */
  async listAgents(): Promise<KreAgentList> {
    const { data } = await client.get('/api/marketplace/agents');
    // Upstream sometimes returns `{ agents: [...] }`, sometimes a plain array.
    const arr = Array.isArray(data) ? data : (data.agents ?? data.data ?? []);
    const total = (Array.isArray(data) ? data.length : (data.total ?? arr.length));
    return { agents: arr.map(normalizeAgent), total };
  },

  /** Single agent detail with `deployedApis[]` populated. */
  async getAgent(agentId: string): Promise<KreAgent> {
    const { data } = await client.get(`/api/marketplace/agents/${agentId}`);
    const raw = data?.agent ?? data?.data ?? data;
    return normalizeAgent(raw);
  },

  /** Sandbox `/api/proxy/agent-info/{id}` — richest payload with full
   *  `deploymentInfo`, all `deployedApis`, and the public token cap.
   *  Use this when the marketplace endpoint returns sparse data. */
  async getAgentInfo(agentId: string): Promise<KreAgent> {
    const { data } = await client.get(`/api/proxy/agent-info/${agentId}`);
    return normalizeAgent({ id: agentId, ...data });
  },

  /** Sandbox chat (no auth, token-limited). */
  async chat(agentId: string, body: KreChatRequest): Promise<KreChatResponse> {
    const { data } = await client.post(`/api/proxy/agent-chat/${agentId}`, body);
    return {
      reply:           String(data.reply ?? data.message ?? data.output ?? ''),
      sessionId:       data.sessionId ?? body.sessionId,
      tokensUsed:      data.tokensUsed ?? data.usage?.totalTokens ?? undefined,
      tokensRemaining: data.tokensRemaining ?? undefined,
      latencyMs:       data.latencyMs ?? undefined,
      raw:             data,
    };
  },

  /** Sandbox task run (more elaborate than chat — accepts structured inputs). */
  async run(agentId: string, body: KreRunRequest): Promise<KreRunResponse> {
    const { data } = await client.post(`/api/proxy/agent-run/${agentId}`, body);
    return {
      output:          data.output ?? data.result ?? data,
      sessionId:       data.sessionId ?? body.sessionId,
      tokensUsed:      data.tokensUsed ?? undefined,
      tokensRemaining: data.tokensRemaining ?? undefined,
      latencyMs:       data.latencyMs ?? undefined,
      raw:             data,
    };
  },

  /** Ask the agent owner for full (unmetered) access. */
  async requestAccess(agentId: string, msg: { email: string; reason?: string }): Promise<{ ok: boolean }> {
    await client.post(`/api/marketplace/agents/${agentId}/request-access`, msg);
    return { ok: true };
  },
};

export function kreBaseUrl(): string { return KRE_BASE_URL; }
