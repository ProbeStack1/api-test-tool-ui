import { useScrollReveal } from '../hooks/useScrollReveal';
import { Globe, Code2, Zap, Wifi, FileJson, Shield, Database, GitBranch, Cloud, Webhook, Lock, Cpu } from 'lucide-react';

const integrations = [
  { icon: FileJson, name: 'REST APIs', color: '#ff5b1f' },
  { icon: Code2, name: 'GraphQL', color: '#e535ab' },
  { icon: Zap, name: 'gRPC', color: '#4a9fff' },
  { icon: Wifi, name: 'WebSocket', color: '#1fbf9a' },
  { icon: Globe, name: 'Swagger', color: '#85ea2d' },
  { icon: Shield, name: 'OAuth 2.0', color: '#ffb400' },
  { icon: Database, name: 'PostgreSQL', color: '#336791' },
  { icon: Database, name: 'MongoDB', color: '#47a248' },
  { icon: GitBranch, name: 'GitHub', color: '#f0f0f0' },
  { icon: Cloud, name: 'AWS', color: '#ff9900' },
  { icon: Webhook, name: 'Webhooks', color: '#c084fc' },
  { icon: Lock, name: 'JWT', color: '#ff4444' },
  { icon: Cpu, name: 'Docker', color: '#2496ed' },
  { icon: GitBranch, name: 'GitLab CI', color: '#fc6d26' },
  { icon: Cloud, name: 'Azure', color: '#0089d6' },
  { icon: Shield, name: 'SAML', color: '#ff6b6b' },
];

function IntegrationItem({ icon: Icon, name, color }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl landing-card-bg border landing-border hover:border-[#ff5b1f]/30 transition-all duration-300 group cursor-default mx-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}15`, color }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium landing-text-primary whitespace-nowrap">{name}</span>
    </div>
  );
}

export default function IntegrationPartners() {
  const [ref, isVisible] = useScrollReveal();

  const row1 = integrations.slice(0, 8);
  const row2 = integrations.slice(8, 16);

  return (
    <section data-testid="integrations-section" ref={ref} className="relative z-10 py-20 border-b landing-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 data-testid="integrations-title" className="text-3xl font-bold landing-text-primary font-heading">
            Integrations & Protocols
          </h2>
          <p className="text-sm landing-text-secondary mt-2 max-w-lg mx-auto">
            Connects with your entire API ecosystem out of the box
          </p>
        </div>
      </div>

      {/* Marquee Row 1 */}
      <div className={`relative mb-4 transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-probestack-bg to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-probestack-bg to-transparent z-10" />
        <div className="flex animate-marquee" style={{ width: 'max-content' }}>
          {[...row1, ...row1, ...row1].map((item, i) => (
            <IntegrationItem key={`r1-${i}`} {...item} />
          ))}
        </div>
      </div>

      {/* Marquee Row 2 - reverse */}
      <div className={`relative transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0.2s' }}>
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-probestack-bg to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-probestack-bg to-transparent z-10" />
        <div className="flex animate-marquee" style={{ width: 'max-content', animationDirection: 'reverse', animationDuration: '35s' }}>
          {[...row2, ...row2, ...row2].map((item, i) => (
            <IntegrationItem key={`r2-${i}`} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
