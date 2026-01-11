
import React, { useState, useEffect } from 'react';
import IDEWorkspaceLayout from './components/IDEWorkspaceLayout';
import { Home as HomeIcon, LayoutGrid, FileText, Globe, Search as SearchIcon } from 'lucide-react';
import clsx from 'clsx';
import { sendRequest } from './utils/api';
import Home from './components/Home';
import Reports from './components/Reports';
import Explore from './components/Explore';


function App() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('probestack_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Navigation State
  const [view, setView] = useState('home'); // 'home', 'workspace', 'reports', 'explore'

  // Request State
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [queryParams, setQueryParams] = useState([{ key: '', value: '' }]);
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [body, setBody] = useState('{\n  \n}');
  const [authType, setAuthType] = useState('none');
  const [authData, setAuthData] = useState({});
  const [preRequestScript, setPreRequestScript] = useState('');
  const [tests, setTests] = useState('');
  const [environments, setEnvironments] = useState([
    { id: 'no-env', name: 'No Environment' },
    { id: 'dev', name: 'Development' },
    { id: 'staging', name: 'Staging' },
    { id: 'prod', name: 'Production' },
  ]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('no-env');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem('probestack_history', JSON.stringify(history));
  }, [history]);

  const handleExecute = async () => {
    if (!url) return;

    setIsLoading(true);
    setResponse(null);
    setError(null);

    try {
      const res = await sendRequest({
        url,
        method,
        queryParams,
        headers,
        body: (method === 'GET') ? null : body,
        authType,
        authData,
        preRequestScript
      });
      
      // Execute test script if provided (after response)
      let testResults = [];
      if (tests && res) {
        try {
          const { executeScript } = await import('./utils/scriptExecutor');
          const testExecution = executeScript(tests, {
            url,
            method,
            response: {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers,
              data: res.data
            }
          });
          testResults = testExecution.testResults || [];
          
          // Store test results in response
          res.testResults = testResults;
          res.testScriptError = testExecution.error;
          
          console.log('Test Results:', testResults);
          if (testExecution.error) {
            console.error('Test Script Error:', testExecution.error);
          }
        } catch (e) {
          console.warn('Test script execution error:', e);
          res.testScriptError = e.message;
        }
      }
      
      setResponse(res);
      addToHistory(url, method, res.status, res.size, res.time);
    } catch (err) {
      setError(err);
      addToHistory(url, method, 0, 0, 0, true);
    } finally {
      setIsLoading(false);
    }
  };

  const addToHistory = (url, method, status, size, time, isError = false) => {
    const newEntry = {
      url,
      method,
      status,
      size,
      time,
      error: isError,
      date: new Date().toISOString()
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const loadHistoryItem = (item) => {
    setUrl(item.url);
    setMethod(item.method);
    setView('workspace');
    // Note: In a real app we would save/load params/body too
  };

  const handleImport = (api) => {
    setUrl(api.url);
    setMethod('GET');
    setView('workspace');
  };

  const handleSelectEndpoint = (endpoint) => {
    setUrl(endpoint.path);
    setMethod(endpoint.method);
    setView('workspace');
  };

  const handleNewRequest = () => {
    setMethod('GET');
    setUrl('');
    setQueryParams([{ key: '', value: '' }]);
    setHeaders([{ key: '', value: '' }]);
    setBody('{\n  \n}');
    setAuthType('none');
    setAuthData({});
    setPreRequestScript('');
    setTests('');
    setResponse(null);
    setError(null);
  };

  return (
    <div className="flex h-screen bg-dark-900 text-white font-sans antialiased overflow-hidden selection:bg-primary/30">
      <main className="flex-1 flex flex-col min-w-0 bg-dark-900 relative z-0">
        {/* Header */}
        <header className="h-16 border-b border-dark-700 flex items-center px-6 justify-between bg-dark-800 shrink-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
              <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
            </div>
            
            {/* Center Search Bar */}
            <div className="flex-1 max-w-md mx-auto">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search workspace..."
                  className="w-full h-9 bg-dark-900/50 border border-dark-700/50 rounded-lg pl-10 pr-4 text-xs text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-dark-500 transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setView('home')}
                title="Home"
                className={clsx("p-2 rounded-lg transition-colors", view === 'home' ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <HomeIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('workspace')}
                title="Workspaces"
                className={clsx("p-2 rounded-lg transition-colors", view === 'workspace' ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('reports')}
                title="Reports"
                className={clsx("p-2 rounded-lg transition-colors", view === 'reports' ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('explore')}
                title="Explore"
                className={clsx("p-2 rounded-lg transition-colors", view === 'explore' ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <Globe className="w-4 h-4" />
              </button>
            </nav>
            <div className="h-6 w-[1px] bg-dark-600 mx-2"></div>
            <button className="px-4 py-2 bg-[#ff5b1f] hover:bg-[#ff6d2f] text-white text-xs font-bold rounded-lg shadow-lg transition-all">
              Invite
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 ring-2 ring-dark-800"></div>
          </div>
        </header>

        {view === 'home' && <Home onNavigate={setView} />}
        {view === 'reports' && <Reports history={history} />}
        {view === 'explore' && <Explore onImport={handleImport} />}

        {view === 'workspace' && (
          <IDEWorkspaceLayout
            history={history}
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
            environments={environments}
            selectedEnvironment={selectedEnvironment}
            onSelectEndpoint={handleSelectEndpoint}
            onMethodChange={setMethod}
            onUrlChange={setUrl}
            onQueryParamsChange={setQueryParams}
            onHeadersChange={setHeaders}
            onBodyChange={setBody}
            onAuthTypeChange={setAuthType}
            onAuthDataChange={setAuthData}
            onPreRequestScriptChange={setPreRequestScript}
            onTestsChange={setTests}
            onExecute={handleExecute}
            onNewRequest={handleNewRequest}
            onEnvironmentChange={setSelectedEnvironment}
          />
        )}
      </main>
    </div>
  );
}

export default App;
