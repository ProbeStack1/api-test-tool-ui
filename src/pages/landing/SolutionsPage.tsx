/**
 * SolutionsPage — `/solutions` route per LANDING_PAGE_SPEC.md §"Solutions page".
 * Per-persona view of which pillars matter most + the pain solved.
 *
 * Reuses the existing landing chrome (LandingNavbar, particle bg, footer)
 * so it inherits theme + bg automatically — no new colour introduced.
 */
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import ParticleBackground from '@/components/landing/sections/ParticleBackground';
import LandingFooter from '@/components/landing/sections/LandingFooter';
import { useNavigate } from 'react-router-dom';
import {
  TestTube, Code2, Server, ShieldAlert, FileText, ArrowRight,
} from 'lucide-react';

type Persona = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  pain: string;
  pillars: string[];
  detail: string;
};

const PERSONAS: Persona[] = [
  {
    id: 'qa',
    icon: TestTube,
    title: 'QA Engineers',
    pain: '"Write 200 test cases by lunchtime."',
    pillars: ['Functional Tests', 'Spec Auto-gen', 'Bug Tracker'],
    detail:
      'Auto-generate 30+ test cases from a single OpenAPI spec — positive, negative, boundary and schema. Run them as an assertion suite with step-level visibility, then file failing assertions directly to the built-in Bug Tracker with full repro trail.',
  },
  {
    id: 'dev',
    icon: Code2,
    title: 'Backend Developers',
    pain: '"Build against the API before the API exists."',
    pillars: ['Mock Server', 'Request Builder', 'Environments'],
    detail:
      'Spin up a hosted mock from your OpenAPI spec, get a public URL, point the frontend at it. Layer 5-level variables (Global → Local) so the same request graph works for laptop, staging and prod without touching code.',
  },
  {
    id: 'devops',
    icon: Server,
    title: 'DevOps / SRE',
    pain: '"Catch SLA regressions before customers do."',
    pillars: ['Monitors', 'Load Tests', 'PagerDuty Integration'],
    detail:
      'Cron-schedule probes against any Collection or Spec across us-east-1 / eu-west-1 / ap-south-1. Trigger on p95Ms breach into PagerDuty. Then run a Spike or Soak profile to reproduce the regression locally before paging anyone.',
  },
  {
    id: 'sec',
    icon: ShieldAlert,
    title: 'Security Teams',
    pain: '"OWASP coverage on every endpoint, every day."',
    pillars: ['Security Test', 'Audit Log', 'Escalation Rules'],
    detail:
      '10 built-in OWASP probes (auth, headers, IDOR, SQLi, XSS, CORS, TLS…) stream findings live via SSE. One-click "File Bug" pre-populates target URL + severity + repro. Severity-threshold escalation routes HIGH findings into Slack + email automatically.',
  },
  {
    id: 'pm',
    icon: FileText,
    title: 'API Product Managers',
    pain: '"Ship the contract publicly, version it cleanly."',
    pillars: ['API Docs', 'Changelog', 'Dashboard'],
    detail:
      'Generate public docs from any Collection or Spec at /docs/{slug} — four themes, custom intro markdown, multi-language code samples. Version the docs with diff view between releases. Track adoption from the Dashboard.',
  },
];

export const SolutionsPage = () => {
  const navigate = useNavigate();

  return (
    <div
      data-testid="solutions-page"
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
        {/* Page hero */}
        <header className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4 border border-primary/20">
            Solutions
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text font-display mb-4">
            One platform. Five teams. Zero hand-offs.
          </h1>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed">
            ForgeFuzz collapses what used to be Postman + k6 + Burp + Jira + Datadog into a single
            workspace — so QA, Devs, SRE, Security and PMs share the same artefact instead of
            re-typing it.
          </p>
        </header>

        {/* Persona cards */}
        <div className="space-y-4">
          {PERSONAS.map((p, i) => {
            const Icon = p.icon;
            return (
              <section
                key={p.id}
                id={p.id}
                data-testid={`persona-${p.id}`}
                className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm p-6 md:p-8 hover:border-primary/40 transition-colors"
              >
                <div className="grid md:grid-cols-[180px,1fr,180px] gap-6 md:gap-8 items-start">
                  {/* Left: icon + number */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="hidden md:block">
                      <div className="font-mono text-[10px] tracking-wider text-text-muted">
                        PERSONA · 0{i + 1}
                      </div>
                      <div className="font-mono text-[10px] tracking-wider text-text-muted mt-1">
                        /{p.id}
                      </div>
                    </div>
                  </div>

                  {/* Middle: content */}
                  <div>
                    <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-1">
                      {p.title}
                    </h2>
                    <p className="text-sm text-primary/90 italic mb-3 font-mono">{p.pain}</p>
                    <p className="text-sm text-text-secondary leading-relaxed mb-4">
                      {p.detail}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {p.pillars.map((pl) => (
                        <span
                          key={pl}
                          className="inline-flex items-center px-2.5 py-1 rounded-md border border-primary/20 bg-primary/5 text-[11px] text-primary font-medium"
                        >
                          {pl}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <div className="flex md:justify-end md:items-center">
                    <button
                      data-testid={`persona-${p.id}-cta`}
                      onClick={() => navigate('/projects/collections')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Try it free
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* Final mini-CTA */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl md:text-3xl font-semibold text-text-primary mb-3">
            Not sure which one is you?
          </h3>
          <p className="text-text-secondary mb-6">
            Most ForgeFuzz teams use every pillar in their first month. Start free, see what sticks.
          </p>
          <button
            data-testid="solutions-final-cta"
            onClick={() => navigate('/projects/collections')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90"
          >
            Start free → <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};
