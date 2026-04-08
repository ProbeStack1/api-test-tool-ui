// src/components/RightPanelProjects.jsx
import React, { useState } from 'react';
import { Search, Plus, Check, Info, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

export default function RightPanelProjects({
  projects,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,     // kept for backward compatibility (modal fallback)
  onOpenWorkspaceDetails,
  onCreateProjectTab,    // opens the wizard tab
}) {
  const [search, setSearch] = useState('');
const navigate = useNavigate();
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-80 min-w-[18rem] max-w-[20rem] border-l border-dark-700 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4.5 border-b border-dark-700 shrink-0 flex items-center gap-2">
         <Building2 className="w-5 h-5 text-primary" />
        <h3 className="ttext-sm font-semibold text-white">Projects</h3>
      </div>

      {/* Search + Create */}
      <div className="px-3 py-2 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-dark-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
  <button
    type="button"
    onClick={() => navigate('/workspace/projects-management')}   // ← changed
    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-1"
    title="Create new project"
  >
    <Plus className="w-4 h-4" />
    <span className="text-sm hidden sm:inline">Create</span>
  </button>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        <p className="text-xs text-gray-500 mt-1 px-4 pb-2">Switch or manage your projects</p>

        {filteredProjects.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-500">
            No projects found
          </div>
        ) : (
          filteredProjects.map(project => (
            <div
              key={project.id}
              className={clsx(
                'flex items-center justify-between px-4 py-2.5 hover:bg-dark-700/50 group transition-colors',
                activeWorkspaceId === project.id && 'bg-primary/10 border-l-2 border-primary'
              )}
            >
              <button
                onClick={() => onSelectWorkspace(project.id)}
                className="flex-1 flex items-center gap-3 text-left"
              >
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{project.name}</p>
                  <p className="text-xs text-gray-500">
                    {project.visibility === 'private' ? 'Private' : 'Public'}
                  </p>
                </div>
                {activeWorkspaceId === project.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
              <button
                onClick={() => onOpenWorkspaceDetails(project.id)}
                className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-dark-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Project details"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}