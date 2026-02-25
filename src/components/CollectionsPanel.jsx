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
  Plus,
  Check,
  Play,
  Lock,
  Upload,
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

function NewRequestTypeModal({ isOpen, onClose, onSelect }) {
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

function NewCollectionModal({ isOpen, onClose, onCreate, collections, projects, onAddProject }) {
  const [collectionName, setCollectionName] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [isAddingNewWorkspace, setIsAddingNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [validationError, setValidationError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCollectionName('');
      setSelectedWorkspace(projects[0]?.id || '');
      setIsAddingNewWorkspace(false);
      setNewWorkspaceName('');
      setValidationError('');
    }
  }, [isOpen]);

  // Update selected project if projects list changes and current selection is invalid
  useEffect(() => {
    if (isOpen && projects.length > 0) {
      // Only reset if current selection is not in the projects list
      const currentSelectionValid = projects.some((p) => p.id === selectedWorkspace);
      if (!currentSelectionValid) {
        setSelectedWorkspace(projects[0].id);
      }
    }
  }, [projects, isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!collectionName.trim()) {
      setValidationError('Collection name is required');
      return;
    }

    // Check for duplicate collection name
    const existingCollection = collections.find(
      (col) => col.name.toLowerCase() === collectionName.trim().toLowerCase()
    );
    if (existingCollection) {
      setValidationError(`Collection "${collectionName.trim()}" already exists`);
      return;
    }

    const workspace = projects.find((p) => p.id === selectedWorkspace);
    const workspaceId = workspace?.id || projects[0]?.id || 'default';
    const workspaceName = workspace?.name || projects[0]?.name || 'Default Workspace';

    onCreate(collectionName.trim(), workspaceId, workspaceName);
    onClose();
  };

  const handleAddNewWorkspace = () => {
    if (newWorkspaceName.trim()) {
      const newWorkspace = onAddProject(newWorkspaceName.trim());
      setSelectedWorkspace(newWorkspace.id);
      setIsAddingNewWorkspace(false);
      setNewWorkspaceName('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Create Collection</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Workspace Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Workspace
            </label>
            {isAddingNewWorkspace ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewWorkspace();
                    if (e.key === 'Escape') {
                      setIsAddingNewWorkspace(false);
                      setNewWorkspaceName('');
                    }
                  }}
                  placeholder="Enter workspace name"
                  className="flex-1 bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewWorkspace}
                  disabled={!newWorkspaceName.trim()}
                  className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add workspace"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select
                value={selectedWorkspace}
                onChange={(e) => {
                  if (e.target.value === 'add-new') {
                    setIsAddingNewWorkspace(true);
                  } else {
                    setSelectedWorkspace(e.target.value);
                  }
                }}
                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="add-new" className="bg-dark-800 text-primary flex items-center">
                  + Add New Workspace
                </option>
                {projects.map((workspace) => (
                  <option key={workspace.id} value={workspace.id} className="bg-dark-800 text-white">
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Collection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection Name
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => {
                setCollectionName(e.target.value);
                setValidationError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAddingNewWorkspace) handleCreate();
              }}
              placeholder="Enter collection name"
              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {validationError && (
              <p className="mt-2 text-xs text-red-400">{validationError}</p>
            )}
          </div>
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
            onClick={handleCreate}
            disabled={!collectionName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function RenameModal({ isOpen, onClose, currentName, onRename, itemType = 'request' }) {
  const [newName, setNewName] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName || '');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (newName.trim()) {
      onRename(newName.trim());
      onClose();
    }
  };

  const title = itemType === 'folder' ? 'Rename Folder' : 'Rename Request';
  const label = itemType === 'folder' ? 'Folder Name' : 'Request Name';
  const placeholder = itemType === 'folder' ? 'Enter folder name' : 'Enter request name';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">{title}</h3>
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder={placeholder}
            className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            autoFocus
          />
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
            disabled={!newName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function NewFolderModal({ isOpen, onClose, onCreate, parentItem }) {
  const [folderName, setFolderName] = useState('');
  const [validationError, setValidationError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setValidationError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (folderName.trim()) {
      // Check for duplicate folder name in the same parent
      if (parentItem && parentItem.items) {
        const duplicateFolder = parentItem.items.some(
          item => item.type === 'folder' && item.name.toLowerCase() === folderName.trim().toLowerCase()
        );
        
        if (duplicateFolder) {
          setValidationError(`Folder "${folderName.trim()}" already exists in the current folder`);
          return;
        }
      }
      
      onCreate(folderName.trim());
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Create Folder</h3>
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Folder Name
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => {
              setFolderName(e.target.value);
              setValidationError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Enter folder name"
            className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            autoFocus
          />
          {validationError && (
            <p className="mt-2 text-xs text-red-400">{validationError}</p>
          )}
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
            onClick={handleCreate}
            disabled={!folderName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function NewWorkspaceModal({ isOpen, onClose, onCreate, workspaces, onImportCollection }) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [visibility, setVisibility] = useState('private'); // 'private' or 'public'
  const [validationError, setValidationError] = useState('');
  const [importedFile, setImportedFile] = useState(null);
  const [importError, setImportError] = useState('');
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setWorkspaceName('');
      setVisibility('private');
      setValidationError('');
      setImportedFile(null);
      setImportError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!workspaceName.trim()) {
      setValidationError('Workspace name is required');
      return;
    }

    // Check for duplicate workspace name
    const existingWorkspace = workspaces.find(
      (ws) => ws.name.toLowerCase() === workspaceName.trim().toLowerCase()
    );
    if (existingWorkspace) {
      setValidationError(`Workspace "${workspaceName.trim()}" already exists`);
      return;
    }

    onCreate({
      name: workspaceName.trim(),
      visibility,
      importedCollection: importedFile
    });
    onClose();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportError('Please select a valid JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = JSON.parse(event.target.result);
        if (!jsonContent.info || !jsonContent.item) {
          setImportError('Invalid Postman collection format');
          return;
        }
        setImportedFile({
          name: file.name,
          content: jsonContent
        });
        setImportError('');
      } catch (error) {
        setImportError('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearImportedFile = () => {
    setImportedFile(null);
    setImportError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Create Workspace</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Workspace Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Workspace Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => {
                setWorkspaceName(e.target.value);
                setValidationError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="Enter workspace name"
              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              autoFocus
            />
            {validationError && (
              <p className="mt-2 text-xs text-red-400">{validationError}</p>
            )}
          </div>

          {/* Visibility Radio Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Visibility <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="w-4 h-4 text-primary bg-dark-900 border-dark-600 focus:ring-primary focus:ring-2"
                />
                <span className="text-sm text-gray-300">Private</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  className="w-4 h-4 text-primary bg-dark-900 border-dark-600 focus:ring-primary focus:ring-2"
                />
                <span className="text-sm text-gray-300">Public</span>
              </label>
            </div>
          </div>

          {/* Import Collection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Import Collection <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {!importedFile ? (
              <button
                type="button"
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-dark-600 bg-dark-900/40 text-gray-400 hover:text-gray-300 hover:border-primary/50 hover:bg-dark-900/60 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Import JSON Collection</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                <Folder className="w-4 h-4 text-primary" />
                <span className="text-sm text-gray-300 flex-1 truncate">{importedFile.name}</span>
                <button
                  type="button"
                  onClick={clearImportedFile}
                  className="p-1 rounded hover:bg-primary/20 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {importError && (
              <p className="mt-2 text-xs text-red-400">{importError}</p>
            )}
          </div>
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
            onClick={handleCreate}
            disabled={!workspaceName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
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
    { id: 'run-collection', label: 'Run Collection', icon: Play },
    { id: 'add-request', label: 'Add Request', icon: FilePlus },
    { id: 'add-folder', label: 'Add Folder', icon: FolderPlus },
    { id: 'save', label: 'Save', icon: Save },
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'clone', label: 'Clone', icon: Copy },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];
  const folderOptions = [
    { id: 'add-request', label: 'Add Request', icon: FilePlus },
    { id: 'add-folder', label: 'Add Folder', icon: FolderPlus },
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'clone', label: 'Clone', icon: Copy },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];
  const requestOptions = [
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'clone', label: 'Clone', icon: Copy },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];

  let options = requestOptions;
  if (type === 'collection') options = collectionOptions;
  else if (type === 'folder') options = folderOptions;

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

const STORAGE_KEY = 'probestack_collections';

const sortItems = (items) => {
  if (!items || !Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    const aIsFolder = a.type === 'folder';
    const bIsFolder = b.type === 'folder';
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return 0;
  });
};

export default function CollectionsPanel({ onSelectEndpoint, existingTabRequests = [], collections: externalCollections, projects = [], onAddProject, onCollectionsChange, onRunCollection }) {
  // Use externalCollections directly from App.jsx - no local state management
  const collections = externalCollections || DEFAULT_COLLECTIONS;
  const [expanded, setExpanded] = useState({ '3': true }); // External APIs expanded by default (original design)
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showRequestTypeModal, setShowRequestTypeModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [selectedItemForRename, setSelectedItemForRename] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [untitledRequestCounter, setUntitledRequestCounter] = useState(0);
  const fileInputRef = useRef(null);

  // Helper to update collections - notifies parent via callback
  const setCollections = (newCollectionsOrUpdater) => {
    if (onCollectionsChange) {
      const newCollections = typeof newCollectionsOrUpdater === 'function' 
        ? newCollectionsOrUpdater(collections) 
        : newCollectionsOrUpdater;
      onCollectionsChange(newCollections);
    }
  };

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

  const findRootCollection = (itemId) => {
    for (const collection of collections) {
      if (collection.id === itemId) return collection;
      const found = findItemById(collection.items || [], itemId);
      if (found) return collection;
    }
    return null;
  };

  // Get all request names in a collection (recursively)
  const getAllRequestNamesInCollection = (collectionId) => {
    const collection = findItemById(collections, collectionId);
    if (!collection) return [];
    
    const names = [];
    const traverse = (items) => {
      if (!items) return;
      items.forEach(item => {
        if (item.type === 'request') {
          names.push(item.name.toLowerCase());
        } else if (item.items) {
          traverse(item.items);
        }
      });
    };
    
    traverse(collection.items || []);
    return names;
  };

  // Generate unique request name with auto-increment
  // Checks BOTH collection requests AND tab requests for unified validation
  const generateUniqueRequestName = (collectionId, baseName = 'Untitled Request') => {
    // Get names from collection
    const collectionNames = getAllRequestNamesInCollection(collectionId);
    
    // Get names from existing tabs
    const tabNames = existingTabRequests.map(req => req.name?.toLowerCase() || '');
    
    // Combine all existing names
    const existingNames = [...collectionNames, ...tabNames];
    
    // If base name doesn't exist, return it
    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }
    
    // Find the highest number suffix
    let maxNumber = 0;
    const baseNameLower = baseName.toLowerCase();
    existingNames.forEach(name => {
      if (name === baseNameLower) {
        maxNumber = Math.max(maxNumber, 1);
      } else if (name.startsWith(baseNameLower + ' ')) {
        const suffix = name.substring(baseNameLower.length + 1);
        const num = parseInt(suffix, 10);
        if (!isNaN(num)) {
          maxNumber = Math.max(maxNumber, num);
        }
      }
    });
    
    // Return next number
    return `${baseName} ${maxNumber + 1}`;
  };

  const deepCloneItem = (item, collectionId = null) => {
    let clonedName = item.name;
    
    // For requests, ensure unique name in collection
    if (item.type === 'request' && collectionId) {
      const existingNames = getAllRequestNamesInCollection(collectionId);
      let suffix = 1;
      let testName = `${item.name} Copy`;
      
      while (existingNames.includes(testName.toLowerCase())) {
        suffix++;
        testName = `${item.name} Copy ${suffix}`;
      }
      clonedName = testName;
    } else if (item.type === 'folder') {
      clonedName = `${item.name} Copy`;
    } else {
      clonedName = `${item.name} Clone`;
    }
    
    const cloned = {
      ...item,
      id: `${item.id}-clone-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: clonedName
    };
    if (item.items && Array.isArray(item.items)) {
      cloned.items = item.items.map(child => deepCloneItem(child, collectionId));
    }
    return cloned;
  };

  const handleContextAction = (actionId) => {
    if (!contextMenu) return;

    const item = findItemById(collections, contextMenu.itemId);
    if (!item) return;

    if (actionId === 'run-collection') {
      if (item && item.type === 'collection' && onRunCollection) {
        onRunCollection(item);
      }
    } else if (actionId === 'add-request') {
      setSelectedCollectionId(contextMenu.itemId);
      setShowRequestTypeModal(true);
    } else if (actionId === 'add-folder') {
      setSelectedCollectionId(contextMenu.itemId);
      setShowNewFolderModal(true);
    } else if (actionId === 'rename') {
      setSelectedItemForRename(item);
      setShowRenameModal(true);
    } else if (actionId === 'clone') {
      const parent = findParentCollection(collections, item.id);
      const rootCollection = findRootCollection(item.id);
      const collectionId = rootCollection ? rootCollection.id : null;
      
      if (parent) {
        // Cloning a folder or request (has a parent)
        const clonedItem = deepCloneItem(item, collectionId);
        const newCollections = [...collections];
        const parentInNew = findItemById(newCollections, parent.id);
        if (parentInNew && parentInNew.items) {
          parentInNew.items.push(clonedItem);
          setCollections(newCollections);
        }
      } else {
        // Cloning a collection (no parent)
        const clonedCollection = deepCloneItem(item, collectionId);
        setCollections([...collections, clonedCollection]);
      }
    } else if (actionId === 'delete') {
      const deleteItem = (items, id) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === id) {
            items.splice(i, 1);
            return true;
          }
          if (items[i].items && deleteItem(items[i].items, id)) {
            return true;
          }
        }
        return false;
      };
      const newCollections = [...collections];
      deleteItem(newCollections, item.id);
      setCollections(newCollections);
    }
  };

  const handleRequestTypeSelect = (optionId) => {
    if (optionId === 'http') {
      if (selectedCollectionId) {
        // Find the root collection for this item
        const rootCollection = findRootCollection(selectedCollectionId);
        const collectionId = rootCollection ? rootCollection.id : selectedCollectionId;
        
        // Generate unique name
        const uniqueName = generateUniqueRequestName(collectionId);
        
        const newRequest = {
          id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: uniqueName,
          method: 'GET',
          type: 'request',
          path: ''
        };
        const newCollections = [...collections];
        const collection = findItemById(newCollections, selectedCollectionId);
        if (collection && collection.items) {
          collection.items.push(newRequest);
          setCollections(newCollections);
          setExpanded((prev) => ({ ...prev, [selectedCollectionId]: true }));
        }
      }
      if (onSelectEndpoint) {
        onSelectEndpoint({ method: 'GET', path: '' });
      }
    }
  };

  const handleCreateCollection = (name, workspaceId, workspaceName) => {
    const newCollection = {
      id: `col-${Date.now()}`,
      name: name,
      type: 'collection',
      project: workspaceId,
      projectName: workspaceName,
      items: []
    };
    setCollections([...collections, newCollection]);
  };

  const handleCreateFolder = (name) => {
    if (!selectedCollectionId) return;
    const newFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: name,
      type: 'folder',
      items: []
    };
    const newCollections = [...collections];
    const parent = findItemById(newCollections, selectedCollectionId);
    if (parent && parent.items) {
      parent.items.push(newFolder);
      setCollections(newCollections);
      setExpanded((prev) => ({ ...prev, [selectedCollectionId]: true }));
    }
  };

  const handleRenameItem = (newName) => {
    if (!selectedItemForRename) return;
    const newCollections = [...collections];
    const item = findItemById(newCollections, selectedItemForRename.id);
    if (item) {
      item.name = newName;
      setCollections(newCollections);
    }
  };

  const handleDragStart = (item) => {
    // Only allow dragging folders and requests, not collections
    if (item.type === 'folder' || item.type === 'request') {
      setDraggedItem(item);
    }
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;
    
    // Only allow dropping on collections and folders
    if (item.type === 'collection' || item.type === 'folder') {
      setDragOverItem(item.id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || !targetItem) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Prevent dropping on self
    if (draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Only allow dropping on collections and folders
    if (targetItem.type !== 'collection' && targetItem.type !== 'folder') {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Find root collections for both dragged and target items
    const draggedRootCollection = findRootCollection(draggedItem.id);
    const targetRootCollection = findRootCollection(targetItem.id);

    // Prevent dropping within the same collection EXCEPT when:
    // - Dragging a request into a folder (allowed for organization)
    // - Dragging a folder into another folder (allowed for nested subfolders)
    const isSameCollection = draggedRootCollection && targetRootCollection && draggedRootCollection.id === targetRootCollection.id;
    const isRequestToFolderInSameCollection = draggedItem.type === 'request' && targetItem.type === 'folder' && isSameCollection;
    const isFolderToFolderInSameCollection = draggedItem.type === 'folder' && targetItem.type === 'folder' && isSameCollection;
    
    if (isSameCollection && !isRequestToFolderInSameCollection && !isFolderToFolderInSameCollection) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Check if target is a descendant of dragged item (prevent circular reference)
    const isDescendant = (parent, childId) => {
      if (!parent.items) return false;
      for (const item of parent.items) {
        if (item.id === childId) return true;
        if (isDescendant(item, childId)) return true;
      }
      return false;
    };

    if (isDescendant(draggedItem, targetItem.id)) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Clone the dragged item with unique naming
    const targetRootCollectionId = targetRootCollection ? targetRootCollection.id : targetItem.id;
    const clonedItem = deepCloneItem(draggedItem, targetRootCollectionId);
    
    // Add to target
    const newCollections = [...collections];
    const target = findItemById(newCollections, targetItem.id);
    
    if (target && target.items) {
      target.items.push(clonedItem);
      setCollections(newCollections);
      // Auto-expand the target to show the new item
      setExpanded((prev) => ({ ...prev, [targetItem.id]: true }));
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Parse Postman collection JSON to internal format
  const parsePostmanCollection = (postmanJson) => {
    const parseUrl = (urlObj) => {
      if (typeof urlObj === 'string') return urlObj;
      if (!urlObj) return '';
      
      const protocol = urlObj.protocol || 'http';
      const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : (urlObj.host || 'localhost');
      const port = urlObj.port ? `:${urlObj.port}` : '';
      const path = Array.isArray(urlObj.path) ? `/${urlObj.path.join('/')}` : (urlObj.path || '');
      const query = urlObj.query && urlObj.query.length > 0 
        ? `?${urlObj.query.map(q => `${q.key}=${q.value || ''}`).join('&')}` 
        : '';
      
      return `${protocol}://${host}${port}${path}${query}`;
    };

    const parseHeaders = (headers) => {
      if (!headers || !Array.isArray(headers)) return [];
      return headers.map(h => ({
        key: h.key || '',
        value: h.value || '',
        enabled: h.disabled !== true
      }));
    };

    const parseBody = (body) => {
      if (!body) return { type: 'none', data: '' };
      
      if (body.mode === 'raw') {
        return { type: 'raw', data: body.raw || '' };
      } else if (body.mode === 'formdata') {
        return { 
          type: 'form-data', 
          data: body.formdata || [] 
        };
      } else if (body.mode === 'urlencoded') {
        return { 
          type: 'x-www-form-urlencoded', 
          data: body.urlencoded || [] 
        };
      }
      return { type: 'none', data: '' };
    };

    const parseAuth = (auth) => {
      if (!auth || !auth.type) return { type: 'none' };
      
      if (auth.type === 'bearer') {
        const token = auth.bearer?.find(b => b.key === 'token')?.value || '';
        return { type: 'bearer', token };
      } else if (auth.type === 'basic') {
        const username = auth.basic?.find(b => b.key === 'username')?.value || '';
        const password = auth.basic?.find(b => b.key === 'password')?.value || '';
        return { type: 'basic', username, password };
      } else if (auth.type === 'apikey') {
        const key = auth.apikey?.find(a => a.key === 'key')?.value || '';
        const value = auth.apikey?.find(a => a.key === 'value')?.value || '';
        const addTo = auth.apikey?.find(a => a.key === 'in')?.value || 'header';
        return { type: 'apikey', key, value, in: addTo };
      }
      return { type: 'none' };
    };

    const parseItem = (item, depth = 0) => {
      // If item has 'request' property, it's a request
      if (item.request) {
        const request = item.request;
        return {
          id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: item.name || 'Untitled Request',
          type: 'request',
          method: (request.method || 'GET').toUpperCase(),
          path: parseUrl(request.url),
          headers: parseHeaders(request.header),
          body: parseBody(request.body),
          auth: parseAuth(request.auth),
          params: request.url?.query || [],
        };
      }
      
      // If item has 'item' array, it's a folder
      if (item.item && Array.isArray(item.item)) {
        return {
          id: `imported-folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: item.name || 'Untitled Folder',
          type: 'folder',
          icon: 'folder',
          items: item.item.map(subItem => parseItem(subItem, depth + 1))
        };
      }
      
      return null;
    };

    // Parse the collection
    const collectionName = postmanJson.info?.name || 'Imported Collection';
    const items = postmanJson.item ? postmanJson.item.map(item => parseItem(item)) : [];
    
    return {
      id: `imported-collection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: collectionName,
      type: 'collection',
      icon: 'folder',
      project: 'auth-security',
      projectName: 'Auth and Security',
      items: items.filter(Boolean)
    };
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target.result);
        
        // Validate it's a Postman collection
        if (!jsonContent.info || !jsonContent.item) {
          alert('Invalid Postman collection format');
          return;
        }

        // Parse and add to collections
        const importedCollection = parsePostmanCollection(jsonContent);
        setCollections(prev => [...prev, importedCollection]);
        
        // Auto-expand the imported collection
        setExpanded(prev => ({ ...prev, [importedCollection.id]: true }));
        
        // Reset file input
        event.target.value = '';
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Failed to parse JSON file. Please ensure it\'s a valid Postman collection.');
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-dark-800/40">
      {/* Postman-style: New + Import */}
      <div className="shrink-0 px-4 py-3 border-b border-dark-700/50">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNewWorkspaceModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-dark-700/80 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 transition-colors"
          >
            Create Workspace
          </button>
          <button
            type="button"
            onClick={() => setShowNewCollectionModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-dark-700/80 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 transition-colors"
          >
            Create Collection
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-dark-700/80 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 transition-colors"
            title="Import Collections"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
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

      {/* Tree - Grouped by Workspaces */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
        {filteredCollections.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">No collections match your search</div>
        ) : (
          (() => {
            // Group collections by workspace
            const workspaceGroups = {};
            filteredCollections.forEach((col) => {
              const workspaceId = col.project || 'default';
              const workspaceName = col.projectName || 'Default Workspace';
              if (!workspaceGroups[workspaceId]) {
                workspaceGroups[workspaceId] = {
                  id: workspaceId,
                  name: workspaceName,
                  collections: []
                };
              }
              workspaceGroups[workspaceId].collections.push(col);
            });

            // Create a lookup for workspace visibility from projects
            const workspaceVisibilityMap = {};
            projects.forEach(p => {
              workspaceVisibilityMap[p.id] = p.visibility || 'private';
            });

            return Object.values(workspaceGroups).map((workspace) => (
              <div key={workspace.id} className="mb-4">
                {/* Workspace Header */}
                <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                  <div className="flex items-center gap-1.5 flex-1">
                    <Folder className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      {workspace.name}
                    </span>
                    {(workspace.visibility === 'private' || workspaceVisibilityMap[workspace.id] === 'private') && (
                      <Lock className="w-3 h-3 text-gray-500" title="Private Workspace" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {workspace.collections.length}
                  </span>
                </div>
                
                {/* Collections under this workspace */}
                <div className="ml-2">
                  {workspace.collections.map((col) => (
                    <CollectionNode
                      key={col.id}
                      item={col}
                      expanded={expanded}
                      onToggle={toggle}
                      level={0}
                      onSelectEndpoint={onSelectEndpoint}
                      onOpenMenu={(e, item, itemType) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          itemId: item.id,
                          type: itemType,
                        });
                      }}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      dragOverItem={dragOverItem}
                    />
                  ))}
                </div>
              </div>
            ));
          })()
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

      <NewWorkspaceModal
        isOpen={showNewWorkspaceModal}
        onClose={() => setShowNewWorkspaceModal(false)}
        onCreate={onAddProject}
        workspaces={projects}
      />

      <NewCollectionModal
        isOpen={showNewCollectionModal}
        onClose={() => setShowNewCollectionModal(false)}
        onCreate={handleCreateCollection}
        collections={collections}
        projects={projects}
        onAddProject={onAddProject}
      />

      <NewRequestTypeModal
        isOpen={showRequestTypeModal}
        onClose={() => {
          setShowRequestTypeModal(false);
          setSelectedCollectionId(null);
        }}
        onSelect={handleRequestTypeSelect}
      />

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => {
          setShowNewFolderModal(false);
          setSelectedCollectionId(null);
        }}
        onCreate={handleCreateFolder}
        parentItem={selectedCollectionId ? findItemById(collections, selectedCollectionId) : null}
      />

      <RenameModal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setSelectedItemForRename(null);
        }}
        currentName={selectedItemForRename?.name || ''}
        itemType={selectedItemForRename?.type || 'request'}
        onRename={handleRenameItem}
      />
    </div>
  );
}

function CollectionNode({ item, expanded, onToggle, level, onSelectEndpoint, onOpenMenu, parentType, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, dragOverItem }) {
  const isExpanded = expanded[item.id];
  const hasChildren = item.items && item.items.length > 0;
  const isRequest = item.type === 'request';
  const isFolder = item.type === 'folder';
  const isCollection = level === 0;
  const isDragOver = dragOverItem === item.id;
  const canDrag = isRequest || isFolder;
  const canDrop = isCollection || isFolder;

  const handleRowClick = () => {
    if (isRequest && onSelectEndpoint) {
      onSelectEndpoint({ method: item.method, path: item.path || '/', name: item.name });
    } else if (!isRequest) {
      onToggle(item.id);
    }
  };

  // Indentation: 16px per nesting level (industry standard like VS Code/Postman)
  // Level 0 (collection): 0px, Level 1: 16px, Level 2: 32px, etc.
  const indentPx = level * 16;

  return (
    <div className="select-none">
      <div
        draggable={canDrag}
        onDragStart={(e) => {
          if (canDrag) {
            e.stopPropagation();
            onDragStart(item);
          }
        }}
        onDragOver={(e) => {
          if (canDrop) {
            onDragOver(e, item);
          }
        }}
        onDragLeave={(e) => {
          if (canDrop) {
            onDragLeave(e);
          }
        }}
        onDrop={(e) => {
          if (canDrop) {
            onDrop(e, item);
          }
        }}
        onDragEnd={onDragEnd}
        style={{ paddingLeft: indentPx }}
        className={clsx(
          'flex items-center gap-1.5 py-1.5 pr-2 rounded-md group cursor-pointer hover:bg-dark-700/50',
          isDragOver && canDrop && 'bg-primary/20 border-2 border-primary/50',
          canDrag && 'cursor-move'
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
          onClick={(e) => {
            const itemType = isCollection ? 'collection' : (isFolder ? 'folder' : 'request');
            onOpenMenu(e, item, itemType);
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition-opacity"
          title="More actions"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {sortItems(item.items).map((child) => (
            <CollectionNode
              key={child.id}
              item={child}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
              onSelectEndpoint={onSelectEndpoint}
              onOpenMenu={onOpenMenu}
              parentType={item.type}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              dragOverItem={dragOverItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
