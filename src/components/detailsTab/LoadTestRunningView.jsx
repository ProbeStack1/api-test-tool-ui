import React, { useState, useEffect } from "react";
import {
  Loader2, StopCircle, ChevronDown, ChevronRight, X, Clock, Users, Gauge, Zap, Activity,
  CheckCircle, XCircle, BarChart3, TrendingUp, Timer, Target, AlertTriangle, Server, Wifi
} from "lucide-react";
import clsx from "clsx";
import { fetchLoadTestRun, stopLoadTest } from "../../services/collectionService";
import { toast } from "sonner";

/* ─── Shared Sub‑Components ─────────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, color = "text-white" }) {
  return (
    <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-3 hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={clsx("text-xl font-bold font-mono", color)}>{value}</p>
    </div>
  );
}

function SuccessRateGauge({ total, passed, failed }) {
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 95 ? '#22c55e' : rate >= 80 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="110" height="110" className="-rotate-90">
          <circle cx="55" cy="55" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="9" />
          <circle
            cx="55" cy="55" r={radius} fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{rate}%</span>
          <span className="text-[9px] text-gray-500 uppercase tracking-wide">Success</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-gray-400">{passed?.toLocaleString()} passed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-gray-400">{failed?.toLocaleString()} failed</span>
        </div>
      </div>
    </div>
  );
}

function LatencyDistribution({ percentiles }) {
  if (!percentiles || Object.keys(percentiles).length === 0) return null;
  const entries = Object.entries(percentiles);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const barColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="flex items-end gap-2 h-16">
      {entries.map(([label, value], i) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[8px] text-gray-500 font-mono">{value}ms</span>
          <div
            className="w-full rounded-t transition-all duration-700"
            style={{
              height: `${Math.max(6, (value / maxVal) * 48)}px`,
              backgroundColor: barColors[i % barColors.length],
              opacity: 0.8,
            }}
          />
          <span className="text-[8px] text-gray-600 leading-none">{label}</span>
        </div>
      ))}
    </div>
  );
}

function PercentilesChart({ percentiles }) {
  if (!percentiles || Object.keys(percentiles).length === 0) return null;
  const entries = Object.entries(percentiles);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const barColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="space-y-3">
      {entries.map(([label, value], i) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-10 text-right font-mono">{label}</span>
          <div className="flex-1 h-6 bg-dark-700/50 rounded-lg overflow-hidden relative">
            <div
              className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
              style={{
                width: `${Math.max(8, (value / maxVal) * 100)}%`,
                backgroundColor: barColors[i % barColors.length],
                opacity: 0.85,
              }}
            >
              <span className="text-[10px] font-bold text-white drop-shadow">{value}ms</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusCodeChart({ statusCodes }) {
  if (!statusCodes || Object.keys(statusCodes).length === 0) return null;
  const entries = Object.entries(statusCodes);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  const getCodeColor = (code) => {
    const c = parseInt(code);
    if (c >= 200 && c < 300) return { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/30' };
    if (c >= 300 && c < 400) return { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30' };
    if (c >= 400 && c < 500) return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (c >= 500) return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30' };
    return { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30' };
  };

  return (
    <div className="space-y-3">
      <div className="h-8 rounded-lg overflow-hidden flex">
        {entries.map(([code, count]) => {
          const pct = (count / total) * 100;
          const colors = getCodeColor(code);
          return (
            <div
              key={code}
              className={clsx("h-full flex items-center justify-center transition-all", colors.bg)}
              style={{ width: `${Math.max(pct, 3)}%`, opacity: 0.85 }}
              title={`${code}: ${count} (${pct.toFixed(1)}%)`}
            >
              {pct > 10 && <span className="text-[10px] font-bold text-white">{code}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([code, count]) => {
          const colors = getCodeColor(code);
          const pct = ((count / total) * 100).toFixed(1);
          return (
            <div key={code} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-dark-900/40", colors.border)}>
              <span className={clsx("w-2 h-2 rounded-full", colors.bg)} />
              <span className={clsx("text-xs font-medium", colors.text)}>{code}</span>
              <span className="text-xs text-gray-500">{count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RpsSparkline({ avgRps }) {
  const fakeData = Array.from({ length: 20 }, (_, i) => {
    const base = avgRps || 100;
    return Math.max(0, base + (Math.sin(i * 0.6) * base * 0.3) + (Math.random() - 0.5) * base * 0.2);
  });
  const max = Math.max(...fakeData, 1);
  const min = Math.min(...fakeData, 0);
  const range = max - min || 1;
  const width = 200;
  const height = 44;
  const points = fakeData.map((v, i) => {
    const x = (i / (fakeData.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="rpsSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#rpsSparkFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TabButton({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
        active ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

function DetailItem({ label, value, valueClassName = "text-white", icon: Icon }) {
  return (
    <div className="p-3 rounded-xl bg-dark-900/40 border border-dark-700 hover:border-primary/20 transition-all">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3 h-3 text-gray-500" />}
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={clsx("text-base font-bold font-mono", valueClassName)}>{value}</p>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────── */

export default function LoadTestResultsView({ loadTestId, onClose }) {
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    console.log('LoadTestResultsView mounted with loadTestId:', loadTestId);
  }, [loadTestId]);

  useEffect(() => {
    if (!loadTestId) {
      setLoading(false);
      setError('Invalid load test ID');
      return;
    }

    let interval;
    const fetchData = async () => {
      console.log('[LoadTestResultsView] Fetching load test run:', loadTestId);
      try {
        const res = await fetchLoadTestRun(loadTestId);
        console.log('[LoadTestResultsView] API response:', res);
        const data = res.data;
        console.log('[LoadTestResultsView] Fetched run data:', {
          status: data.status,
          hasResult: !!data.result,
          totalRequests: data.result?.totalRequests,
          rps: data.result?.actualRps,
        });
        setRun(data);
        setLoading(false);
        if (data.status !== 'running') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('[LoadTestResultsView] Polling error:', err);
        setError(err.message);
        clearInterval(interval);
      }
    };

    fetchData();
    interval = setInterval(fetchData, 2000);
    return () => {
      console.log('[LoadTestResultsView] Cleanup, clearing interval');
      clearInterval(interval);
    };
  }, [loadTestId]);

  const handleStop = async () => {
    try {
      await stopLoadTest(loadTestId);
      toast.info('Stop requested');
    } catch (err) {
      toast.error('Failed to stop test');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-800/80" data-testid="results-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-300">Loading test details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 bg-dark-800/80" data-testid="results-error">
        <div className="max-w-4xl mx-auto bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!run) return null;

  const config = run.config || {};
  const result = run.result || {};

  /* ─── Completed State: Analytics Dashboard ──────────────────────────── */
  if (run.status === 'completed' && result) {
    const total = result.totalRequests || 0;
    const passed = result.successfulRequests || 0;
    const failed = result.failedRequests || 0;

    return (
      <div className="flex-1 overflow-y-auto p-8 bg-dark-800/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                <div className="absolute inset-0 w-3 h-3 bg-green-400/40 rounded-full animate-ping" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Load Test Results</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Test ID: <span className="font-mono text-gray-400">{loadTestId}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 1: Success Gauge + Key Metrics */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3 rounded-xl bg-dark-900/40 border border-dark-700 p-4 flex flex-col items-center justify-center">
              <SuccessRateGauge total={total} passed={passed} failed={failed} />
            </div>
            <div className="col-span-9 grid grid-cols-3 gap-3">
              <StatCard label="Total Requests" value={total.toLocaleString()} icon={BarChart3} />
              <StatCard label="Avg RPS" value={result.actualRps?.toFixed(1) || '0'} icon={Wifi} color="text-green-400" />
              <StatCard label="Errors" value={failed.toLocaleString()} icon={XCircle} color="text-red-400" />
              <StatCard label="Avg Latency" value={`${result.avgLatencyMs?.toFixed(0) || '0'}ms`} icon={Timer} color="text-blue-400" />
              <StatCard label="P95 Latency" value={`${result.percentiles?.p95 || '0'}ms`} icon={Target} color="text-yellow-400" />
              <StatCard label="P99 Latency" value={`${result.percentiles?.p99 || '0'}ms`} icon={Target} color="text-orange-400" />
            </div>
          </div>

          {/* Row 2: RPS Trend + Latency Distribution */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">Throughput Overview</span>
                </div>
                <span className="text-xs font-mono text-primary">{result.actualRps?.toFixed(1) || '0'} req/s</span>
              </div>
              <RpsSparkline avgRps={result.actualRps || 100} />
            </div>
            <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">Latency Percentiles</span>
                </div>
                <span className="text-xs font-mono text-gray-400">ms</span>
              </div>
              <LatencyDistribution percentiles={result.percentiles} />
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-dark-700 flex gap-1">
            <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={BarChart3}>Summary</TabButton>
            <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={Server}>Details</TabButton>
            <TabButton active={activeTab === 'errors'} onClick={() => setActiveTab('errors')} icon={AlertTriangle}>Errors</TabButton>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'summary' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DetailItem label="Total Requests" value={total.toLocaleString()} icon={BarChart3} />
                <DetailItem label="Successful" value={passed.toLocaleString()} valueClassName="text-green-400" icon={CheckCircle} />
                <DetailItem label="Failed" value={failed.toLocaleString()} valueClassName="text-red-400" icon={XCircle} />
                <DetailItem label="Network Errors" value={result.networkErrors || 0} icon={Wifi} />
                <DetailItem label="Timeouts" value={result.timeoutErrors || 0} icon={Clock} />
                <DetailItem label="RPS Achieved" value={result.actualRps?.toFixed(1) || '0'} icon={TrendingUp} />
                <DetailItem label="Success RPS" value={result.successRps?.toFixed(1) || '0'} icon={Zap} />
                <DetailItem label="Std Dev" value={`${result.stdDevLatencyMs?.toFixed(1) || '0'}ms`} icon={Activity} />
                <DetailItem label="Avg Latency" value={`${result.avgLatencyMs?.toFixed(0) || '0'}ms`} icon={Timer} valueClassName="text-blue-400" />
                <DetailItem label="Min Latency" value={`${result.minLatencyMs || '0'}ms`} icon={TrendingUp} valueClassName="text-green-400" />
                <DetailItem label="Max Latency" value={`${result.maxLatencyMs || '0'}ms`} icon={Target} valueClassName="text-red-400" />
                <DetailItem label="Duration" value={`${config.durationSeconds || 0}s`} icon={Clock} />
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-5">
                {result.percentiles && Object.keys(result.percentiles).length > 0 && (
                  <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-medium text-white">Latency Percentiles</h3>
                    </div>
                    <PercentilesChart percentiles={result.percentiles} />
                  </div>
                )}

                {result.statusCodes && Object.keys(result.statusCodes).length > 0 && (
                  <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-medium text-white">Status Code Distribution</h3>
                    </div>
                    <StatusCodeChart statusCodes={result.statusCodes} />
                  </div>
                )}

                <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Gauge className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium text-white">Test Configuration</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-dark-900/40 border border-dark-700">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Virtual Users</p>
                      <p className="text-sm font-bold text-white">{config.concurrency || 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/40 border border-dark-700">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Duration</p>
                      <p className="text-sm font-bold text-white">{config.durationSeconds || 'N/A'}s</p>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/40 border border-dark-700">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Load Profile</p>
                      <p className="text-sm font-bold text-white">{config.rampUpSeconds > 0 ? 'Ramp-up' : 'Fixed'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/40 border border-dark-700">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Target RPS</p>
                      <p className="text-sm font-bold text-white">{config.targetRps > 0 ? config.targetRps : 'Unlimited'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'errors' && (
              <div>
                {result.errorTypes && Object.keys(result.errorTypes).length > 0 ? (
                  <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <h3 className="text-sm font-medium text-white">Error Breakdown</h3>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(result.errorTypes).map(([type, count]) => {
                        const errTotal = Object.values(result.errorTypes).reduce((s, c) => s + c, 0);
                        const pct = ((count / errTotal) * 100).toFixed(1);
                        return (
                          <div key={type} className="flex items-center gap-3 p-3 bg-dark-900/40 rounded-xl border border-dark-700">
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span className="text-sm text-gray-300 flex-1 truncate">{type}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500/70 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-sm font-mono font-bold text-red-400 w-12 text-right">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400/30 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No errors recorded</p>
                    <p className="text-gray-600 text-xs mt-1">All requests completed successfully</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Failed State ──────────────────────────────────────────────────── */
  if (run.status === 'failed') {
    return (
      <div className="flex-1 p-8 bg-dark-800/80">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Load Test Failed</h2>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-red-400 mb-1">Test Execution Failed</h3>
              <p className="text-sm text-gray-400">{run.errorMessage || 'An unknown error occurred during test execution.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Stopped State ─────────────────────────────────────────────────── */
  if (run.status === 'stopped') {
    return (
      <div className="flex-1 p-8 bg-dark-800/80">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Load Test Stopped</h2>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
              <StopCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-yellow-400 mb-1">Test Stopped by User</h3>
              <p className="text-sm text-gray-400">The load test was manually stopped before completion.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}