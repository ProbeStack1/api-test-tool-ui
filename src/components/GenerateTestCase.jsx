import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Plus, Upload, FileSearch, Sparkles, X, Edit2, Trash2, 
  FileCode, Check, Search, Download, Save
} from 'lucide-react';

// Storage key for test specs - separate from other data
const TEST_SPECS_STORAGE_KEY = 'probestack_test_specs';
const ACTIVE_SPEC_KEY = 'probestack_active_test_spec';

// Default blank JSON spec template
const BLANK_SPEC_TEMPLATE = {
  openapi: "3.0.0",
  info: {
    title: "Test Case Specification",
    version: "1.0.0",
    description: "API test case specification"
  },
  paths: {},
  components: {
    schemas: {}
  }
};

// Helper to safely read from localStorage
const getStoredSpecs = () => {
  try {
    const stored = localStorage.getItem(TEST_SPECS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to safely write to localStorage
const saveSpecsToStorage = (specs) => {
  try {
    localStorage.setItem(TEST_SPECS_STORAGE_KEY, JSON.stringify(specs));
  } catch (error) {
    console.error('Failed to save test specs:', error);
  }
};

// Helper to get active spec from storage
const getActiveSpecFromStorage = () => {
  try {
    return localStorage.getItem(ACTIVE_SPEC_KEY) || null;
  } catch {
    return null;
  }
};

// Helper to save active spec to storage
const saveActiveSpecToStorage = (specId) => {
  try {
    if (specId) {
      localStorage.setItem(ACTIVE_SPEC_KEY, specId);
    } else {
      localStorage.removeItem(ACTIVE_SPEC_KEY);
    }
  } catch (error) {
    console.error('Failed to save active spec:', error);
  }
};

// Monaco editor options (matching design tool)
const MONACO_OPTIONS = {
  fontSize: 13,
  lineHeight: 20,
  minimap: { enabled: false },
  wordWrap: "on",
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: "selection",
  bracketPairColorization: { enabled: true },
  formatOnPaste: true,
  formatOnType: true,
};

export default function GenerateTestCase() {
  // State for specs list
  const [specs, setSpecs] = useState(getStoredSpecs);
  const [activeSpecId, setActiveSpecId] = useState(getActiveSpecFromStorage);
  
  // Editor state
  const [editorContent, setEditorContent] = useState('');
  const [parseError, setParseError] = useState('');
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [createMode, setCreateMode] = useState('upload'); // 'upload', 'library', 'url'
  const [selectedLibrarySpec, setSelectedLibrarySpec] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef(null);
  
  // Dummy organization specification library data
  const ORG_SPEC_LIBRARY = [
    { id: 'spec-1', name: 'REST API Testing Guide', description: 'Standard REST API test specifications with CRUD operations', category: 'General' },
    { id: 'spec-2', name: 'Auth Service Tests', description: 'Authentication and authorization test cases', category: 'Security' },
    { id: 'spec-3', name: 'Payment Gateway Spec', description: 'Payment processing API test specifications', category: 'Financial' },
    { id: 'spec-4', name: 'User Management API', description: 'User CRUD and profile management tests', category: 'General' },
  ];
  
  // Sidebar search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inline editing state for specs
  const [editingSpecId, setEditingSpecId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  // Autosave timeout ref
  const autosaveTimeoutRef = useRef(null);

  // Get active spec
  const activeSpec = useMemo(() => {
    return specs.find(s => s.id === activeSpecId) || null;
  }, [specs, activeSpecId]);

  // Initialize editor content when active spec changes
  useEffect(() => {
    if (activeSpec) {
      setEditorContent(activeSpec.content);
      setParseError('');
    } else {
      setEditorContent(JSON.stringify(BLANK_SPEC_TEMPLATE, null, 2));
    }
  }, [activeSpec?.id]);

  // Parse validation
  useEffect(() => {
    try {
      JSON.parse(editorContent);
      setParseError('');
    } catch (e) {
      setParseError(e.message);
    }
  }, [editorContent]);

  // Filtered specs based on search
  const filteredSpecs = useMemo(() => {
    if (!searchQuery.trim()) return specs;
    const q = searchQuery.toLowerCase();
    return specs.filter(s => s.name.toLowerCase().includes(q));
  }, [specs, searchQuery]);

  // Autosave effect
  useEffect(() => {
    if (!activeSpecId || !editorContent) return;
    
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(() => {
      // Only save if content is valid JSON
      try {
        JSON.parse(editorContent);
        
        setSpecs(prev => {
          const updated = prev.map(s => {
            if (s.id === activeSpecId) {
              return { ...s, content: editorContent, updatedAt: new Date().toISOString() };
            }
            return s;
          });
          saveSpecsToStorage(updated);
          return updated;
        });
      } catch {
        // Don't save invalid JSON
      }
    }, 1000); // 1 second debounce
    
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [editorContent, activeSpecId]);

  // Persist specs to localStorage whenever they change
  useEffect(() => {
    saveSpecsToStorage(specs);
  }, [specs]);

  // Persist active spec to localStorage
  useEffect(() => {
    saveActiveSpecToStorage(activeSpecId);
  }, [activeSpecId]);

  // Handle create new spec
  const handleCreateNewSpec = () => {
    setNewSpecName('');
    setCreateMode('upload');
    setUploadedFile(null);
    setSelectedLibrarySpec(null);
    setShowCreateModal(true);
  };

  // Handle file upload in modal
  const handleFileUpload = (file) => {
    if (file) {
      setUploadedFile(file);
    }
  };

  // Handle save new spec
  const handleSaveNewSpec = async () => {
    if (!newSpecName.trim()) {
      alert('Please enter a spec name.');
      return;
    }
    
    let specContent = '';
    let specName = newSpecName.trim();
    
    // Handle non-functional options
    if (createMode === 'library') {
      if (!selectedLibrarySpec) {
        alert('Please select a specification from the library.');
        return;
      }
      // Create spec from library selection with dummy content
      const librarySpec = ORG_SPEC_LIBRARY.find(s => s.id === selectedLibrarySpec);
      const newSpec = {
        id: `spec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: specName,
        content: JSON.stringify({
          openapi: "3.0.0",
          info: {
            title: librarySpec.name,
            version: "1.0.0",
            description: librarySpec.description
          },
          paths: {},
          components: { schemas: {} }
        }, null, 2),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'library',
        sourceId: selectedLibrarySpec
      };
      setSpecs(prev => [newSpec, ...prev]);
      setActiveSpecId(newSpec.id);
      setShowCreateModal(false);
      setNewSpecName('');
      setCreateMode('upload');
      setUploadedFile(null);
      setSelectedLibrarySpec(null);
      setImportUrl('');
      return;
    }
    
    if (createMode === 'blank') {
      specContent = JSON.stringify(BLANK_SPEC_TEMPLATE, null, 2);
    } else if (createMode === 'upload' && uploadedFile) {
      try {
        const text = await uploadedFile.text();
        // Validate it's JSON
        JSON.parse(text);
        specContent = JSON.stringify(JSON.parse(text), null, 2);
        // Use filename without extension as spec name if not provided
        if (!newSpecName.trim()) {
          specName = uploadedFile.name.replace(/\.json$/i, '');
        }
      } catch {
        alert('Could not parse file as valid JSON.');
        return;
      }
    } else if (createMode === 'url' && importUrl.trim()) {
      // Fetch spec from URL
      const trimmedUrl = importUrl.trim();
      try {
        const response = await fetch(trimmedUrl);
        if (!response.ok) {
          alert(`Failed to fetch spec from URL: ${response.statusText}`);
          return;
        }
        const text = await response.text();
        // Try to parse as JSON
        try {
          JSON.parse(text);
          specContent = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          alert('Could not parse fetched content as valid JSON.');
          return;
        }
      } catch (error) {
        alert(`Error fetching spec from URL: ${error.message}`);
        return;
      }
    }
    
    // Create new spec
    const newSpec = {
      id: `spec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: specName,
      content: specContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setSpecs(prev => [newSpec, ...prev]);
    setActiveSpecId(newSpec.id);
    
    // Close modal
    setShowCreateModal(false);
    setNewSpecName('');
    setCreateMode('upload');
    setUploadedFile(null);
    setSelectedLibrarySpec(null);
    setImportUrl('');
  };

  // Handle spec selection
  const handleSelectSpec = (spec) => {
    setActiveSpecId(spec.id);
  };

  // Handle delete spec
  const handleDeleteSpec = (e, spec) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${spec.name}"?`)) {
      setSpecs(prev => prev.filter(s => s.id !== spec.id));
      if (activeSpecId === spec.id) {
        setActiveSpecId(null);
      }
    }
  };

  // Handle inline rename start
  const handleStartRename = (e, spec) => {
    e.stopPropagation();
    setEditingSpecId(spec.id);
    setEditingName(spec.name);
  };

  // Handle inline rename confirm
  const handleConfirmRename = (e, spec) => {
    if (e.key === 'Enter') {
      if (editingName.trim()) {
        setSpecs(prev => prev.map(s => {
          if (s.id === spec.id) {
            return { ...s, name: editingName.trim(), updatedAt: new Date().toISOString() };
          }
          return s;
        }));
      }
      setEditingSpecId(null);
      setEditingName('');
    } else if (e.key === 'Escape') {
      setEditingSpecId(null);
      setEditingName('');
    }
  };

  // Handle inline rename blur (save on blur if not empty)
  const handleRenameBlur = (spec) => {
    if (editingName.trim()) {
      setSpecs(prev => prev.map(s => {
        if (s.id === spec.id) {
          return { ...s, name: editingName.trim(), updatedAt: new Date().toISOString() };
        }
        return s;
      }));
    }
    setEditingSpecId(null);
    setEditingName('');
  };

  // Handle editor change
  const handleEditorChange = (value) => {
    setEditorContent(value || '');
  };

  // Handle download spec
  const handleDownload = () => {
    if (!activeSpec) return;
    
    const blob = new Blob([editorContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSpec.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    setIsEditorReady(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0B1120]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Generate Test Cases</h2>
          <p className="text-sm text-gray-400">Create and manage JSON test case specifications</p>
        </div>
        <button
          onClick={handleCreateNewSpec}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
        >
          <Plus className="h-4 w-4" />
          Create Test Case
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-72 border-r border-dark-700 bg-dark-800/30 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Specs List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSpecs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {searchQuery ? 'No specs found' : 'No test case specs yet.\nClick "Create Test Case" to start.'}
              </div>
            ) : (
              filteredSpecs.map((spec) => (
                <div
                  key={spec.id}
                  className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                    activeSpecId === spec.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-dark-700/50 border border-transparent'
                  }`}
                  onClick={() => handleSelectSpec(spec)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                      {editingSpecId === spec.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => handleConfirmRename(e, spec)}
                          onBlur={() => handleRenameBlur(spec)}
                          autoFocus
                          className="flex-1 bg-dark-900 border border-primary/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-medium text-white truncate">
                          {spec.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 ml-6">
                      {new Date(spec.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Inline Action Buttons */}
                  {editingSpecId !== spec.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(e, spec)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-600 transition-all"
                        title="Rename"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSpec(e, spec)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#0B1120]">
          {/* Editor Header */}
          <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between bg-dark-800/20">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">
                {activeSpec ? activeSpec.name : 'New Test Case'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                JSON
              </span>
              {parseError && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Invalid JSON
                </span>
              )}
              {!parseError && activeSpec && (
                <span className="text-xs text-gray-500">
                  Autosaved
                </span>
              )}
            </div>
            
            {activeSpec && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {}}
                  className="p-2 rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors"
                  title="Save"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                  title="Download JSON"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0">
            <Editor
              value={editorContent}
              language="json"
              theme="vs-dark"
              options={MONACO_OPTIONS}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              height="100%"
            />
          </div>

          {/* Parse Error Banner */}
          {parseError && (
            <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>JSON Error: {parseError}</span>
            </div>
          )}
        </main>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-dark-800 border border-dark-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between bg-dark-800/50">
              <div>
                <h3 className="text-lg font-semibold text-white">Create New Test Case</h3>
                <p className="text-sm text-gray-400">Create a test case using various methods</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Test Case Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Test Case Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSpecName}
                  onChange={(e) => setNewSpecName(e.target.value)}
                  placeholder="Enter test case name"
                  className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Creation Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Creation Method
                </label>
                <div className="space-y-3">
                  {/* Upload File */}
                  <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    createMode === 'upload'
                      ? 'border-primary bg-primary/5'
                      : 'border-dark-700 hover:border-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="createMode"
                      value="upload"
                      checked={createMode === 'upload'}
                      onChange={(e) => setCreateMode(e.target.value)}
                      className="mt-1 mr-3 text-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">Upload JSON Spec</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Upload an existing JSON specification file (JSON only)
                      </div>
                      {createMode === 'upload' && (
                        <div className="mt-3">
                          <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-700 text-gray-300 hover:bg-dark-600 hover:text-white transition-colors text-sm"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadedFile ? `Selected: ${uploadedFile.name}` : 'Choose JSON File'}
                          </button>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Specification Library */}
                  <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    createMode === 'library'
                      ? 'border-primary bg-primary/5'
                      : 'border-dark-700 hover:border-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="createMode"
                      value="library"
                      checked={createMode === 'library'}
                      onChange={(e) => setCreateMode(e.target.value)}
                      className="mt-1 mr-3 text-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">Create from organization Specification Library</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Browse and select from the specification library
                      </div>
                      {createMode === 'library' && (
                        <div className="mt-4 space-y-2">
                          {ORG_SPEC_LIBRARY.map((spec) => (
                            <div
                              key={spec.id}
                              onClick={() => setSelectedLibrarySpec(spec.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedLibrarySpec === spec.id
                                  ? 'border-primary bg-primary/10'
                                  : 'border-dark-600 hover:border-primary/50 hover:bg-dark-700/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                                  selectedLibrarySpec === spec.id
                                    ? 'border-primary bg-primary'
                                    : 'border-dark-500'
                                }`}>
                                  {selectedLibrarySpec === spec.id && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-white text-sm">{spec.name}</div>
                                  <div className="text-xs text-gray-400 mt-0.5">{spec.description}</div>
                                  <div className="mt-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-gray-400">
                                      {spec.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Import from URL */}
                  <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    createMode === 'url'
                      ? 'border-primary bg-primary/5'
                      : 'border-dark-700 hover:border-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="createMode"
                      value="url"
                      checked={createMode === 'url'}
                      onChange={(e) => setCreateMode(e.target.value)}
                      className="mt-1 mr-3 text-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">Import from URL</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Fetch and import a JSON specification from a URL
                      </div>
                      {createMode === 'url' && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="https://example.com/api-spec.json"
                            className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-dark-700 bg-dark-800/50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-dark-600 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewSpec}
                disabled={
                  !newSpecName.trim() || 
                  (createMode === 'upload' && !uploadedFile) ||
                  (createMode === 'url' && !importUrl.trim()) ||
                  (createMode === 'library' && !selectedLibrarySpec)
                }
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Create Test Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
