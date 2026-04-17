import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  Loader2, ChevronLeft, ChevronRight, Search, Activity, 
  Zap, CheckCircle, Variable, Columns, ChevronDown, ChevronUp, 
  Folder, FileCode, Check, Calendar, AlertCircle, ChevronsRight,
  BarChart3, Hash, ListChecks, XCircle, Globe, Cpu, Server,
  Play, Clock, Shield
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { listTestSpecs, listTestCases } from '../services/testSpecificationService';
import {
  getDashboardSummary, getTotalCollections, getTotalFolders, getTotalRequests,
  getModuleCount, getModuleDetails, getTotalEnvironments, getActiveEnvironments,
  getRequestTypeBreakdown, getMockServerDetails, getFunctionalRunDetails,
  getScheduledRunDetails
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
    mockServers: { count: 0, details: {} },
  },
};

const DUMMY_SPECS = [];

/* ── Card animations + scroll reveal + bg cube ────────────────── */
const CARD_ANIM_STYLES = `
@keyframes iconGentleFloat { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(2deg); } }
.dash-card .dash-icon { transition: transform 0.3s ease; }
.dash-card:hover .dash-icon { animation: iconGentleFloat 0.6s ease-in-out; }
.dash-card .bg-cube { transition: transform 0.4s ease, opacity 0.4s ease; }
.dash-card:hover .bg-cube { transform: scale(1.05); opacity: 0.12; }
.scroll-reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
.scroll-reveal.revealed { opacity: 1; transform: translateY(0); }
`;

/* ── Scroll reveal hook ───────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, revealed };
}

/* ── Scroll reveal row wrapper ────────────────────────────────── */
function RevealRow({ children, className, delay = 0 }) {
  const { ref, revealed } = useScrollReveal();
  return (
    <div ref={ref} className={clsx('scroll-reveal', revealed && 'revealed', className)}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Background cube SVG (right top corner) ───────────────────── */
function BgCube() {
  return (
    <div className="bg-cube absolute -top-10 -right-10 opacity-[0.06] pointer-events-none">
      <svg width="160" height="160" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white">
        <path d="M20 4L36 13V27L20 36L4 27V13L20 4Z" />
        <path d="M20 4V20M20 20L4 13M20 20L36 13" />
        <path d="M20 20V36" />
      </svg>
    </div>
  );
}

/* ── Method colours ───────────────────────────────────────────── */
const M_CLR = {
  GET:     { text: 'text-green-400',  bg: 'bg-green-400/10',  bar: '#4ade80' },
  POST:    { text: 'text-blue-400',   bg: 'bg-blue-400/10',   bar: '#60a5fa' },
  PUT:     { text: 'text-yellow-400', bg: 'bg-yellow-400/10', bar: '#facc15' },
  DELETE:  { text: 'text-red-400',    bg: 'bg-red-400/10',    bar: '#f87171' },
  PATCH:   { text: 'text-purple-400', bg: 'bg-purple-400/10', bar: '#c084fc' },
  HEAD:    { text: 'text-gray-400',   bg: 'bg-gray-400/10',   bar: '#9ca3af' },
  OPTIONS: { text: 'text-orange-400', bg: 'bg-orange-400/10', bar: '#fb923c' },
};
const getMethodClr = (m) => M_CLR[m] || { text: 'text-gray-400', bg: 'bg-dark-700/60', bar: '#6b7280' };

/* ── Mini horizontal bar ──────────────────────────────────────── */
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="h-[4px] w-full rounded-full bg-dark-700/40 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/* ── Method Row (used in Requests breakdown) ──────────────────── */
function MethodRow({ method, count, max }) {
  const c = getMethodClr(method);
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('text-[11px] font-bold w-[52px] text-right tabular-nums', c.text)}>{method}</span>
      <div className="flex-1"><MiniBar value={count} max={max} color={c.bar} /></div>
      <span className="text-[11px] text-gray-300 tabular-nums w-6 text-right">{count}</span>
    </div>
  );
}

/* ── Proportion Bar ───────────────────────────────────────────── */
function ProportionBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  return (
    <div className="w-full h-1 rounded-full bg-dark-700/40 overflow-hidden flex">
      {segments.filter(s => s.value > 0).map((seg, i) => (
        <div key={i} className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700" style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.hex }} />
      ))}
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
  workspaceId,   
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
    const nv = {};
    Object.keys(visibleColumns).forEach(key => { nv[key] = checked; });
    setVisibleColumns(nv);
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!workspaceId) { setLoadingDashboard(false); return; }
      try {
        const data = await getDashboardSummary(workspaceId);
        setDashboardData(data);
      } catch (err) {
        console.warn('Dashboard API failed, using dummy data:', err);
        setDashboardData(DUMMY_DASHBOARD_DATA);
      } finally {
        setLoadingDashboard(false);
      }
    };
    fetchDashboard();
  }, [workspaceId]);

  useEffect(() => {
    const fetchAllSpecs = async () => {
      setLoadingSpecs(true);
      try {
        if (!projects || projects.length === 0) { setSpecs(DUMMY_SPECS); setLoadingSpecs(false); return; }
        const allSpecs = [];
        for (const project of projects) {
          try {
            const res = await listTestSpecs(project.id, { limit: 100 });
            allSpecs.push(...res.items.map(spec => ({ ...spec, workspaceName: project.name })));
          } catch (err) { console.error(`Failed to fetch specs for ${project.name}:`, err); }
        }
        setSpecs(allSpecs);
        const counts = {};
        await Promise.all(allSpecs.map(async (spec) => {
          try { const res = await listTestCases(spec.id, { limit: 1, offset: 0 }); counts[spec.id] = res.total; }
          catch { counts[spec.id] = 0; }
        }));
        setSpecTestCaseCounts(counts);
      } catch (err) { console.error('Failed to load test specs:', err); setSpecs(DUMMY_SPECS); toast.error('Failed to load test specs'); }
      finally { setLoadingSpecs(false); }
    };
    fetchAllSpecs();
  }, [projects]);

  const fetchTestCasesForSpec = async (specId) => {
    if (testCasesBySpec[specId]) return;
    setLoadingTestCases(prev => ({ ...prev, [specId]: true }));
    try {
      const res = await listTestCases(specId, { limit: 50, offset: 0 });
      setTestCasesBySpec(prev => ({ ...prev, [specId]: res.items }));
    } catch (err) { console.error(`Failed to fetch test cases for ${specId}:`, err); toast.error('Could not load test cases'); }
    finally { setLoadingTestCases(prev => ({ ...prev, [specId]: false })); }
  };

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
    if (expandedRow === itemId) { setExpandedRow(null); setExpandedDetailsSpecId(null); }
    else { setExpandedRow(itemId); setExpandedDetailsSpecId(null); await fetchTestCasesForSpec(specId); }
  };

  const toggleDetails = (specId, e) => {
    e.stopPropagation();
    setExpandedDetailsSpecId(expandedDetailsSpecId === specId ? null : specId);
  };

  const visibleColCount = Object.values(visibleColumns).filter(v => v).length;

  /* ── Dashboard derived data ─────────────────────────────────── */
  const colDetails   = useMemo(() => getModuleDetails(dashboardData, 'collectionTypes'), [dashboardData]);
  const funcRun      = useMemo(() => getFunctionalRunDetails(dashboardData), [dashboardData]);
  const loadDetails  = useMemo(() => getModuleDetails(dashboardData, 'loadTestRuns'), [dashboardData]);
  const schedRun     = useMemo(() => getScheduledRunDetails(dashboardData), [dashboardData]);
  const reqBreak     = useMemo(() => getRequestTypeBreakdown(dashboardData), [dashboardData]);
  const mockSrv      = useMemo(() => getMockServerDetails(dashboardData), [dashboardData]);

  const httpMax = Math.max(...Object.values(reqBreak.http || {}), 1);
  const mcpMax  = Math.max(...Object.values(reqBreak.mcp || {}), 1);
  const mockMax = Math.max(...Object.values(mockSrv.endpointsByMethod || {}), 1);
  const mockEndpointTotal = Object.values(mockSrv.endpointsByMethod || {}).reduce((a, b) => a + b, 0);

  /* ── Skeletons (match 3-row layout) ─────────────────────────── */
  const SkeletonCard = () => (
    <div className="bg-dark-800/40 border border-dark-700 rounded-xl p-5 animate-pulse flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-dark-600 rounded-xl shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-dark-600 rounded w-24 mb-2" />
          <div className="h-7 bg-dark-600 rounded w-14" />
        </div>
      </div>
      <div className="h-3 bg-dark-600/50 rounded w-32 mb-3" />
      <div className="mt-auto pt-3 border-t border-dark-700/50 space-y-2">
        <div className="h-3 bg-dark-600/40 rounded w-full" />
        <div className="h-3 bg-dark-600/40 rounded w-3/4" />
      </div>
    </div>
  );

  const MetricsSkeleton = () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SkeletonCard /><SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </>
  );

  const TableSkeleton = ({ cols }) => (
    <div className="bg-dark-800/60 border border-dark-700 rounded-xl overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-dark-700/60 border-b border-dark-700">{Array(cols).fill(null).map((_, i) => (<th key={i} className="px-8 py-4"><div className="h-3 bg-dark-600 rounded w-20" /></th>))}</tr></thead>
          <tbody>{[...Array(3)].map((_, i) => (<tr key={i} className="border-b border-dark-700">{Array(cols).fill(null).map((_, j) => (<td key={j} className="px-8 py-4"><div className="h-4 bg-dark-600/50 rounded w-24" /></td>))}</tr>))}</tbody>
        </table>
      </div>
    </div>
  );

  const formatSample = (raw) => { if (!raw) return ''; try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; } };

  const TestCaseCard = ({ tc }) => {
    const [showReq, setShowReq] = useState(false);
    const [showRes, setShowRes] = useState(false);
    const methodColor = { GET: 'bg-green-500/15 text-green-400 border-green-500/30', POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30', PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', DELETE: 'bg-red-500/15 text-red-400 border-red-500/30' }[tc.method?.toUpperCase()] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    return (
      <div className="border border-dark-700 rounded-lg bg-dark-800/40 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700/60">
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wide', methodColor)}>{tc.method}</span>
          <span className="font-mono text-sm text-gray-300 truncate flex-1">{tc.endpoint}</span>
          {tc.expectedStatus && <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-gray-300 border border-dark-600 font-mono">{tc.expectedStatus}</span>}
        </div>
        <div className="px-4 py-3 space-y-1">
          {tc.summary && <p className="text-sm font-medium text-gray-200">{tc.summary}</p>}
          {tc.description && tc.description !== tc.summary && <p className="text-xs text-gray-400">{tc.description}</p>}
          {tc.parameters?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tc.parameters.map((p, i) => (<span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-gray-300 border border-dark-600"><span className="text-gray-500">{p.in}</span><span className="text-white font-medium">{p.name}</span>{p.required && <span className="text-red-400">*</span>}</span>))}
            </div>
          )}
          {tc.requestBodySample && (<div className="mt-2"><button onClick={() => setShowReq(v => !v)} className="text-xs text-blue-400 hover:text-blue-300">{showReq ? '\u25BC' : '\u25B6'} Request Sample</button>{showReq && <pre className="mt-1.5 text-xs bg-dark-900 p-2 rounded overflow-auto max-h-40 font-mono text-gray-300">{formatSample(tc.requestBodySample)}</pre>}</div>)}
          {tc.responseSample && (<div className="mt-2"><button onClick={() => setShowRes(v => !v)} className="text-xs text-green-400 hover:text-green-300">{showRes ? '\u25BC' : '\u25B6'} Response Sample</button>{showRes && <pre className="mt-1.5 text-xs bg-dark-900 p-2 rounded overflow-auto max-h-40 font-mono text-gray-300">{formatSample(tc.responseSample)}</pre>}</div>)}
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
    testCases.forEach(tc => { const method = tc.method?.toUpperCase(); if (breakdown.hasOwnProperty(method)) breakdown[method]++; else breakdown.OTHER++; });
    return breakdown;
  };

  /* ── Card class (shared) with left border width ─────────────── */
  const cardCls = "dash-card relative overflow-hidden bg-dark-800/40 border border-dark-700 border-l-[3px] rounded-xl p-5 transition-all duration-200 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 flex flex-col";

  /* ================================================================ */
  /* ── RENDER ──────────────────────────────────────────────────── */
  /* ================================================================ */
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-probestack-bg">
      <style>{CARD_ANIM_STYLES}</style>

      {/* <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">ForgeQ Dashboard</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search specifications..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
        </div>
      </div> */}

      <div className="flex-1 overflow-auto p-6">

  <div className="mb-5">
    <h2 className="text-lg font-semibold text-white">Dashboard</h2>
    <p className="text-lg text-gray-500">Overview of your project activity and resources</p>
  </div>

        {/* ────────────────────────────────────────────────────── */}
        {/* METRIC CARDS — 3 Rows                                 */}
        {/* ────────────────────────────────────────────────────── */}
        <div className="mb-6">
          {loadingDashboard ? <MetricsSkeleton /> : dashboardData ? (
            <>
              {/* ── ROW 1: Collections + Requests (2 cards) ───── */}
              <RevealRow className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4" delay={0}>

                {/* Collections */}
                <div data-testid="metric-card-collections" className="dash-card relative overflow-hidden bg-dark-800/40 border border-dark-700 rounded-xl p-5 transition-all duration-200 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 flex flex-col">
                  {/* <BgCube /> */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="dash-icon p-3 rounded-xl bg-indigo-500/10 shrink-0">
                      <Folder className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Collections</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{getTotalCollections(dashboardData)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-dark-700/30 rounded-lg p-3 border border-dark-700/50">
                      <div className="flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-cyan-400" /><span className="text-xs font-bold text-cyan-400 uppercase">HTTP</span></div>
                      <div className="text-xl font-bold text-white tabular-nums">{colDetails.http ?? 0}</div>
                    </div>
                    <div className="bg-dark-700/30 rounded-lg p-3 border border-dark-700/50">
                      <div className="flex items-center gap-2 mb-1"><Cpu className="w-4 h-4 text-amber-400" /><span className="text-xs font-bold text-amber-400 uppercase">MCP</span></div>
                      <div className="text-xl font-bold text-white tabular-nums">{colDetails.mcp ?? 0}</div>
                    </div>
                  </div>
                  <ProportionBar segments={[{ value: colDetails.http ?? 0, hex: '#22d3ee' }, { value: colDetails.mcp ?? 0, hex: '#fbbf24' }]} />
                  <div className="text-sm text-gray-500 mt-2.5">Folders: <span className="text-gray-300 font-medium">{getTotalFolders(dashboardData)}</span></div>
                </div>

                {/* Requests */}
                <div data-testid="metric-card-requests" className="dash-card relative overflow-hidden bg-dark-800/40 border border-dark-700 rounded-xl p-5 transition-all duration-200 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 flex flex-col">
                  {/* <BgCube /> */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="dash-icon p-3 rounded-xl bg-cyan-500/10 shrink-0">
                      <FileCode className="w-7 h-7 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Requests</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{getTotalRequests(dashboardData)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-2"><Globe className="w43 h-4 text-cyan-400" /><span className="text-xs font-bold text-cyan-400 uppercase">HTTP</span><span className="text-sm text-gray-500 tabular-nums">{reqBreak.httpTotal}</span></div>
                      <div className="space-y-1.5">
                        {Object.entries(reqBreak.http).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([m, c]) => <MethodRow key={m} method={m} count={c} max={httpMax} />)}
                        {reqBreak.httpTotal === 0 && <span className="text-xs text-gray-600 italic">None</span>}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2"><Cpu className="w43 h-4 text-amber-400" /><span className="text-xs  font-bold text-amber-400 uppercase">MCP</span><span className="text-sm text-gray-500 tabular-nums">{reqBreak.mcpTotal}</span></div>
                      <div className="space-y-1.5">
                        {Object.entries(reqBreak.mcp).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([m, c]) => <MethodRow key={m} method={m} count={c} max={mcpMax} />)}
                        {reqBreak.mcpTotal === 0 && <span className="text-xs text-gray-600 italic">None</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </RevealRow>

              {/* ── ROW 2: Functional + Load + Scheduled (equal height) ── */}
              <RevealRow className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4" delay={100}>

                {/* Functional Runs */}
                <div data-testid="metric-card-functional-runs" className={cardCls} style={{ borderLeftColor: '#4ade80' }}>
                  <BgCube />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="dash-icon p-3 rounded-xl bg-green-500/10 shrink-0">
                      <CheckCircle className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Functional Runs</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{funcRun.count}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-3"><span className="text-green-400 font-medium">{funcRun.completed}</span> completed</div>
                  <div className="mt-auto pt-3 border-t border-dark-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-blue-400" /><span className="text-gray-400">Manual</span></div>
                      <span className="text-gray-300 tabular-nums font-medium">({funcRun.manual?.total ?? 0})</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400" /><span className="text-gray-400">Scheduled</span></div>
                      <span className="text-gray-300 tabular-nums font-medium">({funcRun.scheduled?.total ?? 0})</span>
                    </div>
                  </div>
                </div>

                {/* Load Tests (same style as Functional) */}
                <div data-testid="metric-card-load-tests" className={cardCls} style={{ borderLeftColor: '#c084fc' }}>
                  <BgCube />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="dash-icon p-3 rounded-xl bg-purple-500/10 shrink-0">
                      <Zap className="w-7 h-7 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Load Tests</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{getModuleCount(dashboardData, 'loadTestRuns')}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    <span className="text-green-400 font-medium">{loadDetails.passed ?? 0}</span> passed, <span className="text-red-400 font-medium">{loadDetails.failed ?? 0}</span> failed
                  </div>
                  <div className="mt-auto pt-3 border-t border-dark-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-400" /><span className="text-gray-400">Passed</span></div>
                      <span className="text-green-400 tabular-nums font-medium">({loadDetails.passed ?? 0})</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-gray-400">Failed</span></div>
                      <span className="text-red-400 tabular-nums font-medium">({loadDetails.failed ?? 0})</span>
                    </div>
                  </div>
                </div>

                {/* Scheduled */}
                <div data-testid="metric-card-scheduled-runs" className={cardCls} style={{ borderLeftColor: '#60a5fa' }}>
                  <BgCube />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="dash-icon p-3 rounded-xl bg-blue-500/10 shrink-0">
                      <Calendar className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Scheduled</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{schedRun.count}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    <span className="text-green-400 font-medium">{schedRun.active}</span> active, <span className="text-yellow-400 font-medium">{schedRun.paused}</span> paused
                  </div>
                  <div className="mt-auto pt-3 border-t border-dark-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Total Executions</span>
                      <span className="text-white tabular-nums font-medium">{schedRun.totalExecutions}</span>
                    </div>
                    {schedRun.active > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" /><span className="relative inline-flex rounded-full h-3 w-3 bg-green-400" /></span>
                        <span className="text-xs text-green-400 font-medium">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </RevealRow>

              {/* ── ROW 3: Mock Servers + Test Specs + Environments (equal height) ── */}
              <RevealRow className="grid grid-cols-1 lg:grid-cols-3 gap-4" delay={200}>

                {/* Mock Servers */}
                <div data-testid="metric-card-mock-servers" className={cardCls} style={{ borderLeftColor: '#fb923c' }}>
                  <BgCube />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="dash-icon p-3 rounded-xl bg-orange-500/10 shrink-0">
                      <Server className="w-7 h-7 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Mock Servers</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{mockSrv.count}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-3"><span className="text-orange-400 font-medium">{mockEndpointTotal}</span> endpoints</div>
                </div>

                {/* Test Specs */}
                <div data-testid="metric-card-test-specs" className={cardCls} style={{ borderLeftColor: '#f472b6' }}>
                  <BgCube />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="dash-icon p-3 rounded-xl bg-pink-500/10 shrink-0">
                      <Shield className="w-7 h-7 text-pink-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Test Specs</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{getModuleCount(dashboardData, 'testSpecs')}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">specifications</div>
                </div>

                {/* Environments */}
                <div data-testid="metric-card-environments" className={cardCls} style={{ borderLeftColor: '#2dd4bf' }}>
                  <BgCube />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="dash-icon p-3 rounded-xl bg-teal-500/10 shrink-0">
                      <Variable className="w-7 h-7 text-teal-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-gray-500">Environments</div>
                      <div className="text-3xl font-bold text-white tabular-nums leading-tight">{getTotalEnvironments(dashboardData)}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500"><span className="text-teal-400 font-medium">{getActiveEnvironments(dashboardData)}</span> active</div>
                </div>
              </RevealRow>
            </>
          ) : null}
        </div>

        {/* ── Charts Section ──────────────────────────────────── */}
        <RevealRow className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4" delay={300}>
        {/* <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4"> */}
          <div className="lg:col-span-2"><ActivityChart workspaceRuns={workspaceRuns} loadTestRuns={loadTestRuns} /></div>
          <div className="lg:col-span-1"><StatusRing workspaceRuns={workspaceRuns} loadTestRuns={loadTestRuns} /></div>
        {/* </div> */}
        </RevealRow>

<RevealRow className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4" delay={400}>
        {/* <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4"> */}
          <div className="lg:col-span-1"><PerformanceScore workspaceRuns={workspaceRuns} loadTestRuns={loadTestRuns} /></div>
          <div className="lg:col-span-2"><LatencyChart loadTestRuns={loadTestRuns} /></div>
        {/* </div> */}
        </RevealRow>

        <RevealRow className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4" delay={500}>
        {/* <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4"> */}
          <MethodCards dashboardData={dashboardData} workspaceRuns={workspaceRuns} />
          <ThroughputPulse loadTestRuns={loadTestRuns} />
        {/* </div> */}
          </RevealRow>
        {/* ── Recent Collection Runs ──────────────────────────── */}
        <RevealRow className="mt-8" delay={600}>
        {/* <div className="mt-8"> */}
          {loadingLoadRuns ? <TableSkeleton cols={6} /> :<CollectionRunsTable runs={workspaceRuns} onViewDetails={onViewRunResults} loading={loadingRuns} />}
          {/* </div> */}
          </RevealRow>

        {/* ── Recent Load Test Runs ───────────────────────────── */}
        <RevealRow className="mt-8" delay={700}>
        {/* <div className="mt-8"> */}
          {loadingLoadRuns ? <TableSkeleton cols={6} /> : <LoadTestRunsTable runs={loadTestRuns || []} onViewDetails={onViewLoadTestRun} />}
          {/* </div> */}
          </RevealRow>

        {/* ── Specifications Table ────────────────────────────── */}
        <RevealRow className="mt-8" delay={800}>
        {/* <div className="mt-8"> */}
          <div className="border border-dark-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between bg-probestack-bg">
              <h3 className="text-lg font-semibold text-white">Specifications</h3>
              <div className="relative" ref={columnVisibilityRef}>
                <button ref={buttonRef} type="button" onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
                  className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer">
                  <Columns className="h-4 w-4" /><span>Columns</span>
                  <ChevronDown className={clsx("w-4 h-4 text-gray-500 transition-transform duration-200", columnVisibilityOpen && "rotate-180")} />
                </button>
                {columnVisibilityOpen && ReactDOM.createPortal(
                  <div ref={dropdownMenuRef} className="fixed z-50 w-40 bg-dark-800 border border-dark-700 rounded-sm shadow-xl max-h-65 overflow-y-auto"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}>
                    <div className="py-1">
                      <div onClick={() => toggleAllColumns(!allColumnsVisible)} className={clsx('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-dark-700', allColumnsVisible ? 'text-primary' : 'text-gray-300')}>
                        <div className="w-4 h-4 flex items-center justify-center">{allColumnsVisible && <Check className="w-3.5 h-3.5 text-primary" />}</div>
                        <span className="flex-1">Show All</span>
                      </div>
                      <div className="border-t border-dark-700 my-1" />
                      {columnDefinitions.map((col) => (
                        <div key={col.key} onClick={() => toggleColumn(col.key)} className={clsx('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-dark-700', visibleColumns[col.key] ? 'text-primary' : 'text-gray-300')}>
                          <div className="w-4 h-4 flex items-center justify-center">{visibleColumns[col.key] && <Check className="w-3.5 h-3.5 text-primary" />}</div>
                          <span className="flex-1">{col.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>, document.body
                )}
              </div>
            </div>

            {anyColumnVisible ? (
              loadingSpecs ? <TableSkeleton cols={visibleColCount} /> : paginatedData.length > 0 ? (
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
                            <tr onClick={() => handleRowClick(item.id, item.id)}
                              className={clsx("group cursor-pointer bg-dark-700/20 hover:bg-primary/5 transition-colors", isExpanded && "bg-primary/5")}>
                              {visibleColumns.projectName && <td className="px-4 py-3 font-medium text-gray-200 whitespace-nowrap">{item.projectName}</td>}
                              {visibleColumns.specificationName && <td className="px-4 py-3"><span className="font-medium text-gray-200">{item.specificationName}</span></td>}
                              {visibleColumns.status && (
                                <td className="px-4 py-3">
                                  <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', item.status === 'Ready' ? 'text-green-400' : 'text-yellow-400')}>
                                    {item.status === 'Ready' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{item.status}
                                  </span>
                                </td>
                              )}
                              {visibleColumns.testCases && <td className="px-4 py-3"><span className="text-sm font-mono text-gray-300">{item.testCasesCount}</span></td>}
                              {visibleColumns.createdAt && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-gray-400"><Calendar className="w-3 h-3" />{item.createdAt}</div></td>}
                              {visibleColumns.updatedAt && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-gray-400"><Calendar className="w-3 h-3" />{item.updatedAt}</div></td>}
                              {visibleColumns.source && (
                                <td className="px-4 py-3">
                                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border', getSourceColor(item.source))}>{item.source.charAt(0).toUpperCase() + item.source.slice(1)}</span>
                                </td>
                              )}
                            </tr>
                            {isExpanded && (
                              <tr className="bg-dark-700/30">
                                <td colSpan={visibleColCount} className="px-4 py-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Test Cases Summary</h4>
                                      <button onClick={(e) => { e.stopPropagation(); setExpandedRow(null); setExpandedDetailsSpecId(null); }}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-700/50 hover:bg-dark-700 rounded-lg transition-colors"><ChevronUp className="w-4 h-4" /> Collapse</button>
                                    </div>
                                    {loadingTC ? (
                                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                                    ) : testCaseList.length > 0 ? (
                                      <>
                                        <div className="bg-dark-800/40 rounded-xl p-5 border border-dark-700">
                                          <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 rounded-lg bg-primary/10"><Hash className="w-5 h-5 text-primary" /></div>
                                              <div>
                                                <div className="text-xs text-gray-400 uppercase tracking-wide">Total Test Cases</div>
                                                <div className="text-2xl font-bold text-white">{testCaseList.length}</div>
                                              </div>
                                            </div>
                                            <div className="h-10 w-px bg-dark-600 hidden sm:block" />
                                            <div className="flex flex-wrap gap-4">
                                              {Object.entries(methodBreakdown).filter(([_, count]) => count > 0).map(([method, count]) => {
                                                let colorClass = ''; let icon = null;
                                                switch (method) {
                                                  case 'GET': colorClass = 'bg-green-500/20 text-green-400 border-green-500/30'; icon = <CheckCircle className="w-3 h-3" />; break;
                                                  case 'POST': colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30'; icon = <Zap className="w-3 h-3" />; break;
                                                  case 'PUT': colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; icon = <Activity className="w-3 h-3" />; break;
                                                  case 'DELETE': colorClass = 'bg-red-500/20 text-red-400 border-red-500/30'; icon = <XCircle className="w-3 h-3" />; break;
                                                  default: colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30'; icon = <ListChecks className="w-3 h-3" />;
                                                }
                                                return (
                                                  <div key={method} className="flex flex-col items-center min-w-[60px]">
                                                    <div className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold', colorClass)}>{icon}{method}</div>
                                                    <div className="text-lg font-bold text-white mt-1">{count}</div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            <button onClick={(e) => toggleDetails(item.id, e)}
                                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors border border-primary/30">
                                              <ChevronsRight className="w-4 h-4" />{showDetails ? 'Hide Details' : 'View Details'}
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
                <p className="text-xs uppercase text-gray-300">Showing {(currentPage-1)*itemsPerPage+1} to {Math.min(currentPage*itemsPerPage, filteredData.length)} of {filteredData.length}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        {/* </div> */}
        </RevealRow>
      </div>
    </div>
  );
}