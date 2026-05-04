/**
 * Files service — wraps /api/v1/files endpoints.
 */
import { requestApi } from './apiClient';

export interface ForgeQFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  provider: 'gcs' | 'local';
  url: string;
  gsPath?: string;
  workspaceId: string;
  uploadedAt: string;
  uploadedByEmail: string;
}

const BASE = '/api/v1/files';

export const listFiles = (workspaceId?: string, limit = 50) =>
  requestApi.get<ForgeQFile[]>(BASE, { params: workspaceId ? { workspaceId, limit } : { limit } }).then((r) => r.data);

export const uploadFile = async (workspaceId: string, file: File) => {
  // Per spec: form-data file upload now lives inside the request service.
  // Hit /api/v1/requests/files first; if it 404s (older deployments), fall
  // back to the legacy project-scoped /api/v1/files endpoint.
  const fd = new FormData();
  fd.append('file', file);
  try {
    const { data } = await requestApi.post<{
      fileRef: string;
      name: string;
      sizeBytes: number;
      contentType: string;
      uploadedAt: string;
    }>('/api/v1/requests/files', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Adapt the request-service response back to the ForgeQFile shape that
    // older UI code expects, so existing callers keep working.
    return {
      id: data.fileRef,
      name: data.name,
      size: data.sizeBytes,
      mimeType: data.contentType,
      provider: 'local' as const,
      url: `/api/v1/requests/files/${data.fileRef}`,
      workspaceId,
      uploadedAt: data.uploadedAt,
      uploadedByEmail: '',
    } as ForgeQFile;
  } catch (e: any) {
    if (e?.status !== 404) throw e;
    const fd2 = new FormData();
    fd2.append('workspaceId', workspaceId);
    fd2.append('file', file);
    const { data } = await requestApi.post<ForgeQFile>(BASE, fd2, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
};

export const deleteFile = (id: string) => requestApi.delete(`${BASE}/${id}`);
