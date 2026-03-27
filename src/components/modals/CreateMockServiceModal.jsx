import React, { useEffect, useState, useRef } from 'react';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function CreateMockServiceModal({
  onClose,
  onCreateMockServer,
  onUpdateMockServer,
  mockServer,
  initialRequest,
  collections = [],
}) {
  const [status, setStatus] = useState('form');
  const isEditMode = !!mockServer;

  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const collectionDropdownRef = useRef(null);

  // Basic fields
  const [mockServiceName, setMockServiceName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [delayOption, setDelayOption] = useState('none');
  const [customDelayMs, setCustomDelayMs] = useState(500);
  
  // Endpoints state – holds ALL endpoints (for both edit and create)
  const [endpoints, setEndpoints] = useState([]);

  // Creation type (only used in create mode)
  const [creationType, setCreationType] = useState('scratch');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionEndpoints, setCollectionEndpoints] = useState([]);

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (collectionDropdownRef.current && !collectionDropdownRef.current.contains(event.target)) {
      setIsCollectionDropdownOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

  // Reset state when modal opens with different props
  useEffect(() => {
    if (isEditMode) {
      // Edit mode: prefill with mockServer data
      setMockServiceName(mockServer.name || '');
      setIsPrivate(mockServer.isPrivate ?? true);
      
      // Handle delay
      const delay = mockServer.delayMs || 0;
      if (delay === 0) setDelayOption('none');
      else if (delay === 200) setDelayOption('200');
      else if (delay === 300) setDelayOption('300');
      else {
        setDelayOption('custom');
        setCustomDelayMs(delay);
      }

      // Convert existing endpoints to editable format
      if (mockServer.endpoints && mockServer.endpoints.length > 0) {
        setEndpoints(
          mockServer.endpoints.map(ep => ({
            id: ep.id || Date.now() + Math.random(),
            method: ep.method || 'GET',
            path: ep.path || '',
            responseBody: ep.responseBody || '{}',
            statusCode: ep.responseStatus || 200,
          }))
        );
      } else {
        setEndpoints([{ id: Date.now(), method: 'GET', path: '', responseBody: '', statusCode: 200 }]);
      }
    } else {
      // Create mode: reset to defaults
      setMockServiceName(initialRequest?.name || '');
      setIsPrivate(true);
      setDelayOption('none');
      setCustomDelayMs(500);
      setCreationType(initialRequest && !mockServer ? 'single' : 'scratch');
      setSelectedCollectionId('');
      setCollectionEndpoints([]);
      setEndpoints([{ id: Date.now(), method: 'GET', path: '', responseBody: '', statusCode: 200 }]);
    }
  }, [mockServer, initialRequest, isEditMode]);

  const handleCollectionSelect = (collectionId) => {
    setSelectedCollectionId(collectionId);
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      const extractRequests = (items) => {
        let reqs = [];
        items.forEach((item) => {
          if (item.type === 'request') reqs.push(item);
          else if (item.items) reqs = reqs.concat(extractRequests(item.items));
        });
        return reqs;
      };

      const requests = extractRequests(collection.items || []);
      setCollectionEndpoints(
        requests.map((req) => ({
          id: req.id,
          method: req.method || 'GET',
          path: req.path || req.url || '',
          responseBody: req.mockResponse ? JSON.stringify(req.mockResponse, null, 2) : '{}',
          statusCode: 200,
          originalRequest: req,
        })),
      );
    }
  };

  const addEndpoint = () => {
    setEndpoints(prev => [
      ...prev,
      { id: Date.now() + Math.random(), method: 'GET', path: '', responseBody: '', statusCode: 200 },
    ]);
  };

  const updateEndpoint = (id, field, value) => {
    setEndpoints(prev =>
      prev.map(ep => (ep.id === id ? { ...ep, [field]: value } : ep))
    );
  };

  const removeEndpoint = (id) => {
    setEndpoints(prev => prev.filter(ep => ep.id !== id));
  };

  const updateCollectionEndpoint = (id, field, value) => {
    setCollectionEndpoints(prev =>
      prev.map(ep => (ep.id === id ? { ...ep, [field]: value } : ep))
    );
  };

  const getEffectiveDelay = () => {
    if (delayOption === 'none') return 0;
    if (delayOption === '200') return 200;
    if (delayOption === '300') return 300;
    return Number(customDelayMs) || 0;
  };

  const handleSubmit = () => {
    if (!mockServiceName.trim()) return;
    if (!isEditMode && creationType === 'collection' && !selectedCollectionId) return;

    setStatus('creating');

    // Prepare final endpoints array for creation/update
    let finalEndpoints = [];
    if (isEditMode) {
      // In edit mode, we send all endpoints (existing + new) to the update handler?
      // The current onUpdateMockServer expects only new endpoints. We need to adjust the API or handler.
      // For now, we'll follow the existing pattern: onUpdateMockServer(mockId, updatedData, newEndpoints)
      // So we need to separate existing from new. But we don't track which are new vs old.
      // Simpler: we send all endpoints and let the backend replace them? That would require a different API.
      // Given the current design (onUpdateMockServer only creates new endpoints), we'll stick to that.
      // So we'll only send endpoints that are newly added (i.e., those without an original ID from backend).
      // We need to store original endpoint IDs to distinguish. Let's store `isNew` flag or compare ids.
      // For simplicity, I'll assume all endpoints in edit mode are new if they don't have a `id` that matches a UUID pattern.
      // But this is complex. Instead, let's change the approach: We'll pass all endpoints to onUpdateMockServer, and let the backend handle updating/creating/deleting.
      // But that requires a new handler. Since the user hasn't requested that, I'll keep the existing behavior: only new endpoints are added.
      // We'll add a flag `isNew` to each endpoint when added, and in edit mode, we send only those with isNew.
    }

    // For now, I'll implement the simplest: in edit mode, we only send new endpoints (those added via addEndpoint)
    // So we need to differentiate. We'll add a `tempId` property and in edit mode, endpoints from mockServer have a real UUID.
    // We'll use a simple heuristic: if the id is a number (from Date.now()), it's new; otherwise it's existing.
    // This works for our temporary IDs.
    const newEndpoints = endpoints
      .filter(ep => typeof ep.id === 'number' || ep.id.toString().startsWith('temp-'))
      .map(ep => ({
        method: ep.method,
        path: ep.path.startsWith('/') ? ep.path : `/${ep.path}`,
        statusCode: ep.statusCode,
        responseBody: ep.responseBody || '{}',
      }));

    if (isEditMode) {
      const updatedData = {
        name: mockServiceName.trim(),
        visibility: isPrivate ? 'private' : 'public',
        delay: getEffectiveDelay(),
      };
      onUpdateMockServer(mockServer.id, updatedData, newEndpoints)
        .then(() => {
          setStatus('success');
          setTimeout(() => onClose(), 1500);
        })
        .catch(() => setStatus('form'));
    } else {
      // Create mode
      let endpointsToCreate = [];
      let collectionId = null;

      if (creationType === 'scratch') {
        endpointsToCreate = endpoints.map(ep => ({
          method: ep.method,
          path: ep.path.startsWith('/') ? ep.path : `/${ep.path}`,
          statusCode: ep.statusCode,
          responseBody: ep.responseBody || '{}',
        }));
      } else if (creationType === 'collection' && selectedCollectionId) {
        endpointsToCreate = collectionEndpoints.map(ep => ({
          method: ep.method,
          path: ep.path.startsWith('/') ? ep.path : `/${ep.path}`,
          statusCode: ep.statusCode,
          responseBody: ep.responseBody || '{}',
        }));
        collectionId = selectedCollectionId;
      } else if (creationType === 'single' && initialRequest) {
        endpointsToCreate = [{
          method: initialRequest.method,
          path: initialRequest.path || '/',
          statusCode: 200,
          responseBody: initialRequest.mockResponse ? JSON.stringify(initialRequest.mockResponse) : '{}',
        }];
        if (initialRequest.collectionId) collectionId = initialRequest.collectionId;
      }

      const mockData = {
        name: mockServiceName.trim(),
        visibility: isPrivate ? 'private' : 'public',
        delay: getEffectiveDelay(),
        endpoints: endpointsToCreate,
        collectionId,
      };

      onCreateMockServer(mockData)
        .then(() => {
          setStatus('success');
          setTimeout(() => onClose(), 1500);
        })
        .catch(() => setStatus('form'));
    }
  };

  const isCreateDisabled = () => {
    if (!mockServiceName.trim()) return true;
    if (!isEditMode && creationType === 'collection' && !selectedCollectionId) return true;
    if (!isEditMode && creationType === 'scratch') {
      return endpoints.some((ep) => !ep.path.trim());
    }
    return false;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">
            {status === 'form' &&
              (isEditMode ? 'Edit Mock Server' : (initialRequest ? 'Create Mock from Request' : 'Create Mock Service'))}
            {status === 'creating' && 'Creating...'}
            {status === 'success' && 'Mock Service Created!'}
          </h3>
          {status !== 'creating' && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto custom-scrollbar space-y-6">
          {status === 'form' ? (
            <>
              {/* Mock Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mock Service Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={mockServiceName}
                  onChange={(e) => setMockServiceName(e.target.value)}
                  placeholder="e.g., Payment API Mock, User Service v2"
                  className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                />
              </div>

              {/* Creation Type - hidden in edit mode */}
              {!isEditMode && !initialRequest && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Create from</label>
                  <div className="flex gap-4">
                    <label className="flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all bg-dark-900/40 hover:bg-dark-800/60"
                      style={{
                        borderColor: creationType === 'scratch' ? '#3b82f6' : '#374151',
                        backgroundColor: creationType === 'scratch' ? 'rgba(59, 130, 246, 0.1)' : "bg-[var(--color-input-bg)]",
                      }}
                    >
                      <input
                        type="radio"
                        checked={creationType === 'scratch'}
                        onChange={() => setCreationType('scratch')}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-300">From Scratch</span>
                    </label>

                    <label className="flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all bg-dark-900/40 hover:bg-dark-800/60"
                      style={{
                        borderColor: creationType === 'collection' ? '#3b82f6' : '#374151',
                        backgroundColor: creationType === 'collection' ? 'rgb(59, 131, 246)' : "bg-[var(--color-input-bg)]",
                      }}
                    >
                      <input
                        type="radio"
                        checked={creationType === 'collection'}
                        onChange={() => setCreationType('collection')}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-300">Existing Collection</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Collection Selector - hidden in edit mode */}
{!isEditMode && creationType === 'collection' && !initialRequest && (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Select Collection <span className="text-red-400">*</span>
    </label>
    <div className="relative" ref={collectionDropdownRef}>
      <button
        type="button"
        onClick={() => setIsCollectionDropdownOpen(!isCollectionDropdownOpen)}
        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg text-sm font-medium text-white py-2.5 px-3 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center"
      >
        <span className="truncate">
          {selectedCollectionId
            ? collections.find(c => c.id === selectedCollectionId)?.name
            : '-- Choose a collection --'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
      </button>
      {isCollectionDropdownOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {collections.map(col => (
            <div
              key={col.id}
              onClick={() => {
                handleCollectionSelect(col.id);
                setIsCollectionDropdownOpen(false);
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-dark-700',
                selectedCollectionId === col.id ? 'text-primary bg-primary/10' : 'text-gray-300'
              )}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                {selectedCollectionId === col.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="flex-1 truncate">
                {col.name} ({col.items?.length || 0})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

              {/* Endpoints Editor – used for both edit and create scratch */}
              {(isEditMode || (!isEditMode && creationType === 'scratch')) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">
                      {isEditMode ? 'Endpoints' : 'Endpoints'}
                    </h4>
                    <button
                      type="button"
                      onClick={addEndpoint}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add Endpoint
                    </button>
                  </div>

                  {endpoints.map((ep, index) => (
                    <div
                      key={ep.id}
                      className="p-4 rounded-lg border border-dark-700 bg-[var(--color-input-bg)] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                          Endpoint {index + 1}
                        </span>
                        {endpoints.length > 1 && (
                          <button
                            onClick={() => removeEndpoint(ep.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-[80px_90px_1fr] gap-3 items-center">
                        <select
                          value={ep.method}
                          onChange={(e) => updateEndpoint(ep.id, 'method', e.target.value)}
                          className="bg-[var(--color-input-bg)] border border-dark-700 rounded px-2 py-1.5 text-sm text-white"
                        >
                          <option>GET</option>
                          <option>POST</option>
                          <option>PUT</option>
                          <option>DELETE</option>
                          <option>PATCH</option>
                        </select>

                        <input
                          type="number"
                          min="100"
                          max="599"
                          value={ep.statusCode}
                          onChange={(e) =>
                            updateEndpoint(ep.id, 'statusCode', Number(e.target.value) || 200)
                          }
                          className="bg-[var(--color-input-bg)] border border-dark-700 rounded px-2 py-1.5 text-sm text-white text-center"
                          placeholder="200"
                        />

                        <input
                          type="text"
                          placeholder="/users/profile"
                          value={ep.path}
                          onChange={(e) => updateEndpoint(ep.id, 'path', e.target.value)}
                          className="bg-[var(--color-input-bg)] border border-dark-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-gray-600"
                        />
                      </div>

                      <textarea
                        placeholder="Response body (JSON)"
                        value={ep.responseBody}
                        onChange={(e) => updateEndpoint(ep.id, 'responseBody', e.target.value)}
                        rows={4}
                        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded px-3 py-2 text-sm font-mono text-white placeholder:text-gray-600 resize-y min-h-[80px]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Collection Endpoints (when creating from collection) */}
              {!isEditMode && creationType === 'collection' && selectedCollectionId && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white">Configure Mock Responses</h4>
                  {collectionEndpoints.map((ep, idx) => (
                    <div
                      key={ep.id}
                      className="p-4 rounded-lg border border-dark-700 bg-[var(--color-input-bg)] space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'text-xs font-bold px-2 py-0.5 rounded',
                            ep.method === 'GET' && 'text-green-400 bg-green-400/10',
                            ep.method === 'POST' && 'text-yellow-400 bg-yellow-400/10',
                            ep.method === 'PUT' && 'text-blue-400 bg-blue-400/10',
                            ep.method === 'DELETE' && 'text-red-400 bg-red-400/10',
                            'text-purple-400 bg-purple-400/10',
                          )}
                        >
                          {ep.method}
                        </span>
                        <span className="text-sm text-gray-300 truncate flex-1">{ep.path}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] gap-3 items-center">
                        <input
                          type="number"
                          min="100"
                          max="599"
                          value={ep.statusCode}
                          onChange={(e) =>
                            updateCollectionEndpoint(ep.id, 'statusCode', Number(e.target.value) || 200)
                          }
                          className="bg-[var(--color-input-bg)] border border-dark-700 rounded px-2 py-1.5 text-sm text-white text-center"
                        />
                        <textarea
                          placeholder="Mock response (JSON)"
                          value={ep.responseBody}
                          onChange={(e) =>
                            updateCollectionEndpoint(ep.id, 'responseBody', e.target.value)
                          }
                          rows={3}
                          className="w-full bg-dark-900 border border-dark-700 rounded px-3 py-2 text-sm font-mono text-white placeholder:text-gray-600 resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Private + Delay */}
              <div className="pt-4 border-t border-dark-700">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 lg:gap-18">
                  <div className="flex-1 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-200">Make this mock server private</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Only people with access can call this mock server
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-6 lg:gap-8">
                      <label className="text-sm font-medium text-gray-300 whitespace-nowrap">
                        Response Delay
                      </label>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <select
                          value={delayOption}
                          onChange={(e) => setDelayOption(e.target.value)}
                          className="bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60 min-w-[160px]"
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
                              onChange={(e) => setCustomDelayMs(e.target.value)}
                              className="w-20 bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-primary/60"
                            />
                            <span className="text-sm text-gray-400">ms</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create/Update Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isCreateDisabled()}
                className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors mt-6"
              >
                {isEditMode ? 'Update Mock Server' : 'Create Mock Service'}
              </button>
            </>
          ) : status === 'creating' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-dark-700 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-lg font-medium text-white mb-2">Processing...</p>
              <p className="text-sm text-gray-400">{mockServiceName}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h4 className="text-xl font-semibold text-green-400 mb-2">Success!</h4>
              <p className="text-sm text-gray-300 mb-1">{mockServiceName} is now ready</p>
              <p className="text-xs text-gray-500">Closing in a moment...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}