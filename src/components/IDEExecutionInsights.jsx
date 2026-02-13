import React from 'react';
import { CheckCircle2, XCircle, Clock, Database, AlertCircle, Gauge, CheckSquare, LockOpen, Info } from 'lucide-react';
import clsx from 'clsx';

export default function IDEExecutionInsights({ response, isLoading, error, executionHistory = [], forgeqStyle = false }) {
  const isSuccess = response?.status >= 200 && response?.status < 300;
  const recentExecutions = executionHistory.slice(0, 5);

  if (forgeqStyle) {
    return (
      <aside className="w-64 min-w-[16rem] border-l border-dark-700 flex flex-col bg-dark-800/40 flex-shrink-0 min-h-0 overflow-hidden">
        <div className="p-4 border-b border-dark-700 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Execution Insights</h3>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {/* Status */}
          <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
              <Info className="h-3.5 w-3.5 text-gray-500" />
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Executing</span>
              </div>
            ) : response || error ? (
              <div className={clsx(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium',
                isSuccess ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
              )}>
                {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{response?.status || 'Error'}</span>
              </div>
            ) : (
              <span className="text-xl font-mono font-semibold text-gray-500 block">—</span>
            )}
            <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: response || error ? '100%' : '0%' }}
              />
            </div>
          </div>

          {/* Latency */}
          <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Latency</span>
              <Gauge className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <span className="text-xl font-mono font-semibold text-gray-400 block">
              {response ? `${response.time}ms` : '—'}
            </span>
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>MIN: —</span>
              <span>MAX: —</span>
            </div>
          </div>

          {/* Validation */}
          <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Validation</span>
              <CheckSquare className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <span className="text-xl font-mono font-semibold text-gray-400 block">
              {response ? (isSuccess ? 'Passed' : 'Failed') : '—'}
            </span>
            <div className="flex gap-1.5">
              <div className={clsx('flex-1 h-1.5 rounded-full', response && isSuccess ? 'bg-green-500/60' : 'bg-dark-700')} />
              <div className={clsx('flex-1 h-1.5 rounded-full', response && !isSuccess ? 'bg-red-500/60' : 'bg-dark-700')} />
              <div className="flex-1 h-1.5 rounded-full bg-dark-700" />
            </div>
          </div>

          {/* Auth card - Forgeq style */}
          <div className="p-4 rounded-xl border border-dashed border-dark-700 bg-dark-800/80 flex flex-col items-center text-center gap-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
              <LockOpen className="h-5 w-5 text-gray-500" />
            </div>
            <span className="text-xs font-semibold text-gray-400">No Auth Inherited</span>
            <button type="button" className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider">
              Configure Auth
            </button>
          </div>
        </div>
      </aside>
    );
  }

  /* Original compact style */
  return (
    <div className="w-56 border-l border-dark-700 bg-dark-800/40 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-dark-700 bg-dark-800/60">
        <h3 className="text-xs font-semibold text-gray-300">Insights</h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Status</label>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Executing</span>
            </div>
          ) : response || error ? (
            <div className={clsx(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
              isSuccess ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
            )}>
              {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>{response?.status || 'Error'}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Latency</label>
          {response ? (
            <div className="text-xs font-mono text-gray-300">{response.time}ms</div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Size</label>
          {response ? (
            <div className="text-xs font-mono text-gray-300">{response.size} B</div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>
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
        {recentExecutions.length > 0 && (
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Recent</label>
            <div className="space-y-1.5">
              {recentExecutions.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 text-xs py-1">
                  <div className={clsx(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    item.status >= 200 && item.status < 300 ? 'bg-green-400' : 'bg-red-400'
                  )} />
                  <span className={clsx(
                    'font-bold text-[10px] px-1 py-0.5 rounded',
                    item.method === 'GET' && 'text-green-400 bg-green-400/10',
                    item.method === 'POST' && 'text-yellow-400 bg-yellow-400/10',
                    'text-purple-400 bg-purple-400/10'
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
