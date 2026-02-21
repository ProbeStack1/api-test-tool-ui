import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

export default function SaveRequestModal({ 
  isOpen, 
  onClose, 
  onSave, 
  requestName,
  collections = [],
  projects = [],
  onAddProject,
  isHistorySave = false
}) {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [isAddingNewProject, setIsAddingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editableRequestName, setEditableRequestName] = useState('');
  const modalRef = useRef(null);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Derive all unique projects from both projects prop AND collections
  const allProjects = React.useMemo(() => {
    const projectMap = new Map();
    
    // Add projects from props
    projects.forEach(p => projectMap.set(p.id, p));
    
    // Add projects derived from collections (for collections that reference projects not in props)
    collections.forEach(col => {
      const projectId = col.project || 'default';
      const projectName = col.projectName || 'Default Project';
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, { id: projectId, name: projectName });
      }
    });
    
    return Array.from(projectMap.values());
  }, [projects, collections]);

  useEffect(() => {
    if (isOpen) {
      setSelectedProject('');
      setSelectedCollection('');
      setIsAddingNewProject(false);
      setNewProjectName('');
      setNewCollectionName('');
      setEditableRequestName(isHistorySave ? '' : (requestName || ''));
      hasSavedRef.current = false;
    }
  }, [isOpen, isHistorySave, requestName]);

  // Get collections for selected project
  const getCollectionsForProject = () => {
    if (!selectedProject || isAddingNewProject) return [];
    // Handle 'default' project case - collections without project field
    return collections.filter(col => {
      const colProject = col.project || 'default';
      return colProject === selectedProject;
    });
  };

  const handleAddNewProject = () => {
    if (newProjectName.trim() && onAddProject) {
      const newProject = onAddProject(newProjectName.trim());
      setSelectedProject(newProject.id);
      setIsAddingNewProject(false);
      setNewProjectName('');
    }
  };

  const handleSave = () => {
    // Prevent double saves using ref (synchronous, unlike state)
    if (hasSavedRef.current || !selectedProject) return;
    
    const projectCollectionsForSave = collections.filter(col => {
      const colProject = col.project || 'default';
      return colProject === selectedProject;
    });
    const needsNewCollectionForSave = isAddingNewProject || projectCollectionsForSave.length === 0;
    
    // Get project name from allProjects (combined list)
    const projectName = allProjects.find(p => p.id === selectedProject)?.name || selectedProject;
    
    if (needsNewCollectionForSave) {
      // New project OR project with no collections - create new collection
      if (newCollectionName.trim()) {
        hasSavedRef.current = true;
        onSave({
          projectId: selectedProject,
          projectName: projectName,
          collectionName: newCollectionName.trim(),
          isNewCollection: true,
          requestName: editableRequestName.trim() || requestName || 'Untitled Request'
        });
        onClose();
      }
    } else {
      // Existing project with existing collections - use selected collection
      if (selectedCollection) {
        hasSavedRef.current = true;
        onSave({
          projectId: selectedProject,
          projectName: projectName,
          collectionId: selectedCollection,
          isNewCollection: false,
          requestName: editableRequestName.trim() || requestName || 'Untitled Request'
        });
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const projectCollections = getCollectionsForProject();
  // Show text input for new collection when: adding new project OR selected project has no collections
  const needsNewCollection = isAddingNewProject || (selectedProject && projectCollections.length === 0);
  const isCollectionDisabled = !selectedProject || isAddingNewProject;
  const isSaveDisabled = !selectedProject || 
    (needsNewCollection ? !newCollectionName.trim() : !selectedCollection);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-base font-semibold text-white">Save Request</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Request Name Display or Edit */}
          {isHistorySave ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Request Name
              </label>
              <input
                type="text"
                value={editableRequestName}
                onChange={(e) => setEditableRequestName(e.target.value)}
                placeholder="Enter request name"
                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                autoFocus
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-1">
              Save <span className="text-white font-semibold">{requestName || 'Untitled Request'}</span> to a collection
            </p>
          )}

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project
            </label>
            {isAddingNewProject ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewProject();
                    if (e.key === 'Escape') {
                      setIsAddingNewProject(false);
                      setNewProjectName('');
                    }
                  }}
                  placeholder="Enter project name"
                  className="flex-1 bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewProject}
                  disabled={!newProjectName.trim()}
                  className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add project"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select
                value={selectedProject}
                onChange={(e) => {
                  if (e.target.value === 'add-new') {
                    setIsAddingNewProject(true);
                    setSelectedCollection('');
                  } else {
                    setSelectedProject(e.target.value);
                    setSelectedCollection('');
                  }
                }}
                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="" className="bg-dark-800 text-gray-500">
                  Select a project
                </option>
                <option value="add-new" className="bg-dark-800 text-primary">
                  + Add New Project
                </option>
                {allProjects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-dark-800 text-white">
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Collection Selection/Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection
            </label>
            {needsNewCollection ? (
              <div>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCollectionName.trim() && !hasSavedRef.current) handleSave();
                  }}
                  placeholder="Enter collection name"
                  className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {!isAddingNewProject && selectedProject && projectCollections.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">This project has no collections. Create one to save your request.</p>
                )}
              </div>
            ) : (
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                disabled={isCollectionDisabled}
                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-dark-800 text-gray-500">
                  {isCollectionDisabled ? 'Select a project first' : 'Select a collection'}
                </option>
                {projectCollections.map((collection) => (
                  <option key={collection.id} value={collection.id} className="bg-dark-800 text-white">
                    {collection.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-dark-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled || hasSavedRef.current}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
