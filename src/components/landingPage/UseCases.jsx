import { useScrollReveal } from '../hooks/useScrollReveal';
import { ShoppingCart, Landmark, Heart, Cloud, ArrowUpRight, Image as ImageIcon } from 'lucide-react';

const useCases = [
  {
    icon: ShoppingCart,
    title: 'E-Commerce',
    desc: 'Validate checkout flows, payment gateways, inventory APIs, and order management endpoints across multiple environments.',
    image: '/assets/showcase-1.png',
    accent: '#ff5b1f',
  },
  {
    icon: Landmark,
    title: 'Financial Services',
    desc: 'Ensure transaction APIs meet compliance standards with automated security scanning and rate-limit testing.',
    image: '/assets/showcase-2.png',
    accent: '#4a9fff',
  },
  {
    icon: Heart,
    title: 'Healthcare',
    desc: 'Test HIPAA-compliant APIs, patient data endpoints, and interoperability standards with comprehensive audit trails.',
    image: '/assets/showcase-3.png',
    accent: '#1fbf9a',
  },
  {
    icon: Cloud,
    title: 'SaaS Platforms',
    desc: 'Monitor multi-tenant API performance, test webhook deliveries, and validate OAuth flows at scale.',
    image: '/assets/showcase-4.png',
    accent: '#c084fc',
  },
];

function ImagePlaceholder({ accent }) {
  return (
    <div className="w-full h-full img-placeholder-shimmer rounded-lg flex items-center justify-center">
      <ImageIcon className="w-8 h-8" style={{ color: accent, opacity: 0.4 }} />
    </div>
  );
}

function UseCaseCard({ icon: Icon, title, desc, image, accent, isVisible, index }) {
  return (
    <div
      data-testid={`usecase-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`group relative rounded-2xl overflow-hidden landing-card-bg border landing-border hover:border-[${accent}]/40 transition-all duration-500 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0 translate-y-8'}`}
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Image area */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
        <div className="w-full h-full hidden" style={{ display: 'none' }}>
          <ImagePlaceholder accent={accent} />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161b30] via-transparent to-transparent" />
        {/* Icon badge */}
        <div
          className="absolute top-3 left-3 w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-md border"
          style={{ background: `${accent}20`, borderColor: `${accent}30`, color: accent }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold landing-text-primary font-heading">{title}</h3>
          <ArrowUpRight className="w-4 h-4 landing-text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </div>
        <p className="text-sm landing-text-secondary leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function UseCases() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section data-testid="use-cases-section" ref={ref} className="relative z-10 py-20 border-b landing-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 data-testid="use-cases-title" className="text-3xl font-bold landing-text-primary font-heading">
            Built for Every Industry
          </h2>
          <p className="text-sm landing-text-secondary mt-2 max-w-lg mx-auto">
            Enterprise-grade API testing tailored to your domain
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((uc, i) => (
            <UseCaseCard key={uc.title} {...uc} isVisible={isVisible} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
