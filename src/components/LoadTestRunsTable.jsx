import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Eye, Columns, ChevronDown, Clock } from 'lucide-react';
import clsx from 'clsx';

const STORAGE_KEY = 'probestack_loadtest_table_columns';

const columnDefinitions = [
  { key: 'startedAt', label: 'Started' },
  { key: 'virtualUsers', label: 'Virtual Users' },
  { key: 'duration', label: 'Duration' },
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
  const itemsPerPage = 10;
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      startedAt: true,
      virtualUsers: true,
      duration: true,
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

  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return runs.slice(start, start + itemsPerPage);
  }, [runs, currentPage]);

  const totalPages = Math.ceil(runs.length / itemsPerPage);

  // Helper to generate tooltip content for a given column and run
  const getTooltipContent = (colKey, run) => {
    // Extract data from both old nested shape and new flat shape
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
        // const min = result.minLatencyMs ?? run.minLatencyMs;
        // const max = result.maxLatencyMs ?? run.maxLatencyMs;
        // const std = result.stdDevLatencyMs ?? run.stdDevLatencyMs;
        return (
          <div>
            Avg: {avg ? Math.round(avg) + 'ms' : '-'}
            {/* <div>Min: {min ? min + 'ms' : '-'}</div>
            <div>Max: {max ? max + 'ms' : '-'}</div>
            <div>Std Dev: {std ? std.toFixed(1) + 'ms' : '-'}</div> */}
          </div>
        );
      case 'p99Latency':
        const p = result.percentiles ?? {};
        // Also check top-level p99Ms (used in history items)
        const p99 = result.p99Ms ?? run.p99Ms ?? p.p99;
        const p50 = result.p50Ms ?? run.p50Ms ?? p.p50;
        const p90 = result.p90Ms ?? run.p90Ms ?? p.p90;
        const p95 = result.p95Ms ?? run.p95Ms ?? p.p95;
        const p99_9 = result.p99_9Ms ?? run.p99_9Ms ?? p.p99_9;
        return (
          <div>
            {/* p50: {p50 ? p50 + 'ms' : '-'} */}
            {/* <div>p90: {p90 ? p90 + 'ms' : '-'}</div> */}
            {/* <div>p95: {p95 ? p95 + 'ms' : '-'}</div> */}
            <div>p99: {p99 ? p99 + 'ms' : '-'}</div>
            {/* <div>p99.9: {p99_9 ? p99_9 + 'ms' : '-'}</div> */}
          </div>
        );
      case 'passedFailed':
        const passed = result.successfulRequests ?? run.successfulRequests ?? 0;
        const failed = result.failedRequests ?? run.failedRequests ?? 0;
        const total = result.totalRequests ?? run.totalRequests ?? 0;
        return (
          <div>
            Passed: {passed}
            <div>Failed: {failed}</div>
            {total > 0 && (
              <div>Pass Rate: {((passed / total) * 100).toFixed(1)}%</div>
            )}
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
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No load test runs found</p>
        <p className="text-xs text-gray-500 mt-1">Run a load test to see results here</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/40 border border-dark-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Load Test Runs</h3>
        <div className="relative" ref={columnVisibilityRef}>
          <button
            onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-700 bg-dark-800/50 text-white hover:border-primary/50 focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all outline-none cursor-pointer text-sm"
          >
            <Columns className="h-4 w-4" />
            <span>Columns</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${columnVisibilityOpen ? 'rotate-180' : ''}`} />
          </button>

          {columnVisibilityOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-dark-700 bg-dark-800/95 backdrop-blur-xl shadow-lg overflow-hidden z-30 max-h-96 overflow-y-auto">
              <div className="py-2">
                <div className="px-4 py-2.5 border-b border-dark-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allColumnsVisible}
                      onChange={(e) => toggleAllColumns(e.target.checked)}
                      className="cursor-pointer w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-sm font-medium text-white">Show All</span>
                  </label>
                </div>
                {columnDefinitions.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-dark-700/50">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key] || false}
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
      </div>

      {/* Table */}
      {anyColumnVisible ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-800/60 border-b border-dark-700">
              <tr>
                {visibleColumns.startedAt && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Started</th>}
                {visibleColumns.virtualUsers && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">VUsers</th>}
                {visibleColumns.duration && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Duration</th>}
                {visibleColumns.totalRequests && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Total Req</th>}
                {visibleColumns.avgRps && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Avg RPS</th>}
                {visibleColumns.avgLatency && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Avg Latency</th>}
                {visibleColumns.p99Latency && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">p99</th>}
                {visibleColumns.passedFailed && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Passed/Failed</th>}
                {visibleColumns.errorRate && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Error %</th>}
                {visibleColumns.triggeredBy && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Triggered By</th>}
                <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {paginatedRuns.map((run) => {
                // Extract data from both old nested shape and new flat shape
                const result = run.result ?? run;
                const config = run.config ?? {};

                // Use top-level fields if available, else fallback to nested
                const concurrency = config.concurrency ?? run.concurrency ?? 0;
                const durationSec = config.durationSeconds ?? run.durationSeconds ?? 0;
                const avgRps = result.actualRps ? result.actualRps.toFixed(1) : (run.actualRps ? run.actualRps.toFixed(1) : '-');
                const avgLatency = result.avgLatencyMs ? Math.round(result.avgLatencyMs) + 'ms' : (run.avgLatencyMs ? Math.round(run.avgLatencyMs) + 'ms' : '-');
                const p99 = result.p99Ms ?? run.p99Ms ?? result.percentiles?.['p99'];
                const p99Display = p99 != null ? p99 + 'ms' : '-';
                const errorRate = result.totalRequests
                  ? ((result.failedRequests / result.totalRequests) * 100).toFixed(1) + '%'
                  : (result.errorRatePct != null ? result.errorRatePct.toFixed(1) + '%' : (run.errorRatePct != null ? run.errorRatePct.toFixed(1) + '%' : '-'));

                const createTooltipHandler = (colKey) => ({
                  onMouseEnter: (e) => {
                    const content = getTooltipContent(colKey, run);
                    if (content) {
                      setTooltip({
                        show: true,
                        x: e.clientX,
                        y: e.clientY,
                        content
                      });
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
                  <tr key={run.testId ?? run.loadTestId} className="hover:bg-dark-800/30">
                    {visibleColumns.startedAt && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('startedAt')}
                      >
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
                      </td>
                    )}
                    {visibleColumns.virtualUsers && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('virtualUsers')}
                      >
                        {concurrency}
                      </td>
                    )}
                    {visibleColumns.duration && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('duration')}
                      >
                        {durationSec ? durationSec + 's' : '-'}
                      </td>
                    )}
                    {visibleColumns.totalRequests && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('totalRequests')}
                      >
                        {result.totalRequests ?? 0}
                      </td>
                    )}
                    {visibleColumns.avgRps && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('avgRps')}
                      >
                        {avgRps}
                      </td>
                    )}
                    {visibleColumns.avgLatency && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('avgLatency')}
                      >
                        {avgLatency}
                      </td>
                    )}
                    {visibleColumns.p99Latency && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('p99Latency')}
                      >
                        {p99Display}
                      </td>
                    )}
                    {visibleColumns.passedFailed && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('passedFailed')}
                      >
                        <span className="text-green-400">{result.successfulRequests ?? 0}</span>
                        <span className="text-gray-500 mx-1">/</span>
                        <span className="text-red-400">{result.failedRequests ?? 0}</span>
                      </td>
                    )}
                    {visibleColumns.errorRate && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('errorRate')}
                      >
                        {errorRate}
                      </td>
                    )}
                    {visibleColumns.triggeredBy && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('triggeredBy')}
                      >
                        <span>
                          {run.triggeredByUser?.fullName
                            ? (run.triggeredByUser.fullName.length > 7
                              ? run.triggeredByUser.fullName.slice(0, 7) + '…'
                              : run.triggeredByUser.fullName)
                            : (typeof run.triggeredBy === 'string'
                                ? (run.triggeredBy.length > 8 ? run.triggeredBy.slice(0, 8) + '…' : run.triggeredBy)
                                : (run.triggeredBy ? JSON.stringify(run.triggeredBy) : '-'))}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onViewDetails(run)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                        title="View Details"
                      >
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
        <div className="p-12 text-center text-gray-500 italic">No columns selected.</div>
      )}

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-dark-700 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Showing {paginatedRuns.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, runs.length)} of {runs.length}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p-1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm bg-dark-800 border border-dark-700 rounded hover:bg-dark-700 disabled:opacity-50 text-gray-300 flex items-center gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tooltip Portal */}
      {tooltip.show && tooltip.content && ReactDOM.createPortal(
        <div
          className="fixed z-50 pointer-events-none bg-dark-900 border border-dark-600 rounded-lg shadow-xl p-3 text-sm text-gray-200 max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.content}
        </div>,
        document.body
      )}
    </div>
  );
}