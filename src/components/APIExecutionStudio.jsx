import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Globe, Key, Menu, FileText, Shield, CheckCircle2, XCircle, Clock, Database, AlertCircle, Plus, Terminal, X, Save, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import KeyValueEditor from './KeyValueEditor';
import AuthPanel from './AuthPanel';
import ResizableBottomPanel from './ResizableBottomPanel';
import SaveRequestModal from './modals/SaveRequestModal';
import WorkspaceDetailsView from './detailsTab/WorkspaceDetailsView';
import CollectionRunView from './detailsTab/CollectionRunDetailsView';
import CollectionRunResultsView from './detailsTab/CollectionRunResultsView';
import {toast} from 'sonner';
import clsx from 'clsx';
import LoadTestResultsView from './detailsTab/LoadTestResultsView';
import LoadTestRunningView from './detailsTab/LoadTestRunningView';
import VariableHighlightInput from '../components/VariableHighlightInput';

function getTabLabel(request) {
  if (request.type === 'workspace-details') {
    return request.name || 'Workspace Details';
  }
  const u = request?.url?.trim();
  if (!u) return 'Untitled';
  if (u.startsWith('http://') || u.startsWith('https://')) {
    try {
      const parsed = new URL(u);
      return parsed.hostname || u.slice(0, 24);
    } catch {
      return u.slice(0, 24);
    }
  }
  return u.length > 24 ? u.slice(0, 24) + '…' : u;
}

// Helper functions
const parseQueryString = (url) => {
  if (!url) return [];
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return [];
  const queryString = url.slice(queryIndex + 1);
  if (!queryString) return [];
  return queryString.split('&').map(pair => {
    const eqIndex = pair.indexOf('=');
    let key, value;
    if (eqIndex === -1) {
      key = pair;
      value = '';
    } else {
      key = pair.slice(0, eqIndex);
      value = pair.slice(eqIndex + 1);
    }
    try { key = decodeURIComponent(key); } catch { /* keep as-is */ }
    try { value = decodeURIComponent(value); } catch { /* keep as-is */ }
    return { key: key || '', value: value || '' };
  });
};

const encodePreservingVariables = (str) => {
  if (!str) return '';
  return str.split(/(\{\{[^}]+\}\})/).map(part => {
    if (/^\{\{[^}]+\}\}$/.test(part)) return part;
    return encodeURIComponent(part);
  }).join('');
};

const buildQueryString = (params) => {
  if (!params || params.length === 0) return '';
  const valid = params.filter(p => p.key && p.key.trim() !== '');
  if (valid.length === 0) return '';
  return valid.map(p => `${encodePreservingVariables(p.key)}=${encodePreservingVariables(p.value)}`).join('&');
};

export default function APIExecutionStudio({
  requests = [],
  activeRequestIndex = 0,
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
  executionHistory,
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
  onSaveRequest,
  collections = [],
  projects = [],
  onAddProject,
  substituteVariables,
  collectionRunResults,
  isSavedRequest,
  onUpdateRequest,
  pristineRequests,
    hideNewButton = false,
  hideSaveButton = false,
  currentUserId,
      onWorkspaceUpdate,
  onWorkspaceDelete,
  onFetchHistoryEntry,
  activeWorkspaceId, 
  onOpenCollectionRun,
onRunCollectionWithOrder,
  sidebarCollapsed,
  testFiles,
  onTestFilesChange,
  onUploadTestFile,
  onDeleteTestFile,
    activeEnvVars,
  inactiveEnvVars,
  activeEnvValues,
  inactiveEnvInfo,
  onShowChatbot,
}) {
  const [activeSection, setActiveSection] = useState('params');
  const [bottomPanelTab, setBottomPanelTab] = useState('response');
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);
  const [bodyType, setBodyType] = useState('raw'); // none | form-data | x-www-form-urlencoded | raw
  const [rawBodyFormat, setRawBodyFormat] = useState('json'); // json, text, etc.
  const [editingTabIndex, setEditingTabIndex] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [expandedRunFolders, setExpandedRunFolders] = useState({});
  const [responseTab, setResponseTab] = useState('body');
  const [expandedRunRequestId, setExpandedRunRequestId] = useState(null);
  const [expandedRunSections, setExpandedRunSections] = useState({});
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [expandedLogSections, setExpandedLogSections] = useState({});
  const [logDetails, setLogDetails] = useState({});
  const [loadingLogDetails, setLoadingLogDetails] = useState({});
const syncSource = useRef(null);

const tabsContainerRef = useRef(null);

  // Scroll active tab into view when active index or tab count changes
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTab = tabsContainerRef.current.querySelector(`[data-index="${activeRequestIndex}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeRequestIndex, requests.length]);

// Group executionHistory by date for logs tab
const groupedLogs = useMemo(() => {
  const groups = {};
  if (!executionHistory) return groups;

  executionHistory.forEach(item => {
    const date = new Date(item.date);
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
}, [executionHistory]);

const fetchLogDetails = async (historyId) => {
  console.log('fetchLogDetails called for', historyId);
  if (!onFetchHistoryEntry) {
    toast.error('History fetch function not available');
    return;
  }
  if (logDetails[historyId]) return;
  setLoadingLogDetails(prev => ({ ...prev, [historyId]: true }));
  try {
    const response = await onFetchHistoryEntry(historyId);
    console.log('fetchLogDetails response', response);
    setLogDetails(prev => ({ ...prev, [historyId]: response.data }));
  } catch (error) {
    console.error('fetchLogDetails error', error);
    toast.error('Failed to load history details');
  } finally {
    setLoadingLogDetails(prev => ({ ...prev, [historyId]: false }));
  }
};

const handleQueryParamsChange = (newParams) => {
  syncSource.current = 'params';
  onQueryParamsChange(newParams);
};

useEffect(() => {
  if (collectionRunResults) {
    setExpandedRunRequestId(null);
    setExpandedRunSections({});
  }
}, [collectionRunResults]);

// Sync URL → QueryParams
useEffect(() => {
  if (syncSource.current === 'params') {
    syncSource.current = null;
    return;
  }
  if (!url) return;

  const currentQueryString = buildQueryString(queryParams);
  const urlQueryString = url.includes('?') ? url.split('?')[1] : '';
  if (currentQueryString !== urlQueryString) {
    const parsed = parseQueryString(url);
    syncSource.current = 'url';
    onQueryParamsChange(parsed);
  }
}, [url, queryParams, onQueryParamsChange]);

// Sync QueryParams → URL
useEffect(() => {
  if (syncSource.current === 'url') {
    syncSource.current = null;
    return;
  }
  if (!url) return;

  const baseUrl = url.split('?')[0];
  const newQuery = buildQueryString(queryParams);
  const newUrl = newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
  if (newUrl !== url) {
    syncSource.current = 'params';
    onUrlChange(newUrl);
  }
}, [queryParams, url, onUrlChange]);

  // Auto-expand bottom panel and switch to Collection Run tab when collection run starts
  React.useEffect(() => {
    if (collectionRunResults) {
      setBottomPanelCollapsed(false);
      setBottomPanelTab('collection-run');
    }
  }, [collectionRunResults]);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  const getMethodColor = (m) => {
    switch (m) {
      case 'GET': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'POST': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'PUT': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'DELETE': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    }
  };

  const paramsCount = queryParams.filter((p) => p.key?.trim()).length;
  const headersCount = headers.filter((h) => h.key?.trim()).length;

  const sections = [
    { id: 'params', label: 'Params', count: paramsCount },
    { id: 'headers', label: 'Headers', count: headersCount },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'pre-request', label: 'Pre-request Script' },
    { id: 'tests', label: 'Tests' },
  ];

const handleSendClick = () => {
    const hasUrl = Boolean(url && url.trim());
    if (!hasUrl || isLoading) return;

    setBottomPanelCollapsed(false);
    setBottomPanelTab('response');
    
    onExecute();
};

      const currentReq = requests[activeRequestIndex];
  const isWorkspaceDetails = currentReq?.type === 'workspace-details';
  const isCollectionRun = currentReq?.type === 'collection-run';
    const isMockEndpoint = currentReq?.isMockEndpoint === true;
  const pristine = pristineRequests?.[currentReq?.id];
  const isCollectionRunResults = currentReq?.type === 'collection-run-results'; 
  const isLoadTestResults = currentReq?.type === 'load-test-results'; 
  const isLoadTestRunning = currentReq?.type === 'load-test-running';


    const hasUnsavedChanges = useMemo(() => {
    if (!pristine || !isSavedRequest(currentReq)) {
      return false;
    }
    const fieldsToCompare = ['method', 'url', 'queryParams', 'headers', 'body', 'authType', 'authData', 'preRequestScript', 'tests', 'name'];
    for (const field of fieldsToCompare) {
      const current = currentReq[field];
      const original = pristine[field];
      if (JSON.stringify(current) !== JSON.stringify(original)) {
        return true;
      }
    }
    return false;
  }, [currentReq, pristine, isSavedRequest]);

  const getSaveTooltip = () => {
    if (!isSavedRequest(currentReq)) {
      return 'Save to a collection';
    }
    return hasUnsavedChanges ? 'Save changes' : 'No changes to save';
  };

  const handleSaveClick = () => {
    if (isSavedRequest(currentReq)) {
      // Only call update if there are changes
      if (hasUnsavedChanges) {
        onUpdateRequest(currentReq);
      } else {
        // Optionally, you could show a toast "No changes to save"
        toast.info('No changes to save');
      }
    } else {
      setShowSaveModal(true);
    }
  };


// Helper to format response body for display
const formatResponseBody = (data) => {
  if (data === null || data === undefined) return '';
  
  // If it's already a string, try to pretty-print JSON, else return as-is
  if (typeof data === 'string') {
    const trimmed = data.trim();
    // Check if it looks like JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // Not valid JSON – return original string (preserves newlines)
        return data;
      }
    }
    return data; // plain text
  }
  
  // If it's an object, stringify with indentation
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  
  // Fallback
  return String(data);
};

// Helper component for collapsible sections
function DetailSection({ title, sectionKey, requestId, expandedSections, setExpandedSections, children }) {
  const isExpanded = expandedSections[`${requestId}:${sectionKey}`];
  const toggle = () => setExpandedSections(prev => ({
    ...prev,
    [`${requestId}:${sectionKey}`]: !prev[`${requestId}:${sectionKey}`]
  }));

  return (
    <div className="border border-dark-700 rounded-lg">
      <div
        className="flex items-center gap-1 px-3 py-1.5 bg-dark-800/30 cursor-pointer hover:bg-dark-700/30"
        onClick={toggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        )}
        <span className="text-xs font-medium text-gray-300">{title}</span>
      </div>
      {isExpanded && (
        <div className="p-3 border-t border-dark-700">
          {children}
        </div>
      )}
    </div>
  );
}

// Helper to render key-value tables
function KeyValueTable({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-gray-500">None</p>;
  }
  return (
    <table className="w-full text-xs">
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} className="border-b border-dark-700/50 last:border-0">
            <td className="py-1 pr-4 text-gray-300 font-mono">{item.key}</td>
            <td className="py-1 text-gray-400 font-mono break-all">{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


  return (
    <div className="flex-1 flex flex-col bg-probestack-bg min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Tab bar */}
        <div className="flex items-center border-b border-dark-700 bg-dark-800/40 flex-shrink-0 min-h-0 overflow-hidden">
          {!hideNewButton && (
            <button
              type="button"
              onClick={onNewTab}
              className="flex items-center justify-center gap-1.5 px-3 h-11 shrink-0 text-gray-400 hover:text-primary hover:bg-primary/10 border-r border-dark-700 transition-colors text-xs font-semibold tracking-wide"
              title="New request"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          )}
          {/* Scrollable container */}
  <div
    ref={tabsContainerRef}
    className="flex items-center overflow-x-auto overflow-y-hidden min-w-0"
    style={{ marginBottom: '-8px' }}
  >
            {requests.map((req, index) => {
              const isActive = index === activeRequestIndex;
              const label = getTabLabel(req);
              const isEditing = editingTabIndex === index;
              return (
                <div
                  key={req.id}
                  data-index={index}
                  role="tab"
                  tabIndex={0}
                  onClick={() => !isEditing && onTabSelect(index)}
                  onDoubleClick={() => {
                    setEditingTabIndex(index);
                    setEditingTabName(req.name || label);
                  }}
                  onKeyDown={(e) => {
                    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onTabSelect(index);
                    }
                  }}
                  className={clsx(
                    'flex items-center gap-2 pl-3 pr-1 py-2.5 min-w-0 max-w-[200px] shrink-0 border-r border-dark-700 cursor-pointer transition-colors group',
                    isActive
                      ? 'bg-probestack-bg text-white border-b-2 border-b-primary -mb-px'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'
                  )}
                >
                {/* Only show method badge for non‑workspace tabs */}
                {req.type !== 'workspace-details' && (
                  <span
                    className={clsx(
                      'text-[10px] font-bold shrink-0',
                      req.method === 'GET' && 'text-green-400',
                      req.method === 'POST' && 'text-yellow-400',
                      req.method === 'PUT' && 'text-blue-400',
                      req.method === 'DELETE' && 'text-red-400',
                      'text-purple-400'
                    )}
                  >
                    {req.method}
                  </span>
                )}
                {isEditing ? (
                  <input
                    type="text"
                    value={editingTabName}
                    onChange={(e) => setEditingTabName(e.target.value)}
                    onBlur={() => {
                      if (editingTabName.trim() && onTabRename) {
                        onTabRename(index, editingTabName.trim());
                      }
                      setEditingTabIndex(null);
                      setEditingTabName('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (editingTabName.trim() && onTabRename) {
                          onTabRename(index, editingTabName.trim());
                        }
                        setEditingTabIndex(null);
                        setEditingTabName('');
                      } else if (e.key === 'Escape') {
                        setEditingTabIndex(null);
                        setEditingTabName('');
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="text-xs flex-1 bg-dark-700 border border-primary rounded px-1 py-0.5 outline-none text-white min-w-0"
                  />
                ) : (
                  <span className="text-xs truncate flex-1">{req.name || label}</span>
                )}
                {requests.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(index);
                    }}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-dark-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Close tab"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Conditional main content: workspace details OR request UI */}
      {isWorkspaceDetails ? (
        (() => {
          const workspace = projects.find(p => p.id === currentReq.workspaceId);
          return (
            <WorkspaceDetailsView
              workspace={workspace}
              collectionsCount={collections.filter(c => c.project === workspace?.id).length}
              onRename={(id, oldName) => toast.info('Rename from tab not implemented yet')}
              onDelete={(id, name) => toast.info('Delete from tab not implemented yet')}
              currentUserId={currentUserId}
              onWorkspaceDelete={onWorkspaceDelete}
              onWorkspaceUpdate={onWorkspaceUpdate}
            />
          );
        })()
      ) : isCollectionRun ? (
        <CollectionRunView
          collection={collections.find(c => c.id === currentReq.collectionId)}
          onRunCollection={onRunCollectionWithOrder}
          onClose={() => onCloseTab(activeRequestIndex)}  // uses the existing onCloseTab prop
          sidebarCollapsed={sidebarCollapsed}
          testFiles={testFiles}
          onTestFilesChange={onTestFilesChange}
          projects={projects}
          onUploadTestFile={onUploadTestFile}
          onDeleteTestFile={onDeleteTestFile}
          tabIndex={activeRequestIndex} 
        />
) : isCollectionRunResults ? (
  <CollectionRunResultsView
    results={currentReq.results}
    onClose={() => onCloseTab(activeRequestIndex)}
  />
) : isLoadTestResults ? (
  <LoadTestResultsView
    loadTestId={currentReq.loadTestId} 
    onClose={() => onCloseTab(activeRequestIndex)}
  />

) : isLoadTestRunning ? (
  <LoadTestRunningView
    loadTestId={currentReq.loadTestId}
    config={currentReq.config}
    onComplete={(loadTestId) => {
      onCloseTab(activeRequestIndex);
      const newTab = {
        id: `load-test-results-${loadTestId}-${Date.now()}`,
        type: 'load-test-results',
        name: `Load Test Results`,
        loadTestId: loadTestId,
      };
      onNewTab(newTab);
    }}
  />
) : (
        <>
          {/* Postman-style: Request line — Method + URL + Send */}
          <div className="px-5 py-4 bg-dark-800/50 border-b border-dark-700 flex-shrink-0">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative w-[110px] flex-shrink-0">
                <select
                  value={method}
                  onChange={(e) => onMethodChange(e.target.value)}
                  className={clsx(
                    'w-full bg-dark-800 border border-dark-700 rounded-lg text-sm font-bold py-2.5 pl-3 pr-8 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer shadow-sm appearance-none',
                    getMethodColor(method)
                  )}
                >
                  {methods.map((m) => (
                    <option key={m} value={m} className="bg-dark-800 text-white">
                      {m}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1L6 6L11 1" />
                  </svg>
                </div>
              </div>
<VariableHighlightInput
  value={url}
  onChange={onUrlChange}
  placeholder="https://api.example.com/v1/endpoint"
  className="flex-1 min-w-[220px] bg-dark-800 border border-dark-700 rounded-lg text-sm font-mono text-white py-2.5 px-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none shadow-sm placeholder:text-gray-500"
  activeEnvVars={activeEnvVars}
  inactiveEnvVars={inactiveEnvVars}
  activeEnvValues={activeEnvValues}
  inactiveEnvInfo={inactiveEnvInfo}
/>
              <button
                onClick={handleSendClick}
                disabled={isLoading || !url?.trim()}
                className="bg-primary cursor-pointer hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md shadow-primary/25 flex items-center gap-2 transition-all active:scale-[0.98] flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Send</span>
                  </>
                )}
              </button>
              {!isMockEndpoint && (
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={isSavedRequest(currentReq) && !hasUnsavedChanges}
                  title={getSaveTooltip()}
                  className={clsx(
                    'bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-md shadow-primary/25 flex items-center gap-2 transition-all active:scale-[0.98] flex-shrink-0',
                    (isSavedRequest(currentReq) && !hasUnsavedChanges) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              )}
            </div>
          </div>

          {/* Postman-style: Tabs below request line — Params, Headers, Body, Auth, Pre-request Script, Tests */}
          <div className="border-b border-dark-700 px-5 flex items-center justify-between flex-shrink-0 bg-dark-900/30 gap-2 min-h-0">
            <div className="flex items-center gap-0 overflow-x-auto min-w-0 flex-1 scrollbar-thin">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={clsx(
                    'px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all -mb-px flex-shrink-0 border-b-2',
                    activeSection === section.id
                      ? 'border-primary text-primary bg-transparent'
                      : 'border-transparent text-gray-400 hover:text-white'
                  )}
                >
                  {section.label}
                  {section.count != null && section.count > 0 && (
                    <span className="ml-1 text-gray-500 font-normal">({section.count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-probestack-bg min-h-0">
            {/* Tab-specific content */}
{activeSection === 'params' && (
  <div className="p-5">
    <div className="rounded-lg border border-dark-700 bg-dark-900/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-dark-700 bg-dark-800/50 text-xs text-gray-400 font-medium">
        Query parameters for the request URL
      </div>
      <div className="p-4">
        <KeyValueEditor
          pairs={queryParams}
          onChange={handleQueryParamsChange}
          activeEnvVars={activeEnvVars}
          inactiveEnvVars={inactiveEnvVars}
          activeEnvValues={activeEnvValues}
          inactiveEnvInfo={inactiveEnvInfo}
        />
      </div>
    </div>
  </div>
)}

            {activeSection === 'headers' && (
              <div className="p-5">
                <div className="rounded-lg border border-dark-700 bg-dark-900/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-dark-700 bg-dark-800/50 text-xs text-gray-400 font-medium">
                    Request headers (e.g. Content-Type, Authorization)
                  </div>
                  <div className="p-4">
                    <KeyValueEditor
  pairs={headers}
  onChange={onHeadersChange}
  activeEnvVars={activeEnvVars}
  inactiveEnvVars={inactiveEnvVars}
  activeEnvValues={activeEnvValues}
  inactiveEnvInfo={inactiveEnvInfo}
/>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'body' && (
              <div className="p-5">
                {(method === 'POST' || method === 'PUT' || method === 'PATCH') ? (
                  <>
                    {/* Postman-style body type: none | form-data | x-www-form-urlencoded | raw */}
                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                      {['none', 'form-data', 'x-www-form-urlencoded', 'raw'].map((type) => (
                        <label
                          key={type}
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors',
                            bodyType === type
                              ? 'bg-primary/20 text-primary border border-primary/40'
                              : 'text-gray-400 hover:text-gray-200 border border-transparent'
                          )}
                        >
                          <input
                            type="radio"
                            name="bodyType"
                            checked={bodyType === type}
                            onChange={() => setBodyType(type)}
                            className="sr-only"
                          />
                          {type === 'x-www-form-urlencoded' ? 'x-www-form-urlencoded' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                      ))}
                      {bodyType === 'raw' && (
                        <select
                          value={rawBodyFormat}
                          onChange={(e) => setRawBodyFormat(e.target.value)}
                          className="ml-2 bg-dark-800 border border-dark-700 rounded-md text-xs text-gray-300 py-2 px-3 focus:outline-none focus:border-primary/50 cursor-pointer"
                        >
                          <option value="json">JSON</option>
                          <option value="text">Text</option>
                        </select>
                      )}
                    </div>
                    {bodyType === 'raw' ? (
                      <div className="rounded-lg border border-dark-700 overflow-hidden bg-[#1e1e1e]">
                        <div className="flex items-center gap-2 px-3 py-2 bg-dark-800/80 border-b border-dark-700 text-xs text-gray-400">
                          <span className="font-medium text-gray-300">{rawBodyFormat === 'json' ? 'JSON' : 'Text'}</span>
                        </div>
<VariableHighlightInput
  value={body}
  onChange={onBodyChange}
  placeholder={rawBodyFormat === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body...'}
  multiline
  activeEnvVars={activeEnvVars}
  inactiveEnvVars={inactiveEnvVars}
  activeEnvValues={activeEnvValues}
  inactiveEnvInfo={inactiveEnvInfo}
  className="w-full h-64 p-4 font-mono text-sm focus:outline-none resize-none text-gray-300 bg-transparent leading-relaxed"
  inputClassName="h-full" 
/>
                      </div>
                    ) : bodyType === 'none' ? (
                      <div className="h-48 flex items-center justify-center text-gray-500 text-sm border border-dark-700 rounded-lg bg-dark-900/50">
                        This request does not have a body
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-500 text-sm border border-dark-700 rounded-lg bg-dark-900/50">
                        {bodyType === 'form-data' ? 'Form-data editor coming soon. Use Raw for now.' : 'x-www-form-urlencoded editor coming soon. Use Raw for now.'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-500 text-sm border border-dark-700 rounded-lg bg-dark-900/50">
                    Body not supported for {method} requests
                  </div>
                )}
              </div>
            )}

            {activeSection === 'auth' && (
              <div className="p-5">
                <div className="rounded-lg border border-dark-700 bg-dark-900/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-dark-700 bg-dark-800/50 text-xs text-gray-400 font-medium">
                    Authentication type and credentials for the request
                  </div>
                  <div className="p-4">
                    <AuthPanel
                      authType={authType}
                      onAuthTypeChange={onAuthTypeChange}
                      authData={authData}
                      onAuthDataChange={onAuthDataChange}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'pre-request' && (
              <div className="p-5">
                <div className="rounded-lg border border-dark-700 bg-dark-900/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-dark-700 bg-dark-800/50 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">Pre-request Script</span>
                    <span className="text-[10px] text-gray-500">Runs before the request is sent</span>
                  </div>
                  <textarea
                    value={preRequestScript}
                    onChange={(e) => onPreRequestScriptChange && onPreRequestScriptChange(e.target.value)}
                    className="w-full h-80 p-4 font-mono text-sm bg-[#1e1e1e] focus:outline-none focus:ring-0 border-0 resize-none text-gray-300 placeholder:text-gray-500"
                    placeholder="// Add custom JavaScript code here\n// Example: pm.environment.set('token', 'abc123');"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {activeSection === 'tests' && (
              <div className="p-5">
                <div className="rounded-lg border border-dark-700 bg-dark-900/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-dark-700 bg-dark-800/50 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">Tests</span>
                    <span className="text-[10px] text-gray-500">Runs after the response is received</span>
                  </div>
                  <textarea
                    value={tests}
                    onChange={(e) => onTestsChange && onTestsChange(e.target.value)}
                    className="w-full h-80 p-4 font-mono text-sm bg-[#1e1e1e] focus:outline-none focus:ring-0 border-0 resize-none text-gray-300 placeholder:text-gray-500"
                    placeholder="// Add test scripts here\n// Example: pm.test('Status code is 200', () => {\n//   pm.response.to.have.status(200);\n// });"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div> {/* closes the inner flex-col div */}

    {/* Bottom Panel & Save Modal – only for request tabs */}
    {!isWorkspaceDetails && !isCollectionRun && !isCollectionRunResults && !isLoadTestRunning && !isLoadTestResults &&  (
      <>
        <ResizableBottomPanel
          defaultHeight={380}
          minHeight={48}
          maxHeight={800}
          collapsed={bottomPanelCollapsed}
          onCollapseChange={setBottomPanelCollapsed}
        >
          {/* </ResizableBottomPanel> */}

          {/* Forgeq-style Panel Header */}
          <div className="h-12 px-5 flex items-center justify-between border-b border-dark-700 bg-probestack-bg/80 shrink-0 gap-2 min-w-0">
            <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 scrollbar-thin">
              {['response', 'logs', 'validation', 'collection-run'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBottomPanelTab(tab)}
                  className={clsx(
                    'px-4 py-3 text-sm font-medium -mb-px transition-colors rounded-t capitalize whitespace-nowrap flex-shrink-0',
                    bottomPanelTab === tab
                      ? 'border-b-2 border-primary text-primary font-semibold bg-dark-800'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {tab === 'validation' ? 'Validation Results' :
                    tab === 'collection-run' ? 'Collection Run' : tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {bottomPanelCollapsed ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>

          {/* Panel Content */}
          {!bottomPanelCollapsed && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

{bottomPanelTab === 'response' && (
  <>
    {isLoading ? (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span>Executing request...</span>
      </div>
    ) : (() => {
      // Determine if we should show an error message
      const hasError = !!error || (response && response.testScriptError);

      if (hasError) {
        // Build error message from available sources
        let errorMessage = '';
        if (error) {
          errorMessage = error.message || JSON.stringify(error, null, 2);
        } else if (response && response.testScriptError) {
          errorMessage = response.testScriptError;
        } else if (response && response.status >= 400) {
          errorMessage = `${response.status} ${response.statusText || 'Error'}`;
        } else if (response && response.status === 0) {
          errorMessage = 'Network error – no response received';
        } else {
          errorMessage = 'Request failed – unknown error';
        }

        return (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-semibold text-red-400">Request Failed</h4>
            </div>
            <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all">
              {errorMessage}
            </pre>
          </div>
        );
      }

      if (response) {
        // Normal success response (status 2xx)
        return (
          <div className="space-y-3">
            {/* Existing response display code */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setResponseTab('body')}
                    className={clsx(
                      'text-sm font-medium transition-colors',
                      responseTab === 'body'
                        ? 'text-primary'
                        : 'text-gray-400 hover:text-gray-200'
                    )}
                  >
                    Body
                  </button>
                  <button
                    onClick={() => setResponseTab('headers')}
                    className={clsx(
                      'text-sm font-medium transition-colors',
                      responseTab === 'headers'
                        ? 'text-primary'
                        : 'text-gray-400 hover:text-gray-200'
                    )}
                  >
                    Headers ({response.headers?.length || 0})
                  </button>
                </div>

                <div className="flex items-center gap-5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Status:</span>
                    <span className={clsx(
                      "font-bold px-2 py-0.5 rounded",
                      response.status >= 200 && response.status < 300
                        ? "text-green-400 bg-green-400/10"
                        : "text-red-400 bg-red-400/10"
                    )}>
                      {response.status} {response.statusText}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-400 font-medium">{response.time}ms</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-400 font-medium">{response.size} B</span>
                  </div>
                </div>
              </div>

              {responseTab === 'body' ? (
                <div className="bg-dark-900/60 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96 border border-dark-700">
                  <pre className="text-gray-300 whitespace-pre-wrap break-all">
                    {formatResponseBody(response.data)}
                  </pre>
                </div>
              ) : (
                <div className="bg-dark-900/60 rounded-lg p-4 overflow-auto max-h-96 border border-dark-700">
                  {response.headers && response.headers.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-dark-700">
                          <th className="text-left py-2 font-medium">Header</th>
                          <th className="text-left py-2 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {response.headers.map((h, idx) => (
                          <tr key={idx} className="border-b border-dark-700/50 last:border-0">
                            <td className="py-2 text-gray-300 font-mono">{h.key}</td>
                            <td className="py-2 text-gray-400 font-mono break-all">{h.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-sm">No response headers received</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      // No response yet
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-400 min-h-[140px]">
          <div className="w-14 h-14 bg-dark-800 rounded-xl flex items-center justify-center mb-4 border border-dark-700">
            <Terminal className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-white/80">Execute a request to see response</p>
          <p className="text-xs mt-1">Output will be formatted as JSON by default</p>
        </div>
      );
    })()}
  </>
)}

{bottomPanelTab === 'logs' && (
  <div className="space-y-4">
    {executionHistory && executionHistory.length > 0 ? (
      Object.entries(groupedLogs).map(([groupLabel, items]) => (
        <div key={groupLabel}>
          {/* Group header */}
          <div className="sticky top-0 bg-probestack-bg py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-dark-700">
            {groupLabel}
          </div>
          {/* Items in group */}
          <div className="space-y-2 mt-2">
            {items.map((item) => {
              const isExpanded = expandedLogId === item.historyId;
              const fullDetails = logDetails[item.historyId];
              const isLoading = loadingLogDetails[item.historyId];
              return (
                <div key={item.historyId || `log-${item.date}`} className="border border-dark-700 rounded-lg overflow-visible">
                  {/* Summary row – same layout as collection run */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-dark-800/30 transition-colors cursor-pointer"
                    onClick={async () => {
                      if (isExpanded) {
                        setExpandedLogId(null);
                      } else {
                        setExpandedLogId(item.historyId);
                        await fetchLogDetails(item.historyId);
                      }
                    }}
                  >
                    {/* Chevron */}
                    <div className="w-4 h-4 shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </div>

                    {/* Method badge */}
                    <span className={clsx(
                      'text-[10px] font-bold w-10 text-center shrink-0',
                      item.method === 'GET' && 'text-green-400',
                      item.method === 'POST' && 'text-yellow-400',
                      'text-purple-400'
                    )}>
                      {item.method}
                    </span>

                    {/* Request name */}
                    <span className="text-xs text-gray-300 truncate flex-1">{item.url}</span>

                    {/* Status badge */}
                    {item.status > 0 ? (
                      <span className={clsx(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded',
                        item.status >= 200 && item.status < 300
                          ? 'text-green-400 bg-green-400/10'
                          : 'text-red-400 bg-red-400/10'
                      )}>
                        {item.status}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-red-400 bg-red-400/10">ERR</span>
                    )}

                    {/* Time */}
                    <span className="text-xs text-gray-500 w-14 text-right">{item.time}ms</span>
                  </div>

                  {/* URL line – always visible, indented */}
                  <div className="pl-[76px] pr-3 pb-1 text-[10px] text-gray-500 truncate">
                    {item.url}
                  </div>

                  {/* Expanded details (same as before) */}
                  {isExpanded && (
                    <div className="pl-[76px] pr-3 pb-3 space-y-2">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                          Loading details...
                        </div>
                      ) : fullDetails ? (
                        <>
                          <DetailSection
                            title="Request Headers"
                            sectionKey="reqHeaders"
                            requestId={item.historyId}
                            expandedSections={expandedLogSections}
                            setExpandedSections={setExpandedLogSections}
                          >
                            {fullDetails.request_headers?.length > 0 ? (
                              <KeyValueTable items={fullDetails.request_headers} />
                            ) : (
                              <p className="text-xs text-gray-500">No request headers</p>
                            )}
                          </DetailSection>

                          <DetailSection
                            title="Request Body"
                            sectionKey="reqBody"
                            requestId={item.historyId}
                            expandedSections={expandedLogSections}
                            setExpandedSections={setExpandedLogSections}
                          >
                            {fullDetails.request_body ? (
                              <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-2 rounded overflow-auto max-h-40">
                                {formatResponseBody(fullDetails.request_body)}
                              </pre>
                            ) : (
                              <p className="text-xs text-gray-500">No request body</p>
                            )}
                          </DetailSection>

                          <DetailSection
                            title="Response Headers"
                            sectionKey="resHeaders"
                            requestId={item.historyId}
                            expandedSections={expandedLogSections}
                            setExpandedSections={setExpandedLogSections}
                          >
                            {fullDetails.response_headers?.length > 0 ? (
                              <KeyValueTable items={fullDetails.response_headers} />
                            ) : (
                              <p className="text-xs text-gray-500">No response headers</p>
                            )}
                          </DetailSection>

                          <DetailSection
                            title="Response Body"
                            sectionKey="resBody"
                            requestId={item.historyId}
                            expandedSections={expandedLogSections}
                            setExpandedSections={setExpandedLogSections}
                          >
                            {fullDetails.response_body ? (
                              <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-2 rounded overflow-auto max-h-40">
                                {formatResponseBody(fullDetails.response_body)}
                              </pre>
                            ) : (
                              <p className="text-xs text-gray-500">No response body</p>
                            )}
                          </DetailSection>
                        </>
                      ) : (
                        <p className="text-xs text-red-400">Failed to load details</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))
    ) : (
      <div className="text-gray-500">No execution logs</div>
    )}
  </div>
)}

              {bottomPanelTab === 'validation' && (
                <div className="space-y-2">
                  {response ? (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        {response.status >= 200 && response.status < 300 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300">Status code validation passed</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-gray-300">Status code validation failed</span>
                          </>
                        )}
                      </div>

                      {/* Test Results */}
                      {response.testResults && response.testResults.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          <div className="text-xs font-semibold text-gray-400 mb-2">Test Results:</div>
                          {response.testResults.map((test, index) => (
                            <div
                              key={index}
                              className={clsx(
                                "flex items-center gap-2 text-xs p-2 rounded",
                                test.passed ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                              )}
                            >
                              {test.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              <span className="flex-1">{test.name}</span>
                              {!test.passed && test.error && (
                                <span className="text-[10px] opacity-75">({test.error})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : tests ? (
                        <div className="text-xs text-gray-500">No test assertions found. Use pm.test() to add tests.</div>
                      ) : (
                        <div className="text-xs text-gray-500">No custom validation tests configured</div>
                      )}

                      {response.testScriptError && (
                        <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded mt-2">
                          Test Script Error: {response.testScriptError}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-500">Configure validation tests to see results</div>
                  )}
                </div>
              )}

{/* ========== COLLECTION RUN TAB ========== */}
{bottomPanelTab === 'collection-run' && (
  <div className="space-y-4">
    {collectionRunResults ? (
      <>
        {/* Header (same as before) */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-200">
              {collectionRunResults.collectionName}
            </span>
            {collectionRunResults.status === 'running' ? (
              <span className="flex items-center gap-1.5 text-xs text-yellow-400">
                <div className="w-3 h-3 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
                Running...
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'text-xs px-2 py-0.5 rounded font-medium',
                  collectionRunResults.failedRequests === 0
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-red-400 bg-red-400/10'
                )}>
                  {collectionRunResults.passedRequests} / {collectionRunResults.totalRequests} Passed
                </span>
                {collectionRunResults.failedRequests > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded font-medium text-red-400 bg-red-400/10">
                    {collectionRunResults.failedRequests} Failed
                  </span>
                )}
              </div>
            )}
          </div>
  {collectionRunResults.status === 'completed' && (
    <span className="text-xs text-gray-500">
      {collectionRunResults.totalRequests} requests completed in{' '}
      {collectionRunResults.results?.reduce((sum, r) => sum + (r.time || 0), 0)}ms
    </span>
  )}
        </div>

        {/* Progress Bar for Running State (same as before) */}
        {collectionRunResults.status === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                Executing: {collectionRunResults.currentRequest}
              </span>
              <span className="text-gray-500">
                {collectionRunResults.currentIndex + 1} / {collectionRunResults.totalRequests}
              </span>
            </div>
            <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${((collectionRunResults.currentIndex + 1) / collectionRunResults.totalRequests) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Flat list of requests */}
        {collectionRunResults.results && collectionRunResults.results.length > 0 && (
          <div className="space-y-2">
{collectionRunResults.results.map((result) => {
  const isExpanded = expandedRunRequestId === result.requestId;
  const folderName = result.fullDetails?.folder_name;
  return (
    <div key={result.requestId} className="border border-dark-700 rounded-lg overflow-visible">
      {/* Summary row – click to expand */}
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-dark-800/30 transition-colors cursor-pointer"
        onClick={() => setExpandedRunRequestId(isExpanded ? null : result.requestId)}
      >
        {/* Chevron */}
        <div className="w-4 h-4 shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </div>

        {/* Method badge */}
        <span className={clsx(
          'text-[10px] font-bold w-10 text-center shrink-0',
          result.method === 'GET' && 'text-green-400',
          result.method === 'POST' && 'text-yellow-400',
          result.method === 'PUT' && 'text-blue-400',
          result.method === 'DELETE' && 'text-red-400',
          'text-purple-400'
        )}>
          {result.method}
        </span>

        {/* Folder icon (if any) */}
        {folderName && (
          <div className="relative group shrink-0">
            <Folder className="w-3.5 h-3.5 text-amber-500/70" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-dark-700 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              {folderName}
            </div>
          </div>
        )}

        {/* Request name – takes remaining space */}
        <span className="text-xs text-gray-300 truncate flex-1">{result.requestName}</span>

        {/* Status badge */}
        {result.status > 0 ? (
          <span className={clsx(
            'text-[10px] font-bold px-1.5 py-0.5 rounded',
            result.success ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
          )}>
            {result.status}
          </span>
        ) : (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-red-400 bg-red-400/10">ERR</span>
        )}

        {/* Time */}
        <span className="text-xs text-gray-500 w-14 text-right">{result.time}ms</span>
      </div>

      {/* URL line – always visible, indented */}
      <div className="pl-[76px] pr-3 pb-1 text-[10px] text-gray-500 truncate">
        {result.url}
      </div>

      {/* Error message (if any) */}
      {result.error && (
        <div className="pl-[76px] pr-3 pb-2 text-[10px] text-red-400">{result.error}</div>
      )}

                  {/* Expanded details – always show four sections */}
                  {isExpanded && result.fullDetails && (
                    <div className="ml-[52px] mb-3 space-y-2">
                      {/* Request Headers */}
                      <DetailSection
                        title="Request Headers"
                        sectionKey="reqHeaders"
                        requestId={result.requestId}
                        expandedSections={expandedRunSections}
                        setExpandedSections={setExpandedRunSections}
                      >
                        {result.fullDetails.request_headers?.length > 0 ? (
                          <KeyValueTable items={result.fullDetails.request_headers} />
                        ) : (
                          <p className="text-xs text-gray-500">No request headers</p>
                        )}
                      </DetailSection>

                      {/* Request Body */}
                      <DetailSection
                        title="Request Body"
                        sectionKey="reqBody"
                        requestId={result.requestId}
                        expandedSections={expandedRunSections}
                        setExpandedSections={setExpandedRunSections}
                      >
                        {result.fullDetails.request_body ? (
                          <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-2 rounded overflow-auto max-h-40">
                            {formatResponseBody(result.fullDetails.request_body)}
                          </pre>
                        ) : (
                          <p className="text-xs text-gray-500">No request body</p>
                        )}
                      </DetailSection>

                      {/* Response Headers */}
                      <DetailSection
                        title="Response Headers"
                        sectionKey="resHeaders"
                        requestId={result.requestId}
                        expandedSections={expandedRunSections}
                        setExpandedSections={setExpandedRunSections}
                      >
                        {result.fullDetails.response_headers?.length > 0 ? (
                          <KeyValueTable items={result.fullDetails.response_headers} />
                        ) : (
                          <p className="text-xs text-gray-500">No response headers</p>
                        )}
                      </DetailSection>

                      {/* Response Body */}
                      <DetailSection
                        title="Response Body"
                        sectionKey="resBody"
                        requestId={result.requestId}
                        expandedSections={expandedRunSections}
                        setExpandedSections={setExpandedRunSections}
                      >
                        {result.fullDetails.response_body ? (
                          <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-2 rounded overflow-auto max-h-40">
                            {formatResponseBody(result.fullDetails.response_body)}
                          </pre>
                        ) : (
                          <p className="text-xs text-gray-500">No response body</p>
                        )}
                      </DetailSection>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    ) : (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400 min-h-[140px]">
        <div className="w-14 h-14 bg-dark-800 rounded-xl flex items-center justify-center mb-4 border border-dark-700">
          <Play className="h-7 w-7 text-gray-500" />
        </div>
        <p className="text-sm font-medium text-white/80">No collection run yet</p>
        <p className="text-xs mt-1">Right-click a collection and select &quot;Run Collection&quot; to start</p>
      </div>
    )}
  </div>
)}
            </div>
          )}
        </ResizableBottomPanel>

        {/* Save Request Modal */}
<SaveRequestModal
  isOpen={showSaveModal}
  onClose={() => setShowSaveModal(false)}
  onSave={(saveData) => {
    if (onSaveRequest) {
      const currentRequest = requests[activeRequestIndex];
      onSaveRequest({
        ...saveData,
        request: {
          id: currentRequest.id,
          name: saveData.requestName || currentRequest.name || 'Untitled Request',
          method: method,
          url: url,
          path: url,
          queryParams: queryParams,
          headers: headers,
          body: body,
          authType: authType,
          authData: authData,
          preRequestScript: preRequestScript,
          tests: tests,
          type: 'request',
          folderId: saveData.folderId // pass folderId
        }
      });
    }
  }}
  requestName={requests[activeRequestIndex]?.name || 'Untitled Request'}
  collections={collections}
  activeWorkspaceId={activeWorkspaceId}   
/>
      </>
    )}
  </div>
);
}
