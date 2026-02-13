import React, { useState } from 'react';
import { History, LayoutGrid, Layers, ChevronRight, Search, Plus, ChevronDown, BarChart3 } from 'lucide-react';
import APIExecutionStudio from './APIExecutionStudio';
import IDEExecutionInsights from './IDEExecutionInsights';
import CodeSnippetPanel from './CodeSnippetPanel';
import CollectionsPanel from './CollectionsPanel';
import clsx from 'clsx';

export default function IDEWorkspaceLayout({
  history,
  requests,
  activeRequestIndex,
  onTabSelect,
  onNewTab,
  onCloseTab,
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
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(null); // null | 'code' | 'insights' — both closed by default

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
                  onClick={() => setTopMenuActive(item.id)}
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
              {topMenuItems.find(m => m.id === topMenuActive)?.label}
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
                <CollectionsPanel onSelectEndpoint={onSelectEndpoint} />
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
                      <button
                        key={index}
                        onClick={() => loadHistoryItem(item)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-transparent hover:bg-dark-800 hover:border-primary/20 text-gray-300 hover:text-white"
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
                    ))}
                  </div>
                )}
              </div>
            )}
            {topMenuActive === 'environments' && (
              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Environments</span>
                  <button type="button" className="p-2 rounded-lg transition-colors hover:bg-primary/15 text-gray-500 hover:text-primary border border-transparent hover:border-primary/30">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {environments && environments.map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => onEnvironmentChange && onEnvironmentChange(env.id)}
                      className={clsx(
                        'w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                        selectedEnvironment === env.id
                          ? 'bg-primary/15 text-primary border border-primary/40 shadow-sm'
                          : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
                      )}
                    >
                      {env.name}
                    </button>
                  ))}
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
            <APIExecutionStudio
              requests={requests}
              activeRequestIndex={activeRequestIndex}
              onTabSelect={onTabSelect}
              onNewTab={onNewTab}
              onCloseTab={onCloseTab}
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

          {/* Right side: Code snippet and Execution Insights (both closed by default), + icon strip */}
          <div className="flex flex-shrink-0 border-l border-dark-700 bg-dark-800/30 min-h-0">
            {rightPanelOpen === 'code' && <CodeSnippetPanel />}
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

