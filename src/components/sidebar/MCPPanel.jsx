// src/components/sidebar/MCPPanel.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, MoreHorizontal, Search, Plus, FilePlus, FolderPlus, Edit3, Trash2, Globe, X, Check, Cpu } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import localForage from 'localforage';

// ----------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------
const sortItems = (items) => {
  if (!items || !Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });
};

// ----------------------------------------------------------------------
// Modal: Choose Request Type (HTTP / MCP)
// ----------------------------------------------------------------------
function NewMCPRequestTypeModal({ isOpen, onClose, onSelectType }) {
  const [hoveredId, setHoveredId] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const options = [
    { id: 'http', label: 'HTTP Request', icon: Globe, description: 'Standard HTTP request (GET, POST, etc.)' },
    { id: 'mcp', label: 'MCP Request', icon: Cpu, description: 'Model Context Protocol request with transport selector' },
  ];

  const hoveredOption = options.find(o => o.id === hoveredId);
  const description = hoveredOption ? hoveredOption.description : 'Choose the type of request to create';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Create New Request</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            {options.map(opt => {
              const Icon = opt.icon;
              const isHovered = hoveredId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onSelectType(opt.id);
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredId(opt.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl border transition-all',
                    isHovered
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'border-dark-600 bg-dark-800/80 text-gray-300 hover:border-dark-500 hover:bg-dark-700/50'
                  )}
                >
                  <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', isHovered ? 'bg-primary/20' : 'bg-dark-700')}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-center">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-gray-400 text-center min-h-[1.25rem]">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Modal: Create MCP Collection
// ----------------------------------------------------------------------
function NewMCPCollectionModal({ isOpen, onClose, onCreate, existingNames }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (existingNames.includes(name.trim().toLowerCase())) {
      setError('A collection with this name already exists');
      return;
    }
    onCreate(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Create MCP Collection</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">Collection Name</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            autoFocus
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-dark-700">Cancel</button>
          <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm bg-primary text-white">Create</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Modal: Rename Item (Collection / Folder / Request)
// ----------------------------------------------------------------------
function RenameMCPModal({ isOpen, onClose, currentName, onRename, itemType = 'request' }) {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen) setNewName(currentName);
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (newName.trim()) onRename(newName.trim());
    onClose();
  };

  const title = itemType === 'folder' ? 'Rename Folder' : itemType === 'collection' ? 'Rename Collection' : 'Rename Request';
  const label = itemType === 'folder' ? 'Folder Name' : itemType === 'collection' ? 'Collection Name' : 'Request Name';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-dark-700">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm bg-primary text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Modal: Create Folder
// ----------------------------------------------------------------------
function NewMCPFolderModal({ isOpen, onClose, onCreate, parentItem }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setName(''); setError(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (parentItem?.items?.some(item => item.type === 'folder' && item.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A folder with this name already exists');
      return;
    }
    onCreate(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Create Folder</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">Folder Name</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
            autoFocus
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-dark-700">Cancel</button>
          <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm bg-primary text-white">Create</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Context Menu
// ----------------------------------------------------------------------
function ContextMenu({ x, y, onClose, onAction, type }) {
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const options = type === 'collection' ? [
    { id: 'add-request', label: 'Add Request', icon: FilePlus },
    { id: 'add-folder', label: 'Add Folder', icon: FolderPlus },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ] : type === 'folder' ? [
    { id: 'add-request', label: 'Add Request', icon: FilePlus },
    { id: 'add-folder', label: 'Add Folder', icon: FolderPlus },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ] : [
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];

  return (
    <div ref={menuRef} className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-dark-700 bg-dark-800 shadow-xl" style={{ left: x, top: y }}>
      {options.map(opt => {
        const Icon = opt.icon;
        const isDelete = opt.id === 'delete';
        return (
          <button
            key={opt.id}
            onClick={() => { onAction(opt.id); onClose(); }}
            className={clsx('w-full flex items-center gap-2 px-3 py-2 text-left text-sm', isDelete ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-dark-700')}
          >
            <Icon className="w-4 h-4" /> {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// Tree Node Component
// ----------------------------------------------------------------------
function MCPNode({ item, expanded, onToggle, level, onSelect, onOpenMenu, selectedRequestId }) {
  const isExpanded = expanded[item.id];
  const hasChildren = item.items && item.items.length > 0;
  const isRequest = item.type === 'request' || item.type === 'mcp-request';
  const isFolder = item.type === 'folder';
  const isSelected = isRequest && item.id === selectedRequestId;
  const indentPx = level * 16;

  const handleRowClick = () => {
    if (isRequest && onSelect) onSelect(item);
    else if (!isRequest) onToggle(item.id);
  };

  return (
    <div className="select-none">
      <div
        style={{ paddingLeft: indentPx }}
        onClick={handleRowClick}
        className={clsx(
          'flex items-center gap-2 rounded-md group cursor-pointer py-2 transition-colors',
          !isSelected && 'hover:bg-primary/5',
          isSelected && 'bg-primary/10 border-l-2 border-primary'
        )}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {!isRequest && hasChildren && (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />)}
        </div>
        {isRequest ? (
          <span className={clsx('text-[10px] font-bold w-9 text-right shrink-0', 
            item.method === 'GET' && 'text-green-400',
            item.method === 'POST' && 'text-yellow-400',
            item.method === 'PUT' && 'text-blue-400',
            item.method === 'DELETE' && 'text-red-400',
            'text-purple-400'
          )}>
            {item.method}
          </span>
        ) : (
          <Folder className={clsx('w-4 h-4 shrink-0', level === 0 ? 'text-amber-500/90' : 'text-gray-500')} />
        )}
        <span className={ clsx('text-xs truncate flex-1', isRequest ? 'text-gray-300 ' : 'text-gray-200 font-medium')}>
          {item.name}
        </span>
        {(level === 0 || isFolder) && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenMenu(e, item, level === 0 ? 'collection' : 'folder'); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {sortItems(item.items).map(child => (
            <MCPNode
              key={child.id}
              item={child}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
              onSelect={onSelect}
              onOpenMenu={onOpenMenu}
              selectedRequestId={selectedRequestId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN MCP PANEL COMPONENT (using localForage)
// ----------------------------------------------------------------------
export default function MCPPanel({ onSelectMcpEndpoint, selectedRequestId, activeWorkspaceId }) {
  const [mcpCollections, setMcpCollections] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRequestTypeModal, setShowRequestTypeModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [renameItemType, setRenameItemType] = useState('request');
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingParentForRequest, setPendingParentForRequest] = useState(null);

  // IndexedDB instance
  const mcpDB = useRef(null);

  useEffect(() => {
    mcpDB.current = localForage.createInstance({
      name: 'ProbeStack',
      storeName: 'mcp_collections'
    });
  }, []);

  // Load collections from IndexedDB
  const loadCollections = useCallback(async () => {
    if (!activeWorkspaceId || !mcpDB.current) return;
    try {
      const key = `workspace_${activeWorkspaceId}`;
      const data = await mcpDB.current.getItem(key);
      if (data && Array.isArray(data)) {
        setMcpCollections(data);
        // Auto-expand root collections
        const newExpanded = {};
        data.forEach(col => { newExpanded[col.id] = true; });
        setExpanded(newExpanded);
      } else {
        setMcpCollections([]);
      }
    } catch (err) {
      console.error('Failed to load MCP collections', err);
    }
  }, [activeWorkspaceId]);

  // Save collections to IndexedDB
  const saveCollections = useCallback(async (collections) => {
    if (!activeWorkspaceId || !mcpDB.current) return;
    try {
      const key = `workspace_${activeWorkspaceId}`;
      await mcpDB.current.setItem(key, collections);
    } catch (err) {
      console.error('Failed to save MCP collections', err);
    }
  }, [activeWorkspaceId]);

  // Load when workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      loadCollections();
    }
  }, [activeWorkspaceId, loadCollections]);

  // Save whenever collections change
  useEffect(() => {
    if (activeWorkspaceId && mcpCollections.length >= 0) {
      saveCollections(mcpCollections);
    }
  }, [mcpCollections, activeWorkspaceId, saveCollections]);

  // Helper: find item by ID in tree
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

  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // CRUD operations
  const handleCreateCollection = (name) => {
    const newCollection = {
      id: generateUniqueId(),
      name,
      type: 'collection',
      items: [],
    };
    setMcpCollections(prev => [...prev, newCollection]);
    setExpanded(prev => ({ ...prev, [newCollection.id]: true }));
  };

  const handleCreateFolder = (parentItem, name) => {
    const newFolder = {
      id: generateUniqueId(),
      name,
      type: 'folder',
      items: [],
    };
    setMcpCollections(prev => {
      const updated = structuredClone(prev);
      const target = findItemById(updated, parentItem.id);
      if (target && target.items) {
        target.items.push(newFolder);
        target.items = sortItems(target.items);
      }
      return updated;
    });
    setExpanded(prev => ({ ...prev, [newFolder.id]: true }));
  };

  const handleCreateRequestByType = (type, parentItem) => {
    const newRequest = {
      id: generateUniqueId(),
      name: 'Untitled Request',
      type: type === 'mcp' ? 'mcp-request' : 'request',
      method: 'GET',
      url: '',
      ...(type === 'mcp' && { mcpType: 'sse' }),
    };
    setMcpCollections(prev => {
      const updated = structuredClone(prev);
      const target = findItemById(updated, parentItem.id);
      if (target && target.items) {
        target.items.push(newRequest);
        target.items = sortItems(target.items);
      }
      return updated;
    });
    if (onSelectMcpEndpoint) onSelectMcpEndpoint(newRequest);
  };

  const handleRename = (item, newName) => {
    setMcpCollections(prev => {
      const updated = structuredClone(prev);
      const target = findItemById(updated, item.id);
      if (target) target.name = newName;
      return updated;
    });
  };

  const handleDelete = (item) => {
    setMcpCollections(prev => {
      const updated = structuredClone(prev);
      const parent = findParentCollection(updated, item.id);
      if (parent && parent.items) {
        parent.items = parent.items.filter(i => i.id !== item.id);
        parent.items = sortItems(parent.items);
      } else {
        return updated.filter(c => c.id !== item.id);
      }
      return updated;
    });
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
      setPendingParentForRequest(item);
      setShowRequestTypeModal(true);
    } else if (actionId === 'add-folder') {
      setSelectedItem(item);
      setShowNewFolderModal(true);
    } else if (actionId === 'rename') {
      setSelectedItem(item);
      setRenameItemType(type === 'collection' ? 'collection' : type === 'folder' ? 'folder' : 'request');
      setShowRenameModal(true);
    } else if (actionId === 'delete') {
      handleDelete(item);
    }
    setContextMenu(null);
  };

  // Filter tree by search
  const filterTree = (items, q) => {
    if (!q.trim()) return items;
    const lower = q.toLowerCase();
    return items.map(item => {
      if (item.type === 'request' || item.type === 'mcp-request') {
        const match = item.name.toLowerCase().includes(lower) || (item.method && item.method.toLowerCase().includes(lower));
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

  const filteredCollections = filterTree(mcpCollections, search);

  return (
    <div className="flex flex-col h-full bg-dark-800/40">
      {/* Top buttons */}
      <div className="shrink-0 px-4 py-3 border-b border-dark-700/50">
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewCollectionModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-xs font-medium bg-[var(--color-input-bg)] hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
          <button
            onClick={() => toast.info('Import MCP collection coming soon')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-xs font-medium bg-[var(--color-input-bg)] hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600"
          >
            Import
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2 border-b border-dark-700/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search MCP collections"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
        {filteredCollections.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">No MCP collections</div>
        ) : (
          filteredCollections.map(col => (
            <MCPNode
              key={col.id}
              item={col}
              expanded={expanded}
              onToggle={id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))}
              level={0}
              onSelect={onSelectMcpEndpoint}
              onOpenMenu={handleOpenMenu}
              selectedRequestId={selectedRequestId}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <NewMCPCollectionModal
        isOpen={showNewCollectionModal}
        onClose={() => setShowNewCollectionModal(false)}
        onCreate={handleCreateCollection}
        existingNames={mcpCollections.map(c => c.name.toLowerCase())}
      />
      <NewMCPFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreate={(name) => handleCreateFolder(selectedItem, name)}
        parentItem={selectedItem}
      />
      <NewMCPRequestTypeModal
        isOpen={showRequestTypeModal}
        onClose={() => {
          setShowRequestTypeModal(false);
          setPendingParentForRequest(null);
        }}
        onSelectType={(selectedType) => {
          if (pendingParentForRequest) {
            handleCreateRequestByType(selectedType, pendingParentForRequest);
          }
        }}
      />
      <RenameMCPModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        currentName={selectedItem?.name || ''}
        onRename={(newName) => handleRename(selectedItem, newName)}
        itemType={renameItemType}
      />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
          type={contextMenu.type}
        />
      )}
    </div>
  );
}