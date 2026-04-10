import React, { useState } from 'react';
import { Plus, Edit, Eye, Layers, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import EnvironmentDropdown from './sidebar/EnvironmentDropdown';

export function RightPanelVariables({
  environments,
  activeEnvId,
  globalEnv,
  onNavigateToVariables,
  onCreateEnvironmentWithRedirect,
  onEditEnvironment,
  onActivateEnvironment,
  onShowGlobal,
}) {
  const [viewEnvId, setViewEnvId] = useState(activeEnvId);
  const [showEditList, setShowEditList] = useState(false);

  const filteredEnvs = environments.filter(
    env => env.id === 'no-env' || env.environmentType !== 'global'
  );
  const selectedEnv = filteredEnvs.find(env => env.id === viewEnvId);
  const hasActiveEnv = activeEnvId && activeEnvId !== 'no-env';
  const editableEnvs = filteredEnvs.filter(env => env.id !== 'no-env');

  const handleSelectEnvironment = (envId) => {
    setViewEnvId(envId);
    if (onActivateEnvironment) onActivateEnvironment(envId);
  };

  const handleCreate = () => {
    onCreateEnvironmentWithRedirect();
  };

  const handleEdit = () => {
    setShowEditList(true);
  };

  const handleSelectEditEnv = (envId) => {
    onEditEnvironment(envId);
  };

  const handleBack = () => {
    setShowEditList(false);
  };

  const handleCreateGlobal = () => {
    onShowGlobal();
  };

  const handleViewGlobal = () => {
    onShowGlobal();
  };

  return (
    <div className="w-80 min-w-[18rem] max-w-[20rem] border-l border-dark-700 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
      <div className="shrink-0">
        <div className="px-4 py-4 gap-2 flex items-center border-b border-dark-700">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-xs font-semibold text-white">Environment Variables</h3>
        </div>

        <div className="mb-4 px-4 mt-4">
          <div className="flex gap-2 items-center justify-evenly mb-2">
            <button
              type="button"
              onClick={handleCreate}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="Create new environment"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Create</span>
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="Edit environment"
            >
              <Edit className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Edit</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToVariables}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="View variables"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">View</span>
            </button>
          </div>

          <EnvironmentDropdown
            environments={environments}
            activeEnvironmentId={activeEnvId}
            onSelect={handleSelectEnvironment}
          />
        </div>

        {!showEditList ? (
          <>
            {hasActiveEnv ? (
              <div className="text-xs text-gray-400 mb-1 px-4 pb-2">
                Variables for <span className="font-medium">{selectedEnv?.name}</span>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">No active environment</div>
            )}
            <div className="px-4 text-center py-6 text-gray-500 text-sm">
              Use <strong>Create</strong> to add a new environment.
            </div>
          </>
        ) : (
          <div className="px-2 pb-4">
            <div className="flex items-center gap-2 mb-3 px-2">
              <button
                onClick={handleBack}
                className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-dark-700"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-300">Select environment to edit</span>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {editableEnvs.length > 0 ? (
                editableEnvs.map(env => (
                  <button
                    key={env.id}
                    onClick={() => handleSelectEditEnv(env.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-dark-700 transition-colors"
                  >
                    {env.name}
                  </button>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">
                  No environments available
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-dark-700 mt-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Global Variables</h4>
          <div className="flex gap-2">
            <button
              onClick={handleCreateGlobal}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="Create Global Variables"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Create</span>
            </button>
            <button
              onClick={handleViewGlobal}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="View Global Variables"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">View</span>
            </button>
          </div>
        </div>
        <div className="rounded-sm border border-dark-700 p-4 text-center text-gray-500 text-sm">
          Manage variables that are shared across all projects.
        </div>
      </div>
    </div>
  );
}