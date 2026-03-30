import { loadTestApi } from '../lib/apiClient';

/**
 * Start a new load test.
 *
 * POST /api/v1/load-tests
 * Returns 202 immediately with a testId; the test runs asynchronously.
 *
 * @param {object} config - StartLoadTestRequest shape
 * @returns {Promise<{ testId, status, startedAt, streamUrl }>}
 */
export const startLoadTest = (config) =>
  loadTestApi.post('/', {
    collectionPath:    config.collectionPath    ?? null,
    url:               config.url              ?? null,
    method:            config.method           ?? 'GET',
    body:              config.body             ?? null,
    concurrency:       config.concurrency      ?? 10,
    durationSeconds:   config.durationSeconds  ?? 30,
    rampUpSeconds:     config.rampUpSeconds    ?? 0,
    targetRps:         config.targetRps        ?? 0,
    timeoutMs:         config.timeoutMs        ?? 10000,
    thinkTimeMs:       config.thinkTimeMs      ?? 0,
    totalRequests:     config.totalRequests     ?? -1,
    insecure:          config.insecure         ?? false,
    proxyUrl:          config.proxyUrl         ?? null,
    retries:           config.retries          ?? 0,
    variables:         config.variables        ?? {},
    maxErrorRatePct:   config.maxErrorRatePct  ?? 100,
    maxP99LatencyMs:   config.maxP99LatencyMs  ?? 0,
    maxAvgLatencyMs:   config.maxAvgLatencyMs  ?? 0,
  });

/**
 * Poll current test status.
 *
 * GET /api/v1/load-tests/{testId}/status
 * Returns 202 while RUNNING, 200 when DONE, 500 when FAILED.
 *
 * @param {string} testId
 * @returns {Promise<{ testId, status, startedAt, completedAt, result, errorMessage, liveMetrics }>}
 */
export const getLoadTestStatus = (testId) =>
  loadTestApi.get(`/${testId}/status`);

/**
 * Get the full aggregated report for a completed test.
 *
 * GET /api/v1/load-tests/{testId}/report
 *
 * @param {string} testId
 * @returns {Promise<RunResult | LoadTestRunDocument>}
 */
export const getLoadTestReport = (testId) =>
  loadTestApi.get(`/${testId}/report`);

/**
 * Subscribe to real-time metrics via Server-Sent Events.
 *
 * GET /api/v1/load-tests/{testId}/stream  (text/event-stream)
 *
 * Each SSE data event is a MetricsSnapshot JSON object:
 *   { testId, timestamp, totalRequests, activeRequests, successfulRequests,
 *     failedRequests, errorRatePct, currentRps, overallRps,
 *     p50Ms, p95Ms, p99Ms, avgLatencyMs, running }
 *
 * @param {string}   testId      - load test ID
 * @param {function} onSnapshot  - called with each MetricsSnapshot object
 * @param {function} onDone      - called when stream closes (last snapshot or null on error)
 * @returns {EventSource}        - caller must call es.close() on component unmount
 */
export const openMetricsStream = (testId, onSnapshot, onDone) => {
  const es = new EventSource(`/api/v1/load-tests/${testId}/stream`);

  es.onmessage = (event) => {
    try {
      const snapshot = JSON.parse(event.data);
      onSnapshot(snapshot);
      // Backend sets running=false on the last snapshot
      if (!snapshot.running) {
        es.close();
        onDone(snapshot);
      }
    } catch {
      // Ignore malformed events
    }
  };

  es.onerror = () => {
    es.close();
    onDone(null);
  };

  return es;
};

/**
 * List paginated load test history from MongoDB.
 *
 * GET /api/v1/load-tests/history?page=&size=
 *
 * @param {number} page
 * @param {number} size
 * @returns {Promise<Array<LoadTestHistoryItem>>}
 */
export const listLoadTestHistory = (page = 0, size = 20) =>
  loadTestApi.get('/history', { params: { page, size } });

/**
 * Get full detail for a single historical load test run.
 *
 * GET /api/v1/load-tests/history/{testId}
 *
 * @param {string} testId
 * @returns {Promise<LoadTestRunDocument>}
 */
export const getLoadTestHistoryDetail = (testId) =>
  loadTestApi.get(`/history/${testId}`);

/**
 * Upload a Postman collection JSON file to the load test service.
 *
 * POST /api/v1/load-tests/collection  (multipart/form-data)
 * Returns { collectionPath: string }
 *
 * @param {File} file - the .json file selected by the user
 * @returns {Promise<{ collectionPath: string }>}
 */
export const uploadCollection = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return loadTestApi.post('/collection', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
