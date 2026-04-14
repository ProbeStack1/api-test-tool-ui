import { Rocket } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function CTASection() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section data-testid="cta-section" ref={ref} className="relative z-10 py-24 overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-40" />
      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-[#ff5b1f]/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-48 h-48 bg-[#1fbf9a]/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <div className={`${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 className="text-3xl md:text-4xl font-bold landing-text-primary font-display mb-4 leading-tight">
            Ready to Ship <span className="gradient-text">Reliable APIs</span>?
          </h2>
          <p className="text-lg landing-text-secondary mb-10 max-w-xl mx-auto">
            Join thousands of engineering teams who trust ProbeStack for their API testing workflows.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              data-testid="cta-get-started-btn"
              className="inline-flex items-center gap-2 h-12 px-8 text-base font-semibold rounded-md bg-primary text-white shadow-lg btn-glow transition-all duration-300 hover:scale-105"
            >
              <Rocket className="w-5 h-5" />
              Get Started Free
            </button>
            <button
              data-testid="cta-docs-btn"
              className="inline-flex items-center gap-2 h-12 px-8 text-base font-medium rounded-md landing-card-bg border landing-border text-[#ff5b1f] hover:border-[#ff5b1f]/40 transition-all duration-300 hover:scale-105"
            >
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
