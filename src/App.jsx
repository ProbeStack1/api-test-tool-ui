import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, User, LogOut, ChevronDown, Search as SearchIcon, BookOpen, Settings, History, LayoutGrid, Layers, BarChart3, Bot } from 'lucide-react';
import clsx from 'clsx';
import { sendRequest } from './utils/api';
import Home from './components/Home';
import Reports from './components/Reports';
import Explore from './components/Explore';
import TestingToolPage from './pages/TestingToolPage';
import SettingsPage from './pages/SettingsPage';
import { Profile } from './pages/Profile';
import { ProfileSupport } from './pages/ProfileSupport';
import { ProfileSupportTicket } from './pages/ProfileSupportTicket';
import AIAssisted from './pages/AIAssisted';

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
      // Check for new workspaces key first, then fall back to old projects key for migration
      const stored = localStorage.getItem('probestack_workspaces') || localStorage.getItem('probestack_projects');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load workspaces from localStorage:', error);
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

  // Test files state for Generate Testcases - persisted to localStorage
  const [testFiles, setTestFiles] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_test_files');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load test files from localStorage:', error);
    }
    return [];
  });

  // Mock Service state - persisted to localStorage
  const [mockApis, setMockApis] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_mock_apis');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load mock APIs from localStorage:', error);
    }
    return [];
  });

  // Dummy mock requests for the sidebar (pre-defined examples)
  const dummyMockRequests = [
    {
      id: 'mock-req-1',
      name: 'Get User Profile',
      method: 'GET',
      path: '/users/profile',
      description: 'Retrieve current user profile information',
      mockResponse: { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' }
    },
    {
      id: 'mock-req-2',
      name: 'Create Order',
      method: 'POST',
      path: '/orders',
      description: 'Create a new order in the system',
      mockResponse: { orderId: 'ORD-12345', status: 'created', total: 99.99 }
    },
    {
      id: 'mock-req-3',
      name: 'Update Product',
      method: 'PUT',
      path: '/products/{id}',
      description: 'Update existing product details',
      mockResponse: { id: 101, name: 'Updated Product', price: 49.99, updated: true }
    },
    {
      id: 'mock-req-4',
      name: 'Delete Session',
      method: 'DELETE',
      path: '/sessions/{id}',
      description: 'Delete user session by ID',
      mockResponse: { deleted: true, sessionId: 'sess-abc123' }
    },
    {
      id: 'mock-req-5',
      name: 'Search Products',
      method: 'GET',
      path: '/products/search',
      description: 'Search products with filters',
      mockResponse: { results: [{ id: 1, name: 'Product A' }, { id: 2, name: 'Product B' }], total: 2 }
    },
    {
      id: 'mock-req-6',
      name: 'Webhook Event',
      method: 'POST',
      path: '/webhooks/events',
      description: 'Receive webhook event notifications',
      mockResponse: { received: true, eventId: 'evt-xyz789', timestamp: new Date().toISOString() }
    }
  ];

  useEffect(() => {
    try {
      localStorage.setItem('probestack_mock_apis', JSON.stringify(mockApis));
    } catch (error) {
      console.error('Failed to save mock APIs to localStorage:', error);
    }
  }, [mockApis]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_test_files', JSON.stringify(testFiles));
    } catch (error) {
      console.error('Failed to save test files to localStorage:', error);
    }
  }, [testFiles]);

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

  // Persist workspaces to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('probestack_workspaces', JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save workspaces to localStorage:', error);
    }
  }, [projects]);

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

  // Parse Postman collection JSON to internal format
  const parsePostmanCollection = (postmanJson, projectId, projectName) => {
    const parseUrl = (urlObj) => {
      if (typeof urlObj === 'string') return urlObj;
      if (!urlObj) return '';
      
      const protocol = urlObj.protocol || 'http';
      const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : (urlObj.host || 'localhost');
      const port = urlObj.port ? `:${urlObj.port}` : '';
      const path = Array.isArray(urlObj.path) ? `/${urlObj.path.join('/')}` : (urlObj.path || '');
      const query = urlObj.query && urlObj.query.length > 0 
        ? `?${urlObj.query.map(q => `${q.key}=${q.value || ''}`).join('&')}` 
        : '';
      
      return `${protocol}://${host}${port}${path}${query}`;
    };

    const parseHeaders = (headers) => {
      if (!headers || !Array.isArray(headers)) return [];
      return headers.map(h => ({
        key: h.key || '',
        value: h.value || '',
        enabled: h.disabled !== true
      }));
    };

    const parseBody = (body) => {
      if (!body) return { type: 'none', data: '' };
      
      if (body.mode === 'raw') {
        return { type: 'raw', data: body.raw || '' };
      } else if (body.mode === 'formdata') {
        return { 
          type: 'form-data', 
          data: body.formdata || [] 
        };
      } else if (body.mode === 'urlencoded') {
        return { 
          type: 'x-www-form-urlencoded', 
          data: body.urlencoded || [] 
        };
      }
      return { type: 'none', data: '' };
    };

    const parseAuth = (auth) => {
      if (!auth || !auth.type) return { type: 'none' };
      
      if (auth.type === 'bearer') {
        const token = auth.bearer?.find(b => b.key === 'token')?.value || '';
        return { type: 'bearer', token };
      } else if (auth.type === 'basic') {
        const username = auth.basic?.find(b => b.key === 'username')?.value || '';
        const password = auth.basic?.find(b => b.key === 'password')?.value || '';
        return { type: 'basic', username, password };
      } else if (auth.type === 'apikey') {
        const key = auth.apikey?.find(a => a.key === 'key')?.value || '';
        const value = auth.apikey?.find(a => a.key === 'value')?.value || '';
        const addTo = auth.apikey?.find(a => a.key === 'in')?.value || 'header';
        return { type: 'apikey', key, value, in: addTo };
      }
      return { type: 'none' };
    };

    const parseItem = (item, depth = 0) => {
      // If item has 'request' property, it's a request
      if (item.request) {
        const request = item.request;
        return {
          id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: item.name || 'Untitled Request',
          type: 'request',
          method: (request.method || 'GET').toUpperCase(),
          path: parseUrl(request.url),
          headers: parseHeaders(request.header),
          body: parseBody(request.body),
          auth: parseAuth(request.auth),
          params: request.url?.query || [],
        };
      }
      
      // If item has 'item' array, it's a folder
      if (item.item && Array.isArray(item.item)) {
        return {
          id: `imported-folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: item.name || 'Untitled Folder',
          type: 'folder',
          icon: 'folder',
          items: item.item.map(subItem => parseItem(subItem, depth + 1))
        };
      }
      
      return null;
    };

    // Parse the collection
    const collectionName = postmanJson.info?.name || 'Imported Collection';
    const items = postmanJson.item ? postmanJson.item.map(item => parseItem(item)) : [];
    
    return {
      id: `imported-collection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: collectionName,
      type: 'collection',
      icon: 'folder',
      project: projectId,
      projectName: projectName,
      items: items.filter(Boolean)
    };
  };

  const handleAddProject = (workspaceData) => {
    // Handle both old string format and new object format
    const isLegacyFormat = typeof workspaceData === 'string';
    const name = isLegacyFormat ? workspaceData : workspaceData.name;
    const visibility = isLegacyFormat ? 'private' : (workspaceData.visibility || 'private');
    const importedCollection = isLegacyFormat ? null : workspaceData.importedCollection;
    
    const newProjectId = `project-${Date.now()}`;
    const newProject = { 
      id: newProjectId, 
      name: name.trim(),
      visibility
    };
    setProjects((prev) => [...prev, newProject]);
    
    // If there's an imported collection, create it under this workspace
    if (importedCollection && importedCollection.content) {
      const parsedCollection = parsePostmanCollection(importedCollection.content, newProjectId, name.trim());
      setCollections((prev) => [...prev, parsedCollection]);
    }
    
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

  // Mock Service handlers
  const handleCreateMock = (collectionOrFolder) => {
    const mockId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Recursively collect all requests from the collection/folder
    const collectRequests = (items, folderPath = '') => {
      const requests = [];
      items.forEach(item => {
        if (item.type === 'request') {
          const endpointName = (item.path || '').replace(/^\//, '').replace(/\//g, '-') || 'endpoint';
          const mockUrl = `api.probestack.io/api/v1/${endpointName}`;
          
          requests.push({
            id: item.id,
            name: item.name,
            method: item.method,
            path: item.path,
            mockUrl: mockUrl,
            folderPath: folderPath || 'Root',
            mockResponse: item.mockResponse || { message: 'Mock response' }
          });
        } else if (item.type === 'folder' && item.items) {
          const newPath = folderPath ? `${folderPath} / ${item.name}` : item.name;
          requests.push(...collectRequests(item.items, newPath));
        }
      });
      return requests;
    };
    
    const mockedRequests = collectRequests(collectionOrFolder.items || []);
    
    const newMock = {
      id: mockId,
      originalItemId: collectionOrFolder.id,
      name: collectionOrFolder.name,
      type: collectionOrFolder.type, // 'collection' or 'folder'
      requests: mockedRequests,
      createdAt: new Date().toISOString(),
    };
    
    setMockApis((prev) => [...prev, newMock]);
    return newMock;
  };

  const handleDeleteMock = (mockId) => {
    setMockApis((prev) => prev.filter(m => m.id !== mockId));
  };

  const handleRenameMock = (mockId, newName) => {
    setMockApis((prev) => prev.map(m => {
      if (m.id === mockId) {
        return { ...m, name: newName };
      }
      return m;
    }));
  };

  const handleSelectMockRequest = async (mockedCollection) => {
    // Run the mocked collection/folder as a collection with mock URLs
    if (!mockedCollection || !mockedCollection.requests) return;

    setIsRunningCollection(true);
    setCollectionRunResults({
      collectionName: mockedCollection.name,
      startTime: new Date().toISOString(),
      status: 'running',
      results: []
    });

    const results = [];

    // Execute all mocked requests sequentially
    for (let i = 0; i < mockedCollection.requests.length; i++) {
      const request = mockedCollection.requests[i];
      
      setCollectionRunResults(prev => ({
        ...prev,
        currentIndex: i,
        totalRequests: mockedCollection.requests.length,
        currentRequest: request.name
      }));

      try {
        // Simulate API call with mock URL
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        
        results.push({
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.mockUrl,
          folderPath: request.folderPath,
          status: 200,
          statusText: 'OK (Mocked)',
          time: Math.floor(Math.random() * 200) + 50,
          size: JSON.stringify(request.mockResponse).length,
          data: request.mockResponse,
          success: true,
          error: null
        });
      } catch (err) {
        results.push({
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.mockUrl,
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
      collectionName: mockedCollection.name,
      startTime: results[0]?.startTime || new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      totalRequests: mockedCollection.requests.length,
      passedRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      results: results
    });

    setIsRunningCollection(false);
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

  // Top menu navigation items
  const topMenuItems = [
    { id: 'history', label: 'History', path: '/workspace/history', icon: History },
    { id: 'collections', label: 'Collections', path: '/workspace/collections', icon: LayoutGrid },
    { id: 'environments', label: 'Variables', path: '/workspace/variables', icon: Layers },
    { id: 'testing', label: 'Testing', path: '/workspace/testing', icon: BarChart3 },
    { id: 'mock-service', label: 'Mock Service', path: '/workspace/mock-service', icon: Layers },
    { id: 'ai-assisted', label: 'AI-Assisted', path: '/workspace/ai-assisted', icon: Bot },
    { id: 'dashboard', label: 'Dashboard', path: '/workspace/dashboard', icon: BarChart3 },
  ];

  // Determine active menu based on current path
  const getActiveMenu = () => {
    if (pathname.includes('/workspace/profile')) return null; // Profile pages don't highlight navigation
    if (pathname.includes('/workspace/history')) return 'history';
    if (pathname.includes('/workspace/variables')) return 'environments';
    if (pathname.includes('/workspace/testing')) return 'testing';
    if (pathname.includes('/workspace/mock-service')) return 'mock-service';
    if (pathname.includes('/workspace/ai-assisted')) return 'ai-assisted';
    if (pathname.includes('/workspace/dashboard')) return 'dashboard';
    if (pathname.includes('/workspace/collections')) return 'collections';
    return 'collections';
  };
  const activeMenu = getActiveMenu();

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
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-12 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold gradient-text font-heading whitespace-nowrap">ForgeQ</span>
                <span className="text-[0.65rem] text-gray-400 leading-tight mt-0.5 whitespace-nowrap">A ForgeCrux Company</span>
              </div>
            </div>
            
            {/* Navigation Links - only show on workspace pages */}
            {isWorkspace && (
              <nav className="flex items-center gap-1 ml-12">
                {topMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                        isActive
                          ? 'bg-primary/15 border border-primary/40 text-primary shadow-sm'
                          : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Settings Button */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

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
                      onClick={() => { navigate('/workspace/profile'); setIsUserMenuOpen(false); }}
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

            {/* KR ELIXIR TECHNOLOGY - same as DashboardNavbar - commented out */}
            {/*
            <div className="flex flex-col items-end ml-4">
              <div className="text-xl font-bold text-white leading-tight whitespace-nowrap">KR ELIXIR</div>
              <div className="text-xs text-gray-400 leading-tight whitespace-nowrap">TECHNOLOGY</div>
            </div>
            */}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reports" element={<Reports history={history} />} />
          <Route path="/explore" element={<Explore onImport={handleImport} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/workspace/profile" element={<Profile />} />
          <Route path="/workspace/profile/support" element={<ProfileSupport />} />
          <Route path="/workspace/profile/support/ticket" element={<ProfileSupportTicket />} />
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
                testFiles={testFiles}
                onTestFilesChange={setTestFiles}
                mockApis={mockApis}
                dummyMockRequests={dummyMockRequests}
                onCreateMock={handleCreateMock}
                onDeleteMock={handleDeleteMock}
                onRenameMock={handleRenameMock}
                onSelectMockRequest={handleSelectMockRequest}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
