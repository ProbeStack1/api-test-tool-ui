/**
 * ProductShowcase — autoplay carousel that ships designed-in-code
 * mockups of each ForgeQ pillar instead of bitmap screenshots.
 *
 * Why not PNGs?  Live ForgeQ screens depend on backend state — they
 * arrive empty in marketing screenshots.  Designed mockups are always
 * populated with realistic data, render at every resolution, and stay
 * pixel-perfect when the theme changes.  Same approach as Linear /
 * Vercel / Stripe.
 *
 * Controls:
 *   • 6-second autoplay (pause on hover or by clicking the pause button)
 *   • ← / → seek, Space pause
 *   • Click a pagination dot or the side arrows
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Pause, Play,
  LayoutDashboard, FolderGit2, KeyRound, Server, Activity, Bug, Radar, Sparkles, FileCode2,
  CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';

type Slide = {
  id: string;
  pillar: string;
  title: string;
  caption: string;
  render: () => React.ReactNode;
};

/* ─────────────────────────────  Mockups  ───────────────────────────── */

const DashboardMock = () => (
  <div className="grid grid-cols-12 gap-3 h-full p-5">
    {/* Sidebar */}
    <div className="col-span-2 rounded-lg border border-border/60 bg-elevated/60 p-3 flex flex-col gap-2">
      {[LayoutDashboard, FolderGit2, KeyRound, Server, Activity, ShieldIcon, Bug, Radar].map((Icon, i) => (
        <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] ${i === 0 ? 'bg-primary/15 text-primary' : 'text-text-secondary'}`}>
          <Icon className="w-3.5 h-3.5" />
          <span className="truncate">{['Dashboard','Collections','Variables','Mock','Load','Security','Bugs','Monitors'][i]}</span>
        </div>
      ))}
    </div>
    {/* Main */}
    <div className="col-span-10 grid grid-cols-4 grid-rows-3 gap-3">
      {[
        { label: 'WORKSPACES', value: '12', delta: '+3', icon: FolderGit2 },
        { label: 'COLLECTIONS', value: '847', delta: '+24', icon: FileCode2 },
        { label: 'MONITORS LIVE', value: '38', delta: '+5', icon: Radar },
        { label: 'OPEN BUGS', value: '17', delta: '-4', icon: Bug },
      ].map((m) => (
        <div key={m.label} className="rounded-lg border border-border/60 bg-elevated/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-text-muted tracking-wider">{m.label}</span>
            <m.icon className="w-3.5 h-3.5 text-primary/60" />
          </div>
          <div className="text-xl font-bold text-text-primary">{m.value}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">{m.delta} this week</div>
        </div>
      ))}
      {/* Big chart spans 3 cols / 2 rows */}
      <div className="col-span-3 row-span-2 rounded-lg border border-border/60 bg-elevated/40 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-primary font-medium">Activity over time</span>
          <span className="text-[10px] text-text-muted font-mono">last 7 days · auto-refresh 30 s</span>
        </div>
        <Sparkline />
      </div>
      {/* Side card */}
      <div className="col-span-1 row-span-2 rounded-lg border border-border/60 bg-elevated/40 p-3 flex flex-col gap-2">
        <div className="text-xs text-text-primary font-medium mb-1">Run success rate</div>
        <DonutGauge />
        <div className="mt-1 text-[10px] text-text-secondary leading-relaxed">
          <div>Passed <span className="float-right text-emerald-400">1,041</span></div>
          <div>Failed <span className="float-right text-rose-400">12</span></div>
          <div className="font-mono text-text-muted pt-1 border-t border-border/40">Total 1,053</div>
        </div>
      </div>
    </div>
  </div>
);

const CollectionsMock = () => (
  <div className="grid grid-cols-12 gap-3 h-full p-5">
    <div className="col-span-3 rounded-lg border border-border/60 bg-elevated/60 p-3">
      <div className="text-[10px] font-mono text-text-muted tracking-wider mb-2">COLLECTIONS</div>
      {[
        ['Auth API', 14],
        ['Orders API', 22],
        ['Billing API', 17],
        ['Users API', 9],
      ].map(([name, count], i) => (
        <div key={name as string} className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] ${i === 1 ? 'bg-primary/10 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
          <span className="flex items-center gap-1.5">
            <FolderGit2 className="w-3 h-3 text-primary/60" />
            {name}
          </span>
          <span className="font-mono text-text-muted">{count}</span>
        </div>
      ))}
    </div>
    <div className="col-span-9 rounded-lg border border-border/60 bg-elevated/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300">GET</span>
        <span className="font-mono text-xs text-text-primary">https://api.forgefuzz.io/orders/&#123;&#123;id&#125;&#125;</span>
        <span className="ml-auto px-2 py-0.5 rounded bg-primary text-white text-[10px] font-semibold">Send</span>
      </div>
      <div className="grid grid-cols-2 gap-3 h-[calc(100%-2rem)]">
        <div className="rounded-md border border-border/40 bg-background/40 p-3 font-mono text-[10.5px] leading-relaxed overflow-hidden">
          <div className="text-text-muted mb-1.5 text-[9px]">REQUEST · params</div>
          <div className="text-text-secondary">{`{`}</div>
          <div className="text-text-secondary">  &quot;id&quot;: <span className="text-emerald-400">&quot;ord_84102&quot;</span>,</div>
          <div className="text-text-secondary">  &quot;include&quot;: <span className="text-emerald-400">&quot;items,payment&quot;</span></div>
          <div className="text-text-secondary">{`}`}</div>
          <div className="text-text-muted mt-3 mb-1.5 text-[9px]">HEADERS</div>
          <div className="text-text-secondary">Authorization: <span className="text-primary">Bearer {`{{TOKEN}}`}</span></div>
          <div className="text-text-secondary">Accept: application/json</div>
        </div>
        <div className="rounded-md border border-border/40 bg-background/40 p-3 font-mono text-[10.5px] leading-relaxed overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-muted text-[9px]">RESPONSE · 200 OK · 47ms</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-text-secondary">{`{`}</div>
          <div className="text-text-secondary">  &quot;id&quot;: <span className="text-emerald-400">&quot;ord_84102&quot;</span>,</div>
          <div className="text-text-secondary">  &quot;status&quot;: <span className="text-emerald-400">&quot;paid&quot;</span>,</div>
          <div className="text-text-secondary">  &quot;total&quot;: <span className="text-sky-400">1249.99</span>,</div>
          <div className="text-text-secondary">  &quot;currency&quot;: <span className="text-emerald-400">&quot;USD&quot;</span>,</div>
          <div className="text-text-secondary">  &quot;items&quot;: [<span className="text-sky-400">3</span>]</div>
          <div className="text-text-secondary">{`}`}</div>
        </div>
      </div>
    </div>
  </div>
);

const VariablesMock = () => (
  <div className="h-full p-5 grid grid-cols-5 gap-3">
    {['GLOBAL', 'WORKSPACE', 'COLLECTION', 'ENV', 'LOCAL'].map((scope, i) => (
      <div key={scope} className="rounded-lg border border-border/60 bg-elevated/40 p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-[9.5px] text-text-muted tracking-wider">{scope}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${i === 3 ? 'bg-primary animate-pulse' : 'bg-text-muted/30'}`} />
        </div>
        {[
          ['BASE_URL', i === 0 ? 'https://api.forgefuzz.io' : i === 3 ? 'https://staging.forgefuzz.io' : '—'],
          ['API_VERSION', i === 1 ? 'v2' : i === 3 ? 'v3-beta' : '—'],
          ['TOKEN', i === 4 ? '•••••••' : '—'],
          ['REGION', i === 2 ? 'us-east-1' : '—'],
        ].map(([k, v]) => (
          <div key={k as string} className="text-[10px] font-mono mb-1.5 leading-tight">
            <div className="text-text-muted">{k}</div>
            <div className={v === '—' ? 'text-text-muted/60' : 'text-text-primary truncate'}>{v}</div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const LoadTestMock = () => (
  <div className="h-full p-5 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <span className="px-2.5 py-1 rounded-md bg-primary text-white text-[10px] font-semibold inline-flex items-center gap-1.5">
        <Activity className="w-3 h-3" /> RUNNING
      </span>
      <span className="text-xs text-text-primary font-medium">Spike profile · 30 s · 500 VUs</span>
      {/* <span className="ml-auto text-[10px] font-mono text-text-muted">forgefuzz-load-test-mgmt-svc</span> */}
    </div>
    <div className="grid grid-cols-4 gap-3">
      {[
        ['REQUESTS', '1,027', 'text-text-primary'],
        ['RPS', '25.3', 'text-primary'],
        ['p95 LATENCY', '374 ms', 'text-emerald-400'],
        ['ERRORS', '0.3%', 'text-amber-400'],
      ].map(([l, v, c]) => (
        <div key={l} className="rounded-lg border border-border/60 bg-elevated/40 p-3">
          <div className="text-[9px] font-mono text-text-muted tracking-wider mb-1.5">{l}</div>
          <div className={`text-2xl font-bold ${c}`}>{v}</div>
        </div>
      ))}
    </div>
    <div className="flex-1 rounded-lg border border-border/60 bg-elevated/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-primary font-medium">Latency over time</span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> p50</span>
          <span className="flex items-center gap-1 text-primary"><span className="h-2 w-2 rounded-sm bg-primary" /> p95</span>
          <span className="flex items-center gap-1 text-rose-400"><span className="h-2 w-2 rounded-sm bg-rose-400" /> p99</span>
        </div>
      </div>
      <Sparkline tall />
    </div>
  </div>
);

const SecurityMock = () => (
  <div className="h-full p-5 grid grid-cols-3 gap-3">
    <div className="col-span-1 rounded-lg border border-border/60 bg-elevated/40 p-3">
      <div className="text-[10px] font-mono text-text-muted tracking-wider mb-3">OWASP PROBES · LIVE SSE</div>
      {[
        ['Auth bypass',      'pass',    CheckCircle2,  'text-emerald-400'],
        ['Missing headers',  'fail',    AlertTriangle, 'text-amber-400'],
        ['IDOR',             'pass',    CheckCircle2,  'text-emerald-400'],
        ['SQL injection',    'pass',    CheckCircle2,  'text-emerald-400'],
        ['XSS reflected',    'fail',    XCircle,       'text-rose-400'],
        ['CORS perm.',       'pass',    CheckCircle2,  'text-emerald-400'],
        ['TLS cipher',       'pass',    CheckCircle2,  'text-emerald-400'],
        ['Rate limit',       'running', Activity,      'text-primary animate-pulse'],
      ].map((row) => {
        const [n, , Icon, c] = row as [string, string, typeof CheckCircle2, string];
        return (
          <div key={n} className="flex items-center gap-2 py-1 border-b border-border/30 text-[11px]">
            <Icon className={`w-3.5 h-3.5 ${c}`} />
            <span className="text-text-secondary flex-1 truncate">{n}</span>
          </div>
        );
      })}
    </div>
    <div className="col-span-2 grid grid-rows-3 gap-3">
      <div className="row-span-2 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-semibold text-rose-200">HIGH · Reflected XSS</span>
          <span className="ml-auto text-[10px] font-mono text-rose-300/70">/comments?q=&lt;script&gt;</span>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed mb-2">
          Query param <code className="text-rose-300 font-mono">q</code> is echoed without HTML encoding.
          Payload <code className="text-rose-300 font-mono">&lt;svg/onload=alert(1)&gt;</code> executes in
          the response body.
        </p>
        <div className="flex gap-2">
          <button className="px-2.5 py-1 rounded-md bg-primary text-white text-[10px] font-semibold">File bug</button>
          <button className="px-2.5 py-1 rounded-md border border-border text-[10px] text-text-secondary">View evidence</button>
        </div>
      </div>
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-200">MEDIUM · Missing security headers</span>
        </div>
        <p className="text-[10.5px] text-text-secondary mt-1">Missing <code className="font-mono">Strict-Transport-Security</code>, <code className="font-mono">X-Content-Type-Options</code>.</p>
      </div>
    </div>
  </div>
);

const BugsMock = () => (
  <div className="h-full p-5 grid grid-cols-4 gap-3">
    {[
      ['OPEN', 'rose-500', ['Reflected XSS', 'Cookie not Secure', 'Stale token TTL']],
      ['IN PROGRESS', 'amber-500', ['p95 spike on /orders', 'Missing rate-limit header']],
      ['IN REVIEW', 'sky-500', ['IDOR on /admin/users']],
      ['CLOSED', 'emerald-500', ['CORS preflight 500', 'TLS 1.1 still enabled']],
    ].map(([col, color, items]) => (
      <div key={col as string} className="rounded-lg border border-border/60 bg-elevated/40 p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-mono tracking-wider text-text-muted">{col}</span>
          <span className={`h-2 w-2 rounded-full bg-${color}`} />
        </div>
        <div className="space-y-2">
          {(items as string[]).map((b) => (
            <div key={b} className="rounded-md bg-background/40 border border-border/30 p-2">
              <div className="text-[10px] text-text-primary truncate">{b}</div>
              <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-text-muted">
                <span className="px-1 rounded bg-primary/10 text-primary">SECURITY_SCAN</span>
                <span>· 2d ago</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const MonitorsMock = () => (
  <div className="h-full p-5 space-y-3">
    {[
      ['orders-api / us-east-1', '0 */5 * * * *',  'pass',  '47 ms',  '99.99%'],
      ['auth-api / eu-west-1',   '0 */5 * * * *',  'pass',  '83 ms',  '99.97%'],
      ['billing-api / ap-south-1','0 */5 * * * *', 'fail',  '2.4 s',  '94.20%'],
      ['users-api / us-east-1',  '0 */1 * * * *',  'pass',  '34 ms',  '99.99%'],
    ].map(([name, cron, status, lat, sla]) => (
      <div key={name as string} className="rounded-lg border border-border/60 bg-elevated/40 p-3 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Radar className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-text-primary font-medium truncate">{name}</div>
            <div className="text-[10px] font-mono text-text-muted">{cron}</div>
          </div>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${status === 'pass' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{(status as string).toUpperCase()}</span>
        <div className="text-right">
          <div className="text-[10px] text-text-muted">p95</div>
          <div className="text-xs font-mono text-text-primary">{lat}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-text-muted">SLA</div>
          <div className="text-xs font-mono text-text-primary">{sla}</div>
        </div>
        <Sparkline mini fail={status === 'fail'} />
      </div>
    ))}
  </div>
);

const AIMock = () => (
  <div className="h-full p-5 grid grid-cols-3 gap-3">
    <div className="col-span-2 rounded-lg border border-border/60 bg-elevated/40 p-4 flex flex-col">
      <div className="text-[10px] font-mono text-text-muted tracking-wider mb-3">CHAT · GEMINI 3</div>
      <div className="space-y-3 flex-1 overflow-hidden">
        <div className="ml-auto max-w-[80%] rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-[11px] text-text-primary">
          Write a load profile that ramps to 500 VUs over 30 s, then sustains.
        </div>
        <div className="max-w-[85%] rounded-lg bg-elevated/80 border border-border/40 px-3 py-2 text-[11px] text-text-secondary leading-relaxed font-mono">
          <div className="text-[9px] text-text-muted mb-1">profile.yaml</div>
          <div>stages:</div>
          <div>  - duration: <span className="text-primary">30s</span>, target: <span className="text-emerald-400">500</span></div>
          <div>  - duration: <span className="text-primary">2m</span>,  target: <span className="text-emerald-400">500</span></div>
          <div>thresholds:</div>
          <div>  p95Ms: <span className="text-emerald-400">&lt; 2000</span></div>
          <div>  errorRate: <span className="text-emerald-400">&lt; 0.01</span></div>
        </div>
        <div className="ml-auto max-w-[60%] rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-[11px] text-text-primary">
          Apply it to the &quot;Orders API&quot; collection.
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
        <input
          readOnly
          className="flex-1 rounded-md bg-background/40 border border-border/40 px-3 py-1.5 text-[11px] text-text-secondary"
          value="Ask anything about ForgeFuzz..."
        />
        <button className="h-8 w-8 rounded-md bg-primary text-white flex items-center justify-center"><Sparkles className="w-3.5 h-3.5" /></button>
      </div>
    </div>
    <div className="col-span-1 rounded-lg border border-border/60 bg-elevated/40 p-3 space-y-2">
      <div className="text-[10px] font-mono text-text-muted tracking-wider mb-1">SUGGESTED ACTIONS</div>
      {[
        'Generate test cases from spec',
        'Find slow endpoints (p95)',
        'Explain this OWASP finding',
        'Write postman assertion',
        'Summarise yesterday\'s incidents',
      ].map((a) => (
        <div key={a} className="rounded-md px-2.5 py-1.5 bg-background/40 border border-border/30 text-[10.5px] text-text-secondary hover:text-primary cursor-pointer">
          {a}
        </div>
      ))}
    </div>
  </div>
);

/* ──────────────────────────── Helpers ─────────────────────────────── */

function ShieldIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}

function Sparkline({ tall = false, mini = false, fail = false }: { tall?: boolean; mini?: boolean; fail?: boolean }) {
  const w = mini ? 80 : 600;
  const h = mini ? 28 : (tall ? 200 : 120);
  // Deterministic seeded path
  const pts: [number, number][] = [];
  let v = 0.55;
  const N = mini ? 14 : 32;
  for (let i = 0; i < N; i++) {
    const noise = Math.sin(i * 0.7) * 0.18 + Math.cos(i * 1.3) * 0.1;
    v = Math.min(0.95, Math.max(0.15, v + noise * 0.05));
    pts.push([(i / (N - 1)) * w, h - v * h]);
  }
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const fillD = `${d} L${w} ${h} L0 ${h} Z`;
  const stroke = fail ? '#fb7185' : '#ff5b1f';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={mini ? 'h-8 w-20' : 'w-full h-full'} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg${stroke}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#sg${stroke})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={mini ? 1.5 : 2} strokeLinecap="round" />
      {!mini && pts.filter((_, i) => i % 4 === 0).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={stroke} />
      ))}
    </svg>
  );
}

function DonutGauge() {
  const pct = 98.9;
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative flex items-center justify-center my-1">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="40" cy="40" r={R} fill="none" stroke="#1fbf9a" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * C} ${C}`} />
      </svg>
      <div className="absolute text-center">
        <div className="text-base font-bold text-emerald-400">{pct}%</div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Slides ─────────────────────────────── */

const SLIDES: Slide[] = [
  { id: 'dashboard',  pillar: 'Dashboard',         title: 'Cross-workspace dashboard',  caption: 'Live RPS, p95 latency, OWASP findings, open bugs — every microservice on one pane.', render: () => <DashboardMock /> },
  { id: 'collections',pillar: 'Pillar 01',         title: 'Collections & request builder', caption: 'GitHub-grade tree, GraphQL + HTTP, 4 auth presets, drag-to-reorder.',             render: () => <CollectionsMock /> },
  { id: 'variables',  pillar: 'Pillar 02',         title: '5-level variable resolution',   caption: 'Global → Workspace → Collection → Env → Local — secrets masked, audit-logged.',     render: () => <VariablesMock /> },
  { id: 'load',       pillar: 'Pillar 05',         title: 'Functional & Load tests',       caption: 'Ramp-Up · Spike · Soak — real-time RPS, p50 / p95 / p99 latency.',                  render: () => <LoadTestMock /> },
  { id: 'security',   pillar: 'Pillar 06',         title: 'OWASP security scan',           caption: '10 probes streamed live over SSE — one-click "File Bug" pre-populates target + severity.', render: () => <SecurityMock /> },
  { id: 'bugs',       pillar: 'Pillar 07',         title: 'Bug Tracker',                   caption: 'MANUAL · SECURITY_SCAN · MONITOR · FUNCTIONAL_TEST — markdown + threaded comments.', render: () => <BugsMock /> },
  { id: 'monitors',   pillar: 'Pillar 08',         title: 'Monitors · Heartbeats',         caption: 'Cron-scheduled probes across us-east-1 / eu-west-1 / ap-south-1 with SLA tracking.', render: () => <MonitorsMock /> },
  { id: 'ai',         pillar: 'AI Assistant',      title: 'Gemini-powered query builder',  caption: '"Write a load profile that ramps to 500 VUs" — code-aware, workspace-aware.',     render: () => <AIMock /> },
];

/* ─────────────────────────── Component ────────────────────────────── */

export default function ProductShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const next = useCallback(() => setActive((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setTimeout(next, 6000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [active, paused, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const slide = SLIDES[active];

  return (
    <section
      data-testid="product-showcase"
      className="relative z-10 py-24 border-b border-border overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4 border border-primary/20">
            Designed in code · always crisp
          </div>
          <h2 className="text-3xl md:text-5xl font-bold gradient-text font-display mb-4 leading-tight">
            What you actually click. Not a render.
          </h2>
          <p className="text-text-secondary text-base md:text-lg">
            Eight pillars, eight live mockups. Use ← / → to navigate, Space to pause.
          </p>
        </div>

        <div className="relative max-w-[1400px] mx-auto">
          <div className="absolute inset-x-12 -top-6 bottom-6 bg-gradient-to-tr from-primary/20 via-transparent to-[#1fbf9a]/20 blur-3xl rounded-[3rem] pointer-events-none" />

          <div className="relative rounded-2xl border border-border/80 bg-surface/40 backdrop-blur-sm p-3 md:p-4 shadow-2xl shadow-black/40 ring-1 ring-primary/10 hover:ring-primary/30 transition-all duration-500">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-3 pb-3 border-b border-border/60">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5b1f]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5cf52]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#1fbf9a]" />
              <span className="ml-4 inline-flex items-center gap-2 text-[11px] font-mono text-text-muted">
                <span className="px-2 py-0.5 rounded-md bg-elevated/80 border border-border">
                  forgefuzz.probestack.io/{slide.id}
                </span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono text-primary border border-primary/30 rounded-md">
                {slide.pillar} · {String(active + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
              </span>
            </div>

            {/* Stage */}
            <div className="relative overflow-hidden rounded-lg mt-3 aspect-[16/9] bg-elevated/30 border border-border/40">
              {SLIDES.map((s, i) => (
                <div
                  key={s.id}
                  aria-hidden={i !== active}
                  className={`absolute inset-0 transition-all duration-700 ease-out ${
                    i === active ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03] pointer-events-none'
                  }`}
                >
                  {s.render()}
                </div>
              ))}

              {/* Caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent p-5 md:p-6 pointer-events-none">
                <h3 className="text-base md:text-lg font-semibold text-text-primary mb-1">{slide.title}</h3>
                <p className="text-xs md:text-sm text-text-secondary max-w-2xl">{slide.caption}</p>
              </div>

              <button
                type="button" aria-label="Previous" data-testid="showcase-prev" onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-surface/80 backdrop-blur-md border border-border hover:border-primary/60 hover:text-primary text-text-secondary flex items-center justify-center transition-all hover:scale-105"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button" aria-label="Next" data-testid="showcase-next" onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-surface/80 backdrop-blur-md border border-border hover:border-primary/60 hover:text-primary text-text-secondary flex items-center justify-center transition-all hover:scale-105"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Dots + pause */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {SLIDES.map((_, i) => (
              <button
                key={i} type="button" data-testid={`showcase-dot-${i}`}
                onClick={() => setActive(i)} aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? 'w-8 bg-primary' : 'w-1.5 bg-border hover:bg-text-secondary'
                }`}
              />
            ))}
            <button
              type="button" onClick={() => setPaused((p) => !p)} data-testid="showcase-pause"
              className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface/50 text-[11px] text-text-secondary hover:text-primary hover:border-primary/50 transition-colors"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? 'Play' : 'Pause'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
