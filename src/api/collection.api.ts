/**
 * Collection raw HTTP layer — 1:1 mapping of `collection-mgmt-svc` (port 8082).
 *
 *   page  →  services/collection.service  →  THIS FILE  →  http://<collection svc>
 *
 * Five Spring controllers are mirrored:
 *   • CollectionController  /api/v1/collections
 *   • FolderController      /api/v1/collections/{colId}/folders
 *   • ImportController      /api/v1/collections/import
 *   • ExportController      /api/v1/collections/{id}/export
 *   • CollectionShareController /api/v1/collections/{id}/(share|shares)
 *
 * Strict rules per playbook: no hard-coded URLs, no business logic, returns
 * unwrapped `data` (interceptor in `lib/http.ts` handles ResponseEnvelope).
 */
import { createHttp } from '@/lib/http';

/* ------------------------------ types ------------------------------------ */
export type SourceFormat =
  | 'MANUAL' | 'POSTMAN_V2_1' | 'OPENAPI_3' | 'CURL' | 'HAR_1_2' | 'FORGEQ' | 'INSOMNIA_V4';
export type ImportStatus = 'FOLDERS_READY' | 'REQUESTS_READY' | 'FAILED';
export type ShareScope = 'COLLECTION' | 'REQUEST';
export type ShareVisibility = 'PUBLIC' | 'ORG' | 'PRIVATE';

export interface CollectionStats {
  folderCount: number;
  requestCount: number;
  sourceBytes: number;
}

export interface CollectionSourceFile {
  contentType?: string;
  sizeBytes?: number;
  sha256?: string;
  uploadedAt?: string;
}

export interface CollectionDto {
  id: string;
  orgId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  sourceFormat: SourceFormat;
  importStatus?: ImportStatus | null;
  sourceFile?: CollectionSourceFile | null;
  stats: CollectionStats;
  tags: Record<string, string>;
  createdBy: { email: string; name: string };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FolderDto {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  pathIds: string[];
  pathNames: string[];
  name: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTreeDto {
  collectionId: string;
  folders: FolderDto[];
}

export interface ShareDto {
  id: string;
  token: string;
  url: string;
  scope: ShareScope;
  visibility: ShareVisibility;
  resourceId: string;
  note?: string | null;
  createdByEmail?: string;
  createdAt: string;
  expiresAt?: string | null;
  revoked: boolean;
  viewCount: number;
}

export interface ImportSummaryDto {
  collectionId: string;
  sourceFormat: string;
  name: string;
  folderCount?: number;
  requestCount?: number;
  exampleCount?: number;
  variableCount?: number;
  warnings?: string[];
  importedAt?: string;
}

export interface DetectResultDto {
  detectedFormat: string;
  reason?: string;
}

export interface CollectionCreateBody {
  name: string;
  description?: string;
  tags?: Record<string, string>;
}

export interface CollectionUpdateBody {
  name?: string;
  description?: string | null;
  tags?: Record<string, string>;
}

export interface FolderCreateBody {
  name: string;
  description?: string;
  parentFolderId?: string | null;
  order?: number;
}

export interface FolderUpdateBody {
  name?: string;
  description?: string | null;
  order?: number;
}

export interface ShareCreateBody {
  visibility?: ShareVisibility;
  ttlDays?: number;
  note?: string;
}

/* ----------------------------- client ------------------------------------ */
const http = createHttp('collection');
const BASE = '/api/v1/collections';

/* ============== collections (CRUD + soft-delete + clone) ================= */
export const apiListCollections = (workspaceId: string) =>
  http
    .get<CollectionDto[]>(BASE, { params: { workspaceId } })
    .then((r) => r.data);

export const apiGetCollection = (id: string) =>
  http.get<CollectionDto>(`${BASE}/${id}`).then((r) => r.data);

export const apiCreateCollection = (
  workspaceId: string,
  body: CollectionCreateBody,
) =>
  http
    .post<CollectionDto>(BASE, body, { params: { workspaceId } })
    .then((r) => r.data);

export const apiUpdateCollection = (id: string, body: CollectionUpdateBody) =>
  http.put<CollectionDto>(`${BASE}/${id}`, body).then((r) => r.data);

export const apiDeleteCollection = (id: string) =>
  http.delete<void>(`${BASE}/${id}`).then((r) => r.data);

export const apiListCollectionTrash = (workspaceId: string) =>
  http
    .get<CollectionDto[]>(`${BASE}/trash`, { params: { workspaceId } })
    .then((r) => r.data);

export const apiRestoreCollection = (id: string) =>
  http.post<CollectionDto>(`${BASE}/${id}/restore`).then((r) => r.data);

export const apiCloneCollection = (id: string) =>
  http.post<CollectionDto>(`${BASE}/${id}/clone`).then((r) => r.data);

/* ============================ folders ==================================== */
export const apiListFolders = (collectionId: string) =>
  http
    .get<FolderDto[]>(`${BASE}/${collectionId}/folders`)
    .then((r) => r.data);

export const apiGetFolderTree = (collectionId: string) =>
  http
    .get<FolderTreeDto>(`${BASE}/${collectionId}/folders/tree`)
    .then((r) => r.data);

export const apiCreateFolder = (
  collectionId: string,
  body: FolderCreateBody,
) =>
  http
    .post<FolderDto>(`${BASE}/${collectionId}/folders`, body)
    .then((r) => r.data);

export const apiUpdateFolder = (
  collectionId: string,
  folderId: string,
  body: FolderUpdateBody,
) =>
  http
    .put<FolderDto>(`${BASE}/${collectionId}/folders/${folderId}`, body)
    .then((r) => r.data);

export const apiDeleteFolder = (collectionId: string, folderId: string) =>
  http
    .delete<void>(`${BASE}/${collectionId}/folders/${folderId}`)
    .then((r) => r.data);

export const apiMoveFolder = (
  collectionId: string,
  folderId: string,
  parentFolderId: string | null,
  order?: number,
) =>
  http
    .post<FolderDto>(
      `${BASE}/${collectionId}/folders/${folderId}/move`,
      { parentFolderId, order },
    )
    .then((r) => r.data);

export const apiCloneFolder = (collectionId: string, folderId: string) =>
  http
    .post<FolderDto>(`${BASE}/${collectionId}/folders/${folderId}/clone`)
    .then((r) => r.data);

/* ====================== import / detect (multipart) ====================== */
export const apiDetectImportFormat = (file: File | Blob, filename = 'paste.txt') => {
  const fd = new FormData();
  if (file instanceof File) fd.append('file', file);
  else fd.append('file', file, filename);
  return http
    .post<DetectResultDto>(`${BASE}/import/detect`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const apiImportCollection = (
  workspaceId: string,
  file: File,
  format: string = 'auto',
  overrideName?: string,
) => {
  const fd = new FormData();
  fd.append('file', file);
  if (format && format !== 'auto') fd.append('format', format);
  const params: Record<string, string> = { workspaceId };
  if (overrideName) params.name = overrideName;
  return http
    .post<ImportSummaryDto>(`${BASE}/import`, fd, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

/* ============================== export =================================== */
/** Returns the raw blob + content-disposition so callers can save the file. */
export const apiExportCollection = async (
  id: string,
  format: string = 'POSTMAN_V2_1',
) => {
  const res = await http.get(`${BASE}/${id}/export`, {
    params: { format },
    responseType: 'blob',
  });
  return {
    blob: res.data as Blob,
    contentDisposition: res.headers['content-disposition'] as string | undefined,
  };
};

/* ============================== shares =================================== */
export const apiCreateShare = (id: string, body?: ShareCreateBody) =>
  http
    .post<ShareDto>(`${BASE}/${id}/share`, body ?? {})
    .then((r) => r.data);

export const apiListShares = (id: string) =>
  http.get<ShareDto[]>(`${BASE}/${id}/shares`).then((r) => r.data);

export const apiRevokeShare = (id: string, shareId: string) =>
  http.delete<void>(`${BASE}/${id}/shares/${shareId}`).then((r) => r.data);
