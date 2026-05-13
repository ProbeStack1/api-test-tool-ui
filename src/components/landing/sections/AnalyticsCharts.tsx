// @ts-nocheck — legacy landing component ported 1:1 from the approved zip.
import { useEffect, useMemo, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BarChart3, Activity, Globe2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = {
  orange: '#ff5b1f',
  orangeLight: '#ff8c4a',
  green: '#1fbf9a',
  blue: '#4a9fff',
  yellow: '#ffb400',
  red: '#ff4444',
  purple: '#c084fc',
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const categories = ['Auth', 'Users', 'Products', 'Orders', 'Payments', 'Analytics'];

function generateAreaData() {
  return days.map(day => ({
    name: day,
    p50: Math.floor(30 + Math.random() * 80),
    p95: Math.floor(100 + Math.random() * 200),
    p99: Math.floor(200 + Math.random() * 400),
  }));
}

function generateBarData() {
  return categories.map(cat => ({
    name: cat,
    passed: Math.floor(40 + Math.random() * 60),
    failed: Math.floor(Math.random() * 15),
    skipped: Math.floor(Math.random() * 8),
  }));
}

function generatePieData() {
  const covered = Math.floor(70 + Math.random() * 25);
  const partial = Math.floor(Math.random() * (100 - covered) * 0.6);
  const uncovered = 100 - covered - partial;
  return [
    { name: 'Covered', value: covered, color: COLORS.green },
    { name: 'Partial', value: partial, color: COLORS.yellow },
    { name: 'Uncovered', value: uncovered, color: COLORS.red },
  ];
}

/** Rolling-window latency (1 sample / second over the last 30 s). */
function generateLineData() {
  const out = [];
  let p50 = 65, p95 = 220;
  for (let i = 29; i >= 0; i--) {
    p50 = clamp(p50 + (Math.random() - 0.5) * 18, 30, 140);
    p95 = clamp(p95 + (Math.random() - 0.5) * 50, 100, 480);
    out.push({ t: -i, p50: Math.round(p50), p95: Math.round(p95) });
  }
  return out;
}
function rollLineData(prev) {
  const last = prev[prev.length - 1];
  const next = {
    t: 0,
    p50: clamp(last.p50 + (Math.random() - 0.5) * 18, 30, 140),
    p95: clamp(last.p95 + (Math.random() - 0.5) * 50, 100, 480),
  };
  return [...prev.slice(1), next].map((p, i) => ({ ...p, t: i - 29 }));
}

/** Global region health — RPS, success, p95 across 6 regions. */
function generateRadarData() {
  return [
    { region: 'us-east',  uptime: rand(94, 100), throughput: rand(70, 100), latency: rand(75, 99) },
    { region: 'us-west',  uptime: rand(92, 100), throughput: rand(60, 95),  latency: rand(70, 95) },
    { region: 'eu-west',  uptime: rand(96, 100), throughput: rand(75, 100), latency: rand(80, 99) },
    { region: 'ap-south', uptime: rand(88, 99),  throughput: rand(55, 90),  latency: rand(60, 90) },
    { region: 'ap-east',  uptime: rand(93, 100), throughput: rand(65, 95),  latency: rand(70, 92) },
    { region: 'sa-east',  uptime: rand(90, 99),  throughput: rand(50, 85),  latency: rand(60, 88) },
  ];
}
const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Theme-aware tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="text-text-primary font-medium mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="text-text-primary font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: d.payload.color }} />
        <span className="text-text-primary">{d.name}: {d.value}%</span>
      </div>
    </div>
  );
}

export default function AnalyticsCharts() {
  const [ref, isVisible] = useScrollReveal();

  const [areaData, setAreaData] = useState(() => generateAreaData());
  const [barData,  setBarData]  = useState(() => generateBarData());
  const [pieData,  setPieData]  = useState(() => generatePieData());
  const [lineData, setLineData] = useState(() => generateLineData());
  const [radarData, setRadarData] = useState(() => generateRadarData());

  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => {
      setAreaData(generateAreaData());
      setBarData(generateBarData());
      setPieData(generatePieData());
      setLineData((prev) => rollLineData(prev));
      setRadarData(generateRadarData());
    }, 2500);
    return () => clearInterval(id);
  }, [isVisible]);

  const totalCovered = pieData[0].value;

  return (
    <section data-testid="analytics-section" ref={ref} className="relative z-10 py-20 border-b border-border">
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className={`flex items-center gap-3 mb-10 ${isVisible ? 'animate-fade-in-left' : 'opacity-0'}`}>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 data-testid="analytics-section-title" className="text-3xl font-bold text-text-primary font-heading">
              Real-Time Analytics
            </h2>
            <p className="text-sm text-text-secondary mt-1">Live metrics from your API test runs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart */}
          <div className={`bg-surface border border-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Response Times (ms)</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Live</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="gradP50" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradP95" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.yellow} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={COLORS.yellow} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradP99" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.orange} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={COLORS.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="p50" stroke={COLORS.green} fill="url(#gradP50)" strokeWidth={2} name="P50" />
                <Area type="monotone" dataKey="p95" stroke={COLORS.yellow} fill="url(#gradP95)" strokeWidth={1.5} name="P95" />
                <Area type="monotone" dataKey="p99" stroke={COLORS.orange} fill="url(#gradP99)" strokeWidth={1} name="P99" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className={`bg-surface border border-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Test Results by Module</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Latest Run</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="passed" fill={COLORS.green} radius={[3, 3, 0, 0]} name="Passed" />
                <Bar dataKey="failed" fill={COLORS.red} radius={[3, 3, 0, 0]} name="Failed" />
                <Bar dataKey="skipped" fill={COLORS.yellow} radius={[3, 3, 0, 0]} name="Skipped" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className={`bg-surface border border-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Test Coverage</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info">Overall</span>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-10px' }}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary font-heading">{totalCovered}%</div>
                  <div className="text-[10px] text-text-secondary uppercase tracking-wider">Covered</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second row — two extra "live" charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Rolling 30 s latency line */}
          <div className={`bg-surface border border-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold text-text-primary">Live Latency · last 30 s</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Streaming
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <defs>
                  <linearGradient id="linep50" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor={COLORS.green} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={COLORS.green} stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="linep95" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor={COLORS.orange} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={COLORS.orange} stopOpacity="1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}s`} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="p50" stroke="url(#linep50)" strokeWidth={2.5} dot={false} isAnimationActive={false} name="P50" />
                <Line type="monotone" dataKey="p95" stroke="url(#linep95)" strokeWidth={2}   dot={false} isAnimationActive={false} name="P95" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Global region health radar */}
          <div className={`bg-surface border border-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-info" />
                <h3 className="text-sm font-semibold text-text-primary">Region Health</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info">6 regions</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} outerRadius={80}>
                <PolarGrid stroke="var(--color-border-subtle)" />
                <PolarAngleAxis dataKey="region" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                <Radar name="Uptime"     dataKey="uptime"     stroke={COLORS.green}  fill={COLORS.green}  fillOpacity={0.25} isAnimationActive={false} />
                <Radar name="Throughput" dataKey="throughput" stroke={COLORS.orange} fill={COLORS.orange} fillOpacity={0.25} isAnimationActive={false} />
                <Radar name="Latency"    dataKey="latency"    stroke={COLORS.blue}   fill={COLORS.blue}   fillOpacity={0.18} isAnimationActive={false} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)', paddingTop: 6 }}
                />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}