import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Play, Upload, ChevronDown, ChevronRight, Folder, FileText, Loader2,
  CheckCircle2, XCircle, Settings, Zap, Shield, Eye, Edit3, Save,
  Download, Trash2, Database, Search, ArrowRight, Terminal, Clock,
  UploadCloud, X, AlertTriangle, RotateCcw, Power, Pause, RefreshCw,
  Plus, Calendar, Wrench, Flame, BarChart3
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  uploadAndParseCollection, uploadCollectionToGcs, parseCollectionByPath,
  executeSingleRequest, generateTestCases,
  saveTestCases, listSavedTestCases, deleteSavedTestCase,
  downloadHtmlReport, downloadJsonReport, downloadJUnitReport,
  triggerDownload, startFunctionalRun, getRunStatus,
  createSchedule, listSchedules, deleteSchedule, toggleSchedule, triggerScheduleNow,
} from '../services/functionalTestService';
import { exportCollection } from '../services/collectionService';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

/* ── colour maps ─────────────────────────────────────────────── */
const MC = {
  GET: 'text-green-400 bg-green-400/10 border-green-400/20',
  POST: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  PUT: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  DELETE: 'text-red-400 bg-red-400/10 border-red-400/20',
  PATCH: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  HEAD: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  OPTIONS: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
};
const mclr = m => MC[m] || 'text-purple-400 bg-purple-400/10 border-purple-400/20';
const CC = {
  POSITIVE: 'text-green-400 bg-green-400/10 border-green-400/30',
  NEGATIVE: 'text-red-400 bg-red-400/10 border-red-400/30',
  SECURITY: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  PERFORMANCE: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  BOUNDARY: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  VALIDATION: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
};
const cclr = c => CC[c] || 'text-gray-400 bg-gray-400/10 border-gray-400/30';

const LOADING_MESSAGES = [
  { text: "Setting things up...", icon: Settings },
  { text: "Tightening some screws...", icon: Wrench },
  { text: "Warming up the engines...", icon: Flame },
  { text: "Firing up requests...", icon: Zap },
  { text: "Analyzing responses...", icon: Search },
  { text: "Crunching the numbers...", icon: BarChart3 },
  { text: "Calibrating endpoints...", icon: Terminal },
  { text: "Validating payloads...", icon: Shield },
  { text: "Running diagnostics...", icon: Eye },
  { text: "Spinning up test runners...", icon: Play },
  { text: "Checking assertions...", icon: CheckCircle2 },
  { text: "Almost there...", icon: Clock },
];

/* ── Endpoints Tree ──────────────────────────────────────────── */
function EndpointsTree({ parsedCollection, selectedId, onSelect, onExecute }) {
  const [exp, setExp] = useState({});
  const [q, setQ] = useState('');
  const tog = k => setExp(p => ({ ...p, [k]: !p[k] }));
  const match = ep => !q || ep.name.toLowerCase().includes(q.toLowerCase()) || ep.url.toLowerCase().includes(q.toLowerCase());
  const renderEp = ep => {
    if (!match(ep)) return null;
    return (
      <div key={ep.id} data-testid={`ep-${ep.id}`}
        className={clsx('flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg transition-all group text-[13px]',
          selectedId === ep.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-dark-700/40 border border-transparent')}
        onClick={() => onSelect(ep)}>
        <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0', mclr(ep.method))}>{ep.method}</span>
        <span className="text-gray-300 truncate flex-1">{ep.name}</span>
        {ep.hasTestScript && <span className="text-[9px] text-green-500 bg-green-500/10 px-1 rounded">T</span>}
        {ep.hasPreRequestScript && <span className="text-[9px] text-blue-400 bg-blue-400/10 px-1 rounded">P</span>}
        <button onClick={e => { e.stopPropagation(); onExecute(ep); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-primary/20 text-primary"><Play className="w-3 h-3" /></button>
      </div>);
  };
  const renderFolder = (f, d = 0) => {
    const k = f.name + d; const open = exp[k] !== false;
    return (
      <div key={k} style={{ paddingLeft: d * 12 }}>
        <div className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-dark-700/20 rounded-lg text-[13px]" onClick={() => tog(k)}>
          {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
          <Folder className="w-3.5 h-3.5 text-amber-500/70" />
          <span className="font-medium text-gray-300">{f.name}</span>
          <span className="text-[10px] text-gray-600 ml-auto">{f.endpoints?.length || 0}</span>
        </div>
        {open && <div className="ml-2 space-y-0.5">{f.subFolders?.map((sf, i) => renderFolder(sf, d + 1))}{f.endpoints?.map(renderEp)}</div>}
      </div>);
  };
  if (!parsedCollection) return null;
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input type="text" placeholder="Filter endpoints..." value={q} onChange={e => setQ(e.target.value)}
          className="w-full bg-dark-900/30 border border-dark-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/30"
          data-testid="endpoints-search-input" />
      </div>
      <div className="space-y-0.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1" data-testid="endpoints-tree">
        {parsedCollection.folders?.map(f => renderFolder(f))}
        {parsedCollection.endpoints?.map(renderEp)}
      </div>
    </div>);
}

/* ── Endpoint Detail ─────────────────────────────────────────── */
function EndpointDetail({ endpoint, collectionPath }) {
  const [showOvr, setShowOvr] = useState(false);
  const [ovrBody, setOvrBody] = useState('');
  const [ovrUrl, setOvrUrl] = useState('');
  const [ovrMethod, setOvrMethod] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  if (!endpoint) return <div className="flex flex-col items-center justify-center h-full text-gray-600"><Eye className="w-8 h-8 mb-2 opacity-30" /><p className="text-xs">Select an endpoint</p></div>;
  const run = async () => {
    setRunning(true);
    try {
      const req = { collectionPath, requestName: endpoint.name, folderName: endpoint.folderPath?.split(' / ').pop() || null };
      if (showOvr) { if (ovrBody) { req.body = ovrBody; req.bodyMode = 'raw'; } if (ovrUrl) req.url = ovrUrl; if (ovrMethod) req.method = ovrMethod; }
      const res = await executeSingleRequest(req); setResult(res.data);
    } catch (err) { toast.error('Failed: ' + (err.response?.data?.message || err.message)); }
    finally { setRunning(false); }
  };
  return (
    <div className="space-y-3 text-[13px]" data-testid={`endpoint-detail-${endpoint.id}`}>
      <div className="flex items-center gap-2">
        <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded', mclr(endpoint.method))}>{endpoint.method}</span>
        <span className="text-gray-200 font-medium truncate flex-1">{endpoint.name}</span>
        <button onClick={run} disabled={running} className="flex items-center gap-1 px-2.5 py-1 bg-primary hover:bg-primary/90 text-white text-xs rounded-lg disabled:opacity-50" data-testid="exec-btn">
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Send</button>
      </div>
      <div className="bg-dark-900/30 border border-dark-700 rounded-lg px-3 py-1.5"><p className="text-[11px] text-gray-500 mb-0.5">URL</p><p className="text-gray-200 font-mono break-all text-xs">{endpoint.url}</p></div>
      {endpoint.headers?.filter(h => !h.disabled).length > 0 && (
        <details><summary className="text-xs text-gray-400 cursor-pointer">Headers ({endpoint.headers.filter(h => !h.disabled).length})</summary>
          <div className="mt-1 bg-dark-900/30 border border-dark-700 rounded-lg overflow-hidden"><table className="w-full text-xs"><tbody>
            {endpoint.headers.filter(h => !h.disabled).map((h, i) => <tr key={i} className="border-b border-dark-700/50 last:border-0"><td className="px-2 py-1 text-gray-300 font-mono">{h.key}</td><td className="px-2 py-1 text-gray-500 font-mono break-all">{h.value}</td></tr>)}
          </tbody></table></div></details>)}
      {endpoint.body && endpoint.body.mode !== 'none' && (
        <details><summary className="text-xs text-gray-400 cursor-pointer">Body ({endpoint.body.mode})</summary>
          <pre className="mt-1 bg-dark-900/30 border border-dark-700 rounded-lg p-2 text-xs text-gray-300 font-mono overflow-auto max-h-32">{endpoint.body.raw || '(empty)'}</pre></details>)}
      {endpoint.auth && <div className="flex items-center gap-1.5 text-xs"><Shield className="w-3 h-3 text-amber-400" /><span className="text-gray-500">Auth:</span><span className="text-amber-400">{endpoint.auth.type}</span></div>}
      <button onClick={() => setShowOvr(!showOvr)} className="text-xs text-primary/80 hover:text-primary flex items-center gap-1" data-testid="toggle-overrides-btn"><Edit3 className="w-3 h-3" />{showOvr ? 'Hide' : 'Custom'} overrides</button>
      {showOvr && (
        <div className="space-y-2 bg-dark-900/20 border border-dark-700 rounded-lg p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select value={ovrMethod} onChange={e => setOvrMethod(e.target.value)} className="bg-dark-900/40 border border-dark-700 rounded px-2 py-1 text-xs text-gray-300">
              <option value="">Original ({endpoint.method})</option>{['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}</select>
            <input type="text" value={ovrUrl} onChange={e => setOvrUrl(e.target.value)} placeholder="Override URL" className="bg-dark-900/40 border border-dark-700 rounded px-2 py-1 text-xs text-gray-300 font-mono placeholder:text-gray-600" />
          </div>
          <textarea value={ovrBody} onChange={e => setOvrBody(e.target.value)} placeholder="Override body (JSON)..." rows={4}
            className="w-full bg-dark-900/40 border border-dark-700 rounded px-2 py-1.5 text-xs text-gray-300 font-mono placeholder:text-gray-600 resize-none" />
        </div>)}
      {result && (
        <div className="bg-dark-900/30 border border-dark-700 rounded-lg p-3 space-y-2" data-testid="execution-result">
          <div className="flex items-center gap-2">
            {result.passed ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
            <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded', result.statusCode >= 200 && result.statusCode < 300 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10')}>{result.statusCode} {result.statusText}</span>
            <span className="text-xs text-gray-500">{Math.round(result.responseTimeMs)}ms</span>
            <span className="text-xs text-gray-500">{result.responseSizeBytes}B</span>
          </div>
          {result.assertions?.length > 0 && <div className="space-y-0.5">{result.assertions.map((a, i) => (
            <div key={i} className={clsx('text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1', a.passed ? 'text-green-400 bg-green-400/5' : 'text-red-400 bg-red-400/5')}>
              {a.passed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}{a.name}</div>))}</div>}
          {result.responseBody && <pre className="bg-dark-900/50 border border-dark-700 rounded p-2 text-[10px] text-gray-300 font-mono overflow-auto max-h-36">
            {(() => { try { return JSON.stringify(JSON.parse(result.responseBody), null, 2); } catch { return result.responseBody; } })()}</pre>}
        </div>)}
    </div>);
}

/* ── Test Cases Viewer ───────────────────────────────────────── */
function TestCasesViewer({ data, collectionPath, collectionName, includedIds, setIncludedIds, sourceMode, gcsUploaded, gcsUrl, workspaceId }) {
  const [catFilter, setCatFilter] = useState('ALL');
  const [expId, setExpId] = useState(null);
  const [saving, setSaving] = useState(false);
  if (!data) return null;
  const { testCases, totalTestCases, positiveTests, negativeTests, securityTests, performanceTests, boundaryTests } = data;
  const filtered = catFilter === 'ALL' ? testCases : testCases.filter(t => t.category === catFilter);
  const toggleInclude = id => setIncludedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => { if (includedIds.length === testCases.length) setIncludedIds([]); else setIncludedIds(testCases.map(t => t.id)); };

  const handleSave = async () => {
    if (sourceMode === 'upload' && !gcsUploaded) {
      toast.error('First upload the file to GCS, then you can save test cases for that file.');
      return;
    }
    setSaving(true);
    try {
      await saveTestCases({ collectionPath, collectionName, gcsUrl: gcsUrl || '', workspaceId: workspaceId, testCases }, workspaceId);
      toast.success(`Saved ${testCases.length} test cases to DB`);
    } catch (e) { toast.error('Save failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3" data-testid="test-cases-viewer">
      <div className="flex items-center gap-1.5 flex-wrap">
        {[{ l: 'All', c: totalTestCases, f: 'ALL' }, { l: 'Positive', c: positiveTests, f: 'POSITIVE' },
          { l: 'Negative', c: negativeTests, f: 'NEGATIVE' }, { l: 'Security', c: securityTests, f: 'SECURITY' },
          { l: 'Perf', c: performanceTests, f: 'PERFORMANCE' }, { l: 'Boundary', c: boundaryTests, f: 'BOUNDARY' },
        ].map(({ l, c, f }) => (
          <button key={f} onClick={() => setCatFilter(f)}
            className={clsx('px-2 py-1 rounded text-[11px] font-medium border transition-colors',
              catFilter === f ? 'bg-primary/15 text-primary border-primary/30' : 'bg-dark-900/40 text-gray-500 border-dark-700 hover:text-white')}>{l} ({c})</button>))}
        <div className="ml-auto flex gap-1.5">
          <button onClick={toggleAll} className="px-2 py-1 text-[11px] text-gray-400 hover:text-white border border-dark-700 rounded">
            {includedIds.length === testCases.length ? 'Deselect All' : 'Select All'}</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded disabled:opacity-50"
            data-testid="save-test-cases-btn">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save to DB</button>
        </div>
      </div>
      {sourceMode === 'upload' && !gcsUploaded && <div className="text-[11px] text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0" />Upload file to GCS first to enable saving test cases</div>}
      <div className="text-[11px] text-primary/80">{includedIds.length} test cases selected for run</div>
      <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
        {filtered.map(tc => {
          const open = expId === tc.id; const included = includedIds.includes(tc.id);
          return (
            <div key={tc.id} className={clsx('border rounded-lg overflow-hidden bg-dark-800/40', included ? 'border-primary/30' : 'border-dark-700')} data-testid={`test-case-${tc.id}`}>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer hover:bg-dark-700/20" onClick={() => setExpId(open ? null : tc.id)}>
                <input type="checkbox" checked={included} onChange={() => toggleInclude(tc.id)} onClick={e => e.stopPropagation()} className="rounded text-primary w-3.5 h-3.5" />
                {open ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                <span className={clsx('text-[9px] font-bold px-1 py-0.5 rounded border', cclr(tc.category))}>{tc.category}</span>
                <span className={clsx('text-[9px] font-bold px-1 rounded', mclr(tc.method))}>{tc.method}</span>
                <span className="text-xs text-gray-300 truncate flex-1">{tc.name}</span>
                <span className={clsx('text-[9px] px-1 rounded', tc.priority === 'HIGH' ? 'text-red-400 bg-red-400/10' : tc.priority === 'MEDIUM' ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 bg-gray-500/10')}>{tc.priority}</span>
              </div>
              {open && (
                <div className="px-3 py-2 border-t border-dark-700 space-y-2 text-xs">
                  <p className="text-gray-400">{tc.description}</p>
                  <div className="flex gap-4"><span className="text-gray-500">Status: <span className="text-gray-300">{tc.expectedStatus}</span></span><span className="text-gray-500">Type: <span className="text-gray-300">{tc.testType}</span></span></div>
                  {tc.generatedTestScript && <pre className="bg-dark-900/50 border border-dark-700 rounded p-2 text-[10px] text-green-300 font-mono overflow-auto max-h-24">{tc.generatedTestScript}</pre>}
                </div>)}
            </div>);
        })}
      </div>
    </div>);
}

/* ── Saved Test Cases Viewer ─────────────────────────────────── */
function SavedTestCasesViewer({ collectionName, workspaceId }) {
  const [savedCases, setSavedCases] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!collectionName) return;
    setLoading(true);
    listSavedTestCases({ workspaceId: workspaceId, collectionName })
      .then(res => setSavedCases(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collectionName, workspaceId]);

  const handleDelete = async (id) => {
    try { await deleteSavedTestCase(id); setSavedCases(prev => prev.filter(tc => tc.id !== id)); toast.success('Deleted'); } catch { toast.error('Delete failed'); }
  };
  if (loading) return <div className="text-center py-8 text-gray-500 text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading saved test cases...</div>;
  if (savedCases.length === 0) return <div className="text-center py-8 text-gray-500 text-sm">No saved test cases found for this collection in this workspace</div>;
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar" data-testid="saved-test-cases-list">
      <p className="text-xs text-gray-400 font-medium">{savedCases.length} saved test cases</p>
      {savedCases.map(tc => (
        <div key={tc.id} className="flex items-center gap-2 px-3 py-2 border border-dark-700 rounded-lg bg-dark-800/40 group">
          <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border', cclr(tc.category))}>{tc.category}</span>
          <span className={clsx('text-[10px] font-bold px-1 rounded', mclr(tc.method))}>{tc.method}</span>
          <span className="text-xs text-gray-300 truncate flex-1">{tc.name}</span>
          {tc.gcsUrl && <span className="text-[9px] text-green-400">GCS</span>}
          <span className="text-[9px] text-gray-500">{new Date(tc.createdAt).toLocaleDateString()}</span>
          <button onClick={() => handleDelete(tc.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-opacity"><Trash2 className="w-3 h-3" /></button>
        </div>))}
    </div>);
}

/* ── Run Skeleton Loading ────────────────────────────────────── */
function RunSkeleton() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 3500);
    const elTimer = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => { clearInterval(msgTimer); clearInterval(elTimer); };
  }, []);

  const MsgIcon = LOADING_MESSAGES[msgIdx].icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12" data-testid="run-skeleton">
      {/* Spinner */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-[3px] border-dark-700 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <MsgIcon className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </div>

      {/* Animated message */}
      <p key={msgIdx} className="text-lg font-semibold text-white mb-2 animate-fadeIn">
        {LOADING_MESSAGES[msgIdx].text}
      </p>
      <p className="text-sm text-gray-500 mb-10">Your collection is being tested — feel free to switch tabs</p>

      {/* Skeleton results */}
      <div className="w-full max-w-2xl space-y-2.5">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/60 animate-pulse"
               style={{ animationDelay: `${i * 200}ms`, animationDuration: '1.8s' }}>
            <div className="w-12 h-4 bg-dark-700/80 rounded-md" />
            <div className="flex-1 h-3.5 bg-dark-700/60 rounded-md" style={{ width: `${60 + Math.random() * 30}%` }} />
            <div className="w-14 h-5 bg-dark-700/80 rounded-md" />
            <div className="w-12 h-3.5 bg-dark-700/60 rounded-md" />
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600 mt-6 font-mono">{Math.floor(elapsed / 1000)}s elapsed</p>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
      `}</style>
    </div>
  );
}

/* ── Status Strip ─────────────────────────────────────────────── */
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

/* ── Status Grid ─────────────────────────────────────────────── */
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

/* ── Request Waterfall ───────────────────────────────────────── */
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

/* ── Shared Detail Section ───────────────────────────────────── */
function DetailSection({ title, sectionKey, requestId, expandedSections, setExpandedSections, children }) {
  const isExpanded = expandedSections[`${requestId}:${sectionKey}`];
  const toggle = () => setExpandedSections(prev => ({ ...prev, [`${requestId}:${sectionKey}`]: !prev[`${requestId}:${sectionKey}`] }));
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

function formatBody(data) {
  if (!data) return '';
  if (typeof data === 'string') {
    const t = data.trim();
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
    }
    return data;
  }
  if (typeof data === 'object') return JSON.stringify(data, null, 2);
  return String(data);
}

/* ── Inline Result View ──────────────────────────────────────── */
function InlineResultView({ result, onClose, runId }) {
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportFormat, setExportFormat] = useState('json'); // 'json', 'html', 'junit'
  const [exporting, setExporting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

   useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!result) return null;

  const {
    collectionName, source, iterations, duration, totalRequests, passed, failed,
    skipped = 0, errors, avgResponseTime, totalAssertions = 0, passedAssertions = 0,
    failedAssertions = 0, errorMessage = null, results: requestResults = [],
  } = result;

  const filteredResults = requestResults.filter(r => {
    const isPassed = r.success === true || r.passed === true || (r.status >= 200 && r.status < 300 && !r.error);
    const isSkipped = r.skipped === true;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'passed') return isPassed;
    if (statusFilter === 'failed') return !isPassed && !isSkipped;
    if (statusFilter === 'skipped') return isSkipped;
    if (statusFilter === 'error') return !!r.error && !isSkipped;
    return true;
  });

  const MC_INLINE = { GET: 'text-green-400', POST: 'text-yellow-400', PUT: 'text-blue-400', DELETE: 'text-[#ff0000]', PATCH: 'text-purple-400' };

  // Export handlers
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
  <div className="flex-1 flex flex-col overflow-hidden" data-testid="inline-result-view">
    <div className="flex items-center justify-between px-6 py-3 border-b border-dark-700 bg-dark-900/40 shrink-0">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#00ff5e]" />
        <h2 className="text-sm font-semibold text-white">Run Complete</h2>
      </div>
      <div className="flex items-center gap-3">
        {/* Export Dropdown + Button */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button
            onClick={handleExport}
            disabled={!runId || exporting}
            className="flex items-center cursor-pointer gap-1.5 px-4 py-1.5 text-sm font-medium bg-primary/20 text-primary rounded-l-lg border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export ({formatLabel})
          </button>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="px-2 py-2 cursor-pointer bg-primary/20 border-l-0 border border-primary/30 rounded-r-lg hover:bg-primary/30 transition-colors"
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
        <button onClick={onClose} className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-dark-700 rounded-lg hover:bg-dark-700/50 transition-colors" data-testid="close-results-btn">
          <X className="w-4 h-4" /> Back to Config
        </button>
      </div>
    </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-dark-800/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Summary Card */}
          <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">{collectionName}</h2>
              <span className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">{source || 'MANUAL'}</span>
            </div>

            <StatusStrip passed={passed || 0} failed={failed || 0} skipped={skipped} />
            <div className="flex items-center gap-3 mt-1 mb-5">
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-2 h-2 rounded-sm bg-[#00ff5e]" />Passed {passed}</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-2 h-2 rounded-sm bg-[#ff0000]/70" />Failed {failed}</span>
              {skipped > 0 && <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-2 h-2 rounded-sm bg-yellow-400/70" />Skipped {skipped}</span>}
              <span className="ml-auto text-sm text-gray-500 font-mono">{totalRequests > 0 ? ((passed / totalRequests) * 100).toFixed(0) : 0}% pass rate</span>
            </div>

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

          <RequestWaterfall requests={requestResults} />

          <div className="flex gap-2">
            {['all', 'passed', 'failed', 'skipped', 'error'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
                  statusFilter === f ? 'bg-primary text-white' : 'bg-dark-800/60 text-gray-400 hover:text-white hover:bg-dark-700')}>
                {f}
              </button>
            ))}
          </div>

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
                    <span className={clsx('text-xs font-bold w-12 text-center shrink-0', MC_INLINE[result.method] || 'text-purple-400')}>{result.method}</span>
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
                          <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-3 rounded overflow-auto max-h-60">{formatBody(result.fullDetails.request_body)}</pre>
                        ) : <p className="text-xs text-gray-500 italic">No request body</p>}
                      </DetailSection>
                      <DetailSection title="Response Headers" sectionKey="resHeaders" requestId={result.requestId} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
                        <KeyValueTable items={result.fullDetails.response_headers} emptyMessage="No response headers" />
                      </DetailSection>
                      <DetailSection title="Response Body" sectionKey="resBody" requestId={result.requestId} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
                        {result.fullDetails.response_body ? (
                          <pre className="text-xs text-gray-300 font-mono bg-dark-900/60 p-3 rounded overflow-auto max-h-60">{formatBody(result.fullDetails.response_body)}</pre>
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
    </div>
  );
}

/* ── Report Downloader ───────────────────────────────────────── */
function ReportDownloader() {
  const [runId, setRunId] = useState('');
  const [dl, setDl] = useState(null);
  const download = async (fmt) => {
    setDl(fmt);
    try {
      const ext = { html: '.html', json: '.json', junit: '.xml' };
      let res; if (fmt === 'html') res = await downloadHtmlReport(runId); else if (fmt === 'json') res = await downloadJsonReport(runId); else res = await downloadJUnitReport(runId);
      triggerDownload(res.data, `report-${runId}${ext[fmt]}`); toast.success(`${fmt.toUpperCase()} downloaded`);
    } catch (e) { toast.error('Download failed'); } finally { setDl(null); }
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input type="text" value={runId} onChange={e => setRunId(e.target.value)} placeholder="Enter run ID..."
        className="flex-1 min-w-[200px] bg-dark-900/40 border border-dark-700 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/30 font-mono" data-testid="report-run-id-input" />
      {['html', 'json', 'junit'].map(f => (
        <button key={f} onClick={() => download(f)} disabled={!runId || dl === f}
          className="flex items-center gap-1 px-3 py-2 bg-dark-900/40 hover:bg-dark-700 text-gray-300 text-xs font-medium rounded-lg border border-dark-700 disabled:opacity-40" data-testid={`download-${f}-btn`}>
          {dl === f ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}{f.toUpperCase()}</button>))}
    </div>);
}

/* ═══════════════════════════════════════════════════════════════
   ██  MAIN PANEL
   ═══════════════════════════════════════════════════════════════ */
export default function FunctionalTestPanel({ 
  collections = [], 
  activeWorkspaceId, 
  onRunComplete, 
  testFiles = [],
  // New props:
  functionalRunPhase = 'config',
  functionalRunResult = null,
  onStartFunctionalRun,
  onResetFunctionalRun,
}) {
  const [sourceMode, setSourceMode] = useState('workspace');
  const [selectedId, setSelectedId] = useState(null);
  const [collPath, setCollPath] = useState('');
  const [parsed, setParsed] = useState(null);
  const [selEp, setSelEp] = useState(null);
  const [tcData, setTcData] = useState(null);
  const [includedTcIds, setIncludedTcIds] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isGenTests, setIsGenTests] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [iter, setIter] = useState(1);
  const [delay, setDelay] = useState(0);
  const [timeout, setTimeout_] = useState(30000);
  const [bail, setBail] = useState(false);
  const [insecure, setInsecure] = useState(false);
  const [folder, setFolder] = useState('');
  const [envPath, setEnvPath] = useState('');
  const [runMode, setRunMode] = useState('manual');
  const [epCollapsed, setEpCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('endpoints');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [gcsUploaded, setGcsUploaded] = useState(false);
  const [gcsUrl, setGcsUrl] = useState('');
  const [isUploadingGcs, setIsUploadingGcs] = useState(false);
  const fileRef = useRef(null);

  // schedule states
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [schName, setSchName] = useState('');
  const [schCron, setSchCron] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const wsCols = useMemo(() => collections.filter(c => c.project === activeWorkspaceId), [collections, activeWorkspaceId]);
  const isWorkspaceActive = sourceMode === 'workspace' && (!!selectedId || !!parsed);

  /* ── actions ───────────────────────────────────────────────── */
  const clearAll = () => {
    setParsed(null); setCollPath(''); setSelEp(null); setTcData(null);
    setIncludedTcIds([]); setSelectedId(null); setSourceMode('workspace');
    setActiveTab('endpoints'); setEpCollapsed(false);
    setUploadedFile(null); setUploadedFileInfo(null);
    setGcsUploaded(false); setGcsUrl('');
  };

  const parseWorkspace = async () => {
    if (!selectedId) return;
    setIsParsing(true); setParsed(null); setSelEp(null); setTcData(null); setIncludedTcIds([]);
    try {
      const exp = await exportCollection(selectedId);
      const file = new File([exp.data], 'collection.json', { type: 'application/json' });
      const res = await uploadAndParseCollection(file);
      setParsed(res.data); setCollPath(res.data.collectionPath);
      toast.success(`Parsed ${res.data.totalEndpoints} endpoints`);
    } catch (e) { toast.error('Parse failed: ' + (e.response?.data?.message || e.message)); }
    finally { setIsParsing(false); }
  };

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.json')) { toast.error('JSON file required'); return; }
    setUploadedFile(file);
    setUploadedFileInfo({ name: file.name, size: file.size });
    setSourceMode('upload');
    setGcsUploaded(false); setGcsUrl('');
    setParsed(null); setSelEp(null); setTcData(null); setIncludedTcIds([]);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null); setUploadedFileInfo(null);
    setGcsUploaded(false); setGcsUrl('');
    setParsed(null); setCollPath(''); setSelEp(null); setTcData(null); setIncludedTcIds([]);
  };

  const handleParseFile = async () => {
    if (!uploadedFile) return;
    setIsParsing(true); setParsed(null); setSelEp(null); setTcData(null); setIncludedTcIds([]);
    try {
      const res = await uploadAndParseCollection(uploadedFile);
      setParsed(res.data); setCollPath(res.data.collectionPath);
      toast.success(`Parsed ${res.data.totalEndpoints} endpoints`);
    } catch (e) { toast.error('Parse failed: ' + (e.response?.data?.message || e.message)); }
    finally { setIsParsing(false); }
  };

  const handleUploadToGcs = async () => {
    if (!uploadedFile) return;
    setIsUploadingGcs(true);
    try {
      const res = await uploadCollectionToGcs(uploadedFile);
      const url = res.data.gcsUrl || '';
      const path = res.data.collectionPath || collPath;
      if (!url) {
        toast.error('GCS is not configured. Set gcs.enabled=true with bucket-name and project-id in application.properties');
        return;
      }
      setGcsUploaded(true); setGcsUrl(url);
      if (path && !collPath) setCollPath(path);
      toast.success('File uploaded to GCS successfully');
    } catch (e) { toast.error('GCS upload failed: ' + (e.response?.data?.message || e.message)); }
    finally { setIsUploadingGcs(false); }
  };

  const genTests = async () => {
    if (!collPath) return;
    setIsGenTests(true);
    try {
      const res = await generateTestCases({
        collectionPath: collPath, includeNegativeTests: true, includeSecurityTests: true,
        includePerformanceTests: true, includeBoundaryTests: true, responseTimeThresholdMs: timeout,
      });
      setTcData(res.data); setActiveTab('testcases'); setIncludedTcIds(res.data.testCases.map(t => t.id));
      toast.success(`Generated ${res.data.totalTestCases} test cases`);
    } catch (e) { toast.error('Failed: ' + (e.response?.data?.message || e.message)); }
    finally { setIsGenTests(false); }
  };

const startRun = async () => {
  if (!collPath || isRunning) return;
  setIsRunning(true);
  try {
    const selectedTestCases = tcData?.testCases?.filter(tc => includedTcIds.includes(tc.id)) || [];
    const res = await startFunctionalRun(collPath, {
      collectionName: parsed?.collectionName || '',
      workspaceId: activeWorkspaceId,
      source: 'MANUAL',
      iterations: iter, delayMs: delay, timeoutMs: timeout, bail, insecure,
      folder: folder || null, environmentPath: envPath || null,
      includedTestCases: selectedTestCases,
    });
    const runId = res.data.runId;
    if (onStartFunctionalRun) onStartFunctionalRun(runId);
  } catch (e) {
    toast.error('Run failed: ' + (e.response?.data?.message || e.message));
  } finally {
    setIsRunning(false);
  }
};



const handleCloseResults = () => {
  if (onResetFunctionalRun) onResetFunctionalRun();
};

  // ── Schedule actions ──
  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try { const res = await listSchedules(activeWorkspaceId); setSchedules(Array.isArray(res.data) ? res.data : []); }
    catch { toast.error('Failed to load schedules'); }
    finally { setLoadingSchedules(false); }
  };

  const handleCreateSchedule = async () => {
    if (!collPath) { toast.error('Parse a collection first'); return; }
    if (!schCron.trim()) { toast.error('Cron expression is required'); return; }
    setSavingSchedule(true);
    try {
      await createSchedule({
        name: schName || parsed?.collectionName || 'Scheduled Run',
        collectionPath: collPath, collectionName: parsed?.collectionName || '',
        gcsUrl: gcsUrl || null, workspaceId: activeWorkspaceId,
        cronExpression: schCron.trim(), iterations: iter, delayMs: delay,
        timeoutMs: timeout, folder: folder || null, bail, insecure, enabled: true,
      }, activeWorkspaceId);
      toast.success('Scheduled run saved! It will run at the configured time.');
      setSchName(''); setSchCron('');
      loadSchedules();
    } catch (e) { toast.error('Failed to save schedule: ' + (e.response?.data?.message || e.message)); }
    finally { setSavingSchedule(false); }
  };

  const handleToggleSchedule = async (id) => {
    try { const res = await toggleSchedule(id); setSchedules(prev => prev.map(s => s.id === id ? res.data : s)); toast.success(res.data.enabled ? 'Schedule enabled' : 'Schedule disabled'); }
    catch { toast.error('Toggle failed'); }
  };

  const handleDeleteSchedule = async (id) => {
    try { await deleteSchedule(id); setSchedules(prev => prev.filter(s => s.id !== id)); toast.success('Schedule cancelled and deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const handleTriggerNow = async (id) => {
    try {
      const res = await triggerScheduleNow(id);
      activeRunId.current = res.data.runId;
      setPhase('running');
      toast.success('Triggered! Running...');
    } catch { toast.error('Trigger failed'); }
  };

  useEffect(() => { if (runMode === 'schedule') loadSchedules(); }, [runMode]);

  const cliCmd = `forgeq-runner run \\
  --collection "${collPath || '<path-to-collection.json>'}" \\
  --iterations ${iter} \\
  --delay ${delay} \\
  --timeout ${timeout}${bail ? ' \\\n  --bail' : ''}${insecure ? ' \\\n  --insecure' : ''}${folder ? ` \\\n  --folder "${folder}"` : ''}${envPath ? ` \\\n  --environment "${envPath}"` : ''}`;

  /* ── render ────────────────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="functional-test-panel">

      {/* RUNNING PHASE */}
      {functionalRunPhase === 'running' && <RunSkeleton />}

      {/* RESULTS PHASE */}
      {functionalRunPhase === 'results' && functionalRunResult && (
  <InlineResultView 
  result={functionalRunResult} 
  onClose={handleCloseResults} 
  runId={functionalRunResult.runId} 
  />
)}

      {/* CONFIG PHASE */}
      {functionalRunPhase === 'config' && (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto p-6 space-y-5">

          {/* ── 1. Collection Source ──────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {uploadedFileInfo ? (
                <div className="flex-1 flex items-center gap-2.5 bg-dark-900/40 border border-dark-700 rounded-lg px-3 py-2 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-white font-medium truncate">{uploadedFileInfo.name}</span>
                  <span className="text-[11px] text-gray-500 shrink-0">{formatFileSize(uploadedFileInfo.size)}</span>
                  {!gcsUploaded ? (
                    <button onClick={handleUploadToGcs} disabled={isUploadingGcs}
                      className="ml-auto flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-50 shrink-0"
                      data-testid="upload-gcs-btn">
                      {isUploadingGcs ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />} Upload to GCS</button>
                  ) : (
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-green-400 shrink-0"><CheckCircle2 className="w-3 h-3" /> On GCS</span>
                  )}
                  <button onClick={handleRemoveFile} className="p-0.5 rounded hover:bg-dark-700 text-gray-500 hover:text-red-400 shrink-0 transition-colors" data-testid="remove-file-btn"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <select value={selectedId || ''} onChange={e => setSelectedId(e.target.value || null)}
                  className="flex-1 bg-dark-900/40 border border-dark-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary/30" data-testid="ws-select">
                  <option value="">Select existing collection...</option>
                  {wsCols.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              <button onClick={uploadedFileInfo ? handleParseFile : parseWorkspace}
                disabled={uploadedFileInfo ? (isParsing || (!!parsed)) : (!selectedId || isParsing)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg disabled:opacity-40 flex items-center gap-1.5 shrink-0" data-testid="parse-btn">
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Parse</button>

              <div className="w-px h-8 bg-dark-700 mx-1" />

              <button onClick={() => { setSourceMode(sourceMode === 'upload' ? 'workspace' : 'upload'); if (sourceMode !== 'upload' && !uploadedFileInfo) fileRef.current?.click(); }}
                disabled={!!uploadedFileInfo || isWorkspaceActive}
                className={clsx('px-3 py-2 text-sm font-medium rounded-lg border flex items-center gap-1.5 shrink-0 transition-colors',
                  (uploadedFileInfo || isWorkspaceActive) ? 'opacity-40 cursor-not-allowed border-dark-700 bg-dark-900/40 text-gray-400' :
                  sourceMode === 'upload' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-dark-900/40 text-gray-400 border-dark-700 hover:text-white')}
                data-testid="upload-btn">
                <Upload className="w-4 h-4" /> Upload JSON</button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />

              {(parsed || uploadedFileInfo) && (
                <button onClick={clearAll} className="px-3 py-2 text-sm font-medium rounded-lg border border-dark-700 bg-dark-900/40 text-gray-400 hover:text-red-400 hover:border-red-500/30 flex items-center gap-1.5 shrink-0 transition-colors" data-testid="clear-btn">
                  <RotateCcw className="w-4 h-4" /> Clear</button>
              )}
            </div>

            {sourceMode === 'upload' && !parsed && !uploadedFileInfo && (
              <div className={clsx('border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/5' : 'border-dark-700 hover:border-gray-500')}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}>
                <UploadCloud className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Drag & drop your Postman collection JSON here</p>
                <p className="text-xs text-gray-600 mt-1">or click to browse</p>
              </div>)}
          </div>

          {/* ── 2. Parsed Results ─────────────────────────────── */}
          {parsed && (
            <div className="border border-dark-700 rounded-xl bg-dark-800/40 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900/30 cursor-pointer" onClick={() => setEpCollapsed(!epCollapsed)}>
                <div className="flex items-center gap-3">
                  {epCollapsed ? <ChevronRight className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  <span className="text-sm font-semibold text-white">{parsed.collectionName}</span>
                  <span className="text-xs text-gray-500 bg-dark-900/40 px-2 py-0.5 rounded">{parsed.totalEndpoints} endpoints</span>
                  <span className="text-xs text-gray-500 bg-dark-900/40 px-2 py-0.5 rounded">{parsed.totalFolders} folders</span>
                </div>
                <div className="flex gap-1.5">
                  {[{ k: 'endpoints', l: 'Endpoints' }, { k: 'testcases', l: 'Test Cases' + (tcData ? ` (${tcData.totalTestCases})` : '') }, { k: 'saved', l: 'Saved' }].map(({ k, l }) => (
                    <button key={k} onClick={e => { e.stopPropagation(); setActiveTab(k); setEpCollapsed(false); }}
                      className={clsx('px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors', activeTab === k ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:text-white')}>{l}</button>))}
                  <button onClick={e => { e.stopPropagation(); genTests(); }} disabled={isGenTests}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 rounded-md border border-amber-500/20 disabled:opacity-50 hover:bg-amber-500/20" data-testid="gen-tests-btn">
                    {isGenTests ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}Generate</button>
                </div>
              </div>
              {!epCollapsed && (
                <div className="p-4">
                  {activeTab === 'endpoints' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <EndpointsTree parsedCollection={parsed} selectedId={selEp?.id} onSelect={setSelEp} onExecute={ep => setSelEp(ep)} />
                      <EndpointDetail endpoint={selEp} collectionPath={collPath} />
                    </div>
                  ) : activeTab === 'testcases' ? (
                    <TestCasesViewer data={tcData} collectionPath={collPath} collectionName={parsed.collectionName}
                      includedIds={includedTcIds} setIncludedIds={setIncludedTcIds}
                      sourceMode={sourceMode} gcsUploaded={gcsUploaded} gcsUrl={gcsUrl} workspaceId={activeWorkspaceId} />
                  ) : (
                    <SavedTestCasesViewer collectionName={parsed.collectionName} workspaceId={activeWorkspaceId} />
                  )}
                </div>)}
            </div>)}

          {/* ── 3. Choose How to Run ─────────────────────────── */}
          <div className="border border-dark-700 rounded-xl bg-dark-800/40 overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-700 bg-dark-900/30">
              <h3 className="text-sm font-semibold text-white">Choose how to run your collection</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'manual', icon: Play, label: 'Run manually', desc: 'Run this collection in the Collection Runner.' },
                  { id: 'schedule', icon: Clock, label: 'Schedule runs', desc: 'Periodically run collection at a specified time.' },
                  { id: 'cli', icon: Terminal, label: 'Automate runs via CLI', desc: 'Configure CLI command for your build pipeline.' },
                ].map(({ id, icon: Icon, label, desc }) => (
                  <div key={id} onClick={() => setRunMode(id)}
                    className={clsx('p-4 rounded-xl border cursor-pointer transition-all',
                      runMode === id ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-dark-700 hover:border-gray-600 bg-dark-900/20')}>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="radio" checked={runMode === id} onChange={() => setRunMode(id)} className="text-primary" />
                      <Icon className={clsx('w-4 h-4', runMode === id ? 'text-primary' : 'text-gray-500')} />
                      <span className="text-sm font-medium text-white">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">{desc}</p>
                  </div>))}
              </div>

              {/* ── Manual ── */}
              {runMode === 'manual' && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs text-gray-500 mb-1.5">Iterations</label>
                      <input type="number" min={1} value={iter} onChange={e => setIter(Math.max(1, +e.target.value))}
                        className="w-full bg-dark-900/40 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/30 focus:outline-none" data-testid="config-iterations" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1.5">Delay between requests (ms)</label>
                      <input type="number" min={0} value={delay} onChange={e => setDelay(Math.max(0, +e.target.value))}
                        className="w-full bg-dark-900/40 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/30 focus:outline-none" data-testid="config-delay" /></div>
                  </div>
                  <details className="group">
                    <summary className="text-xs font-medium text-gray-400 cursor-pointer flex items-center gap-1"><ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />Advanced options</summary>
                    <div className="mt-3 pt-3 border-t border-dark-700 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-[11px] text-gray-500 mb-1">Timeout (ms)</label>
                          <input type="number" min={0} value={timeout} onChange={e => setTimeout_(Math.max(1000, +e.target.value))} className="w-full bg-dark-900/40 border border-dark-700 rounded px-2.5 py-1.5 text-sm text-white focus:ring-1 focus:ring-primary/30 focus:outline-none" data-testid="config-timeout" /></div>
                        <div><label className="block text-[11px] text-gray-500 mb-1">Folder filter</label>
                          <input type="text" value={folder} onChange={e => setFolder(e.target.value)} placeholder="e.g. Auth" className="w-full bg-dark-900/40 border border-dark-700 rounded px-2.5 py-1.5 text-sm text-white focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-gray-600" /></div>
                        <div><label className="block text-[11px] text-gray-500 mb-1">Environment file</label>
                          <input type="text" value={envPath} onChange={e => setEnvPath(e.target.value)} placeholder="path/to/env.json" className="w-full bg-dark-900/40 border border-dark-700 rounded px-2.5 py-1.5 text-sm text-white focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-gray-600" /></div>
                      </div>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={bail} onChange={e => setBail(e.target.checked)} className="rounded text-primary" data-testid="config-bail" />Bail on first failure</label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={insecure} onChange={e => setInsecure(e.target.checked)} className="rounded text-primary" data-testid="config-insecure" />Skip SSL verification</label>
                      </div>
                    </div>
                  </details>
                  <button onClick={startRun} disabled={isRunning || !collPath}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2" data-testid="run-btn">
                    {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run Collection</button>
                </div>)}

              {/* ── Schedule ── */}
              {runMode === 'schedule' && (
                <div className="space-y-4 pt-2">
                  <div className="bg-dark-900/30 rounded-xl border border-dark-700 p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-primary" />Create New Schedule</h4>
                    {!collPath && <p className="text-xs text-amber-400">Parse a collection first to create a schedule.</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-[11px] text-gray-500 mb-1">Schedule Name</label>
                        <input type="text" value={schName} onChange={e => setSchName(e.target.value)} placeholder={parsed?.collectionName || 'My Schedule'}
                          className="w-full bg-dark-900/40 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-gray-600" /></div>
                      <div><label className="block text-[11px] text-gray-500 mb-1">Cron Expression</label>
                        <input type="text" value={schCron} onChange={e => setSchCron(e.target.value)} placeholder="0 0 * * * (every hour)"
                          className="w-full bg-dark-900/40 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-gray-600" /></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[{ l: 'Every hour', v: '0 0 * * * *' }, { l: 'Every 6h', v: '0 0 */6 * * *' }, { l: 'Daily midnight', v: '0 0 0 * * *' }, { l: 'Every Mon 9AM', v: '0 0 9 * * MON' }].map(({ l, v }) => (
                        <button key={v} onClick={() => setSchCron(v)}
                          className="px-2 py-0.5 text-[10px] text-gray-400 bg-dark-900/40 border border-dark-700 rounded hover:text-white hover:border-gray-500 transition-colors">{l}</button>))}
                    </div>
                    <p className="text-[10px] text-gray-600">Uses current run config (iterations: {iter}, delay: {delay}ms, timeout: {timeout}ms{bail ? ', bail' : ''}{insecure ? ', insecure' : ''})</p>
                    <button onClick={handleCreateSchedule} disabled={savingSchedule || !collPath || !schCron.trim()}
                      className="w-full py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2" data-testid="save-schedule-btn">
                      {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Save Schedule</button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white">Existing Schedules</h4>
                      <button onClick={loadSchedules} disabled={loadingSchedules} className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1">
                        <RefreshCw className={clsx('w-3 h-3', loadingSchedules && 'animate-spin')} />Refresh</button>
                    </div>
                    {schedules.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No scheduled runs yet</p>}
                    {schedules.map(s => (
                      <div key={s.id} className={clsx('flex items-center gap-2 px-3 py-2.5 border rounded-lg', s.enabled ? 'border-dark-700 bg-dark-800/40' : 'border-dark-700/50 bg-dark-900/20 opacity-60')}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium truncate">{s.name || 'Unnamed'}</span>
                            <span className={clsx('text-[9px] px-1.5 py-0.5 rounded', s.enabled ? 'text-green-400 bg-green-400/10' : 'text-gray-500 bg-gray-500/10')}>{s.enabled ? 'ACTIVE' : 'PAUSED'}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-gray-500 font-mono">{s.cronExpression}</span>
                            {s.lastRunAt && <span className="text-[10px] text-gray-600">Last: {new Date(s.lastRunAt).toLocaleString()}</span>}
                            {s.lastRunStatus && <span className={clsx('text-[10px]', s.lastRunStatus === 'DONE' ? 'text-green-400' : s.lastRunStatus === 'FAILED' ? 'text-red-400' : 'text-yellow-400')}>{s.lastRunStatus}</span>}
                            <span className="text-[10px] text-gray-600">Runs: {s.totalRuns}</span>
                          </div>
                        </div>
                        <button onClick={() => handleTriggerNow(s.id)} title="Run now"
                          className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors"><Play className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleToggleSchedule(s.id)} title={s.enabled ? 'Pause' : 'Enable'}
                          className={clsx('p-1.5 rounded-lg transition-colors', s.enabled ? 'hover:bg-yellow-500/20 text-yellow-400' : 'hover:bg-green-500/20 text-green-400')}>
                          {s.enabled ? <Pause className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}</button>
                        <button onClick={() => handleDeleteSchedule(s.id)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>))}
                  </div>
                </div>)}

              {/* ── CLI ── */}
              {runMode === 'cli' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">Copy this command to run the collection from your terminal or CI/CD pipeline:</p>
                  <div className="relative">
                    <pre className="bg-dark-900/50 border border-dark-700 rounded-xl p-4 text-sm text-green-300 font-mono overflow-auto">{cliCmd}</pre>
                    <button onClick={() => { navigator.clipboard.writeText(cliCmd); toast.success('Copied to clipboard'); }}
                      className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-dark-700 hover:bg-dark-600 text-gray-300 rounded">Copy</button>
                  </div>
                  <p className="text-xs text-gray-600">Requires <code className="text-gray-400">forgeq-runner</code> CLI to be installed.</p>
                </div>)}
            </div>
          </div>

          {/* ── 4. Export Reports ─────────────────────────────── */}
          {/* <details className="border border-dark-700 rounded-xl bg-dark-800/40 overflow-hidden">
            <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-white flex items-center gap-2"><Download className="w-4 h-4" />Export Reports</summary>
            <div className="px-5 pb-4 pt-2"><ReportDownloader /></div>
          </details> */}

        </div>
      </div>
      )}
    </div>);
}
