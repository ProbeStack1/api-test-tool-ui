import { useMemo } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="text-white font-medium mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-dark-400">{entry.name}:</span>
          <span className="text-white font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: d.payload.color }} />
        <span className="text-white">{d.name}: {d.value}%</span>
      </div>
    </div>
  );
}

export default function AnalyticsCharts() {
  const [ref, isVisible] = useScrollReveal();

  const areaData = useMemo(() => generateAreaData(), []);
  const barData = useMemo(() => generateBarData(), []);
  const pieData = useMemo(() => generatePieData(), []);

  const totalCovered = pieData[0].value;

  return (
    <section data-testid="analytics-section" ref={ref} className="relative z-10 py-20 border-b landing-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center gap-3 mb-10 ${isVisible ? 'animate-fade-in-left' : 'opacity-0'}`}>
          <div className="w-10 h-10 rounded-lg bg-[#ff5b1f]/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#ff5b1f]" />
          </div>
          <div>
            <h2 data-testid="analytics-section-title" className="text-3xl font-bold landing-text-primary font-heading">
              Real-Time Analytics
            </h2>
            <p className="text-sm landing-text-secondary mt-1">Live metrics from your API test runs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart */}
          <div className={`landing-card-bg border landing-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold landing-text-primary">Response Times (ms)</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#1fbf9a]/10 text-[#1fbf9a]">Live</span>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#232942" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8890aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8890aa', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="p50" stroke={COLORS.green} fill="url(#gradP50)" strokeWidth={2} name="P50" />
                <Area type="monotone" dataKey="p95" stroke={COLORS.yellow} fill="url(#gradP95)" strokeWidth={1.5} name="P95" />
                <Area type="monotone" dataKey="p99" stroke={COLORS.orange} fill="url(#gradP99)" strokeWidth={1} name="P99" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className={`landing-card-bg border landing-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold landing-text-primary">Test Results by Module</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff5b1f]/10 text-[#ff5b1f]">Latest Run</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232942" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8890aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8890aa', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="passed" fill={COLORS.green} radius={[3, 3, 0, 0]} name="Passed" />
                <Bar dataKey="failed" fill={COLORS.red} radius={[3, 3, 0, 0]} name="Failed" />
                <Bar dataKey="skipped" fill={COLORS.yellow} radius={[3, 3, 0, 0]} name="Skipped" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className={`landing-card-bg border landing-border rounded-2xl p-5 overflow-hidden transition-all duration-700 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold landing-text-primary">Test Coverage</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#c084fc]/10 text-[#c084fc]">Overall</span>
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
                  <div className="text-2xl font-bold landing-text-primary font-heading">{totalCovered}%</div>
                  <div className="text-[10px] landing-text-secondary uppercase tracking-wider">Covered</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs landing-text-secondary">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
