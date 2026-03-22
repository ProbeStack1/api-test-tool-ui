import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Clock, Database, Folder } from 'lucide-react';
import clsx from 'clsx';
import { fetchGlobalHistory, fetchHistoryEntry } from '../services/requestService';
import { toast } from 'sonner';

function DetailSection({ title, sectionKey, requestId, expandedSections, setExpandedSections, children }) {
  const isExpanded = expandedSections[`${requestId}:${sectionKey}`];
  const toggle = () => setExpandedSections(prev => ({
    ...prev,
    [`${requestId}:${sectionKey}`]: !prev[`${requestId}:${sectionKey}`]
  }));

  return (
    <div className="border border-dark-700 rounded-lg">
      <div
        className="flex items-center gap-1 px-4 py-2 bg-dark-800/30 cursor-pointer hover:bg-dark-700/30"
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

function KeyValueTable({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-gray-500">None</p>;
  }
  return (
    <table className="w-full text-xs">
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} className="border-b border-dark-700/50 last:border-0">
            <td className="py-1 pr-4 text-gray-300 font-mono">{item.key}</td>
            <td className="py-1 text-gray-400 font-mono break-all">{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatResponseBody(data) {
  if (data === null || data === undefined) return '';
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

export default function RequestHistoryList({ onFetchHistoryEntry }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [logDetails, setLogDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  // Fetch global history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetchGlobalHistory({ limit: 100 });
        const items = (res.data.data || []).map(item => ({
          historyId: item.history_id,
          url: item.url,
          method: item.method,
          status: item.status_code,
          size: item.response_size_bytes,
          time: item.response_time_ms,
          error: item.error_message ? true : false,
          date: item.executed_at,
        }));
        setHistory(items);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        toast.error('Could not load request history');
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Fetch details for a history item when expanded
  const fetchDetails = async (historyId) => {
    if (!onFetchHistoryEntry) return;
    if (logDetails[historyId]) return;
    setLoadingDetails(prev => ({ ...prev, [historyId]: true }));
    try {
      const response = await onFetchHistoryEntry(historyId);
      setLogDetails(prev => ({ ...prev, [historyId]: response.data }));
    } catch (error) {
      console.error('Failed to fetch history details:', error);
      toast.error('Failed to load details');
    } finally {
      setLoadingDetails(prev => ({ ...prev, [historyId]: false }));
    }
  };

  // Group history by date
  const groupedLogs = useMemo(() => {
    const groups = {};
    history.forEach(item => {
      const date = new Date(item.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [history]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No request history found</p>
          <p className="text-xs text-gray-500 mt-1">Execute requests to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Request History</h2>
      <div className="space-y-4">
        {Object.entries(groupedLogs).map(([groupLabel, items]) => (
          <div key={groupLabel}>
            <div className="sticky top-0 bg-probestack-bg py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-dark-700">
              {groupLabel}
            </div>
            <div className="space-y-2 mt-2">
              {items.map((item) => {
                const isExpanded = expandedLogId === item.historyId;
                const details = logDetails[item.historyId];
                const isLoadingDetails = loadingDetails[item.historyId];
                return (
                  <div key={item.historyId} className="border border-dark-700 rounded-lg overflow-visible">
                    {/* Summary row */}
                    <div
                      className="flex items-center gap-2 px-4 py-3 hover:bg-dark-800/30 transition-colors cursor-pointer"
                      onClick={async () => {
                        if (isExpanded) {
                          setExpandedLogId(null);
                        } else {
                          setExpandedLogId(item.historyId);
                          if (!details && !isLoadingDetails) {
                            await fetchDetails(item.historyId);
                          }
                        }
                      }}
                    >
                      <div className="w-5 h-5 shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      </div>
                  <span className={clsx(
                    'text-xs font-bold w-12 text-center shrink-0',
                    item.method === 'GET' && 'text-green-400',
                    item.method === 'POST' && 'text-yellow-400',
                    item.method === 'PUT' && 'text-blue-400',
                    item.method === 'DELETE' && 'text-red-400',
                    'text-purple-400'
                  )}>
                        {item.method}
                      </span>
                      {/* <span className="text-sm text-gray-300 truncate flex-1">{item.request_name}</span> */}
                      <span className="text-sm text-gray-300 truncate flex-1">{item.url}</span>
                      {item.status > 0 ? (
                        <span className={clsx(
                          'text-xs font-bold px-2 py-1 rounded',
                          item.status >= 200 && item.status < 300
                            ? 'text-green-400 bg-green-400/10'
                            : 'text-red-400 bg-red-400/10'
                        )}>
                          {item.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded text-red-400 bg-red-400/10">ERR</span>
                      )}
                      <span className="text-xs text-gray-500 w-14 text-right">{item.time}ms</span>
                    </div>

                    {/* URL line – always visible, indented */}
                    {item.error && (
                  <div className="pl-[88px] pr-4 pb-2 text-xs text-red-400">{item.error}</div>
                )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="ml-[52px] pr-4 mb-4 space-y-3">
                        {isLoadingDetails ? (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            Loading details...
                          </div>
                        ) : details ? (
                          <>
                            <DetailSection
                              title="Request Headers"
                              sectionKey="reqHeaders"
                              requestId={item.historyId}
                              expandedSections={expandedSections}
                              setExpandedSections={setExpandedSections}
                            >
                              {details.request_headers?.length > 0 ? (
                                <KeyValueTable items={details.request_headers} />
                              ) : (
                                <p className="text-xs text-gray-500">No request headers</p>
                              )}
                            </DetailSection>

                            <DetailSection
                              title="Request Body"
                              sectionKey="reqBody"
                              requestId={item.historyId}
                              expandedSections={expandedSections}
                              setExpandedSections={setExpandedSections}
                            >
                              {details.request_body ? (
                                <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-2 rounded overflow-auto max-h-40">
                                  {formatResponseBody(details.request_body)}
                                </pre>
                              ) : (
                                <p className="text-xs text-gray-500">No request body</p>
                              )}
                            </DetailSection>

                            <DetailSection
                              title="Response Headers"
                              sectionKey="resHeaders"
                              requestId={item.historyId}
                              expandedSections={expandedSections}
                              setExpandedSections={setExpandedSections}
                            >
                              {details.response_headers?.length > 0 ? (
                                <KeyValueTable items={details.response_headers} />
                              ) : (
                                <p className="text-xs text-gray-500">No response headers</p>
                              )}
                            </DetailSection>

                            <DetailSection
                              title="Response Body"
                              sectionKey="resBody"
                              requestId={item.historyId}
                              expandedSections={expandedSections}
                              setExpandedSections={setExpandedSections}
                            >
                              {details.response_body ? (
                                <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-2 rounded overflow-auto max-h-40">
                                  {formatResponseBody(details.response_body)}
                                </pre>
                              ) : (
                                <p className="text-xs text-gray-500">No response body</p>
                              )}
                            </DetailSection>
                          </>
                        ) : (
                          <p className="text-xs text-red-400">Failed to load details</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}