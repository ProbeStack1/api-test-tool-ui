// src/components/detailsTab/MockServerEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Loader2, ChevronDown, ChevronRight, GripVertical, Edit } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { fetchRequests } from '../../services/requestService';
import { getLatestExecution } from '../../services/mockServerService';
import { parsePostmanToEndpoints, extractPath } from '../../utils/ImportFileParser';

export default function MockServerEditor({
  config,
  mockServer,
  isEdit = false,
  onSave,
  onUpdate,
  onClose,
  collections,
  activeWorkspaceId,
  tabIndex,
  onUpdateTab,
}) {
  const initialData = isEdit ? mockServer : config;

  const [name, setName] = useState(initialData?.name || '');
  const [isPrivate, setIsPrivate] = useState(initialData?.isPrivate ?? true);
  const [delayOption, setDelayOption] = useState('none');
  const [customDelayMs, setCustomDelayMs] = useState(500);
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mockUrl, setMockUrl] = useState(initialData?.mockUrl ? `/api/v1/mocks/${initialData.mockUrl}` : null);
  const [expandedEndpoints, setExpandedEndpoints] = useState({});
  const [readOnly, setReadOnly] = useState(isEdit); // start read‑only for edit, editable for new
  const [mockId, setMockId] = useState(initialData?.id || null);

  // Resizable split state
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const [leftWidthPercent, setLeftWidthPercent] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftPanelWide, setIsLeftPanelWide] = useState(true);

  // Initialize delay from existing mock server
  useEffect(() => {
    if (isEdit && initialData?.delayMs !== undefined) {
      const delay = initialData.delayMs;
      if (delay === 0) setDelayOption('none');
      else if (delay === 200) setDelayOption('200');
      else if (delay === 300) setDelayOption('300');
      else {
        setDelayOption('custom');
        setCustomDelayMs(delay);
      }
    }
  }, [isEdit, initialData]);

  // Load endpoints
  useEffect(() => {
    const loadEndpoints = async () => {
      setLoading(true);
      try {
        if (isEdit && initialData?.endpoints) {
          setEndpoints(
            initialData.endpoints.map(ep => ({
              id: ep.id,
              method: ep.method || 'GET',
              path: ep.path || '',
              statusCode: ep.responseStatus || 200,
              responseBody: ep.responseBody || '{}',
              requestBodySample: ep.requestBodySample || '',
              validationMode: ep.validationMode || 'NONE',
              validateMethod: ep.validateMethod !== false,
              delayMs: ep.delayMs || 0,
              requestId: ep.requestId,
              showRequestBody: !!ep.requestBodySample,
            }))
          );
        } else if (config) {
          if (config.creationType === 'scratch') {
            setEndpoints([createEmptyEndpoint()]);
          } else if (config.creationType === 'collection') {
            const requestsRes = await fetchRequests({ collectionId: config.selectedCollectionId });
            const requests = requestsRes.data || [];
            const endpointsList = await Promise.all(
              requests.map(async (req) => {
                const requestId = req.request_id || req.requestId || req.id;
                let latest = null;
                try {
                  const execRes = await getLatestExecution(requestId);
                  latest = execRes.data;
                } catch (err) {}
                const path = extractPath(req.url || req.path || '');
                return {
                  id: `col-${requestId}`,
                  method: req.method || 'GET',
                  path,
                  statusCode: latest?.statusCode || 200,
                  responseBody: latest?.responseBody || '{}',
                  requestBodySample: req.body || '',
                  validationMode: 'NONE',
                  validateMethod: true,
                  delayMs: 0,
                  requestId: requestId,
                  originalRequest: req,
                  showRequestBody: !!req.body,
                };
              })
            );
            setEndpoints(endpointsList);
          } else if (config.creationType === 'import') {
            const endpointsList = parsePostmanToEndpoints(config.importFileContent);
            setEndpoints(endpointsList.length ? endpointsList : [createEmptyEndpoint()]);
          }
        } else {
          setEndpoints([createEmptyEndpoint()]);
        }
      } catch (err) {
        console.error('Failed to load endpoints:', err);
        toast.error('Failed to load endpoints');
      } finally {
        setLoading(false);
      }
    };
    loadEndpoints();
  }, [isEdit, initialData, config]);

  // Observe left panel width for responsive layout
  useEffect(() => {
    if (!leftPanelRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      setIsLeftPanelWide(width >= 550);
    });
    resizeObserver.observe(leftPanelRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Drag handlers
  const startDrag = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      let newLeftPercent = (mouseX / containerWidth) * 100;
      newLeftPercent = Math.min(70, Math.max(50, newLeftPercent));
      setLeftWidthPercent(newLeftPercent);
    };
    const onMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const createEmptyEndpoint = () => ({
    id: Date.now() + Math.random(),
    method: 'GET',
    path: '',
    statusCode: 200,
    responseBody: '{}',
    requestBodySample: '',
    validationMode: 'NONE',
    validateMethod: true,
    delayMs: 0,
    showRequestBody: false,
  });

  const addEndpoint = () => {
    if (readOnly) return;
    setEndpoints(prev => [...prev, createEmptyEndpoint()]);
  };

  const updateEndpoint = (id, field, value) => {
    if (readOnly) return;
    setEndpoints(prev => prev.map(ep => (ep.id === id ? { ...ep, [field]: value } : ep)));
  };

  const removeEndpoint = (id) => {
    if (readOnly) return;
    if (endpoints.length === 1) {
      toast.info('At least one endpoint is required');
      return;
    }
    setEndpoints(prev => prev.filter(ep => ep.id !== id));
  };

  const toggleEndpointExpand = (id) => {
    setExpandedEndpoints(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Mock server name is required');
      return;
    }
    if (endpoints.some(ep => !ep.path.trim())) {
      toast.error('All endpoints must have a path');
      return;
    }
    for (const ep of endpoints) {
      try {
        JSON.parse(ep.responseBody);
        if (ep.requestBodySample && ep.requestBodySample.trim()) JSON.parse(ep.requestBodySample);
      } catch (e) {
        toast.error(`Invalid JSON in endpoint ${ep.path}`);
        return;
      }
    }

    setSaving(true);
    const delay = delayOption === 'none' ? 0 : delayOption === '200' ? 200 : delayOption === '300' ? 300 : customDelayMs;

    if (isEdit) {
      const updatedData = {
        name: name.trim(),
        visibility: isPrivate ? 'private' : 'public',
        delay,
      };
      try {
        await onUpdate(mockId, updatedData, endpoints);
        toast.success('Mock server updated');
        setReadOnly(true);
        if (onUpdateTab && tabIndex !== undefined) {
          onUpdateTab(tabIndex, { name: `Mock: ${name.trim()}` });
        }
      } catch (err) {
        toast.error('Update failed');
      } finally {
        setSaving(false);
      }
    } else {
      const mockData = {
        name: name.trim(),
        visibility: isPrivate ? 'private' : 'public',
        delay,
        endpoints: endpoints.map(ep => ({
          method: ep.method,
          path: ep.path.startsWith('/') ? ep.path : `/${ep.path}`,
          statusCode: ep.statusCode,
          responseBody: ep.responseBody,
          requestBodySample: ep.requestBodySample,
          validationMode: ep.validationMode,
          validateMethod: ep.validateMethod !== false,
          delayMs: ep.delayMs,
          requestId: ep.requestId,
        })),
        collectionId: config?.selectedCollectionId,
      };
      try {
        const createdMock = await onSave(mockData);
        setMockId(createdMock.id);
        setMockUrl(`/api/v1/mocks/${createdMock.mockUrl}`);
        setReadOnly(true);
        if (onUpdateTab && tabIndex !== undefined) {
          onUpdateTab(tabIndex, { name: `Mock: ${createdMock.name}` });
        }
        toast.success('Mock server created');
      } catch (err) {
        toast.error('Failed to create mock server');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleEdit = () => {
    setReadOnly(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden" ref={containerRef}>
      {/* Left panel: Endpoints list – resizable width */}
      <div
        ref={leftPanelRef}
        className="flex flex-col p-4 overflow-y-auto custom-scrollbar"
        style={{ width: `${leftWidthPercent}%` }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Endpoints</h2>
            {!readOnly && (
              <button
                type="button"
                onClick={addEndpoint}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Plus size={14} /> Add Endpoint
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            endpoints.map((ep, idx) => (
              <EndpointEditor
                key={ep.id}
                endpoint={ep}
                index={idx}
                isExpanded={expandedEndpoints[ep.id]}
                onToggleExpand={() => toggleEndpointExpand(ep.id)}
                onUpdate={(field, value) => updateEndpoint(ep.id, field, value)}
                onRemove={() => removeEndpoint(ep.id)}
                canRemove={endpoints.length > 1}
                isTwoColumn={isLeftPanelWide}
                disabled={readOnly}
              />
            ))
          )}
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        className="w-0.5 bg-dark-700 hover:bg-primary/50 cursor-col-resize transition-colors relative group flex-shrink-0"
        onMouseDown={startDrag}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity">
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Right panel: Settings */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto border-l border-dark-700">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Mock Server Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            className="w-full border border-dark-700 rounded-lg px-3 py-2 text-sm text-white bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-200">Private</div>
            <div className="text-xs text-gray-500">Only people with access can call this mock server</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={readOnly}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full disabled:opacity-60"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Response Delay
          </label>
          <div className="flex items-center gap-3">
            <select
              value={delayOption}
              onChange={(e) => setDelayOption(e.target.value)}
              disabled={readOnly}
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
            >
              <option value="none">No delay</option>
              <option value="200">200ms</option>
              <option value="300">300ms</option>
              <option value="custom">Custom</option>
            </select>
            {delayOption === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={customDelayMs}
                  onChange={(e) => setCustomDelayMs(Number(e.target.value))}
                  disabled={readOnly}
                  className="w-20 border border-dark-700 rounded-lg px-2 py-2 text-sm text-white text-center bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
                />
                <span className="text-sm text-gray-400">ms</span>
              </div>
            )}
          </div>
        </div>

        {mockUrl && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-xs text-green-400 mb-1">Mock server base URL:</p>
            <p className="text-xs text-gray-300 break-all">{mockUrl}</p>
          </div>
        )}

        {readOnly ? (
          <button
            type="button"
            onClick={handleEdit}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center justify-center gap-2"
          >
            <Edit className="w-4 h-4" /> Edit Mock Server
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {isEdit ? 'Update Mock Server' : 'Create Mock Server'}
          </button>
        )}
      </div>
    </div>
  );
}

// EndpointEditor component with responsive two‑column layout
function EndpointEditor({ endpoint, index, isExpanded, onToggleExpand, onUpdate, onRemove, canRemove, isTwoColumn, disabled }) {
  const [jsonErrors, setJsonErrors] = useState({});
  const [showRequestBody, setShowRequestBody] = useState(endpoint.showRequestBody ?? false);

  useEffect(() => {
    if (endpoint.requestBodySample && !showRequestBody) {
      setShowRequestBody(true);
    }
  }, [endpoint.requestBodySample, showRequestBody]);

  const validateJson = (field, value) => {
    if (field === 'requestBodySample' || field === 'responseBody') {
      try {
        if (value.trim()) JSON.parse(value);
        setJsonErrors(prev => ({ ...prev, [field]: null }));
        return true;
      } catch (e) {
        setJsonErrors(prev => ({ ...prev, [field]: 'Invalid JSON' }));
        return false;
      }
    }
    return true;
  };

  const handleChange = (field, value) => {
    if (validateJson(field, value)) {
      onUpdate(field, value);
    } else {
      onUpdate(field, value);
    }
  };

  const toggleRequestBody = () => {
    if (showRequestBody) {
      onUpdate('requestBodySample', '');
      setShowRequestBody(false);
    } else {
      setShowRequestBody(true);
      if (!endpoint.requestBodySample) {
        onUpdate('requestBodySample', '');
      }
    }
  };

  const isGet = endpoint.method === 'GET';

  const getMethodClass = (method) => {
    switch (method) {
      case 'GET': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'POST': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'PUT': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'DELETE': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    }
  };

  const getStatusClass = (statusCode) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-400';
    if (statusCode >= 300) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="border border-dark-700 rounded-lg bg-dark-800/40 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 p-3 hover:bg-dark-700/30 cursor-pointer" onClick={onToggleExpand}>
        <div className="shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </div>
        <div className="flex-1 grid grid-cols-[100px_1fr_80px] gap-3 items-center">
          <select
            value={endpoint.method}
            onChange={(e) => {
              e.stopPropagation();
              handleChange('method', e.target.value);
            }}
            disabled={disabled}
            className={`border rounded px-2 py-1.5 text-sm ${getMethodClass(endpoint.method)} focus:outline-none focus:ring-2 focus:ring-primary/50 bg-dark-800 disabled:opacity-60`}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="GET" className="text-green-400 bg-dark-800">GET</option>
            <option value="POST" className="text-yellow-400 bg-dark-800">POST</option>
            <option value="PUT" className="text-blue-400 bg-dark-800">PUT</option>
            <option value="DELETE" className="text-red-400 bg-dark-800">DELETE</option>
            <option value="PATCH" className="text-purple-400 bg-dark-800">PATCH</option>
          </select>

          <input
            type="text"
            placeholder="/path"
            value={endpoint.path}
            onChange={(e) => {
              e.stopPropagation();
              handleChange('path', e.target.value);
            }}
            disabled={disabled}
            className="border border-dark-700 rounded px-3 py-1.5 text-sm text-white bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
            onClick={(e) => e.stopPropagation()}
          />

          <input
            type="number"
            min="100"
            max="599"
            value={endpoint.statusCode}
            onChange={(e) => {
              e.stopPropagation();
              handleChange('statusCode', Number(e.target.value) || 200);
            }}
            disabled={disabled}
            className={`border border-dark-700 rounded px-2 py-1.5 text-sm text-center w-20 bg-dark-800 ${getStatusClass(endpoint.statusCode)} focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60`}
            placeholder="200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {canRemove && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-dark-700 space-y-3">
          {/* Request & Response Body – responsive layout */}
          {!isGet && showRequestBody ? (
            <div className={isTwoColumn ? 'grid grid-cols-2 gap-4' : 'flex flex-col space-y-4'}>
              {/* Left: Request Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Request Body (JSON)</label>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={toggleRequestBody}
                      className="text-xs text-primary hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  placeholder="Request body (JSON)"
                  value={endpoint.requestBodySample}
                  onChange={(e) => handleChange('requestBodySample', e.target.value)}
                  rows={4}
                  disabled={disabled}
                  className="w-full border border-dark-700 rounded px-3 py-2 text-sm font-mono text-white bg-dark-800 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
                />
                {jsonErrors.requestBodySample && (
                  <p className="text-red-400 text-xs mt-1">{jsonErrors.requestBodySample}</p>
                )}
              </div>

              {/* Right: Response Body */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Response Body (JSON)</label>
                <textarea
                  placeholder="{}"
                  value={endpoint.responseBody}
                  onChange={(e) => handleChange('responseBody', e.target.value)}
                  rows={4}
                  disabled={disabled}
                  className="w-full border border-dark-700 rounded px-3 py-2 text-sm font-mono text-white bg-dark-800 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
                />
                {jsonErrors.responseBody && (
                  <p className="text-red-400 text-xs mt-1">{jsonErrors.responseBody}</p>
                )}
              </div>
            </div>
          ) : (
            <>
              {!isGet && !showRequestBody && !disabled && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={toggleRequestBody}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add Request Body
                  </button>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Response Body (JSON)</label>
                <textarea
                  placeholder="{}"
                  value={endpoint.responseBody}
                  onChange={(e) => handleChange('responseBody', e.target.value)}
                  rows={4}
                  disabled={disabled}
                  className="w-full border border-dark-700 rounded px-3 py-2 text-sm font-mono text-white bg-dark-800 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
                />
                {jsonErrors.responseBody && (
                  <p className="text-red-400 text-xs mt-1">{jsonErrors.responseBody}</p>
                )}
              </div>
            </>
          )}

          {/* Validation Options */}
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={endpoint.validateMethod}
                onChange={(e) => handleChange('validateMethod', e.target.checked)}
                disabled={disabled}
                className="rounded text-primary focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
              />
              Validate HTTP method
            </label>

            {!isGet && (
              <div>
                <select
                  value={endpoint.validationMode}
                  onChange={(e) => handleChange('validationMode', e.target.value)}
                  disabled={disabled}
                  className="bg-dark-800 border border-dark-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
                >
                  <option value="NONE">No body validation</option>
                  <option value="EXACT_MATCH">Exact match</option>
                  <option value="JSON_SCHEMA">JSON schema</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-500">Delay (ms)</span>
              <input
                type="number"
                min="0"
                value={endpoint.delayMs}
                onChange={(e) => handleChange('delayMs', Number(e.target.value))}
                disabled={disabled}
                className="w-16 border border-dark-700 rounded px-2 py-1 text-xs text-white text-center bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}