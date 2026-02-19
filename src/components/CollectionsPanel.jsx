import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  MoreHorizontal,
  Search,
  FilePlus,
  FolderPlus,
  Share2,
  Edit3,
  Copy,
  Trash2,
  Globe,
  Box,
  Cpu,
  ArrowLeftRight,
  Zap,
  Layers,
  LayoutGrid,
  Save,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const NEW_OPTIONS = [
  { id: 'http', label: 'HTTP', icon: Globe, description: 'Create a new HTTP request to test REST APIs.' },
  { id: 'graphql', label: 'GraphQL', icon: Box, description: 'Send GraphQL queries and mutations.' },
  { id: 'mcp', label: 'MCP', icon: Cpu, description: 'Model Context Protocol integration.' },
  { id: 'grpc', label: 'gRPC', icon: ArrowLeftRight, description: 'Connect and test gRPC services.' },
  { id: 'websocket', label: 'WebSocket', icon: Zap, description: 'Open a WebSocket connection.' },
  { id: 'collection', label: 'Collection', icon: FolderPlus, description: 'Create a new collection to organize requests.' },
  { id: 'environment', label: 'Environment', icon: Layers, description: 'Create variables for different environments.' },
  { id: 'workspace', label: 'Workspace', icon: LayoutGrid, description: 'Create a new workspace for your team.' },
];

function NewModal({ isOpen, onClose, onSelect }) {
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

  const hoveredOption = NEW_OPTIONS.find((o) => o.id === hoveredId);
  const description = hoveredOption ? hoveredOption.description : 'Choose what you want to create.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Create New</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-4 gap-3">
            {NEW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isHovered = hoveredId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelect(opt.id);
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
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                      isHovered ? 'bg-primary/20' : 'bg-dark-700'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-center">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-gray-400 text-center min-h-[1.25rem]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_COLLECTIONS = [
  {
    id: '1',
    name: 'API Echo',
    type: 'collection',
    items: [
      {
        id: '1-1',
        name: 'Request Methods',
        type: 'folder',
        items: [
          { id: '1-1-1', name: 'GET Request', method: 'GET', type: 'request', path: '/api/echo' },
          { id: '1-1-2', name: 'POST Raw Body', method: 'POST', type: 'request', path: '/api/echo' },
        ],
      },
      { id: '1-2', name: 'Authentication', type: 'folder', items: [] },
    ],
  },
  {
    id: '2',
    name: 'My API V1',
    type: 'collection',
    items: [
      {
        id: '2-1',
        name: 'Users',
        type: 'folder',
        items: [
          { id: '2-1-1', name: 'List Users', method: 'GET', type: 'request', path: '/api/users' },
          { id: '2-1-2', name: 'Create User', method: 'POST', type: 'request', path: '/api/users' },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'External APIs',
    type: 'collection',
    icon: 'globe',
    items: [
      { id: '3-1', name: 'GitHub Users API', method: 'GET', type: 'request', path: 'https://api.github.com/users' },
      { id: '3-2', name: 'JSONPlaceholder Posts', method: 'GET', type: 'request', path: 'https://jsonplaceholder.typicode.com/posts' },
    ],
  },
];

function ContextMenu({ x, y, type, onClose, onAction }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const collectionOptions = [
    { id: 'add-request', label: 'Add Request', icon: FilePlus },
    { id: 'add-folder', label: 'Add Folder', icon: FolderPlus },
    { id: 'save', label: 'Save', icon: Save },
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'clone', label: 'Clone', icon: Copy },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];
  const itemOptions = [
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'clone', label: 'Clone', icon: Copy },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];

  const options = type === 'collection' ? collectionOptions : itemOptions;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
      style={{ left: x, top: y }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isDelete = opt.id === 'delete';
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              onAction(opt.id);
              onClose();
            }}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
              isDelete
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-gray-300 hover:bg-dark-700 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CollectionsPanel({ onSelectEndpoint }) {
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [expanded, setExpanded] = useState({ '3': true }); // External APIs expanded by default (original design)
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filterTree = (items, q) => {
    if (!q.trim()) return items;
    const lower = q.toLowerCase();
    return items
      .map((item) => {
        if (item.type === 'request') {
          const match = item.name.toLowerCase().includes(lower) || (item.method && item.method.toLowerCase().includes(lower));
          return match ? item : null;
        }
        const filteredChildren = item.items ? filterTree(item.items, q) : [];
        const nameMatch = item.name.toLowerCase().includes(lower);
        if (nameMatch || filteredChildren.length > 0) {
          return { ...item, items: filteredChildren.length ? filteredChildren : item.items };
        }
        return null;
      })
      .filter(Boolean);
  };

  const filteredCollections = filterTree(collections, search);

  const handleContextAction = (actionId) => {
    // Placeholder: in a real app you would mutate collections, show modals, etc.
    if (actionId === 'add-request') return; // TODO: add request
    if (actionId === 'add-folder') return; // TODO: add folder
    if (actionId === 'save') return; // TODO: save
    if (actionId === 'share') return; // TODO: share
    if (actionId === 'rename') return; // TODO: rename
    if (actionId === 'clone') return; // TODO: clone
    if (actionId === 'delete') return; // TODO: delete
  };

  const handleNewSelect = (optionId) => {
    if (optionId === 'http' && onSelectEndpoint) {
      onSelectEndpoint({ method: 'GET', path: '' });
    }
    // Other options (GraphQL, MCP, gRPC, WebSocket, Collection, Environment, Workspace) can be wired later
  };

  return (
    <div className="flex flex-col h-full bg-dark-800/40">
      {/* Postman-style: Workspace name + New + Import */}
      <div className="shrink-0 px-4 py-3 border-b border-dark-700/50">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-200 truncate">ProbeStack Workspace</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-dark-700/80 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 transition-colors"
          >
            New
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-dark-700/80 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 transition-colors"
            title="Import Collections"
          >
            Import
          </button>
        </div>
      </div>

      {/* Search collections */}
      <div className="shrink-0 px-3 py-2 border-b border-dark-700/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search collections"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-900/60 border border-dark-700 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
        {filteredCollections.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">No collections match your search</div>
        ) : (
          filteredCollections.map((col) => (
            <CollectionNode
              key={col.id}
              item={col}
              expanded={expanded}
              onToggle={toggle}
              level={0}
              onSelectEndpoint={onSelectEndpoint}
              onOpenMenu={(e, item, isCollection) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  itemId: item.id,
                  type: isCollection ? 'collection' : 'item',
                });
              }}
            />
          ))
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      <NewModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSelect={handleNewSelect}
      />
    </div>
  );
}

function CollectionNode({ item, expanded, onToggle, level, onSelectEndpoint, onOpenMenu }) {
  const isExpanded = expanded[item.id];
  const hasChildren = item.items && item.items.length > 0;
  const isRequest = item.type === 'request';
  const isCollection = level === 0;

  const handleRowClick = () => {
    if (isRequest && onSelectEndpoint) {
      onSelectEndpoint({ method: item.method, path: item.path || '/' });
    } else if (!isRequest) {
      onToggle(item.id);
    }
  };

  return (
    <div className="select-none">
      <div
        className={clsx(
          'flex items-center gap-1.5 py-1.5 px-2 rounded-md group cursor-pointer hover:bg-dark-700/50',
          level > 0 && 'ml-4'
        )}
        onClick={handleRowClick}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {!isRequest ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            )
          ) : null}
        </div>

        {isRequest ? (
          <span
            className={clsx(
              'text-[10px] font-bold w-9 text-right shrink-0',
              item.method === 'GET' && 'text-green-400',
              item.method === 'POST' && 'text-yellow-400',
              item.method === 'PUT' && 'text-blue-400',
              item.method === 'DELETE' && 'text-red-400',
              'text-purple-400'
            )}
          >
            {item.method}
          </span>
        ) : item.icon === 'globe' ? (
          <Globe
            className="w-4 h-4 shrink-0 text-sky-400/90"
            aria-hidden
          />
        ) : (
          <Folder
            className={clsx(
              'w-4 h-4 shrink-0',
              isCollection ? 'text-amber-500/90' : 'text-gray-500'
            )}
          />
        )}

        <span className={clsx('text-xs truncate flex-1', isRequest ? 'text-gray-300' : 'text-gray-200 font-medium')}>
          {item.name}
        </span>

        <button
          type="button"
          onClick={(e) => onOpenMenu(e, item, isCollection)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition-opacity"
          title="More actions"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {item.items.map((child) => (
            <CollectionNode
              key={child.id}
              item={child}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
              onSelectEndpoint={onSelectEndpoint}
              onOpenMenu={onOpenMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
