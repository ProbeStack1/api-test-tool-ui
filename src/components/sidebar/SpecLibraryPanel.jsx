import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  getLibraryItem,
  listArchivedLibraryItems,
  restoreLibraryItem,
  permanentDeleteLibraryItem,
} from '../../services/specLibraryService';
import DeleteWithRetentionModal from '../common/DeleteWithRetentionModal';
import { ArchivedItemsView, ArchiveViewTrigger } from '../common/ArchivedItemsPanel';

const MONACO_OPTIONS = {
  fontSize: 13,
  lineHeight: 20,
  minimap: { enabled: false },
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  formatOnPaste: true,
  formatOnType: true,
};

export default function SpecLibraryPanel({ projects, currentUserId, activeWorkspaceId }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const editorWrapperRef = useRef(null);

  // Observe the document's data-theme attribute so Monaco can follow the app theme.
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.getAttribute('data-theme') !== 'light');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    setIsDark(root.getAttribute('data-theme') !== 'light');
    return () => observer.disconnect();
  }, []);

  /**
   * Converts any CSS color (rgb / rgba / hex / named) to a 6-digit hex string.
   * Monaco's colors config only accepts `#RRGGBB` or `#RRGGBBAA`.
   */
  const toHex = (color) => {
    if (!color) return null;
    if (color.startsWith('#')) return color.length === 7 ? color : null;
    const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return null;
    const [, r, g, b] = m;
    const h = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
  };

  /**
   * Register a custom Monaco theme `probestack-dark` that inherits from
   * vs-dark but overrides `editor.background` with the ACTUAL computed
   * background of the wrapper div — so Monaco visually matches the
   * `bg-probestack-bg` color the app uses.
   * Light theme is left as the stock Monaco `light` theme (white editor).
   */
  const handleBeforeMount = (monaco) => {
    if (!isDark) return; // only needed for dark theme
    const wrapper = editorWrapperRef.current;
    const computedBg = wrapper ? window.getComputedStyle(wrapper).backgroundColor : null;
    const hex = toHex(computedBg) || '#0f1419';
    try {
      monaco.editor.defineTheme('probestack-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': hex,
          'editorGutter.background': hex,
          'minimap.background': hex,
        },
      });
    } catch {
      /* already defined — ignore */
    }
  };

  // Import flow
  const [importWorkspaceId, setImportWorkspaceId] = useState(projects[0]?.id || '');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importItemId, setImportItemId] = useState(null);

  // Archive state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteAnchorRect, setDeleteAnchorRect] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archivePollKey, setArchivePollKey] = useState(0);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false);

  const openArchive = () => {
    setSelectedItem(null);
    setShowArchive(true);
    requestAnimationFrame(() => setArchiveVisible(true));
  };
  const closeArchive = () => {
    setArchiveVisible(false);
    setTimeout(() => setShowArchive(false), 280);
  };

  // An item is editable if the current user created it OR is a member of the
  // workspace that owns it (matches backend access validation).
  const workspaceIds = useMemo(
    () => new Set((projects || []).map(p => p.id)),
    [projects],
  );
  const canEditItem = (item) => {
    if (!item) return false;
    if (item.createdBy && currentUserId && item.createdBy === currentUserId) return true;
    if (item.workspaceId && workspaceIds.has(item.workspaceId)) return true;
    return false;
  };
  const canEditSelected = canEditItem(selectedItem);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await listLibraryItems(search);
      setItems(data);
      if (selectedItem) {
        const stillExists = data.find(i => i.id === selectedItem.id);
        if (!stillExists) setSelectedItem(null);
      } else if (!showArchive && data.length > 0) {
        // Auto-select the first item so users land on an editor (not a blank state).
        setSelectedItem(data[0]);
      }
    } catch (err) {
      // toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  // Helper: pretty-print JSON if possible, else return raw
  const prettify = (raw) => {
    if (!raw) return '';
    try { return JSON.stringify(JSON.parse(raw), null, 2); }
    catch { return raw; }
  };

  // Hydrate content whenever a library item is selected. The list endpoint
  // does not return content (it lives in GCS), so we fetch it on demand.
  useEffect(() => {
    let cancelled = false;
    if (!selectedItem) {
      setEditorContent('');
      setIsEditorDirty(false);
      return undefined;
    }
    // If the selected object already carries content (e.g. just created),
    // use it directly — no extra network call.
    if (selectedItem.content) {
      setEditorContent(prettify(selectedItem.content));
      setIsEditorDirty(false);
      return undefined;
    }
    setContentLoading(true);
    setEditorContent('');
    (async () => {
      try {
        const full = await getLibraryItem(selectedItem.id);
        if (cancelled) return;
        setEditorContent(prettify(full.content || ''));
        setIsEditorDirty(false);
        // Update the list so that re-selection is instant next time.
        setItems(prev => prev.map(it => it.id === full.id ? full : it));
      } catch {
        if (!cancelled) toast.error('Failed to load library item content');
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (newItem) => {
    const workspaceId = activeWorkspaceId || projects[0]?.id;
    if (!workspaceId) {
      toast.error('No workspace available — create a workspace first');
      return;
    }
    try {
      const created = await createLibraryItem({ ...newItem, workspaceId });
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

  const openDeleteModal = (e, item) => {
    const rect = e?.currentTarget?.getBoundingClientRect?.() ?? null;
    setDeleteAnchorRect(rect);
    setDeleteTarget(item);
  };

  const handleConfirmArchive = async (retentionDays) => {
    if (!deleteTarget) return;
    setArchiveBusy(true);
    try {
      await deleteLibraryItem(deleteTarget.id, retentionDays);
      setItems(prev => prev.filter(item => item.id !== deleteTarget.id));
      if (selectedItem?.id === deleteTarget.id) setSelectedItem(null);
      toast.success(`Archived — auto-purge in ${retentionDays} day${retentionDays !== 1 ? 's' : ''}`);
      setDeleteTarget(null);
      setArchivePollKey(k => k + 1);
    } catch (err) {
      toast.error('Archive failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!deleteTarget) return;
    setArchiveBusy(true);
    try {
      await permanentDeleteLibraryItem(deleteTarget.id);
      setItems(prev => prev.filter(item => item.id !== deleteTarget.id));
      if (selectedItem?.id === deleteTarget.id) setSelectedItem(null);
      toast.success('Permanently deleted');
      setDeleteTarget(null);
      setArchivePollKey(k => k + 1);
    } catch (err) {
      toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleRestoreFromArchive = async (id) => {
    const restored = await restoreLibraryItem(id);
    setItems(prev => {
      if (prev.find(i => i.id === restored.id)) return prev;
      return [restored, ...prev];
    });
  };
  const handlePermanentDeleteFromArchive = async (id) => {
    await permanentDeleteLibraryItem(id);
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

  const canActOnArchived = (item) => canEditItem(item);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--color-input-bg)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 bg-[var(--color-card-bg)] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Specification Library</h2>
          <p className="text-sm text-gray-400">Shared organization specifications</p>
        </div>
        <div className="flex items-center gap-2">
          <ArchiveViewTrigger
            active={showArchive}
            onToggle={() => (showArchive ? closeArchive() : openArchive())}
            fetchArchived={listArchivedLibraryItems}
            pollKey={archivePollKey}
            label="Archive"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
            data-testid="library-create-btn"
          >
            <Plus className="h-4 w-4" />
            Create New
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-72 border-r border-dark-700 bg-[var(--color-card-bg)] flex flex-col">
          <div className="px-4 py-2 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search library..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                data-testid="library-search"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm whitespace-pre-line">
                {search ? 'No library items match your search' : 'No library items yet.\nCreate one to get started.'}
              </div>
            ) : (
              items.map(item => {
                const editable = canEditItem(item);
                return (
                  <div
                    key={item.id}
                    className={clsx(
                      'group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all',
                      selectedItem?.id === item.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-dark-700/50 border border-transparent'
                    )}
                    onClick={() => { if (showArchive) closeArchive(); setSelectedItem(item); }}
                    data-testid={`library-item-${item.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-white truncate">{item.name}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 ml-6 truncate">{item.description}</p>
                      )}
                    </div>

                    {editable && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                          className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-600"
                          title="Edit metadata"
                          data-testid={`library-edit-${item.id}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDeleteModal(e, item); }}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete…"
                          data-testid={`library-delete-${item.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main area */}
        {/* Main area — editor always mounted; archive slides up over it. */}
        <div className="flex-1 relative flex flex-col min-h-0">
          <main className="flex-1 flex flex-col min-h-0">
          {selectedItem ? (
            <>
              <div className="px-6 py-1 border-b border-dark-700 bg-[var(--color-input-bg)]">
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
                      {!canEditSelected && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
                          Read-only
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditorDirty && canEditSelected && (
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

              {contentLoading ? (
                <div className={clsx(
                  'flex-1 flex items-center justify-center text-sm text-gray-500',
                  isDark && 'bg-probestack-bg'
                )}>
                  Loading content…
                </div>
              ) : (
                <div ref={editorWrapperRef} className={clsx(
                  'flex-1 min-h-0',
                  isDark && 'bg-probestack-bg'
                )}>
                  <Editor
                    value={editorContent}
                    language="json"
                    theme={isDark ? 'probestack-dark' : 'light'}
                    beforeMount={handleBeforeMount}
                    options={{ ...MONACO_OPTIONS, readOnly: !canEditSelected }}
                    onChange={(value) => {
                      if (canEditSelected) {
                        setEditorContent(value || '');
                        setIsEditorDirty(true);
                      }
                    }}
                    height="100%"
                  />
                </div>
              )}
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

        {/* Archive slide-up panel */}
        {showArchive && (
          <div
            className="absolute inset-0 z-20 flex flex-col transition-transform duration-[280ms] ease-out will-change-transform shadow-2xl"
            style={{ transform: archiveVisible ? 'translateY(0%)' : 'translateY(100%)' }}
            data-testid="archive-slide-panel"
          >
            <ArchivedItemsView
              title="Archived Library Items"
              onClose={closeArchive}
              fetchArchived={listArchivedLibraryItems}
              onRestore={handleRestoreFromArchive}
              onPermanentDelete={handlePermanentDeleteFromArchive}
              canAct={canActOnArchived}
              refreshKey={archivePollKey}
            />
          </div>
        )}
        </div>
      </div>

      {/* Create / edit metadata */}
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

      {/* Delete / archive popover (anchored) */}
      <DeleteWithRetentionModal
        open={!!deleteTarget}
        anchorRect={deleteAnchorRect}
        itemName={deleteTarget?.name}
        itemType="Library Item"
        onCancel={() => { if (!archiveBusy) { setDeleteTarget(null); setDeleteAnchorRect(null); } }}
        onArchive={handleConfirmArchive}
        onDelete={handleConfirmPermanentDelete}
        busy={archiveBusy}
      />

      {/* Import workspace selector */}
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
                projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
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

function LibraryItemModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState(item?.category || '');
  const [content, setContent] = useState(item?.content || '');

  const isEditing = !!item;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!isEditing && !content.trim()) { toast.error('Content is required'); return; }
    const data = { name: name.trim(), description: description.trim(), category: category.trim() };
    if (!isEditing) {
      // Always save beautified JSON if valid; otherwise keep raw text.
      let finalContent = content.trim();
      try { finalContent = JSON.stringify(JSON.parse(finalContent), null, 2); } catch { /* keep raw */ }
      data.content = finalContent;
    }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-input-bg)] border border-dark-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="bg-[var(--color-card-bg)] flex items-center justify-between px-5 py-4 border-b border-dark-700 sticky top-0 z-10">
          <h3 className="text-base font-semibold text-white">
            {isEditing ? 'Edit Library Item' : 'Create Library Item'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-5 space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Enter item name"
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Optional description"
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <input
                type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., API, Database, etc."
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            {!isEditing && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-300">Content (JSON) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(content);
                        setContent(JSON.stringify(parsed, null, 2));
                        toast.success('JSON beautified');
                      } catch {
                        toast.error('Invalid JSON — cannot beautify');
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white border border-dark-600"
                  >
                    Beautify
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={() => {
                    // Auto-beautify on blur if it's valid JSON
                    try {
                      const parsed = JSON.parse(content);
                      const pretty = JSON.stringify(parsed, null, 2);
                      if (pretty !== content) setContent(pretty);
                    } catch { /* leave as-is, user can still submit */ }
                  }}
                  required
                  rows={12}
                  placeholder={'{\n  "key": "value"\n}'}
                  className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-gray-500 whitespace-pre"
                />
              </div>
            )}
          </div>

          <div className="bg-[var(--color-card-bg)] flex items-center justify-end gap-2 px-5 py-4 border-t border-dark-700">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white">
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
