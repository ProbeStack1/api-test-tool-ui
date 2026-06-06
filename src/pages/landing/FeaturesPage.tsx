import React, { useRef, useState } from 'react';
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/sections/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Layers, Server, FileCode2, Activity, ShieldAlert,
  Bug, Bell, Webhook, ScrollText, ShoppingBag, Workflow, BrainCircuit,
  Users2, Code2, Cpu, Fingerprint, Bot, GitBranch, Terminal,
  ArrowRight, Sparkles, Check, X, ChevronRight, Zap, Network,
  KeyRound, FileJson, Globe2, Lock, PlayCircle, BarChart3,
  CheckCheck,
} from 'lucide-react';
import { GiCheckMark } from "react-icons/gi";

/* ============================================================== *
 *  AMBIENT BACKDROP — grid + glowing primary orbs                *
 * ============================================================== */
const Backdrop: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0 opacity-[0.05]"
      style={{
        backgroundImage:
          'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }}
    />
    <motion.div
      className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full blur-3xl"
      style={{ background: 'color-mix(in oklab, var(--primary) 22%, transparent)' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full blur-3xl"
      style={{ background: 'color-mix(in oklab, var(--primary) 18%, transparent)' }}
      animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

/* ============================================================== *
 *  SECTION HEADER                                                *
 * ============================================================== */
const SectionHeader: React.FC<{
  chip: string;
  title: React.ReactNode;
  desc: string;
}> = ({ chip, title, desc }) => (
  <div className="text-center max-w-3xl mx-auto mb-14">
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold tracking-wider uppercase mb-5"
    >
      <Sparkles className="w-3.5 h-3.5" />
      {chip}
    </motion.div>
    <motion.h2
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.05 }}
      className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
    >
      {title}
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mt-5 text-text-secondary leading-relaxed"
    >
      {desc}
    </motion.p>
  </div>
);

/* ============================================================== *
 *  PILLAR DATA — 13 platform pillars                             *
 * ============================================================== */
type Pillar = {
  id: string;
  num: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  desc: string;
  bullets: string[];
};

const PILLARS: Pillar[] = [
  {
    id: 'projects',
    num: '01',
    icon: FolderKanban,
    title: 'Projects & Collections',
    tagline: 'Collaborative workspaces',
    desc: 'Group specs, environments, mocks, monitors and tests under one Project. Invite members with role-based access (Owner, Editor, Runner, Viewer).',
    bullets: ['Member roles & access control', 'Nested collections & folders', 'Per-project audit log'],
  },
  {
    id: 'env',
    num: '02',
    icon: Layers,
    title: 'Environments & Variables',
    tagline: '5-level scope resolution',
    desc: 'Strict precedence — Local → Env → Collection → Project → Global. Encrypted secrets, dynamic variables, and per-request overrides resolved on the fly.',
    bullets: ['Encrypted secret storage', 'Dynamic + computed vars', 'Live scope inspector'],
  },
  {
    id: 'mock',
    num: '03',
    icon: Server,
    title: 'Mock Server',
    tagline: 'Chaos-ready sandboxes',
    desc: 'Spin up hosted mocks with custom rules. Inject latency, error rates, fallback to a real upstream, and run contract diffs before promoting a release.',
    bullets: [
      'Latency spikes & error injection',
      'Proxy fallback to real upstream',
      'Contract diff vs production',
      'Private mocks + email allow-list',
      'CORS, rate-limit, record mode',
    ],
  },
  {
    id: 'specs',
    num: '04',
    icon: FileCode2,
    title: 'Spec Library & Test Cases',
    tagline: 'Any format, any source',
    desc: 'Import OpenAPI, Swagger, Postman, Insomnia, HAR dumps, or raw cURL. Auto-seed endpoints, auto-generate test cases from YAML, JSON or a spec URL.',
    bullets: ['Postman / Insomnia / HAR', 'OpenAPI 2 & 3, GraphQL SDL', 'Auto-generated assertions'],
  },
  {
    id: 'tests',
    num: '05',
    icon: Activity,
    title: 'Functional & Load Testing',
    tagline: 'SLA-grade performance',
    desc: 'Run functional suites or scale to 1,000+ virtual users from global runner nodes. Live latency, throughput, P95/P99 and error-rate graphs.',
    bullets: ['Up to 1,000+ concurrent VUs', 'Global multi-region runners', 'P50/P95/P99 + RPS metrics'],
  },
  {
    id: 'security',
    num: '06',
    icon: ShieldAlert,
    title: 'Security Testing (OWASP)',
    tagline: 'Mutator-driven fuzzing',
    desc: 'Simulated attacks for the OWASP API Top 10 — CORS misconfig, SQLi, BOLA/IDOR, broken auth and mass-assignment. Severity-ranked incident logs.',
    bullets: ['CORS, SQLi, BOLA, IDOR', 'Parameter mutation engine', 'Severity-ranked reports'],
  },
  {
    id: 'bugs',
    num: '07',
    icon: Bug,
    title: 'Integrated Bug Tracker',
    tagline: 'From failure → ticket',
    desc: 'Convert failed assertions and mutator incidents into Jira, GitHub or GitLab issues in a single click — with payload, headers and replay link attached.',
    bullets: ['One-click Jira / GitHub / GitLab', 'Attach payload + replay link', 'Auto-dedupe & status sync'],
  },
  {
    id: 'monitor',
    num: '08',
    icon: Bell,
    title: 'Monitors & Heartbeats',
    tagline: 'Always-on uptime',
    desc: 'Schedule global heartbeat probes, latency monitors and daily digests. Track SLOs, error budgets and regression trends across releases.',
    bullets: ['Global heartbeat probes', 'Daily / weekly digests', 'SLO + error-budget tracking'],
  },
  {
    id: 'webhooks',
    num: '09',
    icon: Webhook,
    title: 'Webhooks & Integrations',
    tagline: 'Wired into your stack',
    desc: 'Pipe events to Slack, Teams, PagerDuty, custom HTTPS endpoints or your CI/CD pipeline. Native GitHub Actions and GitLab CI emit JUnit reports.',
    bullets: ['Slack, Teams, PagerDuty', 'GitHub Actions + GitLab CI', 'Custom signed webhooks'],
  },
  {
    id: 'audit',
    num: '10',
    icon: ScrollText,
    title: 'Audit Trail',
    tagline: 'Forensic-grade history',
    desc: 'Every action a user takes inside a project is tracked with severity, actor, IP and diff. Filter by user, resource, severity or time range.',
    bullets: ['Per-resource diff history', 'Severity-tagged events', 'Compliance-ready export'],
  },
  {
    id: 'market',
    num: '11',
    icon: ShoppingBag,
    title: 'Marketplace',
    tagline: 'Public APIs, agents & LLMs',
    desc: 'Browse, fork and run public API collections, certified testing agents and curated LLM prompts. Publish your own templates to the community.',
    bullets: ['Public API collections', 'Certified testing agents', 'Curated LLM prompts'],
  },
  {
    id: 'mcp',
    num: '12',
    icon: Workflow,
    title: 'MCP Studio',
    tagline: 'Model Context Protocol',
    desc: 'Inspect MCP servers, mock MCP endpoints and bridge MCP tools back to REST. Interactive terminal, tool browser and live request inspector.',
    bullets: ['MCP inspector + collection', 'MCP → REST bridge', 'Mock MCP server'],
  },
  {
    id: 'ai',
    num: '13',
    icon: BrainCircuit,
    title: 'Dedicated AI Assistants',
    tagline: 'BYOK agentic testing',
    desc: 'Bring your own OpenAI / Claude key. Run agents in Single, Sequential, Parallel or Supervisor mode. Error-aware chatbot pops out on any failure with a fix.',
    bullets: [
      'BYOK — OpenAI, Claude, custom',
      'Single, Sequential, Parallel, Supervisor',
      'Error chatbot with auto-fix',
      'Agentic test writer (30+ assertions)',
    ],
  },
];

/* ============================================================== *
 *  PILLAR VISUAL — small animated mock per pillar                *
 * ============================================================== */
const PillarVisual: React.FC<{ pillar: Pillar; active: boolean }> = ({ pillar, active }) => {
  const Icon = pillar.icon;
  return (
    <div className="relative w-full rounded-2xl border border-border/50 bg-surface/40 shadow-xl backdrop-blur-xl overflow-hidden">
      {/* chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-600" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
        <span className="ml-3 text-[11px] font-mono text-muted-foreground truncate">
          forgefuzz · {pillar.id}
        </span>
        <span className="ml-auto text-[10px] font-mono text-primary/80">
          PILLAR {pillar.num}
        </span>
      </div>

      {/* body */}
      <div className="relative p-6 min-h-[260px]">
        {/* glow */}
        <motion.div
          animate={active ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.3 }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl"
          style={{ background: 'color-mix(in oklab, var(--primary) 30%, transparent)' }}
        />

        {/* big icon */}
        <div className="relative flex items-start gap-4 mb-5">
          <motion.div
            animate={active ? { rotate: [0, 6, -6, 0] } : { rotate: 0 }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-xl border border-primary/40 bg-primary/10 text-primary flex items-center justify-center"
            style={{ boxShadow: '0 0 30px color-mix(in oklab, var(--primary) 30%, transparent)' }}
          >
            <Icon className="w-7 h-7" />
          </motion.div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary/80 font-semibold">
              {pillar.tagline}
            </div>
            <div className="text-lg font-bold mt-1">{pillar.title}</div>
          </div>
        </div>

        {/* animated bars */}
        <div className="space-y-2.5">
          {pillar.bullets.slice(0, 4).map((b, i) => (
            <div key={b} className="flex items-center gap-3">
              <GiCheckMark  className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 text-xs text-muted-foreground">{b}</div>
              <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: active ? `${70 + ((i * 7) % 30)}%` : '20%' }}
                  transition={{ duration: 1.2, delay: i * 0.15 }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            ACTIVE
          </span>
          <span>READY</span>
        </div>
      </div>
    </div>
  );
};

/* ============================================================== *
 *  PILLAR ROW — alternating left/right                           *
 * ============================================================== */
const PillarRow: React.FC<{ pillar: Pillar; index: number }> = ({ pillar, index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const reverse = index % 2 === 1;
  const Icon = pillar.icon;

  const text = (
    <motion.div
      initial={{ opacity: 0, x: reverse ? 40 : -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55 }}
      className="flex-1"
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors duration-500 ${
            inView
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border bg-card text-text-secondary/60'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-[11px] font-bold tracking-widest text-primary">
          PILLAR {pillar.num}
        </div>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
        {pillar.title}
      </h3>
      <div className="text-sm text-primary/80 font-medium mb-4">{pillar.tagline}</div>
      <p className="text-muted-foreground leading-relaxed mb-5">{pillar.desc}</p>
      <ul className="space-y-2">
        {pillar.bullets.map(b => (
          <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );

  const visual = (
    <motion.div
      initial={{ opacity: 0, x: reverse ? -40 : 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55 }}
      className="flex-1 w-full"
    >
      <PillarVisual pillar={pillar} active={inView} />
    </motion.div>
  );

  return (
    <div
      ref={ref}
      className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 lg:gap-16 items-center py-16`}
    >
      {text}
      {visual}
    </div>
  );
};

/* ============================================================== *
 *  AT-A-GLANCE FEATURE GRID                                      *
 * ============================================================== */
type Glance = { icon: React.ElementType; title: string; desc: string };

const GLANCE: Glance[] = [
  { icon: Users2, title: 'Projects & Members', desc: 'Granular roles, invites, and per-project audit trails.' },
  { icon: FileCode2, title: 'Multi-format Specs', desc: 'OpenAPI, Postman, Insomnia, HAR, cURL & GraphQL.' },
  { icon: Terminal, title: 'Request Builder', desc: 'Interactive builder + collection runner with assertions.' },
  { icon: Code2, title: 'Code Translator', desc: 'Convert any request into cURL, Python, Go, Rust or Node.' },
  { icon: Activity, title: 'Load / SLA Tests', desc: '1,000+ VUs from multi-region runner nodes.' },
  { icon: KeyRound, title: 'BYOK AI Testing', desc: 'Bring your own LLM key — test agents and chains.' },
  { icon: Globe2, title: 'Heartbeats & Monitors', desc: 'Global probes with latency, uptime and digests.' },
  { icon: Bug, title: 'Integrated Bug Tracker', desc: 'Jira, GitHub, GitLab — auto-attach payload & replay.' },
  { icon: Webhook, title: 'Webhooks & Slack', desc: 'Pipe events to Slack, Teams, PagerDuty or CI/CD.' },
  { icon: Server, title: 'Mock Sandboxes', desc: 'Chaos injection, proxy fallback, contract diff.' },
  { icon: Workflow, title: 'MCP Studio', desc: 'Inspect, mock and bridge MCP tools to REST.' },
  { icon: Bot, title: 'AI Error Chatbot', desc: 'Pop-out assistant that explains and fixes errors.' },
  { icon: ShoppingBag, title: 'Marketplace', desc: 'Public APIs, certified agents and LLM prompts.' },
  { icon: ScrollText, title: 'Audit Trail', desc: 'Severity-tagged log of every project action.' },
  { icon: Lock, title: 'Encrypted Secrets', desc: 'Per-scope encryption with rotation and access logs.' },
];

const GlanceCard: React.FC<{ item: Glance; index: number }> = ({ item, index }) => {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay: (index % 5) * 0.05 }}
      whileHover={{ y: -4 }}
      className="group relative p-5 rounded-xl shadow-xl bg-surface/50 backdrop-blur-xl hover:border-primary/40 transition-colors"
    >
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background:
            'radial-gradient(400px circle at var(--mx,50%) var(--my,50%), color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%)',
        }}
      />
      <div className="relative">
        <div
          className="w-10 h-10 rounded-lg border border-primary/30 bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
          style={{ boxShadow: '0 0 24px color-mix(in oklab, var(--primary) 20%, transparent)' }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="font-bold mb-1.5">{item.title}</h4>
        <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
      </div>
    </motion.div>
  );
};

/* ============================================================== *
 *  FLOW STRIP — 16-step ForgeFuzz workflow                       *
 * ============================================================== */
const FLOW_STEPS = [
  { icon: FileCode2, label: 'Import Spec' },
  { icon: Layers, label: 'Resolve Vars' },
  { icon: Terminal, label: 'Build Request' },
  { icon: PlayCircle, label: 'Run Tests' },
  { icon: ShieldAlert, label: 'OWASP Fuzz' },
  { icon: Activity, label: 'Load Test' },
  { icon: Server, label: 'Mock & Chaos' },
  { icon: Workflow, label: 'MCP Bridge' },
  { icon: BrainCircuit, label: 'AI Agents' },
  { icon: Bell, label: 'Monitors' },
  { icon: Webhook, label: 'Webhooks' },
  { icon: Bug, label: 'File Bug' },
  { icon: ScrollText, label: 'Audit Log' },
];

const FlowStrip: React.FC = () => (
  <div className="relative rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
    <div className="flex items-center gap-2 mb-5">
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <span className="text-[11px] font-mono uppercase tracking-widest text-primary">
        ForgeFuzz Flow · end-to-end
      </span>
    </div>
    <div className="relative flex flex-wrap gap-2">
      {FLOW_STEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <React.Fragment key={s.label}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/40 hover:border-primary/40 transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">{s.label}</span>
            </motion.div>
            {i < FLOW_STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 text-text-secondary/40 self-center" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

/* ============================================================== *
 *  PLAN COMPARISON MATRIX                                        *
 * ============================================================== */
const PLANS = ['Capability', 'Starter', 'Enterprise', 'Enterprise+'] as const;
const ROWS: { label: string; cells: (string | boolean)[] }[] = [
  { label: 'Projects & Members', cells: ['3 projects', 'Unlimited', 'Unlimited + SSO'] },
  { label: 'Spec Import (OpenAPI / Postman / HAR)', cells: [true, true, true] },
  { label: 'Mock Sandboxes', cells: ['5 mocks', 'Unlimited', 'Unlimited + private VPC'] },
  { label: 'OWASP Fuzz Mutator', cells: ['100 / day', 'Unlimited', 'AI-guided + scheduled'] },
  { label: 'Load Concurrency', cells: ['10 VUs', '500 VUs', '1,000+ VUs · multi-region'] },
  { label: 'Heartbeats & Monitors', cells: ['5 monitors', '100 monitors', 'Unlimited'] },
  { label: 'Webhooks · Slack / Teams / PagerDuty', cells: [true, true, true] },
  { label: 'Bug Tracker (Jira / GitHub / GitLab)', cells: [false, true, true] },
  { label: 'Git Integration', cells: ['Local sync', 'GitHub + GitLab', 'Bi-directional Enterprise'] },
  { label: 'MCP Studio (inspector + bridge)', cells: [false, true, true] },
  { label: 'BYOK AI Testing', cells: [false, 'Single agent', 'Single · Sequential · Parallel · Supervisor'] },
  { label: 'AI Error Chatbot', cells: [false, true, true] },
  { label: 'Marketplace Access', cells: ['Read-only', 'Read + fork', 'Read + fork + publish'] },
  { label: 'Audit Trail', cells: [false, '30 days', 'Unlimited · compliance export'] },
];

const Cell: React.FC<{ value: string | boolean; emphasize?: boolean }> = ({ value, emphasize }) => {
  if (typeof value === 'boolean') {
    return value ? (
      <Check
        className={`w-5 h-5 mx-auto ${emphasize ? 'text-primary' : 'text-text-secondary'}`}
      />
    ) : (
      <X className="w-5 h-5 mx-auto text-text-secondary/30" />
    );
  }
  return (
    <span className={`text-sm ${emphasize ? 'text-primary font-medium' : 'text-text-secondary'}`}>
      {value}
    </span>
  );
};

/* ============================================================== *
 *  PAGE                                                          *
 * ============================================================== */
export const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'core' | 'ai' | 'devops'>('all');

  const filteredPillars =
    filter === 'all'
      ? PILLARS
      : PILLARS.filter(p =>
          filter === 'core'
            ? ['projects', 'env', 'specs', 'tests', 'mock'].includes(p.id)
            : filter === 'ai'
              ? ['ai', 'mcp', 'market'].includes(p.id)
              : ['security', 'bugs', 'monitor', 'webhooks', 'audit'].includes(p.id),
        );

  return (
    <div className="relative min-h-screen bg-background text-text-primary overflow-hidden">
      <LandingNavbar />

      {/* ============== HERO ============== */}
      {/* <section className="relative pt-32 pb-6">
        <Backdrop />
        <div className="relative max-w-8xl mx-auto px-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold tracking-wider uppercase mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Platform Capabilities
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
          >
            Every layer of API quality. <span className="gradient-text">One platform.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mt-7 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
          >
            13 deeply-integrated pillars — from spec import and mock chaos to
            OWASP fuzzing, load tests, MCP studio and BYOK AI agents.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mt-9 flex flex-wrap gap-3 justify-center"
          >
            <button
              onClick={() => navigate('/projects/collections')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
              style={{ boxShadow: '0 10px 40px color-mix(in oklab, var(--primary) 40%, transparent)' }}
            >
              Launch Console
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card/40 backdrop-blur-xl text-sm font-semibold hover:border-primary/40 transition-colors"
            >
              See how it works
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-16 max-w-8xl mx-auto"
          >
            <FlowStrip />
          </motion.div>
        </div>
      </section> */}

      {/* ============== AT-A-GLANCE FEATURES ============== */}
      <section className="relative pt-36">
        <Backdrop />
        <div className="relative max-w-8xl mx-auto px-20">
          <div className="relative max-w-8xl mx-auto px-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold tracking-wider uppercase mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Platform Capabilities
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
          >
            Every layer of API quality. <span className="gradient-text">One platform.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mt-7 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
          >
            13 deeply-integrated pillars — from spec import and mock chaos to
            OWASP fuzzing, load tests, MCP studio and BYOK AI agents.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mt-9 flex flex-wrap gap-3 justify-center"
          >
            <button
              onClick={() => navigate('/projects/collections')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
              style={{ boxShadow: '0 10px 40px color-mix(in oklab, var(--primary) 40%, transparent)' }}
            >
              Launch Console
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card/40 backdrop-blur-xl text-sm font-semibold hover:border-primary/40 transition-colors"
            >
              See how it works
            </button>
          </motion.div>

          {/* flow strip */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-16 max-w-8xl mx-auto"
          >
            <FlowStrip />
          </motion.div> */}
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-12">
            {GLANCE.map((g, i) => (
              <GlanceCard key={g.title} item={g} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ============== 13 PILLARS ============== */}
      <section className="relative py-10">
        <Backdrop />
        <div className="relative max-w-8xl mx-auto px-40">
          <SectionHeader
            chip="13 Pillars"
            title={
              <>
                Explore each platform pillar
              </>
            }
            desc="Each pillar is built to stand alone — and engineered to compose with every other. Scroll through the system end-to-end."
          />

          {/* filter pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[
              { id: 'all', label: 'All pillars', count: PILLARS.length },
              { id: 'core', label: 'Core', count: 5 },
              { id: 'devops', label: 'DevOps & Ops', count: 5 },
              { id: 'ai', label: 'AI · MCP · Market', count: 3 },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-4 py-2 rounded-full border text-xs font-semibold transition-all ${
                  filter === f.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card/40 text-text-secondary hover:border-primary/30'
                }`}
              >
                {f.label}
                <span className="ml-2 opacity-60">{f.count}</span>
              </button>
            ))}
          </div>

          <div className="divide-y divide-border/60">
            <AnimatePresence mode="wait">
              {filteredPillars.map((p, i) => (
                <PillarRow key={p.id} pillar={p} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ============== PLAN MATRIX ============== */}
      <section className="relative py-10">
        <Backdrop />
        <div className="relative max-w-8xl mx-auto px-40">
          <SectionHeader
            chip="Plans"
            title={
              <>
                Pick the plan that <span className="text-primary">scales with you</span>
              </>
            }
            desc="Start free. Add seats, regions, BYOK agents and compliance trails as you grow."
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    {PLANS.map((p, i) => (
                      <th
                        key={p}
                        className={`p-4 text-xs uppercase tracking-widest ${
                          i === 0
                            ? 'text-text-secondary font-semibold'
                            : i === 3
                              ? 'text-primary font-bold'
                              : 'text-text-primary font-bold'
                        } ${i === 0 ? 'text-left' : 'text-center'}`}
                      >
                        {p}
                        {i === 3 && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[9px] bg-primary/15 text-primary border border-primary/30">
                            POPULAR
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, ri) => (
                    <tr
                      key={row.label}
                      className={`border-b border-border/60 hover:bg-primary/5 transition-colors ${
                        ri === ROWS.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="p-4 text-sm font-medium">{row.label}</td>
                      {row.cells.map((c, ci) => (
                        <td key={ci} className="p-4 text-center">
                          <Cell value={c} emphasize={ci === 2} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
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
        Bring every API surface under one roof.
      </h2>
      <p className="mt-5 text-muted-foreground max-w-xl mx-auto leading-relaxed">
        Free forever for small teams. No credit card. Import your first spec and run a full security + load pass in under five minutes.
      </p>
<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
  {/* First button - filled default, outlined on hover, text always white */}
  <button
    onClick={() => navigate('/solutions')}
    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-transparent hover:border hover:border-primary transition"
  >
    Interactive Demo <ArrowRight className="w-4 h-4" />
  </button>

  {/* Second button - outlined default, filled on hover, text always white */}
  <button
    onClick={() => navigate('/projects/collections')}
    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-primary bg-transparent text-white text-sm font-semibold hover:bg-primary hover:border-transparent transition"
  >
    Start Free Trial
  </button>
</div>
    </div>
  </motion.div>
</section>

      <LandingFooter />
    </div>
  );
};

export default FeaturesPage;
