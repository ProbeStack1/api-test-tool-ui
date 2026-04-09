// src/components/detailsTab/ProjectWizardTab.jsx
import React, { useState, useRef } from 'react';
import { X, Upload, Folder, Check, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { createWorkspace } from '../../services/workspaceService';
import WorkspaceDetailsView from './WorkspaceDetailsView';

export default function ProjectWizardTab({
  tab,
  onUpdateTab,
  onCloseTab,
  onWorkspaceCreated,
  onAddProject,
  currentUserId,
  onWorkspaceUpdate,
  onWorkspaceDelete,
}) {
  const [step, setStep] = useState('form');

  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');   // NEW: project email
  const [visibility, setVisibility] = useState('private');
  const [validationError, setValidationError] = useState('');
  const [importedFile, setImportedFile] = useState(null);
  const [importError, setImportError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef(null);

  const [createdWorkspace, setCreatedWorkspace] = useState(null);

  const handleCreate = async () => {
    if (!workspaceName.trim()) {
      setValidationError('Project name is required');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        name: workspaceName.trim(),
        description: description.trim(),
        visibility,
      };
      const response = await createWorkspace(payload);
      const newWorkspace = response.data;

      // Add email property locally (backend may not store it, but we keep it for UI)
      newWorkspace.email = workspaceEmail.trim();

      // 1. Add to projects list immediately
      if (onAddProject) {
        onAddProject(newWorkspace);
      }

      // 2. Show success toast with delay before switching
      toast.success(`Project "${newWorkspace.name}" created!`, {
        duration: 3000,
      });

      // 3. Wait 500ms, then switch and update tab
      setTimeout(() => {
        setCreatedWorkspace(newWorkspace);
        onUpdateTab(tab.index, {
          ...tab,
          type: 'workspace-details',
          workspaceId: newWorkspace.id,
          name: `Project: ${newWorkspace.name}`,
        });
        setStep('details');
        // 4. Select the new workspace (triggers full UI refresh)
        onWorkspaceCreated(newWorkspace.id);
      }, 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
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

  if (step === 'details' && createdWorkspace) {
    return (
      <WorkspaceDetailsView
        workspace={createdWorkspace}
        collectionsCount={0}
        currentUserId={currentUserId}
        onWorkspaceUpdate={onWorkspaceUpdate}
        onWorkspaceDelete={(workspaceId) => {
          onWorkspaceDelete(workspaceId);
          onCloseTab(tab.index);
        }}
      />
    );
  }

  // Form UI
  return (
    <div className="flex-1 flex flex-col overflow-auto p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <h2 className="text-lg font-semibold text-white">Create New Project</h2>

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
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          {validationError && <p className="mt-2 text-xs text-red-400">{validationError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose of this project"
            rows="3"
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* NEW: Project Email field */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Project Email <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            value={workspaceEmail}
            onChange={(e) => setWorkspaceEmail(e.target.value)}
            placeholder="team@example.com"
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-gray-500 mt-1">Used for team collaboration and notifications</p>
        </div>

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
                className="w-4 h-4 text-primary bg-dark-900 border-dark-600 focus:ring-primary"
              />
              <Lock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Private</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                className="w-4 h-4 text-primary bg-dark-900 border-dark-600 focus:ring-primary"
              />
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Public</span>
            </label>
          </div>
        </div>

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
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-dark-600 bg-dark-800/40 text-gray-400 hover:text-gray-300 hover:border-primary/50 transition-all"
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
                className="p-1 rounded hover:bg-primary/20 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {importError && <p className="mt-2 text-xs text-red-400">{importError}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onCloseTab(tab.index)}
            className="flex-1 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!workspaceName.trim() || isCreating}
            className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}