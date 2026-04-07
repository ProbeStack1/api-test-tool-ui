import React from 'react';
import { Plus, Edit, Eye, Layers } from 'lucide-react';
import clsx from "clsx";

export function RightPanelVariables({ environments, activeEnvId, onNavigateToVariables, onActivateEnvironment }) {
  // Find the active environment object
  const activeEnv = environments.find(env => env.id === activeEnvId);
  const activeEnvName = activeEnv ? activeEnv.name : 'No active environment';

  // Optional: if you still need to handle activation from somewhere else, you can keep onActivateEnvironment
  // but since there's no dropdown, it might not be used. We'll keep it in props for consistency.

  return (
    <div className="w-80 min-w-[18rem] max-w-[20rem] border-l border-dark-700 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
      <div className="shrink-0">
        <div className="px-4 py-4 gap-2 flex items-center border-b border-dark-700">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-white">Environment Variables</h3>
        </div>

        <div className="mb-4 px-4 mt-4">
          <div className="flex gap-2 items-center justify-evenly mb-2">
            {/* Create button */}
            <button
              type="button"
              onClick={onNavigateToVariables}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="Create new variable"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Create</span>
            </button>
            {/* Edit button */}
            <button
              type="button"
              onClick={onNavigateToVariables}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="Edit variables"
            >
              <Edit className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Edit</span>
            </button>
            {/* View button */}
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

          {/* Display active environment name instead of dropdown */}
          <div className="mt-3 p-2 rounded-md bg-dark-800/50 border border-dark-700 text-center">
            <div className="text-xs text-gray-400">Active Environment</div>
            <div className="text-sm font-medium text-white mt-0.5">{activeEnvName}</div>
          </div>
        </div>

        <div className="px-4 text-center py-6 text-gray-500 text-sm">
          Manage environment and global variables using the buttons above.
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Global Variables</h4>
        </div>
        <div className="rounded-sm border border-dark-700 p-4 text-center text-gray-500 text-sm">
          Use the <strong>View</strong> button to manage global variables.
        </div>
      </div>
    </div>
  );
}