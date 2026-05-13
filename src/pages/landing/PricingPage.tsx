/**
 * PricingPage — `/pricing` route per LANDING_PAGE_SPEC.md §"Pricing page".
 * Four tiers: Free · Pro · Team · Enterprise.
 * Reuses landing chrome — no new colours.
 */
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import ParticleBackground from '@/components/landing/sections/ParticleBackground';
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
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    bestFor: 'Solo devs · OSS · learning',
    cta: 'Start free',
    features: [
      '1 workspace',
      '100 requests / day',
      '1 monitor',
      'Mock server (community SLA)',
      '10 OWASP probes — manual',
      'Bug Tracker with markdown',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    cadence: 'per dev / mo',
    bestFor: 'Indie teams · early-stage startups',
    cta: 'Start Pro trial',
    highlight: true,
    features: [
      '5 workspaces',
      '10 monitors with multi-region',
      '100 RPS mock server',
      'Load tests up to 500 VUs',
      'Live SSE security scans',
      'GitHub + Slack + PagerDuty integrations',
      'AI Assistant (Gemini-powered)',
      'Email support · 24h response',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49',
    cadence: 'per dev / mo',
    bestFor: 'Growing companies · scale-ups',
    cta: 'Talk to sales',
    features: [
      'Unlimited workspaces',
      '100 monitors · multi-region',
      'Unlimited mock server RPS',
      'Load tests up to 5k VUs',
      'SSO (SAML, Google Workspace)',
      'Audit log export (CSV + SIEM)',
      'API Docs custom themes + versioning',
      'Priority chat · 4h response',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'contact us',
    bestFor: 'Regulated industries · banks · healthcare',
    cta: 'Book a demo',
    features: [
      'On-prem MongoDB or BYO Atlas',
      'Custom GCP / AWS regions',
      'SAML + SCIM + custom RBAC',
      'Dedicated CSM + onboarding eng',
      'Custom OWASP probe suites',
      '24×7 SLA · 1h critical response',
      'SOC2 Type II report + DPA',
      'Air-gap deploy option',
    ],
  },
];

export const PricingPage = () => {
  const navigate = useNavigate();

  const onCta = (tier: Tier) => {
    if (tier.id === 'free' || tier.id === 'pro') {
      navigate('/projects/collections');
    } else {
      window.location.href = 'mailto:sales@probestack.io?subject=ForgeQ%20' + encodeURIComponent(tier.name);
    }
  };

  return (
    <div
      data-testid="pricing-page"
      className="landing-bg noise-overlay relative min-h-screen overflow-y-auto"
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#ff5b1f]/20 blur-[120px]" />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#1fbf9a]/20 blur-[120px]"
          style={{ animationDelay: '2s', animationDuration: '8s' }}
        />
        <ParticleBackground />
      </div>

      <LandingNavbar />

      <main className="relative z-10 pt-20 pb-24 w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <header className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4 border border-primary/20">
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

        {/* Tier cards */}
        <div
          data-testid="pricing-tiers"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-[1600px] mx-auto"
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
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold tracking-wide">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-text-primary">{t.name}</h2>
              <div className="mt-1 mb-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-text-primary">{t.price}</span>
                <span className="text-xs text-text-muted">/ {t.cadence}</span>
              </div>
              <p className="text-[11px] text-text-secondary mb-5 min-h-[2.2em]">{t.bestFor}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start text-xs text-text-secondary">
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

        {/* FAQ-ish strip */}
        <div className="mt-16 grid gap-4 md:grid-cols-3 text-sm text-text-secondary">
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <h3 className="text-text-primary font-semibold mb-1.5">Do I need a credit card?</h3>
            <p className="text-xs">
              No. Free tier is open to anyone. Pro trial is 14 days, no card asked.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <h3 className="text-text-primary font-semibold mb-1.5">What counts as "a dev"?</h3>
            <p className="text-xs">
              Anyone with write access to a workspace. Viewers (PMs, designers, support) are free on every tier.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <h3 className="text-text-primary font-semibold mb-1.5">Can I switch tiers later?</h3>
            <p className="text-xs">
              Yes — prorated, monthly. Annual billing gets two months free.
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};
