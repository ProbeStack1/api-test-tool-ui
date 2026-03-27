import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';

export default function SaveRequestModal({
  isOpen,
  onClose,
  onSave,
  requestName = '',
  collections = [],
  activeWorkspaceId,
}) {
  const [localRequestName, setLocalRequestName] = useState(requestName);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isNewCollection, setIsNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionError, setNewCollectionError] = useState('');
  const [folders, setFolders] = useState([]);
  const modalRef = useRef(null);

  // Update local request name when prop changes
  useEffect(() => {
    setLocalRequestName(requestName);
  }, [requestName]);

  // Memoize workspace collections to avoid infinite loop
  const workspaceCollections = useMemo(() => {
    return collections.filter(col => col.project === activeWorkspaceId);
  }, [collections, activeWorkspaceId]);

  // When a collection is selected, extract its folders
  useEffect(() => {
    if (!selectedCollectionId) {
      setFolders([]);
      setSelectedFolderId('');
      return;
    }
    const collection = workspaceCollections.find(c => c.id === selectedCollectionId);
    if (!collection) return;

    // Recursively extract all folders from the collection's items
    const extractFolders = (items, parentPath = '') => {
      let folderList = [];
      if (!items) return folderList;
      items.forEach(item => {
        if (item.type === 'folder') {
          folderList.push({
            id: item.id,
            name: item.name,
            parentFolderId: item.parentFolderId,
            path: parentPath ? `${parentPath} / ${item.name}` : item.name,
          });
          if (item.items) {
            folderList = folderList.concat(extractFolders(item.items, item.name));
          }
        }
      });
      return folderList;
    };
    setFolders(extractFolders(collection.items || []));
  }, [selectedCollectionId, workspaceCollections]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCollectionId('');
      setSelectedFolderId('');
      setIsNewCollection(false);
      setNewCollectionName('');
      setNewCollectionError('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (isNewCollection) {
      if (!newCollectionName.trim()) {
        setNewCollectionError('Collection name is required');
        return;
      }
      // Check duplicate in this workspace
      const exists = workspaceCollections.some(
        c => c.name.toLowerCase() === newCollectionName.trim().toLowerCase()
      );
      if (exists) {
        setNewCollectionError(`Collection "${newCollectionName.trim()}" already exists`);
        return;
      }
    } else {
      if (!selectedCollectionId) {
        alert('Please select a collection');
        return;
      }
    }

    onSave({
      collectionId: isNewCollection ? null : selectedCollectionId,
      collectionName: isNewCollection ? newCollectionName.trim() : '',
      isNewCollection,
      folderId: selectedFolderId || null,
      requestName: localRequestName.trim() || 'Untitled Request',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Save Request</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Request Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Request Name
            </label>
            <input
              type="text"
              value={localRequestName}
              onChange={(e) => setLocalRequestName(e.target.value)}
              placeholder="Enter request name"
              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Collection Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {isNewCollection ? 'New Collection Name' : 'Choose Collection'}
            </label>
            {isNewCollection ? (
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => {
                  setNewCollectionName(e.target.value);
                  setNewCollectionError('');
                }}
                placeholder="Enter collection name"
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            ) : (
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="">Select a collection</option>
                {workspaceCollections.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            )}
            {newCollectionError && (
              <p className="mt-2 text-xs text-red-400">{newCollectionError}</p>
            )}
          </div>

          {/* Folder selection (if collection selected and has folders) */}
          {!isNewCollection && selectedCollectionId && folders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Folder (optional)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="">Root</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.path}</option>
                ))}
              </select>
            </div>
          )}

          {/* Checkbox for new collection */}
          {/* <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isNewCollection}
              onChange={(e) => setIsNewCollection(e.target.checked)}
              className="rounded border-dark-600 bg-dark-700 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-gray-300">Create new collection</span>
          </label> */}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isNewCollection && !selectedCollectionId}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}