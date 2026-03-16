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
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  createCollection,
  updateCollection,
  deleteCollection,
  createFolder,
  fetchFolders,
  updateFolder,
  deleteFolder,
  forkCollection,
  cloneFolder,
  normalizeFolder,
  normalizeCollection
} from '../services/collectionService';
import {
  createRequest,
  fetchRequests,
  updateRequest,
  normalizeRequest,
  cloneRequest,
  moveRequest,
  deleteRequest,
} from '../services/requestService';
import {
  updateWorkspace,
  deleteWorkspace,
} from '../services/workspaceService';

// ----------------------------------------------------------------------
// MODAL COMPONENTS
// ----------------------------------------------------------------------

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

let title, label, placeholder;
if (itemType === 'folder') {
  title = 'Rename Folder';
  label = 'Folder Name';
  placeholder = 'Enter folder name';
} else if (itemType === 'workspace') {
  title = 'Rename Workspace';
  label = 'Workspace Name';
  placeholder = 'Enter workspace name';
} else if (itemType === 'collection') {
  title = 'Rename Collection';
  label = 'Collection Name';
  placeholder = 'Enter collection name';
} else {
  title = 'Rename Request';
  label = 'Request Name';
  placeholder = 'Enter request name';
}

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

function ImportWorkspaceModal({ isOpen, onClose, onImport, projects, onAddProject, fileName }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [isAddingNewWorkspace, setIsAddingNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
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
      setSelectedWorkspace(projects[0]?.id || '');
      setIsAddingNewWorkspace(false);
      setNewWorkspaceName('');
    }
  }, [isOpen, projects]);

  if (!isOpen) return null;

  const handleImport = () => {
    const workspace = projects.find(p => p.id === selectedWorkspace);
    if (!workspace) return;
    onImport(workspace.id, workspace.name);
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
          <h3 className="text-base font-semibold text-white">Import Collection</h3>
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
          <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-700/50 border border-dark-600">
            <Upload className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-300 truncate">{fileName || 'No file selected'}</span>
          </div>
          <p className="text-sm text-gray-400">Select a workspace to import the collection into:</p>
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
            onClick={handleImport}
            disabled={!selectedWorkspace}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CONTEXT MENUS
// ----------------------------------------------------------------------

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

function WorkspaceContextMenu({ x, y, onClose, onAction }) {
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

  const options = [
    { id: 'rename', label: 'Rename', icon: Edit3 },
    { id: 'view-details', label: 'View Details', icon: FileText },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ];

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

// ----------------------------------------------------------------------
// DELETE CONFIRMATION MODAL (for workspace)
// ----------------------------------------------------------------------

function DeleteWorkspaceConfirmModal({ isOpen, onClose, workspaceName, onConfirm }) {
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
          <h3 className="text-base font-semibold text-white">Delete Workspace</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete workspace <span className="font-semibold text-white">"{workspaceName}"</span>?
            This action cannot be undone.
          </p>
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
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// VIEW DETAILS MODAL (simple version)
// ----------------------------------------------------------------------

function WorkspaceDetailsModal({ isOpen, onClose, workspace, collectionsCount }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !workspace) return null;

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
          <h3 className="text-base font-semibold text-white">Workspace Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <p className="text-xs text-gray-500">Name</p>
            <p className="text-sm text-white font-medium">{workspace.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ID</p>
            <p className="text-xs text-gray-400 font-mono">{workspace.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Visibility</p>
            <p className="text-sm text-white capitalize">{workspace.visibility}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Collections</p>
            <p className="text-sm text-white">{collectionsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SORT ITEMS HELPER
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
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function CollectionsPanel({
  onSelectEndpoint,
  existingTabRequests = [],
  collections: externalCollections,
  projects = [],
  onAddProject,
  onCollectionsChange,
  onRunCollection,
  onOpenWorkspaceDetails,
})
 {
  const collections = externalCollections;
  const [expanded, setExpanded] = useState({ '3': true });
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
  const fileInputRef = useRef(null);
    const [showImportWorkspaceModal, setShowImportWorkspaceModal] = useState(false);
  const [importFileData, setImportFileData] = useState(null);

  // Workspace actions state
  const [workspaceMenu, setWorkspaceMenu] = useState(null);
  const [workspaceToRename, setWorkspaceToRename] = useState(null);
  const [showRenameWorkspaceModal, setShowRenameWorkspaceModal] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] = useState(false);
  const [workspaceToView, setWorkspaceToView] = useState(null);
  const [showWorkspaceDetailsModal, setShowWorkspaceDetailsModal] = useState(false);

  // Helper to update collections
  const setCollections = (newCollectionsOrUpdater) => {
    if (onCollectionsChange) {
      const newCollections = typeof newCollectionsOrUpdater === 'function'
        ? newCollectionsOrUpdater(collections)
        : newCollectionsOrUpdater;
      onCollectionsChange(newCollections);
    }
  };

  // Tree helpers
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

  // Request name helpers
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

  const generateUniqueRequestName = (collectionId, baseName = 'Untitled Request') => {
    const collectionNames = getAllRequestNamesInCollection(collectionId);
    const tabNames = existingTabRequests.map(req => req.name?.toLowerCase() || '');
    const existingNames = [...collectionNames, ...tabNames];
    if (!existingNames.includes(baseName.toLowerCase())) return baseName;
    let maxNumber = 0;
    const baseNameLower = baseName.toLowerCase();
    existingNames.forEach(name => {
      if (name === baseNameLower) {
        maxNumber = Math.max(maxNumber, 1);
      } else if (name.startsWith(baseNameLower + ' ')) {
        const suffix = name.substring(baseNameLower.length + 1);
        const num = parseInt(suffix, 10);
        if (!isNaN(num)) maxNumber = Math.max(maxNumber, num);
      }
    });
    return `${baseName} ${maxNumber + 1}`;
  };

  const deepCloneItem = (item, collectionId = null) => {
    let clonedName = item.name;
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

  // Handlers for collection/folder/request actions
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
    if (item.type === 'collection') {
      const workspaceId = item.project || 'default';
      const cloneCollectionAndFetch = async () => {
        const res = await forkCollection(item.id, workspaceId);
        const raw = res.data;
        const workspaceArg = {
          id: workspaceId,
          name: item.projectName || "Default Workspace"
        };
        const newCol = normalizeCollection(raw, workspaceArg);

        // 1. Fetch folders and requests for the new collection
        const foldersRes = await fetchFolders(newCol.id);
        const folders = foldersRes.data.map(normalizeFolder);
        const requestsRes = await fetchRequests({ collectionId: newCol.id });
        const requests = requestsRes.data.map(normalizeRequest);

        // 2. Build folder hierarchy
        const folderMap = new Map();
        folders.forEach(f => folderMap.set(f.id, f));

        const rootFolders = [];
        folders.forEach(f => {
          if (f.parentFolderId) {
            const parent = folderMap.get(f.parentFolderId);
            if (parent) {
              if (!parent.items) parent.items = [];
              parent.items.push(f);
            } else {
              rootFolders.push(f);
            }
          } else {
            rootFolders.push(f);
          }
        });

        const items = [...rootFolders];

        // 3. Place requests under their parent folders
        requests.forEach(req => {
          if (req.folderId) {
            const parent = folderMap.get(req.folderId);
            if (parent) {
              if (!parent.items) parent.items = [];
              parent.items.push(req);
            } else {
              items.push(req);
            }
          } else {
            items.push(req);
          }
        });

        // 4. Recursive sorting
        const sortItems = (items) => {
          if (!items) return;
          items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return (a.orderIndex || 0) - (b.orderIndex || 0);
          });
          items.forEach(item => {
            if (item.items) sortItems(item.items);
          });
        };
        sortItems(items);

        newCol.items = items;
        return newCol;
      };

      toast.promise(
        cloneCollectionAndFetch(),
        {
          loading: `Cloning "${item.name}"...`,
          success: (newCol) => {
            setCollections(prev => [...prev, newCol]);
            return `Cloned as "${newCol.name}"`;
          },
          error: (err) => err.response?.data?.message || 'Failed to clone collection'
        }
      );
    } else if (item.type === 'folder') {
      const cloneFolderAndFetch = async () => {
        const res = await cloneFolder(item.id);
        const newFolder = normalizeFolder(res.data);
        const collectionId = item.collectionId;

        // Fetch all folders and requests in the collection
        const foldersRes = await fetchFolders(collectionId);
        const allFolders = foldersRes.data.map(normalizeFolder);
        const requestsRes = await fetchRequests({ collectionId });
        const allRequests = requestsRes.data.map(normalizeRequest);

        // Build map of all folders
        const folderMap = new Map();
        allFolders.forEach(f => folderMap.set(f.id, f));

        // For the new folder, we need to extract its subtree.
        // Since all folders are already in the map, we can walk down from newFolder.id.
        const buildSubtree = (folderId) => {
          const folder = folderMap.get(folderId);
          if (!folder) return null;
          const children = allFolders.filter(f => f.parentFolderId === folderId);
          folder.items = children.map(child => buildSubtree(child.id)).filter(Boolean);
          // Add requests belonging to this folder
          const folderRequests = allRequests.filter(req => req.folderId === folderId);
          folder.items.push(...folderRequests);
          // Sort items
          const sortItems = (items) => {
            if (!items) return;
            items.sort((a, b) => {
              if (a.type === 'folder' && b.type !== 'folder') return -1;
              if (a.type !== 'folder' && b.type === 'folder') return 1;
              return (a.orderIndex || 0) - (b.orderIndex || 0);
            });
            items.forEach(item => {
              if (item.items) sortItems(item.items);
            });
          };
          sortItems(folder.items);
          return folder;
        };

        const populatedFolder = buildSubtree(newFolder.id);
        return { newFolder: populatedFolder, parentId: item.parentFolderId };
      };

      toast.promise(
        cloneFolderAndFetch(),
        {
          loading: `Cloning folder "${item.name}"...`,
          success: ({ newFolder, parentId }) => {
            setCollections(prev => {
              const updated = structuredClone(prev);
              const parentNode = parentId ? findItemById(updated, parentId) : null;
              if (parentNode && parentNode.items) {
                parentNode.items.push(newFolder);
                // Re-sort the parent's items
                const sortItems = (items) => {
                  if (!items) return;
                  items.sort((a, b) => {
                    if (a.type === 'folder' && b.type !== 'folder') return -1;
                    if (a.type !== 'folder' && b.type === 'folder') return 1;
                    return (a.orderIndex || 0) - (b.orderIndex || 0);
                  });
                };
                sortItems(parentNode.items);
              } else {
                // If no parent (should not happen for a folder), fallback to pushing at collection root
                const collection = findItemById(updated, item.collectionId);
                if (collection && collection.items) {
                  collection.items.push(newFolder);
                  sortItems(collection.items);
                }
              }
              return updated;
            });
            return `Cloned as "${newFolder.name}"`;
          },
          error: (err) => err.response?.data?.message || 'Failed to clone folder'
        }
      );
    } else if (item.type === 'request') {
      toast.promise(
        cloneRequest(item.id),
        {
          loading: `Cloning request "${item.name}"...`,
          success: (res) => {
            const newRequest = normalizeRequest(res.data);
            const parent = findParentCollection(collections, item.id);
            if (parent) {
              setCollections(prev => {
                const updated = structuredClone(prev);
                const parentNode = findItemById(updated, parent.id);
                if (parentNode && parentNode.items) {
                  parentNode.items.push(newRequest);
                  parentNode.items = sortItems(parentNode.items);
                }
                return updated;
              });
            }
            return `Cloned as "${newRequest.name}"`;
          },
          error: (err) => err.response?.data?.message || 'Failed to clone request'
        }
      );
    }
  } else if (actionId === 'delete') {
    const removeItemById = (items, id) => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          items.splice(i, 1);
          return true;
        }
        if (items[i].items && removeItemById(items[i].items, id)) {
          return true;
        }
      }
      return false;
    };
    const newCollections = [...collections];
    removeItemById(newCollections, item.id);
    setCollections(newCollections);

    const userId = localStorage.getItem('probestack_user_id');
    if (!userId) return;

    let apiCall;
    if (item.type === 'collection') apiCall = deleteCollection(item.id);
    else if (item.type === 'folder') apiCall = deleteFolder(item.id);
    else if (item.type === 'request') apiCall = deleteRequest(item.id);
    else return;

    apiCall.catch((err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete item');
    });
  }
};

  const handleRequestTypeSelect = async (optionId) => {
    if (optionId !== 'http') return;
    if (!selectedCollectionId) {
      toast.warning('Please select a collection or folder first');
      return;
    }

    const rootCollection = findRootCollection(selectedCollectionId);
    const collectionId = rootCollection ? rootCollection.id : selectedCollectionId;
    const folderId = selectedCollectionId !== collectionId ? selectedCollectionId : null;

    const uniqueName = generateUniqueRequestName(collectionId);

    const payload = {
      name: uniqueName,
      method: 'GET',
      url: '',
      collection_id: collectionId,
      folder_id: folderId,
      headers: [],
      query_params: [],
      body_type: 'none',
      auth_type: 'none',
    };

    try {
      const response = await createRequest(payload);
      const savedRequest = normalizeRequest(response.data);

      if (onSelectEndpoint) {
        onSelectEndpoint({
          method: savedRequest.method || 'GET',
          path: savedRequest.url || savedRequest.path || '',
          name: savedRequest.name || uniqueName,
        });
      }

      setCollections((prev) => {
        const updated = structuredClone(prev);
        const target = findItemById(updated, selectedCollectionId);
        if (target?.items) {
          target.items.push(savedRequest);
          target.items = sortItems(target.items);
        }
        return updated;
      });

      toast.success('Request created & opened in new tab');
    } catch (error) {
      console.error('Failed to create request:', error);
      toast.error('Failed to create request');
    }
  };

const handleCreateCollection = async (name, workspaceId, workspaceName) => {
  const tempId = `col-${Date.now()}`;
  const newCollection = {
    id: tempId,
    _key: tempId,
    name,
    type: 'collection',
    project: workspaceId,
    projectName: workspaceName,
    items: [],
    _tempWorkspaceId: workspaceId,
  };
  setCollections([...collections, newCollection]);

  try {
    const res = await createCollection(workspaceId, { name });
    const raw = res.data;
    const realId = raw.collectionId || raw.id;
    if (realId) {
      // Normalize the real collection using the same helper
      const workspaceArg = { id: workspaceId, name: workspaceName };
      const realCol = normalizeCollection(raw, workspaceArg);
      // Replace the temporary with the real one (remove temp if still present)
      setCollections(prev => {
        const filtered = prev.filter(col => col.id !== tempId);
        return [...filtered, realCol];
      });
      toast.success('Collection created');
    }
  } catch (err) {
    // If creation fails, remove the temporary collection
    setCollections(prev => prev.filter(col => col.id !== tempId));
    toast.error(err.response?.data?.message || 'Failed to create collection');
  }
};

  const handleCreateFolder = async (name) => {
    if (!selectedCollectionId) {
      toast.error("Please select a collection or folder first");
      return;
    }

    const rootCollection = findRootCollection(selectedCollectionId);
    const collectionId = rootCollection ? rootCollection.id : selectedCollectionId;
    let parentFolderId = null;

    if (selectedCollectionId !== collectionId) {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCollectionId);
      if (isValidUUID) {
        parentFolderId = selectedCollectionId;
      } else {
        console.warn("Selected parent is not a valid UUID — creating as root");
        toast.info("Creating as root folder (unexpected parent ID)");
      }
    }

    const payload = { name };
    if (parentFolderId) {
      payload.parentFolderId = parentFolderId;
    }

    try {
      const res = await createFolder(collectionId, payload);
      const newFolderFromBackend = normalizeFolder(res.data);

      setCollections((prev) => {
        const updated = structuredClone(prev);
        const targetParent = findItemById(updated, selectedCollectionId);
        if (targetParent?.items) {
          targetParent.items.push(newFolderFromBackend);
          targetParent.items = sortItems(targetParent.items);
        } else {
          const collection = findItemById(updated, collectionId);
          if (collection?.items) {
            collection.items.push(newFolderFromBackend);
            collection.items = sortItems(collection.items);
          }
        }
        return updated;
      });

      toast.success("Folder created successfully");
    } catch (err) {
      console.error("Folder creation failed:", err);
      toast.error(err.response?.data?.message || "Failed to create folder");
    }
  };

  const handleRenameItem = (newName) => {
    if (!selectedItemForRename) return;

    const newCollections = [...collections];
    const item = findItemById(newCollections, selectedItemForRename.id);
    if (!item) return;

    item.name = newName;
    setCollections(newCollections);

    const userId = localStorage.getItem('probestack_user_id');
    if (!userId) return;

    let apiCall;
    if (item.type === 'collection') apiCall = updateCollection(item.id, { name: newName });
    else if (item.type === 'folder') apiCall = updateFolder(item.id, { name: newName });
    else if (item.type === 'request') apiCall = updateRequest(item.id, { name: newName });
    else return;

    apiCall.catch((err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to rename item');
      item.name = selectedItemForRename.name;
      setCollections([...newCollections]);
    });
  };

  // Drag and drop handlers
  const handleDragStart = (item) => {
    if (item.type === 'folder' || item.type === 'request') setDraggedItem(item);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;
    if (item.type === 'collection' || item.type === 'folder') setDragOverItem(item.id);
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
    if (draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }
    if (targetItem.type !== 'collection' && targetItem.type !== 'folder') {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const draggedRootCollection = findRootCollection(draggedItem.id);
    const targetRootCollection = findRootCollection(targetItem.id);
    if (!targetRootCollection) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

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

    let newCollectionId = targetRootCollection.id;
    let newFolderId = null;
    if (targetItem.type === 'folder') {
      newFolderId = targetItem.id;
    } else if (targetItem.type === 'collection') {
      newFolderId = null;
    }

    if (draggedItem.type === 'request') {
      const sourceParent = findParentCollection(collections, draggedItem.id);
      if (!sourceParent) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const moveData = {
        targetCollectionId: newCollectionId,
        targetFolderId: newFolderId,
      };

      setCollections(prev => {
        const updated = structuredClone(prev);
        const sourceParentNode = findItemById(updated, sourceParent.id);
        if (sourceParentNode && sourceParentNode.items) {
          const index = sourceParentNode.items.findIndex(i => i.id === draggedItem.id);
          if (index !== -1) sourceParentNode.items.splice(index, 1);
        }
        const targetParentNode = findItemById(updated, targetItem.id);
        if (targetParentNode && targetParentNode.items) {
          draggedItem.collectionId = newCollectionId;
          draggedItem.folderId = newFolderId;
          targetParentNode.items.push(draggedItem);
          targetParentNode.items = sortItems(targetParentNode.items);
        }
        return updated;
      });

      setExpanded((prev) => ({ ...prev, [targetItem.id]: true }));

      moveRequest(draggedItem.id, moveData).catch(err => {
        toast.error('Failed to move request: ' + (err.response?.data?.message || err.message));
      });
    } else if (draggedItem.type === 'folder') {
      const clonedItem = deepCloneItem(draggedItem, targetRootCollection.id);
      setCollections(prev => {
        const updated = structuredClone(prev);
        const target = findItemById(updated, targetItem.id);
        if (target && target.items) {
          target.items.push(clonedItem);
          target.items = sortItems(target.items);
        }
        return updated;
      });
      setExpanded((prev) => ({ ...prev, [targetItem.id]: true }));
      toast.info('Folder cloned (move not yet implemented for folders)');
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Parse Postman collection
const parsePostmanCollection = (postmanJson, workspaceId, workspaceName) => {
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

  const collectionName = postmanJson.info?.name || 'Imported Collection';
  const items = postmanJson.item ? postmanJson.item.map(item => parseItem(item)) : [];

  return {
    id: `imported-collection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: collectionName,
    type: 'collection',
    icon: 'folder',
    project: workspaceId,
    projectName: workspaceName,
    items: items.filter(Boolean)
  };
};

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

const handleFileImport = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    alert('Please select a valid JSON file');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonContent = JSON.parse(e.target.result);
      if (!jsonContent.info || !jsonContent.item) {
        alert('Invalid Postman collection format');
        return;
      }
      // Store both content and file name
      setImportFileData({
        content: jsonContent,
        fileName: file.name
      });
      setShowImportWorkspaceModal(true);
      event.target.value = ''; // reset input
    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert('Failed to parse JSON file. Please ensure it\'s a valid Postman collection.');
    }
  };
  reader.readAsText(file);
};

// Helper to extract request payload from Postman item
const extractRequestPayload = (postmanItem, collectionId, folderId) => {
  const request = postmanItem.request;
  const parseUrl = (urlObj) => {
    if (typeof urlObj === 'string') return urlObj;
    if (!urlObj) return '';
    const protocol = urlObj.protocol || 'http';
    const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : (urlObj.host || 'localhost');
    const port = urlObj.port ? `:${urlObj.port}` : '';
    const path = Array.isArray(urlObj.path) ? `/${urlObj.path.join('/')}` : (urlObj.path || '');
    const query = urlObj.query?.length ? `?${urlObj.query.map(q => `${q.key}=${q.value || ''}`).join('&')}` : '';
    return `${protocol}://${host}${port}${path}${query}`;
  };
  const parseHeaders = (headers) => {
    if (!Array.isArray(headers)) return [];
    return headers.map(h => ({ key: h.key, value: h.value, enabled: !h.disabled }));
  };
  const parseBody = (body) => {
    if (!body) return { type: 'none', data: '' };
    if (body.mode === 'raw') return { type: 'raw', data: body.raw || '' };
    if (body.mode === 'formdata') return { type: 'form-data', data: body.formdata || [] };
    if (body.mode === 'urlencoded') return { type: 'x-www-form-urlencoded', data: body.urlencoded || [] };
    return { type: 'none', data: '' };
  };
  const parseAuth = (auth) => {
    if (!auth || !auth.type) return { type: 'none', config: {} };
    if (auth.type === 'bearer') {
      const token = auth.bearer?.find(b => b.key === 'token')?.value || '';
      return { type: 'bearer', config: { token } };
    }
    if (auth.type === 'basic') {
      const username = auth.basic?.find(b => b.key === 'username')?.value || '';
      const password = auth.basic?.find(b => b.key === 'password')?.value || '';
      return { type: 'basic', config: { username, password } };
    }
    if (auth.type === 'apikey') {
      const key = auth.apikey?.find(a => a.key === 'key')?.value || '';
      const value = auth.apikey?.find(a => a.key === 'value')?.value || '';
      const addTo = auth.apikey?.find(a => a.key === 'in')?.value || 'header';
      return { type: 'apikey', config: { key, value, in: addTo } };
    }
    return { type: 'none', config: {} };
  };

  const body = parseBody(request.body);
  const auth = parseAuth(request.auth);
  const url = parseUrl(request.url);
  const headers = parseHeaders(request.header);
  const params = request.url?.query?.map(q => ({ key: q.key, value: q.value })) || [];

  return {
    name: postmanItem.name || 'Untitled Request',
    method: (request.method || 'GET').toUpperCase(),
    url,
    headers,
    query_params: params,
    body_type: body.type,
    body_content: typeof body.data === 'string' ? body.data : JSON.stringify(body.data),
    auth_type: auth.type,
    auth_config: auth.config,
    pre_request_script: '',
    test_script: '',
    collection_id: collectionId,
    folder_id: folderId,
  };
};

// Recursive import function with counters
const importItems = async (items, collectionId, parentFolderId, counts) => {
  for (const item of items) {
    if (item.request) {
      // Request
      const payload = extractRequestPayload(item, collectionId, parentFolderId);
      try {
        await createRequest(payload);
        counts.success++;
      } catch (error) {
        counts.failure++;
        console.error('❌ Failed to create request:', item.name, error.response?.data || error.message);
        // Log full error details to console for debugging
        if (error.response) {
          console.error('Status:', error.response.status);
          console.error('Data:', error.response.data);
        }
      }
    } else if (item.item) {
      // Folder
      try {
        const folderRes = await createFolder(collectionId, {
          name: item.name || 'Untitled Folder',
          parentFolderId,
        });
        const folderId = folderRes.data.FolderId || folderRes.data.folderId || folderRes.data.id;
        if (!folderId) {
          console.error('❌ Folder creation response missing ID:', folderRes.data);
          counts.failure++;
          continue;
        }
        counts.foldersCreated++;
        await importItems(item.item, collectionId, folderId, counts);
      } catch (error) {
        counts.failure++;
        console.error('❌ Failed to create folder:', item.name, error.response?.data || error.message);
        if (error.response) {
          console.error('Status:', error.response.status);
          console.error('Data:', error.response.data);
        }
      }
    }
  }
};

const handleImportToWorkspace = async (workspaceId, workspaceName) => {
  if (!importFileData) return;
  const { content: postmanJson } = importFileData;

  // Determine base name
  let baseName = postmanJson.info?.name?.trim() || 'Imported Collection';

  // Check for existing collections in this workspace
  const existingNames = collections
    .filter(c => c.project === workspaceId)
    .map(c => c.name.toLowerCase());

  let finalName = baseName;
  let counter = 0;
  while (existingNames.includes(finalName.toLowerCase())) {
    counter++;
    finalName = counter === 1 ? `${baseName} (imported)` : `${baseName} (imported ${counter})`;
  }

  const toastId = toast.loading(`Importing "${baseName}"...`);

  const counts = { success: 0, failure: 0, foldersCreated: 0 };

  try {
    // Step 1: Create collection
    const createColRes = await createCollection(workspaceId, { name: finalName });
    const collectionId = createColRes.data.id || createColRes.data.collectionId;
    if (!collectionId) throw new Error('Failed to create collection');

    // Step 2: Recursively create folders and requests
    await importItems(postmanJson.item || [], collectionId, null, counts);

    // Step 3: Fetch the new collection's folders and requests to build tree
    const foldersRes = await fetchFolders(collectionId);
    const folders = foldersRes.data.map(normalizeFolder);
    const requestsRes = await fetchRequests({ collectionId });
    const requests = requestsRes.data.map(normalizeRequest);

    // Build folder hierarchy
    const folderMap = new Map();
    folders.forEach(f => folderMap.set(f.id, f));

    const rootFolders = [];
    folders.forEach(f => {
      if (f.parentFolderId) {
        const parent = folderMap.get(f.parentFolderId);
        if (parent) {
          if (!parent.items) parent.items = [];
          parent.items.push(f);
        } else {
          rootFolders.push(f);
        }
      } else {
        rootFolders.push(f);
      }
    });

    const items = [...rootFolders];

    requests.forEach(req => {
      if (req.folderId) {
        const parent = folderMap.get(req.folderId);
        if (parent) {
          if (!parent.items) parent.items = [];
          parent.items.push(req);
        } else {
          items.push(req);
        }
      } else {
        items.push(req);
      }
    });

    // Sort items
    const sortItems = (items) => {
      if (!items) return;
      items.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return (a.orderIndex || 0) - (b.orderIndex || 0);
      });
      items.forEach(item => {
        if (item.items) sortItems(item.items);
      });
    };
    sortItems(items);

    const newCollection = {
      id: collectionId,
      name: finalName,
      type: 'collection',
      project: workspaceId,
      projectName: workspaceName,
      items,
    };

    setCollections(prev => [...prev, newCollection]);
    setExpanded(prev => ({ ...prev, [newCollection.id]: true }));

    // Show summary toast
    const totalItems = counts.success + counts.failure;
    if (counts.failure === 0) {
      toast.success(`✅ Collection "${finalName}" imported successfully (${counts.success} requests)`, { id: toastId });
    } else {
      toast.warning(`⚠️ Imported with issues: ${counts.success} succeeded, ${counts.failure} failed. Check console for details.`, { id: toastId });
    }
  } catch (error) {
    console.error('Import failed:', error);
    toast.error(error.response?.data?.message || error.message || 'Import failed', { id: toastId });
  } finally {
    setImportFileData(null);
  }
};
  // ----------------------------------------------------------------------
  // WORKSPACE ACTIONS HANDLERS
  // ----------------------------------------------------------------------

  const handleWorkspaceAction = (actionId) => {
    if (!workspaceMenu) return;

    const { workspaceId, workspaceName, visibility } = workspaceMenu;

    if (actionId === 'rename') {
      setWorkspaceToRename({ id: workspaceId, name: workspaceName });
      setShowRenameWorkspaceModal(true);
    } else if (actionId === 'delete') {
      setWorkspaceToDelete({ id: workspaceId, name: workspaceName });
      setShowDeleteWorkspaceConfirm(true);
    } else if (actionId === 'view-details') {
      onOpenWorkspaceDetails?.(workspaceId);
     }
  };

  const handleRenameWorkspace = async (newName) => {
    if (!workspaceToRename) return;
    try {
      await updateWorkspace(workspaceToRename.id, { name: newName });
      // Since projects are passed from parent, we need a way to update them.
      // We'll assume the parent handles a refetch or we can call onAddProject again.
      // For simplicity, we'll just show a success toast and close the modal.
      toast.success('Workspace renamed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
    } finally {
      setShowRenameWorkspaceModal(false);
      setWorkspaceToRename(null);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    try {
      await deleteWorkspace(workspaceToDelete.id);
      toast.success('Workspace deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setShowDeleteWorkspaceConfirm(false);
      setWorkspaceToDelete(null);
    }
  };

  const getCollectionsCountForWorkspace = (workspaceId) => {
    return collections.filter(c => c.project === workspaceId).length;
  };

  // ----------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-dark-800/40">
      {/* Top buttons */}
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

      {/* Search */}
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
        {(() => {
          const collectionsByWorkspace = {};
          filteredCollections.forEach(col => {
            const wsId = col.project || 'default';
            if (!collectionsByWorkspace[wsId]) collectionsByWorkspace[wsId] = [];
            collectionsByWorkspace[wsId].push(col);
            if (col._tempWorkspaceId && col._tempWorkspaceId !== wsId) {
              if (!collectionsByWorkspace[col._tempWorkspaceId]) {
                collectionsByWorkspace[col._tempWorkspaceId] = [];
              }
              if (!collectionsByWorkspace[col._tempWorkspaceId].some(c => c.id === col.id)) {
                collectionsByWorkspace[col._tempWorkspaceId].push(col);
              }
            }
          });

          if (projects.length === 0) {
            return (
              <div className="py-8 text-center text-gray-500 text-xs">
                No workspaces available. Create a workspace first.
              </div>
            );
          }

          return projects.map((workspace) => {
            const workspaceCollections = collectionsByWorkspace[workspace.id] || [];
            return (
              <div key={workspace.id} className="mb-4">
                {/* Workspace Header with 3-dots button */}
                <div className="flex items-center gap-2 px-2 py-1.5 mb-1 group">
                  <div className="flex items-center gap-1.5 flex-1">
                    <Folder className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      {workspace.name}
                    </span>
                    {workspace.visibility === 'private' && (
                      <Lock className="w-3 h-3 text-gray-500" title="Private Workspace" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {workspaceCollections.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorkspaceMenu({
                        x: e.clientX,
                        y: e.clientY,
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        visibility: workspace.visibility,
                      });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition-opacity"
                    title="Workspace actions"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Collections under this workspace */}
                <div className="ml-2">
                  {workspaceCollections.length === 0 ? (
                    <div className="text-xs text-gray-500 italic px-2 py-1">
                      No collections
                    </div>
                  ) : (
                    workspaceCollections.map((col) => (
                      <CollectionNode
                        key={col._key || col.id}
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
                    ))
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Context Menus */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {workspaceMenu && (
        <WorkspaceContextMenu
          x={workspaceMenu.x}
          y={workspaceMenu.y}
          onClose={() => setWorkspaceMenu(null)}
          onAction={handleWorkspaceAction}
        />
      )}

      {/* Modals */}
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

      {/* Workspace Rename Modal */}
      <RenameModal
        isOpen={showRenameWorkspaceModal}
        onClose={() => {
          setShowRenameWorkspaceModal(false);
          setWorkspaceToRename(null);
        }}
        currentName={workspaceToRename?.name || ''}
        itemType="workspace"
        onRename={handleRenameWorkspace}
      />

      {/* Workspace Delete Confirmation */}
      <DeleteWorkspaceConfirmModal
        isOpen={showDeleteWorkspaceConfirm}
        onClose={() => {
          setShowDeleteWorkspaceConfirm(false);
          setWorkspaceToDelete(null);
        }}
        workspaceName={workspaceToDelete?.name || ''}
        onConfirm={handleDeleteWorkspace}
      />

      {/* Workspace Details Modal */}
      <WorkspaceDetailsModal
        isOpen={showWorkspaceDetailsModal}
        onClose={() => {
          setShowWorkspaceDetailsModal(false);
          setWorkspaceToView(null);
        }}
        workspace={workspaceToView}
        collectionsCount={workspaceToView ? getCollectionsCountForWorkspace(workspaceToView.id) : 0}
      />

<ImportWorkspaceModal
  isOpen={showImportWorkspaceModal}
  onClose={() => {
    setShowImportWorkspaceModal(false);
    setImportFileData(null);
  }}
  onImport={handleImportToWorkspace}
  projects={projects}
  onAddProject={onAddProject}
  fileName={importFileData?.fileName}
/>
    </div>
  );
}

// ----------------------------------------------------------------------
// COLLECTION NODE COMPONENT
// ----------------------------------------------------------------------

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
      onSelectEndpoint(item);
    } else if (!isRequest) {
      onToggle(item.id);
    }
  };

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
          <Globe className="w-4 h-4 shrink-0 text-sky-400/90" aria-hidden />
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