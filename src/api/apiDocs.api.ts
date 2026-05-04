/**
 * API Documentation raw HTTP layer (port 8087, `forgeq-api-documentation-mgmt-svc`).
 *
 * Controllers covered:
 *   • ApiDocController        /api/v1/api-docs/docs       (CRUD + versions + publish)
 *   • ApiDocExportController  /api/v1/api-docs/docs/{id}/export
 *   • ApiSchemaController     /api/v1/api-docs/schemas    (CRUD + validate)
 *   • GeneratorController     /api/v1/api-docs/generator/preview/collection/{id}
 *   • PublicDocController     /api/v1/api-docs/public/{slug}
 *
 * DTO field names mirror Java exactly. Spring Jackson is strict.
 */
import { createHttp } from '@/lib/http';
import { serviceUrl } from '@/lib/env';

const http = createHttp('apiDocs');
const BASE = '/api/v1/apidocs';

/* ─── DOCS ─────────────────────────────────────────────────────────── */
export type DocFormat = 'MANUAL' | 'AUTO' | 'HYBRID';
export type DocVisibility = 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';

export interface DocCreate {
  workspaceId: string;
  collectionId?: string;
  title: string;
  subtitle?: string;
  format?: DocFormat;
  visibility?: DocVisibility;
  content?: string;
  introMarkdown?: string;
  outroMarkdown?: string;
  theme?: string;
  customCss?: string;
  logoUrl?: string;
  tags?: string[];
}

export interface DocUpdate {
  title?: string;
  subtitle?: string;
  visibility?: DocVisibility;
  content?: string;
  introMarkdown?: string;
  outroMarkdown?: string;
  theme?: string;
  customCss?: string;
  logoUrl?: string;
  tags?: string[];
}

export interface DocView {
  docId: string;
  workspaceId: string;
  collectionId?: string | null;
  title: string;
  subtitle?: string | null;
  format: DocFormat;
  visibility: DocVisibility;
  content?: string | null;
  html?: string | null;
  structuredRequests?: Record<string, unknown>[] | null;
  isPublished?: boolean | null;
  slug?: string | null;
  publicUrl?: string | null;
  publishedAt?: number | string | null;
  publishedByEmail?: string | null;
  unpublishedAt?: number | string | null;
  unpublishedByEmail?: string | null;
  theme?: string | null;
  customCss?: string | null;
  logoUrl?: string | null;
  tags?: string[] | null;
  version?: number | null;
  createdByEmail?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  viewCount?: number | null;
}

export interface VersionView {
  versionId: string;
  docId: string;
  version: number;
  title?: string;
  createdByEmail?: string;
  createdAt?: number | string;
}

export interface PublishRequest { slug?: string }

export const apiCreateDoc = (b: DocCreate) => http.post<DocView>(`${BASE}/docs`, b).then((r) => r.data);
export const apiListDocs = (
  workspaceId: string,
  opts: { collectionId?: string; page?: number; size?: number } = {},
) => http.get<DocView[]>(`${BASE}/docs`, {
  params: {
    workspaceId,
    ...(opts.collectionId ? { collectionId: opts.collectionId } : {}),
    page: opts.page ?? 0,
    size: opts.size ?? 50,
  },
}).then((r) => r.data);
export const apiGetDoc      = (id: string) => http.get<DocView>(`${BASE}/docs/${id}`).then((r) => r.data);
export const apiUpdateDoc   = (id: string, b: DocUpdate) => http.patch<DocView>(`${BASE}/docs/${id}`, b).then((r) => r.data);
export const apiRegenerate  = (id: string) => http.post<DocView>(`${BASE}/docs/${id}/regenerate`).then((r) => r.data);
export const apiDeleteDoc   = (id: string) => http.delete<void>(`${BASE}/docs/${id}`).then((r) => r.data);
export const apiPublishDoc  = (id: string, b: PublishRequest = {}) =>
  http.post<DocView>(`${BASE}/docs/${id}/publish`, b).then((r) => r.data);
export const apiUnpublishDoc = (id: string) => http.post<DocView>(`${BASE}/docs/${id}/unpublish`).then((r) => r.data);
export const apiSnapshotDoc  = (id: string) =>
  http.post<VersionView>(`${BASE}/docs/${id}/snapshots`).then((r) => r.data);
export const apiListVersions = (id: string) =>
  http.get<VersionView[]>(`${BASE}/docs/${id}/versions`).then((r) => r.data);

/* ─── EXPORT ────────────────────────────────────────────────────────── */
export type ExportFormat = 'FORGEQ' | 'OPENAPI' | 'OPENAPI_YAML' | 'HTML' | 'MARKDOWN';
export const apiExportDoc = async (id: string, format: ExportFormat) => {
  const res = await http.get<Blob>(`${BASE}/docs/${id}/export`, {
    params: { format },
    responseType: 'blob',
    transformResponse: (x) => x,
  });
  return {
    blob: res.data as unknown as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

/* ─── SCHEMAS ───────────────────────────────────────────────────────── */
export type SchemaType = 'openapi' | 'swagger' | 'graphql' | 'grpc';
export type SchemaFormat = 'json' | 'yaml';

export interface SchemaCreate {
  workspaceId: string;
  collectionId?: string;
  name: string;
  description?: string;
  schemaType: SchemaType | string;
  schemaFormat: SchemaFormat | string;
  schemaContent: string;
  version?: string;
  sourceUrl?: string;
}

export interface SchemaUpdate {
  name?: string;
  description?: string;
  schemaType?: string;
  schemaFormat?: string;
  schemaContent?: string;
  collectionId?: string;
  version?: string;
  sourceUrl?: string;
}

export interface SchemaView {
  schemaId: string;
  workspaceId: string;
  collectionId?: string | null;
  name: string;
  description?: string | null;
  schemaType: string;
  schemaFormat: string;
  schemaContent: string;
  isValid?: boolean | null;
  validationErrors?: string[] | null;
  version?: string | null;
  sourceUrl?: string | null;
  createdByEmail?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export const apiCreateSchema = (b: SchemaCreate) => http.post<SchemaView>(`${BASE}/schemas`, b).then((r) => r.data);
export const apiListSchemas = (
  workspaceId: string,
  opts: { collectionId?: string; type?: string; page?: number; size?: number } = {},
) => http.get<SchemaView[]>(`${BASE}/schemas`, {
  params: {
    workspaceId,
    ...(opts.collectionId ? { collectionId: opts.collectionId } : {}),
    ...(opts.type ? { type: opts.type } : {}),
    page: opts.page ?? 0,
    size: opts.size ?? 50,
  },
}).then((r) => r.data);
export const apiGetSchema    = (id: string) => http.get<SchemaView>(`${BASE}/schemas/${id}`).then((r) => r.data);
export const apiUpdateSchema = (id: string, b: SchemaUpdate) => http.patch<SchemaView>(`${BASE}/schemas/${id}`, b).then((r) => r.data);
export const apiDeleteSchema = (id: string) => http.delete<void>(`${BASE}/schemas/${id}`).then((r) => r.data);
export const apiValidateSchema = (id: string) =>
  http.post<SchemaView>(`${BASE}/schemas/${id}/validate`).then((r) => r.data);

/* ─── GENERATOR ─────────────────────────────────────────────────────── */
export interface GeneratorPreview {
  collectionId: string;
  title?: string;
  introMarkdown?: string;
  content?: string;
  html?: string;
  structuredRequests?: Record<string, unknown>[];
}

export const apiPreviewFromCollection = (collectionId: string) =>
  http.get<GeneratorPreview>(`${BASE}/generator/preview/collection/${collectionId}`).then((r) => r.data);

/* ─── PUBLIC ────────────────────────────────────────────────────────── */
/** Card returned from the auth-free Public Hub feed. */
export interface PublicHubCard {
  slug: string;
  title: string;
  subtitle?: string | null;
  format: string;
  logoUrl?: string | null;
  tags?: string[] | null;
  version?: number | null;
  viewCount?: number | null;
  publishedAt?: number | string | null;
}

export const apiBrowsePublicDocs = (opts: { q?: string; sort?: 'recent' | 'trending'; page?: number; size?: number } = {}) =>
  http.get<PublicHubCard[]>(`${BASE}/public`, {
    params: {
      ...(opts.q ? { q: opts.q } : {}),
      ...(opts.sort ? { sort: opts.sort } : {}),
      page: opts.page ?? 0,
      size: opts.size ?? 60,
    },
  }).then((r) => r.data);

export const apiCountPublicDocs = () =>
  http.get<{ total: number }>(`${BASE}/public/_count`).then((r) => r.data);

export interface PublicDocView {
  slug: string;
  title: string;
  subtitle?: string;
  format: string;
  content?: string;
  html?: string;
  structuredRequests?: Record<string, unknown>[];
  theme?: string;
  customCss?: string;
  logoUrl?: string;
  tags?: string[];
  version?: number;
  publishedAt?: number | string;
}

export const apiGetPublicDoc = (slug: string) =>
  http.get<PublicDocView>(`${BASE}/public/${slug}`).then((r) => r.data);

export const apiGetPublicDocMarkdown = async (slug: string) => {
  const res = await http.get<string>(`${BASE}/public/${slug}/markdown`, {
    responseType: 'text',
    transformResponse: (x) => x,
  });
  return res.data as unknown as string;
};

/* ─── HEALTH ────────────────────────────────────────────────────────── */
export const apiGetHealth = () => http.get<{ status: string }>('/actuator/health').then((r) => r.data);
export const apiDocsBaseUrl = () => serviceUrl('apiDocs');
