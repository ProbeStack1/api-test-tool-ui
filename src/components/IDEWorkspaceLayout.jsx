import React, { useEffect, useState,useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {  History, LayoutGrid, Layers, ChevronRight, ChevronLeft, Search, Plus, ChevronDown, BarChart3, Save, MoreVertical, MoreHorizontal, Trash2, FileSearch, Play, Upload, FolderOpen, X, Folder, Loader2, Building2, FileCode, Check, Edit3, Bot, BookOpen, Activity } from 'lucide-react';
import APIExecutionStudio from './APIExecutionStudio';
import IDEExecutionInsights from './IDEExecutionInsights';
import CodeSnippetPanel from './CodeSnippetPanel';
import { RightPanelVariables } from './RightPanelVariables';
import CollectionsPanel from './CollectionsPanel';
import VariablesEditor from './VariablesEditor';
import DashboardSpecTable from './DashboardSpecTable';
import GenerateTestCase from './GenerateTestCase';
import AIAssisted from '../pages/AIAssisted';
import clsx from 'clsx';
import EnvironmentList from './sidebar/EnvironmentList';
import EnvironmentDropdown from './sidebar/EnvironmentDropdown';
import { runMockServer,getMockEndpointHistory } from '../services/mockServerService';
import { listCollectionRuns,exportCollection  } from '../services/collectionService';
import {listTestFiles,uploadTestFile,deleteTestFile,} from '../services/testFileService';
import { listTestSpecs } from '../services/testSpecificationService';
import { listLibraryItems ,updateLibraryItem, deleteLibraryItem } from '../services/specLibraryService';
import { uploadCollection as uploadFunctionalCollection } from '../services/functionalTestService';
import { uploadCollection as uploadLoadCollection } from '../services/loadTestService';
import SpecLibraryPanel from './sidebar/SpecLibraryPanel';
import FunctionalTestPanel from './FunctionalTestPanel';
import { getRunStatus } from '../services/functionalTestService';
import { fetchRequestHistory ,saveResponseFromHistory,  updateSavedResponseName,  deleteSavedResponse, } from '../services/requestService';
import { toast } from 'sonner';
import MCPPanel, { MCPProvider, MCPSidebar, MCPMainContent, useMCP } from './MCPPanel';
import RightPanelProjects from './RightPanelProjects';
import RightPanelAI from './RightPanelAI';

// Wraps the <main> subtree with MCPProvider only when the MCP Test tab is
// active. Keeps all other tabs free of MCP side effects.
function ConditionalMCPProvider({ active, workspaceId, children }) {
  if (!active) return <>{children}</>;
  return <MCPProvider workspaceId={workspaceId}>{children}</MCPProvider>;
}

// Right-sidebar Code panel for the MCP tab. Reads the Bridge's current
// request from `MCPContext.bridgeRequest` and feeds it to the shared
// <CodeSnippetPanel /> so users get cURL / JS / Python / Java / HTTPie /
// Postman CLI / axios snippets for the actual MCP call. Read-only — edits
// in the snippet don't mutate Bridge state.
function McpCodeSnippetPanel() {
  const { bridgeRequest } = useMCP();
  const req = bridgeRequest || {
    method: 'POST',
    url: '',
    queryParams: [],
    headers: [],
    body: '',
    authType: 'none',
    authData: {},
  };
  return (
    <CodeSnippetPanel
      method={req.method}
      url={req.url}
      queryParams={req.queryParams}
      headers={req.headers}
      body={req.body}
      authType={req.authType}
      authData={req.authData}
      onRequestUpdate={() => { /* read-only for MCP tab */ }}
    />
  );
}

export default function IDEWorkspaceLayout({
  history,
  requests,
  collections,
  projects,
  activeRequestIndex,
  onTabSelect,
  onNewTab,
  onTryFromHistory,
  onCloseTab,
  onTabRename,
  method,
  url,
  queryParams,
  headers,
  body,
  authType,
  authData,
  preRequestScript,
  tests,
  response,
  isLoading,
  error,
  environments,
  selectedEnvironment,
  onSelectEndpoint,
  onMethodChange,
  onUrlChange,
  onQueryParamsChange,
  onHeadersChange,
  onBodyChange,
  onAuthTypeChange,
  onAuthDataChange,
  onPreRequestScriptChange,
  onTestsChange,
  onExecute,
  onNewRequest,
  onEnvironmentChange,
  onSaveRequest,
  onAddProject,
  onCollectionsChange,
  onDeleteHistoryItem,
  onUpdateTab,
  environmentVariables,
  onEnvironmentVariablesChange,
  onSaveEnvironmentVariables,
  onSaveGlobalVariables,
  substituteVariables,
  collectionRunResults,
  onRunCollection,
  testFiles,
  onTestFilesChange,
  mockApis,
  dummyMockRequests,
  onCreateMock,
  onDeleteMock,
  onRenameMock,
  onSelectMockRequest,
  isSavedRequest,
  onUpdateRequest,
  pristineRequests,
  onCreateEnvironment,
  onActivateEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  environmentVariablesDirty,
      globalEnvironment,
    globalVariablesDirty,
    onGlobalVariablesChange,
      mockServers,
  isLoadingMocks,
  onCreateMockServer,
  onRenameMockServer,
  onDeleteMockServer,
  onToggleVisibility,
  onExecuteMockRequest,
  onSelectMockEndpoint,
  onUpdateMockServer,
  onOpenWorkspaceDetails,
  currentUserId,
      onWorkspaceUpdate,
  onWorkspaceDelete,
  onMockServerRun,
  onFetchHistoryEntry,
  activeWorkspaceId,
        onOpenCollectionRun,
      onRunCollectionWithOrder,
      onViewRunResults,
      activeEnvVars,
inactiveEnvVars,
activeEnvValues,
inactiveEnvInfo,
onShowChatbot,
   globalVars,
  globalValues,
    workspaceRuns,     
  loadingRuns,          
  loadTestRuns,   
  loadingLoadRuns,   
  onLoadTestComplete, 
   onBodyTypeChange,
   onMcpTypeChange,
   onSelectWorkspace,
   onCreateProjectTab,
   mcpCollections,
   setMcpCollections,
   onCreateEnvironmentWithScope,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const globalVariables = globalEnvironment?.variables || [];
const [selectedLoadCollectionId, setSelectedLoadCollectionId] = useState(null);
const currentRequest = requests[activeRequestIndex];
const [selectedTestCollectionId, setSelectedTestCollectionId] = useState(null);
const [testSpecs, setTestSpecs] = useState([]);
const [libraryItems, setLibraryItems] = useState([]);
const [loadingSpecs, setLoadingSpecs] = useState(false);
const [loadingLibrary, setLoadingLibrary] = useState(false);
const [fileSelectionContext, setFileSelectionContext] = useState({ context: null, selectedFile: null });
const [selectedHistoryType, setSelectedHistoryType] = useState('request');

// Derive the history/run/load-test ID of the currently active tab so the
// left History sidebar can highlight the matching row.
const activeHistoryItemId = useMemo(() => {
  if (!currentRequest) return null;
  // REST request tab opened from history (id shape: `history-<historyId>`)
  if (typeof currentRequest.id === 'string' && currentRequest.id.startsWith('history-')) {
    return currentRequest.id.slice('history-'.length);
  }
  // Functional / collection-run result tab → match by runId
  if (currentRequest.type === 'collection-run-results' && currentRequest.runId) {
    return currentRequest.runId;
  }
  // Load-test result tab → match by loadTestId
  if (currentRequest.type === 'load-test-results' && currentRequest.loadTestId) {
    return currentRequest.loadTestId;
  }
  return null;
}, [currentRequest]);
const [isPreparingCollection, setIsPreparingCollection] = useState(false);
const [isPreparingLoadCollection, setIsPreparingLoadCollection] = useState(false);
// MCP Test states
const [mcpServerType, setMcpServerType] = useState('local'); // 'local' | 'remote'
const [mcpServerUrl, setMcpServerUrl] = useState('http://localhost:8000');
const [mcpTestResult, setMcpTestResult] = useState(null);
const [mcpTesting, setMcpTesting] = useState(false);

const [refreshCollectionsKey, setRefreshCollectionsKey] = useState(0);

const [functionalRunPhase, setFunctionalRunPhase] = useState('config'); // 'config', 'running', 'results'
const [functionalRunId, setFunctionalRunId] = useState(null);
const [functionalRunResult, setFunctionalRunResult] = useState(null);
const functionalPollRef = useRef(null);

const handleSaveResponse = useCallback(async (requestId, historyId, customName) => {
  if (!requestId || !historyId) {
    toast.error('Missing request or history ID');
    return;
  }
  try {
    const response = await saveResponseFromHistory(requestId, historyId, customName);
    const newSavedResponse = response.data;
    toast.success('Response saved');

    // Immutable update using the current collections prop
    const updateRequestInTree = (items) => {
      return items.map(item => {
        if (item.type === 'request' && item.id === requestId) {
          const existing = item.savedResponses || [];
          if (!existing.some(sr => sr.saved_response_id === newSavedResponse.saved_response_id)) {
            return {
              ...item,
              savedResponses: [...existing, newSavedResponse]
            };
          }
          return item;
        }
        if (item.items) {
          return {
            ...item,
            items: updateRequestInTree(item.items)
          };
        }
        return item;
      });
    };

    const updatedCollections = updateRequestInTree(collections);
    onCollectionsChange(updatedCollections);
  } catch (err) {
    toast.error(err.response?.data?.message || 'Save failed');
  }
}, [saveResponseFromHistory, collections, onCollectionsChange]);

const handleOpenSavedResponse = (savedResponse, parentRequest) => {
  const requestTab = {
    id: `saved-${savedResponse.saved_response_id}`,
    type: 'request',
    name: savedResponse.name,
    method: savedResponse.method,
    url: savedResponse.url,
    headers: savedResponse.request_headers || [],
    queryParams: [],
    body: savedResponse.request_body || '',
    bodyType: savedResponse.body_type || 'raw',
    bodyMode: savedResponse.body_mode || null,
    formData: savedResponse.form_data || [],
    authType: 'none',
    authData: {},
    preRequestScript: '',
    tests: '',
    readOnly: true,
    response: {
      status: savedResponse.status_code,
      statusText: savedResponse.status_text,
      time: savedResponse.response_time_ms,
      size: savedResponse.response_size_bytes,
      data: savedResponse.response_body,
      headers: savedResponse.response_headers || [],
      testResults: [],
      testScriptError: null,
    }
  };
  // Check if tab already exists
  const existingIndex = requests.findIndex(r => r.id === requestTab.id);
  if (existingIndex !== -1) {
    onTabSelect(existingIndex);
  } else {
    onNewTab(requestTab);
  }
};

const selectedMockServerId = useMemo(() => {
  if (!currentRequest) return null;
  if (currentRequest.type === 'mock-wizard') {
    return currentRequest.mockServer?.id || null;
  }
  if (currentRequest.type === 'mock-editor') {
    return currentRequest.mockServer?.id || null;
  }
  return null;
}, [currentRequest]);

const selectedMockEndpointId = useMemo(() => {
  if (!currentRequest) return null;
  // If the current tab is a regular request that is a mock endpoint
  if (currentRequest.isMockEndpoint === true) {
    return currentRequest.mockEndpointId || currentRequest.mockEndpoint?.id;
  }
  return null;
}, [currentRequest]);

const testMcpConnection = async () => {
  setMcpTesting(true);
  setMcpTestResult(null);
  try {
    // Simulate API call – replace with real MCP endpoint later
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMcpTestResult({ success: true, message: 'MCP server responded successfully' });
  } catch (err) {
    setMcpTestResult({ success: false, message: err.message || 'Connection failed' });
  } finally {
    setMcpTesting(false);
  }
};

const handleOpenMockEditor = (config) => {
  const newTab = {
    id: `mock-wizard-${Date.now()}`,
    type: 'mock-wizard',
    name: `Mock: ${config.name}`,
    mockConfig: config,
  };
  onNewTab(newTab);
};

const handleOpenMockEditorForExisting = (mockServer) => {
  const existingTabIndex = requests.findIndex(
    tab => tab.type === 'mock-wizard' && tab.mockServer?.id === mockServer.id
  );
  if (existingTabIndex !== -1) {
    onTabSelect(existingTabIndex);
    return;
  }

  const newTab = {
    id: `mock-wizard-${mockServer.id}`,
    type: 'mock-wizard',
    name: `Mock: ${mockServer.name}`,
    step: 'editor',
    mockServer: mockServer,
    isEdit: true,
  };
  onNewTab(newTab);
};

const handleViewLoadTestResults = (run) => {
  const loadTestId = run.testId || run.loadTestId || run.id;
  if (!loadTestId) {
    toast.error('Cannot open results – invalid test ID');
    return;
  }

  // If the same tab is already open, just focus it.
  const existingIndex = requests.findIndex(
    tab => tab.type === 'load-test-results' && tab.loadTestId === loadTestId
  );
  if (existingIndex !== -1) {
    onTabSelect(existingIndex);
    // Only navigate if we're not already on History, to avoid a pointless
    // route push that re-triggers sidebar data fetches (flicker).
    if (!location.pathname.includes('/project/history')) {
      navigate('/project/history');
    }
    return;
  }

  // New tab. If we're already on History, open immediately — no setTimeout /
  // navigate round-trip (that combo caused the left-sidebar history list to
  // appear to refresh/flicker when clicking a load-test row).
  const resultsTab = {
    id: `load-test-results-${loadTestId}-${Date.now()}`,
    type: 'load-test-results',
    name: `Load Test Results: ${run.collectionName || run.testName || 'Load Test'}`,
    loadTestId: loadTestId,
  };

  if (location.pathname.includes('/project/history')) {
    onNewTab(resultsTab);
    return;
  }

  // Coming from a different menu (e.g., LoadTestRunsTable on some other view)
  // — navigate to History first, then create the tab after the context
  // switch completes.
  navigate('/project/history');
  setTimeout(() => {
    const existingAfter = requests.findIndex(
      tab => tab.type === 'load-test-results' && tab.loadTestId === loadTestId
    );
    if (existingAfter !== -1) onTabSelect(existingAfter);
    else onNewTab(resultsTab);
  }, 300);
};



const workspaceCollections = useMemo(() => {
  return collections.filter(c => c.project === activeWorkspaceId);
}, [collections, activeWorkspaceId]);



useEffect(() => {
  if (workspaceCollections.length > 0 && !selectedTestCollectionId) {
    setSelectedTestCollectionId(workspaceCollections[0].id);
  }
}, [workspaceCollections, selectedTestCollectionId]);


useEffect(() => {
  if (workspaceCollections.length > 0 && !selectedLoadCollectionId) {
    setSelectedLoadCollectionId(workspaceCollections[0].id);
  }
}, [workspaceCollections]);

useEffect(() => {
  if (functionalRunPhase !== 'running' || !functionalRunId) return;
  let cancelled = false;
  const poll = async () => {
    try {
      const { data } = await getRunStatus(functionalRunId);
      if (cancelled) return;
      if (data.status === 'DONE' || data.status === 'FAILED') {
        const result = data?.result;
        if (result) {
          // Map results to same format as CollectionRunResultsView
          const mappedRequests = (result.results || []).map((r, idx) => {
            const hdrsToArr = (m) => m ? Object.entries(m).map(([key, value]) => ({ key, value })) : [];
            return {
              requestId: `req-${idx}`,
              requestName: r.itemName || r.name || '',
              method: r.method || '',
              url: r.url || '',
              status: r.statusCode || 0,
              statusText: r.statusText || '',
              time: Math.round(r.responseTimeMs || 0),
              size: r.responseSizeBytes || 0,
              success: r.passed !== undefined ? r.passed : (r.statusCode >= 200 && r.statusCode < 300),
              passed: r.passed,
              skipped: r.skipped || false,
              error: r.error || null,
              assertions: r.assertions || [],
              fullDetails: {
                request_headers: hdrsToArr(r.requestHeaders),
                request_body: r.requestBody || null,
                response_headers: hdrsToArr(r.responseHeaders),
                response_body: r.responseBody || '',
              },
            };
          });
          const totalAssertions = mappedRequests.reduce((s, r) => s + (r.assertions?.length || 0), 0);
          const passedAssertions = mappedRequests.reduce((s, r) => s + (r.assertions?.filter(a => a.passed)?.length || 0), 0);
          const avgResponseTime = result.totalRequests > 0 ? Math.round((result.totalTimeMs || 0) / result.totalRequests) : 0;
          const runResultData = {
            runId: functionalRunId, 
            collectionName: result.collectionName || 'Functional Test Run',
            source: 'MANUAL',
            iterations: 1, // iterations can be stored in state if needed
            duration: result.totalTimeMs || 0,
            totalRequests: result.totalRequests || 0,
            passed: result.passedRequests || 0,
            failed: result.failedRequests || 0,
            skipped: result.skippedRequests || 0,
            errors: result.failedRequests || 0,
            avgResponseTime,
            totalAssertions,
            passedAssertions,
            failedAssertions: totalAssertions - passedAssertions,
            results: mappedRequests,
          };
          setFunctionalRunResult(runResultData);
          setFunctionalRunPhase('results');
          toast.success(`Run complete: ${runResultData.passed}/${runResultData.totalRequests} passed`);
        } else {
          setFunctionalRunPhase('config');
          toast.error('Run failed');
        }
        setFunctionalRunId(null);
        return;
      }
      functionalPollRef.current = setTimeout(poll, 1500);
    } catch (err) {
      if (!cancelled) functionalPollRef.current = setTimeout(poll, 2000);
    }
  };
  poll();
  return () => {
    cancelled = true;
    clearTimeout(functionalPollRef.current);
  };
}, [functionalRunPhase, functionalRunId]);

const handleShowLoadTestResults = (loadTestId) => {
  // Check if a tab with this loadTestId already exists
  const existingTabIndex = requests.findIndex(tab => 
    tab.type === 'load-test-results' && tab.loadTestId === loadTestId
  );
  if (existingTabIndex !== -1) {
    // Already exists – switch to it
    onTabSelect(existingTabIndex);
  } else {
    // Create a new tab
    const newTab = {
      id: `load-test-results-${loadTestId}-${Date.now()}`,
      type: 'load-test-results',
      name: `Load Test Results`,
      loadTestId: loadTestId,
    };
    onNewTab(newTab);
  }
};
  const getTopMenuFromPath = (pathname) => {
    if (pathname.includes('/project/history')) return 'history';
    if (pathname.includes('/project/variables')) return 'environments';
    if (pathname.includes('/project/mcp-test')) return 'mcp-test'; 
    if (pathname.includes('/project/testing')) return 'testing';
    if (pathname.includes('/project/mock-service')) return 'mock-service';
    if (pathname.includes('/project/ai-assisted')) return 'ai-assisted';
    if (pathname.includes('/project/dashboard')) return 'dashboard';
    if (pathname.includes('/project/settings/general')) return 'settings-general';
    if (pathname.includes('/project/settings/certificates')) return 'settings-certificates';
    return 'collections';
  };
  const getPathFromTopMenu = (menuId) => {
    if (menuId === 'history') return '/project/history';
    if (menuId === 'environments') return '/project/variables';
    if (menuId === 'mcp-test') return '/project/mcp-test';
    if (menuId === 'testing') return '/project/testing';
    if (menuId === 'mock-service') return '/project/mock-service';
    if (menuId === 'ai-assisted') return '/project/ai-assisted';
    if (menuId === 'dashboard') return '/project/dashboard';
    return '/project/collections';
  };
  const [expandedMockServers, setExpandedMockServers] = useState({});
  const [topMenuActive, setTopMenuActive] = useState(() => getTopMenuFromPath(location.pathname));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Sidebar should be collapsed by default on dashboard and ai-assisted pages
    const initialMenu = getTopMenuFromPath(location.pathname);
    return initialMenu === 'dashboard' || initialMenu === 'ai-assisted';
  });
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(null); // null | 'code' | 'insights' — both closed by default
  const [variablesScope, setVariablesScope] = useState('environment-scope');

  // Already present (from earlier code) – ensure these are defined:
const [functionalSelectedFile, setFunctionalSelectedFile] = useState(null);
const [loadSelectedFile, setLoadSelectedFile] = useState(null);
const fileSelectCallbackRef = useRef(null);

// Resizable sidebar state
const [sidebarWidth, setSidebarWidth] = useState(() => {
  const saved = localStorage.getItem('probestack_sidebar_width');
  return saved ? parseInt(saved, 10) : 288;
});
const [isResizing, setIsResizing] = useState(false);
const startXRef = useRef(0);
const startWidthRef = useRef(0);

const startResize = (e) => {
  e.preventDefault();
  setIsResizing(true);
  startXRef.current = e.clientX;
  startWidthRef.current = sidebarWidth;
};

const onResize = useCallback((e) => {
  if (!isResizing) return;
  const dx = e.clientX - startXRef.current;
  let newWidth = startWidthRef.current + dx;
  newWidth = Math.min(300, Math.max(200, newWidth));
  setSidebarWidth(newWidth);
  if (sidebarCollapsed) setSidebarCollapsed(false);
}, [isResizing, sidebarCollapsed]);

const stopResize = useCallback(() => {
  if (isResizing) {
    setIsResizing(false);
    localStorage.setItem('probestack_sidebar_width', sidebarWidth);
  }
}, [isResizing, sidebarWidth]);

useEffect(() => {
  if (isResizing) {
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize);
  } else {
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
  }
  return () => {
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
  };
}, [isResizing, onResize, stopResize]);

const handleFileSelect = (file) => {
  if (fileSelectCallbackRef.current) {
    fileSelectCallbackRef.current(file);
  }
  setShowFileSelectionModal(false);
};

// const activeEnvironment = environments.find(env => env.isActive);
// const activeEnvVars = new Set(activeEnvironment?.variables?.map(v => v.key) || []);
// const inactiveEnvVars = new Set(
//   environments
//     .filter(env => !env.isActive)
//     .flatMap(env => env.variables?.map(v => v.key) || [])
// );

  // Collapse sidebar when navigating to dashboard or ai-assisted, expand when leaving
  useEffect(() => {
    if (topMenuActive === 'dashboard' || topMenuActive === 'ai-assisted') {
      setSidebarCollapsed(true);
    }
  }, [topMenuActive]);

  useEffect(() => {
}, [environmentVariablesDirty, selectedEnvironment]);

useEffect(() => {
  if (!activeWorkspaceId) return;
  const fetchFiles = async () => {
    try {
      const res = await listTestFiles(activeWorkspaceId);
      onTestFilesChange(res.items);
    } catch (err) {
      // toast.error('Failed to load test files');
    }
  };
  fetchFiles();
}, [activeWorkspaceId, onTestFilesChange]);
  // History menu state
  const [historyMenu, setHistoryMenu] = useState(null);
  const [showHistorySaveModal, setShowHistorySaveModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
  const [isRunningCollection, setIsRunningCollection] = useState(false);

  // Variables save feedback: 'environment' | 'global' | null, cleared after delay
  const [variablesSavedMessage, setVariablesSavedMessage] = useState(null);
  const variablesSavedTimeoutRef = React.useRef(null);
  const showVariablesSaved = (scope) => {
    setVariablesSavedMessage(scope);
    if (variablesSavedTimeoutRef.current) clearTimeout(variablesSavedTimeoutRef.current);
    variablesSavedTimeoutRef.current = setTimeout(() => setVariablesSavedMessage(null), 2500);
  };
  useEffect(() => () => { if (variablesSavedTimeoutRef.current) clearTimeout(variablesSavedTimeoutRef.current); }, []);

  useEffect(() => {
    if (location.pathname === '/project' || location.pathname === '/project/') {
      navigate('/project/collections', { replace: true });
      return;
    }
    setTopMenuActive(getTopMenuFromPath(location.pathname));
  }, [location.pathname, navigate]);

  const topMenuItems = [
    { id: 'history', label: 'History', icon: History },
    { id: 'collections', label: 'Collections', icon: LayoutGrid },
    { id: 'mcp-test', label: 'MCP Test', icon: Activity },
    { id: 'environments', label: 'Variables', icon: Layers },
    { id: 'testing', label: 'Testing', icon: BarChart3 },
    { id: 'mock-service', label: 'Mock', icon: Layers },
    { id: 'ai-assisted', label: 'AI-Assisted', icon: Bot },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  // Testing sub-tabs
  const [testingSubTab, setTestingSubTab] = useState('generate');
const testingSubTabs = [
  { id: 'library', label: 'Spec Library', icon: BookOpen },
  { id: 'generate', label: 'Test Cases', icon: FileSearch },
  { id: 'functional', label: 'Functional Test', icon: Play },
  { id: 'load', label: 'Load Test', icon: BarChart3 },
  // { id: 'MCP Test', label: 'MCP Test', icon: Activity }, // new tab
  { id: 'tracing', label: 'Tracing', icon: Activity }, // new tab
];



  // Generate Testcases - uploaded test files (CSV/JSON only)
  const [generateTestcasesSearch, setGenerateTestcasesSearch] = useState('');
  const testDataFileInputRef = React.useRef(null);
  
const handleTestDataFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // validation (keep existing)
  const allowedTypes = ['application/json', 'text/csv', 'application/vnd.ms-excel'];
  const allowedExtensions = ['.json', '.csv'];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    toast.error('Only CSV and JSON files are allowed');
    return;
  }

  try {
    const workspaceId = projects[0]?.id;
    if (!workspaceId) {
      toast.error('No project selected');
      return;
    }
    const uploaded = await uploadTestFile(workspaceId, file);
    onTestFilesChange(prev => [...prev, uploaded]);
    toast.success('File uploaded');
  } catch (error) {
    toast.error('Upload failed: ' + (error.response?.data?.message || error.message));
  } finally {
    e.target.value = ''; // reset input
  }
};
  
const handleDeleteTestFile = async (fileId) => {
  try {
    await deleteTestFile(fileId);
    onTestFilesChange(prev => prev.filter(f => f.id !== fileId));
    toast.success('File deleted');
  } catch (error) {
    toast.error('Delete failed: ' + (error.response?.data?.message || error.message));
  }
};

const handleDownloadTestFile = async (fileId, fileName) => {
  try {
    const response = await downloadTestFile(fileId);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    toast.error('Download failed');
  }
};

const handleRunMockServer = async (mockServer) => {
  if (!mockServer.endpoints || mockServer.endpoints.length === 0) return;

  setIsRunningCollection(true);
  const startTime = new Date().toISOString();

  // Update UI to show running state
  onMockServerRun({
    collectionName: mockServer.name,
    startTime,
    status: 'running',
    results: []
  });

  try {
    const response = await runMockServer(mockServer.id);
    const backendResult = response.data;

    // Map backend results to frontend format expected by Collection Run tab
    const mappedResults = backendResult.results.map(r => ({
      requestId: r.endpointId,
      requestName: `${r.method} ${r.path}`,
      method: r.method,
      url: `/api/v1/mocks/${mockServer.mockUrl}${r.path}`,
      folderPath: 'Mock Server',
      status: r.statusCode,
      statusText: r.statusText,
      time: r.responseTimeMs,
      size: 0, // not provided by backend
      data: null,
      success: r.success,
      error: r.errorMessage
    }));

    onMockServerRun({
      collectionName: mockServer.name,
      startTime,
      endTime: new Date().toISOString(),
      status: 'completed',
      totalRequests: backendResult.totalEndpoints,
      passedRequests: backendResult.successCount,
      failedRequests: backendResult.failureCount,
      results: mappedResults
    });
  } catch (error) {
    console.error('Mock server run failed:', error);
    onMockServerRun({
      collectionName: mockServer.name,
      startTime,
      endTime: new Date().toISOString(),
      status: 'failed',
      error: error.response?.data?.message || error.message,
      results: []
    });
  } finally {
    setIsRunningCollection(false);
  }
};

  // Functional Testing states
  const [functionalRunMode, setFunctionalRunMode] = useState('manual');
  const [functionalIterations, setFunctionalIterations] = useState(1);
  const [functionalDelay, setFunctionalDelay] = useState(0);
  const [selectedFunctionalFile, setSelectedFunctionalFile] = useState(null);
  const [showFileSelectionModal, setShowFileSelectionModal] = useState(false);
  const [functionalRunResults, setFunctionalRunResults] = useState(null);
  const [isRunningFunctional, setIsRunningFunctional] = useState(false);
  // Functional advanced options
  const [functionalTimeoutMs, setFunctionalTimeoutMs] = useState(30000);
  const [functionalBail, setFunctionalBail] = useState(false);
  const [functionalInsecure, setFunctionalInsecure] = useState(false);
  const [functionalFolder, setFunctionalFolder] = useState('');
  const [functionalEnvironmentPath, setFunctionalEnvironmentPath] = useState('');
  // Functional collection source ('workspace' | 'upload')
  const [functionalCollectionSource, setFunctionalCollectionSource] = useState('workspace');
  const [functionalCollectionPath, setFunctionalCollectionPath] = useState('');
  const [functionalCollectionUploading, setFunctionalCollectionUploading] = useState(false);

  // Load Testing states
  const [loadProfile, setLoadProfile] = useState('fixed');
  const [loadVirtualUsers, setLoadVirtualUsers] = useState(20);
  const [loadDuration, setLoadDuration] = useState(10);
  const [loadDurationUnit, setLoadDurationUnit] = useState('mins');
  const [loadRunMode, setLoadRunMode] = useState('app');
  const [loadTestResults, setLoadTestResults] = useState(null);
  const [isRunningLoadTest, setIsRunningLoadTest] = useState(false);
  const [loadTestCountdown, setLoadTestCountdown] = useState(0);
  // Load advanced options
  const [loadRampUpSeconds, setLoadRampUpSeconds] = useState(0);
  const [loadTargetRps, setLoadTargetRps] = useState(0);
  const [loadThinkTimeMs, setLoadThinkTimeMs] = useState(0);
  const [loadTimeoutMs, setLoadTimeoutMs] = useState(30000);
  const [loadMaxErrorRatePct, setLoadMaxErrorRatePct] = useState(5);
  const [loadMaxP99LatencyMs, setLoadMaxP99LatencyMs] = useState(5000);
  const [loadMaxAvgLatencyMs, setLoadMaxAvgLatencyMs] = useState(2000);
  // Load collection source ('workspace' | 'upload')
  const [loadCollectionSource, setLoadCollectionSource] = useState('workspace');
  const [loadCollectionPath, setLoadCollectionPath] = useState('');
  const [loadCollectionUploading, setLoadCollectionUploading] = useState(false);

  // Mock Service states
  const [showMockModal, setShowMockModal] = useState(false);
  const [selectedMockRequest, setSelectedMockRequest] = useState(null);
  const [mockSearch, setMockSearch] = useState('');
  const [mockMenu, setMockMenu] = useState(null);
  const [editingMockId, setEditingMockId] = useState(null);
  const [editingMockName, setEditingMockName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const confirmRef = useRef(null);


  const closeFileSelectionModal = () => {
  setShowFileSelectionModal(false);
  setFileSelectionContext({ context: null, selectedFile: null });
};


  useEffect(() => {
  if (!showFileSelectionModal || !activeWorkspaceId) return;

  const fetchData = async () => {
    setLoadingSpecs(true);
    setLoadingLibrary(true);
    try {
      // Fetch test specs for the current project
      const specsRes = await listTestSpecs(activeWorkspaceId);
      setTestSpecs(specsRes.items || []);
      
      // Fetch library items (global, no projecct ID needed)
      const libraryRes = await listLibraryItems();
      setLibraryItems(libraryRes || []);
    } catch (err) {
      console.error('Failed to fetch test data:', err);
      toast.error('Could not load test data');
    } finally {
      setLoadingSpecs(false);
      setLoadingLibrary(false);
    }
  };
  fetchData();
}, [showFileSelectionModal, activeWorkspaceId]);

  useEffect(() => {
  const handleClickOutside = (e) => {
    if (mockMenu) {
      const menuElement = document.querySelector('.mock-menu');
      if (menuElement && !menuElement.contains(e.target)) {
        setMockMenu(null);
      }
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [mockMenu]);

useEffect(() => {
  const handleClickOutsideConfirm = (e) => {
    if (deleteConfirm && !confirmRef.current?.contains(e.target)) {
      setDeleteConfirm(null);
    }
  };
  document.addEventListener('mousedown', handleClickOutsideConfirm);
  return () => document.removeEventListener('mousedown', handleClickOutsideConfirm);
}, [deleteConfirm]);

  // Handler for Functional Testing Run Collection
  const handleRunFunctionalTest = () => {
    if (isRunningFunctional) return;
    
    setIsRunningFunctional(true);
    setFunctionalRunResults({
      status: 'running',
      collectionName: 'Functional Test Run',
      startTime: new Date().toISOString(),
      iterations: functionalIterations,
      currentIteration: 0,
      results: [],
    });
    
    // Generate dummy results based on iterations
    const iterations = functionalIterations || 1;
    const dummyResults = [];
    
    // Create dummy requests for each iteration
    for (let i = 0; i < iterations; i++) {
      const iterationResults = [
        {
          requestId: `req-${i}-1`,
          requestName: `Get User Profile - Iteration ${i + 1}`,
          method: 'GET',
          url: '/api/users/profile',
          folderPath: `Iteration ${i + 1}`,
          status: 200,
          statusText: 'OK',
          time: 145,
          size: 1024,
          success: true,
          error: null,
          data: { id: 1, name: 'Test User', email: 'test@example.com' },
        },
        {
          requestId: `req-${i}-2`,
          requestName: `Update Settings - Iteration ${i + 1}`,
          method: 'PUT',
          url: '/api/users/settings',
          folderPath: `Iteration ${i + 1}`,
          status: 200,
          statusText: 'OK',
          time: 230,
          size: 512,
          success: true,
          error: null,
          data: { settings: { theme: 'dark', notifications: true } },
        },
        {
          requestId: `req-${i}-3`,
          requestName: `Fetch Data - Iteration ${i + 1}`,
          method: 'GET',
          url: '/api/data',
          folderPath: `Iteration ${i + 1}`,
          status: i % 3 === 0 ? 500 : 200, // Every 3rd iteration has an error
          statusText: i % 3 === 0 ? 'Internal Server Error' : 'OK',
          time: i % 3 === 0 ? 0 : 189,
          size: i % 3 === 0 ? 0 : 2048,
          success: i % 3 !== 0,
          error: i % 3 === 0 ? 'Internal Server Error' : null,
          data: i % 3 === 0 ? null : { items: [1, 2, 3, 4, 5] },
        },
      ];
      dummyResults.push(...iterationResults);
    }
    
    // Simulate running with a small delay
    let currentIteration = 0;
    const runInterval = setInterval(() => {
      currentIteration++;
      
      if (currentIteration <= iterations) {
        setFunctionalRunResults(prev => ({
          ...prev,
          currentIteration,
          results: dummyResults.slice(0, currentIteration * 3),
        }));
      } else {
        clearInterval(runInterval);
        
        const passedRequests = dummyResults.filter(r => r.success).length;
        const failedRequests = dummyResults.filter(r => !r.success).length;
        
        setFunctionalRunResults({
          status: 'completed',
          collectionName: 'Functional Test Run',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          iterations,
          totalRequests: dummyResults.length,
          passedRequests,
          failedRequests,
          results: dummyResults,
        });
        
        setIsRunningFunctional(false);
      }
    }, 500); // 500ms per iteration for visual effect
  };

  const runFunctionalTest = async () => {
  if (functionalCollectionSource === 'workspace') {
    if (!selectedTestCollectionId) {
      toast.error('Please select a collection');
      return;
    }

    setIsPreparingCollection(true);
    try {
      // 1. Export the collection
      const exportRes = await exportCollection(selectedTestCollectionId);
      const postmanJson = exportRes.data; // raw JSON string

      // 2. Create a File object from the JSON
      const file = new File([postmanJson], 'exported_collection.json', {
        type: 'application/json',
      });

      // 3. Upload to functional test service
      const uploadRes = await uploadFunctionalCollection(file);
      const collectionPath = uploadRes.data.collectionPath;

      // 4. Prepare options with the uploaded path
      const options = {
        type: 'functional',
        collectionPathOverride: collectionPath,
        iterations: functionalIterations,
        delay: functionalDelay,
        dataFile: functionalSelectedFile,
        timeoutMs: functionalTimeoutMs,
        bail: functionalBail,
        insecure: functionalInsecure,
        folderFilter: functionalFolder || null,
        environmentPath: functionalEnvironmentPath || null,
      };

      // 5. Run the test
      onRunCollectionWithOrder(null, [], options, -1);
    } catch (err) {
      console.error('Failed to prepare workspace collection:', err);
      toast.error('Failed to prepare collection: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsPreparingCollection(false);
    }
  } else if (functionalCollectionSource === 'upload') {
    if (!functionalCollectionPath) {
      toast.error('Please upload a collection file first');
      return;
    }

    const options = {
      type: 'functional',
      collectionPathOverride: functionalCollectionPath,
      iterations: functionalIterations,
      delay: functionalDelay,
      dataFile: functionalSelectedFile,
      timeoutMs: functionalTimeoutMs,
      bail: functionalBail,
      insecure: functionalInsecure,
      folderFilter: functionalFolder || null,
      environmentPath: functionalEnvironmentPath || null,
    };
    onRunCollectionWithOrder(null, [], options, -1);
  }
};

const runLoadTest = async () => {
  if (loadCollectionSource === 'workspace') {
    if (!selectedTestCollectionId) {
      toast.error('Please select a collection');
      return;
    }

    setIsPreparingLoadCollection(true);
    try {
      // 1. Export the collection
      const exportRes = await exportCollection(selectedTestCollectionId);
      // console.log('[loadTest] Export response:', exportRes.data); 
      const postmanJson = exportRes.data;
// console.log('[loadTest] Exported JSON length:', postmanJson?.length);
      // 2. Create a File object
      const file = new File([postmanJson], 'exported_collection.json', {
        type: 'application/json',
      });

      // 3. Upload to load test service
      const uploadRes = await uploadLoadCollection(file);
      // console.log('[loadTest] Upload response:', uploadRes.data); 
      const collectionPath = uploadRes.data.collectionPath;

      // 4. Build load test options using the uploaded path
      const options = {
        type: 'load',
        collectionPathOverride: collectionPath,
        virtualUsers: loadVirtualUsers,
        duration: loadDuration,
        durationUnit: loadDurationUnit,
        rampUp: loadRampUpSeconds,
        targetRps: loadTargetRps,
        thinkTimeMs: loadThinkTimeMs,
        timeoutMs: loadTimeoutMs,
        maxErrorRatePct: loadMaxErrorRatePct,
        maxP99LatencyMs: loadMaxP99LatencyMs,
        maxAvgLatencyMs: loadMaxAvgLatencyMs,
      };

      // console.log('[loadTest] Starting with options:', options);
      // 5. Run the test
      onRunCollectionWithOrder(null, [], options, -1);
    } catch (err) {
      console.error('[loadTest] Error:', err);
      console.error('Failed to prepare workspace collection for load test:', err);
      toast.error('Failed to prepare collection: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsPreparingLoadCollection(false);
    }
  } else if (loadCollectionSource === 'upload') {
    if (!loadCollectionPath) {
      toast.error('Please upload a collection file first');
      return;
    }

    const options = {
      type: 'load',
      collectionPathOverride: loadCollectionPath,
      virtualUsers: loadVirtualUsers,
      duration: loadDuration,
      durationUnit: loadDurationUnit,
      rampUp: loadRampUpSeconds,
      targetRps: loadTargetRps,
      thinkTimeMs: loadThinkTimeMs,
      timeoutMs: loadTimeoutMs,
      maxErrorRatePct: loadMaxErrorRatePct,
      maxP99LatencyMs: loadMaxP99LatencyMs,
      maxAvgLatencyMs: loadMaxAvgLatencyMs,
    };
    onRunCollectionWithOrder(null, [], options, -1);
  }
};

  const loadHistoryItem = (item) => {
    onUrlChange(item.url);
    onMethodChange(item.method);
  };

  // HistoryContextMenu component - similar to CollectionsPanel ContextMenu
  function HistoryContextMenu({ x, y, onClose, onAction }) {
    const menuRef = React.useRef(null);

    React.useEffect(() => {
      const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
      };
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [onClose]);

    const options = [
      { id: 'save', label: 'Save', icon: Save },
      { id: 'delete', label: 'Delete', icon: Trash2 },
    ];

    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
        style={{ left: x, top: y }}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isDelete = opt.id === 'delete';
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onAction(opt.id);
                onClose();
              }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                isDelete
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-gray-300 hover:bg-dark-700 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  const handleHistoryMenuOpen = (e, item, index) => {
    e.preventDefault();
    e.stopPropagation();
    setHistoryMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      index,
    });
  };

  const handleHistoryAction = (actionId) => {
    if (!historyMenu) return;
    
    if (actionId === 'delete') {
      onDeleteHistoryItem(historyMenu.index);
    } else if (actionId === 'save') {
      setSelectedHistoryItem(historyMenu.item);
      setSelectedHistoryIndex(historyMenu.index);
      setShowHistorySaveModal(true);
    }
    setHistoryMenu(null);
  };

  const handleSaveHistoryRequest = (saveData) => {
    if (!selectedHistoryItem || !onSaveRequest) return;
    
    // Reconstruct request object from history item
    const request = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: saveData.requestName || 'Untitled Request',
      method: selectedHistoryItem.method,
      url: selectedHistoryItem.url,
      path: selectedHistoryItem.url,
      queryParams: [], // History doesn't store these details
      headers: [],
      body: '',
      authType: 'none',
      authData: {},
      preRequestScript: '',
      tests: '',
      type: 'request'
    };
    
    onSaveRequest({
      ...saveData,
      request,
    });
    
    setShowHistorySaveModal(false);
    setSelectedHistoryItem(null);
    setSelectedHistoryIndex(null);
  };

  const refreshLibraryItems = async () => {
  if (!activeWorkspaceId) return;
  try {
    const libraryRes = await listLibraryItems();
    setLibraryItems(libraryRes || []);
  } catch (err) {
    console.error('Failed to refresh library:', err);
  }
};

const handleEditLibraryItem = async (item) => {
  const newName = prompt('Edit name', item.name);
  if (newName && newName.trim() !== item.name) {
    try {
      await updateLibraryItem(item.id, { name: newName.trim() });
      toast.success('Library item updated');
      await refreshLibraryItems();
    } catch (err) {
      toast.error('Failed to update library item');
    }
  }
};

const handleDeleteLibraryItem = async (item) => {
  if (confirm(`Delete "${item.name}"? This action cannot be undone.`)) {
    try {
      await deleteLibraryItem(item.id);
      toast.success('Library item deleted');
      await refreshLibraryItems();
    } catch (err) {
      toast.error('Failed to delete library item');
    }
  }
};

const HISTORY_TAB_ID = 'history-details-tab';

// Handle click on a history item — opens a read-only preview tab inside the
// History context (not Collections). Save/Send are hidden by ApiExecutionStudio
// when `readOnly: true`; a "Try" button appears instead which spawns an
// editable copy as a fresh non-readOnly tab (same UX as saved responses).
const handleHistoryItemClick = async (historyItem) => {
  if (!onFetchHistoryEntry) return;
  try {
    const response = await onFetchHistoryEntry(historyItem.historyId);
    const fullDetails = response.data;

    // Unique ID per click — each history item opens its own tab (no shared
    // HISTORY_TAB_ID reuse so users can compare multiple history entries).
    const tabId = `history-${historyItem.historyId || Date.now()}`;

    // Build a request object from the history details
    const newRequest = {
      id: tabId,
      name: `${fullDetails.method} ${fullDetails.url}`,
      type: 'request',                          // regular request type (read-only)
      readOnly: true,                           // hides Save/Send, shows Try
      method: fullDetails.method,
      url: fullDetails.url,
      queryParams: [],                          // will be parsed from URL automatically
      headers: fullDetails.request_headers || [],
      body: fullDetails.request_body || '',
      authType: 'none',
      authData: {},
      preRequestScript: '',
      tests: '',
      // Store the historical response inside the tab
      response: {
        status: fullDetails.status_code,
        statusText: fullDetails.status_text,
        time: fullDetails.response_time_ms,
        size: fullDetails.response_size_bytes,
        data: fullDetails.response_body,
        headers: fullDetails.response_headers,
        testResults: [],
        testScriptError: null,
          // === DEBUG FIELDS (for the Debug panel) ===
  isSuccess: fullDetails.is_success,
  failureStage: fullDetails.failure_stage,
  failureCategory: fullDetails.failure_category,
  failureReason: fullDetails.failure_reason,
  suggestion: fullDetails.suggestion,
  errorMessage: fullDetails.error_message,
  responseTimeMs: fullDetails.response_time_ms,
  traceSteps: fullDetails.trace_steps || [],
  request_size_bytes: fullDetails.request_size_bytes,
  request_headers_size_bytes: fullDetails.request_headers_size_bytes,
  request_body_size_bytes: fullDetails.request_body_size_bytes,
  response_headers_size_bytes: fullDetails.response_headers_size_bytes,
  network: fullDetails.network,
      }
    };

    // If the same history entry is already open, just focus it; else create a new tab.
    const existingIndex = requests.findIndex(r => r.id === tabId);
    if (existingIndex !== -1) {
      onTabSelect ? onTabSelect(existingIndex) : onUpdateTab(existingIndex, newRequest);
    } else {
      onNewTab(newRequest);
    }
  } catch (err) {
    toast.error('Failed to load request details');
  }
};

// Delete all items in a date group
const handleDeleteGroup = (groupItems) => {
  groupItems.forEach(item => {
    const historyId = item.historyId;
    const requestId = item.requestId;
    if (historyId && requestId) {
      onDeleteHistoryItem({ historyId, requestId });
    }
  });
};

// Tooltip content for request history
const getRequestTooltipContent = (item) => (
  <div className="space-y-1 max-w-xs">
    {/* URL with wrapping */}
    <div className="text-xs text-gray-300 break-words">
      {item.url || 'Unknown URL'}
    </div>
    {/* Time & Size */}
    <div className="text-xs text-gray-400">
      Time: {item.time}ms • Size: {item.size} B
    </div>
    {/* Date & Time */}
    <div className="text-xs text-gray-400">
      {new Date(item.date).toLocaleString()}
    </div>
  </div>
);

// Tooltip content for functional runs
const getFunctionalTooltipContent = (run) => {
  // Determine triggered by name
  let triggeredByName = 'Unknown';
  if (run.triggeredByUser?.fullName) {
    triggeredByName = run.triggeredByUser.fullName;
  } else if (run.triggeredByUser?.username) {
    triggeredByName = run.triggeredByUser.username;
  }

  return (
    <div className="space-y-1 max-w-xs">
      {/* Started date/time */}
      <div className="text-xs text-gray-400">
        {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
      </div>
      {/* Total requests & Duration */}
      <div className="text-xs text-gray-400">
        Total: {run.totalRequests} requests • Duration: {Math.round(run.totalTimeMs)}ms
      </div>
      {/* Triggered by */}
      <div className="text-xs text-gray-400">
        Triggered by: {triggeredByName}
      </div>
    </div>
  );
};

// Tooltip content for load test runs
const getLoadTooltipContent = (run) => {
  const result = run.result || {};
  const config = run.config || {};

  let triggeredByName = 'Unknown';
  if (run.triggeredByUser?.fullName) {
    triggeredByName = run.triggeredByUser.fullName;
  } else if (run.triggeredByUser?.username) {
    triggeredByName = run.triggeredByUser.username;
  }

  return (
    <div className="space-y-1 max-w-xs">
      <div className="text-xs text-gray-400">
        {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
      </div>
      <div className="text-xs text-gray-400">
        VUsers: {config.concurrency ?? run.concurrency ?? '-'} • Duration: {config.durationSeconds ?? run.durationSeconds ?? '-'}s
      </div>
      <div className="text-xs text-gray-400">
        Triggered by: {triggeredByName}
      </div>
    </div>
  );
};

function HistoryItemList({
  items,
  loading,
  onItemClick,
  getTooltipContent,
  groupByDate,
  onDeleteHistoryItem,
  onDeleteGroup,
  activeItemId,
}) {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });
  const [expandedGroups, setExpandedGroups] = useState({});

  const groupedItems = useMemo(() => {
    if (!groupByDate) return { 'All': items };
    const groups = {};
    items.forEach(item => {
      const date = new Date(item.startedAt || item.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      let groupKey;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [items, groupByDate]);

  // Automatically expand groups on first load and when new groups appear
  useEffect(() => {
    const newGroupKeys = Object.keys(groupedItems);
    setExpandedGroups(prev => {
      const newState = { ...prev };
      newGroupKeys.forEach(key => {
        if (!(key in newState)) newState[key] = true;
      });
      return newState;
    });
  }, [groupedItems]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const createTooltipHandler = (item) => ({
    onMouseEnter: (e) => {
      const content = getTooltipContent?.(item);
      if (content) {
        setTooltip({ show: true, x: e.clientX, y: e.clientY, content });
      }
    },
    onMouseLeave: () => setTooltip({ show: false, content: null }),
    onMouseMove: (e) => {
      if (tooltip.show) {
        setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
      }
    }
  });

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!items || items.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-xs">No history found</div>;
  }

  // Helper to get a reliable ID from the item
  const getItemId = (item) => item.historyId || item.id || item.runId || item.loadTestId;

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([groupLabel, groupItems]) => (
        <div key={groupLabel} className="group">
          {/* Group header */}
          <div className="sticky top-0 bg-dark-800/90 py-2 flex items-center justify-between border-b border-dark-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleGroup(groupLabel)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                {expandedGroups[groupLabel] ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {groupLabel}
              </span>
            </div>
            {onDeleteGroup && (
              <button
                onClick={() => onDeleteGroup(groupItems)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-600 rounded text-gray-400 hover:text-white transition-opacity"
                title="Delete all entries in this group"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Group items */}
          {expandedGroups[groupLabel] && (
            <div className="space-y-1 mt-1">
              {groupItems.map((item, idx) => {
                const itemId = getItemId(item);
                const isActive = activeItemId && itemId && activeItemId === itemId;
                return (
<div
  key={itemId || idx}
  className={clsx(
    'relative group px-2 py-1.5 rounded cursor-pointer transition-colors',
    isActive
      ? 'bg-primary/15 border-l-2 border-primary -ml-0.5 pl-[calc(0.5rem-2px)]'
      : 'hover:bg-dark-700/50'
  )}
  {...createTooltipHandler(item)}
>
  <div className="flex items-start justify-between">
    <div
      className="flex-1 min-w-0 pr-0"
      onClick={() => onItemClick(item)}
    >
<div className="text-xs text-gray-300 truncate">
  {item.url || item.collectionName || item.name || item.testName || 'Untitled'}
</div>
      <div className="flex justify-between text-[10px] mt-0.5">
        <span className={clsx(
          'font-mono text-[10px] font-bold',
          item.method === 'GET' && 'text-green-400',
          item.method === 'POST' && 'text-yellow-400',
          item.method === 'PUT' && 'text-blue-400',
          item.method === 'DELETE' && 'text-red-400',
          item.method === 'PATCH' && 'text-purple-400',
          item.method !== 'GET' && item.method !== 'POST' && item.method !== 'PUT' && item.method !== 'DELETE' && item.method !== 'PATCH' && 'text-orange-400'
        )}>
          {item.method}
        </span>
        {item.status !== undefined && (
          <span className={clsx(
            item.status >= 200 && item.status < 300
              ? 'text-green-400'
              : 'text-red-400'
          )}>
            {item.status}
          </span>
        )}
      </div>
    </div>

    {onDeleteHistoryItem && itemId && (
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteHistoryItem({ historyId: itemId, requestId: item.requestId });
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-600 rounded text-gray-400 hover:text-white transition-opacity"
          title="Delete entry"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    )}
  </div>
</div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {tooltip.show && tooltip.content && ReactDOM.createPortal(
        <div
          className="fixed z-50 pointer-events-none bg-dark-900 border border-dark-600 rounded-lg shadow-xl p-3 text-sm text-gray-200 max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.content}
        </div>,
        document.body
      )}
    </div>
  );
}


const HistoryTypeDropdown = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.id === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-dark-800 border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => {
                setIsOpen(false);
                onChange(opt.id);
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-dark-700',
                value === opt.id ? 'text-primary bg-primary/10' : 'text-gray-300'
              )}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                {value === opt.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="flex-1 truncate">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-probestack-bg text-white min-h-0">
      {/* project header bar: Search + Environment selector */}
      {/* <header className="shrink-0 border-b border-dark-700 bg-dark-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex-1"></div>

          <div className="flex-1 flex justify-end">
<div className="relative min-w-[180px]">
  <EnvironmentDropdown
    environments={environments}
    activeEnvironmentId={environments.find(e => e.isActive)?.id || 'no-env'}
    onSelect={(envId) => {
      onActivateEnvironment?.(envId);
    }}
  />
</div>
          </div>
        </div>
      </header> */}

      {/* Main Content Area - Forgeq layout (flex-1 min-h-0 so footer stays at bottom) */}
      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* ── Shared MCP state provider — only active for the MCP Test tab ── */}
        <ConditionalMCPProvider active={topMenuActive === 'mcp-test'} workspaceId={activeWorkspaceId}>
        {/* Left sidebar - Forgeq w-72, background-light/30 */}
{topMenuActive !== 'dashboard' && topMenuActive !== 'ai-assisted' && (
  <>
    {sidebarCollapsed ? (
      /* Collapsed rail — slim 40px strip so the user can clearly see the
         sidebar is minimised and click anywhere on the rail to expand.
         Replaces the old absolutely-positioned chevron which was hard
         to find, especially inside the MCP workspace layout. */
      <aside
        role="button"
        tabIndex={0}
        onClick={() => setSidebarCollapsed(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSidebarCollapsed(false); }}
        title="Expand sidebar"
        className="w-10 border-r border-dark-700 bg-dark-800/60 hover:bg-dark-700/60 transition-colors flex-shrink-0 flex flex-col items-center py-2 cursor-pointer group select-none"
      >
        <button
          onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(false); }}
          className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div
          className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 group-hover:text-gray-200 transition-colors"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {topMenuActive === 'testing'
            ? 'Testing'
            : topMenuItems.find(m => m.id === topMenuActive)?.label
              || (topMenuActive === 'settings-general' ? 'Settings' :
                  topMenuActive === 'settings-certificates' ? 'Certificates' : 'Workspace')}
        </div>
      </aside>
    ) : (
    <aside
      className={clsx(
        'border-r border-dark-700 flex flex-col bg-dark-800/30 flex-shrink-0 overflow-hidden',
      )}
      style={{ width: sidebarWidth }}
    >
      <div className="px-3 py-1 border-b border-dark-700/50 flex items-center justify-between shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
          {topMenuActive === 'testing'
            ? 'Testing'
            : topMenuItems.find(m => m.id === topMenuActive)?.label || (topMenuActive === 'settings-general' ? 'Settings - General' : topMenuActive === 'settings-certificates' ? 'Settings - Certificates' : 'Workspace')}
        </h2>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="p-1.5 rounded-lg transition-colors text-gray-500 hover:text-white hover:bg-dark-700/50"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col">
        {topMenuActive === 'collections' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <CollectionsPanel 
              onSelectEndpoint={onSelectEndpoint}
              existingTabRequests={requests}
              projects={projects}
              onAddProject={onAddProject}
              onCollectionsChange={onCollectionsChange} 
              onRunCollection={onRunCollection}
              onOpenWorkspaceDetails={onOpenWorkspaceDetails}
              currentUserId={currentUserId}
              activeWorkspaceId={activeWorkspaceId} 
              onOpenCollectionRun={onOpenCollectionRun}
              selectedRequestId={currentRequest?.id}
              collectionType="http"
              collections={collections}
              onOpenSavedResponse={handleOpenSavedResponse}
              onUpdateSavedResponseName={updateSavedResponseName}
              onDeleteSavedResponse={deleteSavedResponse} 
              activeSavedResponseId={currentRequest?.id?.startsWith('saved-') ? currentRequest.id : null}
            />
          </div>
        )}

        {topMenuActive === 'history' && (
          <div className="flex-1 flex flex-col p-4">
            {/* Sticky dropdown */}
            <div className="sticky top-0 z-10 mb-4 bg-dark-800/90 backdrop-blur-sm rounded-lg">
              <HistoryTypeDropdown
                value={selectedHistoryType}
                onChange={setSelectedHistoryType}
                options={[
                  { id: 'request', label: 'Request' },
                  { id: 'functional', label: 'Functional Test' },
                  { id: 'load', label: 'Load Test' },
                  { id: 'tracing', label: 'Tracing' },
                ]}
              />
            </div>
            {/* Scrollable history items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {selectedHistoryType === 'request' && (
                <HistoryItemList
                  items={history}
                  loading={false}
                  onItemClick={handleHistoryItemClick}
                  getTooltipContent={getRequestTooltipContent}
                  groupByDate
                  onDeleteHistoryItem={onDeleteHistoryItem}
                  onDeleteGroup={handleDeleteGroup}
                  activeItemId={activeHistoryItemId}
                />
              )}
              {selectedHistoryType === 'functional' && (
                <HistoryItemList
                  items={workspaceRuns}
                  loading={loadingRuns}
                  onItemClick={(run) => onViewRunResults(run, false)} 
                  getTooltipContent={getFunctionalTooltipContent}
                  groupByDate
                  activeItemId={activeHistoryItemId}
                />
              )}
              {selectedHistoryType === 'load' && (
                <HistoryItemList
                  items={loadTestRuns}
                  loading={loadingLoadRuns}
                  onItemClick={handleViewLoadTestResults}
                  getTooltipContent={getLoadTooltipContent}
                  groupByDate
                  activeItemId={activeHistoryItemId}
                />
              )}
              {selectedHistoryType === 'tracing' && (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Tracing history coming soon.
                </div>
              )}
            </div>
          </div>
        )}

        {topMenuActive === 'environments' && (
          <EnvironmentList
            environments={environments}
            selectedEnvironment={selectedEnvironment}
            onEnvironmentChange={onEnvironmentChange}
            variablesScope={variablesScope}
            setVariablesScope={setVariablesScope}
            variablesSavedMessage={variablesSavedMessage}
            showVariablesSaved={showVariablesSaved}
            onSaveEnvironmentVariables={onSaveEnvironmentVariables}
            onSaveGlobalVariables={onSaveGlobalVariables}
            onCreateEnvironment={onCreateEnvironment}
            onActivateEnvironment={onActivateEnvironment}
            onRenameEnvironment={onRenameEnvironment}
            onDeleteEnvironment={onDeleteEnvironment}
            environmentVariablesDirty={environmentVariablesDirty}
            globalEnvironment={globalEnvironment} 
            globalVariablesDirty={globalVariablesDirty}
            onGlobalVariablesChange={onGlobalVariablesChange} 
          />
        )}

        {topMenuActive === 'testing' && (
          <div className="flex-1 flex flex-col p-4">
            <div className="space-y-3.5">
              {testingSubTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTestingSubTab(tab.id)}
                    className={clsx(
                      'w-full flex items-center gap-2 text-left px-5 py-3 rounded-xl text-md font-medium transition-all border border-dark-600',
                      testingSubTab === tab.id
                        ? 'bg-primary/15 text-primary border border-primary/40 shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-dark-800 '
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {topMenuActive === 'mock-service' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Create Mock Service Button */}
            <div className="shrink-0 px-4 py-1.5 border-b border-dark-700/50">
              <button
                type="button"
                onClick={() => {
                  const newTab = {
                    id: `mock-wizard-${Date.now()}`,
                    type: 'mock-wizard',
                    name: 'New Mock Service',
                    step: 'config',
                    configData: null,
                    isEdit: false,
                  };
                  onNewTab(newTab);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-input-bg)] hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Mock Service
              </button>
            </div>

            {/* Search */}
            <div className="shrink-0 px-3 py-2 border-b border-dark-700/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search mock servers..."
                  value={mockSearch}
                  onChange={(e) => setMockSearch(e.target.value)}
                  className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            {/* Mock Servers Tree */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
              {mockServers && mockServers.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Available Mocks</h3>
                  {mockServers.map((mock) => {
                    const isExpanded = expandedMockServers[mock.id];
                    const filteredEndpoints = mock.endpoints?.filter(ep =>
                      ep.path.toLowerCase().includes(mockSearch.toLowerCase()) ||
                      ep.method.toLowerCase().includes(mockSearch.toLowerCase())
                    ) || [];
                    const hasVisibleEndpoints = filteredEndpoints.length > 0;

                    const isActiveMock = selectedMockServerId === mock.id;

                    return (
                      <div key={mock.id} className="select-none">
                        {/* Mock Server Row */}
                        <div
                          className={clsx(
                            'flex items-center gap-1 py-1.5 pr-2 rounded-md group cursor-pointer hover:bg-dark-700/50',
                            isActiveMock && 'bg-primary/10 border-l-2 border-primary'
                          )}
                          onClick={() => setExpandedMockServers(prev => ({ ...prev, [mock.id]: !prev[mock.id] }))}
                        >
                          {/* Expand/collapse chevron */}
                          <div
                            className="w-4 h-4 flex items-center justify-center shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMockServers(prev => ({ ...prev, [mock.id]: !prev[mock.id] }));
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                            )}
                          </div>

                          <Folder className="w-4 h-4 shrink-0 text-amber-500/90" />
                          {editingMockId === mock.id ? (
                            <input
                              type="text"
                              value={editingMockName}
                              onChange={(e) => setEditingMockName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onRenameMockServer(mock.id, editingMockName.trim());
                                  setEditingMockId(null);
                                  setEditingMockName('');
                                } else if (e.key === 'Escape') {
                                  setEditingMockId(null);
                                  setEditingMockName('');
                                }
                              }}
                              onBlur={() => {
                                if (editingMockName.trim() && editingMockName !== mock.name) {
                                  onRenameMockServer(mock.id, editingMockName.trim());
                                }
                                setEditingMockId(null);
                                setEditingMockName('');
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-full bg-dark-900 border border-primary/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            <span className="text-xs font-medium text-gray-200 flex-1 truncate">{mock.name}</span>
                          )}
                          <span className="text-[10px] text-gray-500">
                            {mock.endpoints?.length || 0} endpoint{(mock.endpoints?.length || 0) !== 1 ? 's' : ''}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMockMenu({ x: e.clientX, y: e.clientY, mock });
                            }}
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white hover:bg-dark-600"
                            title="Actions"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Endpoints List */}
                        {isExpanded && hasVisibleEndpoints && (
                          <div className="ml-6 space-y-0.5 mt-0.5">
                            {filteredEndpoints.map((ep) => (
                              <div
                                key={ep.id}
                                className={clsx(
                                  'flex items-center gap-1 py-1 px-2 rounded-sm group cursor-pointer',
                                  selectedMockEndpointId === ep.id
                                    ? 'bg-primary/10 border-primary'
                                    : 'hover:bg-dark-700/30'
                                )}
                                onClick={() => onSelectMockEndpoint(mock, ep)}
                              >
                                <span
                                  className={clsx(
                                    'text-[10px] font-bold w-9 text-right shrink-0',
                                    ep.method === 'GET' && 'text-green-400',
                                    ep.method === 'POST' && 'text-yellow-400',
                                    ep.method === 'PUT' && 'text-blue-400',
                                    ep.method === 'DELETE' && 'text-red-400',
                                    !['GET','POST','PUT','DELETE'].includes(ep.method) && 'text-purple-400'
                                  )}
                                >
                                  {ep.method}
                                </span>
                                <span className="text-xs text-gray-300 truncate flex-1">{ep.path}</span>
                                <span className="text-[10px] text-gray-500">{ep.responseStatus || 200}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No mock servers yet. Create one to get started.
                </div>
              )}
            </div>

            {/* Mock Menu (Delete, Rename, Toggle) */}
            {mockMenu && (
              <div
                className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-dark-700 bg-dark-800 shadow-xl mock-menu"
                style={{ left: mockMenu.x, top: mockMenu.y }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleRunMockServer(mockMenu.mock);
                    setMockMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMockId(mockMenu.mock.id);
                    setEditingMockName(mockMenu.mock.name);
                    setMockMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenMockEditorForExisting(mockMenu.mock);
                    setMockMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Edit / Add endpoints
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirm({ mockId: mockMenu.mock.id, x: mockMenu.x, y: mockMenu.y });
                    setMockMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
              <div
                ref={confirmRef}
                className="fixed z-50 min-w-[180px] p-3 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
                style={{ left: deleteConfirm.x, top: deleteConfirm.y }}
              >
                <p className="text-xs text-gray-300 mb-3">Delete this mock server?</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-dark-700 hover:bg-dark-600 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteMockServer(deleteConfirm.mockId);
                      setDeleteConfirm(null);
                    }}
                    className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {topMenuActive === 'mcp-test' && (
          <MCPSidebar />
        )}

        {topMenuActive === 'settings-general' && (
          <div className="flex-1 flex flex-col p-4">
            <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-6">
              <h3 className="text-sm font-semibold text-gray-200">Settings - General</h3>
              <p className="text-xs text-gray-500 mt-2">General Project settings are available here.</p>
            </div>
          </div>
        )}
        {topMenuActive === 'settings-certificates' && (
          <div className="flex-1 flex flex-col p-4">
            <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-6">
              <h3 className="text-sm font-semibold text-gray-200">Settings - Certificates</h3>
              <p className="text-xs text-gray-500 mt-2">Manage certificates for secure request execution.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
    )}
    {!sidebarCollapsed && (
      <div
        className="w-1 cursor-ew-resize bg-transparent hover:bg-primary/50 transition-colors flex-shrink-0"
        onMouseDown={startResize}
      />
    )}
  </>
)}
  {!sidebarCollapsed && (
  <div
    className="w-1 cursor-ew-resize bg-transparent hover:bg-primary/50 transition-colors flex-shrink-0"
    onMouseDown={startResize}
  />
)}
 

        {/* Center + Right: Request builder and Execution Insights side by side */}
        <section className="flex-1 flex min-h-0 overflow-hidden min-w-0">
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-auto">
            
{topMenuActive === 'environments' ? (
  <VariablesEditor
    pairs={variablesScope === 'environment-scope' ? environmentVariables : globalVariables}
    onChange={variablesScope === 'environment-scope' ? onEnvironmentVariablesChange : onGlobalVariablesChange}
    title={variablesScope === 'environment-scope' ? 'Environment Variables' : 'Global Variables'}
    // New props for environment management
    environments={environments}
    activeWorkspaceId={activeWorkspaceId}
    onCreateEnvironment={onCreateEnvironmentWithScope}
    onUpdateEnvironment={onRenameEnvironment}
    onActivateEnvironment={onActivateEnvironment}
    globalEnvironment={globalEnvironment}
    onGlobalVariablesChange={onGlobalVariablesChange}
    onSaveGlobalVariables={onSaveGlobalVariables}
    onSaveEnvironmentVariables={onSaveEnvironmentVariables}
  />
) : 

topMenuActive === 'testing' ? (
  <div className="flex-1 flex flex-col min-h-0 overflow-auto p-6">
    {/* Library */}
    {testingSubTab === 'library' && (
      <SpecLibraryPanel 
      projects={projects} 
      currentUserId={currentUserId} 
      activeWorkspaceId={activeWorkspaceId}
      />
    )}

    {/* Generate Testcases */}
    {testingSubTab === 'generate' && (
      <GenerateTestCase 
      projects={projects} 
      activeWorkspaceId={activeWorkspaceId} 
      currentUserId={currentUserId}
      />
    )}

    {/* Functional Testing */}
{testingSubTab === 'functional' && (
  <FunctionalTestPanel
    collections={collections}
    activeWorkspaceId={activeWorkspaceId}
    onRunCollectionWithOrder={onRunCollectionWithOrder}
    testFiles={testFiles}
    // New props:
    functionalRunPhase={functionalRunPhase}
    functionalRunResult={functionalRunResult}
    onStartFunctionalRun={(runId) => {
      setFunctionalRunId(runId);
      setFunctionalRunPhase('running');
      setFunctionalRunResult(null);
    }}
    onResetFunctionalRun={() => {
      setFunctionalRunPhase('config');
      setFunctionalRunId(null);
      setFunctionalRunResult(null);
      if (functionalPollRef.current) clearTimeout(functionalPollRef.current);
    }}
  />
)}

    {/* Load Testing */}
    {testingSubTab === 'load' && (
      <div className="space-y-4">
        {/* Collection source panel — always visible */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">Collection source</label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setLoadCollectionSource('workspace')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${loadCollectionSource === 'workspace' ? ' text-white border-primary' : 'bg-transparent text-gray-400 border-dark-600 hover:border-gray-500'}`}
            >
              From Existing Collection
            </button>
            <button
              type="button"
              onClick={() => setLoadCollectionSource('upload')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${loadCollectionSource === 'upload' ? ' text-white border-primary' : 'bg-transparent text-gray-400 border-dark-600 hover:border-gray-500'}`}
            >
              Upload file
            </button>
          </div>

          {loadCollectionSource === 'workspace' ? (
            <select
              value={selectedTestCollectionId || ''}
              onChange={(e) => setSelectedTestCollectionId(e.target.value)}
              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">Select a collection</option>
              {workspaceCollections.map(col => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700 text-sm cursor-pointer">
                {loadCollectionUploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Choose .json file
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLoadCollectionUploading(true);
                    setLoadCollectionPath('');
                    try {
                      const { data } = await uploadLoadCollection(file);
                      setLoadCollectionPath(data.collectionPath);
                      toast.success('Collection uploaded');
                    } catch {
                      toast.error('Upload failed');
                    } finally {
                      setLoadCollectionUploading(false);
                    }
                  }}
                />
              </label>
              {loadCollectionPath && (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <Check size={14} /> ready
                </span>
              )}
            </div>
          )}
        </div>

        {/* Form body — always visible */}
        <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Set up your performance test</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Load profile</label>
                  <select
                    value={loadProfile}
                    onChange={(e) => setLoadProfile(e.target.value)}
                    className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="ramp">Ramp up</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Virtual users</label>
                    <input
                      type="number"
                      min={1}
                      value={loadVirtualUsers}
                      onChange={(e) => setLoadVirtualUsers(Number(e.target.value) || 1)}
                      className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Test duration</label>
                      <input
                        type="number"
                        min={1}
                        value={loadDuration}
                        onChange={(e) => setLoadDuration(Number(e.target.value) || 1)}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <select
                      value={loadDurationUnit}
                      onChange={(e) => setLoadDurationUnit(e.target.value)}
                      className="bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="mins">mins</option>
                      <option value="secs">secs</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {loadVirtualUsers} virtual users run for {loadDuration} {loadDurationUnit}, each executing all requests sequentially.
                </p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data file</label>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        fileSelectCallbackRef.current = setLoadSelectedFile;
                        setFileSelectionContext({ context: 'load', selectedFile: loadSelectedFile });
                        setShowFileSelectionModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700 text-sm"
                    >
                      Select File
                    </button>
                    {loadSelectedFile && (
                      <span className="text-sm text-primary truncate max-w-[200px]">{loadSelectedFile.name}</span>
                    )}
                  </div>
                </div>
                <details className="group">
                  <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none">
                    Advanced options
                  </summary>
                  <div className="mt-3 pt-3 border-t border-dark-700 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ramp-up (secs)</label>
                      <input
                        type="number"
                        min={0}
                        value={loadRampUpSeconds}
                        onChange={(e) => setLoadRampUpSeconds(Number(e.target.value) || 0)}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Target RPS (0 = unlimited)</label>
                      <input
                        type="number"
                        min={0}
                        value={loadTargetRps}
                        onChange={(e) => setLoadTargetRps(Number(e.target.value) || 0)}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Think time (ms)</label>
                      <input
                        type="number"
                        min={0}
                        value={loadThinkTimeMs}
                        onChange={(e) => setLoadThinkTimeMs(Number(e.target.value) || 0)}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Request timeout (ms)</label>
                      <input
                        type="number"
                        min={0}
                        value={loadTimeoutMs}
                        onChange={(e) => setLoadTimeoutMs(Number(e.target.value) || 30000)}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </details>
                <details className="group">
                  <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none">
                    SLA thresholds (Pass test if...)
                  </summary>
                  <div className="mt-3 pt-3 border-t border-dark-700 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max error rate (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={loadMaxErrorRatePct}
                        onChange={(e) => setLoadMaxErrorRatePct(Number(e.target.value))}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max P99 latency (ms)</label>
                      <input
                        type="number"
                        min={0}
                        value={loadMaxP99LatencyMs}
                        onChange={(e) => setLoadMaxP99LatencyMs(Number(e.target.value))}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max avg latency (ms)</label>
                      <input
                        type="number"
                        min={0}
                        value={loadMaxAvgLatencyMs}
                        onChange={(e) => setLoadMaxAvgLatencyMs(Number(e.target.value))}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white mb-2">Run</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="loadRunMode"
                    checked={loadRunMode === 'app'}
                    onChange={() => setLoadRunMode('app')}
                    className="text-primary"
                  />
                  <span className="text-sm text-gray-300">In the app</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="loadRunMode"
                    checked={loadRunMode === 'cli'}
                    onChange={() => setLoadRunMode('cli')}
                    className="text-primary"
                  />
                  <span className="text-sm text-gray-300">via the CLI</span>
                </label>
              </div>
            </div>

<button
  type="button"
  onClick={runLoadTest}
  disabled={isPreparingLoadCollection}
  className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isPreparingLoadCollection ? (
    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
  ) : null}
  Run performance test
</button>
          </div>
      </div>
    )}

    {/* Tracing (NEW) - dummy API execution visualization */}
    {testingSubTab === 'tracing' && (
      <div className="flex-1 flex flex-col min-h-0 overflow-auto p-6">
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">API Execution Trace</h3>
          {/* Dummy data visualization */}
          <div className="space-y-4">
            <div className="bg-dark-900/40 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-400">Trace ID: trace_abc123</span>
                <span className="text-xs text-green-400">Completed</span>
              </div>
              <div className="space-y-3">
                {/* Dummy request/response steps */}
                {[
                  { method: 'GET', path: '/api/users', status: 200, duration: '45ms', timestamp: '10:23:45' },
                  { method: 'POST', path: '/api/auth', status: 201, duration: '87ms', timestamp: '10:23:46' },
                  { method: 'PUT', path: '/api/settings', status: 200, duration: '32ms', timestamp: '10:23:47' },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-dark-700 last:border-0">
                    <div className={clsx(
                      'w-12 text-xs font-bold',
                      step.method === 'GET' && 'text-green-400',
                      step.method === 'POST' && 'text-yellow-400',
                      step.method === 'PUT' && 'text-blue-400',
                    )}>
                      {step.method}
                    </div>
                    <div className="flex-1 text-sm text-gray-300">{step.path}</div>
                    <div className="text-xs text-gray-500">{step.duration}</div>
                    <div className={clsx(
                      'text-xs font-mono',
                      step.status >= 200 && step.status < 300 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {step.status}
                    </div>
                    <div className="text-xs text-gray-500">{step.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-dark-900/40 rounded-lg p-4 border border-dark-700">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Visualization</h4>
              <div className="h-32 flex items-end gap-2">
                {[65, 45, 80, 55, 70].map((height, i) => (
                  <div key={i} className="flex-1 bg-primary/30 rounded-t" style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>GET /users</span>
                <span>POST /auth</span>
                <span>PUT /settings</span>
                <span>GET /profile</span>
                <span>DELETE /session</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
{testingSubTab === 'MCP Test' && (
  <div className="flex-1 flex flex-col min-h-0 overflow-auto p-6">
    <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5 max-w-2xl">
      <h3 className="text-sm font-semibold text-white mb-4">MCP Server Configuration</h3>
      
      {/* Radio group for server type */}
      <div className="mb-5">
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
          Server Type
        </label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mcpServerType"
              value="local"
              checked={mcpServerType === 'local'}
              onChange={() => setMcpServerType('local')}
              className="text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-gray-300">Local</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mcpServerType"
              value="remote"
              checked={mcpServerType === 'remote'}
              onChange={() => setMcpServerType('remote')}
              className="text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-gray-300">Remote</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {mcpServerType === 'local' 
            ? 'Connect to a locally running MCP server' 
            : 'Connect to a remote MCP server endpoint'}
        </p>
      </div>

      {/* URL input (only for remote) */}
      {mcpServerType === 'remote' && (
        <div className="mb-5">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
            Server URL
          </label>
          <input
            type="text"
            value={mcpServerUrl}
            onChange={(e) => setMcpServerUrl(e.target.value)}
            placeholder="https://your-mcp-server.com"
            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Test connection button */}
      <button
        type="button"
        onClick={testMcpConnection}
        disabled={mcpTesting}
        className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {mcpTesting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing...
          </>
        ) : (
          'Test MCP Connection'
        )}
      </button>

      {/* Result message */}
      {mcpTestResult && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          mcpTestResult.success 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {mcpTestResult.message}
        </div>
      )}

      {/* Optional info note */}
      <div className="mt-5 pt-4 border-t border-dark-700 text-xs text-gray-500">
        <p>MCP (Model Context Protocol) allows AI assistants to interact with your APIs. Configure your MCP server endpoint here.</p>
      </div>
    </div>
  </div>
)}
  </div>
)

          
          : topMenuActive === 'ai-assisted' ? (
              <AIAssisted />
            ) 
            : topMenuActive === 'dashboard' ? (
  <DashboardSpecTable
    projects={projects}
    workspaceRuns={workspaceRuns}
    loadingRuns={loadingRuns}
    loadTestRuns={loadTestRuns}
    loadingLoadRuns={loadingLoadRuns}
    onViewRunResults={onViewRunResults}
    onViewLoadTestRun={handleViewLoadTestResults} 
    workspaceId={activeWorkspaceId}
  />
            ) :
 topMenuActive === 'mcp-test' ? (
              <MCPMainContent />
            ) :

 (
              <APIExecutionStudio
                requests={requests}
                activeRequestIndex={activeRequestIndex}
                onTabSelect={onTabSelect}
                onNewTab={onNewTab}
                onTryFromHistory={onTryFromHistory}
                onCloseTab={onCloseTab}
                onTabRename={onTabRename}
                method={method}
                url={url}
                queryParams={queryParams}
                headers={headers}
                body={body}
                authType={authType}
                authData={authData}
                preRequestScript={preRequestScript}
                tests={tests}
                response={response}
                isLoading={isLoading}
                error={error}
                executionHistory={history}
                onMethodChange={onMethodChange}
                onUrlChange={onUrlChange}
                onQueryParamsChange={onQueryParamsChange}
                onHeadersChange={onHeadersChange}
                onBodyChange={onBodyChange}
                onAuthTypeChange={onAuthTypeChange}
                onAuthDataChange={onAuthDataChange}
                onPreRequestScriptChange={onPreRequestScriptChange}
                onTestsChange={onTestsChange}
                onExecute={onExecute}
                onNewRequest={onNewRequest}
                onSaveRequest={onSaveRequest}
                collections={collections}
                onAddProject={onAddProject}
                substituteVariables={substituteVariables}
                collectionRunResults={collectionRunResults}
                isSavedRequest={isSavedRequest}
                onUpdateRequest={onUpdateRequest}
                pristineRequests={pristineRequests}
                hideNewButton={topMenuActive === 'mock-service'}
                hideSaveButton={topMenuActive === 'mock-service'}
                currentUserId={currentUserId}
                    onWorkspaceUpdate={onWorkspaceUpdate}
  onWorkspaceDelete={onWorkspaceDelete}
  onFetchHistoryEntry={onFetchHistoryEntry}
  activeWorkspaceId={activeWorkspaceId}
        onOpenCollectionRun={onOpenCollectionRun}
      onRunCollectionWithOrder={onRunCollectionWithOrder}
        sidebarCollapsed={sidebarCollapsed}
  testFiles={testFiles}
  onTestFilesChange={onTestFilesChange}
  projects={projects}
  onUploadTestFile={uploadTestFile}   
  onDeleteTestFile={deleteTestFile} 
  activeEnvVars={activeEnvVars}
  inactiveEnvVars={inactiveEnvVars}
  activeEnvValues={activeEnvValues}
  inactiveEnvInfo={inactiveEnvInfo}
  onShowChatbot={onShowChatbot}
    globalVars={globalVars}
    globalValues={globalValues}
    onLoadTestComplete={onLoadTestComplete}
     onBodyTypeChange={onBodyTypeChange}
     onCreateMockServer={onCreateMockServer}
     onUpdateMockServer={onUpdateMockServer}
     onFetchRequestHistory={fetchRequestHistory} 
     onFetchMockEndpointHistory={getMockEndpointHistory}
     onMcpTypeChange={onMcpTypeChange}
     onUpdateTab={onUpdateTab} 
     onSelectWorkspace={onSelectWorkspace} 
       onProtocolChange={(protocol) => {
    const updatedRequest = { ...currentRequest, protocol };
    onUpdateTab(activeRequestIndex, updatedRequest);
  }}
  onSaveResponse={handleSaveResponse}
  readOnly={currentRequest?.id?.startsWith('saved-')}
  isMcpContext={topMenuActive === 'mcp-test'}
  formData={currentRequest?.formData || []}
onFormDataChange={(newFormData) => {
  const updated = { ...currentRequest, formData: newFormData };
  onUpdateTab(activeRequestIndex, updated);
}}
advancedUrlEncoded={currentRequest?.advancedUrlEncoded || false}
onAdvancedUrlEncodedChange={(val) => {
  const updated = { ...currentRequest, advancedUrlEncoded: val };
  onUpdateTab(activeRequestIndex, updated);
}}
              />
            )}
          </div>

{/* Right side: Code snippet, Execution Insights, and Variables panel */}
<div className="flex flex-shrink-0 border-l border-dark-700 bg-dark-800/30 min-h-0">

{rightPanelOpen === 'projects' && (
    <RightPanelProjects
      projects={projects}
      activeWorkspaceId={activeWorkspaceId}
      onSelectWorkspace={onSelectWorkspace}
      onCreateWorkspace={onAddProject}  
      onOpenWorkspaceDetails={onOpenWorkspaceDetails}
      onCreateProjectTab={onCreateProjectTab}   
    />
)}

{rightPanelOpen === 'variables' && (
  <RightPanelVariables
    environments={environments}
    activeEnvId={environments.find(e => e.isActive)?.id || 'no-env'}
    globalEnv={globalEnvironment}
    onNavigateToVariables={() => {
      navigate('/project/variables');
      setRightPanelOpen(null);
    }}
    onCreateEnvironmentWithRedirect={() => {
      navigate('/project/variables?action=create');
      setRightPanelOpen(null);
    }}
    onEditEnvironment={(envId) => {
      onEnvironmentChange(envId);
      navigate('/project/variables');
      setRightPanelOpen(null);
    }}
    onActivateEnvironment={onActivateEnvironment}
    onShowGlobal={() => {
      setVariablesScope('global-scope');
      navigate('/project/variables');
      setRightPanelOpen(null);
    }}
  />
)}

{rightPanelOpen === 'code' && (
  topMenuActive === 'mcp-test'
    ? <McpCodeSnippetPanel />
    : (
      <CodeSnippetPanel
        method={method}
        url={url}
        queryParams={queryParams}
        headers={headers}
        body={body}
        authType={authType}
        authData={authData}
        onRequestUpdate={(parsed) => {
          if (parsed.method) onMethodChange(parsed.method);
          if (parsed.url) onUrlChange(parsed.url);
          if (parsed.queryParams) onQueryParamsChange(parsed.queryParams);
          if (parsed.headers) onHeadersChange(parsed.headers);
          if (parsed.body !== undefined) onBodyChange(parsed.body);
          if (parsed.authType) onAuthTypeChange(parsed.authType);
          if (parsed.authData) onAuthDataChange(parsed.authData);
        }}
      />
    )
)}
  {rightPanelOpen === 'insights' && (
    <IDEExecutionInsights
      response={response}
      isLoading={isLoading}
      error={error}
      executionHistory={history}
      forgeqStyle
    />
  )}

{rightPanelOpen === 'ai' && (
  <RightPanelAI
    method={method}
    url={url}
    headers={headers}
    body={body}
    authType={authType}
    authData={authData}
    preRequestScript={preRequestScript}
    tests={tests}
    response={response}
    error={error}
    isLoading={isLoading}
  />
)}

  <div className="flex flex-col border-l border-dark-700 bg-dark-800/60 w-12 flex-shrink-0">

      {/* --- NEW: Projects button --- */}
  <button
    type="button"
    onClick={() => setRightPanelOpen((prev) => (prev === 'projects' ? null : 'projects'))}
    className={clsx(
      'flex flex-col items-center justify-center gap-0.5 py-2 px-2 border-b border-dark-700 transition-colors cursor-pointer',
      rightPanelOpen === 'projects'
        ? 'bg-primary/15 text-primary'
        : 'text-gray-500 hover:text-white hover:bg-dark-700/50'
    )}
    title="Projects"
  >
    <Building2 className="w-5 h-5" />
    <span className="text-[9px] font-medium">Projects</span>
  </button>

    {/* Variables button - first */}
    <button
      type="button"
      onClick={() => setRightPanelOpen((prev) => (prev === 'variables' ? null : 'variables'))}
      className={clsx(
        'flex flex-col items-center justify-center gap-0.5 py-2 px-2 border-b border-dark-700 transition-colors cursor-pointer',
        rightPanelOpen === 'variables'
          ? 'bg-primary/15 text-primary'
          : 'text-gray-500 hover:text-white hover:bg-dark-700/50'
      )}
      title="Environment Variables"
    >
      <Layers className="w-5 h-5" />
      <span className="text-[9px] font-medium">Variables</span>
    </button>

    {/* Code button */}
    <button
      type="button"
      onClick={() => setRightPanelOpen((prev) => (prev === 'code' ? null : 'code'))}
      className={clsx(
        'flex flex-col items-center justify-center gap-0.5 py-2 px-2 border-b border-dark-700 transition-colors cursor-pointer',
        rightPanelOpen === 'code'
          ? 'bg-primary/15 text-primary'
          : 'text-gray-500 hover:text-white hover:bg-dark-700/50'
      )}
      title="Code snippet (cURL)"
    >
      <span className="font-mono text-sm font-semibold leading-none">&lt;/&gt;</span>
      <span className="text-[9px] font-medium">Code</span>
    </button>

    {/* Insights button */}
    <button
      type="button"
      onClick={() => setRightPanelOpen((prev) => (prev === 'insights' ? null : 'insights'))}
      className={clsx(
        'flex flex-col items-center justify-center gap-0.5 py-2 px-2 border-b border-dark-700 transition-colors cursor-pointer',
        rightPanelOpen === 'insights'
          ? 'bg-primary/15 text-primary'
          : 'text-gray-500 hover:text-white hover:bg-dark-700/50'
      )}
      title="Execution Insights"
    >
      <BarChart3 className="w-5 h-5" />
      <span className="text-[9px] font-medium">Insights</span>
    </button>

  {/* --- NEW: AI button --- */}
  <button
    type="button"
    onClick={() => setRightPanelOpen((prev) => (prev === 'ai' ? null : 'ai'))}
    className={clsx(
      'flex flex-col items-center justify-center gap-0.5 py-2 px-2 border-b border-dark-700 transition-colors cursor-pointer',
      rightPanelOpen === 'ai'
        ? 'bg-primary/15 text-primary'
        : 'text-gray-500 hover:text-white hover:bg-dark-700/50'
    )}
    title="AI Assistant"
  >
    <Bot className="w-5 h-5" />
    <span className="text-[9px] font-medium">AI</span>
  </button>


  </div>
</div>
        </section>
          </ConditionalMCPProvider>
      </main>

      {/* Footer - same as Forgeq / Migration page */}
      <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-6 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <span className="font-semibold gradient-text font-heading">ProbeStack</span>
              <span className="text-gray-400">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Terms of Service
              </a>
              <a href="/security" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* File Selection Modal for Functional Testing */}
{showFileSelectionModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    onClick={closeFileSelectionModal}
  >
    <div
      className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[80vh]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
        <h3 className="text-base font-semibold text-white">Select Test Data</h3>
        <button
          type="button"
          onClick={closeFileSelectionModal}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 overflow-y-auto max-h-[60vh]">
        {loadingSpecs || loadingLibrary ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (testSpecs.length === 0 && libraryItems.length === 0 && testFiles.length === 0) ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-dark-800 rounded-xl flex items-center justify-center mx-auto mb-3 border border-dark-700">
              <Upload className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">No test data available</p>
            <p className="text-xs text-gray-500 mt-1">Create specs in the Generate Testcases section or upload a file</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Test Case Specs */}
            {testSpecs.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Test Case Specs
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {testSpecs.map((spec) => {
                    const specFile = {
                      id: spec.id,
                      name: spec.name,
                      type: '.json',
                      size: new Blob([spec.content]).size,
                      uploadedAt: spec.updatedAt,
                      isSpec: true,
                      content: spec.content,
                    };
                    const isSelected = fileSelectionContext.selectedFile?.id === spec.id;
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => {
                          if (fileSelectCallbackRef.current) {
                            fileSelectCallbackRef.current(isSelected ? null : specFile);
                          }
                          closeFileSelectionModal();
                        }}
                        className={clsx(
                          'flex flex-col p-4 rounded-lg border transition-all text-left',
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-dark-700 hover:bg-dark-800 hover:border-primary/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <FileCode className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{spec.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Spec • {new Date(spec.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
                            <span className="text-xs text-primary font-medium">Selected</span>
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spec Library */}
            {libraryItems.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Spec Library
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {libraryItems.map((item) => {
                    const specFile = {
                      id: item.id,
                      name: item.name,
                      type: '.json',
                      size: new Blob([item.content]).size,
                      uploadedAt: new Date().toISOString(),
                      isLibrary: true,
                      content: item.content,
                    };
                    const isSelected = fileSelectionContext.selectedFile?.id === item.id;
                    return (
                      <div key={item.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            if (fileSelectCallbackRef.current) {
                              fileSelectCallbackRef.current(isSelected ? null : specFile);
                            }
                            closeFileSelectionModal();
                          }}
                          className={clsx(
                            'w-full flex flex-col p-4 rounded-lg border transition-all text-left',
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-dark-700 hover:bg-dark-800 hover:border-primary/30'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                              <FileCode className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
                              <span className="text-xs text-primary font-medium">Selected</span>
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>


                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uploaded Files */}
            {testFiles.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Uploaded Files
                </h4>
                <div className="space-y-2">
                  {testFiles.map((file) => {
                    const isSelected = fileSelectionContext.selectedFile?.id === file.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          if (fileSelectCallbackRef.current) {
                            fileSelectCallbackRef.current(isSelected ? null : file);
                          }
                          closeFileSelectionModal();
                        }}
                        className={clsx(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-dark-700 hover:bg-dark-800'
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {file.type === '.json' ? (
                            <span className="text-xs font-bold text-primary">JSON</span>
                          ) : (
                            <span className="text-xs font-bold text-primary">CSV</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-dark-700">
        <button
          type="button"
          onClick={closeFileSelectionModal}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {/* Mock Creation Modal */}
      {showMockModal && selectedMockRequest && (
        <MockCreationModal
          request={selectedMockRequest}
          onClose={() => {
            setShowMockModal(false);
            setSelectedMockRequest(null);
          }}
          onCreateMock={() => {
            onCreateMock(selectedMockRequest);
          }}
        />
      )}


    </div>
  );
}

// Mock Creation Modal Component with success animation
function MockCreationModal({ request, onClose, onCreateMock }) {
  const [status, setStatus] = useState('creating'); // 'creating' | 'success'

  useEffect(() => {
    // Simulate creation process
    const timer = setTimeout(() => {
      setStatus('success');
      onCreateMock();
      // Auto close after showing success
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onCreateMock, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">
            {status === 'creating' ? 'Creating Mock Service...' : 'Mock Service Created!'}
          </h3>
          {status === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {status === 'creating' ? (
            <div className="flex flex-col items-center py-8">
              {/* Animated loader */}
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-dark-700 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-gray-400">Setting up mock service...</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{request.name}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              {/* Success checkmark */}
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-green-400 font-medium mb-1">Mock service created successfully!</p>
              <p className="text-xs text-gray-400 mt-1">All endpoints are now mocked</p>
              <p className="text-xs text-gray-500 mt-3">Closing automatically...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



// Mock Service Collection Tree Component - Read-only view of collections with Mock API action
function MockServiceCollectionTree({ collections, mockServers, searchQuery, onSelectRequest}) {
  // Auto-expand all collections that have children on initial load
  const getInitialExpandedState = () => {
    const initial = {};
    const markExpanded = (items) => {
      items.forEach(item => {
        if (item.items && item.items.length > 0) {
          initial[item.id] = true;
          markExpanded(item.items);
        }
      });
    };
    markExpanded(collections);
    return initial;
  };
  
  const [expanded, setExpanded] = useState(getInitialExpandedState);
  const [contextMenu, setContextMenu] = useState(null);

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  const handleCloseMenu = () => {
    setContextMenu(null);
  };

const handleMockAction = (actionId) => {
  if (!mockMenu) return;
  const { mockId, mockName } = mockMenu;
  if (actionId === 'rename') {
    setEditingMockId(mockId);
    setEditingMockName(mockName);
  } else if (actionId === 'delete') {
    onDeleteMockServer(mockId);
  } else if (actionId === 'toggle') {
    onToggleVisibility(mockId);
  }
  setMockMenu(null);
};

  // Filter tree based on search query
  const filterTree = (items, q) => {
    if (!q.trim()) return items;
    const lower = q.toLowerCase();
    return items
      .map((item) => {
        if (item.type === 'request') {
          const match = item.name.toLowerCase().includes(lower) || (item.method && item.method.toLowerCase().includes(lower));
          return match ? item : null;
        }
        const filteredChildren = item.items ? filterTree(item.items, q) : [];
        const nameMatch = item.name.toLowerCase().includes(lower);
        if (nameMatch || filteredChildren.length > 0) {
          return { ...item, items: filteredChildren.length ? filteredChildren : item.items };
        }
        return null;
      })
      .filter(Boolean);
  };

  // Group collections by project
  const groupByProject = (cols) => {
    const groups = {};
    cols.forEach((col) => {
      const projectId = col.project || 'default';
      const projectName = col.projectName || 'Default Project';
      if (!groups[projectId]) {
        groups[projectId] = { id: projectId, name: projectName, collections: [] };
      }
      groups[projectId].collections.push(col);
    });
    return Object.values(groups);
  };

  const filteredCollections = filterTree(collections, searchQuery);
  const projectGroups = groupByProject(filteredCollections);

  // Sort items: folders first, then requests
  const sortItems = (items) => {
    if (!items || !Array.isArray(items)) return items;
    return [...items].sort((a, b) => {
      const aIsFolder = a.type === 'folder';
      const bIsFolder = b.type === 'folder';
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return 0;
    });
  };

  

  // Check if a request is already mocked
  const isRequestMocked = (requestId) => {
    return mockServers.some(mock => 
      mock.endpoints?.some(ep => ep.originalRequestId === requestId)
    );
  };

  const getMockForRequest = (requestId) => {
    return mockServers.find(mock => 
      mock.endpoints?.some(ep => ep.originalRequestId === requestId)
    );
  };

  return (
    <div className="space-y-4">
      {projectGroups.map((project) => (
        <div key={project.id} className="space-y-2">
          {/* Project Header */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Folder className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {project.name}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {project.collections.length}
            </span>
          </div>

          {/* Collections under this project */}
          <div className="ml-2 space-y-1">
            {project.collections.map((collection) => (
              <MockCollectionNode
                key={collection.id}
                item={collection}
                expanded={expanded}
                onToggle={toggle}
                level={0}
                sortItems={sortItems}
                isRequestMocked={isRequestMocked}
                getMockForRequest={getMockForRequest}
                onSelectRequest={onSelectRequest}
                onSelectMockRequest={onSelectRequest}
                onOpenMenu={handleOpenMenu}
              />
            ))}
          </div>
        </div>
      ))}

      {projectGroups.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-500">No collections match your search</p>
        </div>
      )}

      {/* Context Menu for Mock API action */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] py-1 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={handleMockAction}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Mock API
          </button>
        </div>
      )}
    </div>
  );

  
}

// Individual node component for the mock service collection tree
function MockCollectionNode({ item, expanded, onToggle, level, sortItems, isRequestMocked, getMockForRequest, onSelectRequest, onSelectMockRequest, onOpenMenu }) {
  const isExpanded = expanded[item.id];
  const hasChildren = item.items && item.items.length > 0;
  const isRequest = item.type === 'request';
  const isFolder = item.type === 'folder';
  const isCollection = level === 0;

  const handleRowClick = () => {
    if (isRequest) {
      // Requests populate the testing area when clicked (both mocked and non-mocked)
      const mock = getMockForRequest(item.id);
      if (mock) {
        // If mocked, use the mock URL
        onSelectRequest(item); 
      } else {
        // If not mocked, populate with the original request for testing
        onSelectMockRequest({
          ...item,
          mockUrl: item.path || '',
          originalRequestId: item.id
        });
      }
    } else if (!isRequest) {
      onToggle(item.id);
    }
  };

  // Indentation: 12px per nesting level
  const indentPx = level * 12;

  // Get mock status for requests
  const mocked = isRequest ? isRequestMocked(item.id) : false;
  const existingMock = isRequest ? getMockForRequest(item.id) : null;

  return (
    <div className="select-none">
      <div
        style={{ paddingLeft: indentPx }}
        onClick={handleRowClick}
        className={clsx(
          'flex items-center gap-1 py-1.5 pr-2 rounded-md group cursor-pointer',
          isRequest 
            ? 'hover:bg-dark-700/30' 
            : 'hover:bg-dark-700/50',
          mocked && 'bg-primary/5'
        )}
      >
        {/* Expand/Chevron */}
        <div 
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (!isRequest && hasChildren) {
              onToggle(item.id);
            }
          }}
        >
          {!isRequest && hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500 cursor-pointer hover:text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500 cursor-pointer hover:text-gray-400" />
            )
          ) : (
            <div className="w-3 h-3" />
          )}
        </div>

        {/* Icon or Method Badge */}
        {isRequest ? (
          <span
            className={clsx(
              'text-[9px] font-bold w-8 text-right shrink-0',
              item.method === 'GET' && 'text-green-400',
              item.method === 'POST' && 'text-yellow-400',
              item.method === 'PUT' && 'text-blue-400',
              item.method === 'DELETE' && 'text-red-400',
              !['GET', 'POST', 'PUT', 'DELETE'].includes(item.method) && 'text-purple-400'
            )}
          >
            {item.method}
          </span>
        ) : (
          <Folder
            className={clsx(
              'w-3.5 h-3.5 shrink-0',
              isCollection ? 'text-amber-500/90' : 'text-gray-500'
            )}
          />
        )}

        {/* Name */}
        <span 
          className={clsx(
            'text-xs truncate flex-1',
            isRequest ? 'text-gray-300' : 'text-gray-200 font-medium'
          )}
        >
          {item.name}
        </span>

        {/* Action Button - Only for collections and folders */}
        {(isCollection || isFolder) && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu(e, item);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition-opacity"
              title="Mock API"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div>
          {sortItems(item.items).map((child) => (
            <MockCollectionNode
              key={child.id}
              item={child}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
              sortItems={sortItems}
              isRequestMocked={isRequestMocked}
              getMockForRequest={getMockForRequest}
              onSelectRequest={onSelectRequest}
              onSelectMockRequest={onSelectMockRequest}
              onOpenMenu={onOpenMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}


