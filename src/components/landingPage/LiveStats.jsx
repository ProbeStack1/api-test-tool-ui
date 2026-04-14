import { useScrollReveal ,useCountUp } from '../hooks/useScrollReveal';
import { TrendingUp, Clock, Server, Plug } from 'lucide-react';

const stats = [
  { icon: TrendingUp, label: 'API Calls Processed', end: 50, suffix: 'M+', decimals: 0 },
  { icon: Clock, label: 'Avg Response Time', end: 47, suffix: 'ms', decimals: 0, prefix: '<' },
  { icon: Server, label: 'Uptime Guarantee', end: 99.99, suffix: '%', decimals: 2 },
  { icon: Plug, label: 'Active Integrations', end: 150, suffix: '+', decimals: 0 },
];

function StatItem({ icon: Icon, label, end, suffix, decimals = 0, prefix = '', isVisible, delay }) {
  const count = useCountUp(end, 2200, isVisible, decimals);

  return (
    <div
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={`relative group p-6 text-center transition-all duration-700 ${isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
      style={{ animationDelay: delay }}
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#ff5b1f]/20 to-[#ff5b1f]/5 flex items-center justify-center text-[#ff5b1f] border border-[#ff5b1f]/10 overflow-hidden">
  <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
</div>
      <div className="text-4xl md:text-5xl font-bold font-heading landing-text-primary animate-counter-glow mb-2">
        {prefix}{isVisible ? count : 0}{suffix}
      </div>
      <div className="text-sm landing-text-secondary font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-50 h-0.5 bg-gradient-to-r from-transparent via-[#ff5b1f]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

export default function LiveStats() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section data-testid="live-stats-section" ref={ref} className="relative z-10 py-20 border-b landing-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <StatItem key={stat.label} {...stat} isVisible={isVisible} delay={`${i * 0.1}s`} />
          ))}
        </div>
      </div>
    </section>
  );
}
