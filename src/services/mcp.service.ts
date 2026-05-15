/**
 * mcp.service.ts — UI-facing MCP Studio client.
 *
 *   page  →  THIS FILE  →  api/mcp.api  →  http://<request svc>
 *
 * Thin layer: re-exports the type vocabulary and forwards every public
 * function to its `apiXxx` counterpart. All MCP traffic routes through
 * `createHttp('request')` (port 8083) so the Settings panel can repoint
 * the entire surface with a single env var change.
 *
 * Public names are preserved 1:1 so the 10+ MCP Studio components don't
 * need any changes.
 */
import { createHttp } from '@/lib/http';
import {
  apiBootstrap,
  apiBuildMcpRestBridge,
  apiClaudeConfigUrl,
  apiClearMcpHistory,
  apiConnectMcpFromCatalog,
  apiCreateMcpCollection,
  apiCreateMcpMock,
  apiCreateMcpServer,
  apiDeleteMcpCollection,
  apiDeleteMcpHistoryEntry,
  apiDeleteMcpMock,
  apiDeleteMcpServer,
  apiGenerateMcpAigenSuite,
  apiGetMcpServer,
  apiGetMcpSettings,
  apiGetMcpHistoryEntry,
  apiListMcpCatalog,
  apiListMcpCollections,
  apiListMcpHistory,
  apiListMcpHistoryPage,
  apiListMcpMocks,
  apiListMcpServers,
  apiMcpAnnotateHistory,
  apiMcpBenchmark,
  apiMcpBreaker,
  apiMcpCallTool,
  apiMcpConnect,
  apiMcpDisconnect,
  apiMcpGetPrompt,
  apiMcpHistoryByTool,
  apiMcpHistoryExportUrl,
  apiMcpHistoryStats,
  apiMcpListPrompts,
  apiMcpListResources,
  apiMcpListTools,
  apiMcpPing,
  apiMcpReadResource,
  apiMcpReplayHistory,
  apiMcpStatus,
  apiMcpValidateTool,
  apiPatchMcpSettings,
  apiProbeMcpServer,
  apiRunMcpCollection,
  apiUpdateMcpCollection,
  apiUpdateMcpServer,
  type McpAigenCallDto,
  type McpCatalogEntryDto,
  type McpCatalogResponse,
  type McpCollectionCallDto,
  type McpCollectionDto,
  type McpHistoryEntryDto,
  type McpHistoryFilter,
  type McpHistoryListResponse,
  type McpHistoryStatsDto,
  type McpKv,
  type McpLicense,
  type McpPricing,
  type McpPromptDto,
  type McpResourceDto,
  type McpRestBridgeDto,
  type McpServerDto,
  type McpServerRefBody,
  type McpSettingsDto,
  type McpStatus,
  type McpToolDto,
  type McpTransport,
  type McpVisibility,
} from '@/api/mcp.api';

/* ───── exported axios instance + helper (back-compat) ────────────────── */
/** The shared MCP axios instance — kept for components that still call
 *  raw GET/POST with custom params or `responseType: 'blob'`. New code
 *  should prefer the typed `apiXxx` helpers in `@/api/mcp.api`. */
export const mcpApi = createHttp('request');

/** Retained for back-compat: response interceptor in `lib/http.ts` already
 *  unwraps ResponseEnvelope.data, so this is effectively an identity. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unwrap = <T,>(x: any): T => (x && typeof x === 'object' && 'data' in x ? x.data : x) as T;

/* ───── re-exported vocabulary ────────────────────────────────────────── */
export type { McpTransport, McpStatus, McpKv, McpLicense, McpPricing, McpVisibility };
export type McpServer       = McpServerDto;
export type McpServerRef    = McpServerRefBody;
export type McpTool         = McpToolDto;
export type McpResource     = McpResourceDto;
export type McpPrompt       = McpPromptDto;
export type McpHistoryEntry = McpHistoryEntryDto;
export type { McpHistoryFilter, McpHistoryListResponse, McpHistoryStatsDto };
export type McpCatalogEntry = McpCatalogEntryDto;
export type { McpCatalogResponse };
export type McpSettings     = McpSettingsDto;
export type McpCollectionCall = McpCollectionCallDto;
export type McpCollection   = McpCollectionDto;
export type McpRestBridge   = McpRestBridgeDto;
export type McpAigenCall    = McpAigenCallDto;
/** Alias kept for components that still type tool inputs as `McpMockTool`
 *  (functionally identical to `McpTool` — same DTO from the JVM). */
export type McpMockTool     = McpToolDto;

/* ───── Bootstrap / status ─────────────────────────────────────────── */
export const bootstrap    = () => apiBootstrap();
export const status       = () => apiMcpStatus();
export const breakerState = () => apiMcpBreaker();

/* ───── Server registry ────────────────────────────────────────────── */
export const listServers  = (workspaceId?: string) => apiListMcpServers(workspaceId);
export const getServer    = (id: string) => apiGetMcpServer(id);
export const createServer = (body: Partial<McpServer>) => apiCreateMcpServer(body);
export const updateServer = (id: string, body: Partial<McpServer>) => apiUpdateMcpServer(id, body);
export const deleteServer = (id: string) => apiDeleteMcpServer(id);
export const probeServer  = (id: string) => apiProbeMcpServer(id);

/* ───── Inspector ──────────────────────────────────────────────────── */
export const connect       = (ref: McpServerRef) => apiMcpConnect(ref);
export const disconnect    = (ref: McpServerRef) => apiMcpDisconnect(ref);
export const ping          = (ref: McpServerRef) => apiMcpPing(ref);
export const listTools     = (ref: McpServerRef) => apiMcpListTools(ref);
export const callTool      = (ref: McpServerRef, toolName: string, args: any) => apiMcpCallTool(ref, toolName, args);
export const validateTool  = (toolName: string, args: any, schema: any) => apiMcpValidateTool(toolName, args, schema);
export const listResources = (ref: McpServerRef) => apiMcpListResources(ref);
export const readResource  = (ref: McpServerRef, uri: string) => apiMcpReadResource(ref, uri);
export const listPrompts   = (ref: McpServerRef) => apiMcpListPrompts(ref);
export const getPrompt     = (ref: McpServerRef, name: string, args?: any) => apiMcpGetPrompt(ref, name, args);
export const benchmark     = (ref: McpServerRef, toolName: string, args: any, iterations = 10, concurrency = 1) =>
  apiMcpBenchmark(ref, toolName, args, iterations, concurrency);

/* ───── History ────────────────────────────────────────────────────── */
export const listHistory        = (serverIdOrFilter?: string | McpHistoryFilter, limit = 100) => apiListMcpHistory(serverIdOrFilter, limit);
export const listHistoryPage    = (filter?: McpHistoryFilter) => apiListMcpHistoryPage(filter);
export const getHistoryEntry    = (id: string) => apiGetMcpHistoryEntry(id);
export const historyStats       = (filter?: Pick<McpHistoryFilter, 'workspaceId' | 'serverId' | 'fromDate' | 'toDate'>) => apiMcpHistoryStats(filter);
export const historyByTool      = (serverId: string, target: string, page = 0, size = 50) => apiMcpHistoryByTool(serverId, target, page, size);
export const replayHistory      = (id: string) => apiMcpReplayHistory(id);
export const annotateHistory    = (id: string, body: { tags?: string[]; note?: string }) => apiMcpAnnotateHistory(id, body);
export const historyExportUrl   = (filter?: McpHistoryFilter, format: 'csv' | 'json' = 'csv') => apiMcpHistoryExportUrl(filter, format);
export const deleteHistoryEntry = (id: string) => apiDeleteMcpHistoryEntry(id);
export const clearHistory       = (serverId?: string) => apiClearMcpHistory(serverId);

/* ───── Catalog ────────────────────────────────────────────────────── */
export const listCatalog        = (params?: Parameters<typeof apiListMcpCatalog>[0]) => apiListMcpCatalog(params);
export const connectFromCatalog = (
  slug: string,
  body: { workspaceId?: string; name?: string; serverUrl?: string; transport?: McpTransport; authHeaders?: McpKv[]; env?: McpKv[] },
) => apiConnectMcpFromCatalog(slug, body);

/* ───── Settings ──────────────────────────────────────────────────── */
export const getSettings   = () => apiGetMcpSettings();
export const patchSettings = (patch: Partial<McpSettings>) => apiPatchMcpSettings(patch);

/* ───── Suite collections ─────────────────────────────────────────── */
export const listCollections  = (serverId?: string) => apiListMcpCollections(serverId);
export const createCollection = (body: Partial<McpCollection>) => apiCreateMcpCollection(body);
export const updateCollection = (id: string, body: Partial<McpCollection>) => apiUpdateMcpCollection(id, body);
export const deleteCollection = (id: string) => apiDeleteMcpCollection(id);
export const runCollection    = (id: string) => apiRunMcpCollection(id);

/* ───── Claude Desktop config download URL ────────────────────────── */
export const claudeConfigUrl = (serverId: string) => apiClaudeConfigUrl(serverId);

/* ───── Mocks · REST bridge · AI gen (Phase 2) ────────────────────── */
export const listMocks       = (workspaceId?: string) => apiListMcpMocks(workspaceId);
export const createMock      = (body: { name: string; description?: string; workspaceId?: string; tools?: McpToolDto[] }) =>
  apiCreateMcpMock(body);
export const deleteMock      = (id: string) => apiDeleteMcpMock(id);

export const buildRestBridge = (serverId: string, toolName: string) => apiBuildMcpRestBridge(serverId, toolName);

export const generateAigenSuite = (tool: McpTool) => apiGenerateMcpAigenSuite(tool);
