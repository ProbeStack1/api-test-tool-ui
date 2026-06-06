/**
 * PillarsSection — the 8 ForgeQ product pillars from LANDING_PAGE_SPEC.md.
 * 2×4 grid of glass cards using existing landing-bg / primary tokens
 * (no new colour introduced). Each card lists 4 concrete capabilities,
 * an inline code snippet where the pillar has a CLI/curl analogue,
 * and a tagline that mirrors the spec verbatim.
 *
 * IMPORTANT — copy here only references actually-shipping ForgeQ
 * features per the spec's "Sanity Checklist" rule:
 * every claim maps to a real capability, no aspirational fluff.
 */
import {
  Boxes, GitBranch, Server, FileCode, Activity, ShieldAlert, Bug, Radar,
} from 'lucide-react';

type Pillar = {
  icon: React.ComponentType<{ className?: string }>;
  num: string;
  title: string;
  tagline: string;
  bullets: string[];
  code?: string;
};

const PILLARS: Pillar[] = [
  {
    icon: Boxes,
    num: '01',
    title: 'Projects & Collections',
    tagline: 'Postman muscle memory, GitHub-grade organisation.',
    bullets: [
      'Project → Collections → Folders → Requests',
      'HTTP + GraphQL builder, 4 auth presets',
      'Import Postman v2.1 · OpenAPI 3 · HAR · cURL',
      'Drag-to-reorder, bulk clone / move / archive',
    ],
    code: '$ forgefuzz import postman_collection.json',
  },
  {
    icon: GitBranch,
    num: '02',
    title: 'Environments & Variables',
    tagline: 'No more "works on my machine" for API calls.',
    bullets: [
      '5-level resolution: Global → Workspace → Collection → Env → Local',
      '5-level resolution: Global → Project → Collection → Env → Local',
      'SECRET vars masked in UI, audit log & exports',
      'Templating: {{BASE_URL}}/{{API_VERSION}}/users/{{id}}',
      'Pre-request scripts inject dynamic values',
    ],
  },
  {
    icon: Server,
    num: '03',
    title: 'Mock Server',
    tagline: 'Ship the contract before the implementation.',
    bullets: [
      'Hosted mocks with instant public URLs',
      'Multiple variants — weighted / sequential / random',
      'Handlebars: {{path.id}} · {{body.field}} · {{now}}',
      'Latency simulation + hit-log capture',
    ],
    code: 'GET https://forgefuzz.probestack.io/mock/abc/users/42',
  },
  {
    icon: FileCode,
    num: '04',
    title: 'Specs & Test Cases',
    tagline: 'Your OpenAPI doc just became your test suite.',
    bullets: [
      'Auto-detect import: OpenAPI 3 · Postman 2.1 · HAR',
      'Generates positive, negative, boundary & schema cases',
      '30 cases from a single 4-endpoint spec',
      'Reusable Spec Library with tags + categories',
    ],
  },
  {
    icon: Activity,
    num: '05',
    title: 'Functional & Load Tests',
    tagline: 'From "does it work?" to "at scale?" in two clicks.',
    bullets: [
      'Step-level assertions, postman scripts supported',
      'Load profiles: Constant · Ramp-Up · Spike · Soak',
      'Real-time RPS, p50 / p95 / p99 latency',
      'Threshold pass/fail (p95Ms < 2000, errorRate < 1%)',
    ],
    code: '✓ 1,027 requests · 25 RPS · 374 ms avg · 30 s',
  },
  {
    icon: ShieldAlert,
    num: '06',
    title: 'Security Test (OWASP)',
    tagline: 'Catch CVE-grade issues before the pentest team does.',
    bullets: [
      '10 probes: auth, headers, IDOR, SQLi, XSS, CORS, TLS…',
      'Live SSE streaming of findings — no polling',
      'One-click "File Bug" pre-populates Bug Tracker',
      'Severity-threshold escalation → email + Slack',
    ],
  },
  {
    icon: Bug,
    num: '07',
    title: 'Bug Tracker',
    tagline: 'No more "I\'ll Jira this later". File where you found it.',
    bullets: [
      'Source: MANUAL · SECURITY_SCAN · MONITOR · FUNCTIONAL_TEST',
      'Markdown body + threaded ISO-timestamped comments',
      'Severity CRITICAL → LOW · status OPEN → CLOSED',
      'Webhook + email on every state change',
    ],
  },
  {
    icon: Radar,
    num: '08',
    title: 'Monitors · Heartbeats · Digests',
    tagline: 'Production observability without leaving the platform.',
    bullets: [
      'Cron-scheduled probes (6-field Spring cron)',
      'Multi-region: us-east-1 · eu-west-1 · ap-south-1',
      'Heartbeats — passive client pings, alert on miss',
      'Daily / weekly / on-incident digests',
    ],
    code: '0 */5 * * * *   # every 5 min',
  },
];

export default function PillarsSection() {
  return (
    <section
      id="pillars"
      data-testid="pillars-section"
      className="relative z-10 py-20 border-b border-border"
    >
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="text-center max-w-3xl mx-auto mb-14 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4 border border-primary/20">
            Eight pillars · one workspace
            Eight pillars · one project
          </div>
          <h2 className="text-3xl md:text-5xl font-bold gradient-text font-display mb-4 leading-tight">
            Everything an API ships through. In one tab.
          </h2>
          <p className="text-text-secondary text-base md:text-lg">
            Build the spec, mock the endpoint, generate the tests, run the load,
            scan for OWASP issues, file the bug, monitor production, ship the docs.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PILLARS.map((p, idx) => (
            <PillarCard key={p.num} pillar={p} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarCard({ pillar, idx }: { pillar: Pillar; idx: number }) {
  const Icon = pillar.icon;
  return (
    <div
      data-testid={`pillar-card-${pillar.num}`}
      style={{ animationDelay: `${idx * 80}ms` }}
      className="group relative rounded-xl border border-border bg-surface/40 backdrop-blur-sm p-5 hover:border-primary/60 hover:-translate-y-1 transition-all duration-300 flex flex-col animate-fade-in-up overflow-hidden"
    >
      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-[#1fbf9a]/10" />

      <div className="relative flex items-start justify-between mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-mono text-xs tracking-wider text-text-muted">
          PILLAR · {pillar.num}
        </span>
      </div>
      <h3 className="relative text-base font-semibold text-text-primary mb-1 group-hover:text-primary transition-colors">
        {pillar.title}
      </h3>
      <p className="relative text-xs text-primary/90 mb-3 italic">{pillar.tagline}</p>
      <ul className="relative space-y-1.5 text-xs text-text-secondary mb-3 flex-1">
        {pillar.bullets.map((b) => (
          <li key={b} className="flex gap-1.5">
            <span className="text-primary/60 shrink-0">›</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {pillar.code && (
        <div className="relative rounded-md bg-elevated/80 border border-border px-2.5 py-1.5 font-mono text-sm text-text-secondary overflow-x-auto group-hover:border-primary/30 transition-colors">
          {pillar.code}
        </div>
      )}
    </div>
  );
}
