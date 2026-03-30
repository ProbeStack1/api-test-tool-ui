import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

function DetailSection({ title, sectionKey, requestId, expandedSections, setExpandedSections, children }) {
  const isExpanded = expandedSections[`${requestId}:${sectionKey}`];
  const toggle = () => setExpandedSections(prev => ({
    ...prev,
    [`${requestId}:${sectionKey}`]: !prev[`${requestId}:${sectionKey}`]
  }));

  return (
    <div className="border border-dark-700 rounded-lg ">
      <div
        className="flex items-center gap-1 px-4 py-2 cursor-pointer hover:bg-dark-700/30 rounded-t-lg"
        onClick={toggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <span className="text-sm font-medium text-gray-300">{title}</span>
      </div>
      {isExpanded && (
        <div className="p-4 border-t border-dark-700">
          {children}
        </div>
      )}
    </div>
  );
}

function KeyValueTable({ items, emptyMessage = "No items" }) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return <p className="text-sm text-gray-500 italic">{emptyMessage}</p>;
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {safeItems.map((item, idx) => (
          <tr key={idx} className="border-b border-dark-700/50 last:border-0">
            <td className="py-2 pr-4 text-gray-300 font-mono">{item.key}</td>
            <td className="py-2 text-gray-400 font-mono break-all">{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatResponseBody(data) {
  if (!data) return '';
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }
    return data;
  }
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

export default function CollectionRunResultsView({ results, onClose }) {
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');

  if (!results) return null;

  const {
    collectionName,
    source,
    iterations,
    duration,
    totalRequests,
    passed,
    failed,
    skipped = 0,
    errors,
    avgResponseTime,
    totalAssertions = 0,
    passedAssertions = 0,
    failedAssertions = 0,
    errorMessage = null,
    results: requestResults,
  } = results;

  const filteredResults = requestResults.filter(result => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'passed') return result.success === true && !result.skipped;
    if (statusFilter === 'failed') return result.success === false && !result.skipped;
    if (statusFilter === 'skipped') return result.skipped === true;
    if (statusFilter === 'error') return result.error && !result.skipped;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-dark-800/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Summary Card */}
        <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">{collectionName}</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">
                {source}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="p-4 rounded-lg bg-dark-900/40 border border-dark-700">
              <p className="text-xs text-gray-500 mb-1">Iterations</p>
              <p className="text-2xl font-semibold text-white">{iterations}</p>
            </div>
            <div className="p-4 rounded-lg bg-dark-900/40 border border-dark-700">
              <p className="text-xs text-gray-500 mb-1">Duration</p>
              <p className="text-2xl font-semibold text-white">{Math.round(duration)}ms</p>
            </div>
            <div className="p-4 rounded-lg bg-dark-900/40 border border-dark-700">
              <p className="text-xs text-gray-500 mb-1">Total Requests</p>
              <p className="text-2xl font-semibold text-white">{totalRequests}</p>
            </div>
            <div className="p-4 rounded-lg bg-dark-900/40 border border-dark-700">
              <p className="text-xs text-gray-500 mb-1">Passed / Failed / Skipped</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-green-400">{passed}</span>
                <span className="text-gray-500">/</span>
                <span className="text-xl font-semibold text-red-400">{failed}</span>
                <span className="text-gray-500">/</span>
                <span className="text-xl font-semibold text-yellow-400">{skipped}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-dark-900/40 border border-dark-700">
              <p className="text-xs text-gray-500 mb-1">Avg Response</p>
              <p className="text-2xl font-semibold text-white">{avgResponseTime}ms</p>
            </div>
            <div className="p-4 rounded-lg bg-dark-900/40 border border-dark-700">
              <p className="text-xs text-gray-500 mb-1">Assertions</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-green-400">{passedAssertions}</span>
                <span className="text-gray-500">/</span>
                <span className="text-xl font-semibold text-red-400">{failedAssertions}</span>
                <span className="text-xs text-gray-500 ml-1">of {totalAssertions}</span>
              </div>
            </div>
          </div>
          {errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          )}
          {errors > 0 && !errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{errors} errors occurred</p>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {['all', 'passed', 'failed', 'skipped', 'error'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
                statusFilter === filter
                  ? 'bg-primary text-white'
                  : 'bg-dark-800/60 text-gray-400 hover:text-white hover:bg-dark-700'
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Request List */}
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const isExpanded = expandedRequestId === result.requestId;
            return (
              <div key={result.requestId || `result-${index}`} className="border border-dark-700 rounded-lg overflow-hidden bg-dark-800/40">
                {/* Summary row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-dark-800/60 transition-colors cursor-pointer"
                  onClick={() => setExpandedRequestId(isExpanded ? null : result.requestId)}
                >
                  <div className="w-5 h-5 shrink-0">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                  </div>
                  <span className={clsx(
                    'text-xs font-bold w-12 text-center shrink-0',
                    result.method === 'GET' && 'text-green-400',
                    result.method === 'POST' && 'text-yellow-400',
                    result.method === 'PUT' && 'text-blue-400',
                    result.method === 'DELETE' && 'text-red-400',
                    'text-purple-400'
                  )}>
                    {result.method}
                  </span>
                  <span className="text-sm text-gray-300 truncate flex-1 font-medium">{result.requestName}</span>
                  {result.status > 0 ? (
                    <span className={clsx(
                      'text-xs font-bold px-2 py-1 rounded',
                      result.success ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                    )}>
                      {result.status}
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded text-red-400 bg-red-400/10">ERR</span>
                  )}
                  <span className="text-sm text-gray-500 w-16 text-right font-mono">
                    {Math.round(result.time)}ms
                  </span>
                </div>

                {/* URL line */}
                <div className="pl-[88px] pr-4 pb-2 text-xs text-gray-500 truncate">
                  {result.url}
                </div>

                {result.error && (
                  <div className="pl-[88px] pr-4 pb-2 text-xs text-red-400">{result.error}</div>
                )}

                {/* Assertions summary line */}
                {result.assertions && result.assertions.length > 0 && (
                  <div className="pl-[88px] pr-4 pb-2 flex gap-3">
                    {result.assertions.map((a, i) => (
                      <span key={i} className={clsx(
                        'text-[10px] px-2 py-0.5 rounded-full',
                        a.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      )}>
                        {a.passed ? '✓' : '✗'} {a.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && result.fullDetails && (
                  <div className="ml-[52px] mb-4 space-y-3 pr-4">
                    <DetailSection
                      title="Request Headers"
                      sectionKey="reqHeaders"
                      requestId={result.requestId}
                      expandedSections={expandedSections}
                      setExpandedSections={setExpandedSections}
                    >
                      <KeyValueTable items={result.fullDetails.request_headers} emptyMessage="No request headers" />
                    </DetailSection>

                    <DetailSection
                      title="Request Body"
                      sectionKey="reqBody"
                      requestId={result.requestId}
                      expandedSections={expandedSections}
                      setExpandedSections={setExpandedSections}
                    >
                      {result.fullDetails.request_body ? (
                        <pre className="text-sm text-gray-300 font-mono bg-dark-900/60 p-3 rounded overflow-auto max-h-60">
                          {formatResponseBody(result.fullDetails.request_body)}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No request body</p>
                      )}
                    </DetailSection>

                    <DetailSection
                      title="Response Headers"
                      sectionKey="resHeaders"
                      requestId={result.requestId}
                      expandedSections={expandedSections}
                      setExpandedSections={setExpandedSections}
                    >
                      <KeyValueTable items={result.fullDetails.response_headers} emptyMessage="No response headers" />
                    </DetailSection>

                    <DetailSection
                      title="Response Body"
                      sectionKey="resBody"
                      requestId={result.requestId}
                      expandedSections={expandedSections}
                      setExpandedSections={setExpandedSections}
                    >
                      {result.fullDetails.response_body ? (
                        <pre className="text-sm text-gray-300 font-mono bg-dark-900/60 p-3 rounded overflow-auto max-h-60">
                          {formatResponseBody(result.fullDetails.response_body)}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No response body</p>
                      )}
                    </DetailSection>
                  </div>
                )}
              </div>
            );
          })}
          {filteredResults.length === 0 && (
            <div className="text-center py-8 text-gray-500 italic">No requests match the filter</div>
          )}
        </div>
      </div>
    </div>
  );
}