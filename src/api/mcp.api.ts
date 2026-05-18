/**
 * MCP raw HTTP layer — 1:1 mapping of the 16 `McpXxxController` classes
 * inside `request-mgmt-svc` (port 8083).
 *
 *   page  →  services/mcp.service  →  THIS FILE  →  http://<request svc>
 *
 * Controllers covered:
 *   • McpServerRegistry      /api/v1/requests/mcp/servers
 *   • McpInspector           /api/v1/requests/mcp/inspect/*
 *   • McpStatus              /api/v1/requests/mcp/status[/breaker]
 *   • McpHistory             /api/v1/requests/mcp/history
 *   • McpCatalog             /api/v1/requests/mcp/catalog[/connect]
 *   • McpStudioSettings      /api/v1/requests/mcp/settings
 *   • McpCollection          /api/v1/requests/mcp/collections (test suites)
 *   • McpExport              /api/v1/requests/mcp/export/claude-config[/{id}|/workspace[/{id}]]
 *   • McpAi                  /api/v1/requests/mcp/ai/* (LLM-driven test gen)
 *   • McpAigen               /api/v1/requests/mcp/aigen
 *   • McpMocksAlias          /api/v1/requests/mcp/mocks
 *   • McpRestPreview         /api/v1/requests/mcp/rest/{serverId}/{toolName}
 *   • McpBridge              /api/v1/requests/mcp/bridge/{serverId}/*
 *   • McpHelper              /api/v1/requests/mcp/{tools/list,tools/call,ping}
 *   • McpMockServer          /api/v1/requests/mcp/mock/admin (stand-alone mocks)
 *   • UserBootstrap          /api/v1/requests/users/bootstrap
 *
 * Strict rules: no hard-coded URLs, no business logic; returns the raw
 * server `data` (the global axios interceptor unwraps `ResponseEnvelope`).
 */
import { createHttp } from '@/lib/http';

/* ────── shared types ─────────────────────────────────────────────── */
export type McpTransport = 'STREAMABLE_HTTP' | 'SSE' | 'STDIO';
export type McpStatus    = 'UP' | 'DOWN' | 'UNKNOWN';
export type McpLicense    = 'OPEN_SOURCE' | 'PROPRIETARY';
export type McpPricing    = 'FREE' | 'FREEMIUM' | 'PAID';
export type McpVisibility = 'PUBLIC' | 'RESTRICTED';

export interface McpKv { key: string; value: string }

export interface McpServerDto {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string;
  serverUrl: string;
  transport: McpTransport;
  authHeaders?: McpKv[];
  env?: McpKv[];
  args?: string[];
  protocolVersion?: string;
  status?: McpStatus;
  source?: 'USER' | 'CATALOG' | 'MOCK';
  isMock?: boolean;
  category?: string;
  tags?: string[];
  homepage?: string;
  logoUrl?: string;
  connectedBy?: string;
  connectedByName?: string;
  usageCount?: number;
  lastProbedAt?: string;
  lastProbeMs?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface McpServerRefBody {
  serverId?: string;
  serverUrl?: string;
  transport?: McpTransport;
  authHeaders?: McpKv[];
  protocolVersion?: string;
}

export interface McpToolDto {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface McpResourceDto {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpPromptDto {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

export interface McpHistoryEntryDto {
  id: string;
  kind: string;
  serverId?: string;
  serverUrl?: string;
  userId?: string;
  workspaceId?: string;
  method?: string;
  target?: string;
  ms: number;
  success: boolean;
  statusCode?: number;
  error?: string;
  payload: any;
  /** Parsed request body (JSON-RPC envelope). */
  request?: any;
  /** Parsed response body. */
  response?: any;
  tags?: string[];
  note?: string;
  createdAt: string;
}

export interface McpHistoryListResponse {
  content: McpHistoryEntryDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface McpHistoryStatsDto {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  series: Array<{ date: string; total: number; success: number; failed: number }>;
  byMethod: Record<string, number>;
  topTools: Record<string, number>;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  from: string;
  to: string;
}

export interface McpHistoryFilter {
  workspaceId?: string;
  serverId?: string;
  method?: string;
  status?: 'success' | 'failed';
  q?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

export interface McpCatalogEntryDto {
  slug: string;
  name: string;
  description: string;
  serverUrl: string;
  transport: McpTransport;
  category: string;
  tags?: string[];
  homepage?: string;
  authHelp?: string;
  requiresAuth?: boolean;
  license?: McpLicense;
  pricing?: McpPricing;
  visibility?: McpVisibility;
  official?: boolean;
  popularity?: number;
}

export interface McpCatalogResponse {
  items: McpCatalogEntryDto[];
  categories: string[];
  count: number;
  facets?: {
    license:    Record<string, number>;
    pricing:    Record<string, number>;
    visibility: Record<string, number>;
    official:   Record<string, number>;
  };
}

export interface McpSettingsDto {
  autoConnect: boolean;
  llmProvider: 'gemini' | 'openai' | 'anthropic';
  llmModel: string;
  showFallbackBanner: boolean;
  telemetryConsent: boolean;
}

export interface McpCollectionCallDto {
  toolName: string;
  arguments: any;
  expect?: { contains?: string };
}

export interface McpCollectionDto {
  id: string;
  name: string;
  description?: string;
  serverId: string;
  calls: McpCollectionCallDto[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string;
  lastRunStatus?: 'OK' | 'PARTIAL' | string;
}

export interface McpRunResultDto {
  collectionId: string;
  status: string;
  callCount: number;
  passCount: number;
  failCount: number;
  results: Array<{ toolName: string; arguments: any; result: any; ms: number; success: boolean; error?: string }>;
}

export interface McpRestBridgeDto {
  method: string;
  url: string;
  headers: Record<string, string>;
  sampleBody: any;
  curl: string;
  serverName: string;
  toolName: string;
}

export interface McpAigenCallDto {
  title: string;
  toolName: string;
  arguments: any;
  expect?: { contains?: string; errorContains?: string };
  rationale: string;
}

export interface BootstrapDto {
  user: any;
  workspaceCount: number;
  mcpServerCount: number;
}

/* ────── client + helpers ─────────────────────────────────────────── */
const http = createHttp('request');
const BASE = '/api/v1/requests/mcp';

/** Translate camelCase MCP server ref → snake_case wire schema. */
const refToWire = (ref: McpServerRefBody) => ({
  server_id:        ref.serverId,
  server_url:       ref.serverUrl,
  transport:        ref.transport,
  auth_headers:     ref.authHeaders,
  protocol_version: ref.protocolVersion,
});

/* ====================== bootstrap (user shell) =========================== */
export const apiBootstrap = () =>
  http.get<BootstrapDto>('/api/v1/requests/users/bootstrap').then((r) => r.data);

/* ============================== status =================================== */
/**
 * Backend {@code /mcp/status} only returns {@code {alive, cached_sessions}} —
 * it does not aggregate per-server health. Derive the UP/DOWN/UNKNOWN stat
 * from the registered-servers list ({@code is_healthy} + {@code last_connected_at})
 * so the status pill shows a meaningful value.
 */
export const apiMcpStatus = async () => {
  try {
    const servers = await http
      .get<Array<{ is_healthy: boolean | null; last_connected_at: string | null }>>(
        `${BASE}/servers`,
      )
      .then((r) => r.data);
    const totalServers = Array.isArray(servers) ? servers.length : 0;
    let up = 0;
    let down = 0;
    let unknown = 0;
    for (const s of servers ?? []) {
      if (s.is_healthy === true) up += 1;
      else if (s.is_healthy === false && s.last_connected_at) down += 1;
      else unknown += 1;
    }
    return { service: 'forgeq-request-mgmt-svc', version: '1.0.0', totalServers, up, down, unknown };
  } catch {
    return { service: 'forgeq-request-mgmt-svc', version: '1.0.0', totalServers: 0, up: 0, down: 0, unknown: 0 };
  }
};

export const apiMcpBreaker = () =>
  http
    .get<{ state: string; failureRatio: number; sampleSize: number }>(`${BASE}/status/breaker`)
    .then((r) => r.data);

/* =========================== server registry ============================= */
/**
 * List real MCP servers AND any mock MCP servers the user has created in
 * this workspace. Mocks live in a separate collection server-side, so we
 * fetch both and merge them into one normalised {@link McpServerDto}
 * list with {@code isMock: true / source: 'MOCK'} so the Servers tab
 * filter chips (Mocks / Mine / Catalog) and counts work out of the box.
 * Mock items target the in-process mock endpoint so "Use" → Inspector
 * actually routes through the working mock-JSONRPC handler.
 */
export const apiListMcpServers = async (workspaceId?: string) => {
  const [real, mocks] = await Promise.all([
    http
      .get<McpServerDto[]>(`${BASE}/servers`, { params: workspaceId ? { workspaceId } : {} })
      .then((r) => r.data)
      .catch(() => [] as McpServerDto[]),
    http
      .get<any[]>(`${BASE}/mocks`, { params: workspaceId ? { workspaceId } : {} })
      .then((r) => r.data ?? [])
      .catch(() => [] as any[]),
  ]);
  const mockBase = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8083').replace(/\/+$/, '');
  const mockDtos: McpServerDto[] = (mocks ?? []).map((m) => ({
    id: m.id,
    workspaceId: m.workspace_id ?? m.workspaceId ?? undefined,
    name: m.name ?? 'Mock server',
    description: m.description ?? 'In-process mock MCP server',
    serverUrl: `${mockBase}/api/v1/requests/mcp/mock/${m.slug}/mcp`,
    transport: 'STREAMABLE_HTTP',
    authHeaders: [],
    env: [],
    args: [],
    isMock: true,
    source: 'MOCK',
    status: m.enabled === false ? 'DOWN' : 'UP',
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  } as McpServerDto));
  return [...real, ...mockDtos];
};

export const apiGetMcpServer = (id: string) =>
  http.get<McpServerDto>(`${BASE}/servers/${id}`).then((r) => r.data);

export const apiCreateMcpServer = (body: Partial<McpServerDto>) =>
  http.post<McpServerDto>(`${BASE}/servers`, body).then((r) => r.data);

export const apiUpdateMcpServer = (id: string, body: Partial<McpServerDto>) =>
  http.put<McpServerDto>(`${BASE}/servers/${id}`, body).then((r) => r.data);

export const apiDeleteMcpServer = (id: string) =>
  http.delete<void>(`${BASE}/servers/${id}`).then((r) => r.data);

export const apiProbeMcpServer = (id: string) =>
  http
    .post<{ status: McpStatus; latencyMs: number; error?: string }>(`${BASE}/servers/${id}/probe`)
    .then((r) => r.data);

/* ============================== inspector ================================ */
export const apiMcpConnect = (ref: McpServerRefBody) =>
  http
    .post<{ sessionId: string; capabilities: any; serverInfo: any; transport: McpTransport; protocolVersion: string }>(
      `${BASE}/inspect/connect`,
      { server: refToWire(ref) },
    )
    .then((r) => r.data);

export const apiMcpDisconnect = (ref: McpServerRefBody) =>
  http.post<void>(`${BASE}/inspect/disconnect`, { server: refToWire(ref) }).then((r) => r.data);

export const apiMcpPing = (ref: McpServerRefBody) =>
  http
    .post<{ pong: boolean; ms: number; error?: string }>(`${BASE}/inspect/ping`, { server: refToWire(ref) })
    .then((r) => r.data);

/**
 * Every inspector endpoint returns an {@code McpInvocation} envelope —
 * {@code {method, parsed_result, response_json, is_success, latency_ms, …}}.
 * The actual tool/resource/prompt list lives under {@code parsed_result}.
 * This helper unwraps that envelope into the flat shape the UI expects,
 * falling back to parsing {@code response_json} if the server couldn't
 * pre-parse (e.g. non-JSON content-type).
 */
const unwrapInvocation = <T = any>(env: any): T => {
  if (!env) return {} as T;
  // Already flat? (older / fallback shape)
  if (env.tools || env.resources || env.prompts || env.contents) return env as T;
  if (env.parsed_result && typeof env.parsed_result === 'object') {
    return {
      ...env.parsed_result,
      ms: env.latency_ms,
      fallback: !!env.fallback,
      error: env.error_message,
    } as T;
  }
  // Last resort: parse raw response_json
  if (typeof env.response_json === 'string') {
    try {
      const parsed = JSON.parse(env.response_json);
      const result = parsed?.result ?? parsed;
      return {
        ...result,
        ms: env.latency_ms,
        fallback: !!env.fallback,
        error: env.error_message,
      } as T;
    } catch { /* fall through */ }
  }
  return env as T;
};

export const apiMcpListTools = (ref: McpServerRefBody) =>
  http
    .post<any>(`${BASE}/inspect/tools/list`, { server: refToWire(ref) })
    .then((r) => unwrapInvocation<{ tools: McpToolDto[]; ms: number; fallback?: boolean }>(r.data));

export const apiMcpCallTool = (ref: McpServerRefBody, toolName: string, args: any) =>
  http
    .post<any>(`${BASE}/inspect/tools/call`, {
      server: refToWire(ref), tool_name: toolName, arguments: args,
    })
    .then((r) => {
      const env = r.data ?? {};
      const parsed = unwrapInvocation<any>(env);
      return {
        result: parsed ?? env.parsed_result ?? null,
        ms: env.latency_ms ?? parsed?.ms ?? 0,
        fallback: !!env.fallback,
      } as { result: any; ms: number; fallback?: boolean };
    });

export const apiMcpValidateTool = (
  ref: McpServerRefBody,
  toolName: string,
  args: any,
  schema: any,
) =>
  http
    .post<{ valid: boolean; errors: string[]; toolSchema: any }>(
      `${BASE}/inspect/tools/validate`,
      {
        // Backend's `ValidateArgsRequest` (McpApiDtos.java) requires the
        // `server` field — without it the backend re-runs tools/list
        // against `null` and reports "Tool not found on server: …".
        server: refToWire(ref),
        tool_name: toolName,
        arguments: args,
        // Also forward the cached schema the UI already has. If the
        // backend chooses to honour it (validator can short-circuit on
        // a non-empty toolSchema in the request), that saves one
        // round-trip per validate.
        toolSchema: schema,
      },
    )
    .then((r) => r.data);

export const apiMcpListResources = (ref: McpServerRefBody) =>
  http
    .post<any>(`${BASE}/inspect/resources/list`, { server: refToWire(ref) })
    .then((r) => unwrapInvocation<{ resources: McpResourceDto[]; ms: number }>(r.data));

export const apiMcpReadResource = (ref: McpServerRefBody, uri: string) =>
  http
    .post<any>(`${BASE}/inspect/resources/read`, { server: refToWire(ref), uri })
    .then((r) => unwrapInvocation<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }>(r.data));

export const apiMcpListPrompts = (ref: McpServerRefBody) =>
  http
    .post<any>(`${BASE}/inspect/prompts/list`, { server: refToWire(ref) })
    .then((r) => unwrapInvocation<{ prompts: McpPromptDto[] }>(r.data));

export const apiMcpGetPrompt = (ref: McpServerRefBody, name: string, args?: any) =>
  http
    .post<any>(`${BASE}/inspect/prompts/get`, { server: refToWire(ref), name, arguments: args ?? {} })
    .then((r) => unwrapInvocation<{ messages: Array<{ role: string; content: any }> }>(r.data));

export const apiMcpBenchmark = (
  ref: McpServerRefBody,
  toolName: string,
  args: any,
  iterations = 10,
  concurrency = 1,
) =>
  http
    .post<{
      iterations: number; concurrency: number;
      totalMs: number; p50Ms: number; p95Ms: number; p99Ms: number;
      minMs: number; maxMs: number; errors: number;
    }>(`${BASE}/inspect/benchmark`, {
      server: refToWire(ref), tool_name: toolName, arguments: args,
      iterations, concurrency,
    })
    .then((r) => r.data);

/* =============================== history ================================ */
/** Map backend snake_case fields (method/is_success/latency_ms/executed_at/request_json/response_json)
 *  to the frontend DTO shape (kind/success/ms/createdAt/payload).                                 */
const normalizeHistoryEntry = (raw: any): McpHistoryEntryDto => {
  const parse = (s: any) => {
    if (s == null) return undefined;
    if (typeof s !== 'string') return s;
    try { return JSON.parse(s); } catch { return s; }
  };
  const req = parse(raw.request_json ?? raw.requestJson);
  const res = parse(raw.response_json ?? raw.responseJson);
  return {
    id: raw.id,
    kind: raw.kind ?? raw.method ?? '—',
    method: raw.method,
    target: raw.target,
    serverId: raw.serverId ?? raw.server_id,
    serverUrl: raw.serverUrl ?? raw.server_url,
    userId: raw.userId ?? raw.user_id,
    workspaceId: raw.workspaceId ?? raw.workspace_id,
    ms: raw.ms ?? raw.latency_ms ?? 0,
    success: raw.success ?? raw.is_success ?? false,
    statusCode: raw.statusCode ?? raw.status_code,
    error: raw.error ?? raw.error_message ?? undefined,
    payload: raw.payload ?? { request: req, response: res },
    request: req,
    response: res,
    tags: raw.tags ?? [],
    note: raw.note,
    createdAt: raw.createdAt ?? raw.executed_at ?? new Date().toISOString(),
  };
};

export const apiListMcpHistory = (serverIdOrFilter?: string | McpHistoryFilter, limit = 100) => {
  // Back-compat: old callers pass just `serverId, limit`. New callers pass a filter object.
  const params: Record<string, any> =
    typeof serverIdOrFilter === 'string' || serverIdOrFilter == null
      ? { ...(serverIdOrFilter ? { serverId: serverIdOrFilter } : {}), size: limit }
      : {
          workspaceId: serverIdOrFilter.workspaceId,
          serverId:    serverIdOrFilter.serverId,
          method:      serverIdOrFilter.method,
          status:      serverIdOrFilter.status,
          q:           serverIdOrFilter.q,
          tag:         serverIdOrFilter.tag,
          fromDate:    serverIdOrFilter.fromDate,
          toDate:      serverIdOrFilter.toDate,
          page:        serverIdOrFilter.page ?? 0,
          size:        serverIdOrFilter.size ?? 100,
        };
  // Strip undefined.
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);

  return http
    .get<McpHistoryEntryDto[] | { content: McpHistoryEntryDto[] }>(`${BASE}/history`, { params })
    .then((r) => {
      const body: any = r.data;
      const arr: any[] = Array.isArray(body)
        ? body
        : body && Array.isArray(body.content)
          ? body.content
          : [];
      return arr.map(normalizeHistoryEntry);
    });
};

/** Same as listMcpHistory but returns the full page envelope (total, pageNumber, etc). */
export const apiListMcpHistoryPage = (filter: McpHistoryFilter = {}): Promise<McpHistoryListResponse> => {
  const params = {
    workspaceId: filter.workspaceId, serverId: filter.serverId, method: filter.method,
    status: filter.status, q: filter.q, tag: filter.tag,
    fromDate: filter.fromDate, toDate: filter.toDate,
    page: filter.page ?? 0, size: filter.size ?? 50,
  };
  Object.keys(params).forEach((k) => (params as any)[k] === undefined && delete (params as any)[k]);
  return http.get<any>(`${BASE}/history`, { params }).then((r) => {
    const body: any = r.data;
    if (Array.isArray(body)) {
      const content = body.map(normalizeHistoryEntry);
      return { content, totalElements: content.length, totalPages: 1, number: 0, size: content.length };
    }
    return {
      content:       (body.content || []).map(normalizeHistoryEntry),
      totalElements: body.totalElements ?? 0,
      totalPages:    body.totalPages ?? 1,
      number:        body.number ?? 0,
      size:          body.size ?? 50,
    };
  });
};

export const apiGetMcpHistoryEntry = (id: string): Promise<McpHistoryEntryDto> =>
  http.get<any>(`${BASE}/history/${id}`).then((r) => normalizeHistoryEntry(r.data));

export const apiMcpHistoryStats = (filter: Pick<McpHistoryFilter, 'workspaceId' | 'serverId' | 'fromDate' | 'toDate'> = {}) => {
  const params: Record<string, any> = { ...filter };
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
  return http.get<McpHistoryStatsDto>(`${BASE}/history/stats`, { params }).then((r) => r.data);
};

export const apiMcpHistoryByTool = (serverId: string, target: string, page = 0, size = 50) =>
  http.get<any>(`${BASE}/history/by-tool`, { params: { serverId, target, page, size } })
    .then((r) => {
      const content = (r.data?.content ?? []).map(normalizeHistoryEntry);
      return { ...r.data, content } as McpHistoryListResponse;
    });

export const apiMcpReplayHistory = (id: string) =>
  http.post<any>(`${BASE}/history/${id}/replay`).then((r) => r.data);

export const apiMcpAnnotateHistory = (id: string, body: { tags?: string[]; note?: string }) =>
  http.patch<any>(`${BASE}/history/${id}`, body).then((r) => normalizeHistoryEntry(r.data));

export const apiMcpHistoryExportUrl = (filter: McpHistoryFilter = {}, format: 'csv' | 'json' = 'csv') => {
  const params = new URLSearchParams();
  params.set('format', format);
  Object.entries(filter).forEach(([k, v]) => { if (v != null && v !== '') params.set(k, String(v)); });
  return `${BASE}/history/export?${params.toString()}`;
};

export const apiDeleteMcpHistoryEntry = (id: string) =>
  http.delete<void>(`${BASE}/history/${id}`).then((r) => r.data);

export const apiClearMcpHistory = (serverId?: string) =>
  http
    .delete<void>(`${BASE}/history`, { params: serverId ? { serverId } : {} })
    .then((r) => r.data);

/* =============================== catalog ================================ */
export const apiListMcpCatalog = (params?: {
  category?: string; q?: string;
  license?: McpLicense; pricing?: McpPricing; visibility?: McpVisibility;
  official?: boolean; sort?: 'popular' | 'name';
}) =>
  http.get<McpCatalogResponse>(`${BASE}/catalog`, { params }).then((r) => r.data);

export const apiConnectMcpFromCatalog = (
  slug: string,
  body: { workspaceId?: string; name?: string; serverUrl?: string; transport?: McpTransport; authHeaders?: McpKv[]; env?: McpKv[] },
) =>
  http
    .post<McpServerDto>(`${BASE}/catalog/connect`, { slug, ...body })
    .then((r) => r.data);

/* ============================== settings ================================ */
export const apiGetMcpSettings = () =>
  http.get<McpSettingsDto>(`${BASE}/settings`).then((r) => r.data);

export const apiPatchMcpSettings = (patch: Partial<McpSettingsDto>) =>
  http.patch<McpSettingsDto>(`${BASE}/settings`, patch).then((r) => r.data);

/* =================== suite collections (batch tool calls) ================ */
export const apiListMcpCollections = (serverId?: string) =>
  http
    .get<McpCollectionDto[]>(`${BASE}/collections`, { params: serverId ? { serverId } : {} })
    .then((r) => r.data);

/**
 * The UI talks in "calls" (one tool invocation per row) while the backend
 * models the same thing as {@code steps} with a richer shape (method,
 * target, assertions, continue_on_failure, …). Map the UI shape onto the
 * backend shape here so the one-line AI-Gen save → saved-collection →
 * runner flow actually produces runnable steps instead of an empty list.
 */
const toStepsPayload = (body: any): any => {
  if (!body) return body;
  const out: any = { ...body };
  if (Array.isArray(body.calls) && !body.steps) {
    out.steps = body.calls.map((c: any, i: number) => ({
      id: c.id ?? `step-${i + 1}`,
      name: c.name ?? c.toolName,
      method: c.method ?? 'tools/call',
      target: c.target ?? c.toolName,
      arguments: c.arguments ?? {},
      assertions: [
        // Always assert success so an empty expect at least checks the call ran.
        { type: 'success' },
        ...(c.expect?.contains
          ? [{ type: 'contains', expected: c.expect.contains }]
          : []),
        ...(c.expect?.errorContains
          ? [{ type: 'contains', expected: c.expect.errorContains }]
          : []),
      ],
      continue_on_failure: true,
    }));
    delete out.calls;
  }
  if (body.serverId && !body.server_id) out.server_id = body.serverId;
  return out;
};

export const apiCreateMcpCollection = (body: Partial<McpCollectionDto>) =>
  http.post<McpCollectionDto>(`${BASE}/collections`, toStepsPayload(body)).then((r) => r.data);

export const apiUpdateMcpCollection = (id: string, body: Partial<McpCollectionDto>) =>
  http.put<McpCollectionDto>(`${BASE}/collections/${id}`, toStepsPayload(body)).then((r) => r.data);

export const apiDeleteMcpCollection = (id: string) =>
  http.delete<void>(`${BASE}/collections/${id}`).then((r) => r.data);

/**
 * Backend returns {@code total_steps / passed_steps / failed_steps / step_results};
 * UI wants {@code callCount / passCount / failCount / results}. Normalise here
 * so the toast ("{pass}/{total} passed") and the run-rail renderer stay simple.
 */
export const apiRunMcpCollection = (id: string) =>
  http.post<any>(`${BASE}/collections/${id}/run`).then((r) => {
    const d = r.data ?? {};
    if (d.callCount != null || d.passCount != null) return d as McpRunResultDto;
    const rawSteps: any[] = Array.isArray(d.step_results) ? d.step_results : [];
    return {
      collectionId: d.collection_id ?? d.collectionId ?? id,
      status: d.status ?? 'unknown',
      callCount: d.total_steps ?? rawSteps.length ?? 0,
      passCount: d.passed_steps ?? 0,
      failCount: d.failed_steps ?? 0,
      results: rawSteps.map((s) => ({
        toolName: s.target ?? s.step_name ?? '',
        arguments: s.arguments ?? {},
        result: s.result ?? null,
        ms: s.latency_ms ?? s.duration_ms ?? 0,
        success: s.passed === true || s.status === 'passed',
        error: s.error_message ?? undefined,
      })),
    } as McpRunResultDto;
  });

/* ===================== claude-config export (download URL) =============== */
/**
 * Java exposes `/export/claude-config?serverId=…` and a project variant —
 * the UI mostly needs the URL string for an `<a download>` link, so we
 * compute it from the axios baseURL rather than firing a request.
 */
export const apiClaudeConfigUrl = (serverId: string) =>
  `${(http.defaults.baseURL ?? '').replace(/\/$/, '')}${BASE}/export/claude-config/${serverId}`;

export const apiClaudeConfigWorkspaceUrl = (workspaceId: string) =>
  `${(http.defaults.baseURL ?? '').replace(/\/$/, '')}${BASE}/export/claude-config/workspace/${workspaceId}`;

/* ============================== mocks alias ============================== */
export const apiListMcpMocks = (workspaceId?: string) =>
  http
    .get<McpServerDto[]>(`${BASE}/mocks`, { params: workspaceId ? { workspaceId } : {} })
    .then((r) => r.data);

export const apiCreateMcpMock = (body: { name: string; description?: string; workspaceId?: string; tools?: McpToolDto[] }) => {
  /* Backend's McpMockServer maps `workspace_id` (snake_case) via JsonProperty;
   * sending camelCase `workspaceId` silently drops to null and the mock
   * never shows up in the workspace-scoped list. Also normalise
   * `tools[].inputSchema` → `input_schema` for the same reason. */
  const payload: any = {
    name: body.name,
    description: body.description,
    workspace_id: body.workspaceId,
    tools: (body.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: (t as any).inputSchema ?? (t as any).input_schema,
    })),
  };
  return http.post<McpServerDto>(`${BASE}/mocks`, payload).then((r) => r.data);
};

export const apiDeleteMcpMock = (id: string) =>
  http.delete<void>(`${BASE}/mocks/${id}`).then((r) => r.data);

/* ============================== REST bridge ============================== */
export const apiBuildMcpRestBridge = (serverId: string, toolName: string) =>
  http
    .get<McpRestBridgeDto>(`${BASE}/rest/${serverId}/${encodeURIComponent(toolName)}`)
    .then((r) => r.data);

/* =============================== AI gen ================================= */
export const apiGenerateMcpAigenSuite = (tool: McpToolDto) =>
  http.post<{ suite: McpAigenCallDto[]; count: number }>(`${BASE}/aigen`, { tool }).then((r) => r.data);
