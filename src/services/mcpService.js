// src/services/mcpService.js
//
// Thin wrappers around every MCP backend endpoint we ship.
// Base: /api/v1/requests/mcp/**  — same microservice as the rest of the app,
// so we reuse `requestApi` (the axios instance configured in apiClient.js).
//
// The backend DTOs use SNAKE_CASE (Jackson default for this service), while
// the UI speaks camelCase. We bridge both directions here so no component
// needs to care:
//   • outgoing payloads are converted to snake_case for known wrapper fields
//   • incoming items get camelCase aliases added back on top of the original
//     snake_case keys, and a normalized `healthStatus` string derived from
//     `is_healthy` boolean.
// User-authored JSON (tool arguments, auth headers, fixtures, assertion
// values, MCP tool responses, AI-generated test cases) is NEVER touched —
// we only transform the known wrapper fields.

import { requestApi, USER_ID } from '../lib/apiClient';

const BASE = '/api/v1/requests/mcp';

// ─────────────────────────────────────────────────────────────────────────────
// Case-conversion helpers — surgical, top-level only
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize a server record coming back from the API. */
const normalizeServerItem = (s) => {
  if (!s || typeof s !== 'object') return s;
  const isHealthy   = s.isHealthy ?? s.is_healthy;
  const healthStatus = s.healthStatus ?? (
    isHealthy === true  ? 'healthy'   :
    isHealthy === false ? 'unhealthy' :
                          'unknown'
  );
  return {
    ...s,
    id:                 s.id ?? s.server_id,
    workspaceId:        s.workspaceId ?? s.workspace_id,
    createdBy:          s.createdBy ?? s.created_by,
    serverUrl:          s.serverUrl ?? s.server_url,
    authHeaders:        fromKvArray(s.authHeaders ?? s.auth_headers),
    protocolVersion:    s.protocolVersion ?? s.protocol_version,
    lastConnectedAt:    s.lastConnectedAt ?? s.last_connected_at,
    lastProbedAt:       s.lastProbedAt ?? s.last_probed_at ?? s.last_connected_at,
    lastProbeLatencyMs: s.lastProbeLatencyMs ?? s.last_probe_latency_ms,
    isHealthy,
    healthStatus,
    createdAt:          s.createdAt ?? s.created_at,
    updatedAt:          s.updatedAt ?? s.updated_at,
  };
};

/** Normalize any list shape to an array of normalized items. */
const normalizeList = (data, normalizer) => {
  const items = Array.isArray(data) ? data : (data?.items || []);
  return items.map(normalizer);
};

/** Convert a map like {"X-User-Id": "abc"} to the backend's
 *  KeyValueEntry array shape: [{ key: "X-User-Id", value: "abc" }]. Accepts
 *  null, already-array, or object — always returns array-or-null. */
const toKvArray = (h) => {
  if (h == null || h === '') return null;
  if (Array.isArray(h)) return h;
  if (typeof h === 'object') {
    return Object.entries(h).map(([key, value]) => ({ key, value: String(value) }));
  }
  return null;
};

/** Reverse direction — backend returns KeyValueEntry array; the UI textarea
 *  prefers a plain object map for readability. */
const fromKvArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  const out = {};
  for (const { key, value } of arr) if (key) out[key] = value;
  return out;
};

/** Outgoing server payload → snake_case keys the backend expects. */
const toServerPayload = (p = {}) => ({
  workspace_id:     p.workspaceId     ?? p.workspace_id     ?? null,
  name:             p.name            ?? null,
  description:      p.description     ?? null,
  server_url:       p.serverUrl       ?? p.server_url       ?? null,
  transport:        p.transport       ?? null,
  auth_headers:     toKvArray(p.authHeaders ?? p.auth_headers),
  protocol_version: p.protocolVersion ?? p.protocol_version ?? null,
});

/** Outgoing collection payload with nested steps normalized.
 *  Backend's Step model expects `method` + `target` (not kind + toolName),
 *  and Assertions expect `expected` (not `value`). We translate here so the
 *  UI can keep its friendlier vocabulary. */
const KIND_TO_METHOD = {
  tool:     'tools/call',
  resource: 'resources/read',
  prompt:   'prompts/get',
  ping:     'ping',
};
const LATENCY_ASSERT_TYPE = 'latency_below_ms';

/** Map legacy UI assertion type ids to backend-supported names so existing
 *  collections created before the type overhaul keep working once re-saved. */
const LEGACY_ASSERT_TYPE = {
  status:         'success',
  equals:         'json_path_equals',
  maxLatencyMs:   'latency_below_ms',
  max_latency_ms: 'latency_below_ms',
};
const migrateAssertionType = (t) => LEGACY_ASSERT_TYPE[t] ?? t;

const normalizeAssertionOut = (a = {}) => {
  const type = migrateAssertionType(a.type ?? null);
  let expected = a.expected ?? a.value ?? null;
  // latency_below_ms expects a number
  if (type === LATENCY_ASSERT_TYPE && expected != null && expected !== '') {
    const n = Number(expected);
    expected = Number.isFinite(n) ? n : expected;
  }
  return {
    type,
    path:     a.path ?? null,
    expected,
    message:  a.message ?? null,
  };
};

const toCollectionPayload = (p = {}) => ({
  workspace_id: p.workspaceId ?? p.workspace_id ?? null,
  server_id:    p.serverId    ?? p.server_id    ?? null,
  name:         p.name ?? null,
  description:  p.description ?? null,
  steps: (p.steps || []).map(s => {
    const kind   = s.kind ?? 'tool';
    const method = s.method ?? KIND_TO_METHOD[kind] ?? 'ping';
    const target = kind === 'ping' ? null : (s.target ?? s.toolName ?? s.tool_name ?? null);
    return {
      id:         s.id ?? null,
      name:       s.name ?? null,
      method,
      target,
      arguments:  s.arguments ?? {},        // user-authored — keep as-is
      assertions: (s.assertions ?? []).map(normalizeAssertionOut),
    };
  }),
});

/** Convert user-authored fixture sub-items to the backend's snake_case keys.
 *  Only known wrapper fields are renamed; the nested `response`, `content`,
 *  `template`, `arguments` payloads stay untouched. */
const normalizeToolFixture = (t = {}) => {
  const { inputSchema, input_schema, ...rest } = t;
  return { ...rest, input_schema: input_schema ?? inputSchema ?? null };
};
const normalizeResourceFixture = (r = {}) => {
  const { mimeType, mime_type, ...rest } = r;
  return { ...rest, mime_type: mime_type ?? mimeType ?? null };
};
const normalizePromptFixture = (p = {}) => {
  // Backend stores `template` as a single String (not array). If the UI
  // authored a `messages` array (MCP shape), extract the first text part
  // as a clean template string; otherwise serialize to JSON so nothing is
  // lost.
  const { messages, template, ...rest } = p;
  let tpl = template ?? null;
  if (tpl == null && Array.isArray(messages) && messages.length) {
    const first = messages[0];
    const textPart = first?.content?.text
      ?? (typeof first?.content === 'string' ? first.content : null);
    tpl = textPart ?? JSON.stringify(messages);
  } else if (tpl != null && typeof tpl !== 'string') {
    tpl = typeof tpl === 'object' ? JSON.stringify(tpl) : String(tpl);
  }
  return { ...rest, template: tpl };
};

/** Outgoing mock payload. Backend stores tools/resources/prompts at TOP LEVEL
 *  (not nested under `fixtures`), so we spread them out and rename the known
 *  camelCase keys inside each item. */
const toMockPayload = (p = {}) => {
  const fx = p.fixtures || {};
  const tools     = fx.tools     ?? p.tools     ?? [];
  const resources = fx.resources ?? p.resources ?? [];
  const prompts   = fx.prompts   ?? p.prompts   ?? [];
  return {
    workspace_id: p.workspaceId ?? p.workspace_id ?? null,
    name:         p.name ?? null,
    slug:         p.slug ?? null,
    description:  p.description ?? null,
    enabled:      p.enabled !== false,
    tools:     tools.map(normalizeToolFixture),
    resources: resources.map(normalizeResourceFixture),
    prompts:   prompts.map(normalizePromptFixture),
  };
};

/** Normalize a collection record. Reverse-maps backend `method`/`target` to
 *  the UI's `kind`/`toolName` vocabulary, and exposes `value` mirrors on
 *  assertions so the existing editor keeps working. */
const METHOD_TO_KIND = {
  'tools/call':     'tool',
  'resources/read': 'resource',
  'prompts/get':    'prompt',
  'ping':           'ping',
};

const normalizeCollectionItem = (c) => {
  if (!c || typeof c !== 'object') return c;
  return {
    ...c,
    id:            c.id ?? c.collection_id,
    workspaceId:   c.workspaceId ?? c.workspace_id,
    serverId:      c.serverId ?? c.server_id,
    createdBy:     c.createdBy ?? c.created_by,
    createdAt:     c.createdAt ?? c.created_at,
    updatedAt:     c.updatedAt ?? c.updated_at,
    steps: (c.steps || []).map(s => {
      const method = s.method ?? null;
      const kind   = s.kind ?? METHOD_TO_KIND[method] ?? 'tool';
      const target = s.target ?? s.tool_name ?? s.toolName ?? null;
      return {
        ...s,
        method,
        target,
        kind,
        toolName: target,
        assertions: (s.assertions || []).map(a => ({
          ...a,
          type:  migrateAssertionType(a.type),
          value: a.value ?? a.expected ?? '',
        })),
      };
    }),
  };
};

/** Normalize a mock record. Backend stores tools/resources/prompts at top
 *  level, but the UI's fixtures editor reads/writes them as one `fixtures`
 *  object — so we synthesize `fixtures` here for round-trip convenience. */
const normalizeMockItem = (m) => {
  if (!m || typeof m !== 'object') return m;
  const fixtures = m.fixtures ?? {
    tools:     m.tools     || [],
    resources: m.resources || [],
    prompts:   m.prompts   || [],
  };
  return {
    ...m,
    id:          m.id ?? m.mock_id,
    workspaceId: m.workspaceId ?? m.workspace_id,
    createdBy:   m.createdBy ?? m.created_by,
    createdAt:   m.createdAt ?? m.created_at,
    updatedAt:   m.updatedAt ?? m.updated_at,
    fixtures,
  };
};

/** Derive backend base URL from apiClient's `requestApi` instance. */
export const getApiRoot = () => {
  const b = requestApi?.defaults?.baseURL || '';
  return b.replace(/\/api\/v1\/requests\/?$/, '').replace(/\/+$/, '');
};

// ─────────────────────────────────────────────────────────────────────────────
// Status / Health
// ─────────────────────────────────────────────────────────────────────────────
export const mcpStatus         = () => requestApi.get(`${BASE}/status`);
export const mcpBreakerState   = (params) => requestApi.get(`${BASE}/status/breaker`, { params });

// ─────────────────────────────────────────────────────────────────────────────
// Inspector — tools / resources / prompts / benchmark
// ─────────────────────────────────────────────────────────────────────────────
//
// Backend wraps every inspect response in an envelope:
//   { method, parsed_result: {...}, is_success, status_code, latency_ms,
//     session_id, trace_steps, response_headers, notifications, ... }
//
// The UI only cares about the payload + a couple of meta fields, so we
// unwrap here. `_raw` is preserved in case any advanced screen wants trace
// steps etc.
const unwrapInspect = (envelope) => {
  if (!envelope || typeof envelope !== 'object') return envelope;
  // Only unwrap when the backend's "inspect envelope" shape is detected.
  // Other endpoints (connect / ping / validate / etc) return flat payloads
  // and must be left untouched.
  const hasEnvelopeShape =
    'parsed_result' in envelope ||
    'is_success' in envelope ||
    ('method' in envelope && 'trace_steps' in envelope);
  if (!hasEnvelopeShape) return envelope;

  const payload = envelope.parsed_result ?? {};
  // Attach useful meta so `StatusBadge` + `Clock` pills in UI stay populated
  return {
    ...payload,
    _method:        envelope.method,
    _success:       envelope.is_success,
    _statusCode:    envelope.status_code,
    _latencyMs:     envelope.latency_ms,
    _sessionId:     envelope.session_id,
    _traceSteps:    envelope.trace_steps,
    _notifications: envelope.notifications,
    _responseHeaders: envelope.response_headers,
    _errorMessage:  envelope.error_message,
    _raw:           envelope,
  };
};

/** Some inspect endpoints (tools/call, resources/read, prompts/get, benchmark)
 *  expect the ServerRef nested under a `server` key:
 *    { server: {...}, tool_name, arguments }
 *  The UI passes a flat payload (spread of serverRef + extras); this helper
 *  separates them so the backend contract is satisfied while the UI stays
 *  shape-agnostic. Idempotent — if `server` is already set, we leave it. */
const SERVER_REF_KEYS = [
  'server_id', 'server_url', 'transport', 'auth_headers',
  'protocol_version', 'workspace_id', 'user_id',
];
const nestServer = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return payload;
  if (payload.server && typeof payload.server === 'object') return payload;
  const server = {};
  const rest = {};
  for (const [k, v] of Object.entries(payload)) {
    if (SERVER_REF_KEYS.includes(k)) server[k] = v;
    else rest[k] = v;
  }
  return { ...rest, server };
};

const unwrapRes = async (promise) => {
  const res = await promise;
  res.data = unwrapInspect(res.data);
  return res;
};

export const mcpConnect        = (serverRef) => unwrapRes(requestApi.post(`${BASE}/inspect/connect`, serverRef));
export const mcpDisconnect     = (serverRef) => unwrapRes(requestApi.post(`${BASE}/inspect/disconnect`, serverRef));
export const mcpPing           = (serverRef) => unwrapRes(requestApi.post(`${BASE}/inspect/ping`, serverRef));

export const mcpListTools      = (serverRef) => unwrapRes(requestApi.post(`${BASE}/inspect/tools/list`, serverRef));
export const mcpCallTool       = (payload = {})  => {
  const p = { ...payload, name: payload.name ?? payload.tool_name ?? null };
  return unwrapRes(requestApi.post(`${BASE}/inspect/tools/call`, nestServer(p)));
};
export const mcpValidateArgs   = (payload = {})  => {
  const p = { ...payload, name: payload.name ?? payload.tool_name ?? null };
  return unwrapRes(requestApi.post(`${BASE}/inspect/tools/validate`, nestServer(p)));
};

export const mcpListResources       = (serverRef) => unwrapRes(requestApi.post(`${BASE}/inspect/resources/list`, serverRef));
export const mcpReadResource        = (payload)  => unwrapRes(requestApi.post(`${BASE}/inspect/resources/read`, nestServer(payload)));
export const mcpListResourceTemplates = (serverRef) => unwrapRes(requestApi.post(`${BASE}/inspect/resources/templates`, serverRef));

export const mcpListPrompts    = (serverRef) => unwrapRes(requestApi.post(`${BASE}/inspect/prompts/list`, serverRef));
export const mcpGetPrompt      = (payload = {})  => {
  // Backend expects the JSON-RPC `name` field — some builds call it
  // `prompt_name`, others call it `name`. Send both to be safe.
  const p = { ...payload, name: payload.name ?? payload.prompt_name ?? null };
  return unwrapRes(requestApi.post(`${BASE}/inspect/prompts/get`, nestServer(p)));
};

export const mcpBenchmark      = (payload = {}) => {
  const p = { ...payload, name: payload.name ?? payload.tool_name ?? null };
  return requestApi.post(`${BASE}/inspect/benchmark`, nestServer(p));
};

// ─────────────────────────────────────────────────────────────────────────────
// Server Registry (saved servers)
// ─────────────────────────────────────────────────────────────────────────────
export const mcpListServers = async (workspaceId) => {
  const res = await requestApi.get(`${BASE}/servers`, { params: { workspaceId } });
  res.data = normalizeList(res.data, normalizeServerItem);
  return res;
};
export const mcpGetServer = async (id) => {
  const res = await requestApi.get(`${BASE}/servers/${id}`);
  res.data = normalizeServerItem(res.data);
  return res;
};
export const mcpCreateServer = async (payload) => {
  const res = await requestApi.post(`${BASE}/servers`, toServerPayload(payload));
  res.data = normalizeServerItem(res.data);
  return res;
};
export const mcpUpdateServer = async (id, payload) => {
  const res = await requestApi.put(`${BASE}/servers/${id}`, toServerPayload(payload));
  res.data = normalizeServerItem(res.data);
  return res;
};
export const mcpDeleteServer = (id) => requestApi.delete(`${BASE}/servers/${id}`);
export const mcpProbeServer  = async (id) => {
  const res = await requestApi.post(`${BASE}/servers/${id}/probe`);
  res.data = normalizeServerItem(res.data);
  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// Call History
// ─────────────────────────────────────────────────────────────────────────────
/** Spring `Page<>` responses arrive as `{ content, totalElements, ... }`.
 *  Normalize them to a flat array so the UI doesn't need to care. */
const unwrapPage = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items))   return data.items;
  return [];
};
/** Map UI's friendlier `limit` to Spring's `size` query param. */
const toPageParams = (p = {}) => {
  const { limit, size, page, ...rest } = p || {};
  return { ...rest, size: size ?? limit ?? 20, page: page ?? 0 };
};

export const mcpListHistory    = async (params) => {
  const res = await requestApi.get(`${BASE}/history`, { params: toPageParams(params) });
  res.data = unwrapPage(res.data);
  return res;
};
export const mcpDeleteHistory  = (id)      => requestApi.delete(`${BASE}/history/${id}`);
export const mcpBulkDeleteHistory = (params) => requestApi.delete(`${BASE}/history`, { params });

// ─────────────────────────────────────────────────────────────────────────────
// Collections (batch runs + assertions)
// ─────────────────────────────────────────────────────────────────────────────
export const mcpListCollections = async (workspaceId) => {
  const res = await requestApi.get(`${BASE}/collections`, { params: { workspaceId } });
  res.data = normalizeList(res.data, normalizeCollectionItem);
  return res;
};
export const mcpGetCollection = async (id) => {
  const res = await requestApi.get(`${BASE}/collections/${id}`);
  res.data = normalizeCollectionItem(res.data);
  return res;
};
export const mcpCreateCollection = async (payload) => {
  const res = await requestApi.post(`${BASE}/collections`, toCollectionPayload(payload));
  res.data = normalizeCollectionItem(res.data);
  return res;
};
export const mcpUpdateCollection = async (id, payload) => {
  const res = await requestApi.put(`${BASE}/collections/${id}`, toCollectionPayload(payload));
  res.data = normalizeCollectionItem(res.data);
  return res;
};
export const mcpDeleteCollection    = (id)          => requestApi.delete(`${BASE}/collections/${id}`);
export const mcpRunCollection       = (id, runBy) => {
  // Backend requires `runBy` to be a UUID. Reuse the same USER_ID that
  // apiClient's interceptor sends via the `X-User-Id` header, so audit
  // logging stays consistent across headers and query params.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const explicit = UUID_RE.test(runBy || '') ? runBy : null;
  const fallback = UUID_RE.test(USER_ID || '') ? USER_ID : null;
  const finalRunBy = explicit || fallback;
  const params = finalRunBy ? { runBy: finalRunBy } : {};
  return requestApi.post(`${BASE}/collections/${id}/run`, null, { params });
};

export const mcpListCollectionRuns  = async (id, params)  => {
  const res = await requestApi.get(`${BASE}/collections/${id}/runs`, { params: toPageParams(params) });
  res.data = unwrapPage(res.data);
  return res;
};
export const mcpGetCollectionRun    = (runId)       => requestApi.get(`${BASE}/collections/runs/${runId}`);
export const mcpListWorkspaceRuns   = async (params) => {
  const res = await requestApi.get(`${BASE}/collections/runs`, { params: toPageParams(params) });
  res.data = unwrapPage(res.data);
  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock Server
// ─────────────────────────────────────────────────────────────────────────────
export const mcpListMocks = async (workspaceId) => {
  const res = await requestApi.get(`${BASE}/mock/admin`, { params: { workspaceId } });
  res.data = normalizeList(res.data, normalizeMockItem);
  return res;
};
export const mcpGetMock = async (id) => {
  const res = await requestApi.get(`${BASE}/mock/admin/${id}`);
  res.data = normalizeMockItem(res.data);
  return res;
};
export const mcpCreateMock = async (payload) => {
  const res = await requestApi.post(`${BASE}/mock/admin`, toMockPayload(payload));
  res.data = normalizeMockItem(res.data);
  return res;
};
export const mcpUpdateMock = async (id, payload) => {
  const res = await requestApi.put(`${BASE}/mock/admin/${id}`, toMockPayload(payload));
  res.data = normalizeMockItem(res.data);
  return res;
};
export const mcpDeleteMock  = (id) => requestApi.delete(`${BASE}/mock/admin/${id}`);

// Compose the public live-mock URL for a given slug.
export const mcpMockPublicUrl = (slug) => {
  return `${getApiRoot()}/api/v1/requests/mcp/mock/${encodeURIComponent(slug)}/mcp`;
};

// ─────────────────────────────────────────────────────────────────────────────
// AI — test case generation (Gemini-backed)
// ─────────────────────────────────────────────────────────────────────────────
export const mcpAiStatus         = () => requestApi.get(`${BASE}/ai/status`);
/** Normalize to backend's GenerateRequest shape:
 *  { server: ServerRef, tool_name, count }. UI passes its friendly flat
 *  payload; we nest `server` and map `test_count → count`. */
export const mcpAiGenerateTests  = (payload = {}) => {
  const {
    serverId, server_id, workspaceId, workspace_id, userId, user_id,
    serverUrl, server_url, transport, authHeaders, auth_headers,
    protocolVersion, protocol_version,
    tool_name, toolName, count, test_count, testCount,
    server,
    ...rest
  } = payload;
  const serverPayload = server ?? buildServerRef({
    serverId: serverId ?? server_id,
    workspaceId: workspaceId ?? workspace_id,
    userId: userId ?? user_id,
    serverUrl: serverUrl ?? server_url,
    transport,
    authHeaders: authHeaders ?? auth_headers,
    protocolVersion: protocolVersion ?? protocol_version,
  });
  const body = {
    server: serverPayload,
    tool_name: tool_name ?? toolName ?? null,
    count: Number(count ?? test_count ?? testCount ?? 5) || 5,
    ...rest,
  };
  return requestApi.post(`${BASE}/ai/generate-tool-tests`, body);
};

// ─────────────────────────────────────────────────────────────────────────────
// Claude Desktop export
// ─────────────────────────────────────────────────────────────────────────────
export const mcpExportClaudeConfig          = (serverId, download = false) =>
  requestApi.get(`${BASE}/export/claude-config`, { params: { serverId, download } });
export const mcpExportWorkspaceClaudeConfig = (workspaceId, download = false) =>
  requestApi.get(`${BASE}/export/claude-config/workspace`, { params: { workspaceId, download } });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a ServerRef payload (already snake_case for inspect endpoints). */
export const buildServerRef = ({ serverId, serverUrl, transport, authHeaders,
                                  protocolVersion, workspaceId, userId }) => ({
  server_id: serverId || null,
  server_url: serverUrl || null,
  transport: transport || null,          // 'STREAMABLE_HTTP' | 'SSE' | 'STDIO'
  auth_headers: toKvArray(authHeaders),
  protocol_version: protocolVersion || null,
  workspace_id: workspaceId || null,
  user_id: userId || null,
});
