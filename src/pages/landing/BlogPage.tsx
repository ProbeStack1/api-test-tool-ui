import React, { useState, useMemo } from 'react';
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/sections/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ArrowRight,
  Search,
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Share2,
  Sparkles,
  Tag as TagIcon,
} from 'lucide-react';

type Category = 'security' | 'testing' | 'ai' | 'devops';

type Post = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: Category;
  date: string;
  readTime: string;
  author: string;
  tags: string[];
  image: string;
};

const CATEGORY_META: Record<Category, { label: string; gradient: string }> = {
  security: { label: '', gradient: 'from-primary/30 via-primary/10 to-transparent' },
  testing: { label: '', gradient: 'from-primary/25 via-primary/5 to-transparent' },
  ai: { label: '', gradient: 'from-primary/35 via-primary/15 to-transparent' },
  devops: { label: '', gradient: 'from-primary/20 via-primary/5 to-transparent' },
};

// Inline SVG cover so no external assets are required
const makeCover = (label: string, seed: number) => {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 420'>
      <defs>
        <linearGradient id='g${seed}' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='hsl(${(seed * 47) % 360}, 70%, 12%)'/>
          <stop offset='100%' stop-color='hsl(${(seed * 83) % 360}, 60%, 22%)'/>
        </linearGradient>
        <pattern id='p${seed}' width='40' height='40' patternUnits='userSpaceOnUse'>
          <path d='M40 0H0V40' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/>
        </pattern>
      </defs>
      <rect width='800' height='420' fill='url(#g${seed})'/>
      <rect width='800' height='420' fill='url(#p${seed})'/>
      <circle cx='${100 + seed * 60}' cy='${120 + (seed % 3) * 40}' r='160' fill='rgba(255,255,255,0.05)'/>
      <circle cx='${600 - seed * 20}' cy='${320}' r='100' fill='rgba(255,255,255,0.04)'/>
      <text x='40' y='380' font-family='ui-sans-serif, system-ui' font-size='28' font-weight='700' fill='rgba(255,255,255,0.85)'>${label}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const RAW_POSTS: Omit<Post, 'image'>[] = [
  {
    id: 'ai-agents-securing',
    title: 'Securing AI Agents in Production: Mitigating prompt injections and token exploits',
    excerpt: 'AI agents are executing API requests dynamically. Learn how to secure database targets and audit API endpoints against prompt injection attacks.',
    content: `AI agents are no longer passive query engines — they dynamically generate and execute API requests using custom tools and Model Context Protocol (MCP) integrations. However, this flexibility introduces unique security vulnerabilities: prompt injections, unauthorized token exhaustion, and context exploits.\n\nIn this deep dive, we outline practical mitigation strategies:\n1. Zero-Trust Tool Binding: Treat LLM-driven actions as unauthenticated traffic. Implement strict schema validates and permission boundaries on every tool invocation.\n2. BYOK Token Rate-Limiting: Enforce strict caps on token usage per SRE run session.\n3. Guardrail Interceptors: Wrap agent execution pipelines in fuzzer-based guardrails that scan inputs for toxicity, prompt injections, and data leak vectors.`,
    category: 'ai',
    date: 'June 01, 2026',
    readTime: '6 min read',
    author: 'SRE Team Lead',
    tags: ['AI Agents', 'API Security', 'LLM'],
  },
  {
    id: 'openapi-contract-testing',
    title: 'The Shift-Left API Handbook: Harnessing OpenAPI and Swagger spec assertions',
    excerpt: 'Tired of broken client integrations? Let OpenAPI contract verifications validate payload schemas dynamically on every build.',
    content: `API specifications should serve as the single source of truth for developer integrations. Yet schema drift is a common issue in microservice environments.\n\n1. Dynamic Schema Validation: Assert that every response payload aligns exactly with Swagger/OpenAPI types in real time.\n2. Bi-directional Sync: Maintain tests as code in Git, so specification modifications automatically trigger assertions updates.\n3. Contract Diff Auditing: Automatically run differential analysis before promotion to catch breaking field modifications.`,
    category: 'testing',
    date: 'May 28, 2026',
    readTime: '4 min read',
    author: 'Principal Architect',
    tags: ['OpenAPI', 'Contract Testing', 'DevOps'],
  },
  {
    id: 'scaling-vus-sla',
    title: 'Scaling Load Runs to 10k VUs: Best practices for performance boundary checks',
    excerpt: 'Discover geographic load testing strategies, connection pool checks, and SLA assertions to verify high-concurrency API performance.',
    content: `Running stress tests on production microservices requires strict planning to isolate actual database latency from external network bottlenecks.\n\n1. Geographic Distribution: Distribute load generators across multiple regions to simulate real global performance profiles.\n2. SLA Threshold Guards: Fail pipelines immediately if p95 latency spikes over 250ms, or error rates exceed 0.5%.\n3. Queue & Thread Exhaustion Probing: Send spike traffic loads to pinpoint database connection limits.`,
    category: 'devops',
    date: 'May 15, 2026',
    readTime: '8 min read',
    author: 'Performance Engineer',
    tags: ['Load Testing', 'SLA', 'AWS'],
  },
  {
    id: 'owasp-api-fuzzing',
    title: 'Mastering OWASP API Top 10: Automatic vulnerability mutation rules',
    excerpt: 'An in-depth guide on mutation testing policies to prevent BOLA, IDOR, SQL injection, and rate limiting exploits across API structures.',
    content: `API endpoints are the primary targets for malicious actors. Normal signature scans are no longer sufficient; active fuzzing mutators are required.\n\n1. Parameter Mutation: Inject SQL injections, CORS origin overrides, and scripting vectors into all inputs.\n2. BOLA/IDOR Spoofing: Intercept API requests, swap user authorization keys, and verify if resource access boundaries are correctly enforced.\n3. Rate Limit Exhaustion: Probe endpoints under peak request concurrency levels.`,
    category: 'security',
    date: 'April 30, 2026',
    readTime: '10 min read',
    author: 'Security Researcher',
    tags: ['OWASP', 'Fuzzing', 'API Security'],
  },
  {
    id: 'mcp-bridges',
    title: 'Building MCP Bridges: Connecting LLMs to your API fuzzing pipeline',
    excerpt: 'The Model Context Protocol opens new doors for agentic testing. Here is how we wire MCP into ForgeFuzz mock and inspect flows.',
    content: `MCP provides a typed bridge between LLMs and external tools. We expose mock, inspect, and replay primitives so any agent can drive realistic test sessions.\n\n1. Tool Discovery: Publish a manifest the LLM can introspect.\n2. Scoped Execution: Bind every tool call to an isolated run namespace.\n3. Replayability: Persist tool I/O for deterministic regression diffs.`,
    category: 'ai',
    date: 'April 22, 2026',
    readTime: '7 min read',
    author: 'Platform Engineer',
    tags: ['MCP', 'LLM', 'Agents'],
  },
  {
    id: 'contract-drift',
    title: 'Detecting silent contract drift across 200 microservices',
    excerpt: 'How weekly differential snapshots of OpenAPI specs caught 14 breaking changes before they ever hit production.',
    content: `Contract drift is invisible until a consumer breaks. We snapshot every spec on merge and diff against the last stable baseline.\n\n1. Snapshot Pipeline: Cron-driven extraction from each service registry.\n2. Diff Heuristics: Classify changes as additive, breaking, or cosmetic.\n3. Auto-Notifications: Page the owning team on breaking diffs before deploy.`,
    category: 'testing',
    date: 'April 10, 2026',
    readTime: '5 min read',
    author: 'QA Lead',
    tags: ['Contracts', 'OpenAPI', 'CI'],
  },
  {
    id: 'k6-vs-locust',
    title: 'k6 vs Locust vs ForgeFuzz Load: A practical benchmark',
    excerpt: 'We ran the same 5k VU profile across three tools. Here is what the numbers actually say about throughput and accuracy.',
    content: `Load tooling has matured. We compared CPU footprint, scheduling jitter, and assertion expressiveness across three popular runners.\n\nResults summary, methodology, and reproducible scripts are linked at the bottom of the article.`,
    category: 'devops',
    date: 'March 30, 2026',
    readTime: '9 min read',
    author: 'Performance Engineer',
    tags: ['k6', 'Locust', 'Benchmark'],
  },
  {
    id: 'jwt-pitfalls',
    title: 'JWT pitfalls in 2026: Algorithm confusion is still a thing',
    excerpt: 'A walkthrough of three real-world JWT misconfigurations we caught with mutation fuzzing this quarter.',
    content: `JWT remains the default for stateless auth, but library defaults keep biting teams. We cover alg=none, key confusion, and audience mismatch attacks with concrete payloads.`,
    category: 'security',
    date: 'March 18, 2026',
    readTime: '6 min read',
    author: 'Security Researcher',
    tags: ['JWT', 'Auth', 'OWASP'],
  },
  {
    id: 'chaos-api',
    title: 'Chaos engineering for APIs: Injecting failure at the contract layer',
    excerpt: 'Latency, 5xx, and partial payload chaos modes — when to run them, and how to keep SLOs honest.',
    content: `Chaos at the contract layer reveals brittle clients before users do. We describe a tiered rollout of latency, error, and schema chaos with safe abort triggers.`,
    category: 'devops',
    date: 'March 05, 2026',
    readTime: '7 min read',
    author: 'SRE Team Lead',
    tags: ['Chaos', 'SLO', 'Reliability'],
  },
  {
    id: 'agent-evals',
    title: 'Evaluating agent quality with deterministic API harnesses',
    excerpt: 'Stop grading agents on vibes. Build a harness that scores tool-call correctness with traceable assertions.',
    content: `We share the harness layout we use internally: golden tool-call traces, schema assertions, and side-effect oracles.`,
    category: 'ai',
    date: 'February 24, 2026',
    readTime: '8 min read',
    author: 'Platform Engineer',
    tags: ['Evals', 'Agents', 'Testing'],
  },
  {
    id: 'graphql-fuzz',
    title: 'Fuzzing GraphQL: Introspection-driven mutators that actually find bugs',
    excerpt: 'Most GraphQL fuzzers spray random strings. Schema-aware mutators do far better — here is the recipe.',
    content: `Introspection gives us a typed map of every field. We walk it to generate value-aware mutations that target real resolver edges.`,
    category: 'security',
    date: 'February 12, 2026',
    readTime: '6 min read',
    author: 'Security Researcher',
    tags: ['GraphQL', 'Fuzzing', 'Schema'],
  },
  {
    id: 'flaky-contracts',
    title: 'Killing flaky contract tests with deterministic mocks',
    excerpt: 'A field guide for replacing record/replay brittleness with typed, deterministic mock servers.',
    content: `Flakes erode trust. We outline a migration from record/replay fixtures to typed mocks driven straight from the OpenAPI spec.`,
    category: 'testing',
    date: 'January 30, 2026',
    readTime: '5 min read',
    author: 'QA Lead',
    tags: ['Mocks', 'Contracts', 'CI'],
  },
];

const POSTS: Post[] = RAW_POSTS.map((p, i) => ({
  ...p,
  image: makeCover(CATEGORY_META[p.category].label, i + 1),
}));

const PAGE_SIZE = 6;

// ---------- Enhanced detail view helpers (from second code) ----------
const getCategoryDisplayName = (cat: Category): string => {
  switch (cat) {
    case 'security': return 'Security';
    case 'testing': return 'Testing';
    case 'ai': return 'AI';
    case 'devops': return 'DevOps';
    default: return '';
  }
};

const SparkleLines: React.FC = () => {
  const lines = [
    { x1: 0, y1: 30, x2: 220, y2: 130, delay: 0 },
    { x1: 0, y1: 70, x2: 260, y2: 80, delay: 0.25 },
    { x1: 0, y1: 110, x2: 200, y2: 200, delay: 0.5 },
  ];
  const stars = [
    { cx: 60, cy: 40, r: 1.6, delay: 0.4 },
    { cx: 140, cy: 90, r: 2.2, delay: 0.9 },
    { cx: 210, cy: 150, r: 1.4, delay: 1.3 },
    { cx: 30, cy: 120, r: 1.2, delay: 1.7 },
    { cx: 180, cy: 50, r: 1.8, delay: 2.1 },
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-10 -left-10 w-[320px] h-[260px] opacity-90"
    >
      <svg viewBox="0 0 300 240" className="w-full h-full">
        <defs>
          <linearGradient id="sparkLineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="sparkStarGrad">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {lines.map((l, i) => (
          <motion.line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="url(#sparkLineGrad)"
            strokeWidth="1.4"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 3.6,
              delay: l.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
        {stars.map((s, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
            transition={{
              duration: 2.4,
              delay: s.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: `${s.cx}px ${s.cy}px` }}
          >
            <circle cx={s.cx} cy={s.cy} r={s.r * 4} fill="url(#sparkStarGrad)" />
            <path
              d={`M${s.cx} ${s.cy - s.r * 3} L${s.cx + 0.6} ${s.cy - 0.6} L${s.cx + s.r * 3} ${s.cy} L${s.cx + 0.6} ${s.cy + 0.6} L${s.cx} ${s.cy + s.r * 3} L${s.cx - 0.6} ${s.cy + 0.6} L${s.cx - s.r * 3} ${s.cy} L${s.cx - 0.6} ${s.cy - 0.6} Z`}
              fill="var(--primary)"
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
};

type Section =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: { title: string; body: string }[] }
  | { kind: 'callout'; tone: 'info' | 'warn' | 'success'; title: string; body: string }
  | { kind: 'code'; language: string; code: string }
  | { kind: 'checklist'; items: string[] }
  | { kind: 'stats'; items: { label: string; value: string; hint?: string }[] };

const CATEGORY_CODE: Record<Category, { language: string; code: string }> = {
  security: {
    language: 'http',
    code: `POST /api/orders/42 HTTP/1.1
Host: api.example.com
Authorization: Bearer <victim-token>
Content-Type: application/json

{ "userId": "{{fuzz:bola}}", "amount": 100 }

# ForgeFuzz mutators applied:
#  - bola: swap object id for adjacent tenants
#  - sqli: ' OR 1=1 -- payloads in every string field
#  - jwt:  alg=none, kid traversal, audience swap`,
  },
  testing: {
    language: 'yaml',
    code: `openapi: 3.1.0
paths:
  /v1/orders/{id}:
    get:
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Order' }
# ForgeFuzz contract check:
#  - response matches schema strictly (no extra props)
#  - required fields present
#  - enum values within allowed set
#  - status codes documented`,
  },
  ai: {
    language: 'json',
    code: `{
  "tool": "http.request",
  "scope": "run-7c2a",
  "input": {
    "method": "POST",
    "url": "https://api.example.com/v1/refund",
    "body": { "orderId": "{{ctx.orderId}}" }
  },
  "guardrails": {
    "promptInjectionScan": true,
    "tokenBudget": 1500,
    "allowedHosts": ["api.example.com"]
  }
}`,
  },
  devops: {
    language: 'js',
    code: `// ForgeFuzz Load — scenario definition
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 500 },
        { duration: '2m',  target: 5000 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed:   ['rate<0.005'],
  },
};`,
  },
};

const buildSections = (post: Post): Section[] => {
  const code = CATEGORY_CODE[post.category];
  const numberedRegex = /(?:^|\n)\s*\d+\.\s+([^:]+):\s+([^\n]+)/g;
  const points: { title: string; body: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = numberedRegex.exec(post.content)) !== null) {
    points.push({ title: m[1].trim(), body: m[2].trim() });
  }
  const intro = post.content.split('\n\n')[0];

  const categoryPitfalls: Record<Category, string[]> = {
    security: [
      'Treating WAF rules as a substitute for real fuzzing coverage.',
      'Skipping authentication-aware mutation across tenant boundaries.',
      'Logging raw payloads that contain successful exploit traces.',
    ],
    testing: [
      'Asserting only happy-path status codes and ignoring schema drift.',
      'Letting record/replay fixtures rot until they flake on every run.',
      'Coupling contract tests to a single environment and credentials.',
    ],
    ai: [
      'Allowing tool calls to outlive their parent run namespace.',
      'No deterministic seed for replay, making regressions impossible to diff.',
      'Trusting model output as authorization context.',
    ],
    devops: [
      'Generating load from a single region and calling it production-like.',
      'Ignoring connection-pool exhaustion as a downstream symptom.',
      'No SLO gates, so regressions sneak into the next release.',
    ],
  };

  const categoryStats: Record<Category, Section> = {
    security: {
      kind: 'stats',
      items: [
        { label: 'OWASP categories covered', value: '10 / 10', hint: 'API Top 10 (2023)' },
        { label: 'Avg findings per scan', value: '12.4', hint: 'across audited tenants' },
        { label: 'False-positive rate', value: '< 3%', hint: 'after schema-aware filtering' },
      ],
    },
    testing: {
      kind: 'stats',
      items: [
        { label: 'Specs verified / run', value: '1,200+' },
        { label: 'Breaking diffs caught', value: '94%', hint: 'before merge' },
        { label: 'Time saved per release', value: '~6h' },
      ],
    },
    ai: {
      kind: 'stats',
      items: [
        { label: 'Tool calls replayable', value: '100%' },
        { label: 'Avg latency overhead', value: '38 ms', hint: 'guardrail interceptor' },
        { label: 'Token-budget breaches', value: '0', hint: 'per scoped run' },
      ],
    },
    devops: {
      kind: 'stats',
      items: [
        { label: 'Peak VUs supported', value: '50k' },
        { label: 'Regions available', value: '12' },
        { label: 'p95 reporting jitter', value: '< 4 ms' },
      ],
    },
  };

  return [
    {
      kind: 'callout',
      tone: 'info',
      title: 'TL;DR',
      body: post.excerpt,
    },
    { kind: 'heading', text: 'Why this matters now' },
    { kind: 'paragraph', text: intro },
    {
      kind: 'paragraph',
      text: `Teams shipping ${post.category === 'ai' ? 'agentic workflows' : post.category === 'security' ? 'public APIs' : post.category === 'testing' ? 'multi-service platforms' : 'high-traffic backends'} are hitting the same wall: yesterday's tooling assumes a static surface, but the surface keeps moving. ${post.title.split(':')[0]} is the practical answer — opinionated defaults, deterministic outputs, and a feedback loop short enough to actually fix what breaks.`,
    },
    ...(points.length > 0
      ? ([{ kind: 'heading', text: 'Core building blocks' }, { kind: 'list', items: points }] as Section[])
      : []),
    { kind: 'heading', text: 'Implementation walkthrough' },
    {
      kind: 'paragraph',
      text: 'Drop the snippet below into your ForgeFuzz workspace. It captures the minimum viable configuration we ship to every new tenant — extend it with your own thresholds, scopes, and oracles.',
    },
    { kind: 'code', language: code.language, code: code.code },
    {
      kind: 'callout',
      tone: 'success',
      title: 'Result you should expect',
      body: 'A reproducible run that fails loudly on regressions, exports a SARIF/JUnit artifact your CI can gate on, and emits a trace you can replay locally without rebuilding the environment.',
    },
    { kind: 'heading', text: 'Common pitfalls' },
    { kind: 'checklist', items: categoryPitfalls[post.category] },
    { kind: 'heading', text: 'Metrics that matter' },
    categoryStats[post.category],
    { kind: 'heading', text: 'Operational checklist' },
    {
      kind: 'checklist',
      items: [
        `Pin a baseline ${post.category === 'devops' ? 'load profile' : post.category === 'security' ? 'scan policy' : 'spec snapshot'} per release branch.`,
        'Wire ForgeFuzz output into the same dashboard your on-call team already watches.',
        'Schedule a weekly diff against the last green run and page the owning team on regressions.',
        'Keep raw traces for 14 days so any failure is replayable without re-running the suite.',
      ],
    },
    {
      kind: 'callout',
      tone: 'warn',
      title: 'Heads up',
      body: 'Running the full configuration against production without a dry-run profile can saturate downstream services. Always stage with a 10% traffic shadow first and confirm SLOs before promotion.',
    },
    { kind: 'heading', text: 'Where to go next' },
    {
      kind: 'paragraph',
      text: `Pair this guide with the ${post.tags.slice(0, 2).join(' and ')} playbooks linked below. Each one drills into a specific failure mode with reproducible scenarios you can clone into your own workspace.`,
    },
  ];
};

const SectionRenderer: React.FC<{ section: Section; index: number }> = ({ section, index }) => {
  const base = {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.45, delay: Math.min(index * 0.04, 0.3) },
  };

  switch (section.kind) {
    case 'heading':
      return (
        <motion.h2
          {...base}
          className="text-2xl md:text-3xl font-bold tracking-tight mt-12 mb-4 text-text-primary"
        >
          {section.text}
        </motion.h2>
      );
    case 'paragraph':
      return (
        <motion.p
          {...base}
          className="text-base md:text-[17px] leading-relaxed text-muted-foreground mb-5"
        >
          {section.text}
        </motion.p>
      );
    case 'list':
      return (
        <motion.div {...base} className="grid sm:grid-cols-2 gap-4 my-6">
          {section.items.map((it, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card/40 backdrop-blur p-5 hover:border-primary/40 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
                  style={{
                    color: 'var(--color-primary)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h4 className="text-sm font-semibold text-text-primary">{it.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{it.body}</p>
            </div>
          ))}
        </motion.div>
      );
    case 'callout': {
      const toneStyles: Record<string, { border: string; bg: string; label: string }> = {
        info: {
          border: 'color-mix(in oklab, var(--color-primary) 40%, transparent)',
          bg: 'color-mix(in oklab, var(--color-primary) 10%, transparent)',
          label: 'var(--color-primary)',
        },
        warn: {
          border: 'color-mix(in oklab, #ff9d00 50%, transparent)',
          bg: 'color-mix(in oklab, #ff9d00 10%, transparent)',
          label: '#ff9d00',
        },
        success: {
          border: 'color-mix(in oklab, #09ff00 50%, transparent)',
          bg: 'color-mix(in oklab, #09ff00 10%, transparent)',
          label: '#09ff00',
        },
      };
      const t = toneStyles[section.tone];
      return (
        <motion.div
          {...base}
          className="my-6 rounded-2xl border p-5 md:p-6"
          style={{ borderColor: t.border, background: t.bg }}
        >
          <div
            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: t.label }}
          >
            {section.title}
          </div>
          <p className="text-sm md:text-base text-text-primary leading-relaxed">{section.body}</p>
        </motion.div>
      );
    }
    case 'code':
      return (
        <motion.div
          {...base}
          className="my-6 rounded-2xl border border-border bg-[color-mix(in_oklab,var(--background)_70%,black)] overflow-hidden shadow-md"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-elevated">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-600" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {section.language}
            </span>
          </div>
          <pre className="p-5 text-xs md:text-[13px] leading-relaxed overflow-x-auto text-text-primary bg-elevated">
            <code>{section.code}</code>
          </pre>
        </motion.div>
      );
    case 'checklist':
      return (
        <motion.ul {...base} className="my-6 space-y-2.5">
          {section.items.map((it, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-card/30 px-4 py-3"
            >
              <span
                className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: 'color-mix(in oklab, var(--primary) 18%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-sm text-text-primary leading-relaxed">{it}</span>
            </li>
          ))}
        </motion.ul>
      );
    case 'stats':
      return (
        <motion.div {...base} className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {section.items.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card/40 backdrop-blur p-5 shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                {s.label}
              </div>
              <div
                className="text-2xl md:text-3xl font-bold"
              >
                {s.value}
              </div>
              {s.hint && (
                <div className="text-[11px] text-muted-foreground mt-1">{s.hint}</div>
              )}
            </div>
          ))}
        </motion.div>
      );
    default:
      return null;
  }
};
// ---------- End of enhanced detail view helpers ----------

export const BlogPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<'all' | Category>('all');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredPosts = useMemo(() => {
    return POSTS.filter((post) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q));
      const matchesCat = selectedCat === 'all' || post.category === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCat]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredPosts.length;

  const activePost = POSTS.find((p) => p.id === activePostId);
  const relatedPosts = activePost
    ? POSTS.filter((p) => p.category === activePost.category && p.id !== activePost.id).slice(0, 3)
    : [];

  const openPost = (id: string) => {
    setActivePostId(id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedCat]);

  return (
    <div className="min-h-screen bg-background text-text-primary relative overflow-hidden">
      {/* Ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklab, var(--primary) 18%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--primary) 18%, transparent) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at top, black 30%, transparent 75%)',
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)' }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <LandingNavbar />

      <main className="relative z-10 max-w-8xl mx-auto px-16 pt-32 pb-24">
        <AnimatePresence mode="wait">
          {!activePost ? (
            // ----- LISTING VIEW (exactly as in first code) -----
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              {/* Hero */}
              <section className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/40 backdrop-blur text-xs font-semibold uppercase tracking-wider text-primary mb-6"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ForgeFuzz Insights
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-5xl md:text-6xl font-bold tracking-tight mb-5"
                >
                  Technical Insights & <span className="gradient-text">Best Practices</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
                >
                  Guides, tutorials, and analysis on API security, concurrency tuning, contract verification, and AI-driven automated testing.
                </motion.p>
              </section>

              {/* Filter Toolbar */}
              <section className="flex flex-col md:flex-row md:items-center gap-4 mb-10">
                <div className="flex gap-2 overflow-x-auto md:overflow-visible">
                  {(['all', 'security', 'testing', 'ai', 'devops'] as const).map((cat) => {
                    const active = selectedCat === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCat(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shrink-0 border ${
                          active
                            ? ' text-primary border-primary'
                            : 'bg-card/40 border-border text-muted-foreground hover:text-primary'
                        }`}
                        style={
                          active
                            ? { boxShadow: '0 8px 30px -8px color-mix(in oklab, var(--primary) 50%, transparent)' }
                            : undefined
                        }
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                <div className="relative md:ml-auto md:w-80">
                  <Search className="w-4 h-4 absolute z-999 left-3 top-1/2 -translate-y-1/2 " />
                  <input
                    type="text"
                    placeholder="Search articles, tags, topics…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card/40 backdrop-blur  placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
                  />
                </div>
              </section>

              {/* Posts grid */}
              {visiblePosts.length > 0 ? (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visiblePosts.map((post, idx) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: (idx % PAGE_SIZE) * 0.05 }}
                      // whileHover={{ y: -4 }}
                      className="relative rounded-2xl shadow-2xl border border-border bg-card/40 backdrop-blur overflow-hidden transition-all hover:border-primary/40 flex flex-col"
                    >
                      {/* Cover image */}
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-tr ${CATEGORY_META[post.category].gradient} mix-blend-overlay`}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent" />
                        <div className="absolute bottom-3 left-3 text-[10px] tracking-wider text-white flex gap-4">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> {post.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> {post.readTime}
                          </span>
                        </div>
                      </div>

                      <div className="px-4 py-4 flex flex-col gap-2 flex-1">
                        <h3
                          onClick={(e) => {
                            e.stopPropagation();
                            openPost(post.id);
                          }}
                          className="text-lg font-semibold mb-1 leading-snug text-text-primary hover:text-primary transition-colors cursor-pointer line-clamp-2"
                        >
                          {post.title}
                        </h3>

                        <p className="text-xs text-muted-foreground line-clamp-3">{post.excerpt}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="w-3 h-3" /> {post.author}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPost(post.id);
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-primary hover:gap-2 transition-all"
                          >
                            Read <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </section>
              ) : (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No articles found matching the query.
                </div>
              )}

              {/* Load more */}
              {canLoadMore && (
                <div className="flex justify-center mt-12">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
                    style={{ boxShadow: '0 14px 40px -10px color-mix(in oklab, var(--primary) 55%, transparent)' }}
                  >
                    Load more articles <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              )}

              {/* Newsletter */}
              <section className="mt-24 relative rounded-3xl border border-border bg-card/40 backdrop-blur p-10 md:p-14 overflow-hidden">
                <motion.div
                  aria-hidden
                  className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl"
                  style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 30%, transparent), transparent 70%)' }}
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative max-w-2xl">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">Subscribe to our newsletter</h2>
                  <p className="text-muted-foreground text-sm md:text-base mb-6">
                    Early technical releases, schema checklists, and OWASP mutator guides — straight to your inbox.
                  </p>
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="flex flex-col sm:flex-row gap-3 max-w-lg"
                  >
                    <input
                      type="email"
                      placeholder="you@email.com"
                      className="flex-1 px-4 py-3 text-sm rounded-lg border border-border bg-background/60 text-text-primary placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      style={{ boxShadow: '0 10px 30px -10px color-mix(in oklab, var(--primary) 55%, transparent)' }}
                    >
                      Subscribe
                    </button>
                  </form>
                </div>
              </section>
            </motion.div>
          ) : (
            // ----- DETAIL VIEW  -----
            <motion.div
              key={`detail-${activePost.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              {/* Back */}
              <button
                onClick={() => setActivePostId(null)}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" /> Back to blog
              </button>

              {/* Full-width hero */}
              <div className="relative w-full h-[360px] md:h-[460px] rounded-3xl overflow-hidden border border-border mb-10">
                <img src={activePost.image} alt={activePost.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                {/* <SparkleLines /> */}
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                  <span
                    className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border backdrop-blur mb-4"
                    style={{
                      color: 'var(--color-primary)',
                      borderColor: 'color-mix(in oklab, var(--color-primary) 40%, transparent)',
                      background: 'color-mix(in oklab, var(--color-primary) 14%, transparent)',
                    }}
                  >
                    {getCategoryDisplayName(activePost.category)}
                  </span>
                  <h1 className="text-3xl md:text-5xl text-white font-bold tracking-tight max-w-4xl leading-tight">
                    {activePost.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-white">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {activePost.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {activePost.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {activePost.readTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <article className="max-w-7xl mx-auto">
                <p className="text-lg text-muted-foreground leading-relaxed mb-2">{activePost.excerpt}</p>
                <div className="flex flex-wrap items-center gap-2 mb-8 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card/40">
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--primary)' }} /> Deep dive
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card/40">
                    <Clock className="w-3 h-3" /> {activePost.readTime}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card/40">
                    Updated {activePost.date}
                  </span>
                </div>

                {buildSections(activePost).map((section, i) => (
                  <SectionRenderer key={i} section={section} index={i} />
                ))}

                {/* Tags + share */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-12 pt-8 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    {activePost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground"
                      >
                        <TagIcon className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:gap-3 transition-all"
                  >
                    <Share2 className="w-4 h-4" /> Share Article
                  </button>
                </div>
              </article>

              {/* Related */}
              {relatedPosts.length > 0 && (
                <section className="mt-20">
                  <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {relatedPosts.map((post) => (
                      <motion.article
                        key={post.id}
                        whileHover={{ y: -4 }}
                        onClick={() => openPost(post.id)}
                        className="group rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden cursor-pointer transition-all hover:border-primary/40"
                      >
                        <div className="relative h-36 overflow-hidden">
                          <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
                        </div>
                        <div className="p-5">
                          <div className="text-[11px] text-muted-foreground mb-2">{post.date}</div>
                          <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {post.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            Read <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <LandingFooter />
    </div>
  );
};

export default BlogPage;