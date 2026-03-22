import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Play, Check, X, ChevronDown, ChevronRight, GripVertical,
  Upload, FileCode, Folder, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { uploadTestFile, deleteTestFile } from '../../services/testFileService';
import { listTestSpecs } from '../../services/testSpecificationService';
import { listLibraryItems } from '../../services/specLibraryService';

// Helper to flatten all requests from a collection's items
const flattenRequests = (items) => {
  const requests = [];
  const traverse = (items) => {
    if (!items) return;
    items.forEach(item => {
      if (item.type === 'request') {
        requests.push(item);
      } else if (item.items) {
        traverse(item.items);
      }
    });
  };
  traverse(items);
  return requests;
};

// Sortable Item component
function SortableItem({ request, index, isSelected, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-dark-700 bg-dark-900/30 hover:bg-dark-800/40 group"
    >
      <div {...attributes} {...listeners} className="cursor-move text-gray-500 hover:text-gray-300">
        <GripVertical className="w-4 h-4" />
      </div>
      <div
        onClick={() => onToggle(request.id)}
        className={clsx(
          'w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors',
          isSelected
            ? 'border-primary text-primary'
            : 'border-gray-600 hover:border-gray-500'
        )}
      >
        {isSelected && <Check className="w-3.5 h-3.5" />}
      </div>
      <span className="text-xs text-gray-500 w-6">{index + 1}</span>
      <span
        className={clsx(
          'text-[10px] font-bold w-12 text-center shrink-0',
          request.method === 'GET' && 'text-green-400',
          request.method === 'POST' && 'text-yellow-400',
          request.method === 'PUT' && 'text-blue-400',
          request.method === 'DELETE' && 'text-red-400',
          'text-purple-400'
        )}
      >
        {request.method}
      </span>
      <span className="text-sm text-gray-300 truncate flex-1">{request.name}</span>
      {request.path && (
        <span className="text-xs text-gray-500 truncate max-w-[200px]">{request.path}</span>
      )}
    </div>
  );
}

export default function CollectionRunView({
  collection,
  onRunCollection,
  onClose,
  sidebarCollapsed = false,
  testFiles = [],
  onTestFilesChange,
  projects = [],
  onUploadTestFile = uploadTestFile,
  onDeleteTestFile = deleteTestFile,
  tabIndex,
  activeWorkspaceId, // 👈 new prop
}) {
  const [requests, setRequests] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [modalContext, setModalContext] = useState({ context: null, selectedFile: null });

  // Test data states (fetched from DB)
  const [testSpecs, setTestSpecs] = useState([]);
  const [libraryItems, setLibraryItems] = useState([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Active tab: 'functional' or 'load'
  const [activeTab, setActiveTab] = useState('functional');

  // Functional test configuration
  const [functionalRunMode, setFunctionalRunMode] = useState('manual');
  const [functionalIterations, setFunctionalIterations] = useState(1);
  const [functionalDelay, setFunctionalDelay] = useState(0);
  const [functionalSelectedFile, setFunctionalSelectedFile] = useState(null);

  // Load test configuration
  const [loadProfile, setLoadProfile] = useState('fixed');
  const [loadVirtualUsers, setLoadVirtualUsers] = useState(20);
  const [loadDuration, setLoadDuration] = useState(10);
  const [loadDurationUnit, setLoadDurationUnit] = useState('mins');
  const [loadRunMode, setLoadRunMode] = useState('app');
  const [loadSelectedFile, setLoadSelectedFile] = useState(null);

  // Shared file selection modal
  const [showFileSelectionModal, setShowFileSelectionModal] = useState(false);
  const fileSelectCallbackRef = useRef(null);

  const closeFileSelectionModal = () => {
    setShowFileSelectionModal(false);
    setModalContext({ context: null, selectedFile: null });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Initialize from collection
  useEffect(() => {
    if (collection) {
      const flat = flattenRequests(collection.items || []);
      setRequests(flat.map(req => ({ ...req, selected: true })));
    }
  }, [collection]);

  // Fetch test specs and library items when file modal is opened
  useEffect(() => {
    if (!showFileSelectionModal || !activeWorkspaceId) return;

    const fetchData = async () => {
      setLoadingSpecs(true);
      setLoadingLibrary(true);
      try {
        const specsRes = await listTestSpecs(activeWorkspaceId);
        setTestSpecs(specsRes.items || []);
        
        const libraryRes = await listLibraryItems();
        setLibraryItems(libraryRes || []);
      } catch (err) {
        console.error('Failed to fetch test data:', err);
        toast.error('Could not load test data');
      } finally {
        setLoadingSpecs(false);
        setLoadingLibrary(false);
      }
    };
    fetchData();
  }, [showFileSelectionModal, activeWorkspaceId]);

  const toggleSelect = (id) => {
    setRequests(prev =>
      prev.map(req => (req.id === id ? { ...req, selected: !req.selected } : req))
    );
  };

  const selectAll = () => {
    setRequests(prev => prev.map(req => ({ ...req, selected: true })));
  };

  const deselectAll = () => {
    setRequests(prev => prev.map(req => ({ ...req, selected: false })));
  };

  const resetOrder = () => {
    if (collection) {
      const flat = flattenRequests(collection.items || []);
      setRequests(flat.map(req => ({ ...req, selected: true })));
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setRequests((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        return newItems;
      });
    }
  };

  const handleRun = async () => {
    const selected = requests.filter(req => req.selected).map(req => req.id);
    if (selected.length === 0) {
      toast.warning('No requests selected');
      return;
    }

    setIsRunning(true);
    try {
      const options = {
        type: activeTab,
        iterations: functionalIterations,
        delay: functionalDelay,
        testFile: activeTab === 'functional' ? functionalSelectedFile : loadSelectedFile,
        profile: loadProfile,
        virtualUsers: loadVirtualUsers,
        duration: loadDuration,
        durationUnit: loadDurationUnit,
        runMode: loadRunMode,
      };
      await onRunCollection(collection.id, selected, options, tabIndex);
    } catch (error) {
      toast.error(`Run failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const totalRequests = requests.length;
  const selectedCount = requests.filter(r => r.selected).length;

  const isTwoColumn = sidebarCollapsed;

  return (
    <div
      className={clsx(
        'flex-1 p-6 bg-dark-800/80 backdrop-blur-sm',
        isTwoColumn ? 'overflow-hidden' : 'overflow-y-auto'
      )}
    >
      <div className={clsx('mx-auto', isTwoColumn ? 'max-w-7xl h-full' : 'max-w-4xl')}>
        {/* Main layout: flex-col when stacked, flex-row when two-column */}
        <div className={clsx('flex gap-6', isTwoColumn ? 'flex-row h-full' : 'flex-col')}>
          {/* Left column: Tabs + Configuration */}
          <div
            className={clsx(
              isTwoColumn ? 'w-1/2 h-full' : 'w-full',
              'flex flex-col'
            )}
          >
            {/* Tabs */}
            <div className="border border-dark-700 rounded-lg overflow-hidden bg-dark-800/40 mb-4 flex-shrink-0">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('functional')}
                  className={clsx(
                    'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === 'functional'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-400 hover:text-gray-300'
                  )}
                >
                  Functional Test
                </button>
                <button
                  onClick={() => setActiveTab('load')}
                  className={clsx(
                    'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === 'load'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-400 hover:text-gray-300'
                  )}
                >
                  Load Test
                </button>
              </div>
            </div>

            {/* Configuration panel – scrollable only in two‑column mode */}
            <div
              className={clsx(
                isTwoColumn && 'flex-1 overflow-y-auto min-h-0 custom-scrollbar'
              )}
            >
              <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5 space-y-5">
                {activeTab === 'functional' ? (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-white mb-3">Choose how to run your collection</h3>
                      <div className="space-y-2">
                        {[
                          { id: 'manual', label: 'Run manually', desc: 'Run this collection in the Collection Runner.' },
                          { id: 'schedule', label: 'Schedule runs', desc: 'Periodically run collection at a specified time.' },
                          { id: 'cli', label: 'Automate runs via CLI', desc: 'Configure CLI command to run on your build pipeline.' },
                        ].map((opt) => (
                          <label
                            key={opt.id}
                            className="flex items-start gap-3 p-3 rounded-lg border border-dark-700 hover:bg-dark-800/50 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="functionalRunMode"
                              checked={functionalRunMode === opt.id}
                              onChange={() => setFunctionalRunMode(opt.id)}
                              className="mt-1 text-primary"
                            />
                            <div>
                              <span className="text-sm font-medium text-white">{opt.label}</span>
                              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-white mb-3">Run configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Iterations</label>
                          <input
                            type="number"
                            min={1}
                            value={functionalIterations}
                            onChange={(e) => setFunctionalIterations(Number(e.target.value) || 1)}
                            className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Delay (ms)</label>
                          <input
                            type="number"
                            min={0}
                            value={functionalDelay}
                            onChange={(e) => setFunctionalDelay(Number(e.target.value) || 0)}
                            className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Test data file: Only JSON and CSV files are accepted.</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            fileSelectCallbackRef.current = setFunctionalSelectedFile;
                            setModalContext({ context: 'functional', selectedFile: functionalSelectedFile });
                            setShowFileSelectionModal(true);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700 text-sm"
                        >
                          Select File
                        </button>
                        {functionalSelectedFile && (
                          <span className="text-sm text-primary truncate max-w-[200px]">{functionalSelectedFile.name}</span>
                        )}
                      </div>
                    </div>

                    <details className="group">
                      <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none flex items-center gap-1">
                        Advanced settings
                      </summary>
                      <div className="mt-3 pt-3 border-t border-dark-700 text-xs text-gray-500">
                        Additional options can be added here.
                      </div>
                    </details>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-white mb-3">Set up your performance test</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Load profile</label>
                          <select
                            value={loadProfile}
                            onChange={(e) => setLoadProfile(e.target.value)}
                            className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="fixed">Fixed</option>
                            <option value="ramp">Ramp up</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Virtual users</label>
                            <input
                              type="number"
                              min={1}
                              value={loadVirtualUsers}
                              onChange={(e) => setLoadVirtualUsers(Number(e.target.value) || 1)}
                              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">Test duration</label>
                              <input
                                type="number"
                                min={1}
                                value={loadDuration}
                                onChange={(e) => setLoadDuration(Number(e.target.value) || 1)}
                                className="w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                            <select
                              value={loadDurationUnit}
                              onChange={(e) => setLoadDurationUnit(e.target.value)}
                              className="bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                            >
                              <option value="mins">mins</option>
                              <option value="secs">secs</option>
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {loadVirtualUsers} virtual users run for {loadDuration} {loadDurationUnit}, each executing all requests sequentially.
                        </p>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data file</label>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                fileSelectCallbackRef.current = setLoadSelectedFile;
                                setModalContext({ context: 'load', selectedFile: loadSelectedFile });
                                setShowFileSelectionModal(true);
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-gray-400 hover:bg-dark-700 text-sm"
                            >
                              Select File
                            </button>
                            {loadSelectedFile && (
                              <span className="text-sm text-primary truncate max-w-[200px]">{loadSelectedFile.name}</span>
                            )}
                          </div>
                        </div>
                        <details className="group">
                          <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none">
                            Pass test if...
                          </summary>
                          <div className="mt-3 pt-3 border-t border-dark-700 text-xs text-gray-500">
                            Configure pass/fail conditions.
                          </div>
                        </details>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white mb-2">Run</h3>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="loadRunMode"
                            checked={loadRunMode === 'app'}
                            onChange={() => setLoadRunMode('app')}
                            className="text-primary"
                          />
                          <span className="text-sm text-gray-300">In the app</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="loadRunMode"
                            checked={loadRunMode === 'cli'}
                            onChange={() => setLoadRunMode('cli')}
                            className="text-primary"
                          />
                          <span className="text-sm text-gray-300">via the CLI</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning || selectedCount === 0}
                  className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? 'Running...' : `Run ${selectedCount} ${selectedCount === 1 ? 'request' : 'requests'}`}
                </button>
              </div>
            </div>
          </div>

          {/* Right column: Run Sequence */}
          <div
            className={clsx(
              isTwoColumn ? 'w-1/2 h-full' : 'w-full flex-1',
              'flex flex-col'
            )}
          >
            <div className="border border-dark-700 rounded-lg overflow-hidden bg-dark-800/40 flex flex-col h-full">
              <div
                className={clsx(
                  'flex items-center justify-between px-4 py-3 flex-shrink-0',
                  !isTwoColumn && 'cursor-pointer hover:bg-dark-700/50'
                )}
                onClick={() => !isTwoColumn && setExpanded(!expanded)}
              >
                <span className="text-sm font-medium text-gray-300">Run Sequence</span>
                {!isTwoColumn && (
                  expanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )
                )}
              </div>

              {(isTwoColumn || expanded) && (
                <div className="flex-1 overflow-y-auto min-h-0 p-4 border-t border-dark-700 custom-scrollbar">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1.5 text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 rounded"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1.5 text-xs font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 rounded"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={resetOrder}
                      className="px-3 py-1.5 text-xs font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 rounded"
                    >
                      Reset
                    </button>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={requests.map(r => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {requests.map((req, index) => (
                          <SortableItem
                            key={req.id}
                            request={req}
                            index={index}
                            isSelected={req.selected}
                            onToggle={toggleSelect}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Selection Modal */}
      {showFileSelectionModal && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeFileSelectionModal}
        >
          <div
            className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
              <h3 className="text-base font-semibold text-white">Select Test Data</h3>
              <button
                type="button"
                onClick={closeFileSelectionModal}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {loadingSpecs || loadingLibrary ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (testSpecs.length === 0 && libraryItems.length === 0 && testFiles.length === 0) ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-dark-800 rounded-xl flex items-center justify-center mx-auto mb-3 border border-dark-700">
                    <Upload className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-400">No test data available</p>
                  <p className="text-xs text-gray-500 mt-1">Create specs in the Generate Testcases section or upload a file</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Test Case Specs (from DB) */}
                  {testSpecs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                        Test Case Specs
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {testSpecs.map((spec) => {
                          const isSelected = modalContext.selectedFile?.id === spec.id;
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => {
                                if (fileSelectCallbackRef.current) {
                                  fileSelectCallbackRef.current(isSelected ? null : spec);
                                }
                                closeFileSelectionModal();
                              }}
                              className={clsx(
                                'flex flex-col p-4 rounded-lg border transition-all text-left',
                                isSelected
                                  ? 'border-primary bg-primary/10'
                                  : 'border-dark-700 hover:bg-dark-800 hover:border-primary/30'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                  <FileCode className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{spec.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Spec • {new Date(spec.updatedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
                                  <span className="text-xs text-primary font-medium">Selected</span>
                                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Spec Library (from DB) */}
                  {libraryItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                        Spec Library
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {libraryItems.map((item) => {
                          const isSelected = modalContext.selectedFile?.id === item.id;
                          return (
                            <div key={item.id} className="relative group">
                              <button
                                type="button"
                                onClick={() => {
                                  if (fileSelectCallbackRef.current) {
                                    fileSelectCallbackRef.current(isSelected ? null : item);
                                  }
                                  closeFileSelectionModal();
                                }}
                                className={clsx(
                                  'w-full flex flex-col p-4 rounded-lg border transition-all text-left',
                                  isSelected
                                    ? 'border-primary bg-primary/10'
                                    : 'border-dark-700 hover:bg-dark-800 hover:border-primary/30'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                    <FileCode className="w-5 h-5 text-purple-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                                    {item.description && (
                                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
                                    <span className="text-xs text-primary font-medium">Selected</span>
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Uploaded Files */}
                  {testFiles.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                        Uploaded Files
                      </h4>
                      <div className="space-y-2">
                        {testFiles.map((file) => {
                          const isSelected = modalContext.selectedFile?.id === file.id;
                          return (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => {
                                if (fileSelectCallbackRef.current) {
                                  fileSelectCallbackRef.current(isSelected ? null : file);
                                }
                                closeFileSelectionModal();
                              }}
                              className={clsx(
                                'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                                isSelected
                                  ? 'border-primary bg-primary/10'
                                  : 'border-dark-700 hover:bg-dark-800'
                              )}
                            >
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                {file.type === '.json' ? (
                                  <span className="text-xs font-bold text-primary">JSON</span>
                                ) : (
                                  <span className="text-xs font-bold text-primary">CSV</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-dark-700">
              <button
                type="button"
                onClick={closeFileSelectionModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}