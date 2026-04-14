import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Eye, Columns, ChevronDown, Clock, Check } from 'lucide-react';
import clsx from 'clsx';

const STORAGE_KEY = 'probestack_loadtest_table_columns';

const columnDefinitions = [
  { key: 'startedAt', label: 'Started' },
  { key: 'virtualUsers', label: 'Virtual Users' },
  { key: 'duration', label: 'Duration' },
  { key: 'status', label: 'Status' },
  { key: 'totalRequests', label: 'Total Requests' },
  { key: 'avgRps', label: 'Avg RPS' },
  { key: 'avgLatency', label: 'Avg Latency' },
  { key: 'p99Latency', label: 'p99' },
  { key: 'passedFailed', label: 'Passed/Failed' },
  { key: 'errorRate', label: 'Error %' },
  { key: 'triggeredBy', label: 'Triggered By' },
];

export default function LoadTestRunsTable({ runs = [], onViewDetails }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const columnVisibilityRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const itemsPerPage = 10;
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { }
    }
    return {
      startedAt: true,
      virtualUsers: true,
      duration: true,
      status: true,
      totalRequests: true,
      avgRps: true,
      avgLatency: true,
      p99Latency: true,
      passedFailed: true,
      errorRate: false,
      triggeredBy: false,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    if (!columnVisibilityOpen) return;
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.right - 150 + window.scrollX,
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

  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return runs.slice(start, start + itemsPerPage);
  }, [runs, currentPage]);

  const totalPages = Math.ceil(runs.length / itemsPerPage);

  // Helper to check if status indicates successful completion (case‑insensitive)
  const isSuccessStatus = (status) => {
    if (!status) return false;
    const normalized = status.toUpperCase();
    return normalized === 'DONE' || normalized === 'COMPLETED' || normalized === 'SUCCESS';
  };

  const getTooltipContent = (colKey, run) => {
    const result = run.result ?? run;
    const config = run.config ?? {};

    switch (colKey) {
      case 'startedAt':
        return (
          <div className="space-y-1">
            <div>Started: {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}</div>
            {run.completedAt && <div>Completed: {new Date(run.completedAt).toLocaleString()}</div>}
            {run.status && <div>Status: <span className="capitalize">{run.status}</span></div>}
          </div>
        );
      case 'virtualUsers':
        return (
          <div>
            Virtual Users: {config.concurrency ?? run.concurrency ?? 0}
            {(config.rampUpSeconds ?? run.rampUpSeconds ?? 0) > 0 &&
              <div>Ramp-up: {config.rampUpSeconds ?? run.rampUpSeconds}s</div>}
          </div>
        );
      case 'duration':
        return (
          <div>
            Duration: {config.durationSeconds ?? run.durationSeconds ?? 0}s
            {(config.totalRequests ?? run.totalRequests ?? -1) > 0 &&
              <div>Request limit: {config.totalRequests ?? run.totalRequests}</div>}
          </div>
        );
      case 'status': {
        const success = isSuccessStatus(run.status);
        if (success) {
          return (
            <div className="space-y-1">
              <div>Status: successfully completed</div>
              {run.completedAt && <div>Completed at: {new Date(run.completedAt).toLocaleString()}</div>}
            </div>
          );
        } else {
          return (
            <div className="space-y-1">
              <div>Status: failed to complete the test</div>
              {run.completedAt && <div>Failed at: {new Date(run.completedAt).toLocaleString()}</div>}
              {run.status && <div>Reason: {run.status}</div>}
            </div>
          );
        }
      }
      case 'totalRequests':
        return (
          <div>
            Total: {result.totalRequests ?? 0}
            <div>Successful: {result.successfulRequests ?? 0}</div>
            <div>Failed: {result.failedRequests ?? 0}</div>
            {(result.networkErrors ?? 0) > 0 && <div>Network Errors: {result.networkErrors}</div>}
            {(result.timeoutErrors ?? 0) > 0 && <div>Timeout Errors: {result.timeoutErrors}</div>}
          </div>
        );
      case 'avgRps':
        const rps = result.actualRps ?? run.actualRps;
        const successRps = result.successRps ?? run.successRps;
        return (
          <div>
            Avg RPS: {rps ? rps.toFixed(2) : '-'}
            {successRps && <div>Success RPS: {successRps.toFixed(2)}</div>}
          </div>
        );
      case 'avgLatency':
        const avg = result.avgLatencyMs ?? run.avgLatencyMs;
        return <div>Avg: {avg ? Math.round(avg) + 'ms' : '-'}</div>;
      case 'p99Latency':
        const p = result.percentiles ?? {};
        const p99 = result.p99Ms ?? run.p99Ms ?? p.p99;
        return <div>p99: {p99 ? p99 + 'ms' : '-'}</div>;
      case 'passedFailed':
        const passed = result.successfulRequests ?? run.successfulRequests ?? 0;
        const failed = result.failedRequests ?? run.failedRequests ?? 0;
        const total = result.totalRequests ?? run.totalRequests ?? 0;
        return (
          <div>
            Passed: {passed}
            <div>Failed: {failed}</div>
            {total > 0 && <div>Pass Rate: {((passed / total) * 100).toFixed(1)}%</div>}
          </div>
        );
      case 'errorRate':
        const errorCount = result.failedRequests ?? run.failedRequests ?? 0;
        const totalReqs = result.totalRequests ?? run.totalRequests ?? 0;
        const errorTypes = result.errorTypes ?? run.errorTypes ?? {};
        const rate = totalReqs > 0 ? ((errorCount / totalReqs) * 100).toFixed(2) : (result.errorRatePct ?? run.errorRatePct);
        return (
          <div>
            Error Rate: {rate !== undefined ? rate + '%' : '-'}
            {Object.keys(errorTypes).length > 0 && (
              <div className="mt-1">
                <div className="font-medium">Errors by type:</div>
                {Object.entries(errorTypes).map(([type, count]) => (
                  <div key={type}>{type}: {count}</div>
                ))}
              </div>
            )}
          </div>
        );
      case 'triggeredBy':
        const user = run.triggeredByUser;
        if (user) {
          return (
            <div className="space-y-1">
              <div><span className="font-medium">Username:</span> {user.username}</div>
              <div><span className="font-medium">Full Name:</span> {user.fullName}</div>
              <div><span className="font-medium">Email:</span> {user.email}</div>
            </div>
          );
        }
        const triggeredByStr = typeof run.triggeredBy === 'string'
          ? run.triggeredBy
          : (run.triggeredBy ? JSON.stringify(run.triggeredBy) : '-');
        return <div>ID: {triggeredByStr}</div>;
      default:
        return null;
    }
  };

  if (runs.length === 0) {
    return (
      <div className="bg-dark-800/60 border border-dark-700 rounded-xl p-12 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-dark-700/50 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-1">No load test runs yet</h4>
          <p className="text-sm text-gray-300 max-w-md">Run a load test to see results here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-dark-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between bg-probestack-bg">
        <h3 className="text-lg font-semibold text-white">Load Test Data</h3>
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
                <div
                  onClick={() => toggleAllColumns(!allColumnsVisible)}
                  className={clsx('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-dark-700', allColumnsVisible ? 'text-primary' : 'text-gray-300')}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {allColumnsVisible && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="flex-1">Show All</span>
                </div>
                <div className="border-t border-dark-700 my-1"></div>
                {columnDefinitions.map((col) => (
                  <div
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={clsx('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-dark-700', visibleColumns[col.key] ? 'text-primary' : 'text-gray-300')}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {visibleColumns[col.key] && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-700/60 border-b border-dark-700">
              <tr>
                {visibleColumns.startedAt && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Started</th>}
                {visibleColumns.virtualUsers && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">VUsers</th>}
                {visibleColumns.duration && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Duration</th>}
                {visibleColumns.status && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Status</th>}
                {visibleColumns.totalRequests && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Total Req</th>}
                {visibleColumns.avgRps && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Avg RPS</th>}
                {visibleColumns.avgLatency && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Avg Latency</th>}
                {visibleColumns.p99Latency && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">p99</th>}
                {visibleColumns.passedFailed && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Passed/Failed</th>}
                {visibleColumns.errorRate && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Error %</th>}
                {visibleColumns.triggeredBy && <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Triggered By</th>}
                <th className="px-4 py-3 text-xs uppercase font-medium text-gray-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {paginatedRuns.map((run) => {
                const result = run.result ?? run;
                const config = run.config ?? {};
                const concurrency = config.concurrency ?? run.concurrency ?? 0;
                const durationSec = config.durationSeconds ?? run.durationSeconds ?? 0;
                const avgRps = result.actualRps ? result.actualRps.toFixed(1) : (run.actualRps ? run.actualRps.toFixed(1) : '-');
                const avgLatency = result.avgLatencyMs ? Math.round(result.avgLatencyMs) + 'ms' : (run.avgLatencyMs ? Math.round(run.avgLatencyMs) + 'ms' : '-');
                const p99 = result.p99Ms ?? run.p99Ms ?? result.percentiles?.['p99'];
                const p99Display = p99 != null ? p99 + 'ms' : '-';
                const errorRate = result.totalRequests
                  ? ((result.failedRequests / result.totalRequests) * 100).toFixed(1) + '%'
                  : (result.errorRatePct != null ? result.errorRatePct.toFixed(1) + '%' : (run.errorRatePct != null ? run.errorRatePct.toFixed(1) + '%' : '-'));

                const isSuccess = isSuccessStatus(run.status);
                const statusDisplay = isSuccess ? 'success' : 'failed';

                const createTooltipHandler = (colKey) => ({
                  onMouseEnter: (e) => {
                    const content = getTooltipContent(colKey, run);
                    if (content) {
                      setTooltip({ show: true, x: e.clientX, y: e.clientY, content });
                    }
                  },
                  onMouseLeave: () => setTooltip({ show: false, content: null }),
                  onMouseMove: (e) => {
                    if (tooltip.show) {
                      setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                    }
                  }
                });

                return (
                  <tr key={run.testId ?? run.loadTestId} className="bg-dark-700/20 hover:bg-primary/5 transition-colors">
                    {visibleColumns.startedAt && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('startedAt')}>
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
                      </td>
                    )}
                    {visibleColumns.virtualUsers && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('virtualUsers')}>
                        {concurrency}
                      </td>
                    )}
                    {visibleColumns.duration && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('duration')}>
                        {durationSec ? durationSec + 's' : '-'}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-4 py-3 text-sm whitespace-nowrap cursor-help" {...createTooltipHandler('status')}>
                        <span className={clsx(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border",
                          isSuccess ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}>
                          {statusDisplay}
                        </span>
                      </td>
                    )}
                    {visibleColumns.totalRequests && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('totalRequests')}>
                        {result.totalRequests ?? 0}
                      </td>
                    )}
                    {visibleColumns.avgRps && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('avgRps')}>
                        {avgRps}
                      </td>
                    )}
                    {visibleColumns.avgLatency && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('avgLatency')}>
                        {avgLatency}
                      </td>
                    )}
                    {visibleColumns.p99Latency && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('p99Latency')}>
                        {p99Display}
                      </td>
                    )}
                    {visibleColumns.passedFailed && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('passedFailed')}>
                        <span className="text-green-400">{result.successfulRequests ?? 0}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-red-400">{result.failedRequests ?? 0}</span>
                      </td>
                    )}
                    {visibleColumns.errorRate && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('errorRate')}>
                        {errorRate}
                      </td>
                    )}
                    {visibleColumns.triggeredBy && (
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap cursor-help" {...createTooltipHandler('triggeredBy')}>
                        <span>
                          {run.triggeredByUser?.fullName
                            ? (run.triggeredByUser.fullName.length > 7 ? run.triggeredByUser.fullName.slice(0, 7) + '…' : run.triggeredByUser.fullName)
                            : (typeof run.triggeredBy === 'string'
                              ? (run.triggeredBy.length > 8 ? run.triggeredBy.slice(0, 8) + '…' : run.triggeredBy)
                              : (run.triggeredBy ? JSON.stringify(run.triggeredBy) : '-'))}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => onViewDetails(run)} className="p-1.5 rounded text-gray-300 hover:text-white hover:bg-dark-700 transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-gray-400 italic">No columns selected. Please choose at least one column.</div>
      )}

      {anyColumnVisible && runs.length > 0 && (
        <div className="px-4 py-3 border-t border-dark-700 bg-dark-700/60 flex items-center justify-between">
          <p className="text-xs uppercase text-gray-300">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, runs.length)} of {runs.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {tooltip.show && tooltip.content && ReactDOM.createPortal(
        <div className="fixed z-50 pointer-events-none bg-probestack-bg border border-dark-600 rounded-lg shadow-xl p-3 text-sm text-gray-200 max-w-xs" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          {tooltip.content}
        </div>,
        document.body
      )}
    </div>
  );
}