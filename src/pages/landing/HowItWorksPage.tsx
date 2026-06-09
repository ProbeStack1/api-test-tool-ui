import React from 'react';
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/sections/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  UploadCloud,
  FileCode,
  Shield,
  ArrowRight,
  Sparkles,
  FolderKanban,
  PlayCircle,
  Activity,
  Server,
  Layers,
  Bug,
  Bell,
  Fingerprint,
  ShoppingBag,
  Cpu,
  BrainCircuit,
  CheckCircle2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const steps = [
  {
    num: '01',
    icon: FolderKanban,
    title: 'Initialize Collaborative Projects',
    desc: 'Set up project namespaces, invite teammates, and assign role-based credentials. Seamlessly transfer ownership rules.',
    tags: ['Workspaces', 'RBAC', 'Invites'],
  },
  {
    num: '02',
    icon: UploadCloud,
    title: 'Import Endpoint Specs & Collections',
    desc: 'Drop Postman JSON, Insomnia configs, HAR logs, or Swagger schemas to auto-populate request suites.',
    tags: ['Postman', 'OpenAPI', 'HAR'],
  },
  {
    num: '03',
    icon: FileCode,
    title: 'Configure Scopes & Variables',
    desc: 'Resolve 5-level scope precedence (Local → Global) to dynamically inject secure bearer auth keys.',
    tags: ['Env vars', 'Secrets', 'Scopes'],
  },
  {
    num: '04',
    icon: PlayCircle,
    title: 'Execute & Automate Runners',
    desc: 'Trigger single requests, full collection chains, load tests, or spin up mock sandbox servers.',
    tags: ['Runners', 'Load', 'Mocks'],
  },
];

const pillars = [
  {
    title: 'Projects & Collections',
    desc: 'Create secure project environments, manage collection directories, and add team members with granular access controls.',
    icon: FolderKanban,
    details: 'Group requests, sync environments, and keep API specs versioned in one project dashboard.',
    bullets: ['Granular RBAC', 'Versioned specs', 'Shared envs'],
  },
  {
    title: 'Environments & Scopes',
    desc: 'Resolve variables based on strict 5-level precedence: Local, Environment, Collection, Project, and Global.',
    icon: Layers,
    details: 'Switch staging and local endpoints without repeating environment values.',
    bullets: ['5-level scope', 'Encrypted secrets', 'Hot-swap envs'],
  },
  {
    title: 'Hosted Mock Server',
    desc: 'Mock Swagger/OpenAPI responses instantly. Configure latency overrides, proxy fallbacks, and whitelist clients.',
    icon: Server,
    details: 'Frontend teams can build against active mocks before the backend logic is complete.',
    bullets: ['Latency sim', 'Proxy fallback', 'IP whitelist'],
  },
  {
    title: 'Spec Library & Assertions',
    desc: 'Generate contract verification suites and positive/negative test assertions straight from spec parameters.',
    icon: FileCode,
    details: 'Verify schemas, status thresholds, headers, and request bodies automatically.',
    bullets: ['Schema diff', 'Header checks', 'Body assertions'],
  },
  {
    title: 'Functional & Load Testing',
    desc: 'Run sequential integration workflows or scale traffic up to 1,000+ virtual users globally.',
    icon: Activity,
    details: 'Detailed response timing logs, RPS metrics, and p95/p99 error triggers.',
    bullets: ['1k+ VUs', 'p95 / p99', 'Geo regions'],
  },
  {
    title: 'OWASP Security Scans',
    desc: 'Attack endpoints with injection mutators to expose CORS gaps, SQLi, and BOLA authorisation lapses.',
    icon: Shield,
    details: 'Keep API security compliant with OWASP standards on every commit.',
    bullets: ['Top 10 OWASP', 'Fuzz mutators', 'CI gated'],
  },
  {
    title: 'Integrated Bug Tracker',
    desc: 'File issue tickets on failed test runs in Jira, GitLab, or GitHub Issues directly from incident logs.',
    icon: Bug,
    details: 'Bridge ops and developers to track bug resolutions instantly.',
    bullets: ['Jira', 'GitHub', 'GitLab'],
  },
  {
    title: 'Heartbeats & Monitors',
    desc: 'Deploy scheduled multi-region probes checking API status, latency rates, and uptime boundaries globally.',
    icon: Bell,
    details: 'Notifications in Slack or MS Teams when an incident triggers SRE pages.',
    bullets: ['Multi-region', 'SLO alerts', 'Slack / Teams'],
  },
  {
    title: 'Webhook Integrations',
    desc: 'Dispatch payload logs and build summaries dynamically to alert streams, SRE routers, or custom endpoints.',
    icon: Activity,
    details: 'Integrate test runs into custom server hooks and external networks.',
    bullets: ['HMAC signed', 'Retry policy', 'Custom routes'],
  },
  {
    title: 'Compliance Audit Trail',
    desc: 'Log workspace activities automatically with severity tagging to verify compliance records.',
    icon: Fingerprint,
    details: 'Track settings changes, member invites, and critical runner executions.',
    bullets: ['SOC2 ready', 'Immutable log', 'Severity tags'],
  },
  {
    title: 'API & Agent Marketplace',
    desc: 'Browse, trial, and import public APIs, LLMs, and agentic workflows from the unified marketplace hub.',
    icon: ShoppingBag,
    details: 'Trial MCP servers, search public collections, and load pre-configured testing agents.',
    bullets: ['MCP servers', 'Public APIs', 'Agent presets'],
  },
  {
    title: 'Model Context Protocol Studio',
    desc: 'Bridge MCP connections, test mock structures, and query tools or resource prompts dynamically.',
    icon: Cpu,
    details: 'Develop, inspect, and verify MCP tools inside a responsive terminal console.',
    bullets: ['Tool inspector', 'Mock MCP', 'Live REPL'],
  },
  {
    title: 'Dedicated AI Assistants',
    desc: 'Autopilot API debugging. AI assistants analyze runner failures and auto-fix schemas.',
    icon: BrainCircuit,
    details: 'Immediate remediation guidance and payload adjustments when assertion chains fail.',
    bullets: ['Auto-fix', 'Chat copilot', 'Schema repair'],
  },
];

/* ------------------------------------------------------------------ */
/*  Motion presets                                                     */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ------------------------------------------------------------------ */
/*  Visual mock for pillar cards                                       */
/* ------------------------------------------------------------------ */

const PillarVisual: React.FC<{ icon: React.ElementType; title: string; index: number }> = ({
  icon: Icon,
  title,
  index,
}) => {
  return (
    <div className="relative w-full aspect-[6/3] rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-background via-background to-primary/5 group">
      {/* grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '31px 31px',
          color: 'hsl(var(--border))',
        }}
      />
      {/* glow */}
      <motion.div
        aria-hidden
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/25 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* floating window */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="absolute inset-4 rounded-lg bg-card/80 backdrop-blur-md border border-border shadow-2xl overflow-hidden"
      >
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-3 h-8 border-b border-border bg-muted/40">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          <span className="ml-3 text-[10px] text-muted-foreground font-mono truncate">
            forgefuzz / {title.toLowerCase().replace(/\s+/g, '-')}
          </span>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="h-2 w-24 rounded bg-foreground/20" />
              <div className="mt-1.5 h-1.5 w-16 rounded bg-foreground/10" />
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 border border-green-500/30">
              200 OK
            </span>
          </div>

          {/* animated bars */}
          <div className="space-y-1.5">
            {[78, 54, 88, 36, 66].map((w, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                whileInView={{ width: `${w}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                className="h-1.5 rounded-full bg-gradient-to-r from-primary/80 to-primary/20"
              />
            ))}
          </div>

          {/* pulse dots */}
          <div className="mt-1 flex items-center gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <span className="ml-auto text-[9px] font-mono text-muted-foreground">
              node #{(index + 1).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* corner badge */}
      <div className="absolute bottom-6.5 left-6.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        preview
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start center', 'end center'],
  });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="min-h-screen bg-background text-text-primary overflow-x-hidden">
      <LandingNavbar />

      <main className="relative">
        {/* ambient bg */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        {/* ---------------- HERO ---------------- */}
        <section className="relative pt-32 pb-20 px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 backdrop-blur text-[11px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              <Sparkles className="w-3 h-3 text-primary" />
              Platform Sequence
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            >
              How{' '}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                ForgeFuzz
              </span>{' '}
              Works
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              An overview of the collaborative developer workflow — configure projects, resolve
              variables, run OWASP security scanners, and generate peak SLAs.
            </motion.p>
          </motion.div>
        </section>

        {/* ---------------- STEPS TIMELINE ---------------- */}
        <section ref={timelineRef} className="relative px-6 py-10">
          <div className="max-w-5xl mx-auto relative">
            {/* center line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
            <motion.div
              style={{ height: lineHeight }}
              className="absolute left-8 md:left-1/2 top-0 w-px bg-gradient-to-b from-primary via-primary to-primary/0 md:-translate-x-px"
            />

            <div className="space-y-16">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isEven = idx % 2 === 0;

                return (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="relative md:grid md:grid-cols-2 md:gap-12 items-center"
                  >
                    {/* node */}
                    <div className="absolute left-8 md:left-1/2 top-6 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 z-10">
                      <motion.div
                        whileInView={{ scale: [0.6, 1.15, 1] }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative w-14 h-14 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-[0_0_30px_-5px_hsl(var(--primary))]"
                      >
                        <Icon className="w-7 h-7 text-primary" />
                        <motion.span
                          className="absolute inset-0 rounded-full border-2 border-primary"
                          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                      </motion.div>
                    </div>

                    {/* card */}
                    <div
                      className={`pl-24 md:pl-0 ${
                        isEven ? 'md:pr-16 md:text-right' : 'md:col-start-2 md:pl-16'
                      }`}
                    >
                      <div className="inline-block text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
                        STEP {step.num}
                      </div>
                      <h3 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-muted-foreground leading-relaxed">{step.desc}</p>
                      <div
                        className={`mt-4 flex flex-wrap gap-2 ${
                          isEven ? 'md:justify-end' : ''
                        }`}
                      >
                        {step.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 rounded-md border border-border bg-card/60 text-[11px] font-mono text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- PILLARS ---------------- */}
        <section className="relative px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl mx-auto text-center mb-20"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-[11px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              <Layers className="w-3 h-3 text-primary" />
              Capability Map
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-5 text-4xl md:text-5xl font-bold tracking-tight"
            >
              Explore Each Platform Pillar
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-muted-foreground leading-relaxed">
              Inspect the foundational features that drive security scans, developer workflows,
              and compliance assertions across the ForgeFuzz suite.
            </motion.p>
          </motion.div>

          <div className="max-w-8xl mx-auto px-28 space-y-28">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              const isEven = idx % 2 === 0;

              return (
                <motion.div
                  key={p.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-80px' }}
                  variants={stagger}
                  className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center"
                >
                  {/* VISUAL */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, x: isEven ? -60 : 60 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { duration: 0.7, ease: 'easeOut' },
                      },
                    }}
                    className={isEven ? 'md:order-1' : 'md:order-2'}
                  >
                    <PillarVisual icon={Icon} title={p.title} index={idx} />
                  </motion.div>

                  {/* CONTENT */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, x: isEven ? 60 : -60 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { duration: 0.7, ease: 'easeOut', delay: 0.1 },
                      },
                    }}
                    className={isEven ? 'md:order-2' : 'md:order-1'}
                  >
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-3">
                      Pillar {String(idx + 1).padStart(2, '0')} / {pillars.length}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        {p.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-base leading-relaxed">{p.desc}</p>
                    <p className="mt-3 text-sm text-muted-foreground/80 italic">{p.details}</p>

                    <ul className="mt-5 space-y-2">
                      {p.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-center gap-2 text-sm text-text-primary/90"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => navigate('/capabilities')}
                      className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2.5 transition-all"
                    >
                      Learn more <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="relative px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-6xl mx-auto relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-12 md:p-16 text-center"
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <motion.div
              aria-hidden
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Ready to configure your project?
              </h2>
              <p className="mt-5 text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Supply your spec schemas, define environments, run the mutations fuzzer, and
                connect alerting channels in one setup.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => navigate('/capabilities')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition shadow-[0_0_30px_-5px_hsl(var(--primary))]"
                >
                  Interactive Demo <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/projects/collections')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-background/50 text-sm font-semibold hover:border-primary/60 hover:text-primary transition"
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default HowItWorksPage;
