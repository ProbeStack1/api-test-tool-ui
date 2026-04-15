import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Globe, Key, Menu, FileText, Shield, CheckCircle2, XCircle, Clock, Database, AlertCircle, Plus, Terminal, X, Save, Folder, ChevronDown, ChevronRight, Loader2, History, ArrowUpRight, Check } from 'lucide-react';
import KeyValueEditor from './KeyValueEditor';
import AuthPanel from './AuthPanel';
import ResizableBottomPanel from './ResizableBottomPanel';
import SaveRequestModal from './modals/SaveRequestModal';
import WorkspaceDetailsView from './detailsTab/WorkspaceDetailsView';
import CollectionRunView from './detailsTab/CollectionRunDetailsView';
import CollectionRunResultsView from './detailsTab/CollectionRunResultsView';
import { toast } from 'sonner';
import clsx from 'clsx';
import LoadTestResultsView from './detailsTab/LoadTestResultsView';
import LoadTestRunningView from './detailsTab/LoadTestRunningView';
import VariableHighlightInput from '../components/VariableHighlightInput';
import MockServerEditor from './detailsTab/MockServerEditor';
import MockServerWizardTab from './detailsTab/MockServerWizardTab';
import ProjectWizardTab from './detailsTab/ProjectWizardTab';
import JsonEditorWithVariables from './ui/JsonEditorWithVariables';
import FormDataEditor from './FormDataEditor';

const formatTimeOfDay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// ========== SSE Event Viewer — Postman-style collapsible cards ==========
function SseEventViewer({ events = [], skipped = 0, totalCount = 0 }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new events arrive (only if user is near bottom)
  const prevLenRef = useRef(events.length);
  useEffect(() => {
    if (events.length > prevLenRef.current && containerRef.current) {
      const el = containerRef.current;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom) {
        requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
      }
    }
    prevLenRef.current = events.length;
  }, [events.length]);

  const toggle = (idx) => setExpandedIdx(prev => prev === idx ? null : idx);

  // Pretty-print JSON for expanded view
  const prettyPrint = (raw) => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch { return raw; }
  };

  if (!events || events.length === 0) {
    return <div className="text-gray-500 text-sm p-4 italic">Waiting for events...</div>;
  }

  return (
    <div ref={containerRef} className="overflow-auto max-h-[420px] space-y-0" data-testid="sse-event-viewer">
      {skipped > 0 && (
        <div className="text-xs text-gray-500 px-3 py-1 border-b border-dark-700/50 bg-dark-900/30">
          {skipped} earlier events scrolled off
        </div>
      )}
      {events.map((evt, idx) => {
        const isOpen = expandedIdx === idx;
        // Truncated single-line preview
        let preview = evt.data || '';
        if (preview.length > 120) preview = preview.substring(0, 120) + '...';

        return (
          <div key={evt.index || idx} className="border-b border-dark-700/40" data-testid={`sse-event-${idx}`}>
            {/* Collapsed header row */}
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dark-700/30 transition-colors"
            >
              <ChevronRight className={clsx('h-3.5 w-3.5 text-gray-500 transition-transform shrink-0', isOpen && 'rotate-90')} />
              <span className="text-xs font-semibold text-emerald-400 shrink-0">{evt.type || 'message'}</span>
              <span className="text-xs text-gray-500 font-mono truncate flex-1">{preview}</span>
              <span className="text-xs text-gray-600 font-mono shrink-0 ml-auto">{evt.timestamp}</span>
            </button>
            {/* Expanded: full JSON with syntax coloring */}
            {isOpen && (
              <div className="bg-dark-900/60 border-t border-dark-700/30 px-4 py-3">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed max-h-72 overflow-auto">
                  {prettyPrint(evt.data)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-gray-400 min-h-[200px]">
      <div className="w-14 h-14 bg-[var(--color-card-bg)] rounded-xl flex items-center justify-center mb-4 border border-dark-700 dark:border-dark-600">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

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
  globalVars,
  globalValues,
  onLoadTestComplete,
  onBodyTypeChange,
  onCreateMockServer,
  onUpdateMockServer,
  onFetchRequestHistory,
  onFetchMockEndpointHistory,
  onMcpTypeChange,
  onUpdateTab,
  onSelectWorkspace,
  onProtocolChange,
  isMcpContext = false,
  onSaveResponse,
  readOnly = false,
  formData = [],
  onFormDataChange,
  advancedUrlEncoded = false,
  onAdvancedUrlEncodedChange,
}) {
  const [activeSection, setActiveSection] = useState('params');
  const [bottomPanelTab, setBottomPanelTab] = useState('response');
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);
  const [bodyType, setBodyType] = useState('raw');
  const [rawBodyFormat, setRawBodyFormat] = useState('json');
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
  const [requestHistory, setRequestHistory] = useState([]);
  const [mockRequestHistory, setMockRequestHistory] = useState([]);
  const syncSource = useRef(null);
  const tabsContainerRef = useRef(null);
  const [bodyJsonError, setBodyJsonError] = useState('');
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [bottomPanelResetKey, setBottomPanelResetKey] = useState(0);
  const [hoveredTab, setHoveredTab] = useState(null);
  const tabRefs = useRef([]);
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const methodDropdownRef = useRef(null);
  const [isProtocolOpen, setIsProtocolOpen] = useState(false);
  const [formDataForFormData, setFormDataForFormData] = useState([]);
const [formDataForUrlEncoded, setFormDataForUrlEncoded] = useState([]);
  const protocolDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(event.target)) {
        setIsMethodOpen(false);
      }
      if (protocolDropdownRef.current && !protocolDropdownRef.current.contains(event.target)) {
        setIsProtocolOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateRequestBodyJson = (value) => {
    if (rawBodyFormat !== 'json') {
      setBodyJsonError('');
      return true;
    }
    if (!value.trim()) {
      setBodyJsonError('');
      return true;
    }
    try {
      JSON.parse(value);
      setBodyJsonError('');
      return true;
    } catch (e) {
      setBodyJsonError('Invalid JSON format');
      return false;
    }
  };

  // Scroll active tab into view when active index or tab count changes
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTab = tabsContainerRef.current.querySelector(`[data-index="${activeRequestIndex}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeRequestIndex, requests.length]);



  const fetchLogDetails = async (historyId) => {
    // console.log('fetchLogDetails called for', historyId);
    if (isMockEndpoint) {
      // For mock endpoints, details are already stored in logDetails from the initial load
      if (logDetails[historyId]) return;
      // If not found, try to find in mockRequestHistory and store
      const found = mockRequestHistory.find(item => item.historyId === historyId);
      if (found) {
        const details = {
          request_body: found.requestBody,
          response_body: found.responseBody,
          request_headers: found.requestHeaders,
          response_headers: found.responseHeaders,
          method: found.method,
          url: found.url,
          status_code: found.status,
          status_text: found.status >= 400 ? 'Error' : 'OK',
          response_time_ms: found.time,
          response_size_bytes: found.size,
        };
        setLogDetails(prev => ({ ...prev, [historyId]: details }));
      } else {
        toast.error('Mock log details not available');
      }
      return;
    }

    // Regular request history
    if (!onFetchHistoryEntry) {
      toast.error('History fetch function not available');
      return;
    }
    // Guard: skip backend call if historyId is null/undefined (e.g. SSE local entries)
    if (!historyId || historyId === 'null') {
      return;
    }
    if (logDetails[historyId]) return;
    setLoadingLogDetails(prev => ({ ...prev, [historyId]: true }));
    try {
      const response = await onFetchHistoryEntry(historyId);
      // console.log('fetchLogDetails response', response);
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



  const handleSendClick = () => {
    const hasUrl = Boolean(url && url.trim());
    if (!hasUrl || isLoading) return;

    setBottomPanelCollapsed(false);
    setBottomPanelTab('response');
    onExecute();
  };

  const currentReq = requests[activeRequestIndex];
  const effectiveResponse = currentReq?.response || response;
  const isWorkspaceDetails = currentReq?.type === 'workspace-details';
  const isCollectionRun = currentReq?.type === 'collection-run';
  const isMockEndpoint = currentReq?.isMockEndpoint === true;
  const pristine = pristineRequests?.[currentReq?.id];
  const isCollectionRunResults = currentReq?.type === 'collection-run-results';
  const isLoadTestResults = currentReq?.type === 'load-test-results';
  const isLoadTestRunning = currentReq?.type === 'load-test-running';
  const isMockWizard = currentReq?.type === 'mock-wizard';
  const isMockEditor = currentReq?.type === 'mock-editor';
  const isMcpRequest = currentReq?.protocol === 'MCP' ||
    currentReq?.type === 'mcp-request' ||
    isMcpContext;
  const mcpType = currentReq?.mcpType || 'sse';
  const isProjectWizard = currentReq?.type === 'project-wizard';
  const mcpServerUrl = currentReq?.mcpServerUrl || 'http://localhost:3001';
  const mcpTransport = currentReq?.mcpTransport || 'http';

  const handleMcpServerUrlChange = (value) => {
    const updatedRequest = { ...currentReq, mcpServerUrl: value };
    onUpdateTab(activeRequestIndex, updatedRequest);
  };

  const handleMcpTransportChange = (value) => {
    const updatedRequest = { ...currentReq, mcpTransport: value };
    onUpdateTab(activeRequestIndex, updatedRequest);
  };

  const sections = [
    { id: 'params', label: 'Params', count: paramsCount },
    { id: 'headers', label: 'Headers', count: headersCount },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'pre-request', label: 'Pre-request Script' },
    { id: 'tests', label: 'Tests' },
  ];

  if (isMcpRequest) {
    sections.push({ id: 'mcp', label: 'Mcp' });
  }
  // ----- GROUPED LOGS (must be after isMockEndpoint) -----
  const historyToUse = isMockEndpoint ? mockRequestHistory : requestHistory;
  const groupedLogs = useMemo(() => {
    const groups = {};
    if (!historyToUse) return groups;
    historyToUse.forEach(item => {
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
  }, [historyToUse]);

// Sync local state when the parent formData prop changes
useEffect(() => {
  if (bodyType === 'form-data') {
    setFormDataForFormData(formData);
  } else if (bodyType === 'x-www-form-urlencoded') {
    setFormDataForUrlEncoded(formData);
  }
}, [formData, bodyType]);

  // ----- LOAD MOCK HISTORY (initial load) -----
  useEffect(() => {
    // console.log('[MockHistory] Loading, isMockEndpoint:', isMockEndpoint);
    if (!isMockEndpoint) {
      setMockRequestHistory([]);
      return;
    }
    const endpointId = currentReq?.mockEndpoint?.id || currentReq?.mockEndpointId;
    // console.log('[MockHistory] endpointId:', endpointId);
    if (endpointId && onFetchMockEndpointHistory) {
      onFetchMockEndpointHistory(endpointId)
        .then(res => {
          let items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const normalized = items.map(item => ({
            historyId: item.id,
            date: item.timestamp,
            method: item.method,
            url: item.path,
            status: item.responseStatus,
            time: item.responseTimeMs,
            size: 0,
            error: item.responseStatus >= 400,
            requestBody: item.requestBody,
            responseBody: item.responseBody,
            requestHeaders: item.requestHeaders,
            responseHeaders: item.responseHeaders,
          }));
          setMockRequestHistory(normalized);
          // Store full details for each history entry
          const detailsMap = {};
          normalized.forEach(item => {
            detailsMap[item.historyId] = {
              request_body: item.requestBody,
              response_body: item.responseBody,
              request_headers: item.requestHeaders,
              response_headers: item.responseHeaders,
              method: item.method,
              url: item.url,
              status_code: item.status,
              status_text: item.status >= 400 ? 'Error' : 'OK',
              response_time_ms: item.time,
              response_size_bytes: item.size,
            };
          });
          setLogDetails(prev => ({ ...prev, ...detailsMap }));
        })
        .catch(err => {
          console.error('[MockHistory] Fetch failed:', err);
          setMockRequestHistory([]);
        });
    } else {
      console.warn('[MockHistory] Missing endpointId or onFetchMockEndpointHistory');
      setMockRequestHistory([]);
    }
  }, [isMockEndpoint, currentReq?.mockEndpoint?.id, currentReq?.mockEndpointId, onFetchMockEndpointHistory]);

  // ----- LOAD REQUEST HISTORY (must be after currentReq) -----
  useEffect(() => {
    const requestId = currentReq?.id;
    if (!requestId) {
      setRequestHistory([]);
      return;
    }
    const isSaved = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
    if (isSaved && onFetchRequestHistory) {
      onFetchRequestHistory(requestId)
        .then(res => {
          let rawData = res.data || res;
          let items = [];
          if (rawData && typeof rawData === 'object' && Array.isArray(rawData.data)) {
            items = rawData.data;
          } else if (Array.isArray(rawData)) {
            items = rawData;
          }
          const normalized = items.map(item => ({
            historyId: item.history_id,
            date: item.executed_at,
            method: item.method,
            url: item.url,
            status: item.status_code,
            time: item.response_time_ms,
            size: item.response_size_bytes,
            error: !!item.error_message,
            ...item
          }));
          setRequestHistory(normalized);
        })
        .catch(err => {
          console.error('Failed to fetch request history:', err);
          setRequestHistory([]);
        });
    } else {
      setRequestHistory([]);
    }
  }, [currentReq?.id, onFetchRequestHistory]);

  // ----- AUTO‑REFRESH REQUEST HISTORY AFTER EXECUTION -----
  const prevIsLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (prevIsLoadingRef.current === true && isLoading === false) {
      const requestId = currentReq?.id;
      const isSaved = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
      // Skip history fetch for SSE — SSE uses browser EventSource, no backend history entry
      const isSSE = (currentReq?.protocol || '').toLowerCase() === 'sse';
      if (isSaved && !isSSE && onFetchRequestHistory) {
        onFetchRequestHistory(requestId)
          .then(res => {
            let rawData = res.data || res;
            let items = [];
            if (rawData && typeof rawData === 'object' && Array.isArray(rawData.data)) {
              items = rawData.data;
            } else if (Array.isArray(rawData)) {
              items = rawData;
            }
            const normalized = items.map(item => ({
              historyId: item.history_id,
              date: item.executed_at,
              method: item.method,
              url: item.url,
              status: item.status_code,
              time: item.response_time_ms,
              size: item.response_size_bytes,
              error: !!item.error_message,
              ...item
            }));
            setRequestHistory(normalized);
          })
          .catch(err => console.error('Failed to refresh request history:', err));
      }
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, currentReq?.id, onFetchRequestHistory]);

  // ----- AUTO‑REFRESH MOCK HISTORY AFTER EXECUTION -----
  const prevMockIsLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (prevMockIsLoadingRef.current === true && isLoading === false && isMockEndpoint) {
      const endpointId = currentReq?.mockEndpoint?.id;
      if (endpointId && onFetchMockEndpointHistory) {
        onFetchMockEndpointHistory(endpointId)
          .then(res => {
            let items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const normalized = items.map(item => ({
              historyId: item.id,
              date: item.timestamp,
              method: item.method,
              url: item.path,
              status: item.responseStatus,
              time: item.responseTimeMs,
              size: 0,
              error: item.responseStatus >= 400,
              requestBody: item.requestBody,
              responseBody: item.responseBody,
              requestHeaders: item.requestHeaders,
              responseHeaders: item.responseHeaders,
            }));
            setMockRequestHistory(normalized);
            // Update logDetails with new entries
            const detailsMap = {};
            normalized.forEach(item => {
              detailsMap[item.historyId] = {
                request_body: item.requestBody,
                response_body: item.responseBody,
                request_headers: item.requestHeaders,
                response_headers: item.responseHeaders,
                method: item.method,
                url: item.url,
                status_code: item.status,
                status_text: item.status >= 400 ? 'Error' : 'OK',
                response_time_ms: item.time,
                response_size_bytes: item.size,
              };
            });
            setLogDetails(prev => ({ ...prev, ...detailsMap }));
          })
          .catch(err => console.error('Failed to refresh mock history:', err));
      }
    }
    prevMockIsLoadingRef.current = isLoading;
  }, [isLoading, isMockEndpoint, currentReq?.mockEndpoint?.id, onFetchMockEndpointHistory]);

  useEffect(() => {
    const reqBodyType = currentReq?.bodyType;
    if (reqBodyType && ['none', 'form-data', 'x-www-form-urlencoded', 'raw'].includes(reqBodyType)) {
      setBodyType(reqBodyType);
    } else if (reqBodyType === undefined) {
      // fallback for old saved requests that don't have bodyType
      setBodyType('raw');
    }
  }, [currentReq?.bodyType]);

  const hasUnsavedChanges = useMemo(() => {
    if (!pristine || !isSavedRequest(currentReq)) {
      return false;
    }
    const fieldsToCompare = ['method', 'url', 'queryParams', 'headers', 'body', 'authType', 'authData', 'preRequestScript', 'tests', 'name', 'bodyType'];
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

  const handleBodyTypeRadioChange = (newType) => {
  // Save current data to the old type's state
  if (bodyType === 'form-data') {
    setFormDataForFormData(formData);
  } else if (bodyType === 'x-www-form-urlencoded') {
    setFormDataForUrlEncoded(formData);
  }
  // Change the body type
  setBodyType(newType);
  // Load the data for the new type into the parent
  const newData = newType === 'form-data' ? formDataForFormData : formDataForUrlEncoded;
  onFormDataChange(newData);
  if (onBodyTypeChange) onBodyTypeChange(newType);
};

  // Tooltip component for size details (right-aligned to avoid overflow)
  function SizeDetailsTooltip({ requestSize, requestHeadersSize, requestBodySize, responseSize, responseHeadersSize, responseBodySize, network }) {
    if (!requestSize && !responseHeadersSize && !responseBodySize) return null;

    return (
      <div className="absolute z-50 invisible group-hover:visible bg-[var(--color-card-bg)] border border-dark-600 rounded-lg shadow-xl p-3 text-xs text-gray-300 right-0 top-full mt-2 min-w-[200px] whitespace-normal">
        <div className="space-y-2">
          <div className="font-semibold text-gray-200 border-b border-dark-600 pb-1">Request Size</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span>Total:</span>
              <span className="font-mono text-sm text-gray-400">{requestSize} B</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Headers:</span>
              <span className="font-mono text-sm text-gray-400">{requestHeadersSize} B</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Body:</span>
              <span className="font-mono text-sm text-gray-400">{requestBodySize} B</span>
            </div>
          </div>
          <div className="font-semibold text-gray-200 border-b border-dark-600 pt-1 pb-1">Response Size</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span>Total:</span>
              <span className="font-mono text-sm text-gray-400">{responseSize} B</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Headers:</span>
              <span className="font-mono text-sm text-gray-400">{responseHeadersSize} B</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Body:</span>
              <span className="font-mono text-sm text-gray-400">{responseBodySize} B</span>
            </div>
          </div>
          {network && (network.httpVersion || network.localAddress || network.remoteAddress) && (
            <>
              <div className="font-semibold text-gray-200 border-b border-dark-600 pt-1 pb-1">Network</div>
              <div className="space-y-1">
                {network.httpVersion && (
                  <div className="flex justify-between gap-4">
                    <span>HTTP Version:</span>
                    <span className="font-mono text-sm text-gray-400">{network.httpVersion}</span>
                  </div>
                )}
                {network.localAddress && (
                  <div className="flex justify-between gap-4">
                    <span>Local Address:</span>
                    <span className="font-mono text-sm text-gray-400">{network.localAddress}</span>
                  </div>
                )}
                {network.remoteAddress && (
                  <div className="flex justify-between gap-4">
                    <span>Remote Address:</span>
                    <span className="font-mono text-sm text-gray-400">{network.remoteAddress}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="absolute right-3 top-[-6px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-dark-600"></div>
      </div>
    );
  }

  // Waterfall Tooltip
  function TimeDetailsTooltip({ traceSteps, totalTime }) {
    if (!traceSteps || traceSteps.length === 0) return null;

    // Process steps with proper durations
    let cumulativeTime = 0;
    const processedSteps = traceSteps
      .map(step => {
        let duration = step.duration_ms || 0;
        if (duration === 0 && step.details) {
          const match = step.details.match(/(\d+(?:\.\d+)?)\s*ms/);
          if (match) duration = parseFloat(match[1]);
        }
        const startTime = cumulativeTime;
        cumulativeTime += duration;

        return {
          name: step.step_name,
          duration: parseFloat(duration.toFixed(2)),
          startTime: startTime,
        };
      })
      .filter(step => step.duration > 0);

    const maxTime = cumulativeTime || totalTime || 1;

    // Color mapping (close to Postman)
    const getBarColor = (name) => {
      const n = name.toLowerCase();
      if (n.includes('waiting') || n.includes('ttfb')) return 'bg-orange-500';
      if (n.includes('download')) return 'bg-emerald-400';
      if (n.includes('process') || n.includes('prepare')) return 'bg-sky-400';
      return 'bg-gray-400';
    };

    return (
      <div className="absolute z-50 invisible group-hover:visible border bg-[var(--color-card-bg)] border-dark-600 rounded-lg shadow-2xl p-4 text-sm text-gray-300 right-0 top-full mt-2 min-w-[320px]">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-dark-600">
            <span className="font-semibold text-white">Response Time</span>
            <span className="font-mono text-white font-medium">{totalTime} ms</span>
          </div>

          {/* Waterfall Graph */}
          <div className="space-y-0">
            {processedSteps.map((step, idx) => {
              const startPercent = (step.startTime / maxTime) * 100;
              const widthPercent = (step.duration / maxTime) * 100;

              return (
                <div key={idx} className="flex items-center gap-1">
                  {/* Step Name */}
                  <div className="w-25 text-gray-200 text-sm font-medium truncate">
                    {step.name}
                  </div>

                  {/* Timeline Bar Container */}
                  <div className="flex-1 h-5 relative overflow-hidden">
                    {/* The actual colored bar starting from previous end */}
                    <div
                      className={`absolute h-full ${getBarColor(step.name)}`}
                      style={{
                        left: `${startPercent}%`,
                        width: `${Math.max(widthPercent, 3)}%`,
                      }}
                    />
                  </div>

                  {/* Duration */}
                  <div className="font-mono text-gray-400 w-10 text-right text-sm tabular-nums">
                    {step.duration} ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="absolute right-6 top-[-7px] w-0 h-0 border-l-[7px] border-r-[7px] border-b-[7px] border-transparent border-b-[#1e2937]"></div>
      </div>
    );
  }

  // Helper component for step info tooltip
  function StepInfoTooltip({ stepName }) {
    const descriptions = {
      "Request Preparation": "Time spent building the request URL, headers, and body before sending.",
      "Waiting (TTFB)": "Time from sending the request until the first byte of response is received (server processing + network latency).",
      "Download": "Time taken to receive the full response body after the first byte.",
      "Process": "Time spent parsing the response (JSON, headers) and preparing for display.",
      "Network Connection & Request": "Combined time for DNS lookup, TCP handshake, SSL negotiation, and sending the request.",
      "Send HTTP Request": "Time to transmit the request data over the network.",
      "Receive HTTP Response": "Time to receive the response status and headers (before body).",
    };

    const description = descriptions[stepName] || "Step in the request execution process.";

    return (
      <div className="absolute z-50 invisible group-hover:visible bg-[var(--color-card-bg)] border border-dark-600 rounded-lg shadow-xl p-2 text-xs text-gray-300 max-w-xs whitespace-normal left-0 top-full mt-1 min-w-[200px]">
        <div className="text-gray-200 font-medium mb-1">{stepName}</div>
        <div className="text-gray-400">{description}</div>
        <div className="absolute left-3 top-[-6px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-dark-600"></div>
      </div>
    );
  }

  function DebugPanel({ response, error, isLoading }) {
    if (isLoading) {
      return <div className="text-gray-400 animate-pulse">Executing request...</div>;
    }
    if (!response && !error) {
      return <EmptyState
        icon={AlertCircle}
        title="No debug information"
        description="Execute a request to see detailed execution steps"
      />;
    }

    const traceSteps = response?.traceSteps || [];
    const isSuccess = response?.isSuccess === true;

    // Helper: get effective duration (from duration_ms or parsed from details)
    const getEffectiveDuration = (step) => {
      if (step.duration_ms > 0) return step.duration_ms;
      if (step.details) {
        const match = step.details.match(/(\d+(?:\.\d+)?)\s*ms/);
        if (match) return parseFloat(match[1]);
      }
      return 0;
    };

    // Helper: format time as HH:MM:SS.mmm
    const formatTime = (isoString) => {
      if (!isoString) return '—';
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    };

    // Smart suggestion (DNS, connection refused, etc.)
    const getSmartSuggestion = (errorMsg) => {
      if (!errorMsg) return null;
      const msg = errorMsg.toLowerCase();
      if (msg.includes('unknownhost') || msg.includes('failed to resolve')) {
        return {
          title: 'DNS Resolution Failed',
          action: 'Check the URL hostname for typos. Verify that the domain name exists and your DNS settings are working.',
        };
      }
      if (msg.includes('connection refused')) {
        return { title: 'Connection Refused', action: 'The server actively rejected the connection. Ensure the server is running and the port is open.' };
      }
      if (msg.includes('timeout')) {
        return { title: 'Request Timeout', action: 'The server did not respond within the allowed time. Increase the timeout value or check server responsiveness.' };
      }
      if (msg.includes('ssl') || msg.includes('certificate')) {
        return { title: 'SSL/TLS Error', action: 'There is a problem with the server’s SSL certificate. Try using "insecure" option for testing.' };
      }
      if (msg.includes('401')) return { title: 'Unauthorized', action: 'Check your API key, token, or credentials.' };
      if (msg.includes('403')) return { title: 'Forbidden', action: 'You do not have permission to access this resource.' };
      if (msg.includes('404')) return { title: 'Not Found', action: 'The requested URL does not exist on the server. Double‑check the path.' };
      return null;
    };

    const smartSuggestion = getSmartSuggestion(response?.errorMessage || response?.failureReason || error?.message);
    const totalResponseTime = response?.time || 0;

    return (
      <div className="space-y-4">
        {/* ========== HEADER: Status + Total Time ========== */}
        <div className="flex items-center justify-between pb-2 border-b border-dark-700">
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm font-semibold">
              {isSuccess ? 'Request succeeded' : 'Request failed'}
            </span>
          </div>
          {totalResponseTime > 0 && (
            <span className="text-xs text-gray-400">Total {totalResponseTime}ms</span>
          )}
        </div>

        {/* ========== EXECUTION TIMELINE ========== */}
        {traceSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Execution steps</h4>
            <div className="space-y-2">
              {traceSteps.map((step, idx) => {
                const isFailed = step.step_status === 'FAILED';
                const startRelative = new Date(step.started_at) - new Date(traceSteps[0].started_at);
                const duration = getEffectiveDuration(step);
                return (
                  <div key={idx} className="bg-dark-800/30 rounded-lg p-3 relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isFailed ? (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-200">{step.step_name}</span>
                        <div className="relative group">
                          <div className="cursor-help ml-1 text-gray-500 hover:text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                          </div>
                          <StepInfoTooltip stepName={step.step_name} />
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>⏱ {duration}ms</span>
                        <span>🕒 +{startRelative}ms</span>
                      </div>
                    </div>
                    {step.details && (
                      <div className="mt-1 text-xs text-gray-400 break-words pl-6">{step.details}</div>
                    )}
                    {step.error && (
                      <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1.5 font-mono break-words pl-6">
                        {step.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-sm text-gray-500 pt-1">
              <span>Started: {formatTime(traceSteps[0]?.started_at)}</span>
              <span>Finished: {formatTime(traceSteps[traceSteps.length - 1]?.finished_at)}</span>
            </div>
          </div>
        )}

        {/* ========== ERROR DETAILS (only when failed) ========== */}
        {!isSuccess && (
          <div className="space-y-3 pt-1">
            {(response?.errorMessage || response?.failureReason || error?.message) && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Error</div>
                <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-words">
                  {response?.errorMessage || response?.failureReason || error?.message}
                </pre>
              </div>
            )}
            {smartSuggestion && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary text-xs font-bold">!</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-primary">{smartSuggestion.title}</div>
                    <div className="text-xs text-gray-300 mt-1">{smartSuggestion.action}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Status Code Tooltip component (right-aligned like time/size tooltips)
  function StatusCodeTooltip({ statusCode, statusText }) {
    const descriptions = {
      // 1xx
      100: "Continue: Server received headers, client may send body.",
      101: "Switching Protocols: Server agrees to switch protocol.",
      // 2xx
      200: "OK: Request successful. Server responded as required.",
      201: "Created: New resource created successfully.",
      202: "Accepted: Request accepted but not completed.",
      203: "Non-Authoritative Info: Response from third‑party.",
      204: "No Content: Success, but no content to return.",
      205: "Reset Content: Reset document view.",
      206: "Partial Content: Partial resource delivered.",
      // 3xx
      300: "Multiple Choices: Multiple responses available.",
      301: "Moved Permanently: Resource URL changed permanently.",
      302: "Found: Resource URL changed temporarily.",
      303: "See Other: Response can be found under another URI.",
      304: "Not Modified: Resource not modified since last request.",
      307: "Temporary Redirect: Repeat request with another URI.",
      308: "Permanent Redirect: Use another URI permanently.",
      // 4xx
      400: "Bad Request: Invalid syntax or parameters.",
      401: "Unauthorized: Authentication required.",
      402: "Payment Required: Reserved for future use.",
      403: "Forbidden: You don't have permission.",
      404: "Not Found: Resource could not be found.",
      405: "Method Not Allowed: HTTP method not supported.",
      406: "Not Acceptable: Cannot produce requested response format.",
      407: "Proxy Auth Required: Authenticate with proxy first.",
      408: "Request Timeout: Server timed out waiting.",
      409: "Conflict: Request conflicts with server state.",
      410: "Gone: Resource permanently removed.",
      411: "Length Required: Content-Length header missing.",
      412: "Precondition Failed: Server condition not met.",
      413: "Payload Too Large: Request body too large.",
      414: "URI Too Long: URL too long.",
      415: "Unsupported Media Type: Media format not supported.",
      416: "Range Not Satisfiable: Invalid range requested.",
      417: "Expectation Failed: Expect header cannot be met.",
      418: "I'm a teapot: Server refuses to brew coffee.",
      422: "Unprocessable Entity: Semantic errors in request.",
      423: "Locked: Resource is locked.",
      424: "Failed Dependency: Previous request failed.",
      425: "Too Early: Risk of replay attack.",
      426: "Upgrade Required: Switch to different protocol.",
      428: "Precondition Required: Conditional request required.",
      429: "Too Many Requests: Rate limit exceeded.",
      431: "Request Header Fields Too Large: Headers too big.",
      451: "Unavailable For Legal Reasons: Legal demand.",
      // 5xx
      500: "Internal Server Error: Server encountered an error.",
      501: "Not Implemented: Method not supported by server.",
      502: "Bad Gateway: Invalid response from upstream.",
      503: "Service Unavailable: Server temporarily overloaded.",
      504: "Gateway Timeout: Upstream server timeout.",
      505: "HTTP Version Not Supported: Version not supported.",
      511: "Network Auth Required: Authenticate to access network.",
    };

    const getDescription = (code) => {
      if (descriptions[code]) return descriptions[code];
      if (code >= 100 && code < 200) return `Informational: ${code} – request received.`;
      if (code >= 200 && code < 300) return `Success: ${code} – request processed.`;
      if (code >= 300 && code < 400) return `Redirection: ${code} – further action needed.`;
      if (code >= 400 && code < 500) return `Client Error: ${code} – check request.`;
      if (code >= 500 && code < 600) return `Server Error: ${code} – server issue.`;
      return `${code} ${statusText || ''}`;
    };

    return (
      <div className="absolute z-50 invisible group-hover:visible bg-[var(--color-card-bg)] border border-dark-600 rounded-lg shadow-xl p-3 text-xs text-gray-300 left-1/2 -translate-x-1/2 top-full mt-2 min-w-[200px] max-w-xs whitespace-normal">
        <div className="space-y-1">
          <div className="font-semibold text-gray-200 border-b text-sm border-dark-600 pb-1">
            {statusCode} {statusText}
          </div>
          <div className="text-gray-400 leading-relaxed">{getDescription(statusCode)}</div>
        </div>
        {/* Centered arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[-6px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-dark-600"></div>
      </div>
    );
  }

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

  function HistoryDetailsView({ details, onClose }) {
    const formatBody = (body) => {
      if (!body) return '';
      if (typeof body === 'string') {
        const trimmed = body.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            return JSON.stringify(JSON.parse(body), null, 2);
          } catch { return body; }
        }
        return body;
      }
      return JSON.stringify(body, null, 2);
    };

    return (
      <div className="flex-1 flex flex-col bg-probestack-bg overflow-auto">
        <div className="p-5">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Request</h3>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-dark-700 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700 space-y-3">
              <div className="flex gap-2">
                <span className={clsx(
                  'text-xs font-bold px-2 py-0.5 rounded',
                  details.method === 'GET' && 'text-green-400 bg-green-400/10',
                  details.method === 'POST' && 'text-yellow-400 bg-yellow-400/10',
                  details.method === 'PUT' && 'text-blue-400 bg-blue-400/10',
                  details.method === 'DELETE' && 'text-red-400 bg-red-400/10',
                )}>
                  {details.method}
                </span>
                <span className="text-xs text-gray-300 break-all">{details.url}</span>
              </div>
              {details.request_headers?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1">Headers</div>
                  <pre className="text-xs text-gray-300 font-mono bg-dark-800 p-2 rounded">
                    {JSON.stringify(details.request_headers, null, 2)}
                  </pre>
                </div>
              )}
              {details.request_body && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1">Body</div>
                  <pre className="text-xs text-gray-300 font-mono bg-dark-800 p-2 rounded overflow-auto max-h-64">
                    {formatBody(details.request_body)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Response</h3>
            <div className="bg-dark-900/60 rounded-lg p-4 border border-dark-700 space-y-3">
              <div className="flex gap-4 items-center">
                <span className={clsx(
                  'text-xs font-bold px-2 py-0.5 rounded',
                  details.status_code >= 200 && details.status_code < 300
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-red-400 bg-red-400/10'
                )}>
                  {details.status_code} {details.status_text}
                </span>
                <span className="text-xs text-gray-400">{details.response_time_ms} ms</span>
                <span className="text-xs text-gray-400">{details.response_size_bytes} B</span>
              </div>
              {details.response_headers?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1">Headers</div>
                  <pre className="text-xs text-gray-300 font-mono bg-dark-800 p-2 rounded">
                    {JSON.stringify(details.response_headers, null, 2)}
                  </pre>
                </div>
              )}
              {details.response_body && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1">Body</div>
                  <pre className="text-xs text-gray-300 font-mono bg-dark-800 p-2 rounded overflow-auto max-h-96">
                    {formatBody(details.response_body)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-probestack-bg min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Tab bar */}
        <div className="flex items-center border-b border-dark-700 bg-probestack-bg flex-shrink-0 min-h-8 overflow-hidden">
          {!hideNewButton && (
            <button
              type="button"
              onClick={onNewTab}
              className="flex items-center justify-center gap-1.5 px-3 h-9 shrink-0 text-gray-400 bg-probestack-bg cursor-pointer hover:text-primary hover:bg-primary/10 border-r border-dark-700 transition-colors text-xs font-semibold tracking-wide"
              title="New request"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          )}
          {/* Scrollable container */}
          <div
            ref={tabsContainerRef}
            className="flex items-center overflow-x-auto overflow-y-visible min-w-0 thin-horizontal-scrollbar"
          // style={{ marginBottom: '-15px'}}
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
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredTab({
                      index,
                      name: req.name || label,
                      url: req.url || '',
                      left: rect.left + rect.width / 2,
                      top: rect.bottom + window.scrollY + 6,
                    });
                  }}
                  onMouseLeave={() => setHoveredTab(null)}
                  ref={(el) => (tabRefs.current[index] = el)}
                  className={clsx(
                    'flex items-center gap-2 pl-3 pr-1 py-1 w-[110px] shrink-0 border-r border-dark-700 cursor-pointer transition-colors group relative',
                    isActive
                      ? 'bg-primary/10 text-white border-b-2 border-b-primary -mb-px'
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
                      className="text-xs flex-1 bg-dark-700 border border-primary rounded px-1 outline-none text-white min-w-0"
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
                      className="rounded text-gray-500 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Close tab"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Conditional main content: request UI */}
        {isCollectionRun ? (
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
              // Call the parent's handler to update the runs table
              if (onLoadTestComplete) onLoadTestComplete(loadTestId);
              // Existing logic to close the running tab and open results
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
        )

          :

          isMockWizard ? (
            <MockServerWizardTab
              tab={{ ...currentReq, index: activeRequestIndex }}
              onUpdateTab={onUpdateTab}
              onCloseTab={onCloseTab}
              collections={collections}
              activeWorkspaceId={activeWorkspaceId}
              onCreateMockServer={onCreateMockServer}
              onUpdateMockServer={onUpdateMockServer}
            />
          ) :

            isMockEditor ? (
              <MockServerEditor
                config={currentReq.mockConfig}
                mockServer={currentReq.mockServer}
                isEdit={currentReq.isEdit}
                onSave={onCreateMockServer}
                onUpdate={onUpdateMockServer}
                onClose={() => onCloseTab(activeRequestIndex)}
                collections={collections}
                activeWorkspaceId={activeWorkspaceId}
              />
            ) : (
              <>
                {/* Postman-style: Request line — Method + URL + Send */}
                <div className="px-2 py-1 bg-probestack-bg border-b border-dark-700 flex-shrink-0">
                  <div className="flex gap-2 flex-wrap  justify-end">
                    {/* Method dropdown */}
                    <div className="relative w-[110px] flex-shrink-0" ref={methodDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsMethodOpen(!isMethodOpen)}
                        className={clsx(
                          'w-full rounded-lg text-sm font-bold py-2 pl-3 pr-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center justify-between border',
                          getMethodColor(method)
                        )}
                      >
                        <span>{method}</span>
                        <ChevronDown className={clsx('w-4 h-4 text-gray-500 transition-transform', isMethodOpen && 'rotate-180')} />
                      </button>
                      {isMethodOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-probestack-bg border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          {methods.map((m) => (
                            <div
                              key={m}
                              onClick={() => {
                                onMethodChange(m);
                                setIsMethodOpen(false);
                              }}
                              className={clsx(
                                'flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-dark-700',
                                method === m && 'bg-primary/10',
                                // Method-specific text color
                                m === 'GET' && 'text-green-400',
                                m === 'POST' && 'text-yellow-400',
                                m === 'PUT' && 'text-blue-400',
                                m === 'DELETE' && 'text-red-400',
                                !['GET', 'POST', 'PUT', 'DELETE'].includes(m) && 'text-purple-400'
                              )}
                            >
                              <span className="truncate">{m}</span>
                              {method === m && <Check className="w-3.5 h-3.5 text-primary ml-2 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Protocol dropdown – ONLY for MCP requests */}
                    {isMcpRequest && (
                      <div className="relative w-[100px] flex-shrink-0" ref={protocolDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsProtocolOpen(!isProtocolOpen)}
                          className="w-full bg-dark-800 border border-dark-700 rounded-lg text-sm font-bold py-2 pl-3 pr-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center justify-between text-gray-300"
                        >
                          <span>{currentReq?.protocol || 'MCP'}</span>
                          <ChevronDown className={clsx('w-4 h-4 text-gray-500 transition-transform', isProtocolOpen && 'rotate-180')} />
                        </button>
                        {isProtocolOpen && (
                          <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {['HTTP', 'SSE', 'MCP'].map((proto) => (
                              <div
                                key={proto}
                                onClick={() => {
                                  if (onProtocolChange) onProtocolChange(proto);
                                  setIsProtocolOpen(false);
                                }}
                                className={clsx(
                                  'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-dark-700',
                                  (currentReq?.protocol || 'MCP') === proto ? 'text-primary bg-primary/10' : 'text-gray-300'
                                )}
                              >
                                <div className="w-3.5 h-3.5 flex items-center justify-center">
                                  {(currentReq?.protocol || 'MCP') === proto && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <span className="flex-1 truncate">{proto}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <VariableHighlightInput
                      value={url}
                      onChange={onUrlChange}
                      placeholder="https://api.example.com/v1/endpoint"
                      className="flex-1 min-w-[220px] bg-dark-800 border border-dark-700 rounded-lg text-sm font-mono text-white py-2.5 px-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none shadow-sm placeholder:text-gray-500"
                      activeEnvVars={activeEnvVars}
                      inactiveEnvVars={inactiveEnvVars}
                      activeEnvValues={activeEnvValues}
                      inactiveEnvInfo={inactiveEnvInfo}
                      globalVars={globalVars}
                      globalValues={globalValues}
                    />
                    {!readOnly && (
                      <button
                        onClick={handleSendClick}
                        disabled={isLoading || !url?.trim()}
                        className="bg-primary cursor-pointer hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold text-sm shadow-md shadow-primary/25 flex items-center gap-2 transition-all active:scale-[0.98] flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    )}

                    {!readOnly && !isMockEndpoint && (
                      <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={isSavedRequest(currentReq) && !hasUnsavedChanges}
                        title={getSaveTooltip()}
                        className={clsx(
                          'bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg cursor-pointer font-semibold text-sm shadow-md shadow-primary/25 flex items-center gap-2 transition-all active:scale-[0.98] flex-shrink-0',
                          (isSavedRequest(currentReq) && !hasUnsavedChanges) && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    )}

                    {readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          // Create an editable copy of this saved response
                          const editableCopy = {
                            ...currentReq,
                            id: `editable-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            name: `${currentReq.name} (Edit)`,
                            response: null,           // clear response
                            readOnly: false,
                          };
                          onNewTab(editableCopy);
                        }}
                        className="bg-primary/80 hover:bg-primary text-white px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"
                      >
                        <span>Try</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Postman-style: Tabs below request line — Params, Headers, Body, Auth, Pre-request Script, Tests */}
                <div className="border-b border-dark-700 flex items-center justify-between flex-shrink-0 bg-[var(--color-card-bg)] gap-2 min-h-0">
                  <div className="flex items-center gap-0 overflow-y-hidden min-w-0 flex-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => {
                          // Set active section to show corresponding content
                          setActiveSection(section.id);
                          // If the bottom panel is collapsed, expand it to show the content. If it's already expanded, reset its scroll position to top.
                          if (!bottomPanelCollapsed) {
                            setBottomPanelResetKey(prev => prev + 1);
                          }
                        }}
                        className={clsx(
                          'px-3 py-2.5 text-sm font-medium whitespace-nowrap cursor-pointer transition-all -mb-px flex-shrink-0 border-b-2',
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
                    <div className="p-1">
                      {/* <div className="rounded-lg border border-dark-700  overflow-hidden"> */}
                      <div className="px-2 py-1 text-xs text-gray-400 font-medium">
                        Query parameters for the request URL
                      </div>
                      <div className="p-2">
                        <KeyValueEditor
                          pairs={queryParams}
                          onChange={handleQueryParamsChange}
                          activeEnvVars={activeEnvVars}
                          inactiveEnvVars={inactiveEnvVars}
                          activeEnvValues={activeEnvValues}
                          inactiveEnvInfo={inactiveEnvInfo}
                          globalVars={globalVars}
                          globalValues={globalValues}
                          isHeaders={false}
                        />
                      </div>
                      {/* </div> */}
                    </div>
                  )}

                  {activeSection === 'headers' && (
                    <div className="p-1">
                      {/* <div className="rounded-lg border border-dark-700 overflow-hidden"> */}
                      <div className="px-2 py-1 text-xs text-gray-400 font-medium">
                        Request headers (e.g. Content-Type, Authorization)
                      </div>
                      <div className="p-2">
                        <KeyValueEditor
                          pairs={headers}
                          onChange={onHeadersChange}
                          activeEnvVars={activeEnvVars}
                          inactiveEnvVars={inactiveEnvVars}
                          activeEnvValues={activeEnvValues}
                          inactiveEnvInfo={inactiveEnvInfo}
                          globalVars={globalVars}
                          globalValues={globalValues}
                          isHeaders={true}
                        />
                      </div>
                      {/* </div> */}
                    </div>
                  )}

                  {activeSection === 'body' && (
                    <div className="p-5">
                      {(method === 'POST' || method === 'PUT' || method === 'PATCH') ? (
                        <>
                          {/* Postman-style body type: none | form-data | x-www-form-urlencoded | raw */}
                          <div className="flex items-center gap-4 mb-2 -mt-4 flex-wrap">
                            {['none', 'form-data', 'x-www-form-urlencoded', 'raw'].map((type) => (
                              <label key={type}>
                                <input
                                  type="radio"
                                  name="bodyType"
                                  checked={bodyType === type}
                                  onChange={() => handleBodyTypeRadioChange(type)}
                                  className="mr-2"
                                />
                                {type === 'x-www-form-urlencoded' ? 'x-www-form-urlencoded' : type.charAt(0).toUpperCase() + type.slice(1)}
                              </label>
                            ))}
                            {bodyType === 'raw' && (
                              <select
                                value={rawBodyFormat}
                                onChange={(e) => setRawBodyFormat(e.target.value)}
                                className="rounded-md text-xs text-gray-300  px-3 focus:outline-none focus:border-primary/50 cursor-pointer"
                              >
                                <option value="json" className='bg-dark-800'>JSON</option>
                                <option value="text" className='bg-dark-800'>Text</option>
                              </select>
                            )}
                          </div>
                          {bodyType === 'raw' ? (
                            rawBodyFormat === 'json' ? (
                              <JsonEditorWithVariables
                                value={body}
                                onChange={(val) => {
                                  onBodyChange(val);
                                  validateRequestBodyJson(val);
                                }}
                                placeholder={rawBodyFormat === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body...'}
                                activeEnvVars={activeEnvVars}
                                inactiveEnvVars={inactiveEnvVars}
                                activeEnvValues={activeEnvValues}
                                inactiveEnvInfo={inactiveEnvInfo}
                                globalVars={globalVars}
                                globalValues={globalValues}
                              />
                            ) : (
                              <div className="rounded-lg border border-dark-700 overflow-hidden ">
                                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-card-bg)] border-b border-dark-700 text-xs text-gray-400">
                                  <span className="font-medium text-gray-300 ">Text</span>
                                </div>
                                <VariableHighlightInput
                                  value={body}
                                  onChange={(val) => {
                                    onBodyChange(val);
                                    validateRequestBodyJson(val);
                                  }}
                                  onBlur={() => validateRequestBodyJson(body)}
                                  placeholder="Enter request body..."
                                  multiline
                                  activeEnvVars={activeEnvVars}
                                  inactiveEnvVars={inactiveEnvVars}
                                  activeEnvValues={activeEnvValues}
                                  inactiveEnvInfo={inactiveEnvInfo}
                                  globalVars={globalVars}
                                  globalValues={globalValues}
                                  className="w-full h-64 p-4 font-mono text-sm focus:outline-none resize-none text-gray-300 bg-transparent leading-relaxed"
                                  inputClassName="h-full"
                                />
                                {bodyJsonError && (
                                  <div className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {bodyJsonError}
                                  </div>
                                )}
                              </div>
                            )
                          ) : bodyType === 'none' ? (
                            <div className="h-48 flex items-center justify-center text-gray-500 text-sm border border-dark-700 rounded-lg ">
                              This request does not have a body
                            </div>
) : bodyType === 'form-data' ? (
  <div className="mt-3">
<FormDataEditor
  pairs={formDataForFormData}
  onChange={(newData) => {
    setFormDataForFormData(newData);
    onFormDataChange(newData);
  }}
/>
  </div>
) : bodyType === 'x-www-form-urlencoded' ? (
  <div className="mt-3 space-y-2">
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={advancedUrlEncoded}
          onChange={(e) => onAdvancedUrlEncodedChange?.(e.target.checked)}
        />
        Enable advanced array/nested syntax
      </label>
      <span className="text-[10px] text-gray-500">
        (e.g. `user[0].name`, `colors[]`)
      </span>
    </div>
<KeyValueEditor
  pairs={formDataForUrlEncoded}
  onChange={(newData) => {
    setFormDataForUrlEncoded(newData);
    onFormDataChange(newData);
  }}
  activeEnvVars={activeEnvVars}
  inactiveEnvVars={inactiveEnvVars}
  activeEnvValues={activeEnvValues}
  inactiveEnvInfo={inactiveEnvInfo}
  globalVars={globalVars}
  globalValues={globalValues}
  isHeaders={false}
/>
  </div>
) : (
  // Fallback for any other bodyType (should not happen)
  <div className="h-48 flex items-center justify-center text-gray-500 text-sm border border-dark-700 rounded-lg">
    Unsupported body type
  </div>
)}
                        </>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-gray-500 text-sm border border-dark-700 rounded-lg ">
                          Body not supported for {method} requests
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === 'auth' && (
                    <div className="p-5">
                      <div className="rounded-lg border border-dark-700">
                        <div className="px-4 py-2.5 border-b border-dark-700 bg-[var(--color-card-bg)] text-xs text-gray-400 font-medium">
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
                      <div className="rounded-lg border border-dark-700  overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-dark-700 bg-[var(--color-card-bg)] flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-medium">Pre-request Script</span>
                          <span className="text-xs text-gray-500">Runs before the request is sent</span>
                        </div>
                        <textarea
                          value={preRequestScript}
                          onChange={(e) => onPreRequestScriptChange && onPreRequestScriptChange(e.target.value)}
                          className="w-full h-80 p-4 font-mono text-sm bg-probestack-bg focus:outline-none focus:ring-0 border-0 resize-none text-gray-300 placeholder:text-gray-500"
                          placeholder="// Add custom JavaScript code here\n// Example: pm.environment.set('token', 'abc123');"
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  )}

                  {activeSection === 'tests' && (
                    <div className="p-5">
                      <div className="rounded-lg border border-dark-700  overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-dark-700 bg-[var(--color-card-bg)] flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-medium">Tests</span>
                          <span className="text-xs text-gray-500">Runs after the response is received</span>
                        </div>
                        <textarea
                          value={tests}
                          onChange={(e) => onTestsChange && onTestsChange(e.target.value)}
                          className="w-full h-80 p-4 font-mono text-sm  focus:outline-none focus:ring-0 border-0 resize-none text-gray-300 placeholder:text-gray-500"
                          placeholder="// Add test scripts here\n// Example: pm.test('Status code is 200', () => {\n//   pm.response.to.have.status(200);\n// });"
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  )}

                  {activeSection === 'mcp' && isMcpRequest && (
                    <div className="p-5 space-y-4">
                      <div className="rounded-lg border border-dark-700 p-4">
                        <div className="mb-3 text-sm text-gray-300">
                          <span className="font-medium">MCP Protocol</span>
                          <p className="text-xs text-gray-500 mt-1">
                            Uses JSON‑RPC 2.0 over HTTP. Set URL to your MCP server endpoint and craft JSON‑RPC requests.
                          </p>
                          <pre className="mt-2 text-xs bg-dark-800 p-2 rounded border border-dark-700">
                            {`{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}`}
                          </pre>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Server URL</label>
                            <input
                              type="text"
                              value={mcpServerUrl}
                              onChange={(e) => handleMcpServerUrlChange(e.target.value)}
                              placeholder="http://localhost:3001"
                              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Transport</label>
                            <select
                              value={mcpTransport}
                              onChange={(e) => handleMcpTransportChange(e.target.value)}
                              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="http">HTTP (Streamable)</option>
                              <option value="sse">SSE</option>
                            </select>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={async () => {
                                try {
                                  const startTime = Date.now();
                                  const response = await fetch(mcpServerUrl, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Accept': 'application/json, text/event-stream',
                                    },
                                    body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'forgeq', version: '1.0' } }, id: Date.now() }),
                                  });
                                  const elapsed = Date.now() - startTime;
                                  const contentType = response.headers.get('content-type') || '';
                                  let data;
                                  if (contentType.includes('text/event-stream')) {
                                    const text = await response.text();
                                    const dataLines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6));
                                    const results = dataLines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
                                    data = results.length === 1 ? results[0] : { responses: results };
                                  } else {
                                    data = await response.json();
                                  }
                                  const sessionId = response.headers.get('mcp-session-id');
                                  const serverName = data?.result?.serverInfo?.name || data?.responses?.[0]?.result?.serverInfo?.name || 'unknown';
                                  toast.success('Ping OK - Server: ' + serverName + (sessionId ? ' (session started)' : ''));
                                  const mcpResponse = {
                                    status: response.status,
                                    statusText: response.statusText || 'OK',
                                    time: elapsed,
                                    size: JSON.stringify(data).length,
                                    data: data,
                                    headers: [...response.headers.entries()].map(([key, value]) => ({ key, value })),
                                    testResults: [],
                                    testScriptError: null,
                                  };
                                  onUpdateTab(activeRequestIndex, { ...currentReq, response: mcpResponse, mcpSessionId: sessionId || currentReq?.mcpSessionId });
                                  setBottomPanelCollapsed(false);
                                  setBottomPanelTab('response');
                                } catch (err) {
                                  toast.error('Ping failed: ' + (err.message || 'Connection refused'));
                                  const errorResponse = { status: 0, statusText: 'Connection Failed', time: 0, size: 0, data: err.message || 'Connection refused', headers: [], testResults: [], testScriptError: null };
                                  onUpdateTab(activeRequestIndex, { ...currentReq, response: errorResponse });
                                  setBottomPanelCollapsed(false);
                                  setBottomPanelTab('response');
                                }
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                            >
                              Ping Server
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const startTime = Date.now();
                                  let sessionId = currentReq?.mcpSessionId;
                                  if (!sessionId) {
                                    const initResp = await fetch(mcpServerUrl, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
                                      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'forgeq', version: '1.0' } }, id: Date.now() }),
                                    });
                                    sessionId = initResp.headers.get('mcp-session-id');
                                    await initResp.text();
                                    if (sessionId) {
                                      await fetch(mcpServerUrl, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId },
                                        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
                                      }).then(r => r.text()).catch(() => {});
                                    }
                                  }
                                  const hdrs = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
                                  if (sessionId) hdrs['mcp-session-id'] = sessionId;
                                  const response = await fetch(mcpServerUrl, { method: 'POST', headers: hdrs, body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: Date.now() }) });
                                  const elapsed = Date.now() - startTime;
                                  const contentType = response.headers.get('content-type') || '';
                                  let data;
                                  if (contentType.includes('text/event-stream')) {
                                    const text = await response.text();
                                    const dataLines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6));
                                    const results = dataLines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
                                    data = results.length === 1 ? results[0] : { responses: results };
                                  } else {
                                    data = await response.json();
                                  }
                                  const toolCount = data?.result?.tools?.length || 0;
                                  const toolNames = (data?.result?.tools || []).map(t => t.name).slice(0, 5).join(', ');
                                  toast.success(toolCount + ' tools found' + (toolNames ? ': ' + toolNames : ''));
                                  const mcpResponse = {
                                    status: response.status,
                                    statusText: response.statusText || 'OK',
                                    time: elapsed,
                                    size: JSON.stringify(data).length,
                                    data: data,
                                    headers: [...response.headers.entries()].map(([key, value]) => ({ key, value })),
                                    testResults: [],
                                    testScriptError: null,
                                  };
                                  onUpdateTab(activeRequestIndex, { ...currentReq, response: mcpResponse, mcpSessionId: sessionId || currentReq?.mcpSessionId });
                                  setBottomPanelCollapsed(false);
                                  setBottomPanelTab('response');
                                } catch (err) {
                                  toast.error('Failed to list tools: ' + (err.message || 'Connection refused'));
                                  const errorResponse = { status: 0, statusText: 'Connection Failed', time: 0, size: 0, data: err.message || 'Connection refused', headers: [], testResults: [], testScriptError: null };
                                  onUpdateTab(activeRequestIndex, { ...currentReq, response: errorResponse });
                                  setBottomPanelCollapsed(false);
                                  setBottomPanelTab('response');
                                }
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                            >
                              List Tools
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
      </div> {/* closes the inner flex-col div */}

      {/* Bottom Panel & Save Modal – only for request tabs */}
      {!isWorkspaceDetails && !isCollectionRun && !isCollectionRunResults && !isLoadTestRunning && !isLoadTestResults && !isMockEditor && !isMockWizard && (
        <>
          <ResizableBottomPanel
            key={bottomPanelResetKey}
            defaultHeight={360}
            minHeight={48}
            maxHeight={480}
            collapsed={bottomPanelCollapsed}
            onCollapseChange={setBottomPanelCollapsed}
          >
            {/* </ResizableBottomPanel> */}

            {/* Forgeq-style Panel Header */}
            <div className="h-10 flex items-center justify-between border-b border-dark-700 bg-[var(--color-card-bg)] shrink-0 gap-2 min-w-0">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {['response', 'logs', 'validation', 'collection-run', ...(isMockEndpoint ? [] : ['debug'])].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      // If panel is collapsed, expand it first
                      if (bottomPanelCollapsed) {
                        setBottomPanelCollapsed(false);
                      }
                      // Then switch to the selected tab
                      setBottomPanelTab(tab);
                    }}
                    className={clsx(
                      'px-3 py-3 text-sm font-medium -mb-px cursor-pointer transition-colors rounded-t capitalize whitespace-nowrap flex-shrink-0',
                      bottomPanelTab === tab
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {tab === 'validation' ? 'Validation Results' :
                      tab === 'collection-run' ? 'Collection Run' :
                        tab === 'debug' ? 'Debug Info' : tab}
                  </button>
                ))}
              </div>

              {/* Save Response button */}
              {effectiveResponse && effectiveResponse.historyId && !isLoading && (
                <button
                  type="button"
                  onClick={async () => {
                    if (isSavingResponse) return;
                    setIsSavingResponse(true);
                    try {
                      const requestId = currentReq?.id;
                      if (!requestId) {
                        toast.error('Request ID missing');
                        return;
                      }
                      await onSaveResponse?.(requestId, effectiveResponse.historyId, null);
                    } finally {
                      setIsSavingResponse(false);
                    }
                  }}
                  disabled={isSavingResponse}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-primary/80 hover:text-primary cursor-pointer transition-colors mr-2"
                  title="Save this response"
                >
                  {isSavingResponse ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save
                </button>
              )}


              <button
                onClick={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
                className="p-4 text-gray-500 hover:text-gray-200 transition-colors border-l border-dark-700 cursor-pointer flex items-center justify-center rounded-t"
              >
                {bottomPanelCollapsed ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>

                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                      const hasError = !!error || (effectiveResponse && effectiveResponse.testScriptError);

                      if (hasError) {
                        let errorMessage = '';
                        if (error) {
                          errorMessage = error.message || JSON.stringify(error, null, 2);
                        } else if (effectiveResponse && effectiveResponse.testScriptError) {
                          errorMessage = effectiveResponse.testScriptError;
                        } else if (effectiveResponse && effectiveResponse.status >= 400) {
                          errorMessage = `${effectiveResponse.status} ${effectiveResponse.statusText || 'Error'}`;
                        } else if (effectiveResponse && effectiveResponse.status === 0) {
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

                      if (effectiveResponse) {
                        return (
                          <div className="space-y-3">
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-6">
                                  <button
                                    onClick={() => setResponseTab('body')}
                                    className={clsx(
                                      'text-sm font-medium transition-colors',
                                      responseTab === 'body' ? 'text-primary' : 'text-gray-400 hover:text-gray-200'
                                    )}
                                  >
                                    Body
                                  </button>
                                  <button
                                    onClick={() => setResponseTab('headers')}
                                    className={clsx(
                                      'text-sm font-medium transition-colors',
                                      responseTab === 'headers' ? 'text-primary' : 'text-gray-400 hover:text-gray-200'
                                    )}
                                  >
                                    Headers ({effectiveResponse.headers?.length || 0})
                                  </button>
                                </div>

                                <div className="flex items-center gap-5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Status:</span>
                                    <div className="relative group">
                                      <span className={clsx(
                                        'font-bold px-2 py-0.5 rounded cursor-help',
                                        effectiveResponse.status >= 200 && effectiveResponse.status < 300
                                          ? 'text-green-400 bg-green-400/10'
                                          : 'text-red-400 bg-red-400/10'
                                      )}>
                                        {effectiveResponse.status} {effectiveResponse.statusText}
                                      </span>
                                      <StatusCodeTooltip statusCode={effectiveResponse.status} statusText={effectiveResponse.statusText} />
                                    </div>
                                  </div>

                                  <div className="relative group">
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Clock className="w-3 h-3 text-gray-500" />
                                      <span className="text-gray-400 font-medium">{effectiveResponse.time}ms</span>
                                    </div>
                                    <TimeDetailsTooltip traceSteps={effectiveResponse.traceSteps} totalTime={effectiveResponse.time} />
                                  </div>

                                  <div className="relative group">
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Database className="w-3 h-3 text-gray-500" />
                                      <span className="text-gray-400 font-medium">{effectiveResponse.size} B</span>
                                    </div>
                                    <SizeDetailsTooltip
                                      requestSize={effectiveResponse.request_size_bytes}
                                      requestHeadersSize={effectiveResponse.request_headers_size_bytes}
                                      requestBodySize={effectiveResponse.request_body_size_bytes}
                                      responseSize={effectiveResponse.size}
                                      responseHeadersSize={effectiveResponse.response_headers_size_bytes}
                                      responseBodySize={effectiveResponse.size - (effectiveResponse.response_headers_size_bytes || 0)}
                                      network={effectiveResponse.network}
                                    />
                                  </div>
                                </div>
                              </div>

                              {responseTab === 'body' ? (
                                <div className="bg-[var(--color-input-bg)] rounded-lg font-mono text-sm overflow-hidden border border-dark-700">
                                  {/* SSE: Postman-style collapsible event cards */}
                                  {effectiveResponse.sseEvents && effectiveResponse.sseEvents.length > 0 ? (
                                    <SseEventViewer
                                      events={effectiveResponse.sseEvents}
                                      skipped={effectiveResponse.sseSkipped || 0}
                                      totalCount={effectiveResponse.sseTotalCount || 0}
                                    />
                                  ) : (
                                    <div className="p-4 overflow-auto max-h-96">
                                      <pre className="text-gray-300 whitespace-pre-wrap break-all">
                                        {formatResponseBody(effectiveResponse.data)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-[var(--color-input-bg)] rounded-lg p-4 overflow-auto max-h-96 border border-dark-700">
                                  {effectiveResponse.headers && effectiveResponse.headers.length > 0 ? (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-gray-400 border-b border-dark-700">
                                          <th className="text-left py-2 font-medium">Header</th>
                                          <th className="text-left py-2 font-medium">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {effectiveResponse.headers.map((h, idx) => (
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

                      return (
                        <EmptyState
                          icon={Terminal}
                          title="Execute a request to see response"
                          description="Output will be formatted as JSON by default"
                        />
                      );
                    })()}
                  </>
                )}

                {bottomPanelTab === 'logs' && (
                  <div className="space-y-4">
                    {historyToUse && historyToUse.length > 0 ? (
                      Object.entries(groupedLogs).map(([groupLabel, items]) => (
                        <div key={groupLabel}>
                          {/* Group header */}
                          <div className="sticky top-0 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <span className="border-b border-dark-700 pb-0.5">{groupLabel}</span>
                          </div>
                          {/* Items in group */}
                          <div className="space-y-2 mt-2">
                            {items.map((item) => {
                              console.log("item", item);
                              const isExpanded = expandedLogId === item.historyId;
                              const fullDetails = logDetails[item.historyId];
                              const isLoading = loadingLogDetails[item.historyId];
                              const executedAt = item.executed_at ? new Date(item.executed_at) : null;
                              console.log("time", executedAt);

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

                                  {/* executed at  – always visible, indented */}
                                  <div className="pl-[83px] pr-3 pb-1 text-[10px] text-gray-500 truncate">
                                    {formatTimeOfDay(item.executed_at)}
                                  </div>

                                  {/* Expanded details (same as before) */}
                                  {isExpanded && (
                                    <div className="pl-[16px] pr-3 pb-3 space-y-2">
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
                                              <pre className="text-xs text-gray-300 font-mono p-2 rounded overflow-auto max-h-40">
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
                                              <pre className="text-xs text-gray-300 font-mono p-2 rounded overflow-auto max-h-40">
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
                      <EmptyState
                        icon={History}
                        title="No execution logs yet"
                        description="Send a request to see its history here"
                      />
                    )}
                  </div>
                )}

                {bottomPanelTab === 'validation' && (
                  <div className="space-y-2">
                    {effectiveResponse ? (
                      <>
                        <div className="flex items-center gap-2 text-xs">
                          {effectiveResponse.status >= 200 && effectiveResponse.status < 300 ? (
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
                        {effectiveResponse.testResults && effectiveResponse.testResults.length > 0 ? (
                          <div className="space-y-2 mt-3">
                            <div className="text-xs font-semibold text-gray-400 mb-2">Test Results:</div>
                            {effectiveResponse.testResults.map((test, index) => (
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

                        {effectiveResponse.testScriptError && (
                          <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded mt-2">
                            Test Script Error: {effectiveResponse.testScriptError}
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState
                        icon={CheckCircle2}
                        title="No validation results"
                        description="Execute a request to see test results"
                      />
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
                                          <pre className="text-xs text-gray-300 font-mono p-2 rounded overflow-auto max-h-40">
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
                                          <pre className="text-xs text-gray-300 font-mono p-2 rounded overflow-auto max-h-40">
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
                      <EmptyState
                        icon={Play}
                        title="No collection run yet"
                        description="Right-click a collection and select 'Run Collection' to start"
                      />
                    )}
                  </div>
                )}

                {bottomPanelTab === 'debug' && (
                  <DebugPanel
                    response={effectiveResponse}
                    error={error}
                    isLoading={isLoading}
                  />
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

      {/* Portal Tooltip */}
      {hoveredTab && createPortal(
        <div
          className="fixed z-[99999] px-3 py-2 text-xs rounded shadow-lg bg-probestack-bg border border-dark-700 pointer-events-none"
          style={{
            left: hoveredTab.left,
            top: hoveredTab.top,
            transform: 'translateX(-50%)',
            color: 'var(--color-text-primary)',
          }}
        >
          <div className="font-semibold mb-1">{hoveredTab.name}</div>
          {hoveredTab.url && (
            <div className="text-gray-400 textxs break-all max-w-[250px]">
              {hoveredTab.url}
            </div>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45 bg-probestack-bg border-t border-l border-dark-700"
          ></div>
        </div>,
        document.body
      )}
    </div>
  );
}
