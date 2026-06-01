/**
 * Public APIs service — sources the open-source APIs.guru registry
 * (https://apis.guru) which carries 2,400+ free public OpenAPI / Swagger
 * specs (Stripe, GitHub, PokéAPI, Twitter, Stripe, …).
 *
 * No API key required, CORS-enabled, ~1.5 MB once-cached payload.
 *
 * Flow:
 *   1. {@link fetchPublicApiCatalog} returns the full catalog as a flat
 *      list of {@link PublicApiCard}s — used to populate the API Hub grid
 *      alongside the user's own ForgeFuzz public docs.
 *   2. {@link importPublicApiToWorkspace} fetches a single API's swagger
 *      URL and pipes the raw bytes through ForgeFuzz's existing
 *      `apiImportCollection` so a brand-new collection lands in the
 *      user's workspace with every endpoint pre-populated as a runnable
 *      request.
 *
 * Caching: the master list is heavy + immutable, so we cache it in
 * `sessionStorage` keyed by date (one fetch per browser tab per day).
 */

import { apiImportCollection, type ImportSummaryDto } from '@/api/collection.api';

const APIS_GURU_LIST = 'https://api.apis.guru/v2/list.json';
const CACHE_KEY = 'apis-guru:list';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type PublicApiSource = 'forgefuzz' | 'public';

export interface PublicApiCard {
  /** Stable id — `apis.guru/<providerKey>` or forgefuzz slug. */
  id: string;
  source: PublicApiSource;
  /** Provider grouping — e.g. "github.com", "stripe.com", "ForgeFuzz". */
  provider: string;
  /** Display title. */
  title: string;
  /** Optional one-line summary. */
  subtitle: string | null;
  /** Optional logo URL. */
  logoUrl: string | null;
  /** Number of endpoints when known. */
  endpointCount: number | null;
  /** Spec version when known (e.g. "v3", "2.1"). */
  version: string | null;
  /** Free-form category tags (e.g. ["cloud", "payments"]). */
  tags: string[];
  /** Where to import from — only set for `public` source. */
  swaggerUrl: string | null;
  /** Where to view docs externally — only set for `public` source. */
  externalDocsUrl: string | null;
  /** Last updated. */
  updatedAt: string | null;
}

interface RawApisGuruList {
  [providerKey: string]: {
    versions: {
      [version: string]: {
        added?: string;
        updated?: string;
        swaggerUrl?: string;
        swaggerYamlUrl?: string;
        openapiVer?: string;
        info?: {
          title?: string;
          description?: string;
          version?: string;
          'x-logo'?: { url?: string };
          'x-providerName'?: string;
          'x-serviceName'?: string;
          'x-tags'?: string[];
          contact?: { name?: string; url?: string };
        };
        externalDocs?: { url?: string };
      };
    };
    preferred?: string;
  };
}

/* ──────────────────────────────────────────────────────────────────── */

/** Fetch the entire APIs.guru list (cached for 24 h in sessionStorage). */
export const fetchPublicApiCatalog = async (): Promise<PublicApiCard[]> => {
  // Cache hit?
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, cards } = JSON.parse(cached) as { ts: number; cards: PublicApiCard[] };
      if (Date.now() - ts < CACHE_TTL_MS) return cards;
    }
  } catch { /* ignore corrupted cache */ }

  const res = await fetch(APIS_GURU_LIST, { credentials: 'omit' });
  if (!res.ok) throw new Error(`APIs.guru list ${res.status}`);
  const raw = (await res.json()) as RawApisGuruList;

  const cards: PublicApiCard[] = [];
  for (const [providerKey, entry] of Object.entries(raw)) {
    const preferredVersion = entry.preferred ?? Object.keys(entry.versions)[0];
    if (!preferredVersion) continue;
    const v = entry.versions[preferredVersion];
    if (!v?.swaggerUrl) continue;
    const info = v.info ?? {};
    const title = info.title || providerKey;
    const provider = info['x-providerName'] || providerKey.split(':')[0] || 'public';
    cards.push({
      id: `apis-guru:${providerKey}`,
      source: 'public',
      provider,
      title,
      subtitle: (info.description ?? '').replace(/\n+/g, ' ').slice(0, 220) || null,
      logoUrl: info['x-logo']?.url ?? null,
      endpointCount: null, // unknown until we fetch the spec
      version: preferredVersion || info.version || null,
      tags: (info['x-tags'] ?? []).slice(0, 6),
      swaggerUrl: v.swaggerUrl,
      externalDocsUrl: v.externalDocs?.url ?? null,
      updatedAt: v.updated ?? v.added ?? null,
    });
  }

  // Sort: APIs that have a logo float to top (look prettier in grid),
  // then by title alpha. Stable across renders.
  cards.sort((a, b) => {
    if (!!a.logoUrl !== !!b.logoUrl) return a.logoUrl ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), cards }));
  } catch { /* quota — ignore */ }
  return cards;
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Detail-page support                                                 */
/* ──────────────────────────────────────────────────────────────────── */

export interface PublicApiEndpoint {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: { name: string; in: string; required?: boolean; description?: string; schema?: unknown }[];
  requestBody?: { description?: string; contentType?: string };
  responses?: { code: string; description?: string }[];
}

export interface PublicApiDetail {
  card: PublicApiCard;
  raw: unknown;                       // original spec (untouched)
  servers: string[];
  endpoints: PublicApiEndpoint[];
  /** Best-effort full description from the spec. */
  longDescription?: string;
  openApiVersion?: string;
}

/** Fetches the swagger spec and normalises it into a UI-friendly shape. */
export const fetchPublicApiDetail = async (cardId: string): Promise<PublicApiDetail | null> => {
  const cards = await fetchPublicApiCatalog();
  const card = cards.find((c) => c.id === cardId);
  if (!card || !card.swaggerUrl) return null;
  const res = await fetch(card.swaggerUrl, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Spec fetch ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;

  // Servers — OpenAPI 3 uses `servers[].url`, Swagger 2 uses `host`+`basePath`+`schemes`.
  const servers: string[] = [];
  const arr = (json as { servers?: Array<{ url?: string }> }).servers;
  if (Array.isArray(arr)) {
    for (const s of arr) if (s?.url) servers.push(s.url);
  } else {
    const s2 = json as { schemes?: string[]; host?: string; basePath?: string };
    if (s2.host) {
      const scheme = s2.schemes?.[0] ?? 'https';
      servers.push(`${scheme}://${s2.host}${s2.basePath ?? ''}`);
    }
  }

  // Paths → flat endpoint list. OpenAPI 3 + Swagger 2 share the same shape here.
  const paths = (json as { paths?: Record<string, Record<string, unknown>> }).paths ?? {};
  const endpoints: PublicApiEndpoint[] = [];
  const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
  for (const [path, ops] of Object.entries(paths)) {
    if (!ops || typeof ops !== 'object') continue;
    for (const method of METHODS) {
      const op = (ops as Record<string, unknown>)[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      const responses = op.responses as Record<string, { description?: string }> | undefined;
      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: typeof op.summary === 'string' ? op.summary : undefined,
        description: typeof op.description === 'string' ? op.description : undefined,
        tags: Array.isArray(op.tags) ? (op.tags as string[]) : undefined,
        parameters: Array.isArray(op.parameters)
          ? (op.parameters as { name: string; in: string; required?: boolean; description?: string; schema?: unknown }[])
          : undefined,
        requestBody: extractRequestBody(op),
        responses: responses
          ? Object.entries(responses).map(([code, r]) => ({ code, description: r?.description }))
          : undefined,
      });
    }
  }

  const longDesc =
    typeof (json as { info?: { description?: string } }).info?.description === 'string'
      ? (json as { info?: { description?: string } }).info!.description
      : undefined;
  const openApiVersion =
    typeof (json as { openapi?: string }).openapi === 'string'
      ? (json as { openapi?: string }).openapi
      : typeof (json as { swagger?: string }).swagger === 'string'
        ? `swagger ${(json as { swagger?: string }).swagger}`
        : undefined;

  return { card, raw: json, servers, endpoints, longDescription: longDesc, openApiVersion };
};

const extractRequestBody = (op: Record<string, unknown>): PublicApiEndpoint['requestBody'] => {
  const rb = op.requestBody as { description?: string; content?: Record<string, unknown> } | undefined;
  if (!rb) return undefined;
  const ct = rb.content ? Object.keys(rb.content)[0] : undefined;
  return { description: rb.description, contentType: ct };
};

/**
 * Returns the distinct list of provider names found in the cached
 * catalog — used to populate the "Provider" filter dropdown.
 */
export const getProviders = (cards: PublicApiCard[]): string[] => {
  const seen = new Set<string>();
  for (const c of cards) {
    if (c.provider) seen.add(c.provider);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
};

/* ──────────────────────────────────────────────────────────────────── */

/**
 * Imports a public API into a brand-new collection in the given workspace.
 * Returns the {@link ImportSummaryDto} so the caller can navigate the user
 * to the freshly created collection.
 *
 * Two-step flow:
 *   1. Fetch the raw swagger JSON from APIs.guru's CDN.
 *   2. Wrap it in a Blob and POST through the existing multipart import
 *      pipeline. `format: 'auto'` lets the backend detect OpenAPI v2/v3
 *      and run its battle-tested import-to-collection logic.
 */
export const importPublicApiToWorkspace = async (
  card: PublicApiCard,
  workspaceId: string,
): Promise<ImportSummaryDto> => {
  if (card.source !== 'public' || !card.swaggerUrl) {
    throw new Error('Card is not a public API or missing swaggerUrl');
  }
  // Pull the swagger spec
  const specRes = await fetch(card.swaggerUrl, { credentials: 'omit' });
  if (!specRes.ok) throw new Error(`Spec fetch ${specRes.status}`);
  const text = await specRes.text();
  const fileName = `${card.id.replace(/[^a-z0-9._-]/gi, '_')}.json`;
  const file = new File([text], fileName, { type: 'application/json' });
  const overrideName = `${card.title} (Public)`;
  return apiImportCollection(workspaceId, file, 'auto', overrideName);
};
