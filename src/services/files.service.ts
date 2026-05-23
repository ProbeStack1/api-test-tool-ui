/**
 * Files service — thin wrapper over the request service's file endpoints.
 *
 * Real backend surface (see {@code RequestFileController.java}):
 *
 *   POST   /api/v1/requests/files            multipart upload
 *   GET    /api/v1/requests/files/{fileRef}  download / stream
 *   DELETE /api/v1/requests/files/{fileRef}  remove
 *
 * There is intentionally no list endpoint — file refs are owned by the
 * request that uploaded them. The legacy {@code /api/v1/files} path that
 * older UI code hit no longer exists anywhere in the platform.
 */
import { requestApi } from './apiClient';

export interface ForgeQFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  provider: 'local' | 'gcs';
  url: string;
  workspaceId: string;
  uploadedAt: string;
  uploadedByEmail: string;
}

const BASE = '/api/v1/requests/files';

/**
 * No backend list endpoint exists today — return an empty list so the
 * UI's "browse my files" pickers degrade gracefully. Callers that
 * actually need a listing should track refs in their own collection
 * document and call {@link downloadUrl} per ref.
 */
export const listFiles = async (_workspaceId?: string, _limit = 50): Promise<ForgeQFile[]> => {
  return [];
};

export const uploadFile = async (workspaceId: string, file: File): Promise<ForgeQFile> => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await requestApi.post<{
    fileRef: string;
    name: string;
    sizeBytes: number;
    contentType: string;
    uploadedAt: string;
  }>(BASE, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return {
    id: data.fileRef,
    name: data.name,
    size: data.sizeBytes,
    mimeType: data.contentType,
    provider: 'local',
    url: `${BASE}/${data.fileRef}`,
    workspaceId,
    uploadedAt: data.uploadedAt,
    uploadedByEmail: '',
  };
};

export const deleteFile = (id: string) => requestApi.delete(`${BASE}/${id}`);
export const downloadUrl = (id: string) => `${BASE}/${id}`;
