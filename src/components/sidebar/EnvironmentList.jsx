import React, { useState, useRef, useEffect } from 'react';
import { Save, Plus, MoreVertical, Check, Circle, Edit3, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

export default function EnvironmentList({
  environments,
  selectedEnvironment,
  onEnvironmentChange,
  variablesScope,
  setVariablesScope,
  variablesSavedMessage,
  showVariablesSaved,
  onSaveEnvironmentVariables,
  onSaveGlobalVariables,
  onCreateEnvironment,
  onActivateEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  environmentVariablesDirty,
    globalEnvironment,
  globalVariablesDirty,
  onGlobalVariablesChange,
}) {
  const [menu, setMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { envId, x, y }
  const [renamingEnvId, setRenamingEnvId] = useState(null);
  const [newName, setNewName] = useState('');
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const confirmRef = useRef(null); // ref for confirmation popup

  useEffect(() => {
    if (renamingEnvId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [renamingEnvId]);

  // Outside click for context menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menu && !menuRef.current?.contains(e.target)) {
        const button = document.querySelector(`[data-env-menu-btn="${menu.envId}"]`);
        if (!button?.contains(e.target)) {
          setMenu(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menu]);

  // Outside click for confirmation popup
  useEffect(() => {
    const handleClickOutsideConfirm = (e) => {
      if (confirmDelete && !confirmRef.current?.contains(e.target)) {
        setConfirmDelete(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideConfirm);
    return () => document.removeEventListener('mousedown', handleClickOutsideConfirm);
  }, [confirmDelete]);

  const handleMenuOpen = (e, envId) => {
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, envId });
  };

  const handleMenuClose = () => setMenu(null);

  const handleMenuAction = (action, envId) => {
    switch (action) {
      case 'activate':
        onActivateEnvironment?.(envId);
        handleMenuClose();
        break;
      case 'rename': {
        const env = environments.find(e => e.id === envId);
        if (env) {
          setRenamingEnvId(envId);
          setNewName(env.name);
        }
        handleMenuClose();
        break;
      }
      case 'delete':
        // Open confirmation popup at menu position, then close menu
        if (menu) {
          setConfirmDelete({ envId, x: menu.x, y: menu.y });
          setMenu(null);
        }
        break;
      default:
        handleMenuClose();
        break;
    }
  };

  const handleRenameSubmit = (envId) => {
    if (newName.trim() && newName !== environments.find(e => e.id === envId)?.name) {
      onRenameEnvironment?.(envId, newName.trim());
    }
    setRenamingEnvId(null);
    setNewName('');
  };

  const handleRenameCancel = () => {
    setRenamingEnvId(null);
    setNewName('');
  };

  const handleCreateEnvironment = () => {
    onCreateEnvironment?.('New Environment');
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Environment Scope Header with + icon */}
      <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-3">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-gray-500">
          <span>Environment Scope</span>
          <button
            type="button"
            onClick={handleCreateEnvironment}
            className="p-1 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
            title="Create new environment"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Environment List – directly after header */}
        {environments.filter(env => env.id !== 'no-env' && env.environmentType !== 'global').length > 0 && (
          <div className="mt-2 space-y-1">
            {environments.filter(env => env.id !== 'no-env' && env.environmentType !== 'global').map(env => (
              <div
                key={env.id}
                onClick={() => {
                  if (renamingEnvId !== env.id) {
                    onEnvironmentChange(env.id);
                    setVariablesScope('environment-scope');
                  }
                }}
                className={clsx(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                  selectedEnvironment === env.id && renamingEnvId !== env.id
                    ? 'bg-primary/15 text-primary'
                    : 'hover:bg-dark-700 text-gray-300'
                )}
              >
                {/* Activate button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!env.isActive) {
                      onActivateEnvironment?.(env.id);
                    }
                  }}
                  className="w-4 h-4 flex items-center justify-center focus:outline-none hover:scale-110 transition-transform"
                  title={env.isActive ? 'Active' : 'Activate'}
                >
                  {env.isActive ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-500 hover:text-primary transition-colors" />
                  )}
                </button>

                {renamingEnvId === env.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRenameSubmit(env.id);
                        } else if (e.key === 'Escape') {
                          handleRenameCancel();
                        }
                      }}
                      onBlur={() => handleRenameSubmit(env.id)}
                      className="flex-1 bg-dark-900 border border-primary/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameCancel();
                      }}
                      className="p-1 rounded hover:bg-dark-600 text-gray-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{env.name}</div>
                      {env.workspaceId && (
                        <div className="text-[10px] text-gray-500 truncate">Workspace</div>
                      )}
                    </div>

                    {/* Save icon – only when dirty and this env is selected */}
                    {selectedEnvironment === env.id && environmentVariablesDirty && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveEnvironmentVariables?.();
                        }}
                        className="p-1 rounded hover:bg-dark-600 text-gray-400 hover:text-primary"
                        title="Save changes"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    )}

                    {/* "Saved" indicator */}
                    {variablesSavedMessage === 'environment' && selectedEnvironment === env.id && (
                      <span className="text-xs text-primary mr-1">Saved</span>
                    )}

                    {/* Three‑dot menu */}
                    <button
                      onClick={(e) => handleMenuOpen(e, env.id)}
                      data-env-menu-btn={env.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-dark-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Scope Card */}
      <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-3 mt-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
          Global Scope
        </div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setVariablesScope('global-scope')}
            className={clsx(
              'w-full flex items-center justify-between gap-2 text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              variablesScope === 'global-scope'
                ? 'bg-primary/15 text-primary border border-primary/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-dark-800 border border-transparent'
            )}
          >
            <span>Global Scope</span>
            <span className="flex items-center gap-2 shrink-0">
              {variablesSavedMessage === 'global' && (
                <span className="text-xs font-medium text-primary">Saved</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveGlobalVariables?.();
                  showVariablesSaved('global');
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Save global variables"
              >
                <Save className="w-4 h-4" />
              </button>
            </span>
          </button>
        </div>
      </div>

      {/* Three-dot context menu */}
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[140px] py-1 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={() => handleMenuAction('activate', menu.envId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-700"
          >
            <Check className="w-4 h-4" />
            Activate
          </button>
          <button
            onClick={() => handleMenuAction('rename', menu.envId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-700"
          >
            <Edit3 className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => handleMenuAction('delete', menu.envId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {confirmDelete && (
        <div
          ref={confirmRef}
          className="fixed z-50 min-w-[180px] p-3 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
          style={{ left: confirmDelete.x, top: confirmDelete.y }}
        >
          <p className="text-xs text-gray-300 mb-3">Delete this environment?</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-dark-700 hover:bg-dark-600 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDeleteEnvironment?.(confirmDelete.envId);
                setConfirmDelete(null);
              }}
              className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}