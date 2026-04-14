import React, { useState, useEffect, useRef } from 'react';
import { Lock, Edit3, Trash2, Copy, Check, Eye, EyeOff, UserPlus, X, User, Calendar, Clock, Unlock, Mail, Link as LinkIcon, ChevronDown, ChevronRight, RefreshCw, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { updateWorkspace, deleteWorkspace, createInvitation } from '../../services/workspaceService';
import {
  fetchWorkspaceMembers,
  updateWorkspaceMemberRole,
  removeWorkspaceMember
} from '../../services/workspaceMemberService';

const canEditWorkspace = (role) => ['owner', 'admin'].includes(role);
const canManageMembers = (role) => ['owner', 'admin'].includes(role);

// Tooltip component (unchanged)
const Tooltip = ({ children, content }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      });
      setVisible(true);
    }
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="cursor-help border-b border-dotted border-gray-500"
      >
        {children}
      </span>
      {visible && (
        <div
          className="fixed z-50 px-3 py-2 text-xs bg-gray-900 text-white rounded-md shadow-lg pointer-events-none transition-opacity duration-150"
          style={{
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-50%)',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

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

  // Editable extra fields
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(workspace?.workspaceEmail || '');
  const [isEditingOrgId, setIsEditingOrgId] = useState(false);
  const [editedOrgId, setEditedOrgId] = useState(workspace?.organizationId || '');
  const [isEditingSme, setIsEditingSme] = useState(false);
  const [editedSme, setEditedSme] = useState(workspace?.projectSme || '');

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const [copyIdSuccess, setCopyIdSuccess] = useState(false);
  const [copyingInvLinkId, setCopyingInvLinkId] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState(null);

  const currentUserMember = members.find(m => m.userId === currentUserId);
  const currentUserRole = currentUserMember?.role || 'viewer';

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
          userFullName: 'You',
          userEmail: '',
          role: 'owner',
          invitationStatus: 'active',
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
    setCopyIdSuccess(true);
    toast.success('Project ID copied');
    setTimeout(() => setCopyIdSuccess(false), 2000);
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

const handleEmailSave = async () => {
  const trimmed = editedEmail.trim();
  const original = workspace.workspaceEmail || '';

  // If empty or unchanged → just close edit mode, no save
  if (trimmed === '' || trimmed === original) {
    setEditedEmail(original);
    setIsEditingEmail(false);
    return;
  }

  setIsUpdating(true);
  try {
    await updateWorkspace(workspace.id, { workspaceEmail: trimmed });
    toast.success('Email updated');
    onWorkspaceUpdate?.({ ...workspace, workspaceEmail: trimmed });
    setIsEditingEmail(false);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Update failed');
  } finally {
    setIsUpdating(false);
  }
};

const handleOrgIdSave = async () => {
  const trimmed = editedOrgId.trim();
  const original = workspace.organizationId || '';

  if (trimmed === '' || trimmed === original) {
    setEditedOrgId(original);
    setIsEditingOrgId(false);
    return;
  }

  setIsUpdating(true);
  try {
    await updateWorkspace(workspace.id, { organizationId: trimmed });
    toast.success('Organization ID updated');
    onWorkspaceUpdate?.({ ...workspace, organizationId: trimmed });
    setIsEditingOrgId(false);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Update failed');
  } finally {
    setIsUpdating(false);
  }
};

const handleSmeSave = async () => {
  const trimmed = editedSme.trim();
  const original = workspace.projectSme || '';

  if (trimmed === '' || trimmed === original) {
    setEditedSme(original);
    setIsEditingSme(false);
    return;
  }

  setIsUpdating(true);
  try {
    await updateWorkspace(workspace.id, { projectSme: trimmed });
    toast.success('Project SME updated');
    onWorkspaceUpdate?.({ ...workspace, projectSme: trimmed });
    setIsEditingSme(false);
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

  const handleGenerateInviteLink = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email address is required');
      return;
    }
    setGeneratingLink(true);
    try {
      const response = await createInvitation(workspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setGeneratedLink(response.invitationLink);
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      await loadMembers();
      const newPending = members.find(m => m.invitedEmail === inviteEmail.trim() && m.invitationStatus === 'pending');
      if (newPending) setExpandedId(newPending.id);
      setInviteEmail('');
      setInviteRole('viewer');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate invitation');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopySuccess(true);
    toast.success('Invitation link copied to clipboard');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRevokeInvitation = async (memberId, email) => {
    try {
      await removeWorkspaceMember(workspace.id, memberId);
      toast.success(`Invitation revoked for ${email}`);
      loadMembers();
      if (expandedId === memberId) setExpandedId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (invitation) => {
    const now = new Date();
    const expiresAt = invitation.tokenExpiresAt ? new Date(invitation.tokenExpiresAt) : null;
    const isExpired = !expiresAt || expiresAt < now;

    if (!isExpired) {
      const existingLink = `${window.location.origin}/accept-invitation?token=${invitation.invitationToken}`;
      toast.info(
        <div className="flex flex-col gap-2">
          <p className="text-sm">Email invitations are currently unavailable. Please use the invitation link below to invite members</p>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    try {
      const response = await createInvitation(workspace.id, {
        email: invitation.invitedEmail || invitation.userEmail,
        role: invitation.role,
      });
      toast.success(`New invitation sent to ${invitation.invitedEmail || invitation.userEmail}`);
      await loadMembers();
      const newPending = members.find(m => m.invitedEmail === (invitation.invitedEmail || invitation.userEmail) && m.invitationStatus === 'pending');
      if (newPending) setExpandedId(newPending.id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to process your request. Please try again later.');
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await updateWorkspaceMemberRole(workspace.id, memberId, { role: newRole });
      toast.success('Member role updated');
      loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Role update failed');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (window.confirm(`Remove ${memberName} from workspace?`)) {
      try {
        await removeWorkspaceMember(workspace.id, memberId);
        toast.success(`Member ${memberName} removed`);
        loadMembers();
        if (expandedId === memberId) setExpandedId(null);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to remove member');
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const getAdjustedPosition = (x, y, modalWidth = 220, modalHeight = 100) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = x;
    let top = y + 5;

    if (left + modalWidth > viewportWidth) {
      left = viewportWidth - modalWidth - 10;
    }
    if (left < 10) left = 10;
    if (top + modalHeight > viewportHeight) {
      top = y - modalHeight - 5;
    }
    if (top < 10) top = 10;
    return { left, top };
  };

  if (!workspace) return <div className="p-6 text-gray-400">Project not found</div>;

  const canEdit = canEditWorkspace(currentUserRole);
  const canManage = canManageMembers(currentUserRole);
  const isOwner = currentUserRole === 'owner';
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString() : '—';

  const activeMembers = members.filter(m => m.invitationStatus === 'active');
  const pendingInvitations = members.filter(m => m.invitationStatus === 'pending');
  const rejectedOrRevoked = members.filter(m => m.invitationStatus === 'rejected' || m.invitationStatus === 'revoked');

  const roleBadgeClass = (role) => {
    switch (role) {
      case 'owner': return 'bg-red-500/20 text-red-400';
      case 'admin': return 'bg-purple-500/20 text-purple-400';
      case 'editor': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const statusBadge = (status, role) => {
    if (status === 'active') {
      if (role === 'owner') return null;
      return { label: 'Active', color: 'bg-green-500/20 text-green-400' };
    }
    if (status === 'pending') return { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' };
    if (status === 'rejected') return { label: 'Rejected', color: 'bg-red-500/20 text-red-400' };
    if (status === 'revoked') return { label: 'Revoked', color: 'bg-gray-500/20 text-gray-400' };
    return null;
  };

  const getInvitedByTooltipContent = (invitedBy) => {
    if (!invitedBy) return null;
    return (
      <div className="space-y-1">
        {invitedBy.username && <div>Username: {invitedBy.username}</div>}
        {invitedBy.email && <div>Email: {invitedBy.email}</div>}
      </div>
    );
  };

  // Helper to save any ongoing edit
  const saveActiveEdit = () => {
    if (isEditingDescription) {
      handleDescriptionUpdate();
    } else if (isEditingEmail) {
      handleEmailSave();
    } else if (isEditingOrgId) {
      handleOrgIdSave();
    } else if (isEditingSme) {
      handleSmeSave();
    }
  };

  // Cancel all edits (no save)
  const cancelAllEdits = () => {
    if (isEditingDescription) {
      setIsEditingDescription(false);
      setEditedDescription(workspace.description || '');
    }
    if (isEditingEmail) {
      setIsEditingEmail(false);
      setEditedEmail(workspace.workspaceEmail || '');
    }
    if (isEditingOrgId) {
      setIsEditingOrgId(false);
      setEditedOrgId(workspace.organizationId || '');
    }
    if (isEditingSme) {
      setIsEditingSme(false);
      setEditedSme(workspace.projectSme || '');
    }
  };

  // Start editing a field – save any other open edit first
  const startEdit = (field) => {
    saveActiveEdit(); // save any current edit
    // Then start the new edit
    if (field === 'description') {
      setEditedDescription(workspace.description || '');
      setIsEditingDescription(true);
    } else if (field === 'email') {
      setEditedEmail(workspace.workspaceEmail || '');
      setIsEditingEmail(true);
    } else if (field === 'orgId') {
      setEditedOrgId(workspace.organizationId || '');
      setIsEditingOrgId(true);
    } else if (field === 'sme') {
      setEditedSme(workspace.projectSme || '');
      setIsEditingSme(true);
    }
  };

  // Global click outside – save active edit (not cancel)
  const editContainerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (editContainerRef.current && !editContainerRef.current.contains(e.target)) {
        saveActiveEdit();
      }
    };
    if (isEditingDescription || isEditingEmail || isEditingOrgId || isEditingSme) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingDescription, isEditingEmail, isEditingOrgId, isEditingSme]);

  // Escape key – cancel edits (no save)
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cancelAllEdits();
      }
    };
    if (isEditingDescription || isEditingEmail || isEditingOrgId || isEditingSme) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isEditingDescription, isEditingEmail, isEditingOrgId, isEditingSme]);

  return (
    <div className="flex-1 overflow-y-auto p-6" ref={editContainerRef}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {workspace.visibility === 'private' ? <Lock className="w-8 h-8 text-gray-400" /> : <Unlock className="w-8 h-8 text-primary" />}
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="border border-primary/50 rounded px-2 py-1 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary" autoFocus disabled={isUpdating} />
                  <button onClick={handleRename} disabled={isUpdating} className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setIsEditingName(false); setEditedName(workspace.name); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white">{workspace.name}</h1>
                  {canEdit && <button onClick={() => setIsEditingName(true)} className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700"><Edit3 className="w-4 h-4" /></button>}
                  <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', roleBadgeClass(currentUserRole))}>
                    {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-gray-500">{workspace.id}</span>
                <button onClick={handleCopyId} className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-700">
                  {copyIdSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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

        {/* Description fieldset */}
        <fieldset className="p-4 rounded-md border border-dark-700">
          <legend className="text-xs text-gray-500 px-2 -ml-1">Description</legend>
          {isEditingDescription ? (
            <div className="flex items-center gap-2 mt-1">
              <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="flex-1 border border-dark-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30" rows={2} disabled={isUpdating} />
              <button onClick={handleDescriptionUpdate} disabled={isUpdating} className="p-2 rounded bg-primary/20 text-primary hover:bg-primary/30">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelAllEdits} className="p-2 rounded text-gray-400 hover:text-white hover:bg-dark-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300 flex-1">{workspace.description || <span className="text-gray-500 italic">No description</span>}</p>
              {canEdit && (
                <button onClick={() => startEdit('description')} className="text-gray-400 hover:text-white mt-0.5">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </fieldset>

        {/* Email fieldset */}
        <fieldset className="p-4 rounded-md border border-dark-700 bg-probestack-bg">
          <legend className="text-xs text-gray-500 px-2 -ml-1">Email</legend>
          {isEditingEmail ? (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="flex-1 bg-probestack-bg border border-primary/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                  autoFocus
                />
                <button onClick={handleEmailSave} className="text-primary hover:text-primary/80">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelAllEdits} className="text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="text-gray-300 flex-1">{workspace.workspaceEmail || <span className="text-gray-500 italic">Not set</span>}</span>
              </div>
              {canEdit && (
                <button onClick={() => startEdit('email')} className="text-gray-400 hover:text-white">
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </fieldset>

        {/* Two‑column row for Organization ID and Project SME */}
        <div className="grid grid-cols-2 gap-4">
          {/* Organization ID fieldset */}
          <fieldset className="p-4 rounded-md border border-dark-700 bg-probestack-bg">
            <legend className="text-xs text-gray-500 px-2 -ml-1">Organization ID</legend>
            {isEditingOrgId ? (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editedOrgId}
                    onChange={(e) => setEditedOrgId(e.target.value)}
                    className="flex-1 bg-probestack-bg border border-primary/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleOrgIdSave} className="text-primary hover:text-primary/80">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={cancelAllEdits} className="text-gray-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-gray-300 flex-1">{workspace.organizationId || <span className="text-gray-500 italic">Not set</span>}</span>
                </div>
                {canEdit && (
                  <button onClick={() => startEdit('orgId')} className="text-gray-400 hover:text-white">
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </fieldset>

          {/* Project SME fieldset */}
          <fieldset className="p-4 rounded-md border border-dark-700 bg-probestack-bg">
            <legend className="text-xs text-gray-500 px-2 -ml-1">Project SME</legend>
            {isEditingSme ? (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editedSme}
                    onChange={(e) => setEditedSme(e.target.value)}
                    className="flex-1 bg-probestack-bg border border-primary/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleSmeSave} className="text-primary hover:text-primary/80">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={cancelAllEdits} className="text-gray-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-gray-300 flex-1">{workspace.projectSme || <span className="text-gray-500 italic">Not set</span>}</span>
                </div>
                {canEdit && (
                  <button onClick={() => startEdit('sme')} className="text-gray-400 hover:text-white">
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </fieldset>
        </div>

        {/* Original two‑column grid (Collections | Info) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-md border border-dark-700 bg-probestack-bg">
            <p className="text-xs text-gray-500 mb-1">Collections</p>
            <p className="text-sm text-white">{collectionsCount}</p>
          </div>
          <div className="p-4 rounded-md border border-dark-700 bg-probestack-bg">
            <p className="text-xs text-gray-500 mb-1">Info</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-300">Created by: {workspace.createdBy || '—'}</span></div>
              <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-300">Created: {formatDate(workspace.createdAt)}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-300">Updated: {formatDate(workspace.updatedAt)}</span></div>
            </div>
          </div>
        </div>

        {/* Shared Access section (unchanged) */}
        <div className="rounded-md border border-dark-700 bg-probestack-bg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
            <div><h2 className="text-sm font-semibold text-gray-300">Shared Access</h2><p className="text-xs text-gray-500 mt-0.5">Invite members by generating a shareable link</p></div>
            {canManage && (
              <button onClick={() => { setShowInviteForm(!showInviteForm); if (!showInviteForm) setGeneratedLink(null); }} className="flex items-center gap-1 px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 text-xs cursor-pointer">
                <UserPlus className="w-3.5 h-3.5" /> Invite member
              </button>
            )}
          </div>

          {loadingMembers ? (
            <div className="p-4 text-center text-gray-500">Loading members...</div>
          ) : (
            <div className="divide-y divide-dark-700">
              {/* Active Members – same as before */}
              {activeMembers.map((member) => {
                const isExpanded = expandedId === member.id;
                const isCurrentUser = member.userId === currentUserId;
                const statusInfo = statusBadge(member.invitationStatus, member.role);
                const headerBg = isExpanded ? 'bg-dark-800/30' : (member.role === 'owner' ? 'bg-probestack-bg' : 'bg-dark-800/20');
                return (
                  <div key={member.id} className="transition-all duration-200">
                    <div
                      className={clsx('flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-dark-700/30', headerBg)}
                      onClick={() => toggleExpand(member.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                          {member.userFullName?.[0] || member.userEmail?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{member.userFullName || member.userUsername || member.userEmail}</p>
                          <p className="text-xs text-gray-500">{member.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusInfo && <span className={clsx('text-xs px-2 py-0.5 rounded-full', statusInfo.color)}>{statusInfo.label}</span>}
                        {member.invitationStatus === 'active' && member.role !== 'owner' && canManage && !isCurrentUser ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                            className={clsx('text-xs px-2 py-0.5 rounded-full border border-dark-600 bg-dark-700 cursor-pointer', roleBadgeClass(member.role))}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                            <option value="admin">admin</option>
                            {isOwner && <option value="owner">owner</option>}
                          </select>
                        ) : (
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full', roleBadgeClass(member.role))}>
                            {member.role}
                          </span>
                        )}
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" /> : <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200" />}
                      </div>
                    </div>
                    <div className={clsx(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                      <div className="px-4 pb-2 pt-2 border-t border-dark-700/50 bg-dark-800/10">
                        <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                          {member.joinedAt && <div><span className="text-gray-500">Joined at:</span> <span className='text-gray-300/90'>{formatDate(member.joinedAt)}</span></div>}
                          {member.invitedAt && <div><span className="text-gray-500">Invited at:</span> <span className='text-gray-300/90'>{formatDate(member.invitedAt)}</span></div>}
                          {member.invitedBy && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Invited by:</span>{' '}
                              <Tooltip content={getInvitedByTooltipContent(member.invitedBy)}>
                                <span className="border-b border-dotted border-gray-500 cursor-help text-gray-300/90">
                                  {member.invitedBy.fullName}
                                </span>
                              </Tooltip>
                            </div>
                          )}
                          <div className="col-span-2 flex justify-end gap-2 mt-2">
                            {canManage && !isCurrentUser && member.role !== 'owner' && (
                              <button onClick={() => handleRemoveMember(member.id, member.userFullName)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer"><Trash2 className="w-3 h-3" /> Remove</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pending Invitations – same as before */}
              {pendingInvitations.map((inv) => {
                const isExpanded = expandedId === inv.id;
                const invitationLink = inv.invitationToken ? `${window.location.origin}/accept-invitation?token=${inv.invitationToken}` : '';
                const statusInfo = statusBadge('pending');
                const headerBg = isExpanded ? 'bg-dark-800/30' : 'bg-dark-800/20';
                return (
                  <div key={inv.id} className="transition-all duration-200">
                    <div
                      className={clsx('flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-dark-700/30', headerBg)}
                      onClick={() => toggleExpand(inv.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold uppercase">
                          {inv.invitedEmail?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-300">{inv.invitedEmail}</p>
                          <p className="text-xs text-yellow-400">Yet to join</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full', statusInfo.color)}>{statusInfo.label}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full', roleBadgeClass(inv.role))}>
                          {inv.role}
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" /> : <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200" />}
                      </div>
                    </div>
                    <div className={clsx(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                      <div className="px-4 pb-3 pt-1 border-t border-dark-700/50 bg-probestack-bg">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div><span className="text-gray-500">Joined at:</span> <span className="text-gray-300/90">Not joined yet</span></div>
                          <div>
                            <span className="text-gray-500">Invited by:</span>{' '}
                            <Tooltip content={getInvitedByTooltipContent(inv.invitedBy)}>
                              <span className="border-b border-dotted border-gray-500 cursor-help text-gray-300/90">
                                {inv.invitedBy?.fullName || 'Unknown'}
                              </span>
                            </Tooltip>
                          </div>
                          <div><span className="text-gray-500">Invited at:</span> <span className="text-gray-300/90">{formatDate(inv.invitedAt)}</span></div>
                          {invitationLink && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Invitation link:</span>
                              <div className="flex items-center gap-2 mt-1 w-full">
                                <code className="flex-1 text-xs text-gray-300/90 bg-probestack-bg border border-dark-700 px-2 py-1 rounded-md truncate">
                                  {invitationLink}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(invitationLink);
                                    setCopyingInvLinkId(inv.id);
                                    toast.success('Link copied');
                                    setTimeout(() => setCopyingInvLinkId(null), 2000);
                                  }}
                                  className="text-primary shrink-0 cursor-pointer"
                                >
                                  {copyingInvLinkId === inv.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                              <p className="text-xs text-gray-300/90 mt-1">
                                ⚠️ This invitation link will expire on {formatDate(inv.tokenExpiresAt)}. 
                                After expiry, please generate a new invitation.
                              </p>
                            </div>
                          )}
                          <div className="col-span-2 flex justify-end gap-2 mt-2">
                            <button onClick={() => handleResendInvitation(inv)} className="text-primary hover:text-primary/80 text-xs flex items-center gap-1 cursor-pointer"><RefreshCw className="w-3 h-3" /> Resend Invitation</button>
                            {canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRevokeConfirm({
                                    memberId: inv.id,
                                    email: inv.invitedEmail,
                                    x: rect.left,
                                    y: rect.bottom + 5,
                                  });
                                }}
                                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Rejected/Revoked – same as before */}
              {rejectedOrRevoked.map((inv) => {
                const isExpanded = expandedId === inv.id;
                const statusText = inv.invitationStatus === 'rejected' ? 'Rejected' : 'Revoked';
                const statusInfo = statusBadge(inv.invitationStatus);
                const invitationLink = inv.invitationToken ? `${window.location.origin}/accept-invitation?token=${inv.invitationToken}` : '';
                const isRejected = inv.invitationStatus === 'rejected';
                const headerBg = isExpanded ? 'bg-dark-800/30' : 'bg-dark-800/10';
                return (
                  <div key={inv.id} className="transition-all duration-200">
                    <div
                      className={clsx('flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-dark-700/30', headerBg)}
                      onClick={() => toggleExpand(inv.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold uppercase">
                          {inv.invitedEmail?.[0] || inv.userEmail?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-400">{inv.invitedEmail || inv.userEmail}</p>
                          <p className="text-xs text-red-400">{statusText}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full', statusInfo.color)}>{statusInfo.label}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full', roleBadgeClass(inv.role))}>
                          {inv.role}
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" /> : <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200" />}
                      </div>
                    </div>
                    <div className={clsx(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                      <div className="px-4 pb-3 pt-1 border-t border-dark-700/50 bg-probestack-bg">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-gray-500">Invited at:</span> {formatDate(inv.invitedAt)}</div>
                          <div><span className="text-gray-500">{isRejected ? 'Rejected at' : 'Revoked at'}:</span> {formatDate(inv.updatedAt)}</div>
                          <div>
                            <span className="text-gray-500">Invited by:</span>{' '}
                            <Tooltip content={getInvitedByTooltipContent(inv.invitedBy)}>
                              <span className="border-b border-dotted border-gray-500 cursor-help text-gray-300/90">
                                {inv.invitedBy?.fullName || 'Unknown'}
                              </span>
                            </Tooltip>
                          </div>
                          <div><span className="text-gray-500">Joined at:</span> <span className="text-gray-300/90">Never joined</span></div>
                          {invitationLink && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Invitation link:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs p-1 rounded truncate flex-1">{invitationLink}</code>
                                <button onClick={() => { 
                                    navigator.clipboard.writeText(invitationLink);
                                    setCopyingInvLinkId(inv.id);
                                    toast.success('Link copied');
                                    setTimeout(() => setCopyingInvLinkId(null), 2000);
                                  }} 
                                  className="text-primary cursor-pointer">
                                  {copyingInvLinkId === inv.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">⚠️ This invitation link is no longer valid (expired or revoked). Generate a new invitation to resend.</p>
                            </div>
                          )}
                          <div className="col-span-2 flex justify-end gap-2 mt-2">
                            <button onClick={() => handleResendInvitation(inv)} className="text-primary hover:text-primary/80 text-xs flex items-center gap-1 cursor-pointer"><RefreshCw className="w-3 h-3" /> Resend Invitation</button>
                            {canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRevokeConfirm({
                                    memberId: inv.id,
                                    email: inv.invitedEmail || inv.userEmail,
                                    x: rect.left,
                                    y: rect.bottom + 5,
                                  });
                                }}
                                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {members.length === 0 && <div className="p-4 text-center text-gray-500">No members or invitations</div>}
            </div>
          )}

          {/* Invite form */}
          {showInviteForm && (
            <div className="p-4 border-t border-dark-700 space-y-3">
              <div className="flex items-center gap-2">
                <input type="email" placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-32 bg-dark-800 border border-dark-700 rounded px-3 py-2 text-sm text-gray-300 cursor-pointer">
                  <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option>{isOwner && <option value="owner">Owner</option>}
                </select>
                <button onClick={handleGenerateInviteLink} disabled={generatingLink} className="p-2 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"><LinkIcon className="w-4 h-4" /></button>
                <button onClick={() => { setShowInviteForm(false); setInviteEmail(''); setInviteRole('viewer'); setGeneratedLink(null); }} className="p-2 rounded text-gray-400 hover:text-white hover:bg-dark-700 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              {generatedLink && (
                <div className="mt-3 p-2 bg-dark-700 rounded flex items-center justify-between">
                  <code className="text-xs truncate">{generatedLink}</code>
                  <button onClick={copyLink} className="text-primary hover:text-primary/80 ml-2 cursor-pointer">{copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                </div>
              )}
              <p className="text-xs text-gray-500">The invited user must click the link and accept the invitation.</p>
            </div>
          )}
        </div>

        {/* Danger zone */}
        {isOwner && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-500/20"><h2 className="text-sm font-semibold text-red-400">Danger Zone</h2></div>
            <div className="p-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">This action cannot be undone. All collections, requests, and data will be permanently deleted.</p>
              <button onClick={() => setShowDeleteModal(true)} disabled={isUpdating} className="flex items-center gap-2 px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm font-medium cursor-pointer"><Trash2 className="w-4 h-4" /> Delete project</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent backdrop-blur-md" onClick={() => { if (deleteStage === 'idle' || deleteStage === 'error') { setShowDeleteModal(false); setDeleteStage('idle'); } }}>
          <div className={clsx("bg-dark-800 border border-red-500/30 rounded-lg shadow-xl max-w-md w-full p-6", deleteStage === 'success' && "scale-95 opacity-90", deleteStage === 'error' && "border-red-600/50")} onClick={(e) => e.stopPropagation()}>
            {deleteStage === 'idle' && (
              <>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-400" /> Delete Project</h3>
                <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete <span className="font-medium text-white">{workspace.name}</span>? This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowDeleteModal(false)} className="px-5 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium cursor-pointer">Cancel</button>
                  <button onClick={handleDelete} disabled={isUpdating} className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" /> Delete</button>
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
              <div className="py-10 text-center"><div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6"><X className="w-10 h-10 text-red-400" /></div><h3 className="text-xl font-semibold text-red-400 mb-3">Delete failed</h3><p className="text-sm text-gray-300 mb-6">Something went wrong. Please try again.</p><div className="flex gap-3 justify-center"><button onClick={() => setShowDeleteModal(false)} className="px-5 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 cursor-pointer">Close</button><button onClick={handleDelete} className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer">Retry</button></div></div>
            )}
          </div>
        </div>
      )}

      {/* Small Revoke Confirmation Modal */}
      {revokeConfirm && (
        <div
          className="fixed z-50 min-w-[200px] p-3 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
          style={getAdjustedPosition(revokeConfirm.x, revokeConfirm.y, 200, 90)}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-gray-300 mb-3">
            Revoke invitation for <span className="font-medium text-white">{revokeConfirm.email}</span>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRevokeConfirm(null)}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-dark-700 hover:bg-dark-600 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await handleRevokeInvitation(revokeConfirm.memberId, revokeConfirm.email);
                setRevokeConfirm(null);
              }}
              className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer"
            >
              Revoke
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
