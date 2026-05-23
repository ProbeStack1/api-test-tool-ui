/**
 * AI Testing service client — talks to `forgeq-ai-testing-svc` on
 * `${VITE_AI_TESTING_SVC_URL}/api/v1/ai-testing/*`.
 *
 * Every endpoint requires a Bearer token (handled by the shared http
 * factory). The workspaceId path-param scopes all data to the active
 * workspace.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('aiTesting');
const BASE = '/api/v1/ai-testing';

export type Provider = 'openai' | 'anthropic' | 'google';
export type SuiteType = 'prompt' | 'chat' | 'agent' | 'rag' | 'tool_calling' | 'safety';
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type ExecutionMode = 'sequential' | 'parallel';
export type Verdict = 'passed' | 'failed' | 'errored' | 'skipped';

export interface Assertion {
  type: string;
  value?: string;
  pattern?: string;
  max?: number;
  caseInsensitive?: boolean;
}

export interface TestCase {
  id?: string;
  suiteId?: string;
  workspaceId?: string;
  name: string;
  input?: string;
  messages?: Array<Record<string, any>>;
  expectedOutput?: string;
  assertions?: Assertion[];
  ragContextDocs?: string[];
  toolCallExpected?: string;
  weight?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestSuite {
  id?: string;
  workspaceId?: string;
  name: string;
  description?: string;
  suiteType?: SuiteType;
  provider?: Provider | string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  config?: Record<string, any>;
  agentConfigId?: string | null;
  tags?: string[];
  createdByEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssertionResult extends Record<string, any> {
  type: string;
  passed: boolean;
  details?: string;
}

export interface TestResult {
  id: string;
  runId: string;
  caseId: string;
  caseName: string;
  verdict: Verdict;
  output?: string;
  errorMessage?: string;
  assertionResults?: AssertionResult[];
  agentTrace?: Array<Record<string, any>>;
  tokensPrompt?: number;
  tokensCompletion?: number;
  costUsd?: number;
  latencyMs?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface TestRun {
  id: string;
  workspaceId: string;
  suiteId: string;
  suiteName: string;
  suiteType?: string;
  provider?: string;
  model?: string;
  executionMode: ExecutionMode;
  parallelism?: number;
  status: RunStatus;
  triggeredByEmail?: string;
  triggerReason?: string;
  baselineRunId?: string;
  isBaseline?: boolean;
  compareModel?: string;
  total?: number;
  passed?: number;
  failed?: number;
  errored?: number;
  totalTokensPrompt?: number;
  totalTokensCompletion?: number;
  totalCostUsd?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface ApiKey {
  id: string;
  provider: string;
  label: string;
  last4: string;
  hint: string;
  createdAt: string;
  createdByEmail?: string;
  revokedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  severity?: string;
  payload?: Record<string, any>;
  costUsd?: number;
  latencyMs?: number;
  createdAt: string;
}

export interface QuickTestResult {
  text?: string | null;
  toolCalls?: Array<Record<string, any>>;
  tokensPrompt?: number;
  tokensCompletion?: number;
  costUsd?: number;
  latencyMs?: number;
  provider?: string;
  model?: string;
  finishReason?: string;
  error?: string | null;
}

export interface Catalog {
  providers: Array<{ id: Provider; label: string; models: string[] }>;
  assertions: Array<{ id: string; label: string }>;
  suiteTypes: SuiteType[];
  executionModes: ExecutionMode[];
}

// ─── unwrap helper ────────────────────────────────────────────────────
// http.ts response interceptor already strips the `{status, code, data}`
// envelope, so by the time we see the response, `r.data` IS the inner
// data object. Just return it directly.
const unwrap = <T>(r: any): T => r?.data;

// ─── catalog ─────────────────────────────────────────────────────────
export const fetchCatalog = (workspaceId: string): Promise<Catalog> =>
  http.get(`${BASE}/workspaces/${workspaceId}/catalog`).then((r) => unwrap<Catalog>(r));

// ─── suites + cases ──────────────────────────────────────────────────
export const listSuites = (workspaceId: string, query = '', page = 0, size = 100) =>
  http.get(`${BASE}/workspaces/${workspaceId}/suites`, { params: { query, page, size } })
      .then((r) => unwrap<{ items: TestSuite[]; total: number }>(r));

export const createSuite = (workspaceId: string, body: TestSuite) =>
  http.post(`${BASE}/workspaces/${workspaceId}/suites`, body).then((r) => unwrap<TestSuite>(r));

export const getSuite = (workspaceId: string, id: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/suites/${id}`).then((r) => unwrap<TestSuite>(r));

export const updateSuite = (workspaceId: string, id: string, body: Partial<TestSuite>) =>
  http.patch(`${BASE}/workspaces/${workspaceId}/suites/${id}`, body).then((r) => unwrap<TestSuite>(r));

export const deleteSuite = (workspaceId: string, id: string) =>
  http.delete(`${BASE}/workspaces/${workspaceId}/suites/${id}`);

export const duplicateSuite = (workspaceId: string, id: string) =>
  http.post(`${BASE}/workspaces/${workspaceId}/suites/${id}/duplicate`).then((r) => unwrap<TestSuite>(r));

export const listCases = (workspaceId: string, suiteId: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/suites/${suiteId}/cases`).then((r) => unwrap<TestCase[]>(r));

export const createCase = (workspaceId: string, suiteId: string, body: TestCase) =>
  http.post(`${BASE}/workspaces/${workspaceId}/suites/${suiteId}/cases`, body).then((r) => unwrap<TestCase>(r));

export const updateCase = (workspaceId: string, suiteId: string, caseId: string, body: Partial<TestCase>) =>
  http.patch(`${BASE}/workspaces/${workspaceId}/suites/${suiteId}/cases/${caseId}`, body)
      .then((r) => unwrap<TestCase>(r));

export const deleteCase = (workspaceId: string, suiteId: string, caseId: string) =>
  http.delete(`${BASE}/workspaces/${workspaceId}/suites/${suiteId}/cases/${caseId}`);

// ─── runs + results ──────────────────────────────────────────────────
export const triggerRun = (workspaceId: string, body: {
  suiteId: string;
  mode?: ExecutionMode;
  parallelism?: number;
  triggerReason?: string;
  compareModel?: string;
  baselineRunId?: string;
}) =>
  http.post(`${BASE}/workspaces/${workspaceId}/runs`, body).then((r) => unwrap<TestRun>(r));

export const listRuns = (workspaceId: string, suiteId?: string, page = 0, size = 50) =>
  http.get(`${BASE}/workspaces/${workspaceId}/runs`, {
    params: { suiteId, page, size },
  }).then((r) => unwrap<{ items: TestRun[]; total: number }>(r));

export const getRun = (workspaceId: string, id: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/runs/${id}`).then((r) => unwrap<TestRun>(r));

export const listResults = (workspaceId: string, runId: string, page = 0, size = 200) =>
  http.get(`${BASE}/workspaces/${workspaceId}/runs/${runId}/results`, { params: { page, size } })
      .then((r) => unwrap<{ items: TestResult[]; total: number }>(r));

export const setBaseline = (workspaceId: string, runId: string) =>
  http.post(`${BASE}/workspaces/${workspaceId}/runs/${runId}/baseline`).then((r) => unwrap<TestRun>(r));

export const clearBaseline = (workspaceId: string, runId: string) =>
  http.delete(`${BASE}/workspaces/${workspaceId}/runs/${runId}/baseline`).then((r) => unwrap<TestRun>(r));

export const rerunRun = (workspaceId: string, runId: string) =>
  http.post(`${BASE}/workspaces/${workspaceId}/runs/${runId}/rerun`).then((r) => unwrap<TestRun>(r));

export const cancelRun = (workspaceId: string, runId: string) =>
  http.post(`${BASE}/workspaces/${workspaceId}/runs/${runId}/cancel`).then((r) => unwrap<TestRun>(r));

// ─── stats ───────────────────────────────────────────────────────────
export interface Stats {
  totalRuns: number;
  succeeded: number;
  failed: number;
  running: number;
  last30Cost: number;
  trend: Array<{
    id: string;
    createdAt: string;
    cost: number;
    passed: number;
    failed: number;
    errored: number;
    avgLatencyMs: number;
  }>;
}

export const fetchStats = (workspaceId: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/stats`).then((r) => unwrap<Stats>(r));

// ─── quick test ──────────────────────────────────────────────────────
export const quickTest = (workspaceId: string, body: {
  provider: string;
  model: string;
  systemPrompt?: string;
  input: string;
  temperature?: number;
  maxTokens?: number;
}) =>
  http.post(`${BASE}/workspaces/${workspaceId}/quick-test`, body).then((r) => unwrap<QuickTestResult>(r));

// ─── keys ────────────────────────────────────────────────────────────
export const listKeys = (workspaceId: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/api-keys`).then((r) => unwrap<ApiKey[]>(r));

export const createKey = (workspaceId: string, body: { provider: string; label?: string; secret: string }) =>
  http.post(`${BASE}/workspaces/${workspaceId}/api-keys`, body).then((r) => unwrap<ApiKey>(r));

export const revokeKey = (workspaceId: string, id: string) =>
  http.delete(`${BASE}/workspaces/${workspaceId}/api-keys/${id}`);

// ─── audit ───────────────────────────────────────────────────────────
export const listAudit = (workspaceId: string, page = 0, size = 100) =>
  http.get(`${BASE}/workspaces/${workspaceId}/audit-log`, { params: { page, size } })
      .then((r) => unwrap<{ items: AuditLogEntry[]; total: number }>(r));

// ─── agents ──────────────────────────────────────────────────────────
export type AgentType  = 'single' | 'multi_sequential' | 'multi_parallel' | 'multi_supervisor';
export type AgentProto = 'direct' | 'mcp' | 'a2a' | 'acp';

export interface AgentConfig {
  id?: string;
  workspaceId?: string;
  name: string;
  agentType: AgentType;
  protocol: AgentProto;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  maxIterations?: number;
  tools?: Array<Record<string, any>>;
  agents?: Array<Record<string, any>>;
  mcpServerId?: string;
  config?: Record<string, any>;
  createdByEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const listAgents   = (workspaceId: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/agents`).then((r) => unwrap<AgentConfig[]>(r));
export const createAgent  = (workspaceId: string, body: AgentConfig) =>
  http.post(`${BASE}/workspaces/${workspaceId}/agents`, body).then((r) => unwrap<AgentConfig>(r));
export const updateAgent  = (workspaceId: string, id: string, body: Partial<AgentConfig>) =>
  http.patch(`${BASE}/workspaces/${workspaceId}/agents/${id}`, body).then((r) => unwrap<AgentConfig>(r));
export const deleteAgent  = (workspaceId: string, id: string) =>
  http.delete(`${BASE}/workspaces/${workspaceId}/agents/${id}`);

// ─── MCP server registry (passthrough to forgeq-request-mgmt-svc) ────
export interface McpServerInfo {
  id: string;
  name: string;
  serverUrl?: string;
  url?: string;
  transport?: string;
  status?: string;
  source?: string;
}

export const listMcpServers = (workspaceId: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/mcp-servers`).then((r) => {
    // Passthrough returns either {items:[]} or a raw array, depending on the
    // request-mgmt-svc registry shape. Normalize to a flat array AND map
    // snake_case fields (server_url / workspace_id) to camelCase so the
    // UI doesn't have to care about source-of-truth shape.
    const d = (r as any)?.data;
    const raw: any[] =
      Array.isArray(d) ? d :
      Array.isArray(d?.items) ? d.items :
      Array.isArray(d?.data)  ? d.data  : [];
    return raw.map((s) => ({
      id:        s.id,
      name:      s.name,
      serverUrl: s.serverUrl ?? s.server_url ?? s.url,
      url:       s.serverUrl ?? s.server_url ?? s.url,
      transport: s.transport,
      status:    s.status ?? (s.last_capabilities ? 'UP' : undefined),
      source:    s.source,
    })) as McpServerInfo[];
  });

// ─── webhooks ────────────────────────────────────────────────────────
export interface WebhookSub {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount?: number;
  lastTriggeredAt?: string;
  lastStatusCode?: number;
  lastError?: string;
  description?: string;
  createdByEmail?: string;
  createdAt?: string;
}

export const listWebhooks   = (workspaceId: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/webhooks`).then((r) => unwrap<WebhookSub[]>(r));
export const createWebhook  = (workspaceId: string, body: { url: string; events: string[]; secret?: string; description?: string }) =>
  http.post(`${BASE}/workspaces/${workspaceId}/webhooks`, body).then((r) => unwrap<WebhookSub>(r));
export const updateWebhook  = (workspaceId: string, id: string, body: Partial<WebhookSub>) =>
  http.patch(`${BASE}/workspaces/${workspaceId}/webhooks/${id}`, body).then((r) => unwrap<WebhookSub>(r));
export const deleteWebhook  = (workspaceId: string, id: string) =>
  http.delete(`${BASE}/workspaces/${workspaceId}/webhooks/${id}`);
export const testWebhook    = (workspaceId: string, id: string) =>
  http.post(`${BASE}/workspaces/${workspaceId}/webhooks/${id}/test`).then((r) => unwrap<{ ok: boolean; statusCode?: number; error?: string }>(r));

// ─── analytics rollup ────────────────────────────────────────────────
export interface AnalyticsModelRow {
  model: string; runs: number; total: number; passed: number; failed: number; errored: number;
  passRate: number; totalCostUsd: number; avgLatencyMs: number;
}
export interface AnalyticsRollup {
  windowDays: number;
  totalRuns: number;
  totalAssertions: number;
  models: AnalyticsModelRow[];
  topFailingAssertions: Array<{ type: string; count: number }>;
  latency: { p50: number; p95: number; p99: number };
  trend: Array<{ day: string; cost: number; runs: number }>;
}

export const fetchAnalytics = (workspaceId: string, days = 30) =>
  http.get(`${BASE}/workspaces/${workspaceId}/analytics`, { params: { days } })
      .then((r) => unwrap<AnalyticsRollup>(r));

// ─── Token usage (per-key / per-model / per-day) ─────────────────────
export interface TokenUsageRollup {
  windowDays: number;
  totalRuns: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokens: number;
  totalCostUsd: number;
  perModel: Array<{ provider: string; model: string; runs: number; tokensIn: number; tokensOut: number; tokens: number; cost: number }>;
  perDay:   Array<{ day: string; runs: number; tokensIn: number; tokensOut: number; tokens: number; cost: number }>;
  keys:     Array<{ id: string; provider: string; label: string; last4: string; createdAt?: string; spendUsd: number; tokensUsed: number }>;
}

export const fetchTokenUsage = (workspaceId: string, days = 30) =>
  http.get(`${BASE}/workspaces/${workspaceId}/token-usage`, { params: { days } })
      .then((r) => unwrap<TokenUsageRollup>(r));

// ─── Agent Testing (playground) ──────────────────────────────────────
export type AgentExecMode = 'single' | 'sequential' | 'parallel' | 'supervisor';

export interface AgentToolDef { name: string; icon: string; description: string }

export interface DirectAgentRunReq {
  mode: AgentExecMode;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  userMessage: string;
  tools?: string[];
  agents?: Array<{
    name: string; role?: string;
    provider: string; model: string;
    systemPrompt?: string; description?: string;
  }>;
  maxIterations?: number;
  temperature?: number;
}

export interface DirectAgentRunResult {
  ok: boolean;
  mode: AgentExecMode;
  finalText?: string;
  trace?: any[];
  supervisor?: { decided: string; tokens: number };
  specialist?: { name: string; model: string; text: string; error?: string };
  totalCostUsd?: number;
  totalTokens?: number;
  latencyMs?: number;
  error?: string;
}

export const listAgentTools = (workspaceId: string) =>
  http.get(`${BASE}/workspaces/${workspaceId}/agent-tools`).then((r) => unwrap<AgentToolDef[]>(r));

export const runDirectAgent = (workspaceId: string, body: DirectAgentRunReq) =>
  http.post(`${BASE}/workspaces/${workspaceId}/agent-run/direct`, body).then((r) => unwrap<DirectAgentRunResult>(r));

export const a2aDiscover = (workspaceId: string, baseUrl: string, headers: Record<string,string>) =>
  http.post(`${BASE}/workspaces/${workspaceId}/agent-run/a2a/discover`, { baseUrl, headers }).then((r) => unwrap<any>(r));
export const a2aSend = (workspaceId: string, baseUrl: string, headers: Record<string,string>, message: string) =>
  http.post(`${BASE}/workspaces/${workspaceId}/agent-run/a2a/send`, { baseUrl, headers, message }).then((r) => unwrap<any>(r));
export const acpSend = (workspaceId: string, baseUrl: string, headers: Record<string,string>, message: string) =>
  http.post(`${BASE}/workspaces/${workspaceId}/agent-run/acp/send`, { baseUrl, headers, message }).then((r) => unwrap<any>(r));
export const mcpListTools = (workspaceId: string, baseUrl: string, extra: Record<string,string> = {}) =>
  http.post(`${BASE}/workspaces/${workspaceId}/agent-run/mcp/list-tools`, { baseUrl, ...extra }).then((r) => unwrap<any>(r));
export const mcpCallTool = (workspaceId: string, baseUrl: string, extra: Record<string,string>, tool: string, args: any) =>
  http.post(`${BASE}/workspaces/${workspaceId}/agent-run/mcp/call`, { baseUrl, ...extra, tool, arguments: args }).then((r) => unwrap<any>(r));
