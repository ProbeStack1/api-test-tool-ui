import { testSpecificationApi } from '../lib/apiClient';

const BASE = '/api/v1/test-specs';

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

export const normalizeTestCase = (tc) => ({ ...tc });

/** GET /test-specs/spec?workspaceId=&q=&limit=&offset= */
export const listTestSpecs = (workspaceId, params = {}) =>
  testSpecificationApi.get(`${BASE}/spec`, { params: { workspaceId, ...params } })
    .then(res => ({
      total: res.data.total,
      items: (res.data.items || []).map(normalizeTestSpec),
    }));

/** GET /test-specs/{testSpecId} */
export const getTestSpec = (testSpecId) =>
  testSpecificationApi.get(`${BASE}/${testSpecId}`)
    .then(res => normalizeTestSpec(res.data));

/** POST /test-specs */
export const createTestSpec = (data) =>
  testSpecificationApi.post(`${BASE}/spec`, data).then(res => normalizeTestSpec(res.data));

/** PATCH /test-specs/{testSpecId} */
export const updateTestSpec = (testSpecId, data) =>
  testSpecificationApi.patch(`${BASE}/${testSpecId}`, data)
    .then(res => normalizeTestSpec(res.data));

/** DELETE /test-specs/{testSpecId} */
export const deleteTestSpec = (testSpecId) =>
  testSpecificationApi.delete(`${BASE}/${testSpecId}`);

/** POST /test-specs/{testSpecId}/generate → List<TestCase> */
export const generateTestCases = (testSpecId) =>
  testSpecificationApi.post(`${BASE}/${testSpecId}/generate`)
    .then(res => (res.data || []).map(normalizeTestCase));

/** GET /test-specs/{testSpecId}/test-cases?limit=&offset= */
export const listTestCases = (testSpecId, params = {}) =>
  testSpecificationApi.get(`${BASE}/${testSpecId}/test-cases`, { params })
    .then(res => ({
      total: res.data.total,
      limit: res.data.limit,
      offset: res.data.offset,
      items: (res.data.items || []).map(normalizeTestCase),
    }));
