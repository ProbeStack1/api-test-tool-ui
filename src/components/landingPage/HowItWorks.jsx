import { useScrollReveal } from '../hooks/useScrollReveal';
import { Plug, Settings, Play, BarChart2, ArrowRight } from 'lucide-react';

const steps = [
  { icon: Plug, num: '01', title: 'Connect', desc: 'Import your API collections or connect endpoints directly. Supports OpenAPI, Swagger, Postman, and more.' },
  { icon: Settings, num: '02', title: 'Configure', desc: 'Define test scenarios, assertions, environment variables, and authentication flows with an intuitive builder.' },
  { icon: Play, num: '03', title: 'Execute', desc: 'Run tests in parallel across environments. Schedule recurring runs or trigger via CI/CD pipelines.' },
  { icon: BarChart2, num: '04', title: 'Analyze', desc: 'Get detailed reports with response diffs, performance trends, and actionable recommendations.' },
];

function StepCard({ icon: Icon, num, title, desc, isVisible, index }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Connector line (not for last) */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px">
          <div
            className={`h-full bg-gradient-to-r from-[#ff5b1f]/40 to-[#ff5b1f]/10 transition-all duration-1000 ${isVisible ? 'w-full' : 'w-0'}`}
            style={{ transitionDelay: `${index * 0.3 + 0.5}s` }}
          />
        </div>
      )}

      <div
        className={`flex flex-col items-center text-center transition-all duration-700 ${isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
        style={{ animationDelay: `${index * 0.15}s` }}
      >
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff5b1f]/20 to-[#ff5b1f]/5 border border-[#ff5b1f]/20 flex items-center justify-center text-[#ff5b1f] group transition-all hover:scale-105 hover:border-[#ff5b1f]/50 duration-300">
            <Icon className="w-8 h-8" />
          </div>
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#ff5b1f] text-white text-xs font-bold flex items-center justify-center font-mono shadow-lg shadow-[#ff5b1f]/30">
            {num}
          </div>
        </div>

        <h3 className="text-lg font-semibold landing-text-primary mb-2 font-heading">{title}</h3>
        <p className="text-sm landing-text-secondary leading-relaxed max-w-[240px]">{desc}</p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section data-testid="how-it-works-section" ref={ref} className="relative z-10 py-20 border-b landing-border">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className={`text-center mb-14 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ff5b1f]/10 rounded-full text-xs font-medium text-[#ff5b1f] border border-[#ff5b1f]/20 mb-4">
            <ArrowRight className="w-3 h-3" />
            Simple Workflow
          </div>
          <h2 data-testid="how-it-works-title" className="text-3xl font-bold landing-text-primary font-heading">
            How It Works
          </h2>
          <p className="text-sm landing-text-secondary mt-2 max-w-lg mx-auto">
            From connection to insights in four streamlined steps
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
          {steps.map((step, i) => (
            <StepCard key={step.title} {...step} isVisible={isVisible} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
