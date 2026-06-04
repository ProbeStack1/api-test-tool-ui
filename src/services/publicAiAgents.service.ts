/**
 * Public AI Agents service — pure browser, NO proxy required.
 *
 * Two zero-auth, CORS-enabled data sources are merged client-side:
 *
 *  1. **Bundled curated catalog** (`@/assets/aiAgentsCatalog.json`)
 *     ~40 hand-picked, production-grade AI providers (OpenAI, Anthropic,
 *     Groq, Cohere, Pinecone, Vapi, Smithery, KRE Nexus, …). Every entry
 *     has a real `baseUrl` and a populated `endpoints` array so the
 *     "Try It" button can clone executable requests into a workspace
 *     collection on day one.
 *
 *  2. **Smithery MCP Registry** (`https://registry.smithery.ai/servers`)
 *     CORS-allowed (`access-control-allow-origin: *`), no auth needed
 *     for read access. 5,000+ live MCP servers (Gmail, Exa, GitHub,
 *     Slack, Postgres, Stripe, Linear, …). For each server we expose
 *     the canonical Smithery gateway endpoint:
 *       POST `https://server.smithery.ai/{qualifiedName}/mcp`
 *     plus a per-tool `tools/call` endpoint so users can hit individual
 *     MCP tools straight out of the box (they only need to plug in
 *     their Smithery API key).
 *
 * Both sources share a single {@link PublicAgentCard} shape so the
 * existing UI / import flow doesn't care where a card came from.
 *
 * No CORS proxy. No hardcoded mocks beyond the curated catalog. Live
 * data refreshes hourly via a tiny in-memory cache.
 */

import { apiCreateCollection, apiCreateFolder, apiGetFolderTree, apiListCollections } from '@/api/collection.api';
import { apiCreateRequest, apiListRequests } from '@/api/request.api';
import bundledCatalog from '@/assets/aiAgentsCatalog.json';

export type AgentProtocol = 'a2a' | 'mcp' | 'acp' | 'direct' | 'kre';

export interface AgentEndpoint {
  method: string;
  path: string;
  url: string;
  description?: string;
  label?: string;
}

export interface PublicAgentCard {
  id: string;
  name: string;
  provider: string;
  description: string;
  logoUrl: string | null;
  category: string;
  tags: string[];
  publicTokenLimit?: number;
  protocol: AgentProtocol;
  baseUrl?: string;
  endpoints?: AgentEndpoint[];
  authRequired?: boolean;
  authHint?: string;
  source?: 'curated' | 'smithery';
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Source 1 — bundled curated catalog                                  */
/* ──────────────────────────────────────────────────────────────────── */

const CURATED: PublicAgentCard[] = (bundledCatalog as PublicAgentCard[]).map((c) => ({
  ...c,
  // Defensive — guarantee tags is always an array.
  tags: Array.isArray(c.tags) ? c.tags : [],
  source: 'curated' as const,
}));

/* ──────────────────────────────────────────────────────────────────── */
/*  Source 2 — Smithery MCP Registry (CORS-enabled, no auth)            */
/*                                                                      */
/*  - List endpoint: GET https://registry.smithery.ai/servers           */
/*  - Detail (tools) endpoint: GET .../servers/{qualifiedName}          */
/*                                                                      */
/*  We pull 60 servers from the registry, then fetch tools for the top  */
/*  ~15 (parallel, capped) so each card has real executable endpoints   */
/*  the user can import + invoke. The remaining 45 still get the        */
/*  generic `tools/list` + `tools/call` MCP gateway endpoints so they   */
/*  are never empty.                                                    */
/* ──────────────────────────────────────────────────────────────────── */

const SMITHERY_LIST_URL =
  'https://registry.smithery.ai/servers' +
  '?pageSize=60' +
  '&verified=true' +
  '&isDeployed=true';

const SMITHERY_DETAIL_LIMIT = 12; // how many to enrich with tool calls
const SMITHERY_TIMEOUT_MS = 6_000;

interface SmitheryServerRaw {
  id?: string;
  qualifiedName?: string;
  displayName?: string;
  description?: string;
  iconUrl?: string;
  remote?: boolean;
  verified?: boolean;
  useCount?: number;
  homepage?: string;
  isDeployed?: boolean;
}

interface SmitheryServerDetail {
  qualifiedName?: string;
  displayName?: string;
  description?: string;
  iconUrl?: string;
  deploymentUrl?: string;
  tools?: Array<{ name?: string; description?: string }>;
}

const withTimeout = (ms: number): { signal: AbortSignal; clear: () => void } => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
};

const safeFetchJson = async <T,>(url: string): Promise<T | null> => {
  const { signal, clear } = withTimeout(SMITHERY_TIMEOUT_MS);
  try {
    const res = await fetch(url, { credentials: 'omit', signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clear();
  }
};

const smitheryMcpUrl = (qualifiedName: string) =>
  `https://server.smithery.ai/${qualifiedName}/mcp`;

const baseSmitheryEndpoints = (qualifiedName: string): AgentEndpoint[] => {
  const url = smitheryMcpUrl(qualifiedName);
  return [
    {
      method: 'POST',
      path: `/${qualifiedName}/mcp`,
      url,
      label: 'List tools',
      description: 'MCP "tools/list" — discover the tools this server exposes.',
    },
    {
      method: 'POST',
      path: `/${qualifiedName}/mcp`,
      url,
      label: 'Call tool',
      description: 'MCP "tools/call" — invoke a tool by name with arguments.',
    },
  ];
};

const buildSmitheryCard = (
  raw: SmitheryServerRaw,
  detail?: SmitheryServerDetail | null,
): PublicAgentCard | null => {
  const qn = raw.qualifiedName ?? detail?.qualifiedName;
  if (!qn) return null;
  const displayName = raw.displayName ?? detail?.displayName ?? qn;
  const description = raw.description ?? detail?.description ?? `MCP server "${qn}" from the Smithery registry.`;
  const iconUrl = raw.iconUrl ?? detail?.iconUrl ?? null;
  const provider = qn.split('/')[0] ?? 'Smithery';
  const baseUrl = smitheryMcpUrl(qn);

  // Endpoints — start with the generic MCP gateway calls so cards are
  // never empty. If we have tools, append a `tools/call` entry per tool.
  const endpoints: AgentEndpoint[] = baseSmitheryEndpoints(qn);
  const tools = detail?.tools ?? [];
  for (const t of tools.slice(0, 6)) {
    if (!t?.name) continue;
    endpoints.push({
      method: 'POST',
      path: `/${qn}/mcp`,
      url: baseUrl,
      label: `Call tool · ${t.name}`,
      description: t.description ?? `Invoke the MCP tool "${t.name}".`,
    });
  }

  return {
    id: `smithery:${qn}`,
    name: displayName,
    provider: `Smithery · ${provider}`,
    description,
    logoUrl: iconUrl,
    category: 'MCP Server',
    tags: ['mcp', 'smithery', provider].filter(Boolean),
    protocol: 'mcp',
    baseUrl,
    endpoints,
    authRequired: true,
    authHint: 'Append ?api_key=<SMITHERY_API_KEY>&profile=<your-profile> to the URL. Sign up at https://smithery.ai for a free key.',
    source: 'smithery',
  };
};

let _smitheryCache: { ts: number; data: PublicAgentCard[] } | null = null;
const SMITHERY_TTL_MS = 60 * 60_000; // 1 hour

const fetchSmitheryAgents = async (): Promise<PublicAgentCard[]> => {
  if (_smitheryCache && Date.now() - _smitheryCache.ts < SMITHERY_TTL_MS) {
    return _smitheryCache.data;
  }
  const list = await safeFetchJson<{ servers?: SmitheryServerRaw[] }>(SMITHERY_LIST_URL);
  if (!list?.servers?.length) return [];

  // Enrich the top N with tool data in parallel.
  const head = list.servers.slice(0, SMITHERY_DETAIL_LIMIT);
  const tail = list.servers.slice(SMITHERY_DETAIL_LIMIT);
  const headDetails = await Promise.all(
    head.map((s) =>
      s.qualifiedName
        ? safeFetchJson<SmitheryServerDetail>(`https://registry.smithery.ai/servers/${encodeURIComponent(s.qualifiedName)}`)
        : Promise.resolve(null),
    ),
  );

  const enriched: PublicAgentCard[] = [];
  head.forEach((s, i) => {
    const c = buildSmitheryCard(s, headDetails[i]);
    if (c) enriched.push(c);
  });
  tail.forEach((s) => {
    const c = buildSmitheryCard(s);
    if (c) enriched.push(c);
  });

  _smitheryCache = { ts: Date.now(), data: enriched };
  return enriched;
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Combined dataset                                                    */
/* ──────────────────────────────────────────────────────────────────── */

let _allCache: { ts: number; data: PublicAgentCard[] } | null = null;
const ALL_TTL_MS = 60 * 60_000;

const fetchAllAgents = async (): Promise<PublicAgentCard[]> => {
  if (_allCache && Date.now() - _allCache.ts < ALL_TTL_MS) return _allCache.data;
  // Curated first (highest quality, validated endpoints), Smithery tail.
  const smithery = await fetchSmitheryAgents();
  const seen = new Set(CURATED.map((c) => c.id));
  const fresh = smithery.filter((s) => !seen.has(s.id));
  const combined = [...CURATED, ...fresh];
  _allCache = { ts: Date.now(), data: combined };
  return combined;
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Public API — drop-in replacement for the previous proxy-based svc.  */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * Paginated agents fetch. {@code total} is the combined catalog size so
 * the existing UI's pagination + filter logic works as-is.
 */
export const fetchAgentsPage = async (
  limit = 30,
  offset = 0,
): Promise<{ agents: PublicAgentCard[]; total: number }> => {
  const all = await fetchAllAgents();
  const page = all.slice(offset, offset + limit);
  return { agents: page, total: all.length };
};

/** Fetch one agent by id (used by the detail page when no router state is available). */
export const fetchAgentById = async (id: string): Promise<PublicAgentCard | null> => {
  const all = await fetchAllAgents();
  return all.find((a) => a.id === id) ?? null;
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Import — unchanged contract from the previous service                */
/* ──────────────────────────────────────────────────────────────────── */

interface FolderTreeNodeLike { id: string; name: string; }

const findFolderByName = (
  tree: { folders?: FolderTreeNodeLike[] } | undefined,
  name: string,
): FolderTreeNodeLike | undefined => tree?.folders?.find((f) => f.name === name);

export const importAgentToWorkspace = async (
  agent: PublicAgentCard,
  workspaceId: string,
): Promise<{ collectionId: string; folderId: string; requestCount: number }> => {
  // 1. Upsert the "AI Agents" collection so multiple imports nest cleanly.
  const collections = await apiListCollections(workspaceId);
  let coll = collections.find((c) => c.name === 'AI Agents');
  if (!coll) {
    coll = await apiCreateCollection(workspaceId, {
      name: 'AI Agents',
      description: 'Public AI agents imported from the ForgeFuzz marketplace.',
    });
  }
  const collectionId = coll.id ?? (coll as unknown as { collectionId: string }).collectionId;

  // 2. Upsert a sub-folder per agent (so re-imports don't blow away history).
  const folderName = `${agent.name} (${agent.protocol.toUpperCase()})`;
  let folderId: string;
  try {
    const tree = await apiGetFolderTree(collectionId);
    const existing = findFolderByName(tree as { folders?: FolderTreeNodeLike[] }, folderName);
    if (existing) {
      folderId = existing.id;
    } else {
      const f = await apiCreateFolder(collectionId, {
        name: folderName,
        description: agent.description.slice(0, 200),
      });
      folderId = (f as { id?: string }).id ?? (f as unknown as { folderId: string }).folderId;
    }
  } catch {
    const f = await apiCreateFolder(collectionId, {
      name: folderName,
      description: agent.description.slice(0, 200),
    });
    folderId = (f as { id?: string }).id ?? (f as unknown as { folderId: string }).folderId;
  }

  // 3. Default to a sensible endpoint if the card has none.
  let endpoints = agent.endpoints ?? [];
  if (endpoints.length === 0 && agent.baseUrl) {
    endpoints = [{
      method: 'POST',
      path: '/',
      url: agent.baseUrl,
      description: `Invoke ${agent.name}.`,
    }];
  }

  // 4. Skip endpoints that already exist in the folder (re-import safe).
  let existingRequests: Array<{ method?: string; name?: string; url?: { raw?: string } }> = [];
  try { existingRequests = await apiListRequests(collectionId, folderId); } catch { /* ignore */ }
  const existingKeys = new Set(existingRequests.map((r) => `${r.method ?? 'GET'}|${r.url?.raw ?? ''}|${r.name ?? ''}`));

  let created = 0;
  for (const ep of endpoints) {
    const reqName = ep.label || ep.description || `${ep.method} ${ep.path}`;
    const key = `${ep.method}|${ep.url}|${reqName}`;
    if (existingKeys.has(key)) continue;
    const requiresBody = ['POST', 'PUT', 'PATCH'].includes(ep.method.toUpperCase());
    const headers: Array<{ key: string; value: string; enabled?: boolean }> = [];
    if (requiresBody) headers.push({ key: 'Content-Type', value: 'application/json', enabled: true });
    if (agent.authRequired) headers.push({ key: 'Authorization', value: 'Bearer {{API_KEY}}', enabled: true });

    // Sensible default body for MCP servers so the imported request is
    // immediately runnable (users still need an api_key query param).
    let defaultBody = '{}';
    if (requiresBody && agent.protocol === 'mcp') {
      if (/list/i.test(reqName)) {
        defaultBody = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, null, 2);
      } else if (/call tool · /i.test(reqName)) {
        const toolName = reqName.split('Call tool · ')[1] ?? '';
        defaultBody = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: toolName, arguments: {} } }, null, 2);
      } else {
        defaultBody = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, null, 2);
      }
    }

    await apiCreateRequest(
      collectionId,
      {
        collectionId,
        folderId,
        name: reqName,
        method: ep.method.toUpperCase(),
        url: { raw: ep.url },
        headers,
        body: requiresBody ? { mode: 'raw', language: 'json', raw: defaultBody } : { mode: 'none' },
      } as Parameters<typeof apiCreateRequest>[1],
      workspaceId,
    );
    created++;
  }
  return { collectionId, folderId, requestCount: created };
};
