/**
 * PricingPage — `/pricing` route per LANDING_PAGE_SPEC.md §"Pricing page".
 * Three tiers: Starter · Enterprise (Most Popular) · Enterprise‑Plus.
 * Reuses landing chrome — no new colours.
 */
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/sections/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

type Tier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  bestFor: string;
  cta: string;
  highlight?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    cadence: 'month/user',
    bestFor: 'Basic testing capabilities.',
    cta: 'Get Started',
    features: [
      'Standard API testing',
      'API requests (REST, GraphQL)',
      'Collections Testing',
      'Environment variables',
      'Basic testing scripts',
      'Limited collaboration',
      'Offline-first API testing',
      'Monitoring',
      'Email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$30',
    cadence: 'month/user',
    bestFor: 'Comprehensive API & MCP testing.',
    cta: 'Get Started',
    highlight: true,
    features: [
      'API, MCP & Collections Testing',
      'Web Application Testing',
      'Projects & Team Management',
      'Mock servers',
      'Git sync',
      'CI/CD integration',
      'Monitoring + automation',
      'Email support',
    ],
  },
  {
    id: 'enterprise-plus',
    name: 'Enterprise‑Plus',
    price: 'Contact Sales',
    cadence: '',
    bestFor: 'Advanced API, UI, MCP & AI testing.',
    cta: 'Contact Sales',
    features: [
      'Includes Enterprise',
      'SSO & Role-based access',
      'Enterprise sync',
      'Audit logs',
      'Unlimited runs',
      'Load / Performance Testing',
      'Monitoring + analytics',
      'API stress testing',
      'API governance',
      'API Security Testing',
      'AI debugging + auto‑fix',
      'Integrated all AI models',
      'AI generate Testcase',
      'AI updates tests automatically',
      'Test data generation',
      'Zero manual test writing',
      'Simulate failures',
      'Latency injection',
      'LLM Model Testing (Coming Soon)',
      'Agentic AI Testing (Coming Soon)',
      'Record & replay testing (Coming Soon)',
      '24/7 support',
      'Contact: info@probestack.io',
    ],
  },
];

export const PricingPage = () => {
  const navigate = useNavigate();

  const onCta = (tier: Tier) => {
    if (tier.id === 'starter' || tier.id === 'enterprise') {
      navigate('/projects/collections');
    } else {
      window.location.href = 'https://probestack.io/login';
    }
  };

  return (
    <div
      data-testid="pricing-page"
      className="landing-bg noise-overlay relative min-h-screen overflow-y-auto"
    >


      <LandingNavbar />

      <main className="relative z-10 pt-20 pb-24 w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <header className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text sm font-medium mb-4 border border-primary/20">
            <Sparkles className="w-3 h-3" /> Pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text font-display mb-4">
            Free forever for solo devs. Scales to regulated industries.
          </h1>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed">
            Every tier includes the full 8-pillar surface — Pro & Team unlock
            limits, integrations and team workflows. Enterprise adds compliance & deployment options.
          </p>
        </header>

        {/* Three‑column tier cards */}
        <div
          data-testid="pricing-tiers"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-[1600px] mx-auto"
        >
          {TIERS.map((t) => (
            <div
              key={t.id}
              data-testid={`tier-${t.id}`}
              className={`relative rounded-2xl border p-6 flex flex-col bg-surface/40 backdrop-blur-sm transition-all ${
                t.highlight
                  ? 'border-primary/60 shadow-[0_0_40px_-12px_rgba(255,91,31,0.35)]'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary text-white text sm font-semibold tracking-wide">
                  Most Popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-text-primary">{t.name}</h2>
              <div className="mt-1 mb-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-text-primary">{t.price}</span>
                {t.cadence && <span className="text-sm text-text-muted">/ {t.cadence}</span>}
              </div>
              <p className="text sm text-text-secondary mb-5 min-h-[2.2em]">{t.bestFor}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start text sm text-text-secondary">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onCta(t)}
                data-testid={`tier-${t.id}-cta`}
                className={`inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-md text-sm font-semibold transition-opacity ${
                  t.highlight
                    ? 'bg-primary text-white hover:opacity-90'
                    : 'border border-border bg-surface/60 text-text-primary hover:border-primary/50 hover:text-primary'
                }`}
              >
                {t.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* FAQ-ish strip — unchanged */}
        <div className="mt-16 grid gap-4 md:grid-cols-3 text-sm text-text-secondary">
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <h3 className="text-text-primary font-semibold mb-1.5">Do I need a credit card?</h3>
            <p className="text sm">
              No. Free tier is open to anyone. Pro trial is 14 days, no card asked.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <h3 className="text-text-primary font-semibold mb-1.5">What counts as "a dev"?</h3>
            <p className="text sm">
              Anyone with write access to a workspace. Viewers (PMs, designers, support) are free on every tier.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <h3 className="text-text-primary font-semibold mb-1.5">Can I switch tiers later?</h3>
            <p className="text sm">
              Yes — prorated, monthly. Annual billing gets two months free.
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};