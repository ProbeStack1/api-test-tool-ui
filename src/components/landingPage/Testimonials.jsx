import { useMemo } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Quote, Star } from 'lucide-react';

const allTestimonials = [
  { name: 'Sarah Chen', role: 'Engineering Lead', company: 'TechFlow', text: 'ProbeStack reduced our API regression testing time by 80%. The automated test generation is incredibly accurate.', rating: 5 },
  { name: 'Marcus Rivera', role: 'CTO', company: 'FinanceAPI', text: 'The security scanning feature caught vulnerabilities our manual QA team missed. Essential tool for any fintech company.', rating: 5 },
  { name: 'Emily Watson', role: 'DevOps Manager', company: 'CloudScale', text: 'Integrating ProbeStack into our CI/CD pipeline was seamless. The real-time analytics dashboard is a game-changer.', rating: 5 },
  { name: 'David Park', role: 'Senior Developer', company: 'DataSync', text: 'The collaborative features make it easy for our distributed team to share test suites and review results together.', rating: 4 },
  { name: 'Lisa Johnson', role: 'QA Director', company: 'HealthConnect', text: 'HIPAA compliance testing out of the box. ProbeStack understands the healthcare API landscape better than any other tool.', rating: 5 },
  { name: 'James O\'Brien', role: 'VP Engineering', company: 'RetailHub', text: 'Our API uptime improved from 99.5% to 99.99% after implementing ProbeStack. The performance monitoring is exceptional.', rating: 5 },
];

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('');
}

const AVATAR_COLORS = ['#ff5b1f', '#1fbf9a', '#4a9fff', '#ffb400', '#c084fc', '#ff4444'];

function TestimonialCard({ name, role, company, text, rating, isVisible, index }) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div
      data-testid={`testimonial-${index}`}
      className={`relative p-6 rounded-2xl landing-card-bg border landing-border hover:border-[#ff5b1f]/30 transition-all duration-500 group ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0 translate-y-8'}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
        <Quote className="w-8 h-8 text-[#ff5b1f]" />
      </div>

      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className="w-3.5 h-3.5"
            fill={i < rating ? '#ffb400' : 'transparent'}
            stroke={i < rating ? '#ffb400' : '#343b5c'}
          />
        ))}
      </div>

      <p className="text-sm landing-text-secondary leading-relaxed mb-5 italic">
        "{text}"
      </p>

      <div className="flex items-center gap-3 pt-4 border-t landing-border">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)` }}
        >
          {getInitials(name)}
        </div>
        <div>
          <div className="text-sm font-semibold landing-text-primary">{name}</div>
          <div className="text-xs landing-text-secondary">{role} at {company}</div>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [ref, isVisible] = useScrollReveal();

  const testimonials = useMemo(() => {
    const shuffled = [...allTestimonials].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  return (
    <section data-testid="testimonials-section" ref={ref} className="relative z-10 py-20 border-b landing-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 data-testid="testimonials-title" className="text-3xl font-bold landing-text-primary font-heading">
            Trusted by Engineering Teams
          </h2>
          <p className="text-sm landing-text-secondary mt-2 max-w-lg mx-auto">
            See what developers and teams are saying about ProbeStack
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.name} {...t} isVisible={isVisible} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
