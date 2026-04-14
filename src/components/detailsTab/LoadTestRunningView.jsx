import React, { useState, useEffect } from "react";
import { 
  Clock, Users, Gauge, Zap, Activity, Server, Wifi,
  XCircle, BarChart3, TrendingUp, Timer, Target
} from "lucide-react";
import clsx from "clsx";
import { getLoadTestStatus } from "../../services/loadTestService";

/* Stat card with animated entrance */
function StatCard({ label, value, icon: Icon, delay = 0 }) {
  return (
    <div
      className="p-4 rounded-xl bg-dark-900/40 border border-dark-700 hover:border-primary/30 transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

/* Spinning orbit dots for the main loader */
function OrbitLoader({ size = 'large' }) {
  const dim = size === 'large' ? 'w-24 h-24' : 'w-16 h-16';
  const inset1 = size === 'large' ? 'inset-3' : 'inset-2';
  const inset2 = size === 'large' ? 'inset-6' : 'inset-4';
  const iconSize = size === 'large' ? 'w-8 h-8' : 'w-6 h-6';
  const innerIcon = size === 'large' ? 'w-4 h-4' : 'w-3 h-3';

  return (
    <div className={clsx("relative", dim)} data-testid="orbit-loader">
      <div className="absolute inset-0 border-2 border-primary/10 rounded-full" />
      <div 
        className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin"
        style={{ animationDuration: '1.5s' }}
      />
      <div className={clsx("absolute border-2 border-primary/10 rounded-full", inset1)} />
      <div 
        className={clsx("absolute border-2 border-transparent border-r-primary/50 border-b-primary/50 rounded-full animate-spin", inset1)}
        style={{ animationDuration: '2.5s', animationDirection: 'reverse' }}
      />
      <div className={clsx("absolute bg-primary/5 rounded-full animate-pulse", inset2)} />
      <div 
        className={clsx("absolute border-2 border-transparent border-b-primary rounded-full animate-spin", inset2)}
        style={{ animationDuration: '1s' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={clsx("rounded-lg bg-primary/20 flex items-center justify-center", iconSize)}>
          <Activity className={clsx("text-primary animate-pulse", innerIcon)} />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: `${3 + i}s`, animationDelay: `${i * 0.5}s` }}
        >
          <div
            className="absolute w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50"
            style={{ top: '-4px', left: '50%', marginLeft: '-4px' }}
          />
        </div>
      ))}
    </div>
  );
}

/* Circular progress gauge for success rate */
function SuccessRateGauge({ rate }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 95 ? '#22c55e' : rate >= 80 ? '#eab308' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" data-testid="success-gauge">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{rate}%</span>
        <span className="text-[9px] text-gray-500 uppercase tracking-wide">Success</span>
      </div>
    </div>
  );
}

/* Mini sparkline for throughput trend */
function ThroughputSparkline({ data }) {
  if (data.length < 2) {
    return (
      <div className="h-10 flex items-center justify-center text-xs text-gray-600">
        Collecting data...
      </div>
    );
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 200;
  const height = 40;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible" data-testid="throughput-sparkline">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.length > 0 && (() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4);
        return <circle cx={lastX} cy={lastY} r="3" fill="var(--color-primary)" className="animate-pulse" />;
      })()}
    </svg>
  );
}

/* Full analytics dashboard metrics panel — accepts live props from polling */
function AnalyticsDashboard({ metrics }) {
  const {
    totalRequests = 0,
    successfulRequests = 0,
    failedRequests: errorCount = 0,
    errorRatePct = 0,
    currentRps: rps = 0,
    avgLatencyMs: avgLatency = 0,
    p95Ms: p95Latency = 0,
    p99Ms: p99Latency = 0,
    throughputHistory = [],
  } = metrics || {};

  const successRate = totalRequests > 0
    ? Math.round((successfulRequests / totalRequests) * 100)
    : 100;

  return (
    <div className="space-y-4" data-testid="analytics-dashboard">
      {/* Row 1: Success Rate Gauge + Key Metrics */}
      <div className="grid grid-cols-12 gap-4">
        {/* Success Rate Gauge */}
        <div className="col-span-3 rounded-xl bg-dark-900/40 border border-dark-700 p-4 flex flex-col items-center justify-center">
          <SuccessRateGauge rate={successRate} />
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Success Rate</p>
        </div>

        {/* Key number cards */}
        <div className="col-span-9 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Total Requests</span>
            </div>
            <p className="text-xl font-bold font-mono text-white">{totalRequests.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Current RPS</span>
            </div>
            <p className="text-xl font-bold font-mono text-green-400">{rps}</p>
          </div>
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Errors</span>
            </div>
            <p className="text-xl font-bold font-mono text-red-400">{errorCount}</p>
          </div>
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Timer className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Avg Latency</span>
            </div>
            <p className="text-xl font-bold font-mono text-blue-400">{avgLatency}<span className="text-xs text-gray-500 ml-0.5">ms</span></p>
          </div>
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">P95 Latency</span>
            </div>
            <p className="text-xl font-bold font-mono text-yellow-400">{p95Latency}<span className="text-xs text-gray-500 ml-0.5">ms</span></p>
          </div>
          <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">P99 Latency</span>
            </div>
            <p className="text-xl font-bold font-mono text-orange-400">{p99Latency}<span className="text-xs text-gray-500 ml-0.5">ms</span></p>
          </div>
        </div>
      </div>

      {/* Row 2: Throughput Trend */}
      <div className="rounded-xl bg-dark-900/40 border border-dark-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Throughput Trend</span>
          </div>
          <span className="text-xs font-mono text-primary">{rps} req/s</span>
        </div>
        <ThroughputSparkline data={throughputHistory} />
      </div>
    </div>
  );
}

export default function LoadTestRunningView({
  loadTestId,
  config,
  onComplete,
}) {
  const [timeRemaining, setTimeRemaining] = useState(config?.durationSeconds || 0);
  const [progress, setProgress] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState({});
  const [throughputHistory, setThroughputHistory] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingError, setPollingError] = useState(null);

  const isInitializing = !loadTestId;

  // Local timer based on config
  useEffect(() => {
    if (!config?.durationSeconds) return;
    const startTime = Date.now();
    const durationMs = config.durationSeconds * 1000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeRemaining(Math.floor(remaining / 1000));
      setProgress(Math.min(100, (elapsed / durationMs) * 100));
    }, 100);
    return () => clearInterval(timer);
  }, [config?.durationSeconds]);

  // Polling mechanism
  useEffect(() => {
    if (!loadTestId) return;

    console.log('[LoadTestRunningView] Starting polling for testId:', loadTestId);
    setIsPolling(true);
    setPollingError(null);

    let isMounted = true;
    let timeoutId = null;

    const poll = async () => {
      if (!isMounted) return;
      try {
        const response = await getLoadTestStatus(loadTestId);
        const data = response.data;
        
        if (data.status === 'DONE' || data.status === 'FAILED') {
          // Test completed
          if (isMounted) {
            if (data.liveMetrics) {
              setLiveMetrics(data.liveMetrics);
              setThroughputHistory(prev => [...prev.slice(-29), data.liveMetrics.currentRps ?? 0]);
            }
            onComplete(loadTestId);
          }
          return;
        }
        
        if (data.liveMetrics) {
          setLiveMetrics(data.liveMetrics);
          setThroughputHistory(prev => [...prev.slice(-29), data.liveMetrics.currentRps ?? 0]);
        }
        
        // Poll again after 2 seconds
        if (isMounted) {
          timeoutId = setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error('[LoadTestRunningView] Polling error:', err);
        if (isMounted) {
          setPollingError(err.message);
          // Retry after 3 seconds
          timeoutId = setTimeout(poll, 3000);
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      setIsPolling(false);
    };
  }, [loadTestId, onComplete]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-dark-800/80 backdrop-blur-sm" data-testid={isInitializing ? "load-test-starting" : "load-test-running"}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isInitializing ? (
              <OrbitLoader size="small" />
            ) : (
              <div className="relative">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {isInitializing ? 'Initializing Load Test' : 'Load Test in Progress'}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {isInitializing
                  ? 'Setting up virtual users and preparing test environment...'
                  : <>Test ID: <span className="font-mono text-gray-300">{loadTestId}</span></>
                }
              </p>
              {pollingError && (
                <p className="text-xs text-yellow-400 mt-1">Polling: {pollingError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard metrics={{ ...liveMetrics, throughputHistory }} />

        {/* Timer & Progress */}
        <div className="rounded-xl border border-dark-700 bg-gradient-to-b from-dark-800/60 to-dark-900/60 p-5 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-gray-300">
                  {isInitializing ? 'Estimated Duration' : 'Estimated Time Remaining'}
                </span>
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
                    width: `${Math.max(progress, isInitializing ? 2 : 0)}%`,
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
          <StatCard label="Virtual Users" value={config?.concurrency || 0} icon={Users} delay={0} />
          <StatCard label="Load Profile" value={config?.rampUpSeconds > 0 ? "Ramp-up" : "Fixed"} icon={Gauge} delay={100} />
          <StatCard label="Target RPS" value={config?.targetRps > 0 ? config.targetRps : "Unlimited"} icon={Zap} delay={200} />
          <StatCard label="Think Time" value={`${config?.thinkTimeMs || 0}ms`} icon={Clock} delay={300} />
        </div>

        {/* Status footer */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 text-xs text-gray-500 bg-dark-900/40 px-4 py-2 rounded-full">
            <span className={clsx(
              "w-2 h-2 rounded-full animate-pulse",
              isInitializing ? "bg-yellow-400" : "bg-green-400"
            )} />
            {isInitializing
              ? 'Waiting for test to initialize...'
              : isPolling ? 'Polling for metrics...' : 'Test running. Results will appear automatically when complete.'
            }
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