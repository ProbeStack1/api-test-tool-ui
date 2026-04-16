import { functionalTestApi } from '../lib/apiClient';

// Helper to set workspace header for all requests
const wsHeaders = (workspaceId) => workspaceId ? { 'X-Workspace-Id': workspaceId } : {};

export const startFunctionalRun = (collectionPath, options = {}) =>
  functionalTestApi.post('/run', {
    collectionPath,
    collectionName:   options.collectionName   ?? null,
    workspaceId:      options.workspaceId      ?? null,
    source:           options.source           ?? 'MANUAL',
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
    includedTestCases: options.includedTestCases ?? [],
  }, { headers: wsHeaders(options.workspaceId) });

export const getRunStatus = (runId) =>
  functionalTestApi.get(`/${runId}/status`);

export const listRunHistory = (page = 0, size = 20) =>
  functionalTestApi.get('/history', { params: { page, size } });

export const getRunHistoryDetail = (runId) =>
  functionalTestApi.get(`/history/${runId}`);

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

export const uploadCollection = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return functionalTestApi.post('/collection', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadCollectionToGcs = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return functionalTestApi.post('/collection/upload-gcs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadLocalToGcs = (collectionPath) =>
  functionalTestApi.post('/collection/to-gcs', { collectionPath });

export const uploadAndParseCollection = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return functionalTestApi.post('/collection/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const parseCollectionByPath = (collectionPath) =>
  functionalTestApi.post('/collection/parse-path', { collectionPath });

export const executeSingleRequest = (requestData) =>
  functionalTestApi.post('/execute-request', requestData);

export const generateTestCases = (request) =>
  functionalTestApi.post('/generate-tests', request);

export const saveTestCases = (request, workspaceId) =>
  functionalTestApi.post('/test-cases/save', request, { headers: wsHeaders(workspaceId) });

export const listSavedTestCases = ({ workspaceId, collectionName, page = 0, size = 50 } = {}) => {
  const params = new URLSearchParams();
  if (collectionName) params.append('collectionName', collectionName);
  params.append('page', page);
  params.append('size', size);
  return functionalTestApi.get('/test-cases?' + params.toString(), { headers: wsHeaders(workspaceId) });
};

export const getSavedTestCase = (id) =>
  functionalTestApi.get('/test-cases/' + id);

export const deleteSavedTestCase = (id) =>
  functionalTestApi.delete('/test-cases/' + id);

export const deleteAllSavedTestCases = (collectionPath) =>
  functionalTestApi.delete('/test-cases?collectionPath=' + encodeURIComponent(collectionPath));

export const downloadHtmlReport = (runId) =>
  functionalTestApi.get('/reports/' + runId + '/html', { responseType: 'blob' });

export const downloadJsonReport = (runId) =>
  functionalTestApi.get('/reports/' + runId + '/json', { responseType: 'blob' });

export const downloadJUnitReport = (runId) =>
  functionalTestApi.get('/reports/' + runId + '/junit', { responseType: 'blob' });

export const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const uploadEnvironment = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return functionalTestApi.post('/environment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadGlobals = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return functionalTestApi.post('/globals', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Scheduled Runs ──────────────────────────────────────────

export const createSchedule = (data, workspaceId) =>
  functionalTestApi.post('/schedules', data, { headers: wsHeaders(workspaceId) });

export const listSchedules = (workspaceId) =>
  functionalTestApi.get('/schedules', { headers: wsHeaders(workspaceId) });

export const getSchedule = (id) =>
  functionalTestApi.get('/schedules/' + id);

export const updateSchedule = (id, data) =>
  functionalTestApi.put('/schedules/' + id, data);

export const deleteSchedule = (id) =>
  functionalTestApi.delete('/schedules/' + id);

export const toggleSchedule = (id) =>
  functionalTestApi.post('/schedules/' + id + '/toggle');

export const triggerScheduleNow = (id) =>
  functionalTestApi.post('/schedules/' + id + '/trigger');
