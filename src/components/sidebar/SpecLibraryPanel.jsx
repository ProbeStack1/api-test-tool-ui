import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Download, X, FileCode, Save } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import Editor from '@monaco-editor/react';
import {
  listLibraryItems,
  createLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  importLibraryItem,
} from '../../services/specLibraryService';

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

export default function SpecLibraryPanel({ projects, currentUserId }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // For import: selected workspace
  const [importWorkspaceId, setImportWorkspaceId] = useState(projects[0]?.id || '');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importItemId, setImportItemId] = useState(null);

  const isOwner = (item) => item.createdBy === currentUserId;
  const canEdit = selectedItem && isOwner(selectedItem);

  useEffect(() => {
    loadItems();
  }, [search]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await listLibraryItems(search);
      setItems(data);
      if (selectedItem) {
        const stillExists = data.find(i => i.id === selectedItem.id);
        if (!stillExists) setSelectedItem(null);
      }
    } catch (err) {
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  // When selected item changes, update editor content and reset dirty flag
  useEffect(() => {
    if (selectedItem) {
      setEditorContent(selectedItem.content);
      setIsEditorDirty(false);
    } else {
      setEditorContent('');
    }
  }, [selectedItem]);

  const handleCreate = async (newItem) => {
    try {
      const created = await createLibraryItem(newItem);
      setItems(prev => [created, ...prev]);
      setSelectedItem(created);
      toast.success('Library item created');
      setShowCreateModal(false);
    } catch (err) {
      toast.error('Creation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateMetadata = async (id, updates) => {
    try {
      const updated = await updateLibraryItem(id, updates);
      setItems(prev => prev.map(item => item.id === id ? updated : item));
      if (selectedItem?.id === id) setSelectedItem(updated);
      toast.success('Updated');
      setEditingItem(null);
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleUpdateContent = async () => {
    if (!selectedItem) return;
    try {
      const updated = await updateLibraryItem(selectedItem.id, { content: editorContent });
      setItems(prev => prev.map(item => item.id === selectedItem.id ? updated : item));
      setSelectedItem(updated);
      setIsEditorDirty(false);
      toast.success('Content saved');
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this library item?')) return;
    try {
      await deleteLibraryItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleImportClick = (itemId) => {
    if (projects.length === 0) {
      toast.error('No workspace available');
      return;
    }
    if (projects.length === 1) {
      doImport(itemId, projects[0].id);
    } else {
      setImportItemId(itemId);
      setImportWorkspaceId(projects[0].id);
      setShowImportModal(true);
    }
  };

  const doImport = async (itemId, workspaceId) => {
    try {
      await importLibraryItem(itemId, workspaceId);
      toast.success('Imported to workspace as a test spec');
    } catch (err) {
      toast.error('Import failed');
    }
  };

  const handleConfirmImport = () => {
    if (importItemId && importWorkspaceId) {
      doImport(importItemId, importWorkspaceId);
      setShowImportModal(false);
      setImportItemId(null);
    }
  };

  const handleDownload = () => {
    if (!selectedItem) return;
    const blob = new Blob([editorContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedItem.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0B1120]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Specification Library</h2>
          <p className="text-sm text-gray-400">Shared organization specifications</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
        >
          <Plus className="h-4 w-4" />
          Create New
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <aside className="w-72 border-r border-dark-700 bg-dark-800/30 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search library..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm whitespace-pre-line">
                {search ? 'No library items match your search' : 'No library items yet.\nCreate one to get started.'}
              </div>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className={clsx(
                    'group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all',
                    selectedItem?.id === item.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-dark-700/50 border border-transparent'
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-white truncate">
                        {item.name}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 ml-6 truncate">{item.description}</p>
                    )}
                  </div>

                  {isOwner(item) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-600"
                        title="Edit metadata"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
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

        {/* Right Main Area */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#0B1120]">
          {selectedItem ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedItem.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      {selectedItem.description && (
                        <p className="text-sm text-gray-400">{selectedItem.description}</p>
                      )}
                      {selectedItem.category && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                          {selectedItem.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditorDirty && canEdit && (
                      <button
                        onClick={handleUpdateContent}
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
                </div>
              </div>

              {/* Content Editor */}
              <div className="flex-1 min-h-0">
                <Editor
                  value={editorContent}
                  language="json"
                  theme="vs-dark"
                  options={{ ...MONACO_OPTIONS, readOnly: !canEdit }}
                  onChange={(value) => {
                    if (canEdit) {
                      setEditorContent(value || '');
                      setIsEditorDirty(true);
                    }
                  }}
                  height="100%"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileCode className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>Select a library item to view its content</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingItem) && (
        <LibraryItemModal
          item={editingItem}
          onClose={() => {
            setShowCreateModal(false);
            setEditingItem(null);
          }}
          onSave={(data) => {
            if (editingItem) {
              handleUpdateMetadata(editingItem.id, data);
            } else {
              handleCreate(data);
            }
          }}
        />
      )}

      {/* Import Workspace Selector Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-dark-800 border border-dark-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Workspace</h3>
            <p className="text-sm text-gray-400 mb-4">Choose a workspace to import this spec into:</p>
            <select
              value={importWorkspaceId || ''}
              onChange={(e) => setImportWorkspaceId(e.target.value)}
              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white mb-6"
            >
              {projects.length > 0 ? (
                projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              ) : (
                <option value="" disabled>No workspaces available</option>
              )}
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg border border-dark-600 text-gray-300 hover:bg-dark-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!importWorkspaceId}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal for creating/editing metadata (name, description, category)
function LibraryItemModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState(item?.category || '');
  const [content, setContent] = useState(item?.content || '');

  const isEditing = !!item;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!isEditing && !content.trim()) {
      toast.error('Content is required');
      return;
    }
    const data = { name: name.trim(), description: description.trim(), category: category.trim() };
    if (!isEditing) {
      data.content = content.trim();
    }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">
            {isEditing ? 'Edit Library Item' : 'Create Library Item'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Content (JSON) *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={8}
                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white"
            >
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}