import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Globe, Key, Menu, FileText, Shield, CheckCircle2, XCircle, Clock, Database, AlertCircle, Plus, Terminal, X, Save, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import KeyValueEditor from './KeyValueEditor';
import AuthPanel from './AuthPanel';
import ResizableBottomPanel from './ResizableBottomPanel';
import SaveRequestModal from './SaveRequestModal';
import WorkspaceDetailsView from './WorkspaceDetailsView';
import {toast} from 'sonner';
import clsx from 'clsx';

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
    const [key, value] = pair.split('=').map(decodeURIComponent);
    return { key: key || '', value: value || '' };
  });
};

const buildQueryString = (params) => {
  if (!params || params.length === 0) return '';
  const valid = params.filter(p => p.key && p.key.trim() !== '');
  if (valid.length === 0) return '';
  return valid.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
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

const syncSource = useRef(null);


const handleQueryParamsChange = (newParams) => {
  syncSource.current = 'params';
  onQueryParamsChange(newParams);
};

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
    
    if (substituteVariables) {
      const substitutedUrl = substituteVariables(url);
      if (substitutedUrl !== url) {
        onUrlChange(substitutedUrl);
      }
    }
    
    onExecute();
  };

      const currentReq = requests[activeRequestIndex];
  const isWorkspaceDetails = currentReq?.type === 'workspace-details';
    const isMockEndpoint = currentReq?.isMockEndpoint === true;
  const pristine = pristineRequests?.[currentReq?.id];

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
  if (typeof data === 'string') {
    // Try to parse as JSON – agar valid JSON hai to formatted JSON dikhao
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Agar JSON nahi hai to raw string dikhao (newlines preserve honge)
      return data;
    }
  }
  // Agar already object hai to stringify karo
  return JSON.stringify(data, null, 2);
};

return (
  <div className="flex-1 flex flex-col bg-probestack-bg min-h-0 overflow-hidden">
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Tab bar: + first, then request tabs (Postman-style) */}
      <div className="flex items-center border-b border-dark-700 bg-dark-800/40 flex-shrink-0 min-h-0 overflow-hidden">
        {!hideNewButton && (
          <button
            type="button"
            onClick={onNewTab}
            className="flex items-center justify-center gap-1.5 px-3 h-10 shrink-0 text-gray-400 hover:text-primary hover:bg-primary/10 border-r border-dark-700 transition-colors text-xs font-semibold tracking-wide"
            title="New request"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>
        )}
        <div className="flex-1 flex items-center overflow-hidden min-w-0">
          {requests.map((req, index) => {
            const isActive = index === activeRequestIndex;
            const label = getTabLabel(req);
            const isEditing = editingTabIndex === index;
            return (
              <div
                key={req.id}
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
                  'flex items-center gap-2 pl-3 pr-1 py-2 min-w-0 max-w-[200px] shrink-0 border-r border-dark-700 cursor-pointer transition-colors group',
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
              <input
                type="text"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://api.example.com/v1/endpoint"
                className="flex-1 min-w-[220px] bg-dark-800 border border-dark-700 rounded-lg text-sm font-mono text-white py-2.5 px-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none shadow-sm placeholder:text-gray-500"
              />
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
              <button
                onClick={handleSendClick}
                disabled={isLoading || !url?.trim()}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md shadow-primary/25 flex items-center gap-2 transition-all active:scale-[0.98] flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <KeyValueEditor pairs={queryParams} onChange={handleQueryParamsChange} />
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
                    <KeyValueEditor pairs={headers} onChange={onHeadersChange} />
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
                        <textarea
                          value={body}
                          onChange={(e) => onBodyChange(e.target.value)}
                          className="w-full h-64 p-4 font-mono text-sm focus:outline-none resize-none text-gray-300 bg-transparent leading-relaxed"
                          placeholder={rawBodyFormat === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body...'}
                          spellCheck={false}
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
    {!isWorkspaceDetails && (
      <>
        <ResizableBottomPanel
          defaultHeight={257}
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
                  ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <h4 className="text-xs font-semibold text-red-400">Request Failed</h4>
                      </div>
                      <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all">
                        {error.message || JSON.stringify(error, null, 2)}
                      </pre>
                    </div>
                  ) : response ? (
                    <div className="space-y-3">
                      {/* Response Status Bar */}
                      <div className="flex items-center gap-4 text-xs pb-2 border-b border-dark-700">
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
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-400">{response.time}ms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Database className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-400">{response.size} B</span>
                        </div>
                      </div>

                      {/* Response Body */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-400 font-medium">Body</span>
                        </div>
                        <pre className="bg-dark-900/50 border border-dark-700 rounded p-3 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto">
                          {formatResponseBody(response.data)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-gray-400 min-h-[140px]">
                      <div className="w-14 h-14 bg-dark-800 rounded-xl flex items-center justify-center mb-4 border border-dark-700">
                        <Terminal className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-medium text-white/80">Execute a request to see response</p>
                      <p className="text-xs mt-1">Output will be formatted as JSON by default</p>
                    </div>
                  )}
                </>
              )}

              {bottomPanelTab === 'logs' && (
                <div className="text-xs text-gray-400 space-y-1 font-mono">
                  {executionHistory.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center gap-3 py-1">
                      <span className="text-gray-600">{new Date(item.date).toLocaleTimeString()}</span>
                      <span className={clsx(
                        "font-bold text-[10px] px-1.5 py-0.5 rounded",
                        item.method === 'GET' && "text-green-400 bg-green-400/10",
                        item.method === 'POST' && "text-yellow-400 bg-yellow-400/10",
                        "text-purple-400 bg-purple-400/10"
                      )}>
                        {item.method}
                      </span>
                      <span className="text-gray-300 truncate flex-1">{item.url}</span>
                      <span className="text-gray-500">{item.time}ms</span>
                    </div>
                  ))}
                  {executionHistory.length === 0 && (
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
              {bottomPanelTab === 'collection-run' && (
                <div className="space-y-4">
                  {collectionRunResults ? (
                    <>
                      {/* Collection Run Header */}
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
                            Completed in {new Date(collectionRunResults.endTime).getTime() - new Date(collectionRunResults.startTime).getTime()}ms
                          </span>
                        )}
                      </div>

                      {/* Progress Bar for Running State */}
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

                      {/* Results Grouped by Folder */}
                      {collectionRunResults.results && collectionRunResults.results.length > 0 && (
                        <div className="space-y-3">
                          {(() => {
                            // Group results by folder path
                            const grouped = collectionRunResults.results.reduce((acc, result) => {
                              const path = result.folderPath || 'Root';
                              if (!acc[path]) acc[path] = [];
                              acc[path].push(result);
                              return acc;
                            }, {});

                            return Object.entries(grouped).map(([folderPath, results]) => (
                              <div key={folderPath} className="border border-dark-700 rounded-lg overflow-hidden">
                                {/* Folder Header */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedRunFolders(prev => ({
                                    ...prev,
                                    [folderPath]: !prev[folderPath]
                                  }))}
                                  className="w-full flex items-center gap-2 px-3 py-2 bg-dark-800/50 hover:bg-dark-800 transition-colors"
                                >
                                  {expandedRunFolders[folderPath] !== false ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  )}
                                  <Folder className="w-4 h-4 text-amber-500/90" />
                                  <span className="text-xs font-medium text-gray-300">{folderPath}</span>
                                  <span className="text-xs text-gray-500 ml-auto">
                                    {results.length} request{results.length !== 1 ? 's' : ''}
                                  </span>
                                </button>

                                {/* Requests in Folder */}
                                {expandedRunFolders[folderPath] !== false && (
                                  <div className="divide-y divide-dark-700/50">
                                    {results.map((result, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2.5 hover:bg-dark-800/30 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          {/* Method Badge */}
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

                                          {/* Request Name */}
                                          <span className="text-xs text-gray-300 truncate flex-1">
                                            {result.requestName}
                                          </span>

                                          {/* Status */}
                                          {result.status > 0 ? (
                                            <span className={clsx(
                                              'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                              result.success
                                                ? 'text-green-400 bg-green-400/10'
                                                : 'text-red-400 bg-red-400/10'
                                            )}>
                                              {result.status}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-red-400 bg-red-400/10">
                                              ERR
                                            </span>
                                          )}

                                          {/* Time */}
                                          <span className="text-xs text-gray-500 w-14 text-right">
                                            {result.time}ms
                                          </span>
                                        </div>

                                        {/* URL */}
                                        <div className="mt-1 ml-[52px] text-[10px] text-gray-500 truncate">
                                          {result.url}
                                        </div>

                                        {/* Error Message */}
                                        {result.error && (
                                          <div className="mt-1 ml-[52px] text-[10px] text-red-400">
                                            {result.error}
                                          </div>
                                        )}

                                        {/* Response Preview (if available) */}
                                        {result.data && (
                                          <div className="mt-2 ml-[52px]">
                                            <pre className="text-[10px] text-gray-400 bg-dark-900/50 rounded p-2 overflow-x-auto max-h-24">
                                              {JSON.stringify(result.data, null, 2).slice(0, 200)}
                                              {JSON.stringify(result.data, null, 2).length > 200 ? '...' : ''}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ));
                          })()}
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
          projects={projects}
          onAddProject={onAddProject}
        />
      </>
    )}
  </div>
);
}
