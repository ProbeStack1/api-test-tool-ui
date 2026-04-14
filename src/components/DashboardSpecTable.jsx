import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  Loader2, Building2, ChevronLeft, ChevronRight, Search, Activity, 
  Zap, CheckCircle, Server, Variable, Columns, ChevronDown, ChevronUp, 
  Folder, FileCode, TestTube, Check, Calendar, AlertCircle, ChevronsRight,
  BarChart3, Hash, ListChecks,
  XCircle
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { listTestSpecs } from '../services/testSpecificationService';
import { listTestCases } from '../services/testSpecificationService';
import { getDashboardSummary, getTotalCollections, getTotalRequests, getModuleCount, getTotalEnvironments } from '../services/deshboardService';
import CollectionRunsTable from './CollectionRunsTable';
import LoadTestRunsTable from './LoadTestRunsTable';
import ActivityChart from './dashboard/ActivityChart';
import StatusDonut from './dashboard/StatusDonut';
import LatencyChart from './dashboard/LatencyChart';
import MethodStats from './dashboard/MethodStats';
import StatusRing from './dashboard/StatusDonut';
import PerformanceScore from './dashboard/PerformanceScore';
import ThroughputPulse from './dashboard/ThroughputPulse';
import MethodCards from './dashboard/MethodStats';

const DUMMY_DASHBOARD_DATA = {
  modules: {
    testSpecs: { count: 12 },
    libraryItems: { count: 8 },
    mockServers: { count: 4 },
    environments: { count: 6 },
  },
  collections: { total: 24 },
  requests: { total: 156 },
};

const DUMMY_SPECS = [];

export default function DashboardSpecTable({ 
  projects, 
  workspaceRuns, 
  loadingRuns, 
  loadTestRuns,        
  loadingLoadRuns,     
  onViewRunResults,
  onViewLoadTestRun,   
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [specs, setSpecs] = useState([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  
  const [specTestCaseCounts, setSpecTestCaseCounts] = useState({});
  const [testCasesBySpec, setTestCasesBySpec] = useState({});
  const [loadingTestCases, setLoadingTestCases] = useState({});
  const [expandedDetailsSpecId, setExpandedDetailsSpecId] = useState(null);

  // Column visibility – rich set
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const columnVisibilityRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [visibleColumns, setVisibleColumns] = useState({
    projectName: true,
    specificationName: true,
    status: true,
    testCases: true,
    createdAt: true,
    updatedAt: true,
    source: true,
  });

  const columnDefinitions = [
    { key: 'projectName', label: 'Project Name' },
    { key: 'specificationName', label: 'Specification Name' },
    { key: 'status', label: 'Status' },
    { key: 'testCases', label: 'Test Cases' },
    { key: 'createdAt', label: 'Created' },
    { key: 'updatedAt', label: 'Last Updated' },
    { key: 'source', label: 'Source' },
  ];

  // Dropdown positioning
  useEffect(() => {
    if (!columnVisibilityOpen) return;
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.right - 160 + window.scrollX,
        });
      }
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [columnVisibilityOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideButton = buttonRef.current && buttonRef.current.contains(event.target);
      const isInsideMenu = dropdownMenuRef.current && dropdownMenuRef.current.contains(event.target);
      const isInsideRelativeContainer = columnVisibilityRef.current && columnVisibilityRef.current.contains(event.target);
      if (!isInsideButton && !isInsideMenu && !isInsideRelativeContainer) {
        setColumnVisibilityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allColumnsVisible = Object.values(visibleColumns).every(v => v);
  const anyColumnVisible = Object.values(visibleColumns).some(v => v);

  const toggleAllColumns = (checked) => {
    const newVisibility = {};
    Object.keys(visibleColumns).forEach(key => { newVisibility[key] = checked; });
    setVisibleColumns(newVisibility);
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  // Dashboard summary
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboardSummary();
        setDashboardData(data);
      } catch (err) {
        console.warn('Dashboard API failed, using dummy data:', err);
        setDashboardData(DUMMY_DASHBOARD_DATA);
      } finally {
        setLoadingDashboard(false);
      }
    };
    fetchDashboard();
  }, []);

  // Fetch specs and test case counts
  useEffect(() => {
    const fetchAllSpecs = async () => {
      setLoadingSpecs(true);
      try {
        if (!projects || projects.length === 0) {
          setSpecs(DUMMY_SPECS);
          setLoadingSpecs(false);
          return;
        }
        const allSpecs = [];
        for (const project of projects) {
          try {
            const res = await listTestSpecs(project.id, { limit: 100 });
            const specsWithWorkspace = res.items.map(spec => ({
              ...spec,
              workspaceName: project.name,
            }));
            allSpecs.push(...specsWithWorkspace);
          } catch (err) {
            console.error(`Failed to fetch specs for ${project.name}:`, err);
          }
        }
        setSpecs(allSpecs);
        
        const counts = {};
        await Promise.all(allSpecs.map(async (spec) => {
          try {
            const res = await listTestCases(spec.id, { limit: 1, offset: 0 });
            counts[spec.id] = res.total;
          } catch {
            counts[spec.id] = 0;
          }
        }));
        setSpecTestCaseCounts(counts);
      } catch (err) {
        console.error('Failed to load test specs:', err);
        setSpecs(DUMMY_SPECS);
        toast.error('Failed to load test specs');
      } finally {
        setLoadingSpecs(false);
      }
    };
    fetchAllSpecs();
  }, [projects]);

  const fetchTestCasesForSpec = async (specId) => {
    if (testCasesBySpec[specId]) return;
    setLoadingTestCases(prev => ({ ...prev, [specId]: true }));
    try {
      const res = await listTestCases(specId, { limit: 50, offset: 0 });
      setTestCasesBySpec(prev => ({ ...prev, [specId]: res.items }));
    } catch (err) {
      console.error(`Failed to fetch test cases for ${specId}:`, err);
      toast.error('Could not load test cases');
    } finally {
      setLoadingTestCases(prev => ({ ...prev, [specId]: false }));
    }
  };

  const metricsData = useMemo(() => {
    if (!dashboardData) return [];
    return [
      { label: 'Specifications', value: getModuleCount(dashboardData, 'testSpecs').toString(), change: 'total specifications', icon: Activity, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
      { label: 'Collections', value: getTotalCollections(dashboardData).toString(), change: 'total collections', icon: Folder, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10' },
      { label: 'Requests', value: getTotalRequests(dashboardData).toString(), change: 'total requests', icon: FileCode, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
      { label: 'Test Cases', value: (loadTestRuns?.length || 0).toString(), change: 'total load test runs', icon: TestTube, color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
      { label: 'Load Testing', value: getModuleCount(dashboardData, 'libraryItems').toString(), change: 'test files', icon: Zap, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
      { label: 'Functional Testing', value: getModuleCount(dashboardData, 'testSpecs').toString(), change: 'collections', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-400/10' },
      { label: 'Mocked Services', value: getModuleCount(dashboardData, 'mockServers').toString(), change: 'active mocks', icon: Server, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
      { label: 'Variables', value: getTotalEnvironments(dashboardData).toString(), change: 'environments', icon: Variable, color: 'text-teal-400', bgColor: 'bg-teal-400/10' },
    ];
  }, [dashboardData, loadTestRuns]);

  const tableRows = useMemo(() => {
    return specs.map((spec) => ({
      id: spec.id,
      projectName: spec.workspaceName || 'Unknown',
      specificationName: spec.name,
      testCasesCount: specTestCaseCounts[spec.id] ?? 0,
      status: (specTestCaseCounts[spec.id] ?? 0) > 0 ? 'Ready' : 'No Tests',
      createdAt: spec.createdAt ? new Date(spec.createdAt).toLocaleDateString() : 'N/A',
      updatedAt: spec.updatedAt ? new Date(spec.updatedAt).toLocaleDateString() : 'N/A',
      source: spec.source || 'manual',
    }));
  }, [specs, specTestCaseCounts]);

  const filteredData = useMemo(() => {
    return tableRows.filter((item) =>
      item.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specificationName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tableRows, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const [expandedRow, setExpandedRow] = useState(null);
  
  const handleRowClick = async (itemId, specId) => {
    if (expandedRow === itemId) {
      setExpandedRow(null);
      setExpandedDetailsSpecId(null);
    } else {
      setExpandedRow(itemId);
      setExpandedDetailsSpecId(null);
      await fetchTestCasesForSpec(specId);
    }
  };

  const toggleDetails = (specId, e) => {
    e.stopPropagation();
    setExpandedDetailsSpecId(expandedDetailsSpecId === specId ? null : specId);
  };

  const MetricsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-3 bg-dark-600 rounded w-20 mb-2"></div>
              <div className="h-7 bg-dark-600 rounded w-12 mb-1"></div>
              <div className="h-3 bg-dark-600 rounded w-24"></div>
            </div>
            <div className="w-9 h-9 bg-dark-600 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const TableSkeleton = ({ cols }) => (
    <div className="bg-dark-800/60 border border-dark-700 rounded-xl overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-700/60 border-b border-dark-700">
              {Array(cols).fill(null).map((_, i) => (
                <th key={i} className="px-8 py-4"><div className="h-3 bg-dark-600 rounded w-20"></div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => (
              <tr key={i} className="border-b border-dark-700">
                {Array(cols).fill(null).map((_, j) => (
                  <td key={j} className="px-8 py-4"><div className="h-4 bg-dark-600/50 rounded w-24"></div></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const visibleColCount = Object.values(visibleColumns).filter(v => v).length;

  const formatSample = (raw) => {
    if (!raw) return '';
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  };

  const TestCaseCard = ({ tc }) => {
    const [showReq, setShowReq] = useState(false);
    const [showRes, setShowRes] = useState(false);
    const methodColor = {
      GET: 'bg-green-500/15 text-green-400 border-green-500/30',
      POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
    }[tc.method?.toUpperCase()] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';

    return (
      <div className="border border-dark-700 rounded-lg bg-dark-800/40 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700/60">
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wide', methodColor)}>
            {tc.method}
          </span>
          <span className="font-mono text-sm text-gray-300 truncate flex-1">{tc.endpoint}</span>
          {tc.expectedStatus && (
            <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-gray-300 border border-dark-600 font-mono">
              {tc.expectedStatus}
            </span>
          )}
        </div>
        <div className="px-4 py-3 space-y-1">
          {tc.summary && <p className="text-sm font-medium text-gray-200">{tc.summary}</p>}
          {tc.description && tc.description !== tc.summary && (
            <p className="text-xs text-gray-400">{tc.description}</p>
          )}
          {tc.parameters?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tc.parameters.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-gray-300 border border-dark-600">
                  <span className="text-gray-500">{p.in}</span>
                  <span className="text-white font-medium">{p.name}</span>
                  {p.required && <span className="text-red-400">*</span>}
                </span>
              ))}
            </div>
          )}
          {tc.requestBodySample && (
            <div className="mt-2">
              <button onClick={() => setShowReq(v => !v)} className="text-xs text-blue-400 hover:text-blue-300">
                {showReq ? '▼' : '▶'} Request Sample
              </button>
              {showReq && (
                <pre className="mt-1.5 text-xs bg-dark-900 p-2 rounded overflow-auto max-h-40 font-mono text-gray-300">
                  {formatSample(tc.requestBodySample)}
                </pre>
              )}
            </div>
          )}
          {tc.responseSample && (
            <div className="mt-2">
              <button onClick={() => setShowRes(v => !v)} className="text-xs text-green-400 hover:text-green-300">
                {showRes ? '▼' : '▶'} Response Sample
              </button>
              {showRes && (
                <pre className="mt-1.5 text-xs bg-dark-900 p-2 rounded overflow-auto max-h-40 font-mono text-gray-300">
                  {formatSample(tc.responseSample)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'upload': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'url': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'library': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getMethodBreakdown = (testCases) => {
    const breakdown = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OTHER: 0 };
    testCases.forEach(tc => {
      const method = tc.method?.toUpperCase();
      if (breakdown.hasOwnProperty(method)) breakdown[method]++;
      else breakdown.OTHER++;
    });
    return breakdown;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-probestack-bg">
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">ForgeQ Dashboard</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search specifications..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Metrics Cards */}
        <div className="mb-6">
          {loadingDashboard ? <MetricsSkeleton /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metricsData.map((metric, index) => (
                <div key={index} className="bg-dark-700/20 border border-dark-700 rounded-xl p-4 hover:border-primary/50 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{metric.label}</div>
                      <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                      <div className="text-xs font-medium text-green-400">{metric.change}</div>
                    </div>
                    <div className={`p-2 rounded-lg ${metric.bgColor} ${metric.color}`}>
                      <metric.icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charts Section  */}
{/* Row 1 */}
<div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="lg:col-span-2">
    <ActivityChart workspaceRuns={workspaceRuns} loadTestRuns={loadTestRuns} />
  </div>
  <div className="lg:col-span-1">
    <StatusRing workspaceRuns={workspaceRuns} loadTestRuns={loadTestRuns} />
  </div>
</div>

{/* Row 2 */}
<div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="lg:col-span-1">
    <PerformanceScore workspaceRuns={workspaceRuns} loadTestRuns={loadTestRuns} />
  </div>
  <div className="lg:col-span-2">
    <LatencyChart loadTestRuns={loadTestRuns} />
  </div>
</div>

{/* Row 3 */}
<div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
  <MethodCards dashboardData={dashboardData} workspaceRuns={workspaceRuns} />
  <ThroughputPulse loadTestRuns={loadTestRuns} />
</div>

        {/* Recent Collection Runs */}
        <div className="mt-8">
          <CollectionRunsTable runs={workspaceRuns} onViewDetails={onViewRunResults} loading={loadingRuns} />
        </div>

        {/* Recent Load Test Runs */}
        <div className="mt-8">
          {loadingLoadRuns ? <TableSkeleton cols={6} /> : <LoadTestRunsTable runs={loadTestRuns || []} onViewDetails={onViewLoadTestRun} />}
        </div>

        {/* Specifications Table */}
        <div className="mt-8">
          <div className="border border-dark-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between bg-probestack-bg">
              <h3 className="text-lg font-semibold text-white">Specifications</h3>
              <div className="relative" ref={columnVisibilityRef}>
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
                  className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer"
                >
                  <Columns className="h-4 w-4" />
                  <span>Columns</span>
                  <ChevronDown className={clsx("w-4 h-4 text-gray-500 transition-transform duration-200", columnVisibilityOpen && "rotate-180")} />
                </button>
                {columnVisibilityOpen && ReactDOM.createPortal(
                  <div
                    ref={dropdownMenuRef}
                    className="fixed z-50 w-40 bg-dark-800 border border-dark-700 rounded-sm shadow-xl max-h-65 overflow-y-auto"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                  >
                    <div className="py-1">
                      <div onClick={() => toggleAllColumns(!allColumnsVisible)} className={clsx('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-dark-700', allColumnsVisible ? 'text-primary' : 'text-gray-300')}>
                        <div className="w-4 h-4 flex items-center justify-center">{allColumnsVisible && <Check className="w-3.5 h-3.5 text-primary" />}</div>
                        <span className="flex-1">Show All</span>
                      </div>
                      <div className="border-t border-dark-700 my-1"></div>
                      {columnDefinitions.map((col) => (
                        <div key={col.key} onClick={() => toggleColumn(col.key)} className={clsx('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-dark-700', visibleColumns[col.key] ? 'text-primary' : 'text-gray-300')}>
                          <div className="w-4 h-4 flex items-center justify-center">{visibleColumns[col.key] && <Check className="w-3.5 h-3.5 text-primary" />}</div>
                          <span className="flex-1">{col.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>

            {anyColumnVisible ? (
              loadingSpecs ? (
                <TableSkeleton cols={visibleColCount} />
              ) : paginatedData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-dark-700/60 border-b border-dark-700">
                      <tr>
                        {visibleColumns.projectName && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Project Name</th>}
                        {visibleColumns.specificationName && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Specification Name</th>}
                        {visibleColumns.status && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Status</th>}
                        {visibleColumns.testCases && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Test Cases</th>}
                        {visibleColumns.createdAt && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Created</th>}
                        {visibleColumns.updatedAt && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Last Updated</th>}
                        {visibleColumns.source && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Source</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {paginatedData.map((item) => {
                        const isExpanded = expandedRow === item.id;
                        const testCaseList = testCasesBySpec[item.id] || [];
                        const loadingTC = loadingTestCases[item.id];
                        const methodBreakdown = getMethodBreakdown(testCaseList);
                        const showDetails = expandedDetailsSpecId === item.id;
                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              onClick={() => handleRowClick(item.id, item.id)}
                              className={clsx(
                                "group cursor-pointer bg-dark-700/20 hover:bg-primary/5 transition-colors",
                                isExpanded && "bg-primary/5"
                              )}
                            >
                              {visibleColumns.projectName && <td className="px-4 py-3 font-medium text-gray-200 whitespace-nowrap">{item.projectName}</td>}
                              {visibleColumns.specificationName && <td className="px-4 py-3"><span className="font-medium text-gray-200">{item.specificationName}</span></td>}
                              {visibleColumns.status && (
                                <td className="px-4 py-3">
                                  <span className={clsx(
                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                                    item.status === 'Ready' ? 'text-green-400' : 'text-yellow-400'
                                  )}>
                                    {item.status === 'Ready' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {item.status}
                                  </span>
                                </td>
                              )}
                              {visibleColumns.testCases && <td className="px-4 py-3"><span className="text-sm font-mono text-gray-300">{item.testCasesCount}</span></td>}
                              {visibleColumns.createdAt && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-gray-400"><Calendar className="w-3 h-3" />{item.createdAt}</div></td>}
                              {visibleColumns.updatedAt && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-gray-400"><Calendar className="w-3 h-3" />{item.updatedAt}</div></td>}
                              {visibleColumns.source && (
                                <td className="px-4 py-3">
                                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border', getSourceColor(item.source))}>
                                    {item.source.charAt(0).toUpperCase() + item.source.slice(1)}
                                  </span>
                                </td>
                              )}
                            </tr>
                            {isExpanded && (
                              <tr className="bg-dark-700/30">
                                <td colSpan={visibleColCount} className="px-4 py-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-primary" />
                                        Test Cases Summary
                                      </h4>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setExpandedRow(null); setExpandedDetailsSpecId(null); }}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-700/50 hover:bg-dark-700 rounded-lg transition-colors"
                                      >
                                        <ChevronUp className="w-4 h-4" /> Collapse
                                      </button>
                                    </div>
                                    {loadingTC ? (
                                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                                    ) : testCaseList.length > 0 ? (
                                      <>
                                        <div className="bg-dark-800/40 rounded-xl p-5 border border-dark-700">
                                          <div className="flex flex-wrap items-center justify-between gap-4">
                                            {/* Left side: Total count */}
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 rounded-lg bg-primary/10">
                                                <Hash className="w-5 h-5 text-primary" />
                                              </div>
                                              <div>
                                                <div className="text-xs text-gray-400 uppercase tracking-wide">Total Test Cases</div>
                                                <div className="text-2xl font-bold text-white">{testCaseList.length}</div>
                                              </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-10 w-px bg-dark-600 hidden sm:block" />

                                            {/* Method breakdown grid */}
                                            <div className="flex flex-wrap gap-4">
                                              {Object.entries(methodBreakdown).filter(([_, count]) => count > 0).map(([method, count]) => {
                                                let colorClass = '';
                                                let icon = null;
                                                switch (method) {
                                                  case 'GET': colorClass = 'bg-green-500/20 text-green-400 border-green-500/30'; icon = <CheckCircle className="w-3 h-3" />; break;
                                                  case 'POST': colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30'; icon = <Zap className="w-3 h-3" />; break;
                                                  case 'PUT': colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; icon = <Activity className="w-3 h-3" />; break;
                                                  case 'DELETE': colorClass = 'bg-red-500/20 text-red-400 border-red-500/30'; icon = <XCircle className="w-3 h-3" />; break;
                                                  default: colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30'; icon = <ListChecks className="w-3 h-3" />;
                                                }
                                                return (
                                                  <div key={method} className="flex flex-col items-center min-w-[60px]">
                                                    <div className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold', colorClass)}>
                                                      {icon}
                                                      {method}
                                                    </div>
                                                    <div className="text-lg font-bold text-white mt-1">{count}</div>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* View Details button */}
                                            <button
                                              onClick={(e) => toggleDetails(item.id, e)}
                                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors border border-primary/30"
                                            >
                                              <ChevronsRight className="w-4 h-4" />
                                              {showDetails ? 'Hide Details' : 'View Details'}
                                            </button>
                                          </div>
                                        </div>
                                        {showDetails && (
                                          <div className="space-y-3 max-h-96 overflow-y-auto mt-3">
                                            {testCaseList.map((tc) => <TestCaseCard key={tc.id} tc={tc} />)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-center py-8 text-gray-400 italic">No test cases generated for this specification.</div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400 italic">No specifications found</div>
              )
            ) : (
              <div className="p-12 text-center text-gray-400 italic">No columns selected. Please choose at least one column.</div>
            )}

            {anyColumnVisible && filteredData.length > 0 && (
              <div className="px-4 py-3 border-t border-dark-700 bg-dark-700/60 flex items-center justify-between">
                <p className="text-xs uppercase text-gray-300">
                  Showing {(currentPage-1)*itemsPerPage+1} to {Math.min(currentPage*itemsPerPage, filteredData.length)} of {filteredData.length}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}