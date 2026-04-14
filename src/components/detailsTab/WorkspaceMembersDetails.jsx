import React, { useState, useEffect } from 'react';
import { Lock, Edit3, Trash2, Copy, Check, Eye, EyeOff, X, User, Calendar, Clock, Unlock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { updateWorkspace, deleteWorkspace } from '../../services/workspaceService';
import { fetchWorkspaceMembers } from '../../services/workspaceMemberService';
import WorkspaceMembersDetails from './WorkspaceMembersDetails';

const canEditWorkspace = (role) => ['owner', 'admin'].includes(role);
const canDeleteWorkspace = (role) => role === 'owner';

export default function WorkspaceDetailsView({
  workspace,
  collectionsCount,
  currentUserId,
  onWorkspaceUpdate,
  onWorkspaceDelete,
}) {
  const [deleteStage, setDeleteStage] = useState('idle');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workspace?.name ?? '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(workspace?.description ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Member state – only for role detection
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const currentUserMember = members.find(m => m.userId === currentUserId);
  const currentUserRole = currentUserMember?.role || 'viewer';

  useEffect(() => {
    setEditedName(workspace?.name ?? '');
    setEditedDescription(workspace?.description ?? '');
  }, [workspace]);

  useEffect(() => {
    if (workspace?.id) loadMembers();
  }, [workspace?.id]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await fetchWorkspaceMembers(workspace.id);
      let membersList = response.data || [];
      const currentUserInList = membersList.some(m => m.userId === currentUserId);
      if (!currentUserInList && workspace.createdBy === currentUserId) {
        membersList.unshift({
          id: 'owner-self',
          userId: currentUserId,
          userName: 'You',
          userEmail: '',
          role: 'owner',
        });
      }
      setMembers(membersList);
    } catch (error) {
      toast.error('Could not load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(workspace.id);
    toast.success('Project ID copied');
  };

  const handleRename = async () => {
    if (!editedName.trim() || editedName === workspace.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateWorkspace(workspace.id, { name: editedName.trim() });
      toast.success('Project renamed');
      onWorkspaceUpdate?.({ ...workspace, name: editedName.trim() });
      setIsEditingName(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Rename failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDescriptionUpdate = async () => {
    if (editedDescription === workspace.description) {
      setIsEditingDescription(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateWorkspace(workspace.id, { description: editedDescription.trim() });
      toast.success('Description updated');
      onWorkspaceUpdate?.({ ...workspace, description: editedDescription.trim() });
      setIsEditingDescription(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleVisibility = async () => {
    const newVisibility = workspace.visibility === 'private' ? 'public' : 'private';
    setIsUpdating(true);
    try {
      await updateWorkspace(workspace.id, { visibility: newVisibility });
      toast.success(`Project is now ${newVisibility}`);
      onWorkspaceUpdate?.({ ...workspace, visibility: newVisibility });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Visibility change failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleteStage('deleting');
    setIsUpdating(true);
    try {
      await deleteWorkspace(workspace.id);
      setDeleteStage('success');
      toast.success('Project deleted successfully');
      setTimeout(() => {
        onWorkspaceDelete?.(workspace.id);
        setShowDeleteModal(false);
        setDeleteStage('idle');
      }, 1800);
    } catch (error) {
      setDeleteStage('error');
      toast.error(error.response?.data?.message || 'Failed to delete project');
      setTimeout(() => {
        setDeleteStage('idle');
        setIsUpdating(false);
      }, 2200);
    }
  };

  if (!workspace) return <div className="p-6 text-gray-400">Project not found</div>;

  const canEdit = canEditWorkspace(currentUserRole);
  const isOwner = currentUserRole === 'owner';
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString() : '—';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {workspace.visibility === 'private' ? <Lock className="w-8 h-8 text-gray-400" /> : <Unlock className="w-8 h-8 text-primary" />}
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="border border-primary/50 rounded px-2 py-1 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    disabled={isUpdating}
                  />
                  <button onClick={handleRename} disabled={isUpdating} className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setIsEditingName(false); setEditedName(workspace.name); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white">{workspace.name}</h1>
                  {canEdit && (
                    <button onClick={() => setIsEditingName(true)} className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  <span className={clsx('text-xs px-2 py-1 rounded-full font-medium',
                    currentUserRole === 'owner' && 'bg-red-500/20 text-red-400',
                    currentUserRole === 'admin' && 'bg-purple-500/20 text-purple-400',
                    currentUserRole === 'editor' && 'bg-blue-500/20 text-blue-400',
                    currentUserRole === 'viewer' && 'bg-gray-500/20 text-gray-400'
                  )}>
                    {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-gray-500">{workspace.id}</span>
                <button onClick={handleCopyId} className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {canEdit && (
            <button onClick={handleToggleVisibility} disabled={isUpdating} className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
              workspace.visibility === 'private' ? 'bg-dark-700 text-gray-300 hover:bg-dark-600' : 'bg-primary/20 text-primary hover:bg-primary/30'
            )}>
              {workspace.visibility === 'private' ? <><Lock className="w-4 h-4" /> Private</> : <><Eye className="w-4 h-4" /> Public</>}
            </button>
          )}
        </div>

        {/* Description */}
        <div className="p-4 rounded-md border border-dark-700">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            {canEdit && !isEditingDescription && (
              <button onClick={() => setIsEditingDescription(true)} className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {isEditingDescription ? (
            <div className="flex items-center gap-2 mt-1">
              <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="flex-1 border border-dark-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30" rows={2} disabled={isUpdating} />
              <button onClick={handleDescriptionUpdate} disabled={isUpdating} className="p-2 rounded bg-primary/20 text-primary hover:bg-primary/30">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsEditingDescription(false); setEditedDescription(workspace.description || ''); }} className="p-2 rounded text-gray-400 hover:text-white hover:bg-dark-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-300 mt-1">{workspace.description || <span className="text-gray-500 italic">No description</span>}</p>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-md border border-dark-700 bg-dark-800/40">
            <p className="text-xs text-gray-500 mb-1">Collections</p>
            <p className="text-sm text-white">{collectionsCount}</p>
          </div>
          <div className="p-4 rounded-md border border-dark-700 bg-dark-800/40">
            <p className="text-xs text-gray-500 mb-1">Info</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-300">Created by: {workspace.createdBy || '—'}</span></div>
              {workspace.workspaceEmail && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-300">Email: {workspace.workspaceEmail}</span></div>}
              <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-300">Created: {formatDate(workspace.createdAt)}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-300">Updated: {formatDate(workspace.updatedAt)}</span></div>
            </div>
          </div>
        </div>

        {/* Shared Access – new invitation-based component */}
        <div className="rounded-md border border-dark-700 bg-dark-800/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-700">
            <h2 className="text-sm font-semibold text-gray-300">Shared Access</h2>
            <p className="text-xs text-gray-500 mt-0.5">Invite members by email and share the generated link</p>
          </div>
          <div className="p-4">
            <WorkspaceMembersDetails
              workspaceId={workspace.id}
              currentUserId={currentUserId}
              userRole={currentUserRole}
            />
          </div>
        </div>

        {/* Danger zone */}
        {isOwner && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-500/20">
              <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
            </div>
            <div className="p-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">This action cannot be undone. All collections, requests, and data will be permanently deleted.</p>
              <button onClick={() => setShowDeleteModal(true)} disabled={isUpdating} className="flex items-center gap-2 px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm font-medium">
                <Trash2 className="w-4 h-4" /> Delete project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent backdrop-blur-md" onClick={() => { if (deleteStage === 'idle' || deleteStage === 'error') { setShowDeleteModal(false); setDeleteStage('idle'); } }}>
          <div className={clsx("bg-dark-800 border border-red-500/30 rounded-lg shadow-xl max-w-md w-full p-6", deleteStage === 'success' && "scale-95 opacity-90", deleteStage === 'error' && "border-red-600/50")} onClick={(e) => e.stopPropagation()}>
            {deleteStage === 'idle' && (
              <>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-400" /> Delete Project</h3>
                <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete <span className="font-medium text-white">{workspace.name}</span>? This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowDeleteModal(false)} className="px-5 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium">Cancel</button>
                  <button onClick={handleDelete} disabled={isUpdating} className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                </div>
              </>
            )}
            {deleteStage === 'deleting' && (
              <div className="py-10 text-center"><div className="w-16 h-16 border-4 border-t-red-500 border-red-500/30 rounded-full animate-spin mx-auto mb-6"></div><h3 className="text-lg font-semibold text-white mb-2">Deleting workspace...</h3><p className="text-sm text-gray-400">This may take a few seconds</p></div>
            )}
            {deleteStage === 'success' && (
              <div className="py-12 text-center"><div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"><Check className="w-12 h-12 text-green-400" /></div><h3 className="text-2xl font-bold text-green-400 mb-2">Deleted!</h3><p className="text-sm text-gray-400">Project removed successfully</p></div>
            )}
            {deleteStage === 'error' && (
              <div className="py-10 text-center"><div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6"><X className="w-10 h-10 text-red-400" /></div><h3 className="text-xl font-semibold text-red-400 mb-3">Delete failed</h3><p className="text-sm text-gray-300 mb-6">Something went wrong. Please try again.</p><div className="flex gap-3 justify-center"><button onClick={() => setShowDeleteModal(false)} className="px-5 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300">Close</button><button onClick={handleDelete} className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white">Retry</button></div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}