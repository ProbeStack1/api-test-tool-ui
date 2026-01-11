import React, { useState } from 'react';
import { History, LayoutGrid, Layers, ChevronRight, Search, Plus } from 'lucide-react';
import APIExecutionStudio from './APIExecutionStudio';
import IDEExecutionInsights from './IDEExecutionInsights';
import APISourcesPanel from './APISourcesPanel';
import clsx from 'clsx';

export default function IDEWorkspaceLayout({
  history,
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
  onEnvironmentChange
}) {
  const [topMenuActive, setTopMenuActive] = useState('collections');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const topMenuItems = [
    { id: 'history', label: 'History', icon: History },
    { id: 'collections', label: 'Collections', icon: LayoutGrid },
    { id: 'environments', label: 'Environments', icon: Layers },
  ];

  const loadHistoryItem = (item) => {
    onUrlChange(item.url);
    onMethodChange(item.method);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-dark-900">
      {/* Top Bar - Global Navigation (IDE-style) */}
      <div className="h-9 border-b border-dark-700 bg-dark-800 flex items-center px-3 gap-0.5 shrink-0">
        {topMenuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTopMenuActive(item.id)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center gap-1.5",
                topMenuActive === item.id
                  ? "bg-dark-900 text-gray-200"
                  : "text-gray-500 hover:text-gray-300 hover:bg-dark-900/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        {/* Environment Selector */}
        <select 
          value={selectedEnvironment}
          onChange={(e) => onEnvironmentChange && onEnvironmentChange(e.target.value)}
          className="bg-transparent border-0 text-xs text-gray-400 px-2 py-1 hover:bg-dark-900/50 rounded cursor-pointer focus:outline-none"
        >
          {environments.map(env => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar - Contextual Explorer */}
        <div className={clsx(
          "border-r border-dark-700 bg-dark-800/60 flex flex-col transition-all",
          sidebarCollapsed ? "w-0" : "w-64"
        )}>
          {/* Sidebar Header */}
          <div className="px-3 py-2 border-b border-dark-700/50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-300">
              {topMenuItems.find(m => m.id === topMenuActive)?.label}
            </h2>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 hover:bg-dark-700/50 rounded text-gray-500 hover:text-gray-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {topMenuActive === 'collections' && (
              <div className="h-full">
                <APISourcesPanel onSelectEndpoint={onSelectEndpoint} showHeader={false} />
              </div>
            )}
            {topMenuActive === 'history' && (
              <div className="p-2 space-y-1">
                {history.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-8">No history</div>
                ) : (
                  history.slice(0, 20).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-dark-700/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          item.method === 'GET' && "text-green-400 bg-green-400/10",
                          item.method === 'POST' && "text-yellow-400 bg-yellow-400/10",
                          "text-purple-400 bg-purple-400/10"
                        )}>
                          {item.method}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(item.date).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 truncate font-mono">{item.url}</div>
                    </button>
                  ))
                )}
              </div>
            )}
            {topMenuActive === 'environments' && (
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-300">Environments</h3>
                  <button className="p-1 hover:bg-dark-700/50 rounded text-gray-500 hover:text-gray-300">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {environments && environments.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-8">No environments created</div>
                ) : (
                  environments && environments.map(env => (
                    <div
                      key={env.id}
                      className={clsx(
                        "px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-dark-700/50 transition-colors",
                        selectedEnvironment === env.id ? "bg-dark-700 text-gray-200" : "text-gray-400"
                      )}
                      onClick={() => onEnvironmentChange && onEnvironmentChange(env.id)}
                    >
                      {env.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Collapse Button (when collapsed) */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-0 top-[calc(64px+36px)] z-10 p-1 bg-dark-800 border-r border-b border-dark-700 rounded-r text-gray-500 hover:text-gray-300 hover:bg-dark-700/50"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Center Panel - API Execution Studio */}
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <APIExecutionStudio
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
            />
          </div>

          {/* Right Panel - Execution Insights */}
          <IDEExecutionInsights
            response={response}
            isLoading={isLoading}
            error={error}
            executionHistory={history}
          />
        </div>
      </div>
    </div>
  );
}

