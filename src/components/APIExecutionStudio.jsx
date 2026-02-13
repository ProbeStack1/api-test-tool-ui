import React, { useState, useEffect } from 'react';
import { Play, Globe, Key, Menu, FileText, Shield, CheckCircle2, XCircle, Clock, Database, AlertCircle, Plus, Terminal } from 'lucide-react';
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
  const [bodyType, setBodyType] = useState('raw'); // none | form-data | x-www-form-urlencoded | raw
  const [rawBodyFormat, setRawBodyFormat] = useState('json'); // json, text, etc.

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

  // Auto-expand bottom panel when response arrives
  useEffect(() => {
    if (response || error) {
      setBottomPanelCollapsed(false);
      setBottomPanelTab('response');
    }
  }, [response, error]);

  return (
    <div className="flex-1 flex flex-col bg-probestack-bg min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Postman-style: Request line first — Method + URL + Send */}
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
            <button
              onClick={onExecute}
              disabled={isLoading || !url}
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
          <button
            onClick={onNewRequest}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0 whitespace-nowrap"
            title="New Request"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span>New</span>
          </button>
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
                  <KeyValueEditor pairs={queryParams} onChange={onQueryParamsChange} />
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
      </div>

      {/* Bottom Panel - Docked Output (IDE Terminal Style) */}
      <ResizableBottomPanel
        defaultHeight={256}
        minHeight={100}
        maxHeight={600}
        collapsed={bottomPanelCollapsed}
        onCollapseChange={setBottomPanelCollapsed}
      >
        {/* Forgeq-style Panel Header */}
        <div className="h-12 px-5 flex items-center justify-between border-b border-dark-700 bg-probestack-bg/80 shrink-0 gap-2 min-w-0">
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 scrollbar-thin">
            {['response', 'logs', 'validation'].map((tab) => (
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
          </div>
        )}
      </ResizableBottomPanel>
    </div>
  );
}
