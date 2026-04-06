// src/components/detailsTab/MockServerWizardTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, FolderOpen, Upload, ChevronDown, X, FileText, Check, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import MockServerEditor from './MockServerEditor';
import { listLibraryItems } from '../../services/specLibraryService';

export default function MockServerWizardTab({
  tab,
  onUpdateTab,
  onCloseTab,
  collections,
  activeWorkspaceId,
  onCreateMockServer,
  onUpdateMockServer,
}) {
  const isEdit = tab.isEdit || (tab.mockServer && !tab.configData);
  const [step, setStep] = useState(tab.step || (isEdit ? 'editor' : 'config'));

  // Config state
  const [name, setName] = useState(tab.configData?.name || tab.mockServer?.name || '');
  const [isPrivate, setIsPrivate] = useState(
    tab.configData?.isPrivate ?? (tab.mockServer?.visibility === 'private') ?? true
  );
  const [delayOption, setDelayOption] = useState('none');
  const [customDelayMs, setCustomDelayMs] = useState(500);
  const [creationType, setCreationType] = useState(tab.configData?.creationType || 'collection');
  const [selectedCollectionId, setSelectedCollectionId] = useState(tab.configData?.selectedCollectionId || '');
  const [importFileContent, setImportFileContent] = useState(tab.configData?.importFileContent || null);
  const [importFileName, setImportFileName] = useState(tab.configData?.importFileName || '');

  // Library states
  const [libraryItems, setLibraryItems] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState(null);

  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const collectionDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load delay from existing mock (edit mode)
  useEffect(() => {
    if (isEdit && tab.mockServer?.delayMs !== undefined) {
      const delay = tab.mockServer.delayMs;
      if (delay === 0) setDelayOption('none');
      else if (delay === 200) setDelayOption('200');
      else if (delay === 300) setDelayOption('300');
      else {
        setDelayOption('custom');
        setCustomDelayMs(delay);
      }
    }
  }, [isEdit, tab.mockServer]);

  // Fetch library items when creationType === 'library'
  useEffect(() => {
    if (creationType === 'library') {
      setLoadingLibrary(true);
      listLibraryItems()
        .then(items => setLibraryItems(items))
        .catch(() => toast.error('Failed to load specification library'))
        .finally(() => setLoadingLibrary(false));
    }
  }, [creationType]);

  const handleContinue = () => {
    if (!name.trim()) {
      toast.error('Mock server name is required');
      return;
    }
    if (creationType === 'collection' && !selectedCollectionId) {
      toast.error('Please select a collection');
      return;
    }
    if (creationType === 'library' && !selectedLibraryId) {
      toast.error('Please select a library spec');
      return;
    }
    if (creationType === 'import' && !importFileContent) {
      toast.error('Please upload a JSON file');
      return;
    }

    let finalImportContent = importFileContent;
    let finalImportName = importFileName;
    if (creationType === 'library') {
      const selectedItem = libraryItems.find(item => item.id === selectedLibraryId);
      if (selectedItem) {
        finalImportContent = selectedItem.content;
        finalImportName = selectedItem.name;
      } else {
        toast.error('Selected library item not found');
        return;
      }
    }

    const config = {
      name: name.trim(),
      isPrivate,
      delayOption,
      customDelayMs: delayOption === 'custom' ? customDelayMs : 0,
      creationType,
      selectedCollectionId,
      importFileContent: finalImportContent,
      importFileName: finalImportName,
    };

    onUpdateTab(tab.index, {
      ...tab,
      step: 'editor',
      configData: config,
      name: `Mock: ${name.trim()}`,
    });
    setStep('editor');
  };

  const handleCancel = () => {
    onCloseTab(tab.index);
  };

  // Step 2: Editor
  if (step === 'editor') {
    const editorProps = isEdit
      ? { mockServer: tab.mockServer, isEdit: true }
      : { config: tab.configData, isEdit: false };

    return (
      <MockServerEditor
        {...editorProps}
        onSave={onCreateMockServer}
        onUpdate={onUpdateMockServer}
        onClose={() => onCloseTab(tab.index)}
        collections={collections}
        activeWorkspaceId={activeWorkspaceId}
        tabIndex={tab.index}
        onUpdateTab={onUpdateTab}
      />
    );
  }

  // Step 1: Config form
  return (
    <div className="flex-1 flex flex-col overflow-auto p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <h2 className="text-lg font-semibold text-white">Configure Mock Server</h2>

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
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Creation Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Create from</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'collection', label: 'Existing Collection', icon: FolderOpen },
              { id: 'library', label: 'Spec Library', icon: BookOpen },
              { id: 'import', label: 'Import JSON', icon: Upload },
            ].map((type) => {
              const Icon = type.icon;
              return (
                <label
                  key={type.id}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-lg border cursor-pointer transition-all text-center',
                    creationType === type.id
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'border-dark-700 text-gray-300 hover:bg-dark-800/60'
                  )}
                >
                  <input
                    type="radio"
                    name="creationType"
                    checked={creationType === type.id}
                    onChange={() => setCreationType(type.id)}
                    className="sr-only"
                  />
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{type.label}</span>
                </label>
              );
            })}
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
                className="w-full bg-dark-800 border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 flex items-center justify-between hover:bg-dark-800/80"
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
                        setSelectedCollectionId(col.id);
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

        {/* Spec Library selection */}
        {creationType === 'library' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Library Spec <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-dark-700 rounded-lg p-2">
              {loadingLibrary ? (
                <div className="text-center py-4 text-gray-500">Loading library...</div>
              ) : libraryItems.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No library items found</div>
              ) : (
                libraryItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedLibraryId(item.id)}
                    className={clsx(
                      'p-3 rounded-lg border cursor-pointer transition-all',
                      selectedLibraryId === item.id
                        ? 'border-primary bg-primary/10'
                        : 'border-dark-600 hover:border-primary/50 hover:bg-dark-700/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedLibraryId === item.id ? 'border-primary bg-primary' : 'border-dark-500'
                      }`}>
                        {selectedLibraryId === item.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Import File */}
        {creationType === 'import' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Import Collection JSON <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-dark-600 bg-dark-800/40 text-gray-300 hover:border-primary hover:bg-dark-800/60"
              >
                <Upload className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {importFileName ? 'Change File' : 'Click to upload JSON file'}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.name.endsWith('.json')) {
                    toast.error('Please upload a JSON file');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const content = JSON.parse(ev.target.result);
                      setImportFileContent(content);
                      setImportFileName(file.name);
                    } catch {
                      toast.error('Invalid JSON file');
                    }
                  };
                  reader.readAsText(file);
                }}
                className="hidden"
              />
              {importFileName && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
                  <FileText className="w-4 h-4" />
                  <span className="flex-1 truncate">{importFileName}</span>
                  <button
                    onClick={() => {
                      setImportFileContent(null);
                      setImportFileName('');
                    }}
                    className="p-1 hover:bg-primary/20 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Private Toggle */}
        <div className="flex items-center justify-between pt-2">
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
          <label className="block text-sm font-medium text-gray-300 mb-2">Response Delay</label>
          <div className="flex items-center gap-3">
            <select
              value={delayOption}
              onChange={(e) => setDelayOption(e.target.value)}
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
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
                  className="w-20 bg-dark-800 border border-dark-700 rounded-lg px-2 py-2 text-sm text-white text-center"
                />
                <span className="text-sm text-gray-400">ms</span>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm"
          >
            Continue to Endpoint Editor
          </button>
        </div>
      </div>
    </div>
  );
}