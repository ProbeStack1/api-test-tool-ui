import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, User, LogOut, ChevronDown, Search as SearchIcon, BookOpen, Settings, History, LayoutGrid, Layers, BarChart3, Bot } from 'lucide-react';
import clsx from 'clsx';
// import { sendRequest } from './utils/api';
import { fetchWorkspaces, createWorkspace, normalizeWorkspace } from './services/workspaceService';
import { fetchCollections, normalizeCollection,fetchFolders,normalizeFolder,createCollection } from './services/collectionService';
import { fetchRequests, normalizeRequest,updateRequest,createRequest ,executeRequest,executeCollection ,fetchGlobalHistory  } from './services/requestService';
import {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  deactivateEnvironment,
  normalizeEnvironment
} from './services/environmentService'
import {
  createMockServer,
  getAllMockServers,
  updateMockServer,
  toggleMockServer,
  deleteMockServer,
  executeGetOnMock,
  executePostOnMock,
  executePutOnMock,
  executeDeleteOnMock,
  executePatchOnMock,
  createEndpoint,
  getEndpoints,
} from './services/mockServerService'; ;
import Home from './components/Home';
import Reports from './components/Reports';
import Explore from './components/Explore';
import TestingToolPage from './pages/TestingToolPage';
import SettingsPage from './pages/SettingsPage';
import { Profile } from './pages/Profile';
import { ProfileSupport } from './pages/ProfileSupport';
import { ProfileSupportTicket } from './pages/ProfileSupportTicket';
import {toast} from 'sonner';
import AIAssisted from './pages/AIAssisted';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
const currentUserId = localStorage.getItem('probestack_user_id');
  const [environmentVariablesDirty, setEnvironmentVariablesDirty] = useState(false);
  const [globalEnvironment, setGlobalEnvironment] = useState(null);
const [globalVariablesDirty, setGlobalVariablesDirty] = useState(false);
const [mockServers, setMockServers] = useState([]);
const [isLoadingMocks, setIsLoadingMocks] = useState(false);
const [projects, setProjects] = useState([]);

const fetchMockServers = async () => {
  setIsLoadingMocks(true);
  try {
    const response = await getAllMockServers();
    const mocks = response.data || [];
    // For each mock, fetch its endpoints
    const mocksWithEndpoints = await Promise.all(
      mocks.map(async (mock) => {
        try {
          const endpointsRes = await getEndpoints(mock.id, { limit: 100 }); // we need to import getEndpoints
          
          return { ...mock, endpoints: endpointsRes.data || [] };
        } catch (err) {
          return { ...mock, endpoints: [] };
        }
      })
    );
    setMockServers(mocksWithEndpoints);
  } catch (error) {
    toast.error('Could not load mock servers');
  } finally {
    setIsLoadingMocks(false);
  }
};

const handleCreateMockServer = async (mockData) => {
  try {
    const workspaceId = projects[0]?.id;
    if (!workspaceId) {
      toast.error('No workspace available');
      return null;
    }

    // Step 1: Create the mock server
    const { name, visibility, delay, collectionId, endpoints } = mockData;
    const createPayload = {
      name,
      isPrivate: visibility === 'private', // convert string to boolean
      delayMs: delay,
    };
    if (collectionId) {
      createPayload.collectionId = collectionId;
    }

    const createResponse = await createMockServer(workspaceId, createPayload);
    const newMock = createResponse.data; // contains id, mockUrl, etc.

    // Step 2: Create endpoints
    const createdEndpoints = [];
    for (const ep of endpoints) {
      const endpointPayload = {
        method: ep.method,
        path: ep.path,
        responseStatus: ep.statusCode,
        responseBody: ep.responseBody,
        responseHeaders: {}, // optional, can be added later
        delayMs: delay,       // use the same global delay, or you could allow per‑endpoint later
      };
      try {
        const epResponse = await createEndpoint(newMock.id, endpointPayload);
        createdEndpoints.push(epResponse.data);
      } catch (epErr) {
        toast.error(`Failed to create endpoint ${ep.path}`);
        // Continue with other endpoints? Decide based on requirements.
      }
    }

    // Build the complete mock server object (including endpoints)
    const newMockWithEndpoints = { ...newMock, endpoints: createdEndpoints };
    setMockServers(prev => [...prev, newMockWithEndpoints]);
    toast.success('Mock server created');
    return newMockWithEndpoints;
  } catch (error) {
    toast.error(error.response?.data?.message || 'Creation failed');
    throw error;
  }
};

const handleRenameMockServer = async (mockId, newName) => {
  try {
    const response = await updateMockServer(mockId, { name: newName });
    const updated = response.data;
    setMockServers(prev => prev.map(m => m.id === mockId ? updated : m));
    toast.success('Mock server renamed');
  } catch (error) {
    toast.error('Rename failed');
  }
};

const handleDeleteMockServer = async (mockId) => {
  try {
    await deleteMockServer(mockId);
    setMockServers(prev => prev.filter(m => m.id !== mockId));
    toast.success('Mock server deleted');
  } catch (error) {
    toast.error('Delete failed');
  }
};

const handleToggleVisibility = async (mockId) => {
  try {
    const response = await toggleMockServer(mockId);
    const updated = response.data;
    setMockServers(prev => prev.map(m => m.id === mockId ? updated : m));
    toast.success(`Visibility changed to ${updated.visibility}`);
  } catch (error) {
    toast.error('Toggle failed');
  }
};

const handleExecuteMockRequest = async (mockServer, endpoint, requestOverrides = {}) => {
  try {
    const { mockUrl } = mockServer;   // instead of urlSlug
    const { method, path } = endpoint;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const headers = requestOverrides.headers || {};
    const body = requestOverrides.body || null;

    let response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await executeGetOnMock(mockUrl, cleanPath, headers);
        break;
      case 'POST':
        response = await executePostOnMock(mockUrl, cleanPath, body, headers);
        break;
      case 'PUT':
        response = await executePutOnMock(mockUrl, cleanPath, body, headers);
        break;
      case 'DELETE':
        response = await executeDeleteOnMock(mockUrl, cleanPath, headers);
        break;
      case 'PATCH':
        response = await executePatchOnMock(mockUrl, cleanPath, body, headers);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    // Transform...
    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      time: response.duration || 0,
    };
  } catch (error) {
    throw error;
  }
};

const handleUpdateMockServer = async (mockId, updatedData, newEndpoints) => {
  try {
    // Update mock server metadata
    const { name, visibility, delay } = updatedData;
    await updateMockServer(mockId, {
      name,
      isPrivate: visibility === 'private',
      delayMs: delay,
    });

    // Create new endpoints
    const createdEndpoints = [];
    for (const ep of newEndpoints) {
      const endpointPayload = {
        method: ep.method,
        path: ep.path,
        responseStatus: ep.statusCode,
        responseBody: ep.responseBody,
        responseHeaders: {},
        delayMs: delay,
      };
      const epResponse = await createEndpoint(mockId, endpointPayload);
      createdEndpoints.push(epResponse.data);
    }

    // Update local state
    setMockServers(prev => prev.map(mock =>
      mock.id === mockId
        ? { ...mock, name, isPrivate: visibility === 'private', delayMs: delay, endpoints: [...mock.endpoints, ...createdEndpoints] }
        : mock
    ));
    toast.success('Mock server updated');
  } catch (error) {
    toast.error('Update failed');
  }
};


const globalVariables = globalEnvironment?.variables || [];

const handleEnvironmentVariablesChange = (newVars) => {
  setEnvironmentVariables(newVars);
  const currentEnv = environments.find(e => e.id === selectedEnvironmentId);
  if (currentEnv) {
    const savedVars = currentEnv.variables || [];
    if (JSON.stringify(newVars) !== JSON.stringify(savedVars)) {
      setEnvironmentVariablesDirty(true);
    } else {
      setEnvironmentVariablesDirty(false);
    }
  } else {
    setEnvironmentVariablesDirty(true);
  }
};

  const isSavedRequest = (req) => {
  if (!req || !req.id) return false;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(req.id) && !!req.collectionId;
};
const [pristineRequests, setPristineRequests] = useState(() => {
  const initial = {};
  try {
    const stored = localStorage.getItem('probestack_requests');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.forEach(req => {
        if (isSavedRequest(req)) {
          initial[req.id] = JSON.parse(JSON.stringify(req));
        }
      });
    }
  } catch (error) {
  }
  return initial;
});
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('probestack_history');
    return saved ? JSON.parse(saved) : [];
  });


const handleGlobalVariablesChange = (newVars) => {
  setGlobalEnvironment(prev => prev
    ? { ...prev, variables: newVars }
    : { id: null, name: 'Global', variables: newVars, environment_type: 'global' }
  );
  setGlobalVariablesDirty(true);
};

const handleSaveGlobalVariables = async () => {
  // Need a workspaceId for creation
  const firstWorkspaceId = projects.length > 0 ? projects[0].id : null;
  if (!firstWorkspaceId) {
    toast.error('No workspace available to create global environment');
    return;
  }

  if (!globalEnvironment || !globalEnvironment.id) {
    // Create
    try {
      const response = await createEnvironment(firstWorkspaceId, {
        name: 'Global',
        environment_type: 'global',
        variables: globalVariables,
        is_active:true
      });
      const newEnv = normalizeEnvironment(response.data);
      setGlobalEnvironment(newEnv);
      setEnvironments(prev => [...prev.filter(e => e.id !== 'no-env'), newEnv, { id: 'no-env', name: 'No Environment' }]);
      setGlobalVariablesDirty(false);
      toast.success('Global variables saved');
    } catch (err) {
      toast.error('Failed to create global variables');
    }
  } else {
    // Update
    try {
      await updateEnvironment(globalEnvironment.id, { variables: globalVariables });
      setGlobalVariablesDirty(false);
      toast.success('Global variables saved');
    } catch (err) {
      toast.error('Failed to save global variables');
    }
  }
};


const createEmptyRequest = () => ({
  id: `adarshab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: 'Untitled Request',
  method: 'GET',
  url: '',
  queryParams: [],         
  headers: [],                
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
    }
    return [];
  });

 
  const [activeRequestIndex, setActiveRequestIndex] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_active_request_index');
      if (stored !== null) {
        return parseInt(stored, 10);
      }
    } catch (error) {
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

const [environments, setEnvironments] = useState(() => [{ id: 'no-env', name: 'No Environment' }]);
const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('no-env');


  // Variables state with localStorage persistence
  const [environmentVariables, setEnvironmentVariables] = useState(() => {
    try {
      const stored = localStorage.getItem('probestack_environment_variables');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
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
    }
  }, [mockApis]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_test_files', JSON.stringify(testFiles));
    } catch (error) {
    }
  }, [testFiles]);

  useEffect(() => {
    localStorage.setItem('probestack_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_requests', JSON.stringify(requests));
    } catch (error) {
    }
  }, [requests]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_active_request_index', activeRequestIndex.toString());
    } catch (error) {
    }
  }, [activeRequestIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('probestack_environment_variables', JSON.stringify(environmentVariables));
    } catch (error) {
    }
  }, [environmentVariables]);




  // Guard so the API bootstrap only runs once per page load
  const hasFetchedRef = useRef(false);

  // On mount: load workspaces and their collections from the backend.
  // Skipped entirely when no probestack_user_id is in localStorage so
  // unauthenticated / offline sessions continue working unchanged.
// Guard to ensure initial fetch runs only once

// ─── Load Workspaces + Collections + Folders from Backend on Mount ─────────────
// Guard to ensure initial fetch runs only once
// Load Workspaces + Collections + Folders + Requests from Backend on Mount
useEffect(() => {
  const userId = localStorage.getItem('probestack_user_id');
  if (!userId || hasFetchedRef.current) return;

  hasFetchedRef.current = true;

const loadData = async () => {
  try {

    // 1. Fetch workspaces / projects
    const wsRes = await fetchWorkspaces();
    const workspaces = wsRes.data.map(normalizeWorkspace);
    setProjects(workspaces);

    const allCollections = [];

    for (const ws of workspaces) {
      // 2. Fetch collections for this workspace
      const colRes = await fetchCollections(ws.id);
      const cols = colRes.data.map(col => normalizeCollection(col, ws));

      for (const col of cols) {
        // 3. Fetch folders for this collection
        let folders = [];
        try {
          const folderRes = await fetchFolders(col.id);
          folders = folderRes.data.map(normalizeFolder);
        } catch (err) {
        }

        // --- Build folder hierarchy ---
        // Map folder id to folder object for quick lookup
        const folderMap = new Map();
        folders.forEach(f => folderMap.set(f.id, f));

        // Identify root folders (no parent) and build nested structure
        const rootFolders = [];
        folders.forEach(f => {
          if (f.parentFolderId) {
            const parent = folderMap.get(f.parentFolderId);
            if (parent) {
              // Ensure parent has an items array
              if (!parent.items) parent.items = [];
              parent.items.push(f);
            } else {
              // Parent not found – treat as root
              rootFolders.push(f);
            }
          } else {
            rootFolders.push(f);
          }
        });

        // Recursive sort helper
        const sortItems = (items) => {
          if (!items) return;
          items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return (a.orderIndex || 0) - (b.orderIndex || 0);
          });
          items.forEach(item => {
            if (item.items) sortItems(item.items);
          });
        };
        sortItems(rootFolders);

        // Start building the collection items with the root folders
        const items = [...rootFolders];

        // 4. Fetch all requests for this collection
        let requestsInCol = [];
        try {
          const reqRes = await fetchRequests({ collectionId: col.id });
          requestsInCol = reqRes.data.map(normalizeRequest);
        } catch (err) {
        }

        // Place each request under its parent folder (or at root)
        requestsInCol.forEach(req => {
          const parentFolderId = req.folderId;
          if (parentFolderId) {
            const parentFolder = folderMap.get(parentFolderId);
            if (parentFolder) {
              if (!parentFolder.items) parentFolder.items = [];
              parentFolder.items.push(req);
            } else {
              // Parent folder not found – fallback to root
              items.push(req);
            }
          } else {
            // Root-level request
            items.push(req);
          }
        });

        // Sort items again (folders already sorted, requests appended)
        sortItems(items);

        allCollections.push({
          ...col,
          items,
        });
      }
    }

    setCollections(allCollections);
    // 5. Fetch global execution history
    try {
      const historyRes = await fetchGlobalHistory({ limit: 50 });

      // Normalize backend items to frontend shape
      const normalizedHistory = (historyRes.data.data || []).map(item => ({
        url: item.url,
        method: item.method,
        status: item.status_code,
        size: item.response_size_bytes,
        time: item.response_time_ms,
        error: item.error_message ? true : false,
        date: item.executed_at, // ISO string; can be used directly with new Date(item.date)
      }));

      setHistory(normalizedHistory);
    } catch (err) {
      // Optionally fall back to localStorage if you want
    }

  
// 6. Fetch environments
try {
  // Fetch global environments (no workspaceId)
  const globalRes = await listEnvironments({ limit: 100 });
  const globalEnvs = globalRes.data.map(normalizeEnvironment);

  // Fetch workspace environments for each workspace
  let allEnvs = [...globalEnvs];
  for (const ws of workspaces) {
    try {
      const wsRes = await listEnvironments({ workspaceId: ws.id, limit: 100 });
      const wsEnvs = wsRes.data.map(normalizeEnvironment);
      allEnvs = [...allEnvs, ...wsEnvs];
    } catch (err) {
    }
  }

  // Remove duplicates by id (just in case)
  const uniqueEnvs = Array.from(new Map(allEnvs.map(env => [env.id, env])).values());

  // ✅ Extract and store the global environment
  const globalEnv = uniqueEnvs.find(env => env.environmentType === 'global');
  setGlobalEnvironment(globalEnv || null);

  setEnvironments([{ id: 'no-env', name: 'No Environment' }, ...uniqueEnvs]);

  if (uniqueEnvs.length > 0) {
    const activeEnv = uniqueEnvs.find(e => e.isActive) || uniqueEnvs[0];
    setSelectedEnvironmentId(activeEnv.id);
    setEnvironmentVariables(activeEnv.variables || []);
  } else {
    setEnvironmentVariables([]);
  }
} catch (err) {
  console.error('[App] Failed to load environments:', err);
  setEnvironments([{ id: 'no-env', name: 'No Environment' }]);
}

await fetchMockServers();

  } catch (err) {
  }
};

  loadData();
}, []);

useEffect(() => {
}, [collections]);

const handleSaveEnvironmentVariables = async () => {
  if (selectedEnvironmentId === 'no-env') {
    toast.info('Cannot save variables for "No Environment". Please select a real environment.');
    return;
  }
  try {
    await updateEnvironment(selectedEnvironmentId, {
      variables: environmentVariables,
    });
    setEnvironments(prev =>
      prev.map(env =>
        env.id === selectedEnvironmentId
          ? { ...env, variables: environmentVariables }
          : env
      )
    );
    setEnvironmentVariablesDirty(false);
    toast.success('Environment variables saved');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save variables');
  }
};

const handleEnvironmentChange = (envId) => {
  setSelectedEnvironmentId(envId);
  setEnvironmentVariablesDirty(false);
  if (envId === 'no-env') {
    setEnvironmentVariables([]);
  } else {
    const env = environments.find(e => e.id === envId);
    if (env) {
      setEnvironmentVariables(env.variables || []);
    }
  }
};

const handleSelectMockEndpoint = (mockServer, endpoint) => {
  const endpointRequest = {
    id: `mock-endpoint-${endpoint.id}`,
    name: `${mockServer.name} - ${endpoint.method} ${endpoint.path}`,
    method: endpoint.method,
    url: `/api/v1/mocks/${mockServer.mockUrl}${endpoint.path}`,
    mockServer: mockServer,
    mockEndpoint: endpoint,
    isMockEndpoint: true,
    queryParams: [],
    headers: [],
    body: '',
    authType: 'none',
    authData: {},
    preRequestScript: '',
    tests: '',
  };
  handleSelectEndpoint(endpointRequest, true);  // ← skip navigation
};


const handleExecute = async () => {
  if (!url) return;

  setIsLoading(true);
  setResponse(null);
  setError(null);

  const currentReq = requests[activeRequestIndex];

  // ✅ Check for mock endpoint FIRST and execute via mock handler
  if (currentReq.isMockEndpoint) {
    try {
      const res = await handleExecuteMockRequest(currentReq.mockServer, currentReq.mockEndpoint);
      setResponse(res);
      addToHistory(url, method, res.status, res.size, res.time);
    } catch (err) {
      setError(err);
      addToHistory(url, method, 0, 0, 0, true);
    } finally {
      setIsLoading(false);
    }
    return;
  }

  // Normal request flow (saved or unsaved)
  const saved = isSavedRequest(currentReq);
  try {
    let targetRequestId = currentReq.id;

    // If not saved, create it first
    if (!saved) {
      const payload = {
        name: currentReq.name || 'Untitled Request',
        method,
        url,
        headers,
        query_params: queryParams,
        body_type: 'raw',
        body_content: body,
        auth_type: authType,
        auth_config: authData,
        pre_request_script: preRequestScript,
        test_script: tests,
        collection_id: null,
        folder_id: null,
      };

      const createRes = await createRequest(payload);
      const savedRequest = normalizeRequest(createRes.data);
      setRequests(prev => prev.map(req => req.id === currentReq.id ? savedRequest : req));
      setPristineRequests(prev => ({ ...prev, [savedRequest.id]: JSON.parse(JSON.stringify(savedRequest)) }));
      targetRequestId = savedRequest.id;
    }

    // Build overrides
    const overrides = {};
    overrides.url = url;
    overrides.headers = headers.map(h => ({ key: h.key, value: h.value, enabled: h.enabled ?? true }));
    overrides.query_params = queryParams.map(q => ({ key: q.key, value: q.value, enabled: q.enabled ?? true }));

    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      overrides.body_content = body;
    }
    overrides.path_variables = [];

    const axiosResponse = await executeRequest(targetRequestId, { overrides });
    const executionResult = axiosResponse.data;

    let parsedBody = executionResult.response_body;
    if (typeof parsedBody === 'string') {
      const trimmed = parsedBody.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          parsedBody = JSON.parse(parsedBody);
        } catch (e) {}
      }
    }

    const res = {
      status: executionResult.status_code,
      statusText: executionResult.status_text || '',
      time: executionResult.response_time_ms || 0,
      size: executionResult.response_size_bytes || 0,
      data: parsedBody,
      headers: executionResult.response_headers || [],
      testResults: executionResult.test_results || [],
      testScriptError: executionResult.error_message || null,
    };

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

const handleSelectEndpoint = (endpoint, skipNavigate = false) => {
  if (endpoint.id) {
    const existingTabIndex = requests.findIndex((req) => req.id === endpoint.id);
    if (existingTabIndex !== -1) {
      // Update existing tab
      setRequests((prev) => {
        const next = [...prev];
        next[existingTabIndex] = endpoint;
        return next;
      });
      setActiveRequestIndex(existingTabIndex);
      setPristineRequests((prev) => ({
        ...prev,
        [endpoint.id]: JSON.parse(JSON.stringify(endpoint)),
      }));
    } else {
      // Add as new tab
      setRequests((prev) => {
        const newRequests = [...prev, endpoint];
        setTimeout(() => setActiveRequestIndex(newRequests.length - 1), 0);
        return newRequests;
      });
      setPristineRequests((prev) => ({
        ...prev,
        [endpoint.id]: JSON.parse(JSON.stringify(endpoint)),
      }));
    }
  } else {
    // Legacy handling (dummy endpoints)
    const existingTabIndex = requests.findIndex(
      (req) => req.name === endpoint.name && req.url === endpoint.path && req.method === endpoint.method
    );
    if (existingTabIndex !== -1) {
      setActiveRequestIndex(existingTabIndex);
    } else {
      const newRequest = {
        ...createEmptyRequest(),
        url: endpoint.path,
        method: endpoint.method,
        name: endpoint.name || 'Untitled Request',
      };
      setRequests((prev) => {
        const next = [...prev, newRequest];
        setTimeout(() => setActiveRequestIndex(next.length - 1), 0);
        return next;
      });
    }
  }
  setResponse(null);
  setError(null);
  if (!skipNavigate) {
    navigate('/workspace');
  }
};

 const handleUpdateRequest = async (updatedRequest) => {
    try {
      // Build payload with all fields that can change
      const payload = {
        name: updatedRequest.name,
        method: updatedRequest.method,
        url: updatedRequest.url,
        headers: updatedRequest.headers,
        query_params: updatedRequest.queryParams,
        body_type: updatedRequest.bodyType || 'none',
        body_content: updatedRequest.body,
        auth_type: updatedRequest.authType,
        auth_config: updatedRequest.authData,
        pre_request_script: updatedRequest.preRequestScript,
        test_script: updatedRequest.tests,
        // Optionally include folder_id if you allow moving via save (not yet implemented)
      };

      const response = await updateRequest(updatedRequest.id, payload);
      const savedRequest = normalizeRequest(response.data);

      // Update the request in the tabs
      setRequests((prev) =>
        prev.map((req) => (req.id === savedRequest.id ? savedRequest : req))
      );

      // Update pristine copy
      setPristineRequests((prev) => ({
        ...prev,
        [savedRequest.id]: JSON.parse(JSON.stringify(savedRequest)),
      }));

      // Also update the request in the collections tree
      setCollections((prev) => {
        const updateInTree = (items) => {
          if (!items) return items;
          return items.map((item) => {
            if (item.id === savedRequest.id) return savedRequest;
            if (item.items) return { ...item, items: updateInTree(item.items) };
            return item;
          });
        };
        return updateInTree(prev);
      });

      toast.success('Request updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleSaveRequest = async (saveData) => {
    const { projectId, projectName, collectionId, collectionName, isNewCollection, request, folderId } = saveData;

    // Prevent duplicate saves
    if (savedRequestIdsRef.current.has(request.id)) return;
    savedRequestIdsRef.current.add(request.id);

    let targetCollectionId = collectionId;
    let targetCollectionName = collectionName;

    try {
      // If creating a new collection, create it first
      if (isNewCollection) {
        const newColRes = await createCollection(projectId, { name: collectionName });
        targetCollectionId = newColRes.data.id;
        targetCollectionName = newColRes.data.name;
      }

      // Prepare payload for createRequest
      const payload = {
        name: request.name,
        method: request.method,
        url: request.url,
        headers: request.headers,
        query_params: request.queryParams,
        body_type: request.bodyType || 'none',
        body_content: request.body,
        auth_type: request.authType,
        auth_config: request.authData,
        pre_request_script: request.preRequestScript,
        test_script: request.tests,
        collection_id: targetCollectionId,
        folder_id: folderId || null,
      };

      const createRes = await createRequest(payload);
      const savedRequest = normalizeRequest(createRes.data);

      // Replace the temporary tab request with the saved one
      setRequests((prev) =>
        prev.map((req) => (req.id === request.id ? savedRequest : req))
      );

      // Store pristine copy for the newly saved request
      setPristineRequests((prev) => ({
        ...prev,
        [savedRequest.id]: JSON.parse(JSON.stringify(savedRequest)),
      }));

      // Add the request to the collections tree
      setCollections((prev) => {
        const newCollections = [...prev];
        if (isNewCollection) {
          const newCollection = {
            id: targetCollectionId,
            name: targetCollectionName,
            type: 'collection',
            project: projectId,
            projectName,
            items: [savedRequest],
          };
          newCollections.push(newCollection);
        } else {
          const collectionIndex = newCollections.findIndex((col) => col.id === targetCollectionId);
          if (collectionIndex !== -1) {
            if (!newCollections[collectionIndex].items) newCollections[collectionIndex].items = [];
            if (!newCollections[collectionIndex].items.some((item) => item.id === savedRequest.id)) {
              newCollections[collectionIndex].items.push(savedRequest);
            }
          }
        }
        return newCollections;
      });

      toast.success('Request saved');
    } catch (err) {
      console.error('[handleSaveRequest] error:', err);
      toast.error(err.response?.data?.message || 'Save failed');
      savedRequestIdsRef.current.delete(request.id); // allow retry
    }
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

    // Create workspace locally first (synchronous — CollectionsPanel relies on
    // the return value immediately to set the selected workspace).
    const tempId = `project-${Date.now()}`;
    const newProject = {
      id: tempId,
      name: name.trim(),
      visibility,
    };
    setProjects((prev) => [...prev, newProject]);

    // If there's an imported collection, create it under this workspace
    if (importedCollection && importedCollection.content) {
      const parsedCollection = parsePostmanCollection(importedCollection.content, tempId, name.trim());
      setCollections((prev) => [...prev, parsedCollection]);
    }

    // Persist to backend in the background; swap temp ID for the real UUID on success.
    const userId = localStorage.getItem('probestack_user_id');
    if (userId) {
      createWorkspace({ name: name.trim(), visibility })
        .then((res) => {
          const realId = res.data?.id;
          if (realId && realId !== tempId) {
            setProjects((prev) =>
              prev.map((p) => (p.id === tempId ? { ...p, id: realId } : p))
            );
            // Also update any collections/folders that reference the temp ID
            setCollections((prev) =>
              prev.map((col) =>
                col.project === tempId ? { ...col, project: realId } : col
              )
            );
          }
        })
        .catch((err) =>
          console.error('[API] Failed to persist workspace to backend:', err)
        );
    }

    return newProject;
  };

  const handleCollectionsChange = (newCollections) => {
    setCollections(newCollections);
  };

  const savedRequestIdsRef = useRef(new Set());
const handleOpenWorkspaceDetails = (workspaceId) => {
  const workspace = projects.find(p => p.id === workspaceId);
  if (!workspace) return;

  // Check if already open
  const existingIndex = requests.findIndex(r => r.type === 'workspace-details' && r.workspaceId === workspaceId);
  if (existingIndex !== -1) {
    setActiveRequestIndex(existingIndex);
    return;
  }

  const newTab = {
    id: `workspace-details-${workspaceId}-${Date.now()}`,
    type: 'workspace-details',
    workspaceId: workspace.id,
    name: `Workspace: ${workspace.name}`,
    // can store workspace object or just id
  };
  setRequests(prev => [...prev, newTab]);
  setActiveRequestIndex(requests.length); // will be the new last index
};

const handleWorkspaceUpdate = (updatedWorkspace) => {
  setProjects(prev => prev.map(p => p.id === updatedWorkspace.id ? updatedWorkspace : p));
  // Also update the open tab if needed (e.g., rename the tab)
};

const handleWorkspaceDelete = (workspaceId) => {
  setProjects(prev => prev.filter(p => p.id !== workspaceId));
  // Close any open workspace details tabs
  setRequests(prev => prev.filter(req => !(req.type === 'workspace-details' && req.workspaceId === workspaceId)));
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
  const handleCreateEnvironment = async (desiredName) => {
    const workspaceId = projects.length > 0 ? projects[0].id : null;
    if (!workspaceId) {
      toast.error('No workspace available');
      return;
    }

    let attempt = 0;
    let currentName = desiredName;
    let success = false;
    let lastError = null;

    while (!success && attempt < 20) {
      try {
        const response = await createEnvironment(workspaceId, {
          name: currentName,
          environment_type: 'collection',  
          is_active: false, 
        });
        const newEnv = normalizeEnvironment(response.data);
        setEnvironments(prev => [...prev, newEnv]);
        setSelectedEnvironmentId(newEnv.id);
        setEnvironmentVariables(newEnv.variables || []);
        toast.success('Environment created');
        success = true;
      } catch (err) {
        if (err.response?.status === 409) {
          attempt++;
          currentName = `${desiredName} ${attempt}`;
          lastError = err;
        } else {
          console.error('Failed to create environment:', err);
          toast.error(err.response?.data?.message || 'Failed to create environment');
          return;
        }
      }
    }

    if (!success) {
      toast.error(`Could not create environment after ${attempt} attempts.`);
    }
  };

const handleActivateEnvironment = async (envId) => {
  if (envId === 'no-env') {
    // Find current active environment
    const activeEnv = environments.find(e => e.isActive);
    if (activeEnv) {
      try {
        await deactivateEnvironment(activeEnv.id);
        // Update state: no active environment
        setEnvironments(prev => prev.map(env => ({ ...env, isActive: false })));
        setSelectedEnvironmentId('no-env');
        setEnvironmentVariables([]);
        setEnvironmentVariablesDirty(false);
        toast.success('Environment deactivated');
      } catch (err) {
        console.error('Failed to deactivate environment:', err);
        toast.error(err.response?.data?.message || 'Failed to deactivate environment');
      }
    } else {
      // Already no active environment, just ensure selection is 'no-env'
      setSelectedEnvironmentId('no-env');
      setEnvironmentVariables([]);
      setEnvironmentVariablesDirty(false);
    }
    return;
  }

  try {
    await activateEnvironment(envId);
    // Update local state: set this env active, others inactive, and also select it for editing
    setEnvironments(prev => prev.map(env => ({
      ...env,
      isActive: env.id === envId
    })));
    setSelectedEnvironmentId(envId);
    const env = environments.find(e => e.id === envId);
    if (env) {
      setEnvironmentVariables(env.variables || []);
    }
    setEnvironmentVariablesDirty(false);
    toast.success('Environment activated');
  } catch (err) {
    console.error('Failed to activate environment:', err);
    toast.error(err.response?.data?.message || 'Failed to activate environment');
  }
};

const handleRenameEnvironment = async (envId, newName) => {
  if (!newName?.trim()) return;
  try {
    const response = await updateEnvironment(envId, { name: newName.trim() });
    const updatedEnv = normalizeEnvironment(response.data);
    setEnvironments(prev => prev.map(env => env.id === envId ? updatedEnv : env));
    toast.success('Environment renamed');
  } catch (err) {
    console.error('Failed to rename environment:', err);
    toast.error(err.response?.data?.message || 'Failed to rename environment');
  }
};

const handleDeleteEnvironment = async (envId) => {
  try {
    await deleteEnvironment(envId);
    setEnvironments(prev => prev.filter(env => env.id !== envId));
    if (selectedEnvironmentId === envId) {
      setSelectedEnvironmentId('no-env');
      setEnvironmentVariables([]);
    }
    toast.success('Environment deleted');
  } catch (err) {
    console.error('Failed to delete environment:', err);
    toast.error(err.response?.data?.message || 'Failed to delete environment');
  }
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
  if (!collection || !collection.id) return;

  setIsRunningCollection(true);
  setCollectionRunResults({
    collectionName: collection.name,
    startTime: new Date().toISOString(),
    status: 'running',
    results: []
  });

  try {
    // Call backend
    const response = await executeCollection(collection.id);
    const backendResult = response.data; // CollectionExecutionResult

    // Build a map of requestId -> folderPath for the entire collection
    const folderPathMap = new Map();
    const traverse = (items, currentFolderPath = 'Root') => {
      items.forEach(item => {
        if (item.type === 'request') {
          folderPathMap.set(item.id, currentFolderPath);
        } else if (item.type === 'folder' && item.items) {
          const newPath = currentFolderPath === 'Root' ? item.name : `${currentFolderPath} / ${item.name}`;
          traverse(item.items, newPath);
        }
      });
    };
    traverse(collection.items || []);

    // Map backend summaries to UI format
    const mappedResults = backendResult.results.map(summary => ({
      requestId: summary.requestId,
      requestName: summary.requestName,
      method: summary.method, // not provided by backend – we may need to fetch original request or accept that it's missing
      url: summary.url || '', // backend doesn't return URL? We have it in summary but maybe not – let's check
      folderPath: folderPathMap.get(summary.requestId) || 'Unknown',
      status: summary.statusCode,
      statusText: summary.statusText,
      time: summary.responseTimeMs,
      size: summary.size || 0,
      data: null, // response body not returned in summary
      success: summary.success,
      error: summary.errorMessage
    }));

    setCollectionRunResults({
      collectionName: collection.name,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      totalRequests: backendResult.totalRequests,
      passedRequests: backendResult.successCount,
      failedRequests: backendResult.failureCount,
      results: mappedResults
    });
  } catch (error) {
    console.error('Collection execution failed:', error);
    setCollectionRunResults({
      collectionName: collection.name,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'failed',
      error: error.response?.data?.message || error.message,
      results: []
    });
    toast.error('Failed to run collection');
  } finally {
    setIsRunningCollection(false);
  }
};

const handleMockServerRun = (runData) => {
  setCollectionRunResults(runData);
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
        <header className="h-16 border-b border-dark-700 flex items-center px-6 justify-between shrink-0 z-20 bg-header-bg">
          <div className="flex items-center gap-8 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => navigate('/')}>
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-11 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold gradient-text font-heading whitespace-nowrap">ForgeQ</span>
                <span className="text-[0.65rem] text-gray-400 leading-tight mt-0.5 whitespace-nowrap">A ForgeCrux Company</span>
              </div>
            </div>
            
            {/* Navigation Links - only show on workspace pages */}
            {isWorkspace && (
              <nav className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
                {topMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={clsx(
                        'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0',
                        isActive
                          ? 'bg-primary/20 border border-primary/30 text-primary'
                          : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                      )}
                    >
                      <Icon className="w-4 h-4" />
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
          <Route path="/" element={<Home workspaces={projects} />} />
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
                selectedEnvironment={selectedEnvironmentId}
                onEnvironmentChange={handleEnvironmentChange}
                onCreateEnvironment={handleCreateEnvironment}
                onActivateEnvironment={handleActivateEnvironment}
                onRenameEnvironment={handleRenameEnvironment}
                onDeleteEnvironment={handleDeleteEnvironment}
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
                onSaveRequest={handleSaveRequest}
                onAddProject={handleAddProject}
                onCollectionsChange={handleCollectionsChange}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                environmentVariables={environmentVariables}
                onEnvironmentVariablesChange={handleEnvironmentVariablesChange}
                onSaveEnvironmentVariables={handleSaveEnvironmentVariables}
                environmentVariablesDirty={environmentVariablesDirty}
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
                isSavedRequest={isSavedRequest}
                onUpdateRequest={handleUpdateRequest}
                pristineRequests={pristineRequests}
  globalEnvironment={globalEnvironment} 
  globalVariablesDirty={globalVariablesDirty}
  onGlobalVariablesChange={handleGlobalVariablesChange}
  onSaveGlobalVariables={handleSaveGlobalVariables}
  mockServers={mockServers}
  isLoadingMocks={isLoadingMocks}
  onCreateMockServer={handleCreateMockServer}
  onRenameMockServer={handleRenameMockServer}
  onDeleteMockServer={handleDeleteMockServer}
  onToggleVisibility={handleToggleVisibility}
  onExecuteMockRequest={handleExecuteMockRequest}
  onSelectMockEndpoint={handleSelectMockEndpoint}
  onUpdateMockServer={handleUpdateMockServer}
  onOpenWorkspaceDetails={handleOpenWorkspaceDetails}
  currentUserId={currentUserId}
  onWorkspaceUpdate={handleWorkspaceUpdate}
  onWorkspaceDelete={handleWorkspaceDelete}
  onMockServerRun={handleMockServerRun}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;