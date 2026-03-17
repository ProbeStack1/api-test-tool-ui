import {testFileApi} from '../lib/apiClient';

const TEST_FILE_BASE = '/api/v1/test-files';

/**
 * Normalize a test file from backend to frontend shape.
 * Backend: { id, name, type, size, uploadedAt }
 * Frontend: { id, name, type, size, uploadedAt } (same)
 */
export const normalizeTestFile = (file) => ({
  id: file.id,
  name: file.name,
  type: file.type,          // e.g. 'json', 'csv'
  size: file.size,
  uploadedAt: file.uploadedAt,
});

/**
 * List test files for a workspace.
 * GET /test-files?workspaceId=&limit=&offset=
 */
export const listTestFiles = (workspaceId, params = {}) =>
  testFileApi.get(TEST_FILE_BASE, {
    params: { workspaceId, ...params },
  }).then(res => ({
    ...res.data,
    items: (res.data.items || []).map(normalizeTestFile),
  }));

/**
 * Upload a new test file.
 * POST /test-files (multipart/form-data)
 */
export const uploadTestFile = (workspaceId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspaceId', workspaceId);
  return testFileApi.post(TEST_FILE_BASE, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(res => normalizeTestFile(res.data));
};

/**
 * Delete a test file.
 * DELETE /test-files/{testFileId}
 */
export const deleteTestFile = (testFileId) =>
  testFileApi.delete(`${TEST_FILE_BASE}/${testFileId}`);

/**
 * Download a test file (returns blob).
 * GET /test-files/{testFileId}/download
 */
export const downloadTestFile = (testFileId) =>
  testFileApi.get(`${TEST_FILE_BASE}/${testFileId}/download`, {
    responseType: 'blob',
  });

/**
 * Get a single test file's metadata.
 * GET /test-files/{testFileId}
 */
export const getTestFileDetails = (testFileId) =>
  testFileApi.get(`${TEST_FILE_BASE}/${testFileId}`).then(res => normalizeTestFile(res.data));