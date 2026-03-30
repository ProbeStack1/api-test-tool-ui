import { functionalTestApi } from '../lib/apiClient';

/**
 * Start a new functional test run.
 *
 * POST /api/v1/functional-tests/run
 *
 * @param {string} collectionPath - server-side path to the Postman collection JSON
 * @param {object} options        - additional run options
 * @returns {Promise<{ runId, status, startedAt, collectionName }>}
 */
export const startFunctionalRun = (collectionPath, options = {}) =>
  functionalTestApi.post('/run', {
    collectionPath,
    environmentPath:  options.environmentPath  ?? null,
    globalsPath:      options.globalsPath       ?? null,
    dataFile:         options.dataFile          ?? null,
    iterations:       options.iterations        ?? 1,
    delayMs:          options.delayMs           ?? 0,
    timeoutMs:        options.timeoutMs         ?? 30000,
    folder:           options.folder            ?? null,
    requestFilter:    options.requestFilter     ?? [],
    bail:             options.bail              ?? false,
    insecure:         options.insecure          ?? false,
    envVars:          options.envVars           ?? [],
  });

/**
 * Poll the status and result of a run.
 *
 * GET /api/v1/functional-tests/{runId}/status
 * Returns 202 while RUNNING, 200 when DONE, 500 when FAILED.
 *
 * @param {string} runId
 * @returns {Promise<{ runId, status, startedAt, completedAt, result, errorMessage }>}
 */
export const getRunStatus = (runId) =>
  functionalTestApi.get(`/${runId}/status`);

/**
 * List paginated run history from MongoDB.
 *
 * GET /api/v1/functional-tests/history?page=&size=
 *
 * @param {number} page  - 0-based page index
 * @param {number} size  - page size (max 100)
 * @returns {Promise<Array<{ runId, collectionName, status, startedAt, completedAt, totalRequests, passedRequests, failedRequests, totalTimeMs }>>}
 */
export const listRunHistory = (page = 0, size = 20) =>
  functionalTestApi.get('/history', { params: { page, size } });

/**
 * Fetch full detail for a single historical run.
 *
 * GET /api/v1/functional-tests/history/{runId}
 *
 * @param {string} runId
 * @returns {Promise<FunctionalTestRunDocument>}
 */
export const getRunHistoryDetail = (runId) =>
  functionalTestApi.get(`/history/${runId}`);

/**
 * Poll a run until it completes or fails, then resolve with the final status response.
 *
 * @param {string}   runId        - run ID returned from startFunctionalRun
 * @param {number}   intervalMs   - polling interval in ms (default 2000)
 * @param {function} onProgress   - optional callback invoked on each poll with the status response data
 * @returns {Promise<{ runId, status, result, errorMessage }>}
 */
export const pollRunUntilDone = (runId, intervalMs = 2000, onProgress = null) =>
  new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const { data } = await getRunStatus(runId);
        if (onProgress) onProgress(data);
        if (data.status === 'DONE' || data.status === 'FAILED') {
          resolve(data);
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (err) {
        reject(err);
      }
    };
    poll();
  });

/**
 * Upload a Postman collection JSON file to the functional test service.
 *
 * POST /api/v1/functional-tests/collection  (multipart/form-data)
 * Returns { collectionPath: string }
 *
 * @param {File} file - the .json file selected by the user
 * @returns {Promise<{ collectionPath: string }>}
 */
export const uploadCollection = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return functionalTestApi.post('/collection', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
