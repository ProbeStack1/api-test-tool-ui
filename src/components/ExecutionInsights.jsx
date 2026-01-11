import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Database, Activity, History as HistoryIcon, TrendingUp, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function ExecutionInsights({ response, isLoading, error, executionHistory = [] }) {
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'raw'

  const hasResponse = !!response;
  const isSuccess = response?.status >= 200 && response?.status < 300;

  // Calculate metrics
  const recentExecutions = executionHistory.slice(0, 10);
  const avgLatency = recentExecutions.length > 0
    ? Math.round(recentExecutions.reduce((sum, e) => sum + (e.time || 0), 0) / recentExecutions.length)
    : null;

  return (
    <div className="flex-1 bg-dark-800/40 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700/50 bg-dark-800/60">
        <h3 className="text-sm font-semibold text-gray-200">Execution Insights</h3>
      </div>

      {/* Insight Cards Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {/* Last Execution Status Card */}
          <div className="bg-dark-900/50 border border-dark-700/50 rounded-xl overflow-hidden">
            <div className="p-4 bg-dark-800/30 border-b border-dark-700/50 flex items-center gap-2">
              <div className={clsx(
                "w-2 h-2 rounded-full",
                isLoading ? "bg-yellow-400 animate-pulse" : hasResponse ? (isSuccess ? "bg-green-400" : "bg-red-400") : "bg-gray-500"
              )} />
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Last Execution</h4>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">In progress...</span>
                </div>
              ) : hasResponse ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={clsx(
                      "text-xs font-bold px-2 py-1 rounded",
                      isSuccess ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                    )}>
                      {response.status} {response.statusText}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Time</span>
                    <span className="text-xs font-mono text-gray-300">{response.time}ms</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No executions yet</p>
              )}
            </div>
          </div>

          {/* Latency Trend Card */}
          <div className="bg-dark-900/50 border border-dark-700/50 rounded-xl overflow-hidden">
            <div className="p-4 bg-dark-800/30 border-b border-dark-700/50 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Latency Trend</h4>
            </div>
            <div className="p-4">
              {recentExecutions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-1 h-16">
                    {recentExecutions.slice(-8).map((exec, idx) => {
                      const maxTime = Math.max(...recentExecutions.map(e => e.time || 0));
                      const height = maxTime > 0 ? ((exec.time || 0) / maxTime) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-primary/40 rounded-t transition-all hover:bg-primary/60"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${exec.time}ms`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {avgLatency && (
                    <div className="flex items-center justify-between pt-2 border-t border-dark-700/30">
                      <span className="text-xs text-gray-400">Average</span>
                      <span className="text-xs font-mono text-gray-300">{avgLatency}ms</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center">
                  <p className="text-xs text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Response Size Card */}
          <div className="bg-dark-900/50 border border-dark-700/50 rounded-xl overflow-hidden">
            <div className="p-4 bg-dark-800/30 border-b border-dark-700/50 flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Response Size</h4>
            </div>
            <div className="p-4">
              {hasResponse ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-200">{response.size} B</div>
                  <p className="text-xs text-gray-500">{response.size > 1024 ? `${(response.size / 1024).toFixed(2)} KB` : 'Bytes'}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No data available</p>
              )}
            </div>
          </div>

          {/* Validation Summary Card */}
          <div className="bg-dark-900/50 border border-dark-700/50 rounded-xl overflow-hidden">
            <div className="p-4 bg-dark-800/30 border-b border-dark-700/50 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Validation</h4>
            </div>
            <div className="p-4">
              {hasResponse ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-gray-300">All checks passed</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-gray-300">Validation failed</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">No custom tests configured</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Configure tests to enable validation</p>
              )}
            </div>
          </div>

          {/* Response Body Card */}
          <div className="bg-dark-900/50 border border-dark-700/50 rounded-xl overflow-hidden md:col-span-2 lg:col-span-3">
            <div className="p-4 bg-dark-800/30 border-b border-dark-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Response Body</h4>
              </div>
              {hasResponse && (
                <div className="flex gap-1 bg-dark-900/50 rounded-lg p-1 border border-dark-700/50">
                  <button
                    onClick={() => setViewMode('formatted')}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-medium rounded transition-all",
                      viewMode === 'formatted'
                        ? "bg-primary/20 text-primary"
                        : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-medium rounded transition-all",
                      viewMode === 'raw'
                        ? "bg-primary/20 text-primary"
                        : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    Raw
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap">
                    {error.message || JSON.stringify(error, null, 2)}
                  </pre>
                </div>
              ) : hasResponse ? (
                <div className="max-h-64 overflow-auto">
                  {viewMode === 'formatted' ? (
                    <pre className="text-xs font-mono text-gray-300 leading-relaxed">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  ) : (
                    <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(response.data)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="w-8 h-8 text-gray-600 opacity-50 mb-2" />
                  <p className="text-xs text-gray-500">Execute a request to view response</p>
                </div>
              )}
            </div>
          </div>

          {/* Execution History Card */}
          {executionHistory.length > 0 && (
            <div className="bg-dark-900/50 border border-dark-700/50 rounded-xl overflow-hidden md:col-span-2 lg:col-span-3">
              <div className="p-4 bg-dark-800/30 border-b border-dark-700/50 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Execution History</h4>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {executionHistory.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-xs py-2 border-b border-dark-700/30 last:border-b-0">
                      <div className={clsx(
                        "w-2 h-2 rounded-full",
                        item.status >= 200 && item.status < 300 ? "bg-green-400" : "bg-red-400"
                      )} />
                      <span className="text-gray-500 font-mono w-20">{new Date(item.date).toLocaleTimeString()}</span>
                      <span className={clsx(
                        "font-bold px-1.5 py-0.5 rounded text-[10px]",
                        item.method === 'GET' && "text-green-400 bg-green-400/10",
                        item.method === 'POST' && "text-yellow-400 bg-yellow-400/10",
                        item.method === 'PUT' && "text-blue-400 bg-blue-400/10",
                        item.method === 'DELETE' && "text-red-400 bg-red-400/10",
                        "text-purple-400 bg-purple-400/10"
                      )}>
                        {item.method}
                      </span>
                      <span className="text-gray-300 truncate flex-1">{item.url}</span>
                      <span className="text-gray-500 font-mono">{item.time}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
