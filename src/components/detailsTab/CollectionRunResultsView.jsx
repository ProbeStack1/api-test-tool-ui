import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Loader2, X, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { downloadHtmlReport, downloadJsonReport, downloadJUnitReport, triggerDownload } from '../../services/functionalTestService';

/* ── Status Strip (thin pass/fail bar) ───────────────────────── */
function StatusStrip({ passed, failed, skipped = 0 }) {
  const total = passed + failed + skipped || 1;
  const pw = (passed / total) * 100;
  const fw = (failed / total) * 100;
  return (
    <div className="w-full h-0.5 rounded-full bg-dark-700/80 overflow-hidden flex">
      {pw > 0 && <div className="h-full bg-[#00ff5e]/70 rounded-l-full" style={{ width: `${pw}%`, animation: 'stripGrow 0.8s ease-out forwards' }} />}
      {fw > 0 && <div className="h-full bg-[#ff0000]/70" style={{ width: `${fw}%`, animation: 'stripGrow 0.8s ease-out 0.1s forwards' }} />}
      {skipped > 0 && <div className="h-full bg-yellow-400/70 rounded-r-full" style={{ width: `${((skipped / total) * 100)}%`, animation: 'stripGrow 0.8s ease-out 0.2s forwards' }} />}
      <style>{`@keyframes stripGrow { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); } }`}</style>
    </div>
  );
}

/* ── Status Grid (one dot per request) ───────────────────────── */
function StatusGrid({ requests = [] }) {
  const [tip, setTip] = useState(null);
  const timerRef = useRef(null);
  if (requests.length === 0) return null;
  const showTip = (r, e) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => setTip({ x: rect.left + rect.width / 2, y: rect.top, r }), 500);
  };
  const hideTip = () => { clearTimeout(timerRef.current); setTip(null); };
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-[3px]">
        {requests.map((r, i) => {
          const ok = r.success === true || r.passed === true;
          const skip = r.skipped === true;
          return (
            <div key={i}
              className={clsx('w-[10px] h-[10px] rounded-[2px] cursor-pointer transition-transform hover:scale-[2]', skip ? 'bg-yellow-400/50' : ok ? 'bg-[#00ff5e]/60' : 'bg-[#ff0000]/60')}
              style={{ animation: `dotPop 0.3s ease-out ${i * 25}ms both` }}
              onMouseEnter={(e) => showTip(r, e)} onMouseLeave={hideTip} />
          );
        })}
      </div>
      {tip && (
        <div className="fixed z-[60] pointer-events-none px-2.5 py-1.5 rounded-md border border-dark-600 shadow-lg bg-dark-900/95 backdrop-blur-sm"
          style={{ left: Math.min(tip.x, window.innerWidth - 200), top: tip.y - 6, transform: 'translate(-50%, -100%)' }}>
          <p className="text-xs text-white font-medium truncate max-w-[180px]">{tip.r.requestName}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs">
            <span className="text-gray-500">{tip.r.method}</span>
            <span className={tip.r.success || tip.r.passed ? 'text-[#00ff5e]' : 'text-[#ff0000]'}>{tip.r.status || 'ERR'}</span>
            <span className="text-gray-500">{tip.r.time}ms</span>
          </div>
        </div>
      )}
      <style>{`@keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

/* ── Request Waterfall (timing chart + load more + tooltips) ─── */
const getMethodColor = (m) => {
  switch (m) {
    case 'GET': return 'text-[#00ff5e] bg-[#00ff5e]/20 border-green-400/20';
    case 'POST': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'PUT': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'DELETE': return 'text-[#ff0000] bg-[#ff0000]/10 border-[#ff0000]/20';
    default: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
  }
};

function RequestWaterfall({ requests = [] }) {
  const PAGE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const prevCountRef = useRef(PAGE);
  const [nameWidth, setNameWidth] = useState(160);
  const [tip, setTip] = useState(null);
  const tipTimer = useRef(null);

  const maxTime = Math.max(...requests.map(r => r.time || 0), 1);
  const items = requests.slice(0, visibleCount);
  const hasMore = visibleCount < requests.length;
  const remaining = requests.length - visibleCount;

  const handleLoadMore = () => { prevCountRef.current = visibleCount; setHasLoadedMore(true); setVisibleCount(prev => Math.min(prev + PAGE, requests.length)); };
  const handleViewAll = () => { prevCountRef.current = visibleCount; setVisibleCount(requests.length); };
  const handleCollapse = () => { prevCountRef.current = PAGE; setVisibleCount(PAGE); setHasLoadedMore(false); };

  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX; const startW = nameWidth;
    const onMove = (ev) => setNameWidth(Math.max(80, Math.min(280, startW + ev.clientX - startX)));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  };
  const showRowTip = (r, e) => { clearTimeout(tipTimer.current); const rect = e.currentTarget.getBoundingClientRect(); tipTimer.current = setTimeout(() => setTip({ x: rect.left + rect.width / 2, y: rect.top, r }), 500); };
  const hideTip = () => { clearTimeout(tipTimer.current); setTip(null); };

  if (requests.length === 0) return null;
  return (
    <div className="rounded-xl border border-dark-700 bg-probestack-bg overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-dark-700/60">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Request Timeline</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-1.5 h-5 rounded-sm bg-[#00ff5e]/60" />Pass</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-5 rounded-sm bg-[#ff0000]/50" />Fail</span>
          <span className="font-mono">{Math.round(maxTime)}ms max</span>
        </div>
      </div>
      <div className="px-5 py-3 space-y-[3px]">
        <div className="flex items-center mb-2" style={{ marginLeft: nameWidth + 56 }}>
          <div className="flex-1 relative h-3">
            {[0, 25, 50, 75, 100].map(p => (
              <span key={p} className="absolute text-sm text-gray-600 font-mono -translate-x-1/2" style={{ left: `${p}%` }}>{Math.round(maxTime * p / 100)}</span>
            ))}
          </div>
          <span className="w-14 shrink-0" />
        </div>
        {items.map((r, i) => {
          const pct = Math.max(((r.time || 0) / maxTime) * 100, 1.5);
          const ok = r.success === true || r.passed === true;
          const skip = r.skipped === true;
          const barColor = skip ? 'bg-yellow-500/40 border-yellow-500/30' : ok ? 'bg-[#00ff5e]/30 border-[#00ff5e]/30' : 'bg-[#ff0000]/30 border-[#ff0000]/30';
          const textColor = skip ? 'text-yellow-400' : ok ? 'text-[#00ff5e]/80' : 'text-[#ff0000]/80';
          const isNew = i >= prevCountRef.current;
          return (
            <div key={i} className="flex items-center gap-2 group"
              style={{ animation: isNew ? `wfSlideIn 0.35s ease-out ${(i - prevCountRef.current) * 50}ms both` : `wfSlideIn 0.35s ease-out ${i * 40}ms both` }}
              onMouseEnter={(e) => showRowTip(r, e)} onMouseLeave={hideTip}>
              <span className={clsx('w-10 text-xs font-bold text-center shrink-0 rounded border px-1 py-0.5', getMethodColor(r.method))}>{r.method}</span>
              <span className="text-xs text-gray-400 truncate shrink-0 group-hover:text-gray-200 transition-colors" style={{ width: nameWidth }}>{r.requestName}</span>
              <div className="w-[3px] h-3.5 rounded-full bg-dark-700/30 hover:bg-primary/40 cursor-col-resize shrink-0 transition-colors" onMouseDown={startResize} title="Drag to resize" />
              <div className="flex-1 h-[22px] bg-dark-700/20 rounded-[3px] overflow-hidden relative border border-dark-700/30">
                <div className={clsx('h-full rounded-[3px] border-l-2', barColor)}
                  style={{ width: `${pct}%`, animation: isNew ? `wfBarGrow 0.5s ease-out ${(i - prevCountRef.current) * 50 + 100}ms both` : `wfBarGrow 0.5s ease-out ${i * 40 + 100}ms both` }} />
                {r.status > 0 && <span className={clsx('absolute top-1/2 -translate-y-1/2 text-xs font-bold font-mono', pct > 15 ? 'left-1.5' : 'right-1', textColor)}>{r.status}</span>}
                {!r.status && r.error && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#ff0000]">ERR</span>}
              </div>
              <span className={clsx('w-14 text-right text-xs font-mono shrink-0 tabular-nums', textColor)}>{r.time}ms</span>
            </div>
          );
        })}
        {hasMore && (
          <div className="pt-3 pb-1 flex items-center justify-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-dark-700/30 to-transparent" />
            <button onClick={handleLoadMore} className="text-sm text-gray-600 hover:text-primary/80 transition-colors">+ {remaining > PAGE ? PAGE : remaining} more</button>
            {hasLoadedMore && (<><span className="text-gray-700/50">&middot;</span><button onClick={handleViewAll} className="text-sm text-gray-600 hover:text-primary/80 transition-colors">View all {requests.length}</button></>)}
            {hasLoadedMore && (<><span className="text-gray-700/50">&middot;</span><button onClick={handleCollapse} className="text-sm text-gray-600 hover:text-gray-400 transition-colors">Collapse</button></>)}
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-dark-700/30 to-transparent" />
          </div>
        )}
        {!hasMore && hasLoadedMore && (
          <div className="pt-3 pb-1 flex items-center justify-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-dark-700/30 to-transparent" />
            <span className="text-sm text-gray-600">All {requests.length} shown</span>
            <span className="text-gray-700/50">&middot;</span>
            <button onClick={handleCollapse} className="text-sm text-gray-600 hover:text-gray-400 transition-colors">Collapse</button>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-dark-700/30 to-transparent" />
          </div>
        )}
      </div>
      {tip && (
        <div className="fixed z-[60] pointer-events-none px-3 py-2 rounded-lg border border-dark-600 shadow-xl bg-probestack-bg backdrop-blur-sm"
          style={{ left: Math.min(tip.x, window.innerWidth - 240), top: tip.y - 6, transform: 'translate(-50%, -100%)' }}>
          <p className="text-xs text-white font-medium truncate max-w-[200px]">{tip.r.requestName}</p>
          <div className="flex items-center gap-3 mt-0.5 text-xs">
            <span className={getMethodColor(tip.r.method).split(' ')[0]}>{tip.r.method}</span>
            <span className={tip.r.success || tip.r.passed ? 'text-[#00ff5e]' : 'text-[#ff0000]'}>{tip.r.status || 'ERR'}</span>
            <span className="text-gray-500">{tip.r.time}ms</span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes wfSlideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wfBarGrow { from { width: 0; } }
      `}</style>
    </div>
  );
}

function DetailSection({ title, sectionKey, requestId, expandedSections, setExpandedSections, children }) {
  const isExpanded = expandedSections[`${requestId}:${sectionKey}`];
  const toggle = () => setExpandedSections(prev => ({
    ...prev,
    [`${requestId}:${sectionKey}`]: !prev[`${requestId}:${sectionKey}`]
  }));
  return (
    <div className="border border-dark-700 rounded-lg">
      <div className="flex items-center gap-1 px-4 py-2 cursor-pointer hover:bg-dark-700/30 rounded-t-lg" onClick={toggle}>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        <span className="text-xs font-medium text-gray-300">{title}</span>
      </div>
      {isExpanded && <div className="p-4 border-t border-dark-700">{children}</div>}
    </div>
  );
}

function KeyValueTable({ items, emptyMessage = "No items" }) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return <p className="text-xs text-gray-500 italic">{emptyMessage}</p>;
  return (
    <table className="w-full text-xs"><tbody>
      {safeItems.map((item, idx) => (
        <tr key={idx} className="border-b border-dark-700/50 last:border-0">
          <td className="py-2 pr-4 text-gray-300 font-mono">{item.key}</td>
          <td className="py-2 text-gray-400 font-mono break-all">{item.value}</td>
        </tr>
      ))}
    </tbody></table>
  );
}

function formatResponseBody(data) {
  if (!data) return '';
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
    }
    return data;
  }
  if (typeof data === 'object') return JSON.stringify(data, null, 2);
  return String(data);
}

const MC = {
  GET: 'text-green-400', POST: 'text-yellow-400',
  PUT: 'text-blue-400', DELETE: 'text-[#ff0000]',
  PATCH: 'text-purple-400', HEAD: 'text-gray-400',
  OPTIONS: 'text-orange-400',
};
const mclr = m => MC[m] || 'text-purple-400';

export default function CollectionRunResultsView({ results, onClose }) {
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportFormat, setExportFormat] = useState('json');
  const [exporting, setExporting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!results) return null;

  const {
    collectionName, source, iterations, duration, totalRequests, passed, failed,
    skipped = 0, errors, avgResponseTime, totalAssertions = 0, passedAssertions = 0,
    failedAssertions = 0, errorMessage = null, results: requestResults = [],runId,
  } = results;

  const filteredResults = requestResults.filter(result => {
    const isPassed = result.success === true || result.passed === true ||
      (result.status >= 200 && result.status < 300 && !result.error);
    const isSkipped = result.skipped === true;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'passed') return isPassed;
    if (statusFilter === 'failed') return !isPassed && !isSkipped;
    if (statusFilter === 'skipped') return isSkipped;
    if (statusFilter === 'error') return !!result.error && !isSkipped;
    return true;
  });

  const handleExport = async () => {
    if (!runId) {
      toast.error('Run ID not available');
      return;
    }
    setExporting(true);
    try {
      let res;
      const ext = { json: '.json', html: '.html', junit: '.xml' };
      if (exportFormat === 'json') res = await downloadJsonReport(runId);
      else if (exportFormat === 'html') res = await downloadHtmlReport(runId);
      else res = await downloadJUnitReport(runId);
      triggerDownload(res.data, `report-${runId}${ext[exportFormat]}`);
      toast.success(`${exportFormat.toUpperCase()} report downloaded`);
    } catch (err) {
      toast.error('Download failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  const formatLabel = exportFormat === 'json' ? 'JSON' : exportFormat === 'html' ? 'HTML' : 'JUnit';


  return (
    <div className="flex-1 overflow-y-auto p-8 bg-dark-800/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header with Close and Export buttons */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Run Results: {collectionName}</h2>
          <div className="flex items-center gap-3">
            {/* Export Dropdown + Button */}
            <div className="relative flex items-center" ref={dropdownRef}>
              <button
                onClick={handleExport}
                disabled={!runId || exporting}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-primary/20 text-primary rounded-l-lg border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export ({formatLabel})
              </button>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-2 py-2 bg-primary/20 border-l-0 border border-primary/30 rounded-r-lg hover:bg-primary/30 transition-colors"
              >
                <ChevronDown className={clsx('w-4 h-4 text-primary transition-transform', dropdownOpen && 'rotate-180')} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-10">
                  {['json', 'html', 'junit'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => {
                        setExportFormat(fmt);
                        setDropdownOpen(false);
                      }}
                      className={clsx(
                        'w-full text-left px-3 py-2 text-sm hover:bg-dark-700 transition-colors',
                        exportFormat === fmt ? 'text-primary bg-primary/10' : 'text-gray-300'
                      )}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Summary Card */}
        <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">{collectionName}</h2>
            <span className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">{source}</span>
          </div>

          {/* Pass rate strip */}
          <StatusStrip passed={passed || 0} failed={failed || 0} skipped={skipped} />
          <div className="flex items-center gap-3 mt-1 mb-5">
            <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-2 h-2 rounded-sm bg-[#00ff5e]" />Passed {passed}</span>
            <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-2 h-2 rounded-sm bg-[#ff0000]/70" />Failed {failed}</span>
            {skipped > 0 && <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-2 h-2 rounded-sm bg-yellow-400/70" />Skipped {skipped}</span>}
            <span className="ml-auto text-sm text-gray-500 font-mono">{totalRequests > 0 ? ((passed / totalRequests) * 100).toFixed(0) : 0}% pass rate</span>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-5">
            <div className="space-y-0.5">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-white tabular-nums">{totalRequests}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Passed</p>
              <p className="text-2xl font-bold text-[#00ff5e] tabular-nums">{passed}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Failed</p>
              <p className="text-2xl font-bold text-[#ff0000] tabular-nums">{failed}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Duration</p>
            <p className="text-2xl font-bold text-white tabular-nums">{Math.round(duration || 0)}<span className="text-sm text-gray-500 ml-0.5">ms</span></p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Avg Time</p>
              <p className="text-2xl font-bold text-white tabular-nums">{avgResponseTime || 0}<span className="text-sm text-gray-500 ml-0.5">ms</span></p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Assertions</p>
              <p className="text-2xl font-bold tabular-nums">
                <span className="text-[#00ff5e]">{passedAssertions}</span>
                <span className="text-gray-600 text-sm mx-0.5">/</span>
                <span className="text-sm text-gray-500">{totalAssertions}</span>
              </p>
            </div>
          </div>

          {/* Status grid */}
          {requestResults.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Request Status Map</p>
              <StatusGrid requests={requestResults} />
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-[#ff0000]/10 border border-[#ff0000]/20">
              <p className="text-xs text-[#ff0000]">{errorMessage}</p>
            </div>
          )}
          {errors > 0 && !errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-[#ff0000]/10 border border-[#ff0000]/20">
              <p className="text-xs text-[#ff0000]">{errors} errors occurred</p>
            </div>
          )}
        </div>

        {/* Request Waterfall Chart */}
        <RequestWaterfall requests={requestResults} />

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {['all', 'passed', 'failed', 'skipped', 'error'].map(filter => (
            <button key={filter} onClick={() => setStatusFilter(filter)}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
                statusFilter === filter ? 'bg-primary text-white' : 'bg-dark-800/60 text-gray-400 hover:text-white hover:bg-dark-700')}>
              {filter}
            </button>
          ))}
        </div>

        {/* Request List */}
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const isExpanded = expandedRequestId === result.requestId;
            const isPassed = result.success === true || result.passed === true;
            return (
              <div key={result.requestId || `result-${index}`} className="border border-dark-700 rounded-lg overflow-hidden bg-dark-800/40">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-dark-800/60 transition-colors cursor-pointer"
                  onClick={() => setExpandedRequestId(isExpanded ? null : result.requestId)}>
                  <div className="w-5 h-5 shrink-0">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                  </div>
                  <span className={clsx('text-xs font-bold w-12 text-center shrink-0', mclr(result.method))}>{result.method}</span>
                  <span className="text-xs text-gray-300 truncate flex-1 font-medium">{result.requestName}</span>
                  {result.status > 0 ? (
                    <span className={clsx('text-xs font-bold px-2 py-1 rounded', isPassed ? 'text-[#00ff5e] bg-[#00ff5e]/15' : 'text-[#ff0000] bg-[#ff0000]/15')}>{result.status}</span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded text-[#ff0000] bg-[#ff0000]/15">ERR</span>
                  )}
                  <span className="text-xs text-gray-500 w-16 text-right font-mono">{Math.round(result.time)}ms</span>
                </div>

                <div className="pl-[88px] pr-4 pb-2 text-xs text-gray-500 truncate">{result.url}</div>
                {result.error && <div className="pl-[88px] pr-4 pb-2 text-xs text-[#ff0000]">{result.error}</div>}

                {result.assertions?.length > 0 && (
                  <div className="pl-[88px] pr-4 pb-2 flex flex-wrap gap-2">
                    {result.assertions.map((a, i) => (
                      <span key={i} className={clsx('text-xs px-2 py-0.5 rounded-full', a.passed ? 'bg-[#00ff5e]/15 text-[#00ff5e]' : 'bg-[#ff0000]/15 text-[#ff0000]')}>
                        {a.passed ? '\u2713' : '\u2717'} {a.name}
                      </span>
                    ))}
                  </div>
                )}

                {isExpanded && result.fullDetails && (
                  <div className="ml-[52px] mb-4 space-y-3 pr-4">
                    <DetailSection title="Request Headers" sectionKey="reqHeaders" requestId={result.requestId} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
                      <KeyValueTable items={result.fullDetails.request_headers} emptyMessage="No request headers" />
                    </DetailSection>
                    <DetailSection title="Request Body" sectionKey="reqBody" requestId={result.requestId} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
                      {result.fullDetails.request_body ? (
                        <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-3 rounded overflow-auto max-h-60">{formatResponseBody(result.fullDetails.request_body)}</pre>
                      ) : <p className="text-xs text-gray-500 italic">No request body</p>}
                    </DetailSection>
                    <DetailSection title="Response Headers" sectionKey="resHeaders" requestId={result.requestId} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
                      <KeyValueTable items={result.fullDetails.response_headers} emptyMessage="No response headers" />
                    </DetailSection>
                    <DetailSection title="Response Body" sectionKey="resBody" requestId={result.requestId} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
                      {result.fullDetails.response_body ? (
                        <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-3 rounded overflow-auto max-h-60">{formatResponseBody(result.fullDetails.response_body)}</pre>
                      ) : <p className="text-xs text-gray-500 italic">No response body</p>}
                    </DetailSection>
                  </div>
                )}
              </div>
            );
          })}
          {filteredResults.length === 0 && (
            <div className="text-center py-8 text-gray-500 italic text-xs">No requests match the filter</div>
          )}
        </div>
      </div>
    </div>
  );
}
