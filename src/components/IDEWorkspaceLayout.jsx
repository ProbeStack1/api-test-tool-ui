import React, { useEffect, useState,useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {  History, LayoutGrid, Layers, ChevronRight, Search, Plus, ChevronDown, BarChart3, Save, MoreVertical, MoreHorizontal, Trash2, FileSearch, Play, Upload, FolderOpen, X, Folder, Loader2, Building2, FileCode, Check, Edit3, Bot, BookOpen, Activity } from 'lucide-react';
import APIExecutionStudio from './APIExecutionStudio';
import IDEExecutionInsights from './IDEExecutionInsights';
import CodeSnippetPanel from './CodeSnippetPanel';
import CollectionsPanel from './CollectionsPanel';
import SaveRequestModal from './modals/SaveRequestModal';
import VariablesEditor from './VariablesEditor';
import DashboardSpecTable from './DashboardSpecTable';
import GenerateTestCase from './GenerateTestCase';
import AIAssisted from '../pages/AIAssisted';
import clsx from 'clsx';
import EnvironmentList from './sidebar/EnvironmentList';
import EnvironmentDropdown from './sidebar/EnvironmentDropdown';
import CreateMockServiceModal from '../components/modals/CreateMockServiceModal';
import { runMockServer } from '../services/mockServerService';
import { listCollectionRuns } from '../services/collectionService';
import {listTestFiles,uploadTestFile,deleteTestFile,} from '../services/testFileService';
import { listTestSpecs } from '../services/testSpecificationService';
import { listLibraryItems ,updateLibraryItem, deleteLibraryItem } from '../services/specLibraryService';
import SpecLibraryPanel from './sidebar/SpecLibraryPanel';
import CollectionRunsTable from './CollectionRunsTable';
import LoadTestRunningView from './detailsTab/LoadTestRunningView';
import LoadTestResultsView from './detailsTab/LoadTestResultsView';
import {
  listWorkspaceLoadTests, 
} from '../services/collectionService';
import { toast } from 'sonner';
import LoadTestRunsTable from './LoadTestRunsTable';
import RequestHistoryList from './RequestHistoryList';

export default function IDEWorkspaceLayout({
  history,
  requests,
  collections,
  projects,
  activeRequestIndex,
  onTabSelect,
  onNewTab,
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

const handleViewLoadTestResults = (run) => {
  // console.log('🔍 handleViewLoadTestResults called with run:', run);

  // Get the ID – fallback to run.id if run.loadTestId is missing
  const loadTestId = run.loadTestId || run.id;
  if (!loadTestId) {
    // console.error('No load test ID found in run:', run);
    // toast.error('Cannot open results: missing load test ID');
    return;
  }

  // Check if a tab with this loadTestId already exists
  const existingTabIndex = requests.findIndex(
    tab => tab.type === 'load-test-results' && tab.loadTestId === loadTestId
  );
  if (existingTabIndex !== -1) {
    // Already exists – switch to it
    onTabSelect(existingTabIndex);
    // Navigate to collections to show the tab
    navigate('/workspace/collections');
    return;
  }

  // Create a new tab
  const resultsTab = {
    id: `load-test-results-${loadTestId}-${Date.now()}`,
    type: 'load-test-results',
    name: `Load Test Results: ${run.collectionName || 'Load Test'}`,
    loadTestId: loadTestId,
  };
  onNewTab(resultsTab);
  // After adding the tab, navigate to collections to show the APIExecutionStudio
  navigate('/workspace/collections');
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
    if (pathname.includes('/workspace/history')) return 'history';
    if (pathname.includes('/workspace/variables')) return 'environments';
    if (pathname.includes('/workspace/testing')) return 'testing';
    if (pathname.includes('/workspace/mock-service')) return 'mock-service';
    if (pathname.includes('/workspace/ai-assisted')) return 'ai-assisted';
    if (pathname.includes('/workspace/dashboard')) return 'dashboard';
    if (pathname.includes('/workspace/settings/general')) return 'settings-general';
    if (pathname.includes('/workspace/settings/certificates')) return 'settings-certificates';
    return 'collections';
  };
  const getPathFromTopMenu = (menuId) => {
    if (menuId === 'history') return '/workspace/history';
    if (menuId === 'environments') return '/workspace/variables';
    if (menuId === 'testing') return '/workspace/testing';
    if (menuId === 'mock-service') return '/workspace/mock-service';
    if (menuId === 'ai-assisted') return '/workspace/ai-assisted';
    if (menuId === 'dashboard') return '/workspace/dashboard';
    return '/workspace/collections';
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
      toast.error('Failed to load test files');
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
    if (location.pathname === '/workspace' || location.pathname === '/workspace/') {
      navigate('/workspace/collections', { replace: true });
      return;
    }
    setTopMenuActive(getTopMenuFromPath(location.pathname));
  }, [location.pathname, navigate]);

  const topMenuItems = [
    { id: 'history', label: 'History', icon: History },
    { id: 'collections', label: 'Collections', icon: LayoutGrid },
    { id: 'environments', label: 'Variables', icon: Layers },
    { id: 'testing', label: 'Testing', icon: BarChart3 },
    { id: 'mock-service', label: 'Mock Service', icon: Layers },
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

  // Load Testing states
  const [loadProfile, setLoadProfile] = useState('fixed');
  const [loadVirtualUsers, setLoadVirtualUsers] = useState(20);
  const [loadDuration, setLoadDuration] = useState(10);
  const [loadDurationUnit, setLoadDurationUnit] = useState('mins');
  const [loadRunMode, setLoadRunMode] = useState('app');
  const [loadTestResults, setLoadTestResults] = useState(null);
  const [isRunningLoadTest, setIsRunningLoadTest] = useState(false);
  const [loadTestCountdown, setLoadTestCountdown] = useState(0);

  // Mock Service states
  const [showMockModal, setShowMockModal] = useState(false);
  const [selectedMockRequest, setSelectedMockRequest] = useState(null);
  const [mockSearch, setMockSearch] = useState('');
  const [mockMenu, setMockMenu] = useState(null);
  const [showCreateMockServiceModal, setShowCreateMockServiceModal] = useState(false);
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

// Handle click on a history item
const handleHistoryItemClick = async (historyItem) => {
  if (!onFetchHistoryEntry) return;
  try {
    const response = await onFetchHistoryEntry(historyItem.historyId);
    const fullDetails = response.data;

    // Parse URL to separate base URL and query params
    let baseUrl = fullDetails.url || '';
    let queryParams = [];
    const queryIndex = baseUrl.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = baseUrl.slice(queryIndex + 1);
      baseUrl = baseUrl.slice(0, queryIndex);
      // Parse query string into key-value pairs
      const pairs = queryString.split('&');
      queryParams = pairs.map(pair => {
        const [key, value] = pair.split('=');
        return {
          key: key ? decodeURIComponent(key) : '',
          value: value ? decodeURIComponent(value) : '',
          enabled: true
        };
      });
    }

    // Ensure request body is a string
    let requestBody = fullDetails.request_body;
    if (typeof requestBody === 'object' && requestBody !== null) {
      requestBody = JSON.stringify(requestBody, null, 2);
    }

    // Ensure headers are in the correct format (array of {key, value, enabled})
    const headers = (fullDetails.request_headers || []).map(h => ({
      key: h.key,
      value: h.value,
      enabled: true
    }));

    const newRequest = {
      id: HISTORY_TAB_ID, // Fixed ID to reuse the same tab
      name: `${fullDetails.method} ${fullDetails.url}`,
      type: 'request',
      method: fullDetails.method,
      url: baseUrl,                       // Base URL without query string
      queryParams,                        // Extracted query parameters
      headers,
      body: requestBody || '',
      authType: 'none',
      authData: {},
      preRequestScript: '',
      tests: '',
      response: {
        status: fullDetails.status_code,
        statusText: fullDetails.status_text,
        time: fullDetails.response_time_ms,
        size: fullDetails.response_size_bytes,
        data: fullDetails.response_body,
        headers: fullDetails.response_headers,
        testResults: [],
        testScriptError: null,
      }
    };

    // Check if the history tab already exists
    const existingIndex = requests.findIndex(r => r.id === HISTORY_TAB_ID);
    if (existingIndex !== -1) {
      onUpdateTab(existingIndex, newRequest);   // update existing tab
    } else {
      onNewTab(newRequest);                     // create new tab (first time)
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
  <div className="space-y-1">
    <div className="font-mono text-xs">{item.method} {item.url}</div>
    <div className="text-xs text-gray-400">Status: {item.status || 'N/A'}</div>
    <div className="text-xs text-gray-400">Time: {item.time}ms</div>
    <div className="text-xs text-gray-400">Size: {item.size} B</div>
    <div className="text-xs text-gray-400">Date: {new Date(item.date).toLocaleString()}</div>
  </div>
);

// Tooltip content for functional runs
const getFunctionalTooltipContent = (run) => (
  <div className="space-y-1">
    <div className="font-medium text-xs">{run.collectionName}</div>
    <div className="text-xs text-gray-400">Started: {new Date(run.startedAt).toLocaleString()}</div>
    <div className="text-xs">Passed: {run.passedRequests} / Failed: {run.failedRequests}</div>
    <div className="text-xs text-gray-400">Total requests: {run.totalRequests}</div>
    <div className="text-xs text-gray-400">Duration: {Math.round(run.totalTimeMs)}ms</div>
    <div className="text-xs text-gray-400">Source: {run.source || 'manual'}</div>
  </div>
);

// Tooltip content for load test runs
const getLoadTooltipContent = (run) => {
  const result = run.result || {};
  const config = run.config || {};
  return (
    <div className="space-y-1">
      <div className="font-medium text-xs">Load Test</div>
      <div className="text-xs text-gray-400">Started: {new Date(run.startedAt).toLocaleString()}</div>
      <div className="text-xs">VUsers: {config.concurrency || '-'}</div>
      <div className="text-xs">Duration: {config.durationSeconds || '-'}s</div>
      <div className="text-xs">Total requests: {result.totalRequests || 0}</div>
      <div className="text-xs">Passed: {result.successfulRequests || 0} / Failed: {result.failedRequests || 0}</div>
      <div className="text-xs">Avg Latency: {result.avgLatencyMs ? Math.round(result.avgLatencyMs) + 'ms' : '-'}</div>
      <div className="text-xs">Error rate: {result.totalRequests ? ((result.failedRequests / result.totalRequests) * 100).toFixed(1) + '%' : '-'}</div>
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
                return (
<div
  key={itemId || idx}
  className="relative group px-2 py-1.5 hover:bg-dark-700/50 rounded cursor-pointer transition-colors"
  {...createTooltipHandler(item)}
>
  <div className="flex items-start justify-between">
    <div
      className="flex-1 min-w-0 pr-0"
      onClick={() => onItemClick(item)}
    >
      <div className="text-xs text-gray-300 truncate">
        {item.url || item.collectionName || item.name || 'Untitled'}
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
      <header className="shrink-0 border-b border-dark-700 bg-dark-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex-1"></div>
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search project..."
              value={workspaceSearch}
              onChange={(e) => setWorkspaceSearch(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow"
            />
          </div>
          <div className="flex-1 flex justify-end">
{/* Environment selector */}
<div className="relative min-w-[180px]">
  <EnvironmentDropdown
    environments={environments}
    activeEnvironmentId={environments.find(e => e.isActive)?.id || 'no-env'}
    onSelect={(envId) => {
      // Activate the selected environment (which also sets it as the editing target)
      onActivateEnvironment?.(envId);
    }}
  />
</div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Forgeq layout (flex-1 min-h-0 so footer stays at bottom) */}
      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Left sidebar - Forgeq w-72, background-light/30 */}
        <aside className={clsx(
          'border-r border-dark-700 flex flex-col bg-dark-800/30 flex-shrink-0 transition-all overflow-hidden',
          sidebarCollapsed ? 'w-0' : 'w-72'
        )}>
          <div className="px-3 py-2 border-b border-dark-700/50 flex items-center justify-between shrink-0">
<h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
  {topMenuActive === 'testing'
    ? 'Testing'
    : topMenuItems.find(m => m.id === topMenuActive)?.label || (topMenuActive === 'settings-general' ? 'Settings - General' : topMenuActive === 'settings-certificates' ? 'Settings - Certificates' : 'Workspace')}
</h2>
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded-lg transition-colors text-gray-500 hover:text-white hover:bg-dark-700/50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col">
            {topMenuActive === 'collections' && (
              <div className="flex-1 min-h-0 flex flex-col">
<CollectionsPanel 
  onSelectEndpoint={onSelectEndpoint}
  existingTabRequests={requests}
  collections={collections}
  projects={projects}
  onAddProject={onAddProject}
  onCollectionsChange={onCollectionsChange}
  onRunCollection={onRunCollection}
  onOpenWorkspaceDetails={onOpenWorkspaceDetails}
  currentUserId={currentUserId}
  activeWorkspaceId={activeWorkspaceId} 
  onOpenCollectionRun={onOpenCollectionRun}
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
        />
      )}
      {selectedHistoryType === 'functional' && (
        <HistoryItemList
          items={workspaceRuns}
          loading={loadingRuns}
          onItemClick={(run) => onViewRunResults(run, false)} 
          getTooltipContent={getFunctionalTooltipContent}
          groupByDate
        />
      )}
      {selectedHistoryType === 'load' && (
        <HistoryItemList
          items={loadTestRuns}
          loading={loadingLoadRuns}
          onItemClick={handleViewLoadTestResults}
          getTooltipContent={getLoadTooltipContent}
          groupByDate
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
    <div className="shrink-0 px-4 py-3 border-b border-dark-700/50">
<button
  type="button"
  onClick={() => setShowCreateMockServiceModal(true)}
  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-dark-700/80 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 transition-colors"
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
          className="w-full bg-dark-900/60 border border-dark-700 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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

            return (
              <div key={mock.id} className="select-none">
                {/* Mock Server Row */}
<div
  className="flex items-center gap-1 py-1.5 pr-2 rounded-md group cursor-pointer hover:bg-dark-700/50"
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
                        className="flex items-center gap-1 py-1 px-2 rounded-md group cursor-pointer hover:bg-dark-700/30"
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
            setSelectedMockRequest(mockMenu.mock);
            setShowCreateMockServiceModal(true);
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

        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-0 top-[calc(64px+52px)] z-10 p-1.5 bg-dark-800 border-r border-b border-dark-700 rounded-r text-gray-500 hover:text-white hover:bg-dark-700/50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Center + Right: Request builder and Execution Insights side by side */}
        <section className="flex-1 flex min-h-0 overflow-hidden min-w-0">
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-auto">
            {topMenuActive === 'environments' ? (
              <VariablesEditor
                pairs={variablesScope === 'environment-scope' ? environmentVariables : globalVariables}
                onChange={variablesScope === 'environment-scope' ? onEnvironmentVariablesChange : onGlobalVariablesChange}
                title={variablesScope === 'environment-scope' ? 'Environment Variables' : 'Global Variables'}
              />
            ) : 

topMenuActive === 'testing' ? (
  <div className="flex-1 flex flex-col min-h-0 overflow-auto p-6">
    {/* Library */}
    {testingSubTab === 'library' && (
      <SpecLibraryPanel projects={projects} currentUserId={currentUserId} />
    )}

    {/* Generate Testcases */}
    {testingSubTab === 'generate' && (
      <GenerateTestCase projects={projects} activeWorkspaceId={activeWorkspaceId} />
    )}

    {/* Functional Testing */}
    {testingSubTab === 'functional' && (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-300">Select Collection</label>
          <select
            value={selectedTestCollectionId || ''}
            onChange={(e) => setSelectedTestCollectionId(e.target.value)}
            className="mt-1 w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Select a collection</option>
            {workspaceCollections.map(col => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
        </div>

        {selectedTestCollectionId && (
          <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5 space-y-5">
            {/* Functional config UI – copied from CollectionRunView */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Choose how to run your collection</h3>
              <div className="space-y-2">
                {[
                  { id: 'manual', label: 'Run manually', desc: 'Run this collection in the Collection Runner.' },
                  { id: 'schedule', label: 'Schedule runs', desc: 'Periodically run collection at a specified time.' },
                  { id: 'cli', label: 'Automate runs via CLI', desc: 'Configure CLI command to run on your build pipeline.' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-dark-700 hover:bg-dark-800/50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="functionalRunMode"
                      checked={functionalRunMode === opt.id}
                      onChange={() => setFunctionalRunMode(opt.id)}
                      className="mt-1 text-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">{opt.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white mb-3">Run configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Iterations</label>
                  <input
                    type="number"
                    min={1}
                    value={functionalIterations}
                    onChange={(e) => setFunctionalIterations(Number(e.target.value) || 1)}
                    className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    min={0}
                    value={functionalDelay}
                    onChange={(e) => setFunctionalDelay(Number(e.target.value) || 0)}
                    className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Test data file: Only JSON and CSV files are accepted.</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    fileSelectCallbackRef.current = setFunctionalSelectedFile;
                    setFileSelectionContext({ context: 'functional', selectedFile: functionalSelectedFile });
                    setShowFileSelectionModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700 text-sm"
                >
                  Select File
                </button>
                {functionalSelectedFile && (
                  <span className="text-sm text-primary truncate max-w-[200px]">{functionalSelectedFile.name}</span>
                )}
              </div>
            </div>

            <details className="group">
              <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none flex items-center gap-1">
                Advanced settings
              </summary>
              <div className="mt-3 pt-3 border-t border-dark-700 text-xs text-gray-500">
                Additional options can be added here.
              </div>
            </details>

            <button
              type="button"
              onClick={async () => {
                if (!selectedTestCollectionId) {
                  toast.error('Please select a collection');
                  return;
                }
                const options = {
                  type: 'functional',
                  iterations: functionalIterations,
                  delay: functionalDelay,
                  testFile: functionalSelectedFile,
                };
                onRunCollectionWithOrder(selectedTestCollectionId, [], options, -1);
              }}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm"
            >
              Run Functional Test
            </button>
          </div>
        )}
      </div>
    )}

    {/* Load Testing */}
    {testingSubTab === 'load' && (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-300">Select Collection</label>
          <select
            value={selectedTestCollectionId || ''}
            onChange={(e) => setSelectedTestCollectionId(e.target.value)}
            className="mt-1 w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Select a collection</option>
            {workspaceCollections.map(col => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
        </div>

        {selectedTestCollectionId && (
          <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Set up your performance test</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Load profile</label>
                  <select
                    value={loadProfile}
                    onChange={(e) => setLoadProfile(e.target.value)}
                    className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                      className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                        className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <select
                      value={loadDurationUnit}
                      onChange={(e) => setLoadDurationUnit(e.target.value)}
                      className="bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
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
                    Pass test if...
                  </summary>
                  <div className="mt-3 pt-3 border-t border-dark-700 text-xs text-gray-500">
                    Configure pass/fail conditions.
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
              onClick={async () => {
                if (!selectedTestCollectionId) {
                  toast.error('Please select a collection');
                  return;
                }
                const options = {
                  type: 'load',
                  virtualUsers: loadVirtualUsers,
                  duration: loadDuration,
                  durationUnit: loadDurationUnit,
                  delay: functionalDelay, // think time
                };
                onRunCollectionWithOrder(selectedTestCollectionId, [], options, -1);
              }}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm"
            >
              Run performance test
            </button>
          </div>
        )}
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
  </div>
)
          
          : topMenuActive === 'ai-assisted' ? (
              <AIAssisted />
            ) : topMenuActive === 'dashboard' ? (
  <DashboardSpecTable
    projects={projects}
    workspaceRuns={workspaceRuns}
    loadingRuns={loadingRuns}
    onViewRunResults={onViewRunResults}
  />
            ) :

 (
              <APIExecutionStudio
                requests={requests}
                activeRequestIndex={activeRequestIndex}
                onTabSelect={onTabSelect}
                onNewTab={onNewTab}
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
              />
            )}
          </div>

          {/* Right side: Code snippet and Execution Insights (both closed by default), + icon strip */}
          <div className="flex flex-shrink-0 border-l border-dark-700 bg-dark-800/30 min-h-0">
            {rightPanelOpen === 'code' && (
              <CodeSnippetPanel 
                method={method}
                url={url}
                headers={headers}
                body={body}
                authType={authType}
                authData={authData}
              />
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
            <div className="flex flex-col border-l border-dark-700 bg-dark-800/60 w-12 flex-shrink-0">
              <button
                type="button"
                onClick={() => setRightPanelOpen((prev) => (prev === 'code' ? null : 'code'))}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 py-3 px-2 border-b border-dark-700 transition-colors',
                  rightPanelOpen === 'code'
                    ? 'bg-primary/15 text-primary'
                    : 'text-gray-500 hover:text-white hover:bg-dark-700/50'
                )}
                title="Code snippet (cURL)"
              >
                <span className="font-mono text-sm font-semibold leading-none">&lt;/&gt;</span>
                <span className="text-[9px] font-medium">Code</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelOpen((prev) => (prev === 'insights' ? null : 'insights'))}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 py-3 px-2 transition-colors',
                  rightPanelOpen === 'insights'
                    ? 'bg-primary/15 text-primary'
                    : 'text-gray-500 hover:text-white hover:bg-dark-700/50'
                )}
                title="Execution Insights"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-[9px] font-medium">Insights</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - same as Forgeq / Migration page */}
      <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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

      {/* Create Mock Service Modal */}
{showCreateMockServiceModal && (
<CreateMockServiceModal
  onClose={() => {
    setShowCreateMockServiceModal(false);
    setSelectedMockRequest(null); // ← Add this line
  }}
  onCreateMockServer={onCreateMockServer} 
  onUpdateMockServer={onUpdateMockServer} 
  mockServer={selectedMockRequest} 
  collections={collections} 
  initialRequest={selectedMockRequest} 
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


