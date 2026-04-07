// src/components/sidebar/MCPPanel.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, MoreHorizontal, Search, Plus, FilePlus, FolderPlus, Edit3, Trash2, X, Cpu } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { fetchCollections, createCollection, deleteCollection, createFolder, deleteFolder, updateFolder, normalizeCollection, normalizeFolder } from '../../services/collectionService';
import { createRequest, deleteRequest, updateRequest, normalizeRequest } from '../../services/requestService';

const sortItems = (items) => {
  if (!items || !Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });
};

// Helper to find item by ID in tree
const findItemById = (items, id) => {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.items) {
      const found = findItemById(item.items, id);
      if (found) return found;
    }
  }
  return null;
};

const findParentCollection = (items, itemId, parent = null) => {
  for (const item of items) {
    if (item.id === itemId) return parent;
    if (item.items) {
      const found = findParentCollection(item.items, itemId, item);
      if (found !== null) return found;
    }
  }
  return null;
};

// ----------------------------------------------------------------------
// Modals (simplified – reuse from CollectionsPanel or inline)
// ----------------------------------------------------------------------
function NewMCPCollectionModal({ isOpen, onClose, onCreate, existingNames }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setName(''); setError(''); } }, [isOpen]);
  if (!isOpen) return null;
  const handleCreate = () => {
    if (!name.trim()) { setError('Name required'); return; }
    if (existingNames.includes(name.trim().toLowerCase())) { setError('Name already exists'); return; }
    onCreate(name.trim());
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-dark-700 flex justify-between">
          <h3 className="text-base font-semibold text-white">Create MCP Collection</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <input type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }} className="w-full bg-input border border-dark-700 rounded-lg px-3 py-2 text-sm text-white" autoFocus />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:bg-dark-700 rounded">Cancel</button>
          <button onClick={handleCreate} className="px-4 py-2 text-sm bg-primary text-white rounded">Create</button>
        </div>
      </div>
    </div>
  );
}

function RenameModal({ isOpen, onClose, currentName, onRename }) {
  const [newName, setNewName] = useState('');
  useEffect(() => { if (isOpen) setNewName(currentName); }, [isOpen, currentName]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-dark-700 flex justify-between">
          <h3 className="text-base font-semibold text-white">Rename</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-input border border-dark-700 rounded-lg px-3 py-2 text-sm text-white" autoFocus />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:bg-dark-700 rounded">Cancel</button>
          <button onClick={() => { if (newName.trim()) onRename(newName.trim()); onClose(); }} className="px-4 py-2 text-sm bg-primary text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}

function NewFolderModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  useEffect(() => { if (isOpen) setName(''); }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-dark-700 flex justify-between">
          <h3 className="text-base font-semibold text-white">Create Folder</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Folder name" className="w-full bg-input border border-dark-700 rounded-lg px-3 py-2 text-sm text-white" autoFocus />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:bg-dark-700 rounded">Cancel</button>
          <button onClick={() => { if (name.trim()) onCreate(name.trim()); onClose(); }} className="px-4 py-2 text-sm bg-primary text-white rounded">Create</button>
        </div>
      </div>
    </div>
  );
}

function ContextMenu({ x, y, onClose, onAction }) {
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  const options = [
    { id: 'add-request', label: 'Add Request', icon: FilePlus },
    { id: 'add-folder', label: 'Add Folder', icon: FolderPlus },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];
  return (
    <div ref={menuRef} className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-dark-700 bg-dark-800 shadow-xl" style={{ left: x, top: y }}>
      {options.map(opt => {
        const Icon = opt.icon;
        return (
          <button key={opt.id} onClick={() => { onAction(opt.id); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-700">
            <Icon className="w-4 h-4" /> {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MCPNode({ item, expanded, onToggle, level, onSelect, onOpenMenu, selectedRequestId }) {
  const isExpanded = expanded[item.id];
  const hasChildren = item.items && item.items.length > 0;
  const isRequest = item.type === 'request';
  const isFolder = item.type === 'folder';
  const isSelected = isRequest && item.id === selectedRequestId;
  const indentPx = level * 16;

  const handleRowClick = () => {
    if (isRequest && onSelect) onSelect(item);
    else if (!isRequest) onToggle(item.id);
  };

  return (
    <div className="select-none">
      <div style={{ paddingLeft: indentPx }} onClick={handleRowClick}
        className={clsx('flex items-center gap-2 rounded-md group cursor-pointer py-2 transition-colors',
          !isSelected && 'hover:bg-primary/5',
          isSelected && 'bg-primary/10 border-l-2 border-primary'
        )}>
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {!isRequest && hasChildren && (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />)}
        </div>
        {isRequest ? (
          <span className="text-[10px] font-bold w-9 text-right shrink-0 text-purple-400">MCP</span>
        ) : (
          <Folder className={clsx('w-4 h-4 shrink-0', level === 0 ? 'text-amber-500/90' : 'text-gray-500')} />
        )}
        <span className={clsx('text-xs truncate flex-1', isRequest ? 'text-gray-300' : 'text-gray-200 font-medium')}>{item.name}</span>
        {(level === 0 || isFolder) && (
          <button onClick={(e) => { e.stopPropagation(); onOpenMenu(e, item, level === 0 ? 'collection' : 'folder'); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>{sortItems(item.items).map(child => <MCPNode key={child.id} item={child} expanded={expanded} onToggle={onToggle} level={level+1} onSelect={onSelect} onOpenMenu={onOpenMenu} selectedRequestId={selectedRequestId} />)}</div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN MCP PANEL (using backend API)
// ----------------------------------------------------------------------
export default function MCPPanel({ onSelectMcpEndpoint, selectedRequestId, activeWorkspaceId, collections: propCollections, onCollectionsChange }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [renameItemType, setRenameItemType] = useState('request');
  const [pendingParent, setPendingParent] = useState(null);

  // Helper to update the global collections tree
  const updateCollectionTree = (newCollections) => {
    if (onCollectionsChange) {
      onCollectionsChange(newCollections);
    }
  };

  const handleCreateCollection = async (name) => {
    try {
      const res = await createCollection(activeWorkspaceId, { name, type: 'mcp' });
      const newCol = normalizeCollection(res.data, { id: activeWorkspaceId, name: '' });
      const updated = [...propCollections, newCol];
      updateCollectionTree(updated);
      setExpanded(prev => ({ ...prev, [newCol.id]: true }));
      toast.success('MCP collection created');
    } catch (err) {
      toast.error('Failed to create collection');
    }
  };

  const handleDeleteItem = async (item) => {
    try {
      if (item.type === 'collection') await deleteCollection(item.id);
      else if (item.type === 'folder') await deleteFolder(item.id);
      else if (item.type === 'request') await deleteRequest(item.id);
      const removeFromTree = (items) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === item.id) { items.splice(i,1); return true; }
          if (items[i].items && removeFromTree(items[i].items)) return true;
        }
        return false;
      };
      const newTree = [...propCollections];
      removeFromTree(newTree);
      updateCollectionTree(newTree);
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleRenameItem = async (item, newName) => {
    try {
      if (item.type === 'collection') await updateCollection(item.id, { name: newName });
      else if (item.type === 'folder') await updateFolder(item.id, { name: newName });
      else if (item.type === 'request') await updateRequest(item.id, { name: newName });
      const updated = [...propCollections];
      const target = findItemById(updated, item.id);
      if (target) target.name = newName;
      updateCollectionTree(updated);
      toast.success('Renamed');
    } catch (err) {
      toast.error('Rename failed');
    }
  };

  const handleCreateFolder = async (parentItem, name) => {
    const collectionId = parentItem.type === 'collection' ? parentItem.id : parentItem.collectionId;
    const parentFolderId = parentItem.type === 'folder' ? parentItem.id : null;
    try {
      const res = await createFolder(collectionId, { name, parentFolderId });
      const newFolder = normalizeFolder(res.data);
      const updated = [...propCollections];
      const target = findItemById(updated, parentItem.id);
      if (target && target.items) {
        target.items.push(newFolder);
        target.items = sortItems(target.items);
      } else {
        const col = updated.find(c => c.id === collectionId);
        if (col) { if (!col.items) col.items = []; col.items.push(newFolder); col.items = sortItems(col.items); }
      }
      updateCollectionTree(updated);
      setExpanded(prev => ({ ...prev, [newFolder.id]: true }));
      toast.success('Folder created');
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  const handleCreateRequest = async (parentItem) => {
    const collectionId = parentItem.type === 'collection' ? parentItem.id : parentItem.collectionId;
    const folderId = parentItem.type === 'folder' ? parentItem.id : null;
    const payload = {
      name: 'Untitled MCP Request',
      method: 'GET',
      url: '',
      collection_id: collectionId,
      folder_id: folderId,
      protocol: 'MCP',
      body_type: 'none',
      auth_type: 'none',
    };
    try {
      const res = await createRequest(payload);
      const newReq = normalizeRequest(res.data);
      const updated = [...propCollections];
      const target = findItemById(updated, parentItem.id);
      if (target && target.items) {
        target.items.push(newReq);
        target.items = sortItems(target.items);
      }
      updateCollectionTree(updated);
      if (onSelectMcpEndpoint) onSelectMcpEndpoint(newReq);
      toast.success('MCP request created');
    } catch (err) {
      toast.error('Failed to create request');
    }
  };

  const handleOpenMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  const handleContextAction = (actionId) => {
    if (!contextMenu) return;
    const { item, type } = contextMenu;
    if (actionId === 'add-request') {
      handleCreateRequest(item);
    } else if (actionId === 'add-folder') {
      setSelectedItem(item);
      setShowNewFolderModal(true);
    } else if (actionId === 'rename') {
      setSelectedItem(item);
      setRenameItemType(type === 'collection' ? 'collection' : type === 'folder' ? 'folder' : 'request');
      setShowRenameModal(true);
    } else if (actionId === 'delete') {
      handleDeleteItem(item);
    }
    setContextMenu(null);
  };

  const filterTree = (items, q) => {
    if (!q.trim()) return items;
    const lower = q.toLowerCase();
    return items.map(item => {
      if (item.type === 'request') {
        const match = item.name.toLowerCase().includes(lower);
        return match ? item : null;
      }
      const filteredChildren = item.items ? filterTree(item.items, q) : [];
      const nameMatch = item.name.toLowerCase().includes(lower);
      if (nameMatch || filteredChildren.length > 0) {
        return { ...item, items: filteredChildren.length ? filteredChildren : item.items };
      }
      return null;
    }).filter(Boolean);
  };

  const filteredCollections = filterTree(propCollections, search);

  return (
    <div className="flex flex-col h-full bg-dark-800/40">
      <div className="shrink-0 px-4 py-3 border-b border-dark-700/50">
        <button onClick={() => setShowNewCollectionModal(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-xs font-medium bg-input hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600">
          <Plus className="w-4 h-4" /> Create MCP Collection
        </button>
      </div>

      <div className="shrink-0 px-3 py-2 border-b border-dark-700/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search MCP collections" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-input border border-dark-700 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {filteredCollections.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">No MCP collections</div>
        ) : (
          filteredCollections.map(col => (
            <MCPNode key={col.id} item={col} expanded={expanded} onToggle={id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))}
              level={0} onSelect={onSelectMcpEndpoint} onOpenMenu={handleOpenMenu} selectedRequestId={selectedRequestId} />
          ))
        )}
      </div>

      <NewMCPCollectionModal isOpen={showNewCollectionModal} onClose={() => setShowNewCollectionModal(false)}
        onCreate={handleCreateCollection} existingNames={propCollections.map(c => c.name.toLowerCase())} />
      <NewFolderModal isOpen={showNewFolderModal} onClose={() => setShowNewFolderModal(false)}
        onCreate={(name) => handleCreateFolder(selectedItem, name)} />
      <RenameModal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)}
        currentName={selectedItem?.name || ''} onRename={(newName) => handleRenameItem(selectedItem, newName)} />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}
    </div>
  );
}