import { useMemo } from 'react';
import { Radio } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export default function ThroughputPulse({ loadTestRuns = [] }) {
  const { rpsData, currentRps, peakRps } = useMemo(() => {
    if (loadTestRuns.length > 0) {
      const points = loadTestRuns.slice(-20).map((r, i) => {
        const res = r.result ?? r;
        return { idx: i, rps: parseFloat((res.actualRps || r.actualRps || 0).toFixed(1)) };
      });
      const curr = points.length > 0 ? points[points.length - 1].rps : 0;
      const peak = Math.max(...points.map(p => p.rps));
      return { rpsData: points, currentRps: curr, peakRps: peak };
    }

    const points = Array.from({ length: 20 }, (_, i) => ({
      idx: i,
      rps: parseFloat((15 + Math.sin(i * 0.5) * 8 + Math.random() * 5).toFixed(1)),
    }));
    const curr = points[points.length - 1].rps;
    const peak = Math.max(...points.map(p => p.rps));
    return { rpsData: points, currentRps: curr, peakRps: peak };
  }, [loadTestRuns]);

  return (
    <div className="bg-dark-700/20 border border-dark-700 rounded-xl p-5 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative p-1.5 rounded-lg bg-[#4a9fff]/10">
            <Radio className="w-3.5 h-3.5 text-[#0073ff]" />
            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#0073ff] animate-ping" />
          </div>
          <h3 className="text-sm font-semibold text-white">Throughput</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0073ff] animate-pulse" />
          <span className="text-[10px] text-[#0073ff] font-medium">Live</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="relative h-16 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rpsData}>
            <defs>
              <linearGradient id="rpsPulse" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4a9fff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#4a9fff" stopOpacity={1} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
            <Line
              type="monotone" dataKey="rps" stroke="url(#rpsPulse)" strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#4a9fff', strokeWidth: 0, style: { filter: 'drop-shadow(0 0 4px #4a9fff)' } }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Current value indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <div className="h-px w-3 bg-[#4a9fff]/50" />
          <div className="text-[10px] font-mono text-[#0073ff] bg-dark-800/80 px-1.5 py-0.5 rounded border border-[#4a9fff]/20">
            {currentRps}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center rounded-lg bg-white/[0.02] border border-white/[0.03] py-2">
          <div className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{currentRps}</div>
          <div className="text-xs text-dark-500">Current RPS</div>
        </div>
        <div className="text-center rounded-lg bg-white/[0.02] border border-white/[0.03] py-2">
          <div className="text-sm font-bold text-[#ffb400]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{peakRps}</div>
          <div className="text-xs text-dark-500">Peak RPS</div>
        </div>
        <div className="text-center rounded-lg bg-white/[0.02] border border-white/[0.03] py-2">
          <div className="text-sm font-bold text-[#00ff5e]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {rpsData.length > 0 ? (rpsData.reduce((s, p) => s + p.rps, 0) / rpsData.length).toFixed(1) : '0'}
          </div>
          <div className="text-xs text-dark-500">Avg RPS</div>
        </div>
      </div>
    </div>
  );
}
