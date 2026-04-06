import React, { useState } from 'react';
import { Plus, Edit, Eye, Layers } from 'lucide-react';
import EnvironmentDropdown from './sidebar/EnvironmentDropdown';

export function RightPanelVariables({ environments, activeEnvId, globalEnv, onNavigateToVariables, onActivateEnvironment }) {
  const [viewEnvId, setViewEnvId] = useState(activeEnvId);
  
  // Filter out global environments – only workspace‑specific and 'no-env'
  const filteredEnvs = environments.filter(env => env.id === 'no-env' || env.environmentType !== 'global');
  
  const selectedEnv = filteredEnvs.find(env => env.id === viewEnvId);
  const isNoEnv = !selectedEnv || selectedEnv.id === 'no-env';
  
  // Filter out variables with empty keys
  const envVariables = (isNoEnv ? [] : (selectedEnv?.variables || [])).filter(v => v.key && v.key.trim() !== '');
  const globalVariables = (globalEnv?.variables || []).filter(v => v.key && v.key.trim() !== '');

  const handleSelectEnvironment = (envId) => {
    setViewEnvId(envId);
    if (onActivateEnvironment) {
      onActivateEnvironment(envId);
    }
  };

  const hasActiveEnv = activeEnvId && activeEnvId !== 'no-env';

  return (
    <div className="w-80 min-w-[18rem] max-w-[20rem] border-l border-dark-700 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
      <div className="shrink-0">
        <div className="px-4 py-4 gap-2 flex items-center  border-b border-dark-700">
            <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-white">Environment Variables</h3>
   
        </div>

        <div className="mb-4 px-4 mt-4">
                   <div className="flex gap-2 display-flex items-center justify-evenly mb-2">
            <button
              type="button"
              onClick={onNavigateToVariables}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="Create new variable"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Create</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToVariables}
              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
              title="Edit variables"
            >
              <Edit className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Edit</span>
            </button>
          </div>
          <EnvironmentDropdown
            environments={environments}
            activeEnvironmentId={activeEnvId}
            onSelect={handleSelectEnvironment}
          />
        </div>

        {hasActiveEnv ? (
          <>
            <div className="text-xs text-gray-400 mb-1 px-4 pb-2">
              Variables for <span className="font-medium">{selectedEnv?.name}</span>
            </div>
            {envVariables.length > 0 ? (
              <div className="px-4">
                <div className="rounded-sm border border-dark-700 overflow-auto max-h-48">
                  <table className="w-full text-sm">
                    <tbody>
                      {envVariables.map((v, idx) => (
                        <tr key={idx} className="border-b border-dark-700 last:border-0">
                          <td className="py-2 px-3 text-gray-300 font-mono break-all">{v.key}</td>
                          <td className="py-2 px-3 text-gray-400 break-all">{v.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-2 px-4">No variables defined for this environment</div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">No active environment</div>
        )}
      </div>

      <div className="p-4 flex-1 overflow-auto mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Global Variables</h4>
        </div>
        {globalVariables.length > 0 ? (
          <div className="rounded-sm border border-dark-700 overflow-auto max-h-48">
            <table className="w-full text-sm">
              <tbody>
                {globalVariables.map((v, idx) => (
                  <tr key={idx} className="border-b border-dark-700 last:border-0">
                    <td className="py-2 px-3 text-gray-300 font-mono break-all">{v.key}</td>
                    <td className="py-2 px-3 text-gray-400 break-all">{v.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-2">No global variables defined</div>
        )}
      </div>
    </div>
  );
}