import { Activity, Shield, Target, Gauge, FlaskConical, BarChart3 } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const features = [
  { icon: Activity, title: 'Discovery', desc: 'Discover and understand all existing API assets, configurations, and dependencies with intelligent scanning.' },
  { icon: Shield, title: 'Policy & Security', desc: 'Analyze security protocols, enforce policies, and ensure compliance across your API landscape.' },
  { icon: Target, title: 'Execution', desc: 'Move your APIs from one logic to another with full migration capabilities and low-risk pilots.' },
  { icon: Gauge, title: 'Performance', desc: 'Monitor real-time API performance metrics, latency distribution, and throughput analysis across all endpoints.' },
  { icon: FlaskConical, title: 'Automated Testing', desc: 'Create and run comprehensive test suites with intelligent assertions, edge-case detection, and regression testing.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Deep dive into API usage patterns, error rates, response distributions, and trend analysis with visual dashboards.' },
];

function FeatureCard({ icon: Icon, title, desc, isVisible, delay }) {
  return (
    <div
      data-testid={`feature-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`group relative p-6 rounded-2xl h-full overflow-hidden transition-all duration-500 cursor-default landing-card-bg backdrop-blur-sm glass-card border landing-border hover:border-[#ff5b1f]/40 hover:shadow-xl hover:shadow-[#ff5b1f]/5 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0 translate-y-8'}`}
      style={{ animationDelay: delay }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff5b1f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#ff5b1f]/10 rounded-full blur-2xl group-hover:bg-[#ff5b1f]/20 transition-all duration-700" />

      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff5b1f]/10 flex items-center justify-center mb-4 text-[#ff5b1f] group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold mb-2 landing-text-primary group-hover:text-[#ff5b1f] transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm landing-text-secondary leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

export default function FeaturesGrid() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section data-testid="features-section" ref={ref} className="relative z-10 py-20 border-b landing-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center gap-3 mb-10 ${isVisible ? 'animate-fade-in-left' : 'opacity-0'}`}>
          <div className="w-10 h-10 rounded-lg bg-[#ff5b1f]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#ff5b1f]" />
          </div>
          <h2 data-testid="features-section-title" className="text-3xl font-bold landing-text-primary font-heading">
            Key Features
          </h2>
        </div>

        <div data-testid="features-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} isVisible={isVisible} delay={`${i * 0.08}s`} />
          ))}
        </div>
      </div>
    </section>
  );
}
