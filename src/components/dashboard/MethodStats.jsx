import { useMemo, useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

const METHOD_CONFIG = {
  GET:     { color: '#00ff5e', glow: '#4ade8040', label: 'Read' },
  POST:    { color: '#facc15', glow: '#facc1540', label: 'Create' },
  PUT:     { color: '#0073ff', glow: '#0073ff40', label: 'Update' },
  DELETE:  { color: '#ff0000', glow: '#f8717140', label: 'Remove' },
  PATCH:   { color: '#8000ff', glow: '#8000ff40', label: 'Modify' },
  HEAD:    { color: '#94a3b8', glow: '#94a3b840', label: 'Head' },
  OPTIONS: { color: '#94a3b8', glow: '#94a3b840', label: 'Options' },
};

function MiniRing({ percent, color, size = 38, strokeWidth = 3.5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => setOffset(circumference * (1 - percent / 100)), 400);
    return () => clearTimeout(timer);
  }, [percent, circumference]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1a1f35" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)', filter: `drop-shadow(0 0 3px ${color}50)` }}
      />
    </svg>
  );
}

function AnimCount({ value, duration = 1200 }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (value === 0) { setN(0); return; }
    let start = null;
    let rafId;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) rafId = requestAnimationFrame(run);
    };
    rafId = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <span>{n}</span>;
}

export default function MethodCards({ dashboardData = null, workspaceRuns = [] }) {
  const { methods, total } = useMemo(() => {
    const counts = {};

    // Priority 1: Use real data from dashboardData.summary.requests.byMethod
    const byMethod = dashboardData?.summary?.requests?.byMethod;
    if (byMethod && typeof byMethod === 'object') {
      const hiddenMethods = ['HEAD', 'OPTIONS'];
      Object.entries(byMethod).forEach(([method, count]) => {
        const upper = method.toUpperCase();
        if (!hiddenMethods.includes(upper)) {
          counts[upper] = count;
        }
      });
    }

    // Priority 2: If no byMethod data, try from workspaceRuns results
    if (Object.keys(counts).length === 0 && workspaceRuns.length > 0) {
      workspaceRuns.forEach(r => {
        (r.results || []).forEach(res => {
          const m = res.method?.toUpperCase();
          if (m) counts[m] = (counts[m] || 0) + 1;
        });
      });
    }

    // Priority 3: If nothing from API, still show all standard methods with 0
    if (Object.keys(counts).length === 0) {
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(m => { counts[m] = 0; });
    }
    // But show all standard methods so the chart isn't empty
    if (Object.keys(counts).length === 0) {
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(m => { counts[m] = 0; });
    }

    const t = Object.values(counts).reduce((a, b) => a + b, 0);
    const arr = Object.entries(counts)
      .map(([method, count]) => ({
        method,
        count,
        percent: t > 0 ? (count / t) * 100 : 0,
        ...(METHOD_CONFIG[method] || { color: '#c084fc', glow: '#c084fc40', label: method }),
      }))
      .sort((a, b) => b.count - a.count);

    return { methods: arr, total: t };
  }, [dashboardData, workspaceRuns]);

  return (
    <div className="bg-dark-700/20 border border-dark-700 rounded-xl p-5 hover:border-primary/30 transition-all h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#facc15]/10">
            <Zap className="w-3.5 h-3.5 text-[#facc15]" />
          </div>
          <h3 className="text-sm font-semibold text-white">HTTP Methods</h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-dark-400 font-mono">{total} reqs</span>
      </div>

      <div className={`grid gap-2 ${methods.length >= 5 ? 'grid-cols-5' : methods.length >= 3 ? 'grid-cols-3' : methods.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {methods.map((m, i) => (
          <div
            key={m.method}
            className="group relative rounded-xl p-3 text-center overflow-hidden border border-white/[0.03] hover:border-white/[0.08] transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${m.color}08, transparent 60%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"
              style={{ background: `radial-gradient(circle at 50% 30%, ${m.color}12, transparent 70%)` }}
            />

            <div className="relative">
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <MiniRing percent={m.percent} color={m.color} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white font-mono">
                      {m.count > 0 ? m.percent.toFixed(0) + '%' : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5 tracking-wider"
                style={{
                  background: `${m.color}15`,
                  color: m.color,
                  border: `1px solid ${m.color}25`,
                }}
              >
                {m.method}
              </div>

              <div className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <AnimCount value={m.count} duration={1000 + i * 200} />
              </div>
              <div className="text-[9px] text-dark-500">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="mt-4 h-1.5 rounded-full bg-dark-800 overflow-hidden flex">
        {total > 0 ? methods.map(m => (
          <div
            key={m.method}
            className="h-full transition-all duration-1000"
            style={{
              width: `${m.percent}%`,
              background: m.color,
              boxShadow: `0 0 8px ${m.color}40`,
            }}
          />
        )) : (
          <div className="h-full w-full bg-dark-700/50" />
        )}
      </div>
    </div>
  );
}
