import React, { useState, useEffect } from "react";
import { 
  Clock, Users, Gauge, Zap, Activity, Server, Wifi,
  XCircle, BarChart3, TrendingUp, Timer, Target, AlertTriangle, CheckCircle, Loader2
} from "lucide-react";
import clsx from "clsx";
import { fetchLoadTestRun, stopLoadTest } from "../../services/collectionService";
import { toast } from "sonner";

/* ─── Shared Sub‑Components (unchanged) ───────────────────────────────── */
function StatCard({ label, value, icon: Icon, color = "text-white", placeholder = "—" }) {
  const displayValue = value !== null && value !== undefined ? value : placeholder;
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
      <p className={clsx("text-xl font-bold font-mono", color)}>{displayValue}</p>
    </div>
  );
}

function SuccessRateGauge({ total, passed, failed, noData }) {
  if (noData) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="110" height="110" className="-rotate-90">
            <circle cx="55" cy="55" r={44} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="9" />
            <circle cx="55" cy="55" r={44} fill="none" stroke="#4b5563" strokeWidth="9" strokeDasharray="276" strokeDashoffset="276" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-500">—</span>
            <span className="text-[9px] text-gray-500 uppercase tracking-wide">Success</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-[10px] text-gray-500">— passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-[10px] text-gray-500">— failed</span>
          </div>
        </div>
      </div>
    );
  }

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

function LatencyDistribution({ percentiles, noData }) {
  if (noData) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-500 text-xs">
        Awaiting latency data...
      </div>
    );
  }

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

function RpsSparkline({ avgRps, noData }) {
  if (noData) {
    return (
      <div className="h-[44px] w-full bg-gray-700/20 rounded flex items-center justify-center text-gray-500 text-xs">
        Waiting for data...
      </div>
    );
  }

  const fakeData = Array.from({ length: 20 }, (_, i) => {
    const base = avgRps || 100;
    return Math.max(0, base + (Math.sin(i * 0.6) * base * 0.1) + (Math.random() - 0.5) * base * 0.05);
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

/* ─── Skeleton Loader Component (unchanged) ───────────────────────────── */
function SkeletonLoader() {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-dark-800/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-gray-700 rounded-full" />
            <div>
              <div className="h-6 w-48 bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-700 rounded mt-1" />
            </div>
          </div>
        </div>

        {/* Row 1 skeleton: Success Gauge + Key Metrics */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 rounded-xl bg-dark-900/40 border border-dark-700 p-4 flex flex-col items-center justify-center">
            <div className="w-[110px] h-[110px] rounded-full bg-gray-700/60" />
            <div className="flex gap-4 mt-2">
              <div className="w-12 h-2 bg-gray-700 rounded" />
              <div className="w-12 h-2 bg-gray-700 rounded" />
            </div>
          </div>
          <div className="col-span-9 grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-gray-700" />
                  <div className="h-3 w-16 bg-gray-700 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 skeleton: Throughput Trend + Latency Distribution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-gray-700 rounded" />
                <div className="h-3 w-24 bg-gray-700 rounded" />
              </div>
              <div className="h-4 w-16 bg-gray-700 rounded" />
            </div>
            <div className="h-[44px] w-full bg-gray-700/40 rounded" />
          </div>
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-gray-700 rounded" />
                <div className="h-3 w-24 bg-gray-700 rounded" />
              </div>
              <div className="h-4 w-12 bg-gray-700 rounded" />
            </div>
            <div className="h-16 flex items-end gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="h-3 w-8 bg-gray-700 rounded" />
                  <div className="w-full h-10 bg-gray-700/60 rounded-t" />
                  <div className="h-2 w-6 bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timer & Progress Bar skeleton */}
        <div className="rounded-xl border border-dark-700 bg-gradient-to-b from-dark-800/60 to-dark-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-700 rounded" />
              <div className="h-4 w-40 bg-gray-700 rounded" />
            </div>
            <div className="h-8 w-24 bg-gray-700 rounded" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-16 bg-gray-700 rounded" />
              <div className="h-3 w-12 bg-gray-700 rounded" />
            </div>
            <div className="h-2.5 bg-dark-700/80 rounded-full overflow-hidden">
              <div className="h-full w-0 bg-primary rounded-full" />
            </div>
          </div>
        </div>

        {/* Config stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-gray-700" />
                <div className="h-3 w-16 bg-gray-700 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-700 rounded" />
            </div>
          ))}
        </div>

        {/* Status footer skeleton */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-900/40">
            <div className="w-2 h-2 bg-gray-700 rounded-full" />
            <div className="h-3 w-40 bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function LoadTestRunningView({ loadTestId, config, onComplete }) {
  const [run, setRun] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(config?.durationSeconds || 0);
  const [pollingError, setPollingError] = useState(null);

  // Timer based on config duration
  useEffect(() => {
    if (!config?.durationSeconds) return;
    const startTime = Date.now();
    const durationMs = config.durationSeconds * 1000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeRemaining(Math.floor(remaining / 1000));
    }, 100);
    return () => clearInterval(timer);
  }, [config?.durationSeconds]);

  // Poll for real‑time run data
  useEffect(() => {
    if (!loadTestId) return;
    let interval;
    const poll = async () => {
      try {
        const res = await fetchLoadTestRun(loadTestId);
        const data = res.data;
        console.log("📊 [LoadTestRunningView] Fetched run data:", {
          status: data.status,
          hasResult: !!data.result,
          totalRequests: data.result?.totalRequests,
          rps: data.result?.actualRps,
        });
        setRun(data);
        if (data.status !== "running") {
          console.log("🏁 [LoadTestRunningView] Test completed/stopped, calling onComplete");
          onComplete(loadTestId);
        }
      } catch (err) {
        console.error("❌ [LoadTestRunningView] Polling error:", err);
        setPollingError(err.message);
      }
    };
    poll();
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [loadTestId, onComplete]);

  // Show skeleton while waiting for first run data
  if (!run) {
    return <SkeletonLoader />;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const progress = config?.durationSeconds
    ? ((config.durationSeconds - timeRemaining) / config.durationSeconds) * 100
    : 0;

  // Extract metrics – if result is null, set everything to null
  const result = run.result;
  const hasData = result !== null;

  const totalRequests = result?.totalRequests ?? null;
  const passedRequests = result?.successfulRequests ?? null;
  const failedRequests = result?.failedRequests ?? null;
  const avgLatency = result?.avgLatencyMs ?? null;
  const p95Latency = result?.percentiles?.p95 ?? null;
  const p99Latency = result?.percentiles?.p99 ?? null;
  const currentRps = result?.actualRps ?? null;

  console.log("🎨 [LoadTestRunningView] Rendering with data:", {
    hasData,
    totalRequests,
    currentRps,
    avgLatency,
    p95Latency,
    status: run.status
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-dark-800/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header with status indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Load Test in Progress</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Test ID: <span className="font-mono text-gray-300">{loadTestId}</span>
              </p>
            </div>
          </div>
          {!hasData && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Collecting first metrics...</span>
            </div>
          )}
        </div>

        {/* Row 1: Success Gauge + Key Metrics */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 rounded-xl bg-dark-900/40 border border-dark-700 p-4 flex flex-col items-center justify-center">
            <SuccessRateGauge
              total={totalRequests}
              passed={passedRequests}
              failed={failedRequests}
              noData={!hasData}
            />
          </div>
          <div className="col-span-9 grid grid-cols-3 gap-3">
            <StatCard 
              label="Total Requests" 
              value={totalRequests !== null ? totalRequests.toLocaleString() : null} 
              icon={BarChart3} 
            />
            <StatCard 
              label="Current RPS" 
              value={currentRps !== null ? currentRps.toFixed(1) : null} 
              icon={Wifi} 
              color="text-green-400" 
            />
            <StatCard 
              label="Errors" 
              value={failedRequests !== null ? failedRequests.toLocaleString() : null} 
              icon={XCircle} 
              color="text-red-400" 
            />
            <StatCard 
              label="Avg Latency" 
              value={avgLatency !== null ? `${avgLatency.toFixed(0)}ms` : null} 
              icon={Timer} 
              color="text-blue-400" 
            />
            <StatCard 
              label="P95 Latency" 
              value={p95Latency !== null ? `${p95Latency}ms` : null} 
              icon={Target} 
              color="text-yellow-400" 
            />
            <StatCard 
              label="P99 Latency" 
              value={p99Latency !== null ? `${p99Latency}ms` : null} 
              icon={Target} 
              color="text-orange-400" 
            />
          </div>
        </div>

        {/* Row 2: Throughput Trend + Latency Distribution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Throughput Trend</span>
              </div>
              <span className="text-xs font-mono text-primary">
                {currentRps !== null ? `${currentRps.toFixed(1)} req/s` : '—'}
              </span>
            </div>
            <RpsSparkline avgRps={currentRps} noData={!hasData} />
          </div>
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Latency Percentiles</span>
              </div>
              <span className="text-xs font-mono text-gray-400">ms</span>
            </div>
            <LatencyDistribution percentiles={result?.percentiles} noData={!hasData} />
          </div>
        </div>

        {/* Timer & Progress Bar */}
        <div className="rounded-xl border border-dark-700 bg-gradient-to-b from-dark-800/60 to-dark-900/60 p-5 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-gray-300">Estimated Time Remaining</span>
              </div>
              <span className="text-3xl font-mono font-bold text-primary tracking-wider">
                {timeDisplay}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Progress</span>
                <span className="text-primary font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 bg-dark-700/80 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{
                    width: `${Math.max(progress, 2)}%`,
                    background: 'linear-gradient(90deg, var(--color-primary) 0%, #ff8c1f 50%, var(--color-primary) 100%)',
                    backgroundSize: '200% 100%',
                  }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    style={{ animation: 'ltrvShine 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Config stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Virtual Users" value={config?.concurrency || 0} icon={Users} />
          <StatCard label="Load Profile" value={config?.rampUpSeconds > 0 ? "Ramp-up" : "Fixed"} icon={Gauge} />
          <StatCard label="Target RPS" value={config?.targetRps > 0 ? config.targetRps : "Unlimited"} icon={Zap} />
          <StatCard label="Think Time" value={`${config?.thinkTimeMs || 0}ms`} icon={Clock} />
        </div>

        {/* Polling error */}
        {pollingError && (
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            Error fetching test status: {pollingError}
          </div>
        )}

        {/* Status footer */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 text-xs text-gray-500 bg-dark-900/40 px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Test running. Results will appear automatically when complete.
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ltrvShine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}