import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Activity, Zap, CheckCircle, Server, Variable, Columns, ChevronDown, ChevronUp, Folder, FileCode, TestTube } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { listTestSpecs } from '../services/testSpecificationService';
import { getDashboardSummary, getTotalCollections, getTotalRequests, getModuleCount, getTotalEnvironments } from '../services/deshboardService';
import { listWorkspaceLoadTests } from '../services/collectionService'; // ✅ correct import
import CollectionRunsTable from './CollectionRunsTable';
import LoadTestRunsTable from './LoadTestRunsTable';

const getOrgColor = () => 'bg-primary/20 text-primary';

export default function DashboardSpecTable({ 
  projects, 
  workspaceRuns, 
  loadingRuns, 
  onViewRunResults,
  onViewLoadTestRun, // required callback
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [specs, setSpecs] = useState([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Load test runs state
  const [loadTestRuns, setLoadTestRuns] = useState([]);
  const [loadingLoadRuns, setLoadingLoadRuns] = useState(false);

  // Column visibility state
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const columnVisibilityRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    organization: true,
    projectName: true,
    appId: true,
    specificationName: true,
    version: true,
    testCases: true,
    collectionDetails: true,
    requestStatus: true,
  });

  const columnDefinitions = [
    { key: 'organization', label: 'Organization' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'appId', label: 'App ID' },
    { key: 'specificationName', label: 'Specification Name' },
    { key: 'version', label: 'Version' },
    { key: 'testCases', label: 'Test Cases' },
    { key: 'collectionDetails', label: 'Collection Details' },
    { key: 'requestStatus', label: 'Request Status' },
  ];

  // Fetch dashboard summary
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboardSummary();
        setDashboardData(data);
      } catch (err) {
        toast.error('Failed to load dashboard summary');
      } finally {
        setLoadingDashboard(false);
      }
    };
    fetchDashboard();
  }, []);

  // Fetch specs from all workspaces
  useEffect(() => {
    if (!projects || projects.length === 0) return;
    const fetchAllSpecs = async () => {
      setLoadingSpecs(true);
      try {
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
            console.error(`Failed to fetch specs for workspace ${project.name}:`, err);
          }
        }
        setSpecs(allSpecs);
      } catch (err) {
        toast.error('Failed to load test specs');
      } finally {
        setLoadingSpecs(false);
      }
    };
    fetchAllSpecs();
  }, [projects]);

  // Fetch load test runs from all workspaces
  useEffect(() => {
    if (!projects || projects.length === 0) return;
    const fetchAllLoadTestRuns = async () => {
      setLoadingLoadRuns(true);
      try {
        const allRuns = [];
        for (const project of projects) {
          try {
            const res = await listWorkspaceLoadTests(project.id); // ✅ correct API
            const runsWithWorkspace = (res.data || []).map(run => ({
              ...run,
              workspaceName: project.name,
            }));
            allRuns.push(...runsWithWorkspace);
          } catch (err) {
            console.error(`Failed to fetch load test runs for workspace ${project.name}:`, err);
          }
        }
        // Sort by startedAt descending (newest first)
        allRuns.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
        setLoadTestRuns(allRuns);
      } catch (err) {
        toast.error('Failed to load test runs');
      } finally {
        setLoadingLoadRuns(false);
      }
    };
    fetchAllLoadTestRuns();
  }, [projects]);

  // Column dropdown handlers (unchanged)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnVisibilityRef.current && !columnVisibilityRef.current.contains(event.target)) {
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
    Object.keys(visibleColumns).forEach(key => {
      newVisibility[key] = checked;
    });
    setVisibleColumns(newVisibility);
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Metrics derived from dashboard data
  const metricsData = useMemo(() => {
    if (!dashboardData) return [];
    return [
      {
        label: 'Specifications',
        value: getModuleCount(dashboardData, 'testSpecs').toString(),
        change: 'total specifications',
        icon: Activity,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
      },
      {
        label: 'Collections',
        value: getTotalCollections(dashboardData).toString(),
        change: 'total collections',
        icon: Folder,
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-400/10',
      },
      {
        label: 'Requests',
        value: getTotalRequests(dashboardData).toString(),
        change: 'total requests',
        icon: FileCode,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-400/10',
      },
      {
        label: 'Test Cases',
        value: getModuleCount(dashboardData, 'testSpecs').toString(),
        change: 'total test cases',
        icon: TestTube,
        color: 'text-pink-400',
        bgColor: 'bg-pink-400/10',
      },
      {
        label: 'Load Testing',
        value: getModuleCount(dashboardData, 'libraryItems').toString(),
        change: 'test files',
        icon: Zap,
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10',
      },
      {
        label: 'Functional Testing',
        value: getModuleCount(dashboardData, 'testSpecs').toString(),
        change: 'collections',
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-400/10',
      },
      {
        label: 'Mocked Services',
        value: getModuleCount(dashboardData, 'mockServers').toString(),
        change: 'active mocks',
        icon: Server,
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10',
      },
      {
        label: 'Variables',
        value: getTotalEnvironments(dashboardData).toString(),
        change: 'environments',
        icon: Variable,
        color: 'text-teal-400',
        bgColor: 'bg-teal-400/10',
      },
    ];
  }, [dashboardData]);

  // Transform specs into row format
const tableRows = useMemo(() => {
  return specs.map((spec) => ({
    id: spec.id,
    organization: 'ProbeStack',
    projectName: spec.workspaceName || 'Unknown',
    appId: spec.id.slice(0, 13).toUpperCase(),
    specificationName: spec.name,
    version: spec.updatedAt ? new Date(spec.updatedAt).toLocaleDateString() : 'N/A',
    testCases: 0,
    // ✅ Convert object to JSON string, else use string or fallback
    collectionDetails: typeof spec.source === 'object'
      ? JSON.stringify(spec.source)
      : (spec.source || 'manual'),
    requestStatus: 'success',
  }));
}, [specs]);

  const filteredData = useMemo(() => {
    return tableRows.filter((item) =>
      item.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specificationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.appId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tableRows, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const [expandedRow, setExpandedRow] = useState(null);
  const handleRowClick = (itemId) => {
    setExpandedRow(expandedRow === itemId ? null : itemId);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-probestack-bg">
      {/* Header with search */}
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">ForgeQ Dashboard</h2>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search specifications..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Metrics Cards */}
        <div className="mb-6">
          {loadingDashboard ? (
            <div className="text-center py-4 text-gray-400">Loading dashboard...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metricsData.map((metric, index) => (
                <div key={index} className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 hover:border-primary/30 transition-all duration-300">
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

        {/* 1. Recent Collection Runs */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Collection Runs</h3>
          {loadingRuns ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <CollectionRunsTable
              runs={workspaceRuns}
              onViewDetails={onViewRunResults}
            />
          )}
        </div>

        {/* 2. Recent Load Test Runs */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Load Test Runs</h3>
          {loadingLoadRuns ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <LoadTestRunsTable
              runs={loadTestRuns}
              onViewDetails={onViewLoadTestRun}
            />
          )}
        </div>

        {/* 3. Specifications Table (with column visibility) */}
        <div className="mt-8">
          {/* Column visibility dropdown */}
          <div className="mb-4 relative" ref={columnVisibilityRef}>
            <button
              onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-700 bg-dark-800/50 text-white hover:border-primary/50 focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all outline-none cursor-pointer"
            >
              <Columns className="h-4 w-4" />
              <span className="text-sm font-medium">Manage Columns</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${columnVisibilityOpen ? 'rotate-180' : ''}`} />
            </button>

            {columnVisibilityOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-lg border border-dark-700 bg-dark-800/95 backdrop-blur-xl shadow-lg overflow-hidden z-30 max-h-96 overflow-y-auto">
                <div className="py-2">
                  <div className="px-4 py-2.5 border-b border-dark-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allColumnsVisible}
                        onChange={(e) => toggleAllColumns(e.target.checked)}
                        className="cursor-pointer w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="text-xl font-extrabold gradient-text font-heading whitespace-nowrap">ProbeStack</span>
                    </label>
                  </div>
                  {columnDefinitions.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-dark-700/50">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        className="cursor-pointer w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="text-gray-300">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Specs table */}
          {anyColumnVisible ? (
            <div className="bg-[#161B30] border border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-700">
                      {visibleColumns.organization && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Organization</th>}
                      {visibleColumns.projectName && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Project Name</th>}
                      {visibleColumns.appId && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">App ID</th>}
                      {visibleColumns.specificationName && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Specification Name</th>}
                      {visibleColumns.version && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Version</th>}
                      {visibleColumns.testCases && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Test Cases</th>}
                      {visibleColumns.collectionDetails && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Collection Details</th>}
                      {visibleColumns.requestStatus && <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Request Status</th>}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loadingSpecs ? (
                      <tr><td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((item) => {
                        const isExpanded = expandedRow === item.id;
                        return (
                          <React.Fragment key={item.id}>
                            <tr onClick={() => handleRowClick(item.id)} className={clsx("group transition-colors cursor-pointer", isExpanded ? "bg-slate-800/50" : "hover:bg-slate-800/30")}>
                              {visibleColumns.organization && (
                                <td className="px-8 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${getOrgColor()}`}>
                                      <Building2 className="h-3 w-3" />
                                    </div>
                                    <span className="font-medium text-white">{item.organization}</span>
                                  </div>
                                </td>
                              )}
                              {visibleColumns.projectName && <td className="px-8 py-4 font-medium text-slate-200">{item.projectName}</td>}
                              {visibleColumns.appId && <td className="px-8 py-4 font-mono text-xs text-slate-400 uppercase">{item.appId}</td>}
                              {visibleColumns.specificationName && <td className="px-8 py-4"><span className="font-medium text-slate-200">{item.specificationName}</span></td>}
                              {visibleColumns.version && <td className="px-8 py-4"><span className="text-xs px-2 py-1 bg-slate-800 rounded font-mono text-slate-300">{item.version}</span></td>}
                              {visibleColumns.testCases && <td className="px-8 py-4"><span className="text-sm text-slate-300">{item.testCases}</span></td>}
                              {visibleColumns.collectionDetails && <td className="px-8 py-4"><span className="text-sm text-slate-300">{item.collectionDetails}</span></td>}
                              {visibleColumns.requestStatus && (
                                <td className="px-8 py-4">
                                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border bg-green-500/20 text-green-400 border-green-500/30">
                                    Success
                                  </span>
                                </td>
                              )}
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-800/30">
                                <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-8 py-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold text-slate-200">Test Cases</h4>
                                      <button onClick={(e) => { e.stopPropagation(); setExpandedRow(null); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg">
                                        <ChevronUp className="w-4 h-4" /> Collapse
                                      </button>
                                    </div>
                                    <div className="text-sm text-slate-400">No test case details available.</div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr><td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-12 text-center text-slate-400">No specifications found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for specs table */}
              <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Showing {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 text-sm bg-[#161B30] border border-slate-700 rounded hover:bg-slate-800 disabled:opacity-50 text-slate-300 flex items-center gap-1">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <button key={i+1} onClick={() => setCurrentPage(i+1)} className={clsx('w-8 h-8 text-sm font-medium rounded', currentPage === i+1 ? 'bg-[#F97316] text-white' : 'text-slate-300 hover:bg-slate-800')}>
                          {i+1}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 text-sm bg-[#161B30] border border-slate-700 rounded hover:bg-slate-800 disabled:opacity-50 text-slate-300 flex items-center gap-1">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#161B30] border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              No columns selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}