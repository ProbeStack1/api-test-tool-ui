import React, { useState, useEffect, useRef } from 'react';
import { Folder, Lock, Edit3, Trash2, Copy, Check, Eye, EyeOff, UserPlus, X, User, Calendar, Clock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { updateWorkspace, deleteWorkspace } from '../../services/workspaceService';
import {
  fetchWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember
} from '../../services/workspaceMemberService';


// Helper to check permissions based on role
const canEditWorkspace = (role) => ['owner', 'admin'].includes(role);
const canManageMembers = (role) => ['owner', 'admin'].includes(role);
const canDeleteWorkspace = (role) => role === 'owner';

export default function WorkspaceDetailsView({
  workspace,
  collectionsCount,
  currentUserId,
  onWorkspaceUpdate,
  onWorkspaceDelete,
}) {
    const [deleteStage, setDeleteStage] = useState('idle'); // 'idle' | 'confirming' | 'deleting' | 'success' | 'error'

  // State for workspace editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workspace?.name ?? '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(workspace?.description ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // new modal state

  // Sync fields when workspace changes
  useEffect(() => {
    setEditedName(workspace?.name ?? '');
    setEditedDescription(workspace?.description ?? '');
  }, [workspace]);

  // State for members
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('viewer');
  const [addingMember, setAddingMember] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const removeConfirmRef = useRef(null);

  // Determine current user's role in this workspace
  const currentUserMember = members.find(m => m.userId === currentUserId);
  const currentUserRole = currentUserMember?.role || 'viewer'; // fallback

  // Fetch members on mount
  useEffect(() => {
    if (workspace?.id) {
      loadMembers();
    }
  }, [workspace?.id]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await fetchWorkspaceMembers(workspace.id);
      setMembers(response.data || []);
    } catch (error) {
      toast.error('Could not load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
  const handleClickOutside = (e) => {
    if (removeConfirm && !removeConfirmRef.current?.contains(e.target)) {
      setRemoveConfirm(null);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [removeConfirm]);

  // Handlers
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
      const payload = { name: editedName.trim() };
      await updateWorkspace(workspace.id, payload);
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
      const payload = { description: editedDescription.trim() };
      await updateWorkspace(workspace.id, payload);
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
      const payload = { visibility: newVisibility };
      await updateWorkspace(workspace.id, payload);
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

    // Wait ~1.8 seconds to show nice success animation, then close & trigger callback
    setTimeout(() => {
      onWorkspaceDelete?.(workspace.id);
      setShowDeleteModal(false);
      setDeleteStage('idle');
    }, 1800);

  } catch (error) {
    setDeleteStage('error');
    toast.error(error.response?.data?.message || 'Failed to delete project');

    // Let user see error for a moment, then allow retry / close
    setTimeout(() => {
      setDeleteStage('idle');
      setIsUpdating(false);
    }, 2200);
  }
};

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const response = await addWorkspaceMember(workspace.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setMembers(prev => [...prev, response.data]);
      setNewMemberEmail('');
      setNewMemberRole('viewer');
      setShowAddMember(false);
      toast.success('Member added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await updateWorkspaceMemberRole(workspace.id, memberId, { role: newRole });
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success('Member role updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Role update failed');
    }
  };

const handleRemoveMember = async (memberId, memberName, event) => {
  try {
    await removeWorkspaceMember(workspace.id, memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('Member removed');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to remove member');
  }
};

  if (!workspace) {
    return <div className="p-6 text-gray-400">Project not found</div>;
  }

  const canEdit = canEditWorkspace(currentUserRole);
  const canManage = canManageMembers(currentUserRole);
  const isOwner = currentUserRole === 'owner';


  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with visibility icon*/}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Visibility icon */}
            {workspace.visibility === 'private' ? (
              <Lock className="w-8 h-8 text-gray-400" />
            ) : (
              <Unlock className="w-8 h-8 text-primary" />
            )}
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className=" border border-primary/50 rounded px-2 py-1 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    disabled={isUpdating}
                  />
                  <button
                    onClick={handleRename}
                    disabled={isUpdating}
                    className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(workspace.name);
                    }}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white">{workspace.name}</h1>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setIsEditingName(true);
                      }}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700"
                      title="Rename"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {/* Role badge */}
                  <span className={clsx(
                    'text-xs px-2 py-1 rounded-full font-medium',
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
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700"
                  title="Copy ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Visibility toggle button (only for editors) */}
          {canEdit && (
            <button
              onClick={handleToggleVisibility}
              disabled={isUpdating}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                workspace.visibility === 'private'
                  ? 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  : 'bg-primary/20 text-primary hover:bg-primary/30'
              )}
            >
              {workspace.visibility === 'private' ? (
                <>
                  <Lock className="w-4 h-4" /> Private
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Public
                </>
              )}
            </button>
          )}
        </div>

        {/* Description field */}
        <div className="p-4 rounded-md border border-dark-700 ">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            {canEdit && !isEditingDescription && (
              <button
                onClick={() => setIsEditingDescription(true)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700"
                title="Edit description"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {isEditingDescription ? (
            <div className="flex items-center gap-2 mt-1">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="flex-1 border border-dark-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={2}
                placeholder="Add a description..."
                disabled={isUpdating}
              />
              <button
                onClick={handleDescriptionUpdate}
                disabled={isUpdating}
                className="p-2 rounded bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditingDescription(false);
                  setEditedDescription(workspace.description || '');
                }}
                className="p-2 rounded text-gray-400 hover:text-white hover:bg-dark-700"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-300 mt-1">
              {workspace.description || <span className="text-gray-500 italic">No description</span>}
            </p>
          )}
        </div>

        {/* Details grid - updated with info tile */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-md border border-dark-700 bg-dark-800/40">
            <p className="text-xs text-gray-500 mb-1">Collections</p>
            <p className="text-sm text-white">{collectionsCount}</p>
          </div>
          <div className="p-4 rounded-md border border-dark-700 bg-dark-800/40">
            <p className="text-xs text-gray-500 mb-1">Info</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-300">
                  Created by: {workspace.createdBy || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-300">
                  Created: {formatDate(workspace.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-300">
                  Updated: {formatDate(workspace.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Members section */}
        <div className="rounded-md border border-dark-700 bg-dark-800/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
            <h2 className="text-sm font-semibold text-gray-300">Members</h2>
            {canManage && (
              <button
                onClick={() => {
                  setShowAddMember(true);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 text-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add member
              </button>
            )}
          </div>

          {loadingMembers ? (
            <div className="p-4 text-center text-gray-500">Loading members...</div>
          ) : (
            <div className="divide-y divide-dark-700/50">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                      {member.userName?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{member.userName}</p>
                      <p className="text-xs text-gray-500">{member.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
{/* Show dropdown only if:
   - current user can manage members (admin/owner)
   - member is not the current user
   - member is NOT the owner (so we never show a dropdown for the owner row)
*/}
{canManage && member.userId !== currentUserId && member.role !== 'owner' ? (
  <select
    value={member.role}
    onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
    className="border border-dark-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-primary"
  >
    <option value="viewer">Viewer</option>
    <option value="editor">Editor</option>
    <option value="admin">Admin</option>
    {isOwner && <option value="owner">Owner</option>}  {/* only owners can assign owner role */}
  </select>
) : (
  <span className={clsx(
    'text-xs px-2 py-1 rounded capitalize',
    member.role === 'owner' && 'bg-red-500/20 text-red-400',
    member.role === 'admin' && 'bg-purple-500/20 text-purple-400',
    member.role === 'editor' && 'bg-blue-500/20 text-blue-400',
    member.role === 'viewer' && 'bg-gray-500/20 text-gray-400'
  )}>
    {member.role}
  </span>
)}
{canManage && member.userId !== currentUserId && member.role !== 'owner' && (
<button
  onClick={(e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setRemoveConfirm({
      x: rect.left,               // align with button's left edge
      y: rect.bottom + 5,          // 5px below the button
      memberId: member.id,
      memberName: member.userName
    });
  }}
  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"
  title="Remove member"
>
  <Trash2 className="w-3.5 h-3.5" />
</button>
)}
                    {member.userId === currentUserId && (
                      <span className="text-xs text-gray-500">(you)</span>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="p-4 text-center text-gray-500">No members</div>
              )}
            </div>
          )}

          {/* Add member form - inline row layout */}
          {showAddMember && (
            <form onSubmit={handleAddMember} className="p-4 border-t border-dark-700">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-32 bg-dark-800 border border-dark-700 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  {isOwner && <option value="owner">Owner</option>}
                </select>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="p-2 rounded bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50"
                  title="Add member"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberEmail('');
                    setNewMemberRole('viewer');
                  }}
                  className="p-2 rounded text-gray-400 hover:text-white hover:bg-dark-700"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
{/* Member Remove Confirmation */}
{removeConfirm && (
  <div
    ref={removeConfirmRef}
    className="fixed z-50 min-w-[180px] p-3 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
    style={{ left: removeConfirm.x, top: removeConfirm.y }}
  >
    <p className="text-xs text-gray-300 mb-3">
      Remove <span className="font-medium text-white">{removeConfirm.memberName}</span> from workspace?
    </p>
    <div className="flex justify-end gap-2">
      <button
        onClick={() => setRemoveConfirm(null)}
        className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-dark-700 hover:bg-dark-600 rounded"
      >
        Cancel
      </button>
      <button
        onClick={async () => {
          await handleRemoveMember(removeConfirm.memberId, removeConfirm.memberName);
          setRemoveConfirm(null);
        }}
        className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
      >
        Remove
      </button>
    </div>
  </div>
)}
        {/* Danger zone - delete button opens modal */}
        {isOwner && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-500/20">
              <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
            </div>
            <div className="p-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                This action cannot be undone. All collections, requests, and data in this project will be permanently deleted.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
{showDeleteModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent backdrop-blur-md"
    onClick={() => {
      if (deleteStage === 'idle' || deleteStage === 'error') {
        setShowDeleteModal(false);
        setDeleteStage('idle');
      }
    }}
  >
    <div
      className={clsx(
        "bg-dark-800 border border-red-500/30 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all duration-300",
        deleteStage === 'success' && "scale-95 opacity-90",
        deleteStage === 'error' && "border-red-600/50"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {deleteStage === 'idle' && (
        <>
          <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Delete Project
          </h3>
<p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete <span className="font-medium text-white">{workspace.name}</span>? This action cannot be undone. All collections, requests, and data will be permanently lost.
            </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-5 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium transition"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}

      {deleteStage === 'deleting' && (
        <div className="py-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 border-4 border-t-red-500 border-red-500/30 rounded-full animate-spin mb-6"></div>
          <h3 className="text-lg font-semibold text-white mb-2">Deleting workspace...</h3>
          <p className="text-sm text-gray-400">This may take a few seconds</p>
        </div>
      )}

      {deleteStage === 'success' && (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-bounce-once">
            <Check className="w-12 h-12 text-green-400" strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-bold text-green-400 mb-2">Deleted!</h3>
          <p className="text-sm text-gray-400">Project removed successfully</p>
        </div>
      )}

      {deleteStage === 'error' && (
        <div className="py-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <X className="w-10 h-10 text-red-400" strokeWidth={3} />
          </div>
          <h3 className="text-xl font-semibold text-red-400 mb-3">Delete failed</h3>
          <p className="text-sm text-gray-300 mb-6">
            Something went wrong. Please try again.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-5 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm"
            >
              Close
            </button>
            <button
              onClick={handleDelete}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm flex items-center gap-2"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}
    </div>
  );
}