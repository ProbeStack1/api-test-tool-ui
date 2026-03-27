import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Eye, Columns, ChevronDown, Clock } from 'lucide-react';
import clsx from 'clsx';

const STORAGE_KEY = 'probestack_runs_table_columns';

const columnDefinitions = [
  { key: 'startedAt', label: 'Started' },
  { key: 'source', label: 'Source' },
  { key: 'collectionName', label: 'Collection' },
  { key: 'iterations', label: 'Iterations' },
  { key: 'totalRequests', label: 'Total' },
  { key: 'passedFailed', label: 'Passed/Failed' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'errors', label: 'Errors' },
  { key: 'totalTime', label: 'Total Time' },
  { key: 'avgTime', label: 'Avg Time' },
  { key: 'triggeredBy', label: 'Triggered By' },
];

export default function CollectionRunsTable({ runs = [], onViewDetails }) {
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
      source: true,
      collectionName: true,
      iterations: true,
      totalRequests: false,
      passedFailed: true,
      skipped: true,
      errors: false,
      totalTime: true,
      avgTime: true,
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
    const options = run.options || {};

    switch (colKey) {
      case 'startedAt':
        return (
          <div className="space-y-1">
            <div>Started: {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}</div>
            {run.completedAt && <div>Completed: {new Date(run.completedAt).toLocaleString()}</div>}
            {run.status && <div>Status: <span className="capitalize">{run.status}</span></div>}
          </div>
        );
      case 'source':
        const sourceStr = typeof run.source === 'string'
          ? run.source
          : (run.source ? JSON.stringify(run.source) : 'manual');
        return <div>Source: {sourceStr}</div>;
      case 'collectionName':
        return (
          <div>
            <div>Name: {run.collectionName || '-'}</div>
            <div>ID: {run.collectionId || '-'}</div>
            <div>Project: {run.workspaceId || '-'}</div>
          </div>
        );
      case 'iterations':
        const envString = options.environment
          ? JSON.stringify(options.environment, null, 2)
          : null;
        return (
          <div>
            <div>Iterations: {options.iterations || 1}</div>
            <div>Delay: {options.delayMs || 0}ms</div>
            <div>Timeout: {options.timeoutMs || 30000}ms</div>
            {envString && <div>Environment: <pre className="text-xs mt-1 whitespace-pre-wrap">{envString}</pre></div>}
            {options.dataFile && <div>Data File: {options.dataFile}</div>}
            {options.bail && <div>Bail on failure: Yes</div>}
          </div>
        );
      case 'totalRequests':
        return (
          <div>
            <div>Total: {run.totalRequests || 0}</div>
            <div>Passed: {run.passedRequests || 0}</div>
            <div>Failed: {run.failedRequests || 0}</div>
            <div>Skipped: {run.skippedRequests || 0}</div>
            {run.totalAssertions > 0 && (
              <>
                <div>Total Assertions: {run.totalAssertions}</div>
                <div>Passed Assertions: {run.passedAssertions}</div>
                <div>Failed Assertions: {run.failedAssertions}</div>
              </>
            )}
          </div>
        );
      case 'passedFailed':
        const total = run.totalRequests || 0;
        const passRate = total > 0 ? ((run.passedRequests / total) * 100).toFixed(1) : 0;
        return (
          <div>
            <div>Passed: {run.passedRequests || 0}</div>
            <div>Failed: {run.failedRequests || 0}</div>
            <div>Pass Rate: {passRate}%</div>
          </div>
        );
      case 'skipped':
        return <div>Skipped: {run.skippedRequests || 0}</div>;
      case 'errors':
        const errors = (run.results || []).filter(r => !r.passed && r.error);
        if (errors.length === 0) return <div>No errors</div>;
        return (
          <div>
            <div>Error Count: {errors.length}</div>
            <div className="mt-1 max-h-32 overflow-y-auto">
              {errors.slice(0, 5).map((err, idx) => (
                <div key={idx} className="text-xs text-red-400 mt-1 border-t border-dark-600 pt-1">
                  <div className="font-mono break-words">{err.requestName}</div>
                  <div className="text-xs text-gray-400">{err.error}</div>
                </div>
              ))}
              {errors.length > 5 && <div className="text-xs text-gray-400 mt-1">+ {errors.length - 5} more</div>}
            </div>
          </div>
        );
      case 'totalTime':
        return <div>Total Time: {run.totalTimeMs ? `${Math.round(run.totalTimeMs)}ms` : '-'}</div>;
      case 'avgTime':
        const avg = run.totalRequests > 0 ? (run.totalTimeMs / run.totalRequests).toFixed(1) : 0;
        return <div>Avg Time per Request: {avg}ms</div>;
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
        return <div>Triggered By: {triggeredByStr}</div>;
      default:
        return null;
    }
  };

  if (runs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No functional runs found</p>
        <p className="text-xs text-gray-500 mt-1">Run a functional test to see results here</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/40 border border-dark-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Functional Test Runs</h3>
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
                {visibleColumns.source && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Source</th>}
                {visibleColumns.collectionName && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Collection</th>}
                {visibleColumns.iterations && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Iterations</th>}
                {visibleColumns.totalRequests && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Total</th>}
                {visibleColumns.passedFailed && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Passed/Failed</th>}
                {visibleColumns.skipped && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Skipped</th>}
                {visibleColumns.errors && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Errors</th>}
                {visibleColumns.totalTime && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Total Time</th>}
                {visibleColumns.avgTime && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Avg Time</th>}
                {visibleColumns.triggeredBy && <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Triggered By</th>}
                <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {paginatedRuns.map((run) => {
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

                const sourceDisplay = typeof run.source === 'string'
                  ? run.source
                  : (run.source ? JSON.stringify(run.source) : 'manual');
                
                let triggeredByDisplay = '-';
                if (run.triggeredByUser?.fullName) {
                  triggeredByDisplay = run.triggeredByUser.fullName;
                } else if (typeof run.triggeredBy === 'string') {
                  triggeredByDisplay = run.triggeredBy.length > 8 ? run.triggeredBy.slice(0, 8) + '…' : run.triggeredBy;
                } else if (run.triggeredBy) {
                  const str = JSON.stringify(run.triggeredBy);
                  triggeredByDisplay = str.length > 8 ? str.slice(0, 8) + '…' : str;
                }

                return (
                  <tr key={run.runId} className="hover:bg-dark-800/30">
                    {visibleColumns.startedAt && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('startedAt')}
                      >
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
                      </td>
                    )}
                    {visibleColumns.source && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('source')}
                      >
                        {sourceDisplay}
                      </td>
                    )}
                    {visibleColumns.collectionName && (
                      <td
                        className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('collectionName')}
                      >
                        {run.collectionName || '-'}
                      </td>
                    )}
                    {visibleColumns.iterations && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('iterations')}
                      >
                        {run.options?.iterations || 1}
                      </td>
                    )}
                    {visibleColumns.totalRequests && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('totalRequests')}
                      >
                        {run.totalRequests}
                      </td>
                    )}
                    {visibleColumns.passedFailed && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('passedFailed')}
                      >
                        <span className="text-green-400">{run.passedRequests}</span>
                        <span className="text-gray-500 mx-1">/</span>
                        <span className="text-red-400">{run.failedRequests}</span>
                      </td>
                    )}
                    {visibleColumns.skipped && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('skipped')}
                      >
                        {run.skippedRequests}
                      </td>
                    )}
                    {visibleColumns.errors && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('errors')}
                      >
                        {run.failedRequests}
                      </td>
                    )}
                    {visibleColumns.totalTime && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('totalTime')}
                      >
                        {run.totalTimeMs ? `${Math.round(run.totalTimeMs)}ms` : '-'}
                      </td>
                    )}
                    {visibleColumns.avgTime && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('avgTime')}
                      >
                        {run.totalRequests > 0 ? `${Math.round(run.totalTimeMs / run.totalRequests)}ms` : '-'}
                      </td>
                    )}
                    {visibleColumns.triggeredBy && (
                      <td
                        className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap cursor-help"
                        {...createTooltipHandler('triggeredBy')}
                      >
                        <span>{triggeredByDisplay}</span>
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