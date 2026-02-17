import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, LayoutGrid, FileText, Globe, Search as SearchIcon } from 'lucide-react';
import clsx from 'clsx';
import { sendRequest } from './utils/api';
import Home from './components/Home';
import Reports from './components/Reports';
import Explore from './components/Explore';
import TestingToolPage from './pages/TestingToolPage';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('probestack_history');
    return saved ? JSON.parse(saved) : [];
  });

  const createEmptyRequest = () => ({
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    method: 'GET',
    url: '',
    queryParams: [{ key: '', value: '' }],
    headers: [{ key: '', value: '' }],
    body: '{\n  \n}',
    authType: 'none',
    authData: {},
    preRequestScript: '',
    tests: '',
  });

  const [requests, setRequests] = useState(() => [createEmptyRequest()]);
  const [activeRequestIndex, setActiveRequestIndex] = useState(0);

  const currentRequest = requests[activeRequestIndex] || requests[0];
  const method = currentRequest?.method ?? 'GET';
  const url = currentRequest?.url ?? '';
  const queryParams = currentRequest?.queryParams ?? [{ key: '', value: '' }];
  const headers = currentRequest?.headers ?? [{ key: '', value: '' }];
  const body = currentRequest?.body ?? '{\n  \n}';
  const authType = currentRequest?.authType ?? 'none';
  const authData = currentRequest?.authData ?? {};
  const preRequestScript = currentRequest?.preRequestScript ?? '';
  const tests = currentRequest?.tests ?? '';

  const updateActiveRequest = (field, value) => {
    setRequests((prev) => {
      const next = [...prev];
      const idx = activeRequestIndex >= 0 && activeRequestIndex < next.length ? activeRequestIndex : 0;
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const [environments] = useState([
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('probestack_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    updateActiveRequest('url', item.url);
    updateActiveRequest('method', item.method);
    navigate('/workspace');
  };

  const handleImport = (api) => {
    updateActiveRequest('url', api.url);
    updateActiveRequest('method', 'GET');
    navigate('/workspace');
  };

  const handleSelectEndpoint = (endpoint) => {
    updateActiveRequest('url', endpoint.path);
    updateActiveRequest('method', endpoint.method);
    navigate('/workspace');
  };

  const handleNewTab = () => {
    setRequests((prev) => {
      const next = [...prev, createEmptyRequest()];
      setActiveRequestIndex(next.length - 1);
      return next;
    });
    setResponse(null);
    setError(null);
  };

  const handleTabSelect = (index) => {
    setActiveRequestIndex(index);
  };

  const handleCloseTab = (index) => {
    if (requests.length <= 1) return;
    setRequests((prev) => prev.filter((_, i) => i !== index));
    setActiveRequestIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const isWorkspace = pathname.startsWith('/workspace');

  return (
    <div className="flex h-screen bg-probestack-bg text-white font-sans antialiased overflow-hidden selection:bg-primary/30">
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-probestack-bg relative z-0 overflow-hidden">
        {/* Header - same logo block as Migration/DashboardNavbar (porbestack-new-repo) */}
        <header className="h-16 border-b border-dark-700 flex items-center px-6 justify-between shrink-0 z-20 bg-probestack-bg">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-12 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold gradient-text font-heading">ProbeStack</span>
                <span className="text-[0.65rem] text-gray-400 leading-tight mt-0.5">A ForgeCrux Company</span>
              </div>
            </div>
            
            {/* Center Search Bar - hidden on workspace (workspace has its own search) */}
            {!isWorkspace && (
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
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              <button
                onClick={() => navigate('/')}
                title="Home"
                className={clsx("p-2 rounded-lg transition-colors", pathname === '/' ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <HomeIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/workspace')}
                title="Workspaces"
                className={clsx("p-2 rounded-lg transition-colors", pathname.startsWith('/workspace') ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/reports')}
                title="Reports"
                className={clsx("p-2 rounded-lg transition-colors", pathname === '/reports' ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/explore')}
                title="Explore"
                className={clsx("p-2 rounded-lg transition-colors", pathname === '/explore' ? "bg-dark-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-dark-700")}
              >
                <Globe className="w-4 h-4" />
              </button>
            </nav>
            <div className="h-6 w-[1px] bg-dark-600 mx-2"></div>
            <button className="px-4 py-2 bg-[#ff5b1f] hover:bg-[#ff6d2f] text-white text-xs font-bold rounded-lg shadow-lg transition-all">
              Invite
            </button>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 ring-2 ring-dark-800"
                title="Profile menu"
              />
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-dark-700 bg-dark-800 shadow-2xl p-2">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Settings
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/workspace/settings/general');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
                  >
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/workspace/settings/certificates');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
                  >
                    Certificates
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reports" element={<Reports history={history} />} />
          <Route path="/explore" element={<Explore onImport={handleImport} />} />
          <Route
            path="/workspace/*"
            element={
              <TestingToolPage
                history={history}
                requests={requests}
                activeRequestIndex={activeRequestIndex}
                onTabSelect={handleTabSelect}
                onNewTab={handleNewTab}
                onCloseTab={handleCloseTab}
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
                onMethodChange={(v) => updateActiveRequest('method', v)}
                onUrlChange={(v) => updateActiveRequest('url', v)}
                onQueryParamsChange={(v) => updateActiveRequest('queryParams', v)}
                onHeadersChange={(v) => updateActiveRequest('headers', v)}
                onBodyChange={(v) => updateActiveRequest('body', v)}
                onAuthTypeChange={(v) => updateActiveRequest('authType', v)}
                onAuthDataChange={(v) => updateActiveRequest('authData', v)}
                onPreRequestScriptChange={(v) => updateActiveRequest('preRequestScript', v)}
                onTestsChange={(v) => updateActiveRequest('tests', v)}
                onExecute={handleExecute}
                onNewRequest={handleNewTab}
                onEnvironmentChange={setSelectedEnvironment}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
