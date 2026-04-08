// src/pages/ProjectManagementPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Check, Lock, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { createWorkspace } from '../services/workspaceService';
import WorkspaceDetailsView from '../components/detailsTab/WorkspaceDetailsView';

export default function ProjectManagementPage({
  projects,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddProject,
  onWorkspaceUpdate,
  onWorkspaceDelete,
  currentUserId,
}) {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [validationError, setValidationError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const activeWorkspace = projects.find(p => p.id === activeWorkspaceId);

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

      // Add to projects list and select it
      if (onAddProject) onAddProject(newWorkspace);
      if (onSelectWorkspace) onSelectWorkspace(newWorkspace.id);

      toast.success(`Project "${newWorkspace.name}" created!`);
      setShowCreateForm(false);
      setWorkspaceName('');
      setDescription('');
      setVisibility('private');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-probestack-bg text-white min-h-0">
      {/* Header with back button */}
      <div className="px-6 pt-4">
        <button
          onClick={() => navigate('/workspace/collections')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back to Workspace</span>
        </button>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-2xl font-bold text-white">Project Management</h1>

          {/* Current Project Section */}
          {activeWorkspace ? (
            <div className="rounded-xl border border-dark-700 bg-dark-800/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-700">
                <h2 className="text-lg font-semibold text-white">Current Project</h2>
              </div>
              <WorkspaceDetailsView
                workspace={activeWorkspace}
                collectionsCount={
                  projects.filter(p => p.id === activeWorkspaceId).length > 0
                    ? 0  // In a real scenario you'd compute collection count
                    : 0
                }
                currentUserId={currentUserId}
                onWorkspaceUpdate={onWorkspaceUpdate}
                onWorkspaceDelete={(workspaceId) => {
                  onWorkspaceDelete(workspaceId);
                  // After deletion, go back to collections if the active workspace is gone
                  navigate('/workspace/collections');
                }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-6 text-center text-gray-400">
              No project selected. Create a new one below.
            </div>
          )}

          {/* Create New Project Section */}
          <div className="rounded-xl border border-dark-700 bg-dark-800/40 overflow-hidden">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-dark-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Create New Project</h2>
                  <p className="text-xs text-gray-400">Start a new workspace for your API collections</p>
                </div>
              </div>
              {showCreateForm ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showCreateForm && (
              <div className="p-4 border-t border-dark-700 space-y-4">
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
                    placeholder="Enter project name"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {validationError && <p className="mt-2 text-xs text-red-400">{validationError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    placeholder="Describe the purpose of this project"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
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

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!workspaceName.trim() || isCreating}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer (same as other pages) */}
      <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img src="/assets/justlogo.png" alt="ProbeStack logo" className="h-6 w-auto" />
              <span className="font-semibold gradient-text font-heading">ProbeStack</span>
              <span>© {new Date().getFullYear()} All rights reserved</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors">Terms of Service</a>
              <a href="/security" className="hover:text-[#ff5b1f] transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}