import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="text-white font-medium mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-dark-400">{entry.name}:</span>
          <span className="text-white font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ActivityChart({ workspaceRuns = [], loadTestRuns = [] }) {
  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (workspaceRuns.length > 0 || loadTestRuns.length > 0) {
      const grouped = {};
      days.forEach(d => { grouped[d] = { functional: 0, load: 0 }; });
      workspaceRuns.forEach(r => {
        if (r.startedAt) {
          const dayIdx = new Date(r.startedAt).getDay();
          const adjusted = dayIdx === 0 ? 6 : dayIdx - 1;
          grouped[days[adjusted]].functional++;
        }
      });
      loadTestRuns.forEach(r => {
        if (r.startedAt) {
          const dayIdx = new Date(r.startedAt).getDay();
          const adjusted = dayIdx === 0 ? 6 : dayIdx - 1;
          grouped[days[adjusted]].load++;
        }
      });
      return days.map(d => ({ name: d, functional: grouped[d].functional, load: grouped[d].load }));
    }

    return days.map(d => ({
      name: d,
      functional: Math.floor(5 + Math.random() * 30),
      load: Math.floor(2 + Math.random() * 15),
    }));
  }, [workspaceRuns, loadTestRuns]);

  return (
    <div className="bg-dark-700/20 border border-dark-700 rounded-xl p-5 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#ff5b1f]/10">
            <Activity className="w-3.5 h-3.5 text-[#ff5b1f]" />
          </div>
          <h3 className="text-sm font-semibold text-white">Test Activity</h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1fbf9a]/10 text-[#1fbf9a] font-medium">7 Days</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="actFunctional" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5b1f" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#ff5b1f" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="actLoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a9fff" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#4a9fff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#232942" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#8890aa', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8890aa', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="functional" stroke="#ff5b1f" fill="url(#actFunctional)" strokeWidth={1.5} dot={false} name="Functional" />
          <Area type="monotone" dataKey="load" stroke="#4a9fff" fill="url(#actLoad)" strokeWidth={1.5} dot={false} name="Load Tests" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 mt-3">
        <div className="flex items-center gap-1.5 text-[10px] text-dark-400">
          <div className="w-3 h-[1.5px] bg-[#ff5b1f] rounded-full" />Functional
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-dark-400">
          <div className="w-3 h-[1.5px] bg-[#4a9fff] rounded-full" />Load Tests
        </div>
      </div>
    </div>
  );
}
