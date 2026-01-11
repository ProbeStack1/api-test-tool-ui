import React from 'react';
import { CheckCircle2, XCircle, Clock, Database, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function IDEExecutionInsights({ response, isLoading, error, executionHistory = [] }) {
  const isSuccess = response?.status >= 200 && response?.status < 300;
  const recentExecutions = executionHistory.slice(0, 5);

  return (
    <div className="w-56 border-l border-dark-700 bg-dark-800/40 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-dark-700 bg-dark-800/60">
        <h3 className="text-xs font-semibold text-gray-300">Insights</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Status */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Status</label>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Executing</span>
            </div>
          ) : response || error ? (
            <div className={clsx(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
              isSuccess ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
            )}>
              {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>{response?.status || 'Error'}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>

        {/* Latency */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Latency</label>
          {response ? (
            <div className="text-xs font-mono text-gray-300">{response.time}ms</div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>

        {/* Response Size */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Size</label>
          {response ? (
            <div className="text-xs font-mono text-gray-300">{response.size} B</div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>

        {/* Validation Summary */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Validation</label>
          {response ? (
            <div className="flex items-center gap-1.5 text-xs">
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-gray-300">Passed</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-gray-300">Failed</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>

        {/* Execution History */}
        {recentExecutions.length > 0 && (
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Recent</label>
            <div className="space-y-1.5">
              {recentExecutions.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 text-xs py-1">
                  <div className={clsx(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    item.status >= 200 && item.status < 300 ? "bg-green-400" : "bg-red-400"
                  )} />
                  <span className={clsx(
                    "font-bold text-[10px] px-1 py-0.5 rounded",
                    item.method === 'GET' && "text-green-400 bg-green-400/10",
                    item.method === 'POST' && "text-yellow-400 bg-yellow-400/10",
                    "text-purple-400 bg-purple-400/10"
                  )}>
                    {item.method}
                  </span>
                  <span className="text-gray-500 font-mono text-[10px] truncate">{item.time}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

