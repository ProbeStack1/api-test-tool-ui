import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Plus, Upload, Loader2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { fetchRequests } from '../../services/requestService';
import { getLatestExecution } from '../../services/mockServerService';
import { uploadCollection as uploadFunctionalCollection } from '../../services/functionalTestService'; // reuse for JSON import

export default function CreateMockServiceModal({
  onClose,
  onConfigure,        // new callback with config data
  mockServer,         // if editing, we pass existing mock server data
  collections = [],   // list of collections in current workspace
  activeWorkspaceId,
}) {
  const isEditMode = !!mockServer;

  const [name, setName] = useState(mockServer?.name || '');
  const [isPrivate, setIsPrivate] = useState(mockServer?.isPrivate ?? true);
  const [delayOption, setDelayOption] = useState('none');
  const [customDelayMs, setCustomDelayMs] = useState(500);
  const [creationType, setCreationType] = useState('scratch');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [importFileContent, setImportFileContent] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const collectionDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // For edit mode: we need to fetch endpoints? But in edit mode we should open editor directly.
  // For simplicity, if editing, we just close modal and open editor with existing mock server data.
  useEffect(() => {
    if (isEditMode) {
      // This modal is used for edit? Actually we might have a separate edit flow.
      // For now, we can treat it as a configurator; for edit, we can skip and open editor directly.
    }
  }, [isEditMode]);

  const handleCollectionSelect = async (collectionId) => {
    setSelectedCollectionId(collectionId);
    setLoadingCollection(true);
    try {
      // We don't need to fetch endpoints here; we'll just store the collectionId
      // The editor will fetch when opened.
    } catch (err) {
      toast.error('Failed to load collection');
    } finally {
      setLoadingCollection(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target.result);
        setImportFileContent(content);
        setImportFileName(file.name);
      } catch (err) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // reset input
  };

  const handleConfigure = () => {
    if (!name.trim()) {
      toast.error('Mock server name is required');
      return;
    }
    if (creationType === 'collection' && !selectedCollectionId) {
      toast.error('Please select a collection');
      return;
    }
    if (creationType === 'import' && !importFileContent) {
      toast.error('Please upload a JSON file');
      return;
    }

    const config = {
      name: name.trim(),
      isPrivate,
      delayOption,
      customDelayMs: delayOption === 'custom' ? customDelayMs : 0,
      creationType,
      selectedCollectionId,
      importFileContent,
      importFileName,
    };
    onConfigure(config);
    onClose();
  };

  const getDelayMs = () => {
    if (delayOption === 'none') return 0;
    if (delayOption === '200') return 200;
    if (delayOption === '300') return 300;
    return Number(customDelayMs) || 0;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">
            Configure Mock Server
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mock Server Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Payment API Mock"
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          {/* Creation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Create from
            </label>
            <div className="flex gap-3">
              <label
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  creationType === 'scratch'
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-dark-900/40 border-dark-700 text-gray-300'
                )}
              >
                <input
                  type="radio"
                  name="creationType"
                  checked={creationType === 'scratch'}
                  onChange={() => setCreationType('scratch')}
                  className="sr-only"
                />
                <span>From Scratch</span>
              </label>
              <label
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  creationType === 'collection'
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-dark-900/40 border-dark-700 text-gray-300'
                )}
              >
                <input
                  type="radio"
                  name="creationType"
                  checked={creationType === 'collection'}
                  onChange={() => setCreationType('collection')}
                  className="sr-only"
                />
                <span>Existing Collection</span>
              </label>
              <label
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  creationType === 'import'
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-dark-900/40 border-dark-700 text-gray-300'
                )}
              >
                <input
                  type="radio"
                  name="creationType"
                  checked={creationType === 'import'}
                  onChange={() => setCreationType('import')}
                  className="sr-only"
                />
                <span>Import JSON</span>
              </label>
            </div>
          </div>

          {/* Collection Dropdown */}
          {creationType === 'collection' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Collection <span className="text-red-400">*</span>
              </label>
              <div className="relative" ref={collectionDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCollectionDropdownOpen(!isCollectionDropdownOpen)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedCollectionId
                      ? collections.find(c => c.id === selectedCollectionId)?.name
                      : '-- Choose a collection --'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {isCollectionDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
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
                        <span className="flex-1 truncate">{col.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import File */}
          {creationType === 'import' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Import Postman Collection <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700"
                >
                  <Upload size={16} />
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {importFileName && (
                  <span className="text-sm text-primary truncate">{importFileName}</span>
                )}
              </div>
            </div>
          )}

          {/* Private Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-200">Make this mock server private</div>
              <div className="text-xs text-gray-500">Only people with access can call this mock server</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {/* Response Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Response Delay
            </label>
            <div className="flex items-center gap-3">
              <select
                value={delayOption}
                onChange={(e) => setDelayOption(e.target.value)}
                className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
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
                    className="w-20 bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-sm text-white text-center"
                  />
                  <span className="text-sm text-gray-400">ms</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfigure}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white"
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  );
}