import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { History, LayoutGrid, Layers, ChevronRight, Search, Plus, ChevronDown, BarChart3, Save, MoreVertical, Trash2, FileSearch, Play, Upload, FolderOpen } from 'lucide-react';
import APIExecutionStudio from './APIExecutionStudio';
import IDEExecutionInsights from './IDEExecutionInsights';
import CodeSnippetPanel from './CodeSnippetPanel';
import CollectionsPanel from './CollectionsPanel';
import SaveRequestModal from './SaveRequestModal';
import VariablesEditor from './VariablesEditor';
import clsx from 'clsx';

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
  environmentVariables,
  globalVariables,
  onEnvironmentVariablesChange,
  onGlobalVariablesChange,
  onSaveEnvironmentVariables,
  onSaveGlobalVariables,
  substituteVariables,
  collectionRunResults,
  onRunCollection,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const getTopMenuFromPath = (pathname) => {
    if (pathname.includes('/workspace/history')) return 'history';
    if (pathname.includes('/workspace/variables')) return 'environments';
    if (pathname.includes('/workspace/testing')) return 'testing';
    if (pathname.includes('/workspace/mock-service')) return 'mock-service';
    if (pathname.includes('/workspace/settings/general')) return 'settings-general';
    if (pathname.includes('/workspace/settings/certificates')) return 'settings-certificates';
    return 'collections';
  };
  const getPathFromTopMenu = (menuId) => {
    if (menuId === 'history') return '/workspace/history';
    if (menuId === 'environments') return '/workspace/variables';
    if (menuId === 'testing') return '/workspace/testing';
    if (menuId === 'mock-service') return '/workspace/mock-service';
    return '/workspace/collections';
  };
  const [topMenuActive, setTopMenuActive] = useState(() => getTopMenuFromPath(location.pathname));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(null); // null | 'code' | 'insights' — both closed by default
  const [variablesScope, setVariablesScope] = useState('environment-scope');
  
  // History menu state
  const [historyMenu, setHistoryMenu] = useState(null);
  const [showHistorySaveModal, setShowHistorySaveModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);

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
  ];

  // Testing sub-tabs: generate | functional | load
  const [testingSubTab, setTestingSubTab] = useState('generate');
  const testingSubTabs = [
    { id: 'generate', label: 'Generate Testcases', icon: FileSearch },
    { id: 'functional', label: 'Functional Test', icon: Play },
    { id: 'load', label: 'Load Test', icon: BarChart3 },
  ];
  const [generateTestcasesSearch, setGenerateTestcasesSearch] = useState('');
  const [specFileName, setSpecFileName] = useState('');
  const [specFile, setSpecFile] = useState(null);
  const specFileInputRef = React.useRef(null);
  const handleSpecFileChange = (e) => {
    const file = e.target.files?.[0];
    setSpecFile(file ?? null);
    setSpecFileName(file?.name ?? '');
  };
  const handleUploadSpec = () => {
    if (!specFile) return;
    // TODO: call upload API or process file
  };
  const [functionalRunMode, setFunctionalRunMode] = useState('manual');
  const [functionalIterations, setFunctionalIterations] = useState(1);
  const [functionalDelay, setFunctionalDelay] = useState(0);
  const [loadProfile, setLoadProfile] = useState('fixed');
  const [loadVirtualUsers, setLoadVirtualUsers] = useState(20);
  const [loadDuration, setLoadDuration] = useState(10);
  const [loadDurationUnit, setLoadDurationUnit] = useState('mins');
  const [loadRunMode, setLoadRunMode] = useState('app');

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-probestack-bg text-white min-h-0">
      {/* Forgeq-style header bar: History | Collections | Environments + Search + Environment */}
      <header className="shrink-0 border-b border-dark-700 bg-dark-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-1">
            {topMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTopMenuActive(item.id);
                    navigate(getPathFromTopMenu(item.id));
                  }}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    topMenuActive === item.id
                      ? 'bg-primary/15 border border-primary/40 text-primary shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search workspace..."
                value={workspaceSearch}
                onChange={(e) => setWorkspaceSearch(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow"
              />
            </div>
            <div className="relative min-w-[140px]">
              <select
                value={selectedEnvironment}
                onChange={(e) => onEnvironmentChange && onEnvironmentChange(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg text-sm font-medium text-white py-2 pl-3 pr-8 appearance-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer"
              >
                {environments.map((env) => (
                  <option key={env.id} value={env.id} className="bg-dark-800 text-white">
                    {env.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
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
                ? (testingSubTabs.find(t => t.id === testingSubTab)?.label ?? 'Testing')
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
                />
              </div>
            )}
            {topMenuActive === 'history' && (
              <div className="flex-1 flex flex-col p-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">History</span>
                {history.length === 0 ? (
                  <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-6 text-center">
                    <p className="text-sm text-gray-400">No history</p>
                    <p className="text-xs text-gray-500 mt-1">Run requests to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 20).map((item, index) => (
                      <div
                        key={index}
                        className="group w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-transparent hover:bg-dark-800 hover:border-primary/20 text-gray-300 hover:text-white flex items-center justify-between"
                      >
                        <button
                          onClick={() => loadHistoryItem(item)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded',
                              item.method === 'GET' && 'text-green-400 bg-green-400/10',
                              item.method === 'POST' && 'text-yellow-400 bg-yellow-400/10',
                              'text-purple-400 bg-purple-400/10'
                            )}>
                              {item.method}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(item.date).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-xs truncate font-mono">{item.url}</div>
                        </button>
                        {/* Triple dot action button */}
                        <button
                          type="button"
                          onClick={(e) => handleHistoryMenuOpen(e, item, index)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-gray-500 hover:text-white hover:bg-dark-700"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* History Context Menu */}
                {historyMenu && (
                  <HistoryContextMenu
                    x={historyMenu.x}
                    y={historyMenu.y}
                    onClose={() => setHistoryMenu(null)}
                    onAction={handleHistoryAction}
                  />
                )}
                
                {/* Save Request Modal for History */}
                {showHistorySaveModal && selectedHistoryItem && (
                  <SaveRequestModal
                    isOpen={showHistorySaveModal}
                    onClose={() => {
                      setShowHistorySaveModal(false);
                      setSelectedHistoryItem(null);
                      setSelectedHistoryIndex(null);
                    }}
                    onSave={handleSaveHistoryRequest}
                    requestName="" // Empty for history - user must enter
                    collections={collections}
                    projects={projects}
                    onAddProject={onAddProject}
                    // New prop to indicate this is from history (editable name)
                    isHistorySave={true}
                  />
                )}
              </div>
            )}
            {topMenuActive === 'environments' && (
              <div className="flex-1 flex flex-col p-4">
                {/* Scope Selection Cards */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                      Environment Scope
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setVariablesScope('environment-scope')}
                        className={clsx(
                          'w-full flex items-center justify-between gap-2 text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                          variablesScope === 'environment-scope'
                            ? 'bg-primary/15 text-primary border border-primary/40 shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
                        )}
                      >
                        <span>Environment Scope</span>
                        <span className="flex items-center gap-2 shrink-0">
                          {variablesSavedMessage === 'environment' && (
                            <span className="text-xs font-medium text-primary">Saved</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSaveEnvironmentVariables?.();
                              showVariablesSaved('environment');
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Save environment variables"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                      Global Scope
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setVariablesScope('global-scope')}
                        className={clsx(
                          'w-full flex items-center justify-between gap-2 text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                          variablesScope === 'global-scope'
                            ? 'bg-primary/15 text-primary border border-primary/40 shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
                        )}
                      >
                        <span>Global Scope</span>
                        <span className="flex items-center gap-2 shrink-0">
                          {variablesSavedMessage === 'global' && (
                            <span className="text-xs font-medium text-primary">Saved</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSaveGlobalVariables?.();
                              showVariablesSaved('global');
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Save global variables"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {topMenuActive === 'testing' && (
              <div className="flex-1 flex flex-col p-4">
                <div className="space-y-3">
                  {testingSubTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <div key={tab.id} className="rounded-xl border border-dark-700 bg-dark-800/40 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                          {tab.label}
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setTestingSubTab(tab.id)}
                            className={clsx(
                              'w-full flex items-center gap-2 text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                              testingSubTab === tab.id
                                ? 'bg-primary/15 text-primary border border-primary/40 shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{tab.label}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {topMenuActive === 'mock-service' && (
              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Mock Service</span>
                  <button type="button" className="p-2 rounded-lg transition-colors hover:bg-primary/15 text-gray-500 hover:text-primary border border-transparent hover:border-primary/30">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-6 text-center">
                  <p className="text-sm text-gray-300">No mock services available</p>
                  <p className="text-xs text-gray-500 mt-1">Define mock endpoints for local or staged testing.</p>
                </div>
              </div>
            )}
            {topMenuActive === 'settings-general' && (
              <div className="flex-1 flex flex-col p-4">
                <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-6">
                  <h3 className="text-sm font-semibold text-gray-200">Settings - General</h3>
                  <p className="text-xs text-gray-500 mt-2">General workspace settings are available here.</p>
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
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {topMenuActive === 'environments' ? (
              <VariablesEditor
                pairs={variablesScope === 'environment-scope' ? environmentVariables : globalVariables}
                onChange={variablesScope === 'environment-scope' ? onEnvironmentVariablesChange : onGlobalVariablesChange}
                title={variablesScope === 'environment-scope' ? 'Environment Variables' : 'Global Variables'}
              />
            ) : topMenuActive === 'testing' ? (
              // Testing: Generate Testcases | Functional Test | Load Test
              <div className="flex-1 flex flex-col min-h-0 overflow-auto p-6">
                {testingSubTab === 'generate' && (
                  <div className="max-w-2xl space-y-6">
                    <h2 className="text-lg font-semibold text-white">Generate Testcases</h2>
                    <p className="text-sm text-gray-400">Search or upload an API spec file to generate test cases.</p>
                    <div className="flex flex-col gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search spec or paste URL..."
                          value={generateTestcasesSearch}
                          onChange={(e) => setGenerateTestcasesSearch(e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <input
                          ref={specFileInputRef}
                          type="file"
                          accept=".json,.yaml,.yml,.openapi,.spec"
                          className="hidden"
                          onChange={handleSpecFileChange}
                        />
                        <button
                          type="button"
                          onClick={() => specFileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dark-600 bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-sm font-medium"
                        >
                          <FolderOpen className="w-4 h-4" />
                          Browse
                        </button>
                        <button
                          type="button"
                          onClick={handleUploadSpec}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!specFile}
                          title={specFile ? 'Upload spec file' : 'Select a file first'}
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                        {specFileName && <span className="text-sm text-gray-400 truncate">{specFileName}</span>}
                      </div>
                    </div>
                  </div>
                )}
                {testingSubTab === 'functional' && (
                  <div className="max-w-2xl space-y-6">
                    <h2 className="text-lg font-semibold text-white">Functional Test</h2>
                    <p className="text-sm text-gray-400">Choose how to run your collection and configure run options.</p>
                    <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5 space-y-5">
                      <div>
                        <h3 className="text-sm font-medium text-white mb-3">Choose how to run your collection</h3>
                        <div className="space-y-2">
                          {[
                            { id: 'manual', label: 'Run manually', desc: 'Run this collection in the Collection Runner.' },
                            { id: 'schedule', label: 'Schedule runs', desc: 'Periodically run collection at a specified time.' },
                            { id: 'cli', label: 'Automate runs via CLI', desc: 'Configure CLI command to run on your build pipeline.' },
                          ].map((opt) => (
                            <label key={opt.id} className="flex items-start gap-3 p-3 rounded-lg border border-dark-700 hover:bg-dark-800/50 cursor-pointer">
                              <input type="radio" name="functionalRunMode" checked={functionalRunMode === opt.id} onChange={() => setFunctionalRunMode(opt.id)} className="mt-1 text-primary" />
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
                            <input type="number" min={1} value={functionalIterations} onChange={(e) => setFunctionalIterations(Number(e.target.value) || 1)} className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Delay (ms)</label>
                            <input type="number" min={0} value={functionalDelay} onChange={(e) => setFunctionalDelay(Number(e.target.value) || 0)} className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Test data file: Only JSON and CSV files are accepted.</p>
                        <button type="button" className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700 text-sm">Select File</button>
                      </div>
                      <details className="group">
                        <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none flex items-center gap-1">Advanced settings</summary>
                        <div className="mt-3 pt-3 border-t border-dark-700 text-xs text-gray-500">Additional options can be added here.</div>
                      </details>
                      <button type="button" className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm">Run collection</button>
                    </div>
                  </div>
                )}
                {testingSubTab === 'load' && (
                  <div className="max-w-2xl space-y-6">
                    <h2 className="text-lg font-semibold text-white">Load Test</h2>
                    <p className="text-sm text-gray-400">Set up your performance test with virtual users and duration.</p>
                    <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5 space-y-5">
                      <div>
                        <h3 className="text-sm font-medium text-white mb-3">Set up your performance test</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Load profile</label>
                            <select value={loadProfile} onChange={(e) => setLoadProfile(e.target.value)} className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                              <option value="fixed" className="bg-dark-800">Fixed</option>
                              <option value="ramp" className="bg-dark-800">Ramp up</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Virtual users</label>
                              <input type="number" min={1} value={loadVirtualUsers} onChange={(e) => setLoadVirtualUsers(Number(e.target.value) || 1)} className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            </div>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Test duration</label>
                                <input type="number" min={1} value={loadDuration} onChange={(e) => setLoadDuration(Number(e.target.value) || 1)} className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                              </div>
                              <select value={loadDurationUnit} onChange={(e) => setLoadDurationUnit(e.target.value)} className="bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="mins" className="bg-dark-800">mins</option>
                                <option value="secs" className="bg-dark-800">secs</option>
                              </select>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">{loadVirtualUsers} virtual users run for {loadDuration} {loadDurationUnit}, each executing all requests sequentially.</p>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Data file</label>
                            <button type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700 text-sm">Select file</button>
                          </div>
                          <details className="group">
                            <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none">Pass test if...</summary>
                            <div className="mt-3 pt-3 border-t border-dark-700 text-xs text-gray-500">Configure pass/fail conditions.</div>
                          </details>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white mb-2">Run</h3>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="loadRunMode" checked={loadRunMode === 'app'} onChange={() => setLoadRunMode('app')} className="text-primary" />
                            <span className="text-sm text-gray-300">In the app</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="loadRunMode" checked={loadRunMode === 'cli'} onChange={() => setLoadRunMode('cli')} className="text-primary" />
                            <span className="text-sm text-gray-300">via the CLI</span>
                          </label>
                        </div>
                      </div>
                      <button type="button" className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm">Run performance test</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
                projects={projects}
                onAddProject={onAddProject}
                substituteVariables={substituteVariables}
                collectionRunResults={collectionRunResults}
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
    </div>
  );
}

