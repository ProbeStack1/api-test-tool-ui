/**
 * API Docs service — UI-facing layer with epoch→ISO date normalisation.
 */
import {
  apiCreateDoc, apiListDocs, apiGetDoc, apiUpdateDoc, apiRegenerate, apiDeleteDoc,
  apiPublishDoc, apiUnpublishDoc, apiSnapshotDoc, apiListVersions, apiExportDoc,
  apiCreateSchema, apiListSchemas, apiGetSchema, apiUpdateSchema, apiDeleteSchema, apiValidateSchema,
  apiPreviewFromCollection, apiGetPublicDoc, apiGetPublicDocMarkdown, apiGetHealth,
  apiBrowsePublicDocs, apiCountPublicDocs,
  type DocCreate, type DocUpdate, type DocView, type VersionView, type ExportFormat,
  type SchemaCreate, type SchemaUpdate, type SchemaView, type SchemaType, type SchemaFormat,
  type GeneratorPreview, type PublicDocView, type PublicHubCard, type DocFormat, type DocVisibility, type PublishRequest,
} from '@/api/apiDocs.api';

export type {
  DocCreate, DocUpdate, DocView, VersionView, ExportFormat,
  SchemaCreate, SchemaUpdate, SchemaView, SchemaType, SchemaFormat,
  GeneratorPreview, PublicDocView, PublicHubCard, DocFormat, DocVisibility, PublishRequest,
};

const toIso = (v: number | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  const ms = v < 1e12 ? v * 1000 : v;
  return new Date(ms).toISOString();
};

const normDoc = (d: DocView): DocView => ({
  ...d,
  publishedAt:   toIso(d.publishedAt) ?? null,
  unpublishedAt: toIso(d.unpublishedAt) ?? null,
  createdAt:     toIso(d.createdAt) ?? '',
  updatedAt:     toIso(d.updatedAt) ?? '',
});

const normVersion = (v: VersionView): VersionView => ({
  ...v,
  createdAt: toIso(v.createdAt),
});

const normSchema = (s: SchemaView): SchemaView => ({
  ...s,
  createdAt: toIso(s.createdAt) ?? '',
  updatedAt: toIso(s.updatedAt) ?? '',
});

/* DOCS */
export const createDoc       = (b: DocCreate)             => apiCreateDoc(b).then(normDoc);
export const listDocs        = (workspaceId: string, opts: { collectionId?: string; page?: number; size?: number } = {}) =>
  apiListDocs(workspaceId, opts).then((arr) => (arr ?? []).map(normDoc));
export const getDoc          = (id: string)               => apiGetDoc(id).then(normDoc);
export const updateDoc       = (id: string, b: DocUpdate) => apiUpdateDoc(id, b).then(normDoc);
export const regenerateDoc   = (id: string)               => apiRegenerate(id).then(normDoc);
export const deleteDoc       = (id: string)               => apiDeleteDoc(id);
export const publishDoc      = (id: string, b: PublishRequest = {}) => apiPublishDoc(id, b).then(normDoc);
export const unpublishDoc    = (id: string)               => apiUnpublishDoc(id).then(normDoc);
export const snapshotDoc     = (id: string)               => apiSnapshotDoc(id).then(normVersion);
export const listVersions    = (id: string)               => apiListVersions(id).then((arr) => (arr ?? []).map(normVersion));

export const exportDoc = (id: string, format: ExportFormat) => apiExportDoc(id, format);

export const downloadBlob = (
  blob: Blob, contentDisposition: string | undefined, fallback: string,
): void => {
  const cd = contentDisposition ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] ?? fallback;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = decodeURIComponent(filename);
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

/* SCHEMAS */
export const createSchema   = (b: SchemaCreate)              => apiCreateSchema(b).then(normSchema);
export const listSchemas    = (workspaceId: string, opts: { collectionId?: string; type?: string; page?: number; size?: number } = {}) =>
  apiListSchemas(workspaceId, opts).then((arr) => (arr ?? []).map(normSchema));
export const getSchema      = (id: string)                   => apiGetSchema(id).then(normSchema);
export const updateSchema   = (id: string, b: SchemaUpdate)  => apiUpdateSchema(id, b).then(normSchema);
export const deleteSchema   = (id: string)                   => apiDeleteSchema(id);
export const validateSchema = (id: string)                   => apiValidateSchema(id).then(normSchema);

/* GENERATOR */
export const previewFromCollection = (collectionId: string) => apiPreviewFromCollection(collectionId);

/* PUBLIC */
export const getPublicDoc         = (slug: string) => apiGetPublicDoc(slug).then((d) => ({ ...d, publishedAt: toIso(d.publishedAt) }));
export const getPublicDocMarkdown = (slug: string) => apiGetPublicDocMarkdown(slug);
export const browsePublicDocs     = (opts: { q?: string; sort?: 'recent' | 'trending'; page?: number; size?: number } = {}) =>
  apiBrowsePublicDocs(opts).then((arr) => (arr ?? []).map((c) => ({
    ...c,
    publishedAt: toIso(c.publishedAt) ?? null,
  })));
export const countPublicDocs      = () => apiCountPublicDocs();

/* HEALTH */
export const getHealth = () => apiGetHealth();
