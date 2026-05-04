/**
 * Collection service — UI-facing layer.
 *
 *   page  →  THIS FILE  →  api/collection.api  →  http://<collection svc>
 *
 * Mirrors `collection-mgmt-svc` (port 8082). Includes static import-format
 * catalog so the UI can render the format picker without an extra round-trip
 * (the Java service exposes detect, not list-formats).
 *
 * Public function names are preserved so existing pages don't change.
 */
import {
  apiCloneCollection,
  apiCloneFolder,
  apiCreateCollection,
  apiCreateFolder,
  apiCreateShare,
  apiDeleteCollection,
  apiDeleteFolder,
  apiDetectImportFormat,
  apiExportCollection,
  apiGetCollection,
  apiGetFolderTree,
  apiImportCollection,
  apiListCollectionTrash,
  apiListCollections,
  apiListFolders,
  apiListShares,
  apiMoveFolder,
  apiRestoreCollection,
  apiRevokeShare,
  apiUpdateCollection,
  apiUpdateFolder,
  type CollectionDto,
  type FolderDto,
  type ImportSummaryDto,
  type ShareDto,
} from '@/api/collection.api';

/* ───────── re-exported vocabulary ──────────────────────────────────────── */
export type Collection = CollectionDto;
export type Folder = FolderDto;
export type ShareLink = ShareDto;
export type ImportSummary = ImportSummaryDto;
export type ImportFormatSpec = {
  key: string;
  label: string;
  extensions: string[];
};

/* ───────── normalisers ────────────────────────────────────────────────── */
const normCollection = (c: CollectionDto): Collection => ({
  ...c,
  description: c.description ?? null,
  importStatus: c.importStatus ?? null,
  sourceFile: c.sourceFile ?? null,
  tags: c.tags ?? {},
  stats: c.stats ?? { folderCount: 0, requestCount: 0, sourceBytes: 0 },
});
const normFolder = (f: FolderDto): Folder => ({
  ...f,
  description: f.description ?? null,
  pathIds: f.pathIds ?? [],
  pathNames: f.pathNames ?? [],
});
const normShare = (s: ShareDto): ShareLink => s;

/* ───────── dummy fallback (UI-only, OFF by default) ────────────────────── */
const useDummy = (): boolean =>
  import.meta.env.VITE_COLLECTION_USE_DUMMY === 'true';
const dummyOnError = (): boolean =>
  import.meta.env.VITE_COLLECTION_DUMMY_ON_ERROR === 'true';
const isNetworkError = (e: unknown): boolean => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || status === undefined;
};
const withFallback = async <T>(
  live: () => Promise<T>,
  dummy: () => T,
): Promise<T> => {
  if (useDummy()) return dummy();
  try {
    return await live();
  } catch (e) {
    if (dummyOnError() && isNetworkError(e)) return dummy();
    throw e;
  }
};

/* ───────── collections (CRUD + soft-delete + clone) ───────────────────── */
export const listCollections = (workspaceId: string): Promise<Collection[]> =>
  withFallback(
    () => apiListCollections(workspaceId).then((rows) => rows.map(normCollection)),
    () => [],
  );

export const getCollection = (id: string): Promise<Collection> =>
  apiGetCollection(id).then(normCollection);

export const createCollection = (
  workspaceId: string,
  body: { name: string; description?: string; tags?: Record<string, string> },
): Promise<Collection> =>
  apiCreateCollection(workspaceId, body).then(normCollection);

export const updateCollection = (
  id: string,
  body: Partial<Collection>,
): Promise<Collection> =>
  apiUpdateCollection(id, {
    name: body.name,
    description: body.description,
    tags: body.tags,
  }).then(normCollection);

export const deleteCollection = (id: string): Promise<void> =>
  apiDeleteCollection(id);

export const listCollectionTrash = (
  workspaceId: string,
): Promise<Collection[]> =>
  withFallback(
    () =>
      apiListCollectionTrash(workspaceId).then((rows) => rows.map(normCollection)),
    () => [],
  );

export const restoreCollection = (id: string): Promise<Collection> =>
  apiRestoreCollection(id).then(normCollection);

export const cloneCollection = (id: string): Promise<Collection> =>
  apiCloneCollection(id).then(normCollection);

/* ───────── folders ────────────────────────────────────────────────────── */
export const listFolders = (collectionId: string): Promise<Folder[]> =>
  withFallback(
    () => apiListFolders(collectionId).then((rows) => rows.map(normFolder)),
    () => [],
  );

export const getFolderTree = (
  collectionId: string,
): Promise<{ collectionId: string; folders: Folder[] }> =>
  apiGetFolderTree(collectionId).then((tree) => ({
    collectionId: tree.collectionId,
    folders: (tree.folders ?? []).map(normFolder),
  }));

export const createFolder = (
  collectionId: string,
  body: {
    name: string;
    description?: string;
    parentFolderId?: string | null;
    order?: number;
  },
): Promise<Folder> => apiCreateFolder(collectionId, body).then(normFolder);

export const updateFolder = (
  collectionId: string,
  id: string,
  body: Partial<Folder>,
): Promise<Folder> =>
  apiUpdateFolder(collectionId, id, {
    name: body.name,
    description: body.description,
    order: body.order,
  }).then(normFolder);

export const deleteFolder = (
  collectionId: string,
  id: string,
): Promise<void> => apiDeleteFolder(collectionId, id);

export const moveFolder = (
  collectionId: string,
  folderId: string,
  parentFolderId: string | null,
  order?: number,
): Promise<Folder> =>
  apiMoveFolder(collectionId, folderId, parentFolderId, order).then(normFolder);

export const cloneFolder = (
  collectionId: string,
  folderId: string,
): Promise<Folder> => apiCloneFolder(collectionId, folderId).then(normFolder);

/* ───────── import / detect / export ───────────────────────────────────── */
/**
 * Static catalogue of formats the Java importer accepts. The Java service
 * exposes `/import/detect` but not a `/formats` endpoint — keeping this
 * client-side avoids an unnecessary round-trip on app boot.
 */
export const SUPPORTED_IMPORT_FORMATS: readonly ImportFormatSpec[] = [
  { key: 'auto',         label: 'Auto-detect',              extensions: ['.json', '.yaml', '.yml', '.har', '.txt'] },
  { key: 'POSTMAN_V2_1', label: 'Postman Collection v2.1',  extensions: ['.json', '.postman_collection.json'] },
  { key: 'OPENAPI_3',    label: 'OpenAPI 3.x',              extensions: ['.yaml', '.yml', '.json'] },
  { key: 'INSOMNIA_V4',  label: 'Insomnia v4',              extensions: ['.json'] },
  { key: 'HAR_1_2',      label: 'HAR 1.2',                  extensions: ['.har', '.json'] },
  { key: 'CURL',         label: 'cURL command',             extensions: ['.txt', '.sh', '.curl'] },
  { key: 'FORGEQ',       label: 'ForgeQ native',            extensions: ['.json', '.forgeq.json'] },
] as const;

export const listImportFormats = async (): Promise<ImportFormatSpec[]> =>
  Promise.resolve([...SUPPORTED_IMPORT_FORMATS]);

export const detectImportFormat = async (
  content: string | File,
): Promise<string> => {
  const blob =
    typeof content === 'string'
      ? new Blob([content], { type: 'application/octet-stream' })
      : content;
  const filename = typeof content === 'string' ? 'paste.txt' : content.name;
  const r = await apiDetectImportFormat(blob, filename);
  return r.detectedFormat || 'unknown';
};

export const importCollectionFile = (
  workspaceId: string,
  file: File,
  format: string = 'auto',
  overrideName?: string,
): Promise<ImportSummary> =>
  apiImportCollection(workspaceId, file, format, overrideName);

/** Save-as-file helper. Returns the blob and the filename hint (if any). */
export const exportCollection = (
  id: string,
  format: string = 'POSTMAN_V2_1',
): Promise<{ blob: Blob; contentDisposition?: string }> =>
  apiExportCollection(id, format);

/* ───────── share links ────────────────────────────────────────────────── */
export const shareCollection = (
  id: string,
  body?: { visibility?: 'PUBLIC' | 'ORG' | 'PRIVATE'; ttlDays?: number; note?: string },
): Promise<ShareLink> => apiCreateShare(id, body).then(normShare);

export const listCollectionShares = (id: string): Promise<ShareLink[]> =>
  withFallback(
    () => apiListShares(id).then((rows) => rows.map(normShare)),
    () => [],
  );

export const revokeCollectionShare = (
  id: string,
  shareId: string,
): Promise<void> => apiRevokeShare(id, shareId);
