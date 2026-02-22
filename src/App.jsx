import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, User, LogOut, ChevronDown, Search as SearchIcon, BookOpen } from 'lucide-react';
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
    name: 'Untitled Request',
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

  const [requests, setRequests] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_requests');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.length > 0 ? parsed : [createEmptyRequest()];
      }
    } catch (error) {
      console.error('Failed to load requests from localStorage:', error);
    }
    return [createEmptyRequest()];
  });

  const [collections, setCollections] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_collections');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load collections from localStorage:', error);
    }
    return [];
  });

  const [projects, setProjects] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_projects');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load projects from localStorage:', error);
    }
    return [
      { id: 'auth-security', name: 'Auth and Security' },
      { id: 'payment-gateway', name: 'Payment Gateway' }
    ];
  });
  const [activeRequestIndex, setActiveRequestIndex] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_active_request_index');
      if (stored !== null) {
        return parseInt(stored, 10);
      }
    } catch (error) {
      console.error('Failed to load active request index from localStorage:', error);
    }
    return 0;
  });

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

  // Variables state with localStorage persistence
  const [environmentVariables, setEnvironmentVariables] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_environment_variables');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load environment variables from localStorage:', error);
    }
    return [{ key: '', value: '' }];
  });

  const [globalVariables, setGlobalVariables] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_global_variables');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load global variables from localStorage:', error);
    }
    return [{ key: '', value: '' }];
  });

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  // Collection Run Results state
  const [collectionRunResults, setCollectionRunResults] = useState(null);
  const [isRunningCollection, setIsRunningCollection] = useState(false);

  useEffect(() => {
    localStorage.setItem('probestack_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_requests', JSON.stringify(requests));
    } catch (error) {
      console.error('Failed to save requests to localStorage:', error);
    }
  }, [requests]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_collections', JSON.stringify(collections));
    } catch (error) {
      console.error('Failed to save collections to localStorage:', error);
    }
  }, [collections]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_projects', JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects to localStorage:', error);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_active_request_index', activeRequestIndex.toString());
    } catch (error) {
      console.error('Failed to save active request index to localStorage:', error);
    }
  }, [activeRequestIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_environment_variables', JSON.stringify(environmentVariables));
    } catch (error) {
      console.error('Failed to save environment variables to localStorage:', error);
    }
  }, [environmentVariables]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_global_variables', JSON.stringify(globalVariables));
    } catch (error) {
      console.error('Failed to save global variables to localStorage:', error);
    }
  }, [globalVariables]);

  const handleSaveEnvironmentVariables = () => {
    try {
      localStorage.setItem('probestack_environment_variables', JSON.stringify(environmentVariables));
    } catch (error) {
      console.error('Failed to save environment variables to localStorage:', error);
    }
  };

  const handleSaveGlobalVariables = () => {
    try {
      localStorage.setItem('probestack_global_variables', JSON.stringify(globalVariables));
    } catch (error) {
      console.error('Failed to save global variables to localStorage:', error);
    }
  };

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
    // Check if a tab with this exact endpoint already exists
    // Match by name to handle empty requests correctly
    const existingTabIndex = requests.findIndex(
      (req) => req.name === endpoint.name && req.url === endpoint.path && req.method === endpoint.method
    );

    if (existingTabIndex !== -1) {
      // If tab exists, just switch to it
      setActiveRequestIndex(existingTabIndex);
    } else {
      // Create new tab with the endpoint data
      const newRequest = {
        ...createEmptyRequest(),
        url: endpoint.path,
        method: endpoint.method,
        name: endpoint.name || 'Untitled Request',
      };
      setRequests((prev) => {
        const next = [...prev, newRequest];
        setActiveRequestIndex(next.length - 1);
        return next;
      });
    }
    setResponse(null);
    setError(null);
    navigate('/workspace');
  };

  // Get all request names from collections (recursively)
  const getAllRequestNamesFromCollections = () => {
    const names = [];
    const traverse = (items) => {
      if (!items) return;
      items.forEach(item => {
        if (item.type === 'request' && item.name) {
          names.push(item.name.toLowerCase());
        } else if (item.items) {
          traverse(item.items);
        }
      });
    };
    
    collections.forEach(collection => {
      traverse(collection.items || []);
    });
    
    return names;
  };

  // Generate unique request name checking BOTH tabs and collections
  const generateUniqueRequestName = (baseName = 'Untitled Request') => {
    // Get names from both tabs and collections
    const tabNames = requests.map(req => req.name?.toLowerCase() || '');
    const collectionNames = getAllRequestNamesFromCollections();
    const allExistingNames = [...tabNames, ...collectionNames];
    
    // If base name doesn't exist, return it
    if (!allExistingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }
    
    // Find the highest number suffix
    let maxNumber = 0;
    const baseNameLower = baseName.toLowerCase();
    
    allExistingNames.forEach(name => {
      if (name === baseNameLower) {
        maxNumber = Math.max(maxNumber, 1);
      } else if (name.startsWith(baseNameLower + ' ')) {
        const suffix = name.substring(baseNameLower.length + 1);
        const num = parseInt(suffix, 10);
        if (!isNaN(num)) {
          maxNumber = Math.max(maxNumber, num);
        }
      }
    });
    
    // Return next number
    return `${baseName} ${maxNumber + 1}`;
  };

  const handleNewTab = () => {
    setRequests((prev) => {
      const uniqueName = generateUniqueRequestName();
      
      const newRequest = {
        ...createEmptyRequest(),
        name: uniqueName
      };
      const next = [...prev, newRequest];
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

  const handleTabRename = (index, newName) => {
    setRequests((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], name: newName };
      }
      return next;
    });
  };

  const handleAddProject = (projectName) => {
    const newProjectId = `project-${Date.now()}`;
    const newProject = { id: newProjectId, name: projectName.trim() };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  };

  const handleCollectionsChange = (newCollections) => {
    setCollections(newCollections);
  };

  const savedRequestIdsRef = useRef(new Set());

  const handleSaveRequest = (saveData) => {
    const { projectId, projectName, collectionId, collectionName, isNewCollection, request } = saveData;
    
    // Prevent duplicate saves of the same request ID
    if (savedRequestIdsRef.current.has(request.id)) {
      return;
    }
    savedRequestIdsRef.current.add(request.id);
    
    setCollections((prev) => {
      const newCollections = [...prev];
      
      if (isNewCollection) {
        // Create new collection in the project
        const newCollection = {
          id: `col-${Date.now()}`,
          name: collectionName,
          type: 'collection',
          project: projectId,
          projectName: projectName,
          items: [request]
        };
        newCollections.push(newCollection);
      } else {
        // Add to existing collection
        const collectionIndex = newCollections.findIndex(col => col.id === collectionId);
        if (collectionIndex !== -1) {
          if (!newCollections[collectionIndex].items) {
            newCollections[collectionIndex].items = [];
          }
          // Guard: Prevent duplicate request IDs
          const existingRequestIndex = newCollections[collectionIndex].items.findIndex(
            item => item.id === request.id
          );
          if (existingRequestIndex === -1) {
            newCollections[collectionIndex].items.push(request);
          }
        }
      }
      
      return newCollections;
    });
  };

  const handleDeleteHistoryItem = (index) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  };

  // Variable substitution function - replaces {{variable}} with actual values
  const substituteVariables = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Combine environment and global variables (environment takes precedence)
    const allVariables = [...globalVariables, ...environmentVariables].filter(v => v.key && v.value);
    const variableMap = {};
    
    // Environment variables override global variables
    allVariables.forEach(v => {
      variableMap[v.key] = v.value;
    });
    
    // Replace {{variable}} with value
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variableMap[varName] !== undefined ? variableMap[varName] : match;
    });
  };

  // Handle running all requests in a collection
  const handleRunCollection = async (collection) => {
    if (!collection || !collection.items) return;

    setIsRunningCollection(true);
    setCollectionRunResults({
      collectionName: collection.name,
      startTime: new Date().toISOString(),
      status: 'running',
      results: []
    });

    // Recursively collect all requests from collection
    const collectRequests = (items, folderPath = '') => {
      const requests = [];
      items.forEach(item => {
        if (item.type === 'request') {
          requests.push({
            ...item,
            folderPath: folderPath || 'Root'
          });
        } else if (item.type === 'folder' && item.items) {
          const newPath = folderPath ? `${folderPath} / ${item.name}` : item.name;
          requests.push(...collectRequests(item.items, newPath));
        }
      });
      return requests;
    };

    const allRequests = collectRequests(collection.items);
    const results = [];

    // Execute requests sequentially
    for (let i = 0; i < allRequests.length; i++) {
      const request = allRequests[i];
      
      setCollectionRunResults(prev => ({
        ...prev,
        currentIndex: i,
        totalRequests: allRequests.length,
        currentRequest: request.name
      }));

      try {
        const res = await sendRequest({
          url: substituteVariables(request.path || ''),
          method: request.method || 'GET',
          queryParams: request.queryParams || [{ key: '', value: '' }],
          headers: request.headers || [{ key: '', value: '' }],
          body: request.body || null,
          authType: request.authType || 'none',
          authData: request.authData || {},
          preRequestScript: request.preRequestScript || ''
        });

        results.push({
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.path,
          folderPath: request.folderPath,
          status: res.status,
          statusText: res.statusText,
          time: res.time,
          size: res.size,
          data: res.data,
          success: res.status >= 200 && res.status < 300,
          error: null
        });
      } catch (err) {
        results.push({
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.path,
          folderPath: request.folderPath,
          status: 0,
          statusText: 'Error',
          time: 0,
          size: 0,
          data: null,
          success: false,
          error: err.message || 'Request failed'
        });
      }
    }

    setCollectionRunResults({
      collectionName: collection.name,
      startTime: results[0]?.startTime || new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      totalRequests: allRequests.length,
      passedRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      results: results
    });

    setIsRunningCollection(false);
  };

  const isWorkspace = pathname.startsWith('/workspace');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hydrate theme from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('probestack_theme');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch (_) {}
  }, []);

  // Apply theme to document and persist
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('probestack_theme', theme);
    } catch (_) {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => {
    try {
      [
        'isLoggedIn',
        'userEmail',
        'userName',
        'userFirstName',
        'authToken',
        'pendingAuthEmail',
        'userRole',
        'userOrganization',
      ].forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
    // Auth0 logout: clear session and redirect to probestack.io
    window.location.assign(
      'https://probestack-usa-dev.us.auth0.com/v2/logout?client_id=rV9Ihy7REI9vFE7Uclelwp89wQfg3a4S&returnTo=https://probestack.io/'
    );
  };

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
                <span className="text-xl font-extrabold gradient-text font-heading">{isWorkspace ? 'ForgeQ' : 'ProbeStack'}</span>
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
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle - same as DashboardNavbar (porbestack-new-repo) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Menu Dropdown - same as DashboardNavbar */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((o) => !o)}
                className="w-8 h-8 flex items-center justify-center gap-0.5 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
              >
                <User className="w-4 h-4" />
                <ChevronDown className={clsx('w-3 h-3 transition-transform', isUserMenuOpen && 'rotate-180')} />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-dark-700 bg-dark-800/95 shadow-xl overflow-hidden z-50">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => { navigate('/'); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-dark-700 transition-colors text-left"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-dark-700 transition-colors text-left"
                    >
                      <BookOpen className="w-4 h-4" />
                      Knowledgebase
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* KR ELIXIR TECHNOLOGY - same as DashboardNavbar */}
            <div className="flex flex-col items-end ml-4">
              <div className="text-xl font-bold text-white leading-tight whitespace-nowrap">KR ELIXIR</div>
              <div className="text-xs text-gray-400 leading-tight whitespace-nowrap">TECHNOLOGY</div>
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
                collections={collections}
                projects={projects}
                activeRequestIndex={activeRequestIndex}
                onTabSelect={handleTabSelect}
                onNewTab={handleNewTab}
                onCloseTab={handleCloseTab}
                onTabRename={handleTabRename}
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
                onSaveRequest={handleSaveRequest}
                onAddProject={handleAddProject}
                onCollectionsChange={handleCollectionsChange}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                environmentVariables={environmentVariables}
                globalVariables={globalVariables}
                onEnvironmentVariablesChange={setEnvironmentVariables}
                onGlobalVariablesChange={setGlobalVariables}
                onSaveEnvironmentVariables={handleSaveEnvironmentVariables}
                onSaveGlobalVariables={handleSaveGlobalVariables}
                substituteVariables={substituteVariables}
                collectionRunResults={collectionRunResults}
                onRunCollection={handleRunCollection}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
