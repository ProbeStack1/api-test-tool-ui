import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {Loader2 , Sun, Moon, User, LogOut, ChevronDown, Search as SearchIcon, BookOpen, Settings, History, LayoutGrid, Layers, BarChart3,Check , Bot,Plus,Info, Activity  } from 'lucide-react';
import clsx from 'clsx';
import { USER_ID } from '././lib/apiClient';
import { executeScript } from './utils/scriptExecutor';
import localForage from 'localforage';
import { fetchWorkspaces, createWorkspace, normalizeWorkspace } from './services/workspaceService';
import { fetchCollections, normalizeCollection, fetchFolders, normalizeFolder, createCollection, listCollectionRuns,listWorkspaceLoadTests  } from './services/collectionService';
import { startFunctionalRun, pollRunUntilDone, getRunHistoryDetail, listRunHistory } from './services/functionalTestService';
import { startLoadTest as startLoadTestApi, getLoadTestReport, listLoadTestHistory } from './services/loadTestService';
import { fetchRequests, normalizeRequest,updateRequest,createRequest ,executeRequest,executeCollection ,fetchGlobalHistory, deleteHistoryItem,fetchHistoryEntry  } from './services/requestService';
import {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  deactivateEnvironment,
  normalizeEnvironment
} from './services/environmentService'
import {
  createMockServer,
  getAllMockServers,
  updateMockServer,
  toggleMockServer,
  deleteMockServer,
  executeGetOnMock,
  executePostOnMock,
  executePutOnMock,
  executeDeleteOnMock,
  executePatchOnMock,
  updateEndpoint,
  createEndpoint,
  getEndpoints,
} from './services/mockServerService'; ;
import Home from './components/Home';
import Reports from './components/Reports';
import Explore from './components/Explore';
import TestingToolPage from './pages/TestingToolPage';
import SettingsPage from './pages/SettingsPage';
import { Profile } from './pages/Profile';
import { ProfileSupport } from './pages/ProfileSupport';
import { ProfileSupportTicket } from './pages/ProfileSupportTicket';
import {toast} from 'sonner';
import AIAssisted from './pages/AIAssisted';
import WorkspaceCreateModal from './components/modals/WorkspaceCreateModal';
import { useVariableMaps } from './components/VariableHighlightInput';
import RunModal from './components/modals/RunModal';
import AIChatbotHelper from './components/AiChatbotHelper';
import ProjectManagementPage from './pages/ProjectManagementPage';

// Flatten all request items recursively from a collection tree
const flattenCollectionRequests = (items = []) => {
  const requests = [];
  const traverse = (list) => {
    list.forEach(item => {
      if (item.type === 'request') requests.push(item);
      else if (item.items) traverse(item.items);
    });
  };
  traverse(items);
  return requests;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
const currentUserId = USER_ID;
  const [environmentVariablesDirty, setEnvironmentVariablesDirty] = useState(false);
  const [globalEnvironment, setGlobalEnvironment] = useState(null);
const [globalVariablesDirty, setGlobalVariablesDirty] = useState(false);
const [mockServers, setMockServers] = useState([]);
const [isLoadingMocks, setIsLoadingMocks] = useState(false);
const [projects, setProjects] = useState([]);
const [workspaceSearch, setWorkspaceSearch] = useState('');
const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
const workspaceDropdownRef = useRef(null);



const [chatbotVisible, setChatbotVisible] = useState(false);
const [chatbotError, setChatbotError] = useState(null);
const [chatbotResponse, setChatbotResponse] = useState(null);
const [chatbotRequestInfo, setChatbotRequestInfo] = useState(null);

const [workspaceRuns, setWorkspaceRuns] = useState([]);
const [loadingRuns, setLoadingRuns] = useState(false);
const [loadTestRuns, setLoadTestRuns] = useState([]);
const [loadingLoadRuns, setLoadingLoadRuns] = useState(false);

const handleShowChatbot = (error, response, requestInfo) => {
  setChatbotError(error);
  setChatbotResponse(response);
  setChatbotRequestInfo(requestInfo);
  setChatbotVisible(true);
};

const handleCloseChatbot = () => {
  setChatbotVisible(false);
  setTimeout(() => {
    setChatbotError(null);
    setChatbotResponse(null);
    setChatbotRequestInfo(null);
  }, 300);
};


// ========== IndexedDB storage using localForage ==========
const tabDB = localForage.createInstance({
  name: 'ProbeStack',
  storeName: 'workspace_tabs'
});

const contextualDB = localForage.createInstance({
  name: 'ProbeStack',
  storeName: 'contextual_tabs'
});

// Sanitize a tab for storage using safeStringify (handles circular refs and non-serializable values)
const sanitizeTabForStorage = (tab) => {
  if (!tab) return tab;
  try {
    // Use safeStringify to get a clean JSON string (removes functions, circular refs, etc.)
    const jsonString = safeStringify(tab);
    if (!jsonString) return null;
    const parsed = JSON.parse(jsonString);
    // Remove any large transient fields that might have survived (though safeStringify should have handled them)
    const { response, isLoading, results, ...essential } = parsed;
    return essential;
  } catch (err) {
    console.error('Failed to sanitize tab', err);
    return null;
  }
};

const sanitizeTabsForStorage = (tabs) => tabs.map(sanitizeTabForStorage).filter(Boolean);

// Save workspace tabs to IndexedDB (without response data)
const saveWorkspaceTabsToDB = async (workspaceId, tabs, activeIdx) => {
  try {
    const cleanedTabs = sanitizeTabsForStorage(tabs);
    const data = { tabs: cleanedTabs, activeIndex: activeIdx, updatedAt: Date.now() };
    await tabDB.setItem(`workspace_${workspaceId}`, data);
  } catch (err) {
    console.error('Failed to save tabs to IndexedDB', err);
  }
};

// Save workspace tabs to IndexedDB (without response data)
const saveWorkspaceTabs = (workspaceId, tabs, activeIdx) => {
  saveWorkspaceTabsToDB(workspaceId, tabs, activeIdx);
  // Memory cache bhi update karo (fast switching ke liye)
  setWorkspaceTabs(prev => ({ ...prev, [workspaceId]: tabs }));
  setWorkspaceActiveIndex(prev => ({ ...prev, [workspaceId]: activeIdx }));
};

// Load workspace tabs from IndexedDB
const loadWorkspaceTabsFromDB = async (workspaceId) => {
  try {
    const data = await tabDB.getItem(`workspace_${workspaceId}`);
    if (!data) return null;
    // response aur isLoading fields wapas add karo (null/ false)
    const tabsWithDefaults = data.tabs.map(tab => ({ ...tab, response: null, isLoading: false }));
    return { tabs: tabsWithDefaults, activeIndex: data.activeIndex };
  } catch (err) {
    console.error('Failed to load tabs from IndexedDB', err);
    return null;
  }
};

// Save contextual tabs (Collections / Mock views)
const saveContextualTabsToDB = async (workspaceId, context, tabs, activeIndex) => {
  try {
    const cleanedTabs = sanitizeTabsForStorage(tabs);
    const data = { tabs: cleanedTabs, activeIndex };
    await contextualDB.setItem(`ctx_${workspaceId}_${context}`, data);
    // Memory state bhi update karo (optional, fast access ke liye)
    setContextualTabs(prev => ({
      ...prev,
      [workspaceId]: { ...prev[workspaceId], [context]: { tabs, activeIndex } }
    }));
  } catch (err) {
    console.error('Failed to save contextual tabs', err);
  }
};

// Load contextual tabs from IndexedDB
const loadContextualTabsFromDB = async (workspaceId, context) => {
  try {
    const data = await contextualDB.getItem(`ctx_${workspaceId}_${context}`);
    if (!data) return null;
    const tabsWithDefaults = data.tabs.map(tab => ({ ...tab, response: null, isLoading: false }));
    return { tabs: tabsWithDefaults, activeIndex: data.activeIndex };
  } catch (err) {
    console.error('Failed to load contextual tabs', err);
    return null;
  }
};

const handleCreateProjectTab = () => {
  const newTab = {
    id: `project-wizard-${Date.now()}`,
    type: 'project-wizard',
    name: 'New Project',
  };
  handleNewTab(newTab);
};

const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') return undefined;
    // Detect DOM nodes: nodeType is a number (1-11) or tagName is a string
    if (value && typeof value === 'object' && (value.nodeType !== undefined || value.tagName !== undefined)) {
      return undefined;
    }
    if (value && typeof value === 'object' && value.$$typeof) return undefined;
    if (value && typeof value === 'object' && (value._owner !== undefined || value.__reactFiber !== undefined || value._reactInternals !== undefined)) {
      return undefined;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
};


const buildPristineFromRequests = (reqs) => {
  const pristine = {};
  reqs.forEach(req => {
    if (isSavedRequest(req)) {
      pristine[req.id] = JSON.parse(JSON.stringify(req));
    }
  });
  return pristine;
};

// Helper to compute environment overrides for collection/load runs
const getEnvironmentOverrides = () => {
  const activeEnvironment = environments.find(e => e.isActive);
  const combined = {};

  if (activeEnvironment) {
    // Add active environment variables
    (activeEnvironment.variables || []).forEach(v => {
      if (v.key && v.value) combined[v.key] = v.value;
    });
    // If active environment is not global, also add global variables
    if (activeEnvironment.environment_type !== 'global' && globalEnvironment) {
      (globalEnvironment.variables || []).forEach(v => {
        if (v.key && v.value) combined[v.key] = v.value;
      });
    }
  } else {
    // No active environment – use only global variables
    if (globalEnvironment) {
      (globalEnvironment.variables || []).forEach(v => {
        if (v.key && v.value) combined[v.key] = v.value;
      });
    }
  }

  return combined;
};

const loadWorkspaceTabsAndData = async (workspaceId, workspaceName) => {
  const saved = await loadWorkspaceTabsFromDB(workspaceId);
  if (saved && saved.tabs.length > 0) {
    setRequests(saved.tabs);
    setActiveRequestIndex(saved.activeIndex);
    setPristineRequests(buildPristineFromRequests(saved.tabs));
  } else {
    setRequests([createEmptyRequest()]);
    setActiveRequestIndex(0);
    setPristineRequests({});
  }
};

const handleOpenWorkspaceDetails = (workspaceId) => {
  const workspace = projects.find(p => p.id === workspaceId);
  if (!workspace) return;

  // Check if already open
  const existingIndex = requests.findIndex(r => r.type === 'workspace-details' && r.workspaceId === workspaceId);
  if (existingIndex !== -1) {
    setActiveRequestIndex(existingIndex);
    return;
  }

  const newTab = {
    id: `workspace-details-${workspaceId}-${Date.now()}`,
    type: 'workspace-details',
    workspaceId: workspace.id,
    name: `Project: ${workspace.name}`,
    // can store workspace object or just id
  };
  setRequests(prev => [...prev, newTab]);
  setActiveRequestIndex(requests.length); // will be the new last index
};

const handleSelectWorkspace = async (workspaceId) => {
  // Save current tabs (as before)
  if (activeWorkspaceId && (currentActiveMenu === 'collections' || currentActiveMenu === 'mock-service')) {
    await saveContextualTabsToDB(activeWorkspaceId, currentActiveMenu, requests, activeRequestIndex);
  } else if (activeWorkspaceId) {
    await saveWorkspaceTabsToDB(activeWorkspaceId, requests, activeRequestIndex);
  }

  const workspaceName = projects.find(p => p.id === workspaceId)?.name || workspaceId;
  setActiveWorkspaceId(workspaceId);
  localStorage.setItem('probestack_active_workspace_id', workspaceId);

  // Load tabs for new workspace
  if (currentActiveMenu === 'collections' || currentActiveMenu === 'mock-service' || currentActiveMenu === 'mcp-test') {
    const saved = await loadContextualTabsFromDB(workspaceId, currentActiveMenu);
    if (saved) {
      setRequests(saved.tabs);
      setActiveRequestIndex(saved.activeIndex);
    } else {
      if (currentActiveMenu === 'collections') {
        setRequests([createEmptyRequest()]);
        setActiveRequestIndex(0);
      } else {
        setRequests([]);
        setActiveRequestIndex(0);
      }
    }
  } else {
    await loadWorkspaceTabsAndData(workspaceId, workspaceName);
  }

  setIsWorkspaceDropdownOpen(false);

  // Environment update (same as before)
  const workspaceEnvs = environments.filter(env => env.workspaceId === workspaceId);
  const activeEnv = workspaceEnvs.find(env => env.isActive);
  if (activeEnv) {
    setSelectedEnvironmentId(activeEnv.id);
    setEnvironmentVariables(activeEnv.variables || []);
  } else {
    setSelectedEnvironmentId('no-env');
    setEnvironmentVariables([]);
  }
};

const fetchMockServers = async () => {
  setIsLoadingMocks(true);
  try {
    const response = await getAllMockServers();
    const mocks = response.data || [];
    // For each mock, fetch its endpoints
    const mocksWithEndpoints = await Promise.all(
      mocks.map(async (mock) => {
        try {
          const endpointsRes = await getEndpoints(mock.id, { limit: 100 }); // we need to import getEndpoints
          
          return { ...mock, endpoints: endpointsRes.data || [] };
        } catch (err) {
          return { ...mock, endpoints: [] };
        }
      })
    );
    setMockServers(mocksWithEndpoints);
  } catch (error) {
    // toast.error('Could not load mock servers');
  } finally {
    setIsLoadingMocks(false);
  }
};

const handleOpenCollectionRun = (collection) => {
  // Check if already open
  const existingIndex = requests.findIndex(r => r.type === 'collection-run' && r.collectionId === collection.id);
  if (existingIndex !== -1) {
    setActiveRequestIndex(existingIndex);
    return;
  }

  const newTab = {
    id: `collection-run-${collection.id}-${Date.now()}`,
    type: 'collection-run',
    collectionId: collection.id,
    collectionName: collection.name,
    name: `Run: ${collection.name}`,
  };
  setRequests(prev => [...prev, newTab]);
  setActiveRequestIndex(requests.length);
};

const handleRunLoadTest = async (collectionId, config, configTabIndex) => {
  if (isRunningLoadTest) return;
  setIsRunningLoadTest(true);
  setLoadTestResults(null);

    const environmentOverrides = getEnvironmentOverrides();
  // console.log('[loadTest] handleRunLoadTest called with collectionId:', collectionId, 'config:', config);
  const loadConfig = {
    concurrency: config.concurrency,
    durationSeconds: config.durationSeconds,
    rampUpSeconds: config.rampUpSeconds,
    targetRps: config.targetRps,
    timeoutMs: config.timeoutMs,
    thinkTimeMs: config.thinkTimeMs,
    insecure: config.insecure,
    maxErrorRatePct: config.maxErrorRatePct,
    maxP99LatencyMs: config.maxP99LatencyMs,
    maxAvgLatencyMs: config.maxAvgLatencyMs,
    collectionPathOverride: config.collectionPathOverride,
    // environmentOverrides,
  };
  //  console.log('[loadTest] Sending to startLoadTestApi:', loadConfig);
  

  const runningTab = {
    id: `load-test-running-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'load-test-running',
    name: `Load Test Running`,
    loadTestId: null,
    config,
  };

if (configTabIndex >= 0 && configTabIndex < requests.length) {
    // Replace existing tab
    setRequests(prev => {
      const newRequests = [...prev];
      newRequests[configTabIndex] = runningTab;
      return newRequests;
    });
  } else {
    // Add as new tab (standalone)
    handleNewTab(runningTab);
    // 👇 Navigate to collections so the new tab becomes visible
    navigate('/workspace/collections');
  }

  try {
    const response = await startLoadTestApi({
      ...loadConfig,
      // Use override path (from upload) if set, otherwise use collectionId (workspace path)
      collectionPath: loadConfig.collectionPathOverride ?? collectionId,
    });
    // console.log('[loadTest] startLoadTestApi response:', response.data);
    const realId = response.data?.testId ?? response.data;

    // Update the running tab with the real ID
    if (configTabIndex >= 0 && configTabIndex < requests.length) {
      setRequests(prev => {
        const newRequests = [...prev];
        if (newRequests[configTabIndex] && newRequests[configTabIndex].type === 'load-test-running') {
          newRequests[configTabIndex] = {
            ...newRequests[configTabIndex],
            loadTestId: realId,
          };
        }
        return newRequests;
      });
    } else {
      setRequests(prev =>
        prev.map(tab =>
          tab.id === runningTab.id ? { ...tab, loadTestId: realId } : tab
        )
      );
    }

    if (configTabIndex >= 0) {
      navigate('/workspace/collections');
    }

    // Load test is now running asynchronously — clear the starting flag
    setIsRunningLoadTest(false);

  } catch (error) {
     console.error('[loadTest] startLoadTestApi error:', error.response?.data || error.message);
    toast.error(`Failed to start load test: ${error.message}`);
    if (configTabIndex >= 0 && configTabIndex < requests.length) {
      handleCloseTab(configTabIndex);
    } else {
      setRequests(prev => prev.filter(tab => tab.id !== runningTab.id));
    }
    setIsRunningLoadTest(false);
  }
};

const handleRunCollectionWithOrder = async (collectionId, selected, options, tabIndex) => {

  if (options.type === 'load') {
    // Build load test config from UI options
    const loadConfig = {
      concurrency: options.virtualUsers || 20,
      durationSeconds: options.durationUnit === 'mins' ? options.duration * 60 : options.duration,
      rampUpSeconds: options.rampUp || 0,
      targetRps: options.targetRps || 0,
      timeoutMs: options.timeoutMs || 30000,
      thinkTimeMs: options.thinkTimeMs ?? options.delay ?? 0,
      insecure: options.insecure || false,
      maxErrorRatePct: options.maxErrorRatePct || 5,
      maxP99LatencyMs: options.maxP99LatencyMs || 5000,
      maxAvgLatencyMs: options.maxAvgLatencyMs || 2000,
      collectionPathOverride: options.collectionPathOverride ?? null,
    };
    await handleRunLoadTest(collectionId, loadConfig, tabIndex);
    return;
  }
  setIsRunningCollection(true);

  try {
    const environmentOverrides = getEnvironmentOverrides();

    // Resolve collection path: use collectionPathOverride (from upload), then collectionPath field, then fall back to collectionId
    const collection = collections.find(c => c.id === collectionId);
    const collectionPath = options.collectionPathOverride
      ?? (collection?.collectionPath ?? collectionId);

    // Map selected request IDs → request names for requestFilter
    const allRequests = flattenCollectionRequests(collection?.items || []);
    const requestFilter = selected && selected.length > 0
      ? allRequests.filter(r => selected.includes(r.id)).map(r => r.name)
      : [];

    // Start the run — returns { runId, status, startedAt, collectionName }
    const response = await startFunctionalRun(collectionPath, {
      iterations:    options.iterations    || 1,
      delayMs:       options.delay         || 0,
      timeoutMs:     options.timeoutMs     || 30000,
      dataFile:      options.dataFile      ?? options.testFile ?? null,
      folder:        options.folderFilter  ?? null,
      requestFilter,
      bail:          options.bail          || false,
      insecure:      options.insecure      || false,
      environmentPath: options.environmentPath ?? null,
      globalsPath:     options.globalsPath     ?? null,
      envVars: environmentOverrides
        ? Object.entries(environmentOverrides).map(([k, v]) => `${k}=${v}`)
        : [],
    });

    const runId = response.data?.runId ?? response.data;

    // Poll until DONE or FAILED
    const finalData = await pollRunUntilDone(runId, 2000);

    // Normalise to the shape expected by CollectionRunResultsView
const runData = {
  ...finalData,
  status: finalData.status === 'DONE' ? 'completed' : 'failed',
  collectionId,
  iterations: options.iterations ?? 1,
  ...(finalData.result || {}),
};

    handleOpenCollectionRunResults(runData, collectionId, tabIndex);
    setIsRunningCollection(false);

  } catch (error) {
    console.error('Error starting functional run:', error);
    toast.error(`Run failed: ${error.message}`);
    setIsRunningCollection(false);
  }
};

const handleLoadTestComplete = async (loadTestId) => {
  try {
    const response = await getLoadTestReport(loadTestId);
    const completedRun = response.data;
    setLoadTestRuns(prev => [completedRun, ...prev]);
  } catch (err) {
    console.error('Failed to fetch completed load test report:', err);
  }
};

const flattenRequests = (items) => {
  const requests = [];
  const traverse = (items) => {
    if (!items) return;
    items.forEach(item => {
      if (item.type === 'request') {
        requests.push(item);
      } else if (item.items) {
        traverse(item.items);
      }
    });
  };
  traverse(items);
  return requests;
};

const handleOpenCollectionRunResults = (runData, collectionId, tabIndex, shouldNavigate = true, refresh = true) => {
  if (!runData) {
    console.error('Cannot open results tab – runData is null');
    return;
  }

  const collection = collections.find(c => c.id === runData.collectionId);
  const avgTime = runData.totalRequests > 0 
    ? Math.round(runData.totalTimeMs / runData.totalRequests) 
    : 0;

  // Use runData.requests (functional test) or fallback to runData.results (collection run)
  const sourceResults = runData.requests || runData.results || [];

  const mappedResults = {
    collectionName: runData.collectionName || collection?.name || 'Collection',
    source: runData.source || 'manual',
    environment: runData.options?.environment ? 'provided' : 'No Environment',
    iterations: runData.iterations ?? runData.options?.iterations ?? 1,
    duration: runData.totalTimeMs,
    totalRequests: runData.totalRequests,
    passed: runData.passedRequests,
    failed: runData.failedRequests,
    skipped: runData.skippedRequests ?? 0,
    errors: runData.failedRequests,
    avgResponseTime: avgTime,
    totalAssertions: runData.totalAssertions ?? 0,
    passedAssertions: runData.passedAssertions ?? 0,
    failedAssertions: runData.failedAssertions ?? 0,
    errorMessage: runData.errorMessage ?? null,
    results: sourceResults.map((r, idx) => ({
      requestId: r.requestId || `req-${idx}`,
      requestName: r.itemName ?? r.requestName ?? r.name,
      method: r.method,
      url: r.url,
      status: r.statusCode,
      statusText: r.statusText || '',
      time: r.responseTimeMs,
      size: r.responseSizeBytes,
      success: r.passed,
      error: r.error,
      skipped: r.skipped,
      assertions: r.assertions ?? [],
      fullDetails: {
        request_headers: r.requestHeaders,
        request_body: r.requestBody,
        response_headers: r.responseHeaders,
        response_body: r.responseBody,
      }
    }))
  };

  const resultsTab = {
    id: `run-results-${Date.now()}`,
    type: 'collection-run-results',
    name: `Run Results: ${runData.collectionName || collection?.name || 'Collection'}`,
    results: mappedResults,
    collectionId: runData.collectionId,
  };

  // Replace or add the tab
  if (tabIndex >= 0 && tabIndex < requests.length) {
    setRequests(prev => {
      const newRequests = [...prev];
      newRequests[tabIndex] = resultsTab;
      return newRequests;
    });
  } else {
    handleNewTab(resultsTab);
  }

  if (shouldNavigate) {
    navigate('/workspace/collections');
  }

  // Only refresh the runs list if requested (e.g., for a new run)
  if (refresh) {
    fetchAllRuns();
  }
};

const handleViewFunctionalRunResults = async (run, shouldNavigate = true) => {
  const runId = run.runId || run.id;
  if (!runId) {
    toast.error('Invalid run ID');
    return;
  }
  try {
    const response = await getRunHistoryDetail(runId);
    const runData = response.data;
    handleOpenCollectionRunResults(runData, runData.collectionId, -1, shouldNavigate, false);
  } catch (err) {
    toast.error('Failed to load run details');
  }
};

const handleCreateMockServer = async (mockData) => {
  const workspaceId = activeWorkspaceId;
  if (!workspaceId) {
    toast.error('No project selected');
    return null;
  }

  // Step 1: Create the mock server
  const { name, visibility, delay, collectionId, endpoints } = mockData;
  const createPayload = {
    name,
    isPrivate: visibility === 'private', // convert string to boolean
    delayMs: delay,
  };
  if (collectionId) {
    createPayload.collectionId = collectionId;
  }

  const createResponse = await createMockServer(workspaceId, createPayload);
  const newMock = createResponse.data; // contains id, mockUrl, etc.

  // Step 2: Create endpoints
  const createdEndpoints = [];
  for (const ep of endpoints) {
const endpointPayload = {
  method: ep.method,
  path: ep.path,
  responseStatus: ep.statusCode,
  responseBody: ep.responseBody,
  responseHeaders: {},
  delayMs: delay,
  requestBodySample: ep.requestBodySample,   // ✅ add this
  validationMode: ep.validationMode,          // ✅ add this
  validateMethod: ep.validateMethod !== false, // ✅ add this (default true)
};
    try {
      const epResponse = await createEndpoint(newMock.id, endpointPayload);
      createdEndpoints.push(epResponse.data);
    } catch (epErr) {
      toast.error(`Failed to create endpoint ${ep.path}`);
      // Continue with other endpoints
    }
  }

  // Build the complete mock server object (including endpoints and workspaceId)
  const newMockWithEndpoints = { ...newMock, workspaceId, endpoints: createdEndpoints };
  setMockServers(prev => [...prev, newMockWithEndpoints]);
  toast.success('Mock server created');
  return newMockWithEndpoints;
};

const handleRenameMockServer = async (mockId, newName) => {
  try {
    const response = await updateMockServer(mockId, { name: newName });
    const updated = response.data;
    setMockServers(prev => prev.map(m => m.id === mockId ? updated : m));
    toast.success('Mock server renamed');
  } catch (error) {
    toast.error('Rename failed');
  }
};

const handleDeleteMockServer = async (mockId) => {
  try {
    await deleteMockServer(mockId);
    setMockServers(prev => prev.filter(m => m.id !== mockId));
    toast.success('Mock server deleted');
  } catch (error) {
    toast.error('Delete failed');
  }
};

const handleToggleVisibility = async (mockId) => {
  try {
    const response = await toggleMockServer(mockId);
    const updated = response.data;
    setMockServers(prev => prev.map(m => m.id === mockId ? updated : m));
    toast.success(`Visibility changed to ${updated.visibility}`);
  } catch (error) {
    toast.error('Toggle failed');
  }
};

const handleExecuteMockRequest = async (mockServer, endpoint, requestOverrides = {}) => {
  try {
    const { mockUrl } = mockServer;
    let fullUrl = requestOverrides.url;
    if (!fullUrl) {
      const { path } = endpoint;
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      fullUrl = `/api/v1/mocks/${mockUrl}/${cleanPath}`;
    } else {
      if (!fullUrl.startsWith('/api/v1/mocks/')) {
        fullUrl = `/api/v1/mocks/${mockUrl}${fullUrl.startsWith('/') ? fullUrl : '/' + fullUrl}`;
      }
    }
    const method = requestOverrides.method || endpoint.method;
    const headers = requestOverrides.headers || {};
    const body = requestOverrides.body || null;

    let response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await executeGetOnMock(fullUrl, headers);
        break;
      case 'POST':
        response = await executePostOnMock(fullUrl, body, headers);
        break;
      case 'PUT':
        response = await executePutOnMock(fullUrl, body, headers);
        break;
      case 'DELETE':
        response = await executeDeleteOnMock(fullUrl, headers);
        break;
      case 'PATCH':
        response = await executePatchOnMock(fullUrl, body, headers);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    // Return the stored delay (from database) as the response time
    const delayMs = endpoint.delayMs || 0;

    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      time: delayMs,   // ✅ use stored delay instead of measured time
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        time: 0,
      };
    }
    throw error;
  }
};

const handleUpdateMockServer = async (mockId, updatedData, endpoints) => {
  try {
    // Update mock server metadata
    const { name, visibility, delay } = updatedData;
    await updateMockServer(mockId, {
      name,
      isPrivate: visibility === 'private',
      delayMs: delay,
    });

    // Process each endpoint: update existing, create new
    const updatedEndpoints = [];
    for (const ep of endpoints) {
      const endpointPayload = {
        method: ep.method,
        path: ep.path.startsWith('/') ? ep.path : `/${ep.path}`,
        responseStatus: ep.statusCode,
        responseBody: ep.responseBody || '{}',
        responseHeaders: {},
        delayMs: ep.delayMs || 0,
        requestBodySample: ep.requestBodySample,
        validationMode: ep.validationMode,
        validateMethod: ep.validateMethod !== false,
      };

      // Check if it's an existing endpoint (UUID) or a new one (number)
      const isExisting = typeof ep.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ep.id);
      if (isExisting) {
        // Update existing endpoint
        const epResponse = await updateEndpoint(ep.id, endpointPayload);
        updatedEndpoints.push(epResponse.data);
      } else {
        // Create new endpoint
        const epResponse = await createEndpoint(mockId, endpointPayload);
        updatedEndpoints.push(epResponse.data);
      }
    }

    // Update local state: replace the mock server's endpoints with the new ones
    setMockServers(prev => prev.map(mock =>
      mock.id === mockId
        ? { ...mock, name, isPrivate: visibility === 'private', delayMs: delay, endpoints: updatedEndpoints }
        : mock
    ));
    toast.success('Mock server updated');
  } catch (error) {
    console.error('Update failed:', error);
    toast.error('Update failed');
  }
};


const globalVariables = globalEnvironment?.variables || [];

const handleEnvironmentVariablesChange = (newVars) => {
  setEnvironmentVariables(newVars);
  const currentEnv = environments.find(e => e.id === selectedEnvironmentId);
  if (currentEnv) {
    const savedVars = currentEnv.variables || [];
    if (JSON.stringify(newVars) !== JSON.stringify(savedVars)) {
      setEnvironmentVariablesDirty(true);
    } else {
      setEnvironmentVariablesDirty(false);
    }
  } else {
    setEnvironmentVariablesDirty(true);
  }
};

const globalVars = useMemo(() => new Set(globalEnvironment?.variables?.map(v => v.key) || []), [globalEnvironment]);
const globalValues = useMemo(() => {
  const map = {};
  globalEnvironment?.variables?.forEach(v => { map[v.key] = v.value; });
  return map;
}, [globalEnvironment]);

  const isSavedRequest = (req) => {
  if (!req || !req.id) return false;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(req.id) && !!req.collectionId;
};
const [pristineRequests, setPristineRequests] = useState(() => {
  const initial = {};
  try {
    const stored = localStorage.getItem('probestack_requests');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.forEach(req => {
        if (isSavedRequest(req)) {
          initial[req.id] = JSON.parse(JSON.stringify(req));
        }
      });
    }
  } catch (error) {
  }
  return initial;
});
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('probestack_history');
    return saved ? JSON.parse(saved) : [];
  });


const handleGlobalVariablesChange = (newVars) => {
  setGlobalEnvironment(prev => prev
    ? { ...prev, variables: newVars }
    : { id: null, name: 'Global', variables: newVars, environment_type: 'global' }
  );
  setGlobalVariablesDirty(true);
};

const handleSaveGlobalVariables = async () => {
  // No workspaceId needed for global environment
  if (!globalEnvironment || !globalEnvironment.id) {
    // Create global environment (no workspaceId)
    try {
      const response = await createEnvironment(null, {
        name: 'Global',
        environment_type: 'global',
        variables: globalVariables,
        is_active: true
      });
      const newEnv = normalizeEnvironment(response.data);
      setGlobalEnvironment(newEnv);
      // Add to environments list if not already present (global env will be added by loadData)
      setEnvironments(prev => [...prev.filter(e => e.id !== 'no-env'), newEnv, { id: 'no-env', name: 'No Environment' }]);
      setGlobalVariablesDirty(false);
      toast.success('Global variables saved');
    } catch (err) {
      toast.error('Failed to create global variables');
    }
  } else {
    // Update existing global environment
    try {
      await updateEnvironment(globalEnvironment.id, { variables: globalVariables });
      setGlobalVariablesDirty(false);
      toast.success('Global variables saved');
    } catch (err) {
      toast.error('Failed to save global variables');
    }
  }
};


const createEmptyRequest = () => ({
  id: `adarshab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: 'Untitled Request',
  method: 'GET',
  url: '',
  queryParams: [],         
  headers: [],                
  body: '{\n  \n}',
   bodyType: 'raw',
  authType: 'none',
  authData: {},
  preRequestScript: '',
  tests: '',
  response: null,
  isLoading: false,
});

const [requests, setRequests] = useState([createEmptyRequest()]);
const [mcpCollections, setMcpCollections] = useState([]);
  const [collections, setCollections] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_collections');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
    }
    return [];
  });

// Fetch functional run history from forgeq-functional-test-svc
const fetchAllRuns = useCallback(async () => {
  if (!activeWorkspaceId) return;
  setLoadingRuns(true);
  try {
    const res = await listRunHistory(0, 50);
    const runs = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
    const sorted = [...runs].sort((a, b) =>
      new Date(b.startedAt ?? b.createdAt ?? 0) - new Date(a.startedAt ?? a.createdAt ?? 0)
    );
    setWorkspaceRuns(sorted);
  } catch (err) {
    console.error('Failed to fetch functional run history:', err);
  } finally {
    setLoadingRuns(false);
  }
}, [activeWorkspaceId]);

useEffect(() => {
  fetchAllRuns();
}, [activeWorkspaceId, fetchAllRuns]);
// Fetch load test runs from the load test service (global history)
useEffect(() => {
  const fetchLoadTestRuns = async () => {
    setLoadingLoadRuns(true);
    try {
      const response = await listLoadTestHistory(0, 100); // get up to 100 recent runs
      const runs = Array.isArray(response.data) ? response.data : (response.data?.content ?? []);
      runs.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      setLoadTestRuns(runs);
    } catch (err) {
      console.error('Failed to fetch load test runs:', err);
    } finally {
      setLoadingLoadRuns(false);
    }
  };
  fetchLoadTestRuns();
}, []); // runs once on mount

 
const [activeRequestIndex, setActiveRequestIndex] = useState(0);

  const currentRequest = requests[activeRequestIndex] || requests[0];
  const method = currentRequest?.method ?? 'GET';
  const url = currentRequest?.url ?? '';
  const queryParams = currentRequest?.queryParams ?? [{ key: '', value: '' }];
  const headers = currentRequest?.headers ?? [{ key: '', value: '' }];
  const body = currentRequest?.body ?? '{\n  \n}';
  const authType = currentRequest?.authType ?? 'none';
  const authData = currentRequest?.authData ?? {};
  const preRequestScript = currentRequest?.preRequestScript ?? '';
  const tests = currentRequest?.tests ?? '';

const updateActiveRequest = (field, value) => {
  setRequests((prev) => {
    const next = [...prev];
    const idx = activeRequestIndex >= 0 && activeRequestIndex < next.length ? activeRequestIndex : 0;
    next[idx] = { ...next[idx], [field]: value };
    return next;
  });
};

const onMcpTypeChange = (value) => updateActiveRequest('mcpType', value);

const [environments, setEnvironments] = useState(() => [{ id: 'no-env', name: 'No Environment' }]);
const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('no-env');

const { activeEnvVars, inactiveEnvVars, activeEnvValues, inactiveEnvInfo } = useVariableMaps(
  environments.filter(e => e.workspaceId === activeWorkspaceId)
);

  // Variables state with localStorage persistence
  const [environmentVariables, setEnvironmentVariables] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_environment_variables');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
    }
    return [{ key: '', value: '' }];
  });




  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  // Collection Run Results state
  const [collectionRunResults, setCollectionRunResults] = useState(null);
  const [isRunningCollection, setIsRunningCollection] = useState(false);
  const [loadTestResults, setLoadTestResults] = useState(null);
const [isRunningLoadTest, setIsRunningLoadTest] = useState(false);

  // Test files state for Generate Testcases - persisted to localStorage
  const [testFiles, setTestFiles] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_test_files');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
    }
    return [];
  });

  // Mock Service state - persisted to localStorage
  const [mockApis, setMockApis] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_mock_apis');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
    }
    return [];
  });

  // Dummy mock requests for the sidebar (pre-defined examples)
  const dummyMockRequests = [
    {
      id: 'mock-req-1',
      name: 'Get User Profile',
      method: 'GET',
      path: '/users/profile',
      description: 'Retrieve current user profile information',
      mockResponse: { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' }
    },
    {
      id: 'mock-req-2',
      name: 'Create Order',
      method: 'POST',
      path: '/orders',
      description: 'Create a new order in the system',
      mockResponse: { orderId: 'ORD-12345', status: 'created', total: 99.99 }
    },
    {
      id: 'mock-req-3',
      name: 'Update Product',
      method: 'PUT',
      path: '/products/{id}',
      description: 'Update existing product details',
      mockResponse: { id: 101, name: 'Updated Product', price: 49.99, updated: true }
    },
    {
      id: 'mock-req-4',
      name: 'Delete Session',
      method: 'DELETE',
      path: '/sessions/{id}',
      description: 'Delete user session by ID',
      mockResponse: { deleted: true, sessionId: 'sess-abc123' }
    },
    {
      id: 'mock-req-5',
      name: 'Search Products',
      method: 'GET',
      path: '/products/search',
      description: 'Search products with filters',
      mockResponse: { results: [{ id: 1, name: 'Product A' }, { id: 2, name: 'Product B' }], total: 2 }
    },
    {
      id: 'mock-req-6',
      name: 'Webhook Event',
      method: 'POST',
      path: '/webhooks/events',
      description: 'Receive webhook event notifications',
      mockResponse: { received: true, eventId: 'evt-xyz789', timestamp: new Date().toISOString() }
    }
  ];

useEffect(() => {
  try {
    localStorage.setItem('probestack_mock_apis', safeStringify(mockApis));
  } catch (error) {}
}, [mockApis]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_test_files', safeStringify(testFiles));
    } catch (error) {
    }
  }, [testFiles]);

  useEffect(() => {
    localStorage.setItem('probestack_history', safeStringify(history));
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_requests', safeStringify(requests));
    } catch (error) {
    }
  }, [requests]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_active_request_index', safeStringify(activeRequestIndex));
    } catch (error) {
    }
  }, [activeRequestIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_environment_variables', safeStringify(environmentVariables));
    } catch (error) {
    }
  }, [environmentVariables]);




  // Guard so the API bootstrap only runs once per page load
  const hasFetchedRef = useRef(false);

  // On mount: load workspaces and their collections from the backend.
  // Skipped entirely when no probestack_user_id is in localStorage so
  // unauthenticated / offline sessions continue working unchanged.
// Guard to ensure initial fetch runs only once

// ─── Load Workspaces + Collections + Folders from Backend on Mount ─────────────
// Guard to ensure initial fetch runs only once
// Load Workspaces + Collections + Folders + Requests from Backend on Mount
useEffect(() => {
  const userId = USER_ID;
  if (!userId || hasFetchedRef.current) return;

  hasFetchedRef.current = true;

const loadData = async () => {
  // ------------------------------------------------------------------
  // 1. Fetch workspaces (projects)
  // ------------------------------------------------------------------
  let workspaces = [];
  try {
    const wsRes = await fetchWorkspaces();
    workspaces = wsRes.data.map(normalizeWorkspace);
    setProjects(workspaces);

    // ✅ Load ALL contextual tabs from IndexedDB (collections, mock-service, mcp-test)
    const allContextual = {};
    for (const ws of workspaces) {
      allContextual[ws.id] = {};

      const collectionsData = await loadContextualTabsFromDB(ws.id, 'collections');
      if (collectionsData) {
        allContextual[ws.id].collections = collectionsData;
      }

      const mockData = await loadContextualTabsFromDB(ws.id, 'mock-service');
      if (mockData) {
        allContextual[ws.id]['mock-service'] = mockData;
      }

      const mcpData = await loadContextualTabsFromDB(ws.id, 'mcp-test');
      if (mcpData) {
        allContextual[ws.id]['mcp-test'] = mcpData;
      }
    }
    setContextualTabs(allContextual);
  } catch (err) {
    console.error('Failed to load workspaces:', err);
  }

  // ------------------------------------------------------------------
  // 2. If we have workspaces, load collections, folders, requests
  // ------------------------------------------------------------------
  if (workspaces.length > 0) {
    const allCollections = [];

    for (const ws of workspaces) {
      try {
        const colRes = await fetchCollections(ws.id);
        const cols = colRes.data.map(col => normalizeCollection(col, ws));

        for (const col of cols) {
          let folders = [];
          try {
            const folderRes = await fetchFolders(col.id);
            folders = folderRes.data.map(normalizeFolder);
          } catch (err) {
            console.error(`Failed to fetch folders for collection ${col.id}:`, err);
          }

          const folderMap = new Map();
          folders.forEach(f => folderMap.set(f.id, f));

          const rootFolders = [];
          folders.forEach(f => {
            if (f.parentFolderId) {
              const parent = folderMap.get(f.parentFolderId);
              if (parent) {
                if (!parent.items) parent.items = [];
                parent.items.push(f);
              } else {
                rootFolders.push(f);
              }
            } else {
              rootFolders.push(f);
            }
          });

          const sortItems = (items) => {
            if (!items) return;
            items.sort((a, b) => {
              if (a.type === 'folder' && b.type !== 'folder') return -1;
              if (a.type !== 'folder' && b.type === 'folder') return 1;
              return (a.orderIndex || 0) - (b.orderIndex || 0);
            });
            items.forEach(item => {
              if (item.items) sortItems(item.items);
            });
          };
          sortItems(rootFolders);

          const items = [...rootFolders];

          try {
            const reqRes = await fetchRequests({ collectionId: col.id });
            const requestsInCol = reqRes.data.map(normalizeRequest);

            requestsInCol.forEach(req => {
              const parentFolderId = req.folderId;
              if (parentFolderId) {
                const parentFolder = folderMap.get(parentFolderId);
                if (parentFolder) {
                  if (!parentFolder.items) parentFolder.items = [];
                  parentFolder.items.push(req);
                } else {
                  items.push(req);
                }
              } else {
                items.push(req);
              }
            });
            sortItems(items);
          } catch (err) {
            console.error(`Failed to fetch requests for collection ${col.id}:`, err);
          }

          allCollections.push({
            ...col,
            items,
          });
        }
      } catch (err) {
        console.error(`Failed to fetch collections for workspace ${ws.id}:`, err);
      }
    }
        const httpCollections = [];
    const mcpCols = [];
    allCollections.forEach(col => {
      if (col.type === 'mcp') mcpCols.push(col);
      else httpCollections.push(col);
    });
    setCollections(httpCollections);
    setMcpCollections(mcpCols);
  } else {
    setCollections([]);
  }

  // ------------------------------------------------------------------
  // 3. Set active workspace (if any)
  // ------------------------------------------------------------------
  if (workspaces.length > 0) {
    const savedWorkspaceId = localStorage.getItem('probestack_active_workspace_id');
    let activeId = null;
    if (savedWorkspaceId && workspaces.some(ws => ws.id === savedWorkspaceId)) {
      activeId = savedWorkspaceId;
    } else if (workspaces.length > 0) {
      activeId = workspaces[0].id;
    }

    if (activeId) {
      const workspaceName = workspaces.find(w => w.id === activeId)?.name || activeId;
      setActiveWorkspaceId(activeId);
      const initialMenu = getActiveMenu();
      if (initialMenu === 'collections' || initialMenu === 'mock-service' || initialMenu === 'mcp-test') {
        const saved = contextualTabs[activeId]?.[initialMenu];
        if (saved) {
          setRequests(saved.tabs);
          setActiveRequestIndex(saved.activeIndex);
        } else {
          if (initialMenu === 'collections') {
            setRequests([createEmptyRequest()]);
            setActiveRequestIndex(0);
          } else {
            setRequests([]);
            setActiveRequestIndex(0);
          }
        }
      } else {
        await loadWorkspaceTabsAndData(activeId, workspaceName);
      }
    }
  } else {
    setActiveWorkspaceId(null);
    setRequests([createEmptyRequest()]);
    setActiveRequestIndex(0);
  }

  // ------------------------------------------------------------------
  // 4. Fetch environments (global + workspace-specific)
  // ------------------------------------------------------------------
  try {
    let allEnvs = [];

    // Global environments (no workspaceId)
    try {
      const globalRes = await listEnvironments({ limit: 100 });
      const globalEnvs = (globalRes.data.data || globalRes.data).map(normalizeEnvironment);
      allEnvs.push(...globalEnvs);
    } catch (err) {
      console.error('Failed to fetch global environments:', err);
    }

    // Environments for each workspace
    for (const ws of workspaces) {
      try {
        const wsRes = await listEnvironments({ workspaceId: ws.id, limit: 100 });
        const wsEnvs = (wsRes.data.data || wsRes.data).map(normalizeEnvironment);
        allEnvs.push(...wsEnvs);
      } catch (err) {
        console.error(`Failed to fetch environments for workspace ${ws.id}:`, err);
      }
    }

    const uniqueEnvs = Array.from(new Map(allEnvs.map(env => [env.id, env])).values());

    const globalEnv = uniqueEnvs.find(env => env.environmentType === 'global');
    setGlobalEnvironment(globalEnv || null);

    setEnvironments([{ id: 'no-env', name: 'No Environment' }, ...uniqueEnvs]);

    if (uniqueEnvs.length > 0) {
      const activeEnv = uniqueEnvs.find(e => e.isActive) || uniqueEnvs[0];
      setSelectedEnvironmentId(activeEnv.id);
      setEnvironmentVariables(activeEnv.variables || []);
    } else {
      setSelectedEnvironmentId('no-env');
      setEnvironmentVariables([]);
    }
  } catch (err) {
    console.error('Failed to load environments:', err);
    setEnvironments([{ id: 'no-env', name: 'No Environment' }]);
    setSelectedEnvironmentId('no-env');
    setEnvironmentVariables([]);
  }

  // ------------------------------------------------------------------
  // 5. Fetch global execution history
  // ------------------------------------------------------------------
  try {
    const historyRes = await fetchGlobalHistory({ limit: 50 });
    const normalizedHistory = (historyRes.data.data || []).map(item => ({
      historyId: item.history_id,
      requestId: item.request_id,
      url: item.url,
      method: item.method,
      status: item.status_code,
      size: item.response_size_bytes,
      time: item.response_time_ms,
      error: item.error_message ? true : false,
      date: item.executed_at,
    }));
    setHistory(normalizedHistory);
  } catch (err) {
    console.error('Failed to load execution history:', err);
  }

  // ------------------------------------------------------------------
  // 6. Fetch mock servers
  // ------------------------------------------------------------------
  await fetchMockServers();
};

  loadData();
}, []);
useEffect(() => {
}, [collections]);

const handleSaveEnvironmentVariables = async () => {
  if (selectedEnvironmentId === 'no-env') {
    toast.info('Cannot save variables for "No Environment". Please select a real environment.');
    return;
  }
  try {
    await updateEnvironment(selectedEnvironmentId, {
      variables: environmentVariables,
    });
    setEnvironments(prev =>
      prev.map(env =>
        env.id === selectedEnvironmentId
          ? { ...env, variables: environmentVariables }
          : env
      )
    );
    setEnvironmentVariablesDirty(false);
    toast.success('Environment variables saved');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save variables');
  }
};

const handleEnvironmentChange = (envId) => {
  setSelectedEnvironmentId(envId);
  setEnvironmentVariablesDirty(false);
  if (envId === 'no-env') {
    setEnvironmentVariables([]);
  } else {
    const env = environments.find(e => e.id === envId);
    if (env) {
      setEnvironmentVariables(env.variables || []);
    }
  }
};

const handleSelectMockEndpoint = (mockServer, endpoint) => {
  const endpointRequest = {
    id: `mock-endpoint-${endpoint.id}`,
    mockEndpointId: endpoint.id,  
    name: `${mockServer.name} - ${endpoint.method} ${endpoint.path}`,
    method: endpoint.method,
    url: `/api/v1/mocks/${mockServer.mockUrl}${endpoint.path}`,
    mockServer: mockServer,
    mockEndpoint: endpoint,
    isMockEndpoint: true,
    queryParams: [],
    headers: [],
    body: endpoint.requestBodySample || '',
    authType: 'none',
    authData: {},
    preRequestScript: '',
    tests: '',
  };
  handleSelectEndpoint(endpointRequest, true);  // ← skip navigation
};


const handleExecute = async () => {
  if (!url) return;

  updateActiveRequest('isLoading', true);
updateActiveRequest('response', null);
  setResponse(null);
  setError(null);

  const currentReq = requests[activeRequestIndex];

  // ----- Build effective variable map (global + active environment) -----
  let effectiveVariables = {};

  // Global variables
  (globalEnvironment?.variables || []).forEach(v => {
    if (v.key && v.value != null) effectiveVariables[v.key] = v.value;
  });

  // Active environment variables (override global)
  const activeEnv = environments.find(e => e.isActive);
  if (activeEnv) {
    (activeEnv.variables || []).forEach(v => {
      if (v.key && v.value != null) effectiveVariables[v.key] = v.value;
    });
  }

// ----- Pre‑request script (if any) -----
let scriptResult = null;
if (currentReq.preRequestScript) {
  const scriptContext = {
    environment: { ...effectiveVariables }, // pass current state to script
    variables: {},
    url: { path: url, query: {} },
    method: method,
    headers: headers.reduce((acc, h) => {
      if (h.enabled && h.key) acc[h.key] = h.value;
      return acc;
    }, {}),
    body: body,
  };
  scriptResult = executeScript(currentReq.preRequestScript, scriptContext);
  if (scriptResult.success && scriptResult.environment) {
    // Merge script changes into our effective map
    Object.assign(effectiveVariables, scriptResult.environment);
    // Update the UI state **and persist to backend**
    if (Object.keys(scriptResult.environment).length > 0) {
      // Build the new variables array
      const newVars = [...environmentVariables];
      Object.entries(scriptResult.environment).forEach(([key, value]) => {
        const existing = newVars.find(v => v.key === key);
        if (existing) {
          existing.value = value;
        } else {
          newVars.push({ key, value, enabled: true });
        }
      });
      // Update the local state
      setEnvironmentVariables(newVars);
      // If there is an active environment, persist to backend
      if (selectedEnvironmentId !== 'no-env') {
        updateEnvironment(selectedEnvironmentId, { variables: newVars })
          .then(() => {
            // Update the environments list to reflect the saved variables
            setEnvironments(prev =>
              prev.map(env =>
                env.id === selectedEnvironmentId
                  ? { ...env, variables: newVars }
                  : env
              )
            );
            setEnvironmentVariablesDirty(false);
            toast.success('Environment variables saved from script');
          })
          .catch(err => {
            console.error('Failed to save script variables:', err);
            toast.error('Failed to save script variables');
          });
      }
    }
  } else if (!scriptResult.success) {
    console.warn('Pre‑request script error:', scriptResult.error);
    // optional toast
  }
}

  // ----- Local substitution using effectiveVariables -----
  const substituteLocal = (text) => {
    if (!text || typeof text !== 'string') return text;
    const replaced = text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const val = effectiveVariables[varName];
      return val !== undefined ? val : match;
    });
    return replaced;
  };

  // ----- Mock endpoint handling -----
  if (currentReq.isMockEndpoint) {
    
    //  console.log('Executing mock endpoint - method:', currentReq.method, 'url:', currentReq.url, 'body:', currentReq.body);
    try {
   const res = await handleExecuteMockRequest(
      currentReq.mockServer,
      currentReq.mockEndpoint,
      {
        method: currentReq.method,   // use tab's method
        body: currentReq.body,       // use tab's body
        url: currentReq.url,         // use tab's full URL
      }
    );
      // Apply fallback for empty error bodies
      if (res.status >= 400) {
        const isBodyEmpty = 
          !res.data ||
          (typeof res.data === 'string' && res.data.trim() === '') ||
          (typeof res.data === 'object' && Object.keys(res.data).length === 0) ||
          (Array.isArray(res.data) && res.data.length === 0);
        if (isBodyEmpty) {
          res.data = `${res.status} ${res.statusText || 'Error'}`;
        }
      }
      updateActiveRequest('response', res);
updateActiveRequest('isLoading', false);
      addToHistory(url, method, res.status, res.size, res.time);
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      const res = {
        status: 0,
        statusText: 'Error',
        time: 0,
        size: 0,
        data: errorMessage,
        headers: [],
        testResults: [],
        testScriptError: null,
      };
      updateActiveRequest('response', res);
      addToHistory(url, method, 0, 0, 0, true);
      if (handleShowChatbot) handleShowChatbot(err, null, { method, url, headers, body });
    } finally {
       updateActiveRequest('isLoading', false);
    }
    return;
  }

  // ----- Normal request flow -----
  const saved = isSavedRequest(currentReq);
  try {
    let targetRequestId = currentReq.id;

    // If not saved, create it first
    if (!saved) {
      const payload = {
        name: currentReq.name || 'Untitled Request',
        method,
        url,
        headers,
        query_params: queryParams,
        body_type: currentReq.bodyType || 'raw', 
        body_content: body,
        auth_type: authType,
        auth_config: authData,
        pre_request_script: preRequestScript,
        test_script: tests,
        collection_id: null,
        folder_id: null,
      };
      const createRes = await createRequest(payload);
      const savedRequest = normalizeRequest(createRes.data);
      setRequests(prev => prev.map(req => req.id === currentReq.id ? savedRequest : req));
      setPristineRequests(prev => ({ ...prev, [savedRequest.id]: JSON.parse(JSON.stringify(savedRequest)) }));
      targetRequestId = savedRequest.id;
    }

    // Build overrides using substituteLocal
    const overrides = {};
    overrides.url = substituteLocal(url).split('?')[0];
    overrides.headers = headers.map(h => ({
      key: substituteLocal(h.key),
      value: substituteLocal(h.value),
      enabled: h.enabled ?? true
    }));
    overrides.query_params = queryParams.map(q => ({
      key: substituteLocal(q.key),
      value: substituteLocal(q.value),
      enabled: q.enabled ?? true
    }));
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      overrides.body_content = substituteLocal(body);
      if (currentReq.bodyType) {
  overrides.body_type = currentReq.bodyType;
}
    }
    overrides.path_variables = [];

    // Substitute auth data
    const substituteAuthData = (obj) => {
      if (!obj) return obj;
      if (typeof obj === 'string') return substituteLocal(obj);
      if (Array.isArray(obj)) return obj.map(substituteAuthData);
      if (typeof obj === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
          result[k] = substituteAuthData(v);
        }
        return result;
      }
      return obj;
    };
    overrides.auth_type = authType;
    overrides.auth_config = substituteAuthData(authData);

    const axiosResponse = await executeRequest(targetRequestId, { overrides });
    const executionResult = axiosResponse.data;

    let parsedBody = executionResult.response_body;
    if (typeof parsedBody === 'string') {
      const trimmed = parsedBody.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          parsedBody = JSON.parse(parsedBody);
        } catch (e) {}
      }
    }

    if (executionResult.status_code === 0 && executionResult.error_message) {
      parsedBody = executionResult.error_message;
    }

const res = {
  status: executionResult.status_code,
  statusText: executionResult.status_text || '',
  time: executionResult.response_time_ms || 0,
  size: executionResult.response_size_bytes || 0,
  data: parsedBody,
  headers: executionResult.response_headers || [],
  testResults: executionResult.test_results || [],
  testScriptError: executionResult.error_message !== null && executionResult.status_code !== 0 ? executionResult.error_message : null,
  // ========== DEBUG FIELDS ==========
  isSuccess: executionResult.is_success,
  failureStage: executionResult.failure_stage,
  failureCategory: executionResult.failure_category,
  failureReason: executionResult.failure_reason,
  suggestion: executionResult.suggestion,
  errorMessage: executionResult.error_message,
  responseTimeMs: executionResult.response_time_ms,
  traceSteps: executionResult.trace_steps || [],
  request_size_bytes: executionResult.request_size_bytes,
  request_headers_size_bytes: executionResult.request_headers_size_bytes,
  request_body_size_bytes: executionResult.request_body_size_bytes,
  response_headers_size_bytes: executionResult.response_headers_size_bytes,
  network: executionResult.network,
};

    if (res.status >= 400) {
      const isBodyEmpty = 
        !res.data ||
        (typeof res.data === 'string' && res.data.trim() === '') ||
        (typeof res.data === 'object' && Object.keys(res.data).length === 0) ||
        (Array.isArray(res.data) && res.data.length === 0);
      if (isBodyEmpty) {
        res.data = `${res.status} ${res.statusText || 'Error'}`;
      }
    }

    updateActiveRequest('response', res);
    updateActiveRequest('isLoading', false); 
    if (res.status >= 400 || res.status === 0) {
      if (handleShowChatbot) handleShowChatbot(null, res, { method, url, headers, body });
    }
    addToHistory(url, method, res.status, res.size, res.time, false, executionResult.history_id);
  } catch (err) {
   updateActiveRequest('response', null);
  updateActiveRequest('isLoading', false);
  setError(err);
  addToHistory(url, method, 0, 0, 0, true, null);
  if (handleShowChatbot) handleShowChatbot(err, null, { method, url, headers, body });
}
};

  const addToHistory = (url, method, status, size, time, isError = false,historyId = null) => {
    const newEntry = {
      historyId,   
      url,
      method,
      status,
      size,
      time,
      error: isError,
      date: new Date().toISOString()
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const loadHistoryItem = (item) => {
    updateActiveRequest('url', item.url);
    updateActiveRequest('method', item.method);
    navigate('/workspace');
  };

  const handleImport = (api) => {
    updateActiveRequest('url', api.url);
    updateActiveRequest('method', 'GET');
    navigate('/workspace');
  };

const handleSelectEndpoint = (endpoint, skipNavigate = false) => {
  if (endpoint.id) {
    const existingTabIndex = requests.findIndex((req) => req.id === endpoint.id);
    if (existingTabIndex !== -1) {
      // ✅ Merge: keep existing custom fields (like mockEndpointId, mockServer, etc.)
      setRequests((prev) => {
        const next = [...prev];
        const existing = next[existingTabIndex];
        next[existingTabIndex] = { ...existing, ...endpoint };
        return next;
      });
      setActiveRequestIndex(existingTabIndex);
      // Also update pristine copy (optional but good)
      setPristineRequests((prev) => ({
        ...prev,
        [endpoint.id]: JSON.parse(JSON.stringify({ ...requests[existingTabIndex], ...endpoint })),
      }));
    } else {
      // Add as new tab
      setRequests((prev) => {
        const newRequests = [...prev, endpoint];
        setTimeout(() => setActiveRequestIndex(newRequests.length - 1), 0);
        return newRequests;
      });
      setPristineRequests((prev) => ({
        ...prev,
        [endpoint.id]: JSON.parse(JSON.stringify(endpoint)),
      }));
    }
  } else {
    // Legacy handling (dummy endpoints)
    const existingTabIndex = requests.findIndex(
      (req) => req.name === endpoint.name && req.url === endpoint.path && req.method === endpoint.method
    );
    if (existingTabIndex !== -1) {
      setActiveRequestIndex(existingTabIndex);
    } else {
      const newRequest = {
        ...createEmptyRequest(),
        url: endpoint.path,
        method: endpoint.method,
        name: endpoint.name || 'Untitled Request',
      };
      setRequests((prev) => {
        const next = [...prev, newRequest];
        setTimeout(() => setActiveRequestIndex(next.length - 1), 0);
        return next;
      });
    }
  }
  setResponse(null);
  setError(null);
  // if (!skipNavigate) {
  //   navigate('/workspace');
  // }
};

 const handleUpdateRequest = async (updatedRequest) => {
    try {
      // Build payload with all fields that can change
      const payload = {
        name: updatedRequest.name,
        method: updatedRequest.method,
        url: updatedRequest.url,
        headers: updatedRequest.headers,
        query_params: updatedRequest.queryParams,
        body_type: updatedRequest.bodyType || 'none',
        body_content: updatedRequest.body,
        auth_type: updatedRequest.authType,
        auth_config: updatedRequest.authData,
        pre_request_script: updatedRequest.preRequestScript,
        test_script: updatedRequest.tests,
        // Optionally include folder_id if you allow moving via save (not yet implemented)
      };

      const response = await updateRequest(updatedRequest.id, payload);
      const savedRequest = normalizeRequest(response.data);

      // Update the request in the tabs
      setRequests((prev) =>
        prev.map((req) => (req.id === savedRequest.id ? savedRequest : req))
      );

      // Update pristine copy
      setPristineRequests((prev) => ({
        ...prev,
        [savedRequest.id]: JSON.parse(JSON.stringify(savedRequest)),
      }));

      // Also update the request in the collections tree
      setCollections((prev) => {
        const updateInTree = (items) => {
          if (!items) return items;
          return items.map((item) => {
            if (item.id === savedRequest.id) return savedRequest;
            if (item.items) return { ...item, items: updateInTree(item.items) };
            return item;
          });
        };
        return updateInTree(prev);
      });

      toast.success('Request updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

const handleSaveRequest = async (saveData) => {
  const { projectId, projectName, collectionId, collectionName, isNewCollection, request, folderId } = saveData;

  if (savedRequestIdsRef.current.has(request.id)) return;
  savedRequestIdsRef.current.add(request.id);

  let targetCollectionId = collectionId;
  let targetCollectionName = collectionName;

  try {
    if (isNewCollection) {
      const newColRes = await createCollection(projectId, { name: collectionName });
      targetCollectionId = newColRes.data.id;
      targetCollectionName = newColRes.data.name;
    }

    const payload = {
      name: request.name,
      method: request.method,
      url: request.url,
      headers: request.headers,
      query_params: request.queryParams,
      body_type: request.bodyType || 'none',
      body_content: request.body,
      auth_type: request.authType,
      auth_config: request.authData,
      pre_request_script: request.preRequestScript,
      test_script: request.tests,
      collection_id: targetCollectionId,
      folder_id: folderId || null,
      protocol: request.protocol || 'HTTP', 
    };

    const createRes = await createRequest(payload);
    const savedRequest = normalizeRequest(createRes.data);

    // Replace temporary tab
    setRequests((prev) =>
      prev.map((req) => (req.id === request.id ? savedRequest : req))
    );

    // Store pristine copy
    setPristineRequests((prev) => ({
      ...prev,
      [savedRequest.id]: JSON.parse(JSON.stringify(savedRequest)),
    }));

    // Update collections tree – insert request into correct folder
    setCollections((prev) => {
      // Helper to add request to a folder in the tree
      const addRequestToCollection = (collections, collectionId, folderId, request) => {
        const newCollections = [...collections];
        const collectionIndex = newCollections.findIndex(col => col.id === collectionId);
        if (collectionIndex === -1) return collections;

        const collection = newCollections[collectionIndex];
        if (!folderId) {
          // Add to root
          if (!collection.items) collection.items = [];
          if (!collection.items.some(item => item.id === request.id)) {
            collection.items.push(request);
          }
          return newCollections;
        }

        // Recursively find the folder and insert
        const addToFolder = (items) => {
          if (!items) return false;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type === 'folder' && item.id === folderId) {
              if (!item.items) item.items = [];
              if (!item.items.some(sub => sub.id === request.id)) {
                item.items.push(request);
              }
              return true;
            }
            if (item.items && addToFolder(item.items)) return true;
          }
          return false;
        };

        const added = addToFolder(collection.items);
        if (!added) {
          // Fallback to root (shouldn't happen)
          if (!collection.items) collection.items = [];
          if (!collection.items.some(item => item.id === request.id)) {
            collection.items.push(request);
          }
        }
        return newCollections;
      };

      return addRequestToCollection(prev, targetCollectionId, folderId, savedRequest);
    });

    toast.success('Request saved');
  } catch (err) {
    console.error('[handleSaveRequest] error:', err);
    toast.error(err.response?.data?.message || 'Save failed');
    savedRequestIdsRef.current.delete(request.id);
  }
};


  // Get all request names from collections (recursively)
  const getAllRequestNamesFromCollections = () => {
    const names = [];
    const traverse = (items) => {
      if (!items) return;
      items.forEach(item => {
        if (item.type === 'request' && item.name) {
          names.push(item.name.toLowerCase());
        } else if (item.items) {
          traverse(item.items);
        }
      });
    };
    
    collections.forEach(collection => {
      traverse(collection.items || []);
    });
    
    return names;
  };

  // Generate unique request name checking BOTH tabs and collections
  const generateUniqueRequestName = (baseName = 'Untitled Request') => {
    // Get names from both tabs and collections
    const tabNames = requests.map(req => req.name?.toLowerCase() || '');
    const collectionNames = getAllRequestNamesFromCollections();
    const allExistingNames = [...tabNames, ...collectionNames];
    
    // If base name doesn't exist, return it
    if (!allExistingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }
    
    // Find the highest number suffix
    let maxNumber = 0;
    const baseNameLower = baseName.toLowerCase();
    
    allExistingNames.forEach(name => {
      if (name === baseNameLower) {
        maxNumber = Math.max(maxNumber, 1);
      } else if (name.startsWith(baseNameLower + ' ')) {
        const suffix = name.substring(baseNameLower.length + 1);
        const num = parseInt(suffix, 10);
        if (!isNaN(num)) {
          maxNumber = Math.max(maxNumber, num);
        }
      }
    });
    
    // Return next number
    return `${baseName} ${maxNumber + 1}`;
  };

const handleNewTab = (tabData) => {
  if (tabData) {
    setRequests(prev => {
      const newRequests = [...prev, tabData];
      setActiveRequestIndex(newRequests.length - 1);
      return newRequests;
    });
  } else {
    const uniqueName = generateUniqueRequestName();
    let newRequest;
    
    // ✅ Use pathname directly – it’s always correct
    const isMcpContext = pathname.includes('/workspace/mcp-test');
    
    console.log('🔍 [handleNewTab] Debug:', { pathname, isMcpContext });
    
    if (isMcpContext) {
      console.log('✅ Creating MCP‑specific request');
      newRequest = {
        ...createEmptyRequest(),
        name: uniqueName,
        type: 'mcp-request',    // triggers the extra dropdown
        mcpType: 'sse',         // default transport
      };
    } else {
      console.log('✅ Creating normal HTTP request');
      newRequest = {
        ...createEmptyRequest(),
        name: uniqueName
      };
    }
    
    setRequests(prev => {
      const newRequests = [...prev, newRequest];
      setActiveRequestIndex(newRequests.length - 1);
      return newRequests;
    });
    setPristineRequests(prevPristine => ({
      ...prevPristine,
      [newRequest.id]: JSON.parse(JSON.stringify(newRequest))
    }));
    setResponse(null);
    setError(null);
  }
};

  const handleTabSelect = (index) => {
    setActiveRequestIndex(index);
  };

const handleCloseTab = (index) => {
  if (requests.length <= 1) return;
  const closedRequest = requests[index];
  setRequests((prev) => prev.filter((_, i) => i !== index));
  setActiveRequestIndex((prev) => {
    if (index < prev) return prev - 1;
    if (index === prev) return Math.max(0, prev - 1);
    return prev;
  });
  // Remove from pristine if it was saved
  if (closedRequest && closedRequest.id) {
    setPristineRequests(prev => {
      const newPristine = { ...prev };
      delete newPristine[closedRequest.id];
      return newPristine;
    });
  }
};

const handleTabRename = (index, newName) => {
  setRequests((prev) => {
    const next = [...prev];
    if (next[index]) {
      const oldReq = next[index];
      const updatedReq = { ...oldReq, name: newName };
      next[index] = updatedReq;
      // Update pristine if the request is saved
      if (oldReq.id && isSavedRequest(oldReq)) {
        setPristineRequests(prevPristine => ({
          ...prevPristine,
          [oldReq.id]: JSON.parse(JSON.stringify(updatedReq))
        }));
      }
    }
    return next;
  });
};

const RunLoadingModal = ({ isOpen }) => {
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Running Collection</h3>
          <p className="text-gray-400 mb-4">Please wait while your collection executes...</p>
          <div className="w-full bg-dark-700 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-4">This may take a few seconds</p>
        </div>
      </div>
    </div>,
    document.body
  );
};
  // Parse Postman collection JSON to internal format
  const parsePostmanCollection = (postmanJson, projectId, projectName) => {
    const parseUrl = (urlObj) => {
      if (typeof urlObj === 'string') return urlObj;
      if (!urlObj) return '';
      
      const protocol = urlObj.protocol || 'http';
      const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : (urlObj.host || 'localhost');
      const port = urlObj.port ? `:${urlObj.port}` : '';
      const path = Array.isArray(urlObj.path) ? `/${urlObj.path.join('/')}` : (urlObj.path || '');
      const query = urlObj.query && urlObj.query.length > 0 
        ? `?${urlObj.query.map(q => `${q.key}=${q.value || ''}`).join('&')}` 
        : '';
      
      return `${protocol}://${host}${port}${path}${query}`;
    };

    const parseHeaders = (headers) => {
      if (!headers || !Array.isArray(headers)) return [];
      return headers.map(h => ({
        key: h.key || '',
        value: h.value || '',
        enabled: h.disabled !== true
      }));
    };

    const parseBody = (body) => {
      if (!body) return { type: 'none', data: '' };
      
      if (body.mode === 'raw') {
        return { type: 'raw', data: body.raw || '' };
      } else if (body.mode === 'formdata') {
        return { 
          type: 'form-data', 
          data: body.formdata || [] 
        };
      } else if (body.mode === 'urlencoded') {
        return { 
          type: 'x-www-form-urlencoded', 
          data: body.urlencoded || [] 
        };
      }
      return { type: 'none', data: '' };
    };

    const parseAuth = (auth) => {
      if (!auth || !auth.type) return { type: 'none' };
      
      if (auth.type === 'bearer') {
        const token = auth.bearer?.find(b => b.key === 'token')?.value || '';
        return { type: 'bearer', token };
      } else if (auth.type === 'basic') {
        const username = auth.basic?.find(b => b.key === 'username')?.value || '';
        const password = auth.basic?.find(b => b.key === 'password')?.value || '';
        return { type: 'basic', username, password };
      } else if (auth.type === 'apikey') {
        const key = auth.apikey?.find(a => a.key === 'key')?.value || '';
        const value = auth.apikey?.find(a => a.key === 'value')?.value || '';
        const addTo = auth.apikey?.find(a => a.key === 'in')?.value || 'header';
        return { type: 'apikey', key, value, in: addTo };
      }
      return { type: 'none' };
    };

    const parseItem = (item, depth = 0) => {
      // If item has 'request' property, it's a request
      if (item.request) {
        const request = item.request;
        return {
          id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: item.name || 'Untitled Request',
          type: 'request',
          method: (request.method || 'GET').toUpperCase(),
          path: parseUrl(request.url),
          headers: parseHeaders(request.header),
          body: parseBody(request.body),
          auth: parseAuth(request.auth),
          params: request.url?.query || [],
        };
      }
      
      // If item has 'item' array, it's a folder
      if (item.item && Array.isArray(item.item)) {
        return {
          id: `imported-folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: item.name || 'Untitled Folder',
          type: 'folder',
          icon: 'folder',
          items: item.item.map(subItem => parseItem(subItem, depth + 1))
        };
      }
      
      return null;
    };

    // Parse the collection
    const collectionName = postmanJson.info?.name || 'Imported Collection';
    const items = postmanJson.item ? postmanJson.item.map(item => parseItem(item)) : [];
    
    return {
      id: `imported-collection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: collectionName,
      type: 'collection',
      icon: 'folder',
      project: projectId,
      projectName: projectName,
      items: items.filter(Boolean)
    };
  };

const handleAddProject = (workspaceData) => {
  const isLegacyFormat = typeof workspaceData === 'string';
  const name = isLegacyFormat ? workspaceData : workspaceData.name;
  const visibility = isLegacyFormat ? 'private' : (workspaceData.visibility || 'private');
  const description = isLegacyFormat ? '' : (workspaceData.description || '');
  const importedCollection = isLegacyFormat ? null : workspaceData.importedCollection;

  const tempId = `project-${Date.now()}`;
  const newProject = {
    id: tempId,
    name: name.trim(),
    visibility,
    description,
  };
  setProjects((prev) => [...prev, newProject]);

  // If there's an imported collection, create it under this workspace
  if (importedCollection && importedCollection.content) {
    const parsedCollection = parsePostmanCollection(importedCollection.content, tempId, name.trim());
    setCollections((prev) => [...prev, parsedCollection]);
  }

  const userId = USER_ID;
  if (!userId) {
    // Offline mode: set active immediately
    setActiveWorkspaceId(tempId);
  } else {
    // Persist to backend
    createWorkspace({ name: name.trim(), visibility, description })
      .then((res) => {
        const realId = res.data?.id;
        if (realId && realId !== tempId) {
          setProjects((prev) =>
            prev.map((p) => (p.id === tempId ? { ...p, id: realId } : p))
          );
          setCollections((prev) =>
            prev.map((col) =>
              col.project === tempId ? { ...col, project: realId } : col
            )
          );
          setActiveWorkspaceId(realId);
        }
      })
      .catch((err) => console.error('[API] Failed to persist project:', err));
  }

  return newProject;
};

  const handleCollectionsChange = (newCollections) => {
    setCollections(newCollections);
  };

  const savedRequestIdsRef = useRef(new Set());


const handleWorkspaceUpdate = (updatedWorkspace) => {
  setProjects(prev => prev.map(p => p.id === updatedWorkspace.id ? updatedWorkspace : p));
  // Also update the open tab if needed (e.g., rename the tab)
};

const handleWorkspaceDelete = (workspaceId) => {
  // Determine if this was the active workspace
  const wasActive = activeWorkspaceId === workspaceId;
  // Find a fallback workspace (if any)
  const remainingWorkspaces = projects.filter(p => p.id !== workspaceId);
  const newActiveId = wasActive && remainingWorkspaces.length > 0 ? remainingWorkspaces[0].id : null;

  // Remove from state
  setProjects(prev => prev.filter(p => p.id !== workspaceId));
  setCollections(prev => prev.filter(col => col.project !== workspaceId));
  setMockServers(prev => prev.filter(mock => mock.workspaceId !== workspaceId));
  setEnvironments(prev => prev.filter(env => env.workspaceId !== workspaceId));
  setRequests(prev => prev.filter(req => !(req.type === 'workspace-details' && req.workspaceId === workspaceId)));

  // Remove workspace tabs from localStorage
  localStorage.removeItem(`probestack_workspace_tabs_${workspaceId}`);
  localStorage.removeItem(`probestack_workspace_active_${workspaceId}`);
  setWorkspaceTabs(prev => {
    const newMap = { ...prev };
    delete newMap[workspaceId];
    return newMap;
  });
  setWorkspaceActiveIndex(prev => {
    const newMap = { ...prev };
    delete newMap[workspaceId];
    return newMap;
  });

  // If it was active, switch to another workspace
  if (wasActive && newActiveId) {
    handleSelectWorkspace(newActiveId);
  } else if (wasActive && remainingWorkspaces.length === 0) {
    // No workspaces left – clear everything
    setActiveWorkspaceId(null);
    setRequests([createEmptyRequest()]);
    setActiveRequestIndex(0);
  }
};

const handleDeleteHistoryItem = async (param) => {
  let historyId, requestId;
  if (typeof param === 'object') {
    historyId = param.historyId;
    requestId = param.requestId;
  } else {
    historyId = param;
  }
  // Remove from local state
  setHistory(prev => prev.filter(item => item.historyId !== historyId));
  // Call backend API
  if (requestId && historyId) {
    try {
      await deleteHistoryItem(requestId, historyId);
    } catch (err) {
      console.error('Failed to delete history entry:', err);
      // Optionally revert local deletion or show toast
    }
  }
};

  // Mock Service handlers
  const handleCreateMock = (collectionOrFolder) => {
    const mockId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Recursively collect all requests from the collection/folder
    const collectRequests = (items, folderPath = '') => {
      const requests = [];
      items.forEach(item => {
        if (item.type === 'request') {
          const endpointName = (item.path || '').replace(/^\//, '').replace(/\//g, '-') || 'endpoint';
          const mockUrl = `api.probestack.io/api/v1/${endpointName}`;
          
          requests.push({
            id: item.id,
            name: item.name,
            method: item.method,
            path: item.path,
            mockUrl: mockUrl,
            folderPath: folderPath || 'Root',
            mockResponse: item.mockResponse || { message: 'Mock response' }
          });
        } else if (item.type === 'folder' && item.items) {
          const newPath = folderPath ? `${folderPath} / ${item.name}` : item.name;
          requests.push(...collectRequests(item.items, newPath));
        }
      });
      return requests;
    };
    
    const mockedRequests = collectRequests(collectionOrFolder.items || []);
    
    const newMock = {
      id: mockId,
      originalItemId: collectionOrFolder.id,
      name: collectionOrFolder.name,
      type: collectionOrFolder.type, // 'collection' or 'folder'
      requests: mockedRequests,
      createdAt: new Date().toISOString(),
    };
    
    setMockApis((prev) => [...prev, newMock]);
    return newMock;
  };
const handleCreateEnvironment = async (desiredName) => {
  const workspaceId = activeWorkspaceId;   
  if (!workspaceId) {
    toast.error('No project selected');
    return;
  }

    let attempt = 0;
    let currentName = desiredName;
    let success = false;
    let lastError = null;

    while (!success && attempt < 20) {
      try {
        const response = await createEnvironment(workspaceId, {
          name: currentName,
          environment_type: 'collection',  
          is_active: false, 
        });
        const newEnv = normalizeEnvironment(response.data);
        setEnvironments(prev => [...prev, newEnv]);
        setSelectedEnvironmentId(newEnv.id);
        setEnvironmentVariables(newEnv.variables || []);
        toast.success('Environment created');
        success = true;
      } catch (err) {
        if (err.response?.status === 409) {
          attempt++;
          currentName = `${desiredName} ${attempt}`;
          lastError = err;
        } else {
          console.error('Failed to create environment:', err);
          toast.error(err.response?.data?.message || 'Failed to create environment');
          return;
        }
      }
    }

    if (!success) {
      toast.error(`Could not create environment after ${attempt} attempts.`);
    }
  };

const handleActivateEnvironment = async (envId) => {
  if (envId === 'no-env') {
    // Find current active environment
    const activeEnv = environments.find(e => e.isActive);
    if (activeEnv) {
      try {
        await deactivateEnvironment(activeEnv.id);
        // Update state: no active environment
        setEnvironments(prev => prev.map(env => ({ ...env, isActive: false })));
        setSelectedEnvironmentId('no-env');
        setEnvironmentVariables([]);
        setEnvironmentVariablesDirty(false);
        toast.success('Environment deactivated');
      } catch (err) {
        console.error('Failed to deactivate environment:', err);
        toast.error(err.response?.data?.message || 'Failed to deactivate environment');
      }
    } else {
      // Already no active environment, just ensure selection is 'no-env'
      setSelectedEnvironmentId('no-env');
      setEnvironmentVariables([]);
      setEnvironmentVariablesDirty(false);
    }
    return;
  }

  try {
    await activateEnvironment(envId);
    // Update local state: set this env active, others inactive, and also select it for editing
    setEnvironments(prev => prev.map(env => ({
      ...env,
      isActive: env.id === envId
    })));
    setSelectedEnvironmentId(envId);
    const env = environments.find(e => e.id === envId);
    if (env) {
      setEnvironmentVariables(env.variables || []);
    }
    setEnvironmentVariablesDirty(false);
    toast.success('Environment activated');
  } catch (err) {
    console.error('Failed to activate environment:', err);
    toast.error(err.response?.data?.message || 'Failed to activate environment');
  }
};

const handleRenameEnvironment = async (envId, newName) => {
  if (!newName?.trim()) return;
  try {
    const response = await updateEnvironment(envId, { name: newName.trim() });
    const updatedEnv = normalizeEnvironment(response.data);
    setEnvironments(prev => prev.map(env => env.id === envId ? updatedEnv : env));
    toast.success('Environment renamed');
  } catch (err) {
    console.error('Failed to rename environment:', err);
    toast.error(err.response?.data?.message || 'Failed to rename environment');
  }
};

const handleDeleteEnvironment = async (envId) => {
  try {
    await deleteEnvironment(envId);
    setEnvironments(prev => prev.filter(env => env.id !== envId));
    if (selectedEnvironmentId === envId) {
      setSelectedEnvironmentId('no-env');
      setEnvironmentVariables([]);
    }
    toast.success('Environment deleted');
  } catch (err) {
    console.error('Failed to delete environment:', err);
    toast.error(err.response?.data?.message || 'Failed to delete environment');
  }
};

  const handleDeleteMock = (mockId) => {
    setMockApis((prev) => prev.filter(m => m.id !== mockId));
  };

  const handleRenameMock = (mockId, newName) => {
    setMockApis((prev) => prev.map(m => {
      if (m.id === mockId) {
        return { ...m, name: newName };
      }
      return m;
    }));
  };

  const handleSelectMockRequest = async (mockedCollection) => {
    // Run the mocked collection/folder as a collection with mock URLs
    if (!mockedCollection || !mockedCollection.requests) return;

    setIsRunningCollection(true);
    setCollectionRunResults({
      collectionName: mockedCollection.name,
      startTime: new Date().toISOString(),
      status: 'running',
      results: []
    });

    const results = [];

    // Execute all mocked requests sequentially
    for (let i = 0; i < mockedCollection.requests.length; i++) {
      const request = mockedCollection.requests[i];
      
      setCollectionRunResults(prev => ({
        ...prev,
        currentIndex: i,
        totalRequests: mockedCollection.requests.length,
        currentRequest: request.name
      }));

      try {
        // Simulate API call with mock URL
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        
        results.push({
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.mockUrl,
          folderPath: request.folderPath,
          status: 200,
          statusText: 'OK (Mocked)',
          time: Math.floor(Math.random() * 200) + 50,
          size: JSON.stringify(request.mockResponse).length,
          data: request.mockResponse,
          success: true,
          error: null
        });
      } catch (err) {
        results.push({
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.mockUrl,
          folderPath: request.folderPath,
          status: 0,
          statusText: 'Error',
          time: 0,
          size: 0,
          data: null,
          success: false,
          error: err.message || 'Request failed'
        });
      }
    }

    setCollectionRunResults({
      collectionName: mockedCollection.name,
      startTime: results[0]?.startTime || new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      totalRequests: mockedCollection.requests.length,
      passedRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      results: results
    });

    setIsRunningCollection(false);
  };

  // Variable substitution function - replaces {{variable}} with actual values
  const substituteVariables = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Combine environment and global variables (environment takes precedence)
    const allVariables = [...globalVariables, ...environmentVariables].filter(v => v.key && v.value);
    const variableMap = {};
    
    // Environment variables override global variables
    allVariables.forEach(v => {
      variableMap[v.key] = v.value;
    });
    
    // Replace {{variable}} with value
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variableMap[varName] !== undefined ? variableMap[varName] : match;
    });
  };

  // Handle running all requests in a collection
const handleRunCollection = async (collection) => {
  if (!collection || !collection.id) return;

  setIsRunningCollection(true);
  setCollectionRunResults({
    collectionName: collection.name,
    startTime: new Date().toISOString(),
    status: 'running',
    results: []
  });

  try {
    // Call backend
    const environmentOverrides = getEnvironmentOverrides();
    const response = await executeCollection(collection.id, { environmentOverrides });
    const backendResult = response.data; // CollectionExecutionResult

    // Build a map of requestId -> folderPath for the entire collection
    const folderPathMap = new Map();
    const traverse = (items, currentFolderPath = 'Root') => {
      items.forEach(item => {
        if (item.type === 'request') {
          folderPathMap.set(item.id, currentFolderPath);
        } else if (item.type === 'folder' && item.items) {
          const newPath = currentFolderPath === 'Root' ? item.name : `${currentFolderPath} / ${item.name}`;
          traverse(item.items, newPath);
        }
      });
    };
    traverse(collection.items || []);

    // Map backend summaries to UI format
    const mappedResults = backendResult.results.map(summary => ({
  requestId: summary.request_id,
  requestName: summary.request_name,
  method: summary.method,
  url: summary.url,
  folderPath: folderPathMap.get(summary.request_id) || 'Unknown',
  status: summary.status_code,
  statusText: summary.status_text,
  time: summary.response_time_ms,
  size: summary.response_size_bytes || 0,
  data: summary.response_body,
  success: summary.is_success,
  error: summary.error_message,
  fullDetails: summary
    }));

    setCollectionRunResults({
      collectionName: collection.name,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      totalRequests: backendResult.totalRequests,
      passedRequests: backendResult.successCount,
      failedRequests: backendResult.failureCount,
      results: mappedResults
    });
  } catch (error) {
    console.error('Collection execution failed:', error);
    setCollectionRunResults({
      collectionName: collection.name,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'failed',
      error: error.response?.data?.message || error.message,
      results: []
    });
    toast.error('Failed to run collection');
  } finally {
    setIsRunningCollection(false);
  }
};

const handleMockServerRun = (runData) => {
  setCollectionRunResults(runData);
};

  const isWorkspace = pathname.startsWith('/workspace');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const userMenuRef = useRef(null);
  // Store tabs per workspace
const [workspaceTabs, setWorkspaceTabs] = useState({});
const [workspaceActiveIndex, setWorkspaceActiveIndex] = useState({});

// Context-aware tabs storage (for Collections and Mock views)
const [contextualTabs, setContextualTabs] = useState({});

const saveContextualTabs = (workspaceId, context, tabs, activeIndex) => {
  saveContextualTabsToDB(workspaceId, context, tabs, activeIndex);
};

const currentContextRef = useRef(null);

const activeWorkspace = projects.find(p => p.id === activeWorkspaceId);

const handleUpdateTab = (index, newTab) => {
  setRequests(prev => {
    const newRequests = [...prev];
    newRequests[index] = newTab;
    return newRequests;
  });
  setActiveRequestIndex(index);
};

const updateCurrentRequestResponse = (responseData) => {
  setRequests(prev => {
    const newRequests = [...prev];
    const idx = activeRequestIndex;
    if (idx >= 0 && idx < newRequests.length && newRequests[idx]) {
      newRequests[idx] = { ...newRequests[idx], response: responseData };
    }
    return newRequests;
  });
};

const filteredEnvironments = useMemo(() => {
  return environments.filter(env => 
    env.id === 'no-env' || 
    env.environmentType === 'global' || 
    env.workspaceId === activeWorkspaceId
  );
}, [environments, activeWorkspaceId]);

const filteredMockServers = useMemo(() => {
  return mockServers.filter(mock => mock.workspaceId === activeWorkspaceId);
}, [mockServers, activeWorkspaceId]);

  useEffect(() => {
  const handleClickOutside = (e) => {
    if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target)) {
      setIsWorkspaceDropdownOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);


  // Top menu navigation items
  const topMenuItems = [
    { id: 'history', label: 'History', path: '/workspace/history', icon: History },
    { id: 'collections', label: 'Collections', path: '/workspace/collections', icon: LayoutGrid },
    { id: 'environments', label: 'Variables', path: '/workspace/variables', icon: Layers },
    { id: 'mcp-test', label: 'MCP', path: '/workspace/mcp-test', icon: Activity },
    { id: 'testing', label: 'Testing', path: '/workspace/testing', icon: BarChart3 },
    { id: 'mock-service', label: 'Mock', path: '/workspace/mock-service', icon: Layers },
    { id: 'ai-assisted', label: 'AI-Assisted', path: '/workspace/ai-assisted', icon: Bot },
    { id: 'dashboard', label: 'Dashboard', path: '/workspace/dashboard', icon: BarChart3 },
  ];

  // Determine active menu based on current path
  const getActiveMenu = () => {
    if (pathname.includes('/workspace/profile')) return null; // Profile pages don't highlight navigation
    if (pathname.includes('/workspace/history')) return 'history';
    if (pathname.includes('/workspace/mcp-test')) return 'mcp-test';
    if (pathname.includes('/workspace/variables')) return 'environments';
    if (pathname.includes('/workspace/testing')) return 'testing';
    if (pathname.includes('/workspace/mock-service')) return 'mock-service';
    if (pathname.includes('/workspace/ai-assisted')) return 'ai-assisted';
    if (pathname.includes('/workspace/dashboard')) return 'dashboard';
    if (pathname.includes('/workspace/collections')) return 'collections';
    return 'collections';
  };
 const [currentActiveMenu, setCurrentActiveMenu] = useState(() => getActiveMenu());

useEffect(() => {
  setCurrentActiveMenu(getActiveMenu());
}, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hydrate theme from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('probestack_theme');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch (_) {}
  }, []);

  // Apply theme to document and persist
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('probestack_theme', theme);
    } catch (_) {}
  }, [theme]);

  // Save tabs whenever they change (requests or active index)
useEffect(() => {
  if (!activeWorkspaceId) return;
  if (currentActiveMenu === 'collections' || currentActiveMenu === 'mock-service' || currentActiveMenu === 'mcp-test') {
    saveContextualTabs(activeWorkspaceId, currentActiveMenu, requests, activeRequestIndex);
  } else {
    saveWorkspaceTabs(activeWorkspaceId, requests, activeRequestIndex);
  }
}, [requests, activeRequestIndex, activeWorkspaceId, currentActiveMenu]);

// Handle context switching between 'collections' and 'mock-service'
useEffect(() => {
  if (!activeWorkspaceId) return;
  const prevContext = currentContextRef.current;
  const newContext = (currentActiveMenu === 'collections' || currentActiveMenu === 'mock-service' || currentActiveMenu === 'mcp-test') ? currentActiveMenu : null;

  if (prevContext === newContext) return;

  // Save current tabs to previous context if it was a tracked context
  if (prevContext === 'collections' || prevContext === 'mock-service' || prevContext === 'mcp-test') {
  saveContextualTabs(activeWorkspaceId, prevContext, requests, activeRequestIndex);
}

  // Load tabs for new context if it is a tracked context
if (newContext === 'collections' || newContext === 'mock-service' || newContext === 'mcp-test') {
  const saved = contextualTabs[activeWorkspaceId]?.[newContext];
    if (saved) {
      setRequests(saved.tabs);
      setActiveRequestIndex(saved.activeIndex);
    } else {
      if (newContext === 'collections') {
        setRequests([createEmptyRequest()]);
        setActiveRequestIndex(0);
      } else { // mock-service
        setRequests([]);
        setActiveRequestIndex(0);
      }
    }
  }

  currentContextRef.current = newContext;
}, [currentActiveMenu, activeWorkspaceId, contextualTabs]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => {
    try {
      [
        'isLoggedIn',
        'userEmail',
        'userName',
        'userFirstName',
        'authToken',
        'pendingAuthEmail',
        'userRole',
        'userOrganization',
      ].forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
    // Auth0 logout: clear session and redirect to probestack.io
    window.location.assign(
      'https://probestack-usa-dev.us.auth0.com/v2/logout?client_id=rV9Ihy7REI9vFE7Uclelwp89wQfg3a4S&returnTo=https://probestack.io/'
    );
  };

  return (
    <div className="flex h-screen bg-probestack-bg text-white font-sans antialiased overflow-hidden selection:bg-primary/30">
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-probestack-bg relative z-0 overflow-hidden">
        {/* Header - same logo block as Migration/DashboardNavbar (porbestack-new-repo) */}
        <header className="h-16 border-b border-dark-700 flex items-center px-6 justify-between shrink-0 z-20 bg-header-bg">
  <div className="flex items-center gap-8 flex-1 min-w-0">
    <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => navigate('/')}>
      <img
        src="/assets/justlogo.png"
        alt="ProbeStack logo"
        className="h-11 w-auto"
        onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
      />
      <div className="flex flex-col">
        <span className="text-xl font-extrabold gradient-text font-heading whitespace-nowrap">ForgeQ</span>
        <span className="text-[0.65rem] text-gray-400 leading-tight mt-0.5 whitespace-nowrap">A ForgeCrux Company</span>
      </div>
    </div>
    
    {/* Navigation Links - only show on workspace pages */}
    {isWorkspace && (
      <nav className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
        {topMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentActiveMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-primary/20 border border-primary/30 text-primary'
                  : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    )}
  </div>
  
  <div className="flex items-center gap-3">
    {/* Workspace Dropdown */}

    {/* Settings Button */}
    <button
      type="button"
      onClick={() => navigate('/settings')}
      aria-label="Settings"
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
    >
      <Settings className="w-4 h-4" />
    </button>

    {/* Theme Toggle */}
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>

    {/* Profile Dropdown */}
    <div className="relative" ref={userMenuRef}>
      <button
        type="button"
        onClick={() => setIsUserMenuOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center gap-0.5 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
      >
        <User className="w-4 h-4" />
        <ChevronDown className={clsx('w-3 h-3 transition-transform', isUserMenuOpen && 'rotate-180')} />
      </button>
      {isUserMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-dark-700 bg-dark-800/95 shadow-xl overflow-hidden z-50">
          <div className="py-1">
            <button
              onClick={() => { navigate('/workspace/profile'); setIsUserMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-dark-700 transition-colors text-left"
            >
              <User className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => { setIsUserMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-dark-700 transition-colors text-left"
            >
              <BookOpen className="w-4 h-4" />
              Knowledgebase
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
</header>

        <Routes>
          <Route path="/" element={<Home workspaces={projects} />} />
          <Route path="/reports" element={<Reports history={history} />} />
          <Route path="/explore" element={<Explore onImport={handleImport} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/workspace/profile" element={<Profile />} />
          <Route path="/workspace/profile/support" element={<ProfileSupport />} />
          <Route path="/workspace/profile/support/ticket" element={<ProfileSupportTicket />} />
          <Route
  path="/workspace/projects-management"
  element={
    <ProjectManagementPage
      projects={projects}
      activeWorkspaceId={activeWorkspaceId}
      onSelectWorkspace={handleSelectWorkspace}
      onAddProject={handleAddProject}
      onWorkspaceUpdate={handleWorkspaceUpdate}
      onWorkspaceDelete={handleWorkspaceDelete}
      currentUserId={currentUserId}
    />
  }
/>
          <Route
            path="/workspace/*"
            element={
              <TestingToolPage
                history={history}
                requests={requests}
                collections={collections}
                projects={projects}
                activeRequestIndex={activeRequestIndex}
                onTabSelect={handleTabSelect}
                onNewTab={handleNewTab}
                onCloseTab={handleCloseTab}
                onTabRename={handleTabRename}
                method={method}
                url={url}
                queryParams={queryParams}
                headers={headers}
                body={body}
                authType={authType}
                authData={authData}
                preRequestScript={preRequestScript}
                tests={tests}
response={currentRequest?.response}
isLoading={currentRequest?.isLoading}
                error={error}
                selectedEnvironment={selectedEnvironmentId}
                onEnvironmentChange={handleEnvironmentChange}
                onCreateEnvironment={handleCreateEnvironment}
                onActivateEnvironment={handleActivateEnvironment}
                onRenameEnvironment={handleRenameEnvironment}
                onDeleteEnvironment={handleDeleteEnvironment}
                onSelectEndpoint={handleSelectEndpoint}
                onMethodChange={(v) => updateActiveRequest('method', v)}
                onUrlChange={(v) => updateActiveRequest('url', v)}
                onQueryParamsChange={(v) => updateActiveRequest('queryParams', v)}
                onHeadersChange={(v) => updateActiveRequest('headers', v)}
                  onBodyChange={(v) => {
    // console.log('📝 onBodyChange called with:', v);
    updateActiveRequest('body', v);
  }}
                onAuthTypeChange={(v) => updateActiveRequest('authType', v)}
                onAuthDataChange={(v) => updateActiveRequest('authData', v)}
                onPreRequestScriptChange={(v) => updateActiveRequest('preRequestScript', v)}
                onTestsChange={(v) => updateActiveRequest('tests', v)}
                onExecute={handleExecute}
                onNewRequest={handleNewTab}
                onSaveRequest={handleSaveRequest}
                onAddProject={handleAddProject}
                onCollectionsChange={handleCollectionsChange}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                onUpdateTab={handleUpdateTab}
                environmentVariables={environmentVariables}
                onEnvironmentVariablesChange={handleEnvironmentVariablesChange}
                onSaveEnvironmentVariables={handleSaveEnvironmentVariables}
                environmentVariablesDirty={environmentVariablesDirty}
                substituteVariables={substituteVariables}
                collectionRunResults={collectionRunResults}
                onRunCollection={handleRunCollection}
                testFiles={testFiles}
                onTestFilesChange={setTestFiles}
                mockApis={mockApis}
                dummyMockRequests={dummyMockRequests}
                onCreateMock={handleCreateMock}
                onDeleteMock={handleDeleteMock}
                onRenameMock={handleRenameMock}
                onSelectMockRequest={handleSelectMockRequest}
                isSavedRequest={isSavedRequest}
                onUpdateRequest={handleUpdateRequest}
                pristineRequests={pristineRequests}
  globalEnvironment={globalEnvironment} 
  globalVariablesDirty={globalVariablesDirty}
  onGlobalVariablesChange={handleGlobalVariablesChange}
  onSaveGlobalVariables={handleSaveGlobalVariables}
  isLoadingMocks={isLoadingMocks}
  onCreateMockServer={handleCreateMockServer}
  onRenameMockServer={handleRenameMockServer}
  onDeleteMockServer={handleDeleteMockServer}
  onToggleVisibility={handleToggleVisibility}
  onExecuteMockRequest={handleExecuteMockRequest}
  onSelectMockEndpoint={handleSelectMockEndpoint}
  onUpdateMockServer={handleUpdateMockServer}
  onOpenWorkspaceDetails={handleOpenWorkspaceDetails}
  currentUserId={currentUserId}
  onWorkspaceUpdate={handleWorkspaceUpdate}
  onWorkspaceDelete={handleWorkspaceDelete}
  onMockServerRun={handleMockServerRun}
  onFetchHistoryEntry={fetchHistoryEntry}
  activeWorkspaceId={activeWorkspaceId}
  setActiveWorkspaceId={setActiveWorkspaceId}
  environments={filteredEnvironments}
  mockServers={filteredMockServers}
  onOpenCollectionRun={handleOpenCollectionRun}
onRunCollectionWithOrder={handleRunCollectionWithOrder}
activeEnvVars={activeEnvVars}
inactiveEnvVars={inactiveEnvVars}
activeEnvValues={activeEnvValues}
inactiveEnvInfo={inactiveEnvInfo}
onShowChatbot={handleShowChatbot}
  globalVars={globalVars}
  globalValues={globalValues}
    workspaceRuns={workspaceRuns}
  loadingRuns={loadingRuns}
  loadTestRuns={loadTestRuns}
  loadingLoadRuns={loadingLoadRuns}
  onLoadTestComplete={handleLoadTestComplete}
   onViewRunResults={handleViewFunctionalRunResults} 
   onBodyTypeChange={(v) => 
    updateActiveRequest('bodyType', v)}
    onMcpTypeChange={onMcpTypeChange}
    onSelectWorkspace={handleSelectWorkspace}
    onCreateProjectTab={handleCreateProjectTab}
    mcpCollections={mcpCollections}
    setMcpCollections={setMcpCollections}
              />
            }
          />
        </Routes>
        <WorkspaceCreateModal
  isOpen={showNewWorkspaceModal}
  onClose={() => setShowNewWorkspaceModal(false)}
  onCreate={handleAddProject}
  workspaces={projects}
/>

<RunModal isOpen={isRunningCollection} />

<AIChatbotHelper
  isVisible={chatbotVisible}
  onClose={handleCloseChatbot}
  error={chatbotError}
  response={chatbotResponse}
  requestInfo={chatbotRequestInfo}
/>

      </main>
    </div>
  );
}

export default App;