import {testSpecificationApi} from '../lib/apiClient';

const TEST_SPECIFICATION_BASE = '/api/v1/test-specs';

/**
 * Normalize a test spec from backend to frontend shape.
 * Backend: { id, name, content, source, sourceId, workspaceId, createdAt, updatedAt }
 * Frontend: { id, name, content, source, sourceId, workspaceId, createdAt, updatedAt }
 */
export const normalizeTestSpec = (spec) => ({
  id: spec.id,
  name: spec.name,
  content: spec.content,
  source: spec.source,
  sourceId: spec.sourceId,
  workspaceId: spec.workspaceId,
  createdAt: spec.createdAt,
  updatedAt: spec.updatedAt,
});

/**
 * List test specs for a workspace.
 * GET /test-specs?workspaceId=&q=&limit=&offset=
 */
export const listTestSpecs = (workspaceId, params = {}) =>
  testSpecificationApi.get(TEST_SPECIFICATION_BASE, {
    params: { workspaceId, ...params }
  }).then(res => ({
    total: res.data.total,
    items: (res.data.items || []).map(normalizeTestSpec),
  }));

/**
 * Create a new test spec.
 * POST /test-specs
 * Request body must include workspaceId, name, content (optional), etc.
 */
export const createTestSpec = (data) =>
  testSpecificationApi.post(TEST_SPECIFICATION_BASE, data).then(res => normalizeTestSpec(res.data));

/**
 * Update a test spec.
 * PATCH /test-specs/{testSpecId}
 */
export const updateTestSpec = (testSpecId, data) =>
  testSpecificationApi.patch(`${TEST_SPECIFICATION_BASE}/${testSpecId}`, data).then(res => normalizeTestSpec(res.data));

/**
 * Delete a test spec.
 * DELETE /test-specs/{testSpecId}
 */
export const deleteTestSpec = (testSpecId) =>
  testSpecificationApi.delete(`${TEST_SPECIFICATION_BASE}/${testSpecId}`);