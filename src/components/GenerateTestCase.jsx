import React, { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  Plus, Upload, FileSearch, X, Edit2, Trash2,
  FileCode, Check, Search, Download, Save
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  listTestSpecs,
  createTestSpec,
  updateTestSpec,
  deleteTestSpec,
} from '../services/testSpecificationService';
import { listLibraryItems } from '../services/specLibraryService';

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

// Helper to get source display properties
const getSourceDisplay = (source) => {
  switch(source) {
    case 'upload': return { label: 'Uploaded', color: 'text-green-400 bg-green-400/10' };
    case 'url': return { label: 'From URL', color: 'text-blue-400 bg-blue-400/10' };
    case 'library': return { label: 'Library', color: 'text-purple-400 bg-purple-400/10' };
    default: return { label: source || 'Unknown', color: 'text-gray-400 bg-gray-400/10' };
  }
};

export default function GenerateTestCase({ projects, activeWorkspaceId }) {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSpecId, setActiveSpecId] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [parseError, setParseError] = useState('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [createMode, setCreateMode] = useState('upload');
  const [selectedLibrarySpec, setSelectedLibrarySpec] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef(null);

  const [libraryItems, setLibraryItems] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSpecId, setEditingSpecId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Fetch specs when project changes
  useEffect(() => {
    if (!activeWorkspaceId) return;
    fetchSpecs();
  }, [activeWorkspaceId]);

  const fetchSpecs = async () => {
    setLoading(true);
    try {
      const res = await listTestSpecs(activeWorkspaceId, { limit: 100 });
      setSpecs(res.items);
      if (!activeSpecId && res.items.length > 0) {
        setActiveSpecId(res.items[0].id);
      } else if (res.items.length === 0) {
        setActiveSpecId(null);
      }
    } catch (err) {
      toast.error('Failed to load test specs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch library items for modal
  useEffect(() => {
    if (showCreateModal && createMode === 'library') {
      fetchLibraryItems();
    }
  }, [showCreateModal, createMode]);

  const fetchLibraryItems = async () => {
    setLoadingLibrary(true);
    try {
      const items = await listLibraryItems();
      setLibraryItems(items);
    } catch (err) {
      toast.error('Failed to load library');
    } finally {
      setLoadingLibrary(false);
    }
  };

  const activeSpec = useMemo(() => specs.find(s => s.id === activeSpecId) || null, [specs, activeSpecId]);

  // Update editor when active spec changes
  useEffect(() => {
    if (activeSpec) {
      setEditorContent(activeSpec.content || '');
      setIsEditorDirty(false);
    } else {
      setEditorContent(JSON.stringify(BLANK_SPEC_TEMPLATE, null, 2));
    }
  }, [activeSpecId]);

  // JSON validation
  useEffect(() => {
    try {
      JSON.parse(editorContent);
      setParseError('');
    } catch (e) {
      setParseError(e.message);
    }
  }, [editorContent]);

  const filteredSpecs = useMemo(() => {
    if (!searchQuery.trim()) return specs;
    const q = searchQuery.toLowerCase();
    return specs.filter(s => s.name.toLowerCase().includes(q));
  }, [specs, searchQuery]);

  // Handlers
  const handleSelectSpec = (spec) => {
    setActiveSpecId(spec.id);
  };

  const handleDeleteSpec = async (e, spec) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${spec.name}"?`)) return;
    try {
      await deleteTestSpec(spec.id);
      setSpecs(prev => prev.filter(s => s.id !== spec.id));
      if (activeSpecId === spec.id) {
        setActiveSpecId(specs.length > 1 ? specs[0].id : null);
      }
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleStartRename = (e, spec) => {
    e.stopPropagation();
    setEditingSpecId(spec.id);
    setEditingName(spec.name);
  };

  const handleConfirmRename = async (e, spec) => {
    if (e.key === 'Enter') {
      if (editingName.trim() && editingName !== spec.name) {
        try {
          const updated = await updateTestSpec(spec.id, { name: editingName.trim() });
          setSpecs(prev => prev.map(s => s.id === spec.id ? updated : s));
          toast.success('Renamed');
        } catch (err) {
          toast.error('Rename failed');
        }
      }
      setEditingSpecId(null);
      setEditingName('');
    } else if (e.key === 'Escape') {
      setEditingSpecId(null);
      setEditingName('');
    }
  };

  const handleRenameBlur = async (spec) => {
    if (editingName.trim() && editingName !== spec.name) {
      try {
        const updated = await updateTestSpec(spec.id, { name: editingName.trim() });
        setSpecs(prev => prev.map(s => s.id === spec.id ? updated : s));
      } catch (err) {
        toast.error('Rename failed');
      }
    }
    setEditingSpecId(null);
    setEditingName('');
  };

  const handleCreateNewSpec = () => {
    setNewSpecName('');
    setCreateMode('upload');
    setUploadedFile(null);
    setSelectedLibrarySpec(null);
    setImportUrl('');
    setShowCreateModal(true);
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
  };

  const handleSaveNewSpec = async () => {
    if (!newSpecName.trim()) {
      toast.error('Please enter a spec name');
      return;
    }
    if (!activeWorkspaceId) {
      toast.error('No project selected');
      return;
    }

    let content = '';
    let source = 'blank';
    let sourceId = null;

    if (createMode === 'upload') {
      if (!uploadedFile) {
        toast.error('Please select a file');
        return;
      }
      try {
        const text = await uploadedFile.text();
        JSON.parse(text);
        content = text;
        source = 'upload';
      } catch {
        toast.error('Invalid JSON file');
        return;
      }
    } else if (createMode === 'url') {
      if (!importUrl.trim()) {
        toast.error('Please enter a URL');
        return;
      }
      try {
        const response = await fetch(importUrl);
        const text = await response.text();
        JSON.parse(text);
        content = text;
        source = 'url';
      } catch (err) {
        toast.error('Failed to fetch or parse JSON from URL');
        return;
      }
    } else if (createMode === 'library') {
      if (!selectedLibrarySpec) {
        toast.error('Please select a library spec');
        return;
      }
      const libItem = libraryItems.find(i => i.id === selectedLibrarySpec);
      content = libItem.content;
      source = 'library';
      sourceId = selectedLibrarySpec;
    } else {
      content = JSON.stringify(BLANK_SPEC_TEMPLATE, null, 2);
    }

    try {
      const payload = {
        workspaceId: activeWorkspaceId,
        name: newSpecName.trim(),
        content,
        source,
        sourceId,
      };
      const created = await createTestSpec(payload);
      setSpecs(prev => [created, ...prev]);
      setActiveSpecId(created.id);
      setShowCreateModal(false);
      setNewSpecName('');
      setCreateMode('upload');
      setUploadedFile(null);
      setSelectedLibrarySpec(null);
      setImportUrl('');
      toast.success('Test spec created');
    } catch (err) {
      toast.error('Creation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveContent = async () => {
    if (!activeSpecId || !editorContent || parseError) return;
    try {
      const updated = await updateTestSpec(activeSpecId, { content: editorContent });
      setSpecs(prev => prev.map(s => s.id === activeSpecId ? updated : s));
      setIsEditorDirty(false);
      toast.success('Saved');
    } catch (err) {
      toast.error('Save failed');
    }
  };

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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--color-input-bg)]">
      <div className="px-6 py-4 border-b border-dark-700 bg-[var(--color-card-bg)] flex items-center justify-between">
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

      <div className="flex-1 flex min-h-0">
        <aside className="w-72 border-r border-dark-700 bg-[var(--color-card-bg)] flex flex-col">
          <div className="p-4 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
            ) : filteredSpecs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm whitespace-pre-line">
                {searchQuery ? 'No specs match your search' : 'No test specs yet.\nCreate one to get started.'}
              </div>
            ) : (
              filteredSpecs.map(spec => (
                <div
                  key={spec.id}
                  className={clsx(
                    'group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all',
                    activeSpecId === spec.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-dark-700/50 border border-transparent'
                  )}
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
                    {/* Source badge instead of date */}
                    {spec.source && (
                      <div className="mt-0.5 ml-6">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${getSourceDisplay(spec.source).color}`}>
                          {getSourceDisplay(spec.source).label}
                        </span>
                      </div>
                    )}
                  </div>

                  {editingSpecId !== spec.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(e, spec)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-600"
                        title="Rename"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSpec(e, spec)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10"
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

        <main className="flex-1 flex flex-col min-h-0 bg-[var(--color-card-bg)]">
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
            </div>

            {activeSpec && (
              <div className="flex items-center gap-2">
                {isEditorDirty && (
                  <button
                    onClick={handleSaveContent}
                    className="p-2 rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors"
                    title="Save changes"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                  title="Download JSON"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0">
            <Editor
              value={editorContent}
              language="json"
              theme="vs-dark"
              options={MONACO_OPTIONS}
              onChange={(value) => {
                setEditorContent(value || '');
                setIsEditorDirty(true);
              }}
              height="100%"
            />
          </div>

          {parseError && (
            <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>JSON Error: {parseError}</span>
            </div>
          )}
        </main>
      </div>

      {/* Create Modal (no project dropdown inside) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-[var(--color-input-bg)] border border-dark-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
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

            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Test Case Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSpecName}
                  onChange={(e) => setNewSpecName(e.target.value)}
                  placeholder="Enter test case name"
                  className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

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
                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                          {loadingLibrary ? (
                            <div className="text-center py-4 text-gray-500">Loading library...</div>
                          ) : libraryItems.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No library items found</div>
                          ) : (
                            libraryItems.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => setSelectedLibrarySpec(item.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedLibrarySpec === item.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-dark-600 hover:border-primary/50 hover:bg-dark-700/50'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                                    selectedLibrarySpec === item.id
                                      ? 'border-primary bg-primary'
                                      : 'border-dark-500'
                                  }`}>
                                    {selectedLibrarySpec === item.id && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-white text-sm">{item.name}</div>
                                    {item.description && (
                                      <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                                    )}
                                    {item.category && (
                                      <div className="mt-1">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-gray-400">
                                          {item.category}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
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
                            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-dark-700 bg-[var(--color-card-bg)] flex justify-end gap-3">
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
                  !activeWorkspaceId ||
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