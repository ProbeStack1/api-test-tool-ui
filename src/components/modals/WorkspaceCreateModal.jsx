import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Folder, Check } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

export default function WorkspaceCreateModal({ isOpen, onClose, onCreate, workspaces }) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
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
      setDescription('');
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

    const existing = workspaces.find(
      (ws) => ws.name.toLowerCase() === workspaceName.trim().toLowerCase()
    );
    if (existing) {
      setValidationError(`Workspace "${workspaceName.trim()}" already exists`);
      return;
    }

    onCreate({
      name: workspaceName.trim(),
      description: description.trim(),
      visibility,
      importedCollection: importedFile,
    });
    onClose();
  };

  const handleImportClick = () => fileInputRef.current?.click();

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
        setImportedFile({ name: file.name, content: jsonContent });
        setImportError('');
      } catch {
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
          <h3 className="text-base font-semibold text-white">Create Project</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Workspace Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => {
                setWorkspaceName(e.target.value);
                setValidationError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Enter project name"
              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              autoFocus
            />
            {validationError && <p className="mt-2 text-xs text-red-400">{validationError}</p>}
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this project"
              rows="3"
              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Visibility</label>
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

          {/* Import Collection (optional) */}
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-dark-600 bg-[var(--color-input-bg)] text-gray-400 hover:text-gray-300 hover:border-primary/50 hover:bg-dark-900/60 transition-all"
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
            {importError && <p className="mt-2 text-xs text-red-400">{importError}</p>}
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