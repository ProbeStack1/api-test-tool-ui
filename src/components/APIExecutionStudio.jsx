import React, { useState, useEffect } from 'react';
import { Play, Globe, Key, Menu, FileText, Shield, CheckCircle2, XCircle, Clock, Database, AlertCircle, Plus } from 'lucide-react';
import KeyValueEditor from './KeyValueEditor';
import AuthPanel from './AuthPanel';
import ResizableBottomPanel from './ResizableBottomPanel';
import clsx from 'clsx';

export default function APIExecutionStudio({
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
  onNewRequest
}) {
  const [activeSection, setActiveSection] = useState('params');
  const [bottomPanelTab, setBottomPanelTab] = useState('response');
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);

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

  const sections = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'pre-request', label: 'Pre-request Script' },
    { id: 'tests', label: 'Tests' },
  ];

  // Auto-expand bottom panel when response arrives
  useEffect(() => {
    if (response || error) {
      setBottomPanelCollapsed(false);
      setBottomPanelTab('response');
    }
  }, [response, error]);

  return (
    <div className="flex-1 flex flex-col bg-dark-900 min-h-0 overflow-hidden">
      {/* Center Panel - Editor-First Request Definition */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Section Tabs (Editor-style) */}
        <div className="flex items-center gap-0 border-b border-dark-700 bg-dark-800/40 px-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-t transition-all relative",
                activeSection === section.id
                  ? "text-gray-200 bg-dark-900 border-t border-l border-r border-dark-700"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {section.label}
              {activeSection === section.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
          <div className="flex-1" />
          {/* New Request Button */}
          <button
            onClick={onNewRequest}
            className="px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-700/50 rounded transition-all flex items-center gap-1.5"
            title="New Request"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Editor Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-dark-900">
          {/* Method and Endpoint - Always visible at top */}
          <div className="p-4 space-y-4 border-b border-dark-700/50">
            {/* Method Badge */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-medium w-20">Method</span>
              <div className="relative">
                <select
                  value={method}
                  onChange={(e) => onMethodChange(e.target.value)}
                  className={clsx(
                    "px-3 py-1 text-xs font-bold border rounded focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer appearance-none pr-7",
                    getMethodColor(method)
                  )}
                >
                  {methods.map(m => (
                    <option key={m} value={m} className="text-white bg-dark-800">{m}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <svg width="6" height="4" viewBox="0 0 6 4" fill="currentColor">
                    <path d="M1 1L3 3L5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Endpoint URL (Editor-style) */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-medium w-20">Endpoint</span>
              <input
                type="text"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://api.example.com/v1/endpoint"
                className="flex-1 bg-dark-900 border border-dark-700 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 font-mono text-gray-200 placeholder:text-dark-500"
              />
              <button
                onClick={onExecute}
                disabled={isLoading || !url}
                className={clsx(
                  "px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center gap-1.5",
                  "bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary/30 text-gray-300 hover:text-white",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                    <span>Executing</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Execute</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tab-specific content */}
          {activeSection === 'params' && (
            <div className="p-4">
              {/* Query Parameters */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Query Parameters</label>
                </div>
                <KeyValueEditor pairs={queryParams} onChange={onQueryParamsChange} />
              </div>
            </div>
          )}

          {activeSection === 'headers' && (
            <div className="p-4">
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Headers</label>
                </div>
                <KeyValueEditor pairs={headers} onChange={onHeadersChange} />
              </div>
            </div>
          )}

          {activeSection === 'body' && (
            <div className="p-4">
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Request Body</label>
                </div>
                {(method === 'POST' || method === 'PUT' || method === 'PATCH') ? (
                  <textarea
                    value={body}
                    onChange={(e) => onBodyChange(e.target.value)}
                    className="w-full h-64 bg-dark-900 border border-dark-700 rounded p-3 font-mono text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none text-gray-300"
                    placeholder='{\n  "key": "value"\n}'
                    spellCheck={false}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 text-xs border border-dark-700 rounded">
                    Body not supported for {method} requests
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'auth' && (
            <div className="p-4">
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Authentication</label>
                </div>
                <AuthPanel 
                  authType={authType} 
                  onAuthTypeChange={onAuthTypeChange}
                  authData={authData}
                  onAuthDataChange={onAuthDataChange}
                />
              </div>
            </div>
          )}

          {activeSection === 'pre-request' && (
            <div className="p-4">
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Pre-request Script</label>
                  <span className="text-[10px] text-gray-500">JavaScript code to run before the request</span>
                </div>
                <textarea
                  value={preRequestScript}
                  onChange={(e) => onPreRequestScriptChange && onPreRequestScriptChange(e.target.value)}
                  className="w-full h-96 bg-dark-900 border border-dark-700 rounded p-3 font-mono text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none text-gray-300"
                  placeholder="// Add custom JavaScript code here\n// Example: pm.environment.set('token', 'abc123');"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {activeSection === 'tests' && (
            <div className="p-4">
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Tests (Post-request Script)</label>
                  <span className="text-[10px] text-gray-500">JavaScript code to run after the response</span>
                </div>
                <textarea
                  value={tests}
                  onChange={(e) => onTestsChange && onTestsChange(e.target.value)}
                  className="w-full h-96 bg-dark-900 border border-dark-700 rounded p-3 font-mono text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none text-gray-300"
                  placeholder="// Add test scripts here\n// Example: pm.test('Status code is 200', () => {\n//   pm.response.to.have.status(200);\n// });"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel - Docked Output (IDE Terminal Style) */}
      <ResizableBottomPanel
        defaultHeight={256}
        minHeight={100}
        maxHeight={600}
        collapsed={bottomPanelCollapsed}
        onCollapseChange={setBottomPanelCollapsed}
      >
        {/* Panel Header */}
        <div className="h-8 px-3 flex items-center justify-between border-b border-dark-700 bg-dark-800/80 shrink-0">
          <div className="flex items-center gap-1">
            {['response', 'logs', 'validation'].map(tab => (
              <button
                key={tab}
                onClick={() => setBottomPanelTab(tab)}
                className={clsx(
                  "px-2 py-1 text-xs font-medium rounded transition-all capitalize",
                  bottomPanelTab === tab
                    ? "text-gray-200 bg-dark-700"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                {tab === 'validation' ? 'Validation Results' : tab}
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
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                    Execute a request to see response
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
          </div>
        )}
      </ResizableBottomPanel>
    </div>
  );
}
