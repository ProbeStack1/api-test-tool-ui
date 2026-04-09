// src/pages/ProjectManagementPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Lock, Globe, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { createWorkspace } from '../services/workspaceService';
import WorkspaceDetailsView from '../components/detailsTab/WorkspaceDetailsView';

export default function ProjectManagementPage({
  projects: externalProjects,
  activeWorkspaceId: externalActiveWorkspaceId,
  onSelectWorkspace,
  onAddProject,
  onWorkspaceUpdate,
  onWorkspaceDelete,
  currentUserId,
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'details';
  const projectId = searchParams.get('projectId') || externalActiveWorkspaceId;

  // Local project list (never overwritten by stale parent data)
  const [localProjects, setLocalProjects] = useState(externalProjects);
  const [localActiveWorkspaceId, setLocalActiveWorkspaceId] = useState(projectId);
  const createdIdsRef = useRef(new Set());

  // Merge parent projects with our locally created ones
  useEffect(() => {
    const merged = [...externalProjects];
    localProjects.forEach(lp => {
      if (!externalProjects.some(ep => ep.id === lp.id) && createdIdsRef.current.has(lp.id)) {
        merged.push(lp);
      }
    });
    if (JSON.stringify(merged) !== JSON.stringify(localProjects)) {
      setLocalProjects(merged);
    }
  }, [externalProjects]);

  useEffect(() => {
    setLocalActiveWorkspaceId(projectId);
  }, [projectId]);

  const [showCreateForm, setShowCreateForm] = useState(mode === 'create');
  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');
  const [organizationId, setOrganizationId] = useState('');      // NEW
  const [projectSme, setProjectSme] = useState('');              // NEW
  const [visibility, setVisibility] = useState('private');
  const [validationError, setValidationError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal states
  const [redirectDialogOpen, setRedirectDialogOpen] = useState(false);
  const [newlyCreatedProject, setNewlyCreatedProject] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [countdownPercent, setCountdownPercent] = useState(100);
  const countdownIntervalRef = useRef(null);

  // Hide workspace tabs (like settings page)
  useEffect(() => {
    document.body.classList.add('hide-workspace-tabs');
    return () => document.body.classList.remove('hide-workspace-tabs');
  }, []);

  useEffect(() => {
    setShowCreateForm(mode === 'create');
  }, [mode]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const startCountdown = (onComplete) => {
    const duration = 10; // seconds
    const startTime = Date.now();
    setCountdownPercent(100);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      const percent = (remaining / duration) * 100;
      setCountdownPercent(percent);
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        if (onComplete) onComplete();
      }
    }, 50);
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const closeModalWithAnimation = (callback) => {
    setClosingModal(true);
    stopCountdown();
    setTimeout(() => {
      setRedirectDialogOpen(false);
      setClosingModal(false);
      if (callback) callback();
    }, 300);
  };

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

      // Add custom fields locally
      newWorkspace.email = workspaceEmail.trim();
      newWorkspace.organizationId = organizationId.trim();
      newWorkspace.projectSme = projectSme.trim();

      // Update local state immediately
      setLocalProjects(prev => [newWorkspace, ...prev]);
      createdIdsRef.current.add(newWorkspace.id);
      setLocalActiveWorkspaceId(newWorkspace.id);
      setShowCreateForm(false);
      navigate(`/workspace/projects-management?mode=details&projectId=${newWorkspace.id}`, { replace: true });

      // Notify parent
      if (onAddProject) onAddProject(newWorkspace);
      if (onSelectWorkspace) onSelectWorkspace(newWorkspace.id);

      toast.success(`Project "${newWorkspace.name}" created!`);

      // Store the new project and open the modal
      setNewlyCreatedProject(newWorkspace);
      setRedirectDialogOpen(true);
      startCountdown(() => {
        if (redirectDialogOpen && newlyCreatedProject) {
          handleRedirectToCollections();
        }
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRedirectToCollections = () => {
    if (!newlyCreatedProject) return;
    setIsRedirecting(true);
    closeModalWithAnimation(() => {
      toast.loading('Redirecting to collections...', { id: 'redirect-loading' });
      setTimeout(() => {
        toast.dismiss('redirect-loading');
        navigate(`/workspace/collections?projectId=${newlyCreatedProject.id}`);
      }, 300);
    });
  };

  const handleStayOnDetails = () => {
    if (!newlyCreatedProject) return;
    closeModalWithAnimation(() => {
      setNewlyCreatedProject(null);
    });
  };

  const handleCloseDialog = () => {
    closeModalWithAnimation(() => {
      setNewlyCreatedProject(null);
    });
  };

  const toggleMode = () => {
    if (showCreateForm) {
      navigate(`/workspace/projects-management?mode=details&projectId=${localActiveWorkspaceId}`);
    } else {
      navigate('/workspace/projects-management?mode=create');
    }
  };

  const activeWorkspace = localProjects.find(p => p.id === localActiveWorkspaceId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-probestack-bg text-white min-h-0">
      {/* Back button */}
      <div className="px-6 pt-4">
        <button
          onClick={() => navigate('/workspace/collections')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back to Project</span>
        </button>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header with inline toggle button */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">
              {showCreateForm ? 'Create New Project' : 'Project Management'}
            </h1>
            <button
              onClick={toggleMode}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-dark-700 hover:bg-dark-700/60 transition-colors text-gray-300 hover:text-white"
            >
              {showCreateForm ? (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  Back to Details
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create New Project
                </>
              )}
            </button>
          </div>

          {/* Main Content */}
          {showCreateForm ? (
            <div className="rounded-md border border-dark-700 p-6 space-y-4">
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
                  className="w-full border border-dark-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  className="w-full border border-dark-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Project Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Email <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={workspaceEmail}
                  onChange={(e) => setWorkspaceEmail(e.target.value)}
                  placeholder="team@example.com"
                  className="w-full border border-dark-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-gray-500 mt-1">Used for team collaboration and notifications</p>
              </div>

              {/* Organization ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organization ID <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  placeholder="e.g., ORG-001, acme-corp"
                  className="w-full border border-dark-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-gray-500 my-1">Internal organization reference</p>
              </div>

              {/* Project SME */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project SME <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={projectSme}
                  onChange={(e) => setProjectSme(e.target.value)}
                  placeholder="Name or email of subject matter expert"
                  className="w-full border border-dark-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-gray-500 mt-1">The person responsible for this project</p>
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
                      className="w-4 h-4 text-primary border-dark-600 focus:ring-primary"
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
                      className="w-4 h-4 text-primary border-dark-600 focus:ring-primary"
                    />
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Public</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  onClick={toggleMode}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!workspaceName.trim() || isCreating}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          ) : (
            activeWorkspace ? (
              <div className="rounded-md border border-dark-700 overflow-hidden">
                <WorkspaceDetailsView
                  workspace={activeWorkspace}
                  collectionsCount={0}
                  currentUserId={currentUserId}
                  onWorkspaceUpdate={onWorkspaceUpdate}
                  onWorkspaceDelete={(workspaceId) => {
                    onWorkspaceDelete(workspaceId);
                    navigate('/workspace/collections');
                  }}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dark-700 p-8 text-center text-gray-400">
                <p className="text-sm">No project selected.</p>
                <button
                  onClick={toggleMode}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create a new project
                </button>
              </div>
            )
          )}
        </div>
      </main>

      {/* Bottom-right modal (no background blur) */}
      {redirectDialogOpen && newlyCreatedProject && (
        <div
          className={clsx(
            'fixed bottom-4 right-4 z-50 w-80 rounded-md border border-dark-700 shadow-2xl transition-all duration-300 ease-out',
            closingModal ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
          )}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Project Created!</h3>
              <button
                onClick={handleCloseDialog}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300 mb-3">
              Project "<span className="font-medium text-white">{newlyCreatedProject.name}</span>" has been created.
            </p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleStayOnDetails}
                disabled={isRedirecting}
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-colors disabled:opacity-50"
              >
                Stay here
              </button>
              <button
                onClick={handleRedirectToCollections}
                disabled={isRedirecting}
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isRedirecting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Go to collections'
                )}
              </button>
            </div>
            {/* Countdown bar – 10 seconds */}
            <div className="h-1 w-full rounded-md overflow-hidden bg-dark-700">
              <div
                className="h-full bg-primary transition-all duration-50 ease-linear"
                style={{ width: `${countdownPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 text-right">
              Auto‑redirects in {Math.ceil((countdownPercent / 100) * 10)}s
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
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