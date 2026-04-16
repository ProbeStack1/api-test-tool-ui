import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  Loader2, ChevronLeft, ChevronRight, Search, Activity, 
  Zap, CheckCircle, Variable, Columns, ChevronDown, ChevronUp, 
  Folder, FileCode, Check, Calendar, AlertCircle, ChevronsRight,
  BarChart3, Hash, ListChecks, XCircle
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { listTestSpecs, listTestCases } from '../services/testSpecificationService';
import {
  getDashboardSummary, getTotalCollections, getTotalFolders, getTotalRequests,
  getModuleCount, getModuleDetails, getTotalEnvironments, getActiveEnvironments,
  getRequestTypeBreakdown
} from '../services/deshboardService';
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

/* ── Fallback when API is down ────────────────────────────────── */
const DUMMY_DASHBOARD_DATA = {
  summary: {
    collections: { total: 0, totalFolders: 0 },
    requests: { total: 0, byMethod: {} },
    environments: { total: 0, active: 0 },
  },
  modules: {
    collectionTypes: { count: 0, details: {} },
    functionalTestRuns: { count: 0, details: {} },
    loadTestRuns: { count: 0, details: {} },
    scheduledRuns: { count: 0, details: {} },
    requestTypes: { count: 0, details: { http: {}, mcp: {} } },
  },
};

const DUMMY_SPECS = [];

/* ── Method pill colours ──────────────────────────────────────── */
const METHOD_PILL = {
  GET:     'text-green-400  bg-green-400/10',
  POST:    'text-blue-400   bg-blue-400/10',
  PUT:     'text-yellow-400 bg-yellow-400/10',
  DELETE:  'text-red-400    bg-red-400/10',
  PATCH:   'text-purple-400 bg-purple-400/10',
  HEAD:    'text-gray-400   bg-gray-400/10',
  OPTIONS: 'text-orange-400 bg-orange-400/10',
};

/* ── Metric Card ──────────────────────────────────────────────── */
function MetricCard({ m }) {
  const barTotal = m.proportionBar?.reduce((s, x) => s + x.value, 0) ?? 0;
  return (
    <div
      data-testid={`metric-card-${m.label.toLowerCase().replace(/\s+/g, '-')}`}
      className="bg-dark-800/40 border border-dark-700 rounded-lg p-4 hover:bg-dark-800/60 hover:border-l-[3px] transition-all border-l-[3px]"
      style={{ borderLeftColor: m.accentHex }}
    >
      {/* header with icon on right */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-gray-500">{m.label}</span>
        <div className={clsx('p-1.5 rounded-md', m.iconBg)}>
          <m.icon className={clsx('w-5.5 h-5.5', m.iconColor)} />
        </div>
      </div>

      {/* value */}
      <div className="text-2xl font-bold text-white tabular-nums">{m.value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{m.subtitle}</div>

      {/* tags (simple key→value pills) */}
      {m.tags?.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-dark-700/50 flex flex-wrap gap-1.5">
          {m.tags.map((t, i) => (
            <span key={i} className={clsx('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded', t.colorClass)}>
              {t.label} <span className="opacity-70 font-normal">{t.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* sections — for Requests card with HTTP / MCP nested methods */}
      {m.sections?.filter(s => s.total > 0).length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-dark-700/50 space-y-2.5">
          {m.sections.filter(s => s.total > 0).map((s, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded', s.titleColor)}>{s.title}</span>
                <span className="text-[11px] text-gray-400 font-mono">{s.total}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(s.methods)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, count]) => (
                    <span key={method} className={clsx('text-[9px] font-mono px-1.5 py-0.5 rounded', METHOD_PILL[method] || 'text-gray-400 bg-dark-700/60')}>
                      {method} {count}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* proportion bar */}
      {barTotal > 0 && (
        <div className="w-full h-1 rounded-full bg-dark-700/40 overflow-hidden flex mt-2.5">
          {m.proportionBar.filter(s => s.value > 0).map((seg, i) => (
            <div key={i} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(seg.value / barTotal) * 100}%`, backgroundColor: seg.hex }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================ */
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

  // Column visibility
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

  /* ── Metrics from dashboard API ─────────────────────────────── */
  const metricsData = useMemo(() => {
    if (!dashboardData) return [];

    const colDetails   = getModuleDetails(dashboardData, 'collectionTypes');
    const funcDetails  = getModuleDetails(dashboardData, 'functionalTestRuns');
    const loadDetails  = getModuleDetails(dashboardData, 'loadTestRuns');
    const schedDetails = getModuleDetails(dashboardData, 'scheduledRuns');
    const reqBreak     = getRequestTypeBreakdown(dashboardData);

    return [
      {
        label: 'Collections',
        value: getTotalCollections(dashboardData),
        subtitle: `${getTotalFolders(dashboardData)} folders`,
        icon: Folder,
        iconColor: 'text-indigo-400',
        iconBg: 'bg-indigo-400/10',
        accentHex: '#818cf8',
        tags: Object.entries(colDetails).filter(([, v]) => v > 0).map(([k, v]) => ({
          label: k.toUpperCase(),
          value: v,
          colorClass: k === 'http' ? 'text-cyan-400 bg-cyan-400/10' : 'text-amber-400 bg-amber-400/10',
        })),
        proportionBar: [
          { value: colDetails.http ?? 0, hex: '#22d3ee' },
          { value: colDetails.mcp ?? 0, hex: '#fbbf24' },
        ],
      },
      {
        label: 'Requests',
        value: getTotalRequests(dashboardData),
        subtitle: 'total requests',
        icon: FileCode,
        iconColor: 'text-cyan-400',
        iconBg: 'bg-cyan-400/10',
        accentHex: '#22d3ee',
        sections: [
          { title: 'HTTP', titleColor: 'text-cyan-400 bg-cyan-400/10', total: reqBreak.httpTotal, methods: reqBreak.http },
          { title: 'MCP', titleColor: 'text-amber-400 bg-amber-400/10', total: reqBreak.mcpTotal, methods: reqBreak.mcp },
        ],
        proportionBar: [
          { value: reqBreak.httpTotal, hex: '#22d3ee' },
          { value: reqBreak.mcpTotal, hex: '#fbbf24' },
        ],
      },
      {
        label: 'Functional Runs',
        value: getModuleCount(dashboardData, 'functionalTestRuns'),
        subtitle: `${funcDetails.completed ?? 0} completed`,
        icon: CheckCircle,
        iconColor: 'text-green-400',
        iconBg: 'bg-green-400/10',
        accentHex: '#4ade80',
        tags: Object.entries(funcDetails).filter(([, v]) => v > 0).map(([k, v]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          value: v,
          colorClass: k === 'completed' ? 'text-green-400 bg-green-400/10' : k === 'failed' ? 'text-red-400 bg-red-400/10' : 'text-gray-400 bg-gray-400/10',
        })),
      },
      {
        label: 'Load Tests',
        value: getModuleCount(dashboardData, 'loadTestRuns'),
        subtitle: `${loadDetails.passed ?? 0} passed, ${loadDetails.failed ?? 0} failed`,
        icon: Zap,
        iconColor: 'text-purple-400',
        iconBg: 'bg-purple-400/10',
        accentHex: '#c084fc',
        tags: Object.entries(loadDetails).filter(([, v]) => v > 0).map(([k, v]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          value: v,
          colorClass: k === 'passed' ? 'text-green-400 bg-green-400/10' : k === 'failed' ? 'text-red-400 bg-red-400/10' : 'text-gray-400 bg-gray-400/10',
        })),
        proportionBar: [
          { value: loadDetails.passed ?? 0, hex: '#4ade80' },
          { value: loadDetails.failed ?? 0, hex: '#f87171' },
        ],
      },
      {
        label: 'Scheduled Runs',
        value: getModuleCount(dashboardData, 'scheduledRuns'),
        subtitle: `${schedDetails.active ?? 0} active`,
        icon: Calendar,
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-400/10',
        accentHex: '#60a5fa',
        tags: Object.entries(schedDetails).filter(([, v]) => v > 0).map(([k, v]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          value: v,
          colorClass: k === 'active' ? 'text-green-400 bg-green-400/10' : k === 'paused' ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 bg-gray-400/10',
        })),
      },
      {
        label: 'Environments',
        value: getTotalEnvironments(dashboardData),
        subtitle: `${getActiveEnvironments(dashboardData)} active`,
        icon: Variable,
        iconColor: 'text-teal-400',
        iconBg: 'bg-teal-400/10',
        accentHex: '#2dd4bf',
        tags: [],
      },
    ];
  }, [dashboardData]);

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

  /* ── Skeletons ──────────────────────────────────────────────── */
  const MetricsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-dark-800/40 border border-dark-700 rounded-lg p-4 animate-pulse border-l-[3px] border-l-dark-600">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-dark-600 rounded-md" />
            <div className="h-3 bg-dark-600 rounded w-20" />
          </div>
          <div className="h-7 bg-dark-600 rounded w-12 mb-1" />
          <div className="h-3 bg-dark-600 rounded w-24" />
          <div className="mt-3 pt-2.5 border-t border-dark-700/50 flex gap-2">
            <div className="h-4 bg-dark-600 rounded w-14" />
            <div className="h-4 bg-dark-600 rounded w-14" />
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
                <th key={i} className="px-8 py-4"><div className="h-3 bg-dark-600 rounded w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => (
              <tr key={i} className="border-b border-dark-700">
                {Array(cols).fill(null).map((_, j) => (
                  <td key={j} className="px-8 py-4"><div className="h-4 bg-dark-600/50 rounded w-24" /></td>
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
                {showReq ? '\u25BC' : '\u25B6'} Request Sample
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
                {showRes ? '\u25BC' : '\u25B6'} Response Sample
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

  /* ================================================================ */
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
        {/* ── Metric Cards ────────────────────────────────────── */}
        <div className="mb-6">
          {loadingDashboard ? <MetricsSkeleton /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metricsData.map((metric, index) => (
                <MetricCard key={index} m={metric} />
              ))}
            </div>
          )}
        </div>

        {/* ── Charts ──────────────────────────────────────────── */}
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

        {/* ── Recent Collection Runs ──────────────────────────── */}
        <div className="mt-8">
          <CollectionRunsTable runs={workspaceRuns} onViewDetails={onViewRunResults} loading={loadingRuns} />
        </div>

        {/* ── Recent Load Test Runs ───────────────────────────── */}
        <div className="mt-8">
          {loadingLoadRuns ? <TableSkeleton cols={6} /> : <LoadTestRunsTable runs={loadTestRuns || []} onViewDetails={onViewLoadTestRun} />}
        </div>

        {/* ── Specifications Table ────────────────────────────── */}
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
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 rounded-lg bg-primary/10">
                                                <Hash className="w-5 h-5 text-primary" />
                                              </div>
                                              <div>
                                                <div className="text-xs text-gray-400 uppercase tracking-wide">Total Test Cases</div>
                                                <div className="text-2xl font-bold text-white">{testCaseList.length}</div>
                                              </div>
                                            </div>
                                            <div className="h-10 w-px bg-dark-600 hidden sm:block" />
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