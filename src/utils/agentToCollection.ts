/**
 * agentToCollection — converts a KRE Nexus agent's `deployedApis[]`
 * into a Postman v2.1 collection JSON payload that the ForgeFuzz
 * collections API can ingest verbatim.
 *
 *  Why Postman v2.1?
 *  -----------------
 *  ForgeFuzz already accepts Postman v2.1 collections via the
 *  collection-mgmt service's `/import` endpoint and the test-spec
 *  service auto-detects this format. Generating the universal format
 *  means we don't need to touch the backend — the agent's HTTP
 *  surface becomes a normal collection the user can run, edit and
 *  share like any other.
 *
 *  Output shape:
 *    {
 *      info: { name, _postman_id, schema },
 *      item: [{ name, request: { method, url, header, body } }, ...]
 *    }
 */
import type { KreAgent, KreDeployedApi } from '../api/kernexux.api';

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: { key: string; value: string }[];
}

interface PostmanRequest {
  method: string;
  description?: string;
  header: { key: string; value: string }[];
  url: PostmanUrl;
  body?: {
    mode: 'raw' | 'none';
    raw?: string;
    options?: { raw?: { language: string } };
  };
}

interface PostmanItem {
  name:    string;
  request: PostmanRequest;
}

export interface PostmanCollection {
  info: {
    _postman_id: string;
    name:        string;
    description?: string;
    schema:      string;
  };
  item: PostmanItem[];
}

/** Convert a single deployed-api row into a Postman v2.1 item. */
function toPostmanItem(api: KreDeployedApi, agentName: string): PostmanItem {
  const u = safeParseUrl(api.url);
  const item: PostmanItem = {
    name: `${api.method} ${api.path}`,
    request: {
      method: api.method.toUpperCase(),
      description: api.description ?? `KRE Nexus · ${agentName}`,
      header: [
        { key: 'Accept',       value: 'application/json' },
        { key: 'Content-Type', value: 'application/json' },
      ],
      url: u,
    },
  };

  // Add an example body for non-GET requests when the upstream
  // provided one — gives the user a working starting payload.
  if (item.request.method !== 'GET' && api.requestBody !== undefined) {
    const raw = typeof api.requestBody === 'string'
      ? api.requestBody
      : JSON.stringify(api.requestBody, null, 2);
    item.request.body = {
      mode: 'raw',
      raw,
      options: { raw: { language: 'json' } },
    };
  }
  return item;
}

/** Best-effort URL parser — never throws. */
function safeParseUrl(rawUrl: string): PostmanUrl {
  const fallback: PostmanUrl = { raw: rawUrl, path: [], query: [] };
  if (!rawUrl) return fallback;
  try {
    const u = new URL(rawUrl);
    return {
      raw:      rawUrl,
      protocol: u.protocol.replace(/:$/, ''),
      host:     u.host.split('.'),
      path:     u.pathname.split('/').filter(Boolean),
      query:    Array.from(u.searchParams.entries()).map(([k, v]) => ({ key: k, value: v })),
    };
  } catch {
    return fallback;
  }
}

export function agentToPostmanCollection(agent: KreAgent): PostmanCollection {
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `kre-${agent.id}-${Date.now()}`;
  return {
    info: {
      _postman_id: id,
      name:        `${agent.name} — KRE Nexus`,
      description: `${agent.description ?? ''}\n\nImported from KRE Nexus marketplace. Endpoints below mirror the agent's deployedApis surface and are testable in the sandbox without authentication (token-limited).`.trim(),
      schema:      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: (agent.deployedApis ?? []).map((a) => toPostmanItem(a, agent.name)),
  };
}

/** Plain-text cURL renderer — used for the "Copy as cURL" buttons on
 *  the agent detail drawer. */
export function deployedApiToCurl(api: KreDeployedApi): string {
  const parts = [`curl -X ${api.method.toUpperCase()} \\`, `  '${api.url}' \\`,
                 `  -H 'Accept: application/json'`];
  if (api.method.toUpperCase() !== 'GET' && api.requestBody !== undefined) {
    parts.push(`  -H 'Content-Type: application/json' \\`);
    const raw = typeof api.requestBody === 'string'
      ? api.requestBody
      : JSON.stringify(api.requestBody);
    parts.push(`  -d '${raw.replace(/'/g, "'\\''")}'`);
  }
  return parts.join('\n');
}
