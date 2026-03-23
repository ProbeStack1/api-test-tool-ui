import {testSpecificationApi} from '../lib/apiClient';

const TEST_SPECIFICATION_BASE = '/api/v1/test-specs/library';

/**
 * Normalize a library item from backend to frontend shape.
 * Backend: { id, name, description, category, content, isActive }
 * Frontend: { id, name, description, category, content, isActive }
 */
export const normalizeLibraryItem = (item) => ({
  id: item.id,
  name: item.name,
  description: item.description || '',
  category: item.category || '',
  content: item.content,
  isActive: item.isActive,
  createdBy: item.createdBy, 
});

/**
 * List all library items (optionally filtered by q).
 * GET /test-specs/library?q=
 */
export const listLibraryItems = (q = '') =>
  testSpecificationApi.get(TEST_SPECIFICATION_BASE, {
    params: { q }
  }).then(res => (res.data || []).map(normalizeLibraryItem));

/**
 * Create a new library item.
 * POST /test-specs/library
 * Request body: { name, description, category, content }
 */
export const createLibraryItem = (data) =>
  testSpecificationApi.post(TEST_SPECIFICATION_BASE, data).then(res => normalizeLibraryItem(res.data));

/**
 * Get a single library item by ID.
 * GET /test-specs/library/{libraryItemId}
 */
export const getLibraryItem = (libraryItemId) =>
  testSpecificationApi.get(`${TEST_SPECIFICATION_BASE}/${libraryItemId}`).then(res => normalizeLibraryItem(res.data));

/**
 * Update a library item.
 * PATCH /test-specs/library/{libraryItemId}
 * Request body: partial { name, description, category, content }
 */
export const updateLibraryItem = (libraryItemId, data) =>
  testSpecificationApi.patch(`${TEST_SPECIFICATION_BASE}/${libraryItemId}`, data).then(res => normalizeLibraryItem(res.data));

/**
 * Delete a library item.
 * DELETE /test-specs/library/{libraryItemId}
 */
export const deleteLibraryItem = (libraryItemId) =>
  testSpecificationApi.delete(`${TEST_SPECIFICATION_BASE}/${libraryItemId}`);

/**
 * Import a library item into a workspace as a test spec.
 * POST /test-specs/library/{libraryItemId}/import
 * Request body: { workspaceId }
 */
export const importLibraryItem = (libraryItemId, workspaceId) =>
  testSpecificationApi.post(`${TEST_SPECIFICATION_BASE}/${libraryItemId}/import`, { workspaceId }).then(res => res.data); // returns a TestSpec object