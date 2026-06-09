import React, { useState, useEffect, useRef, useMemo } from 'react';
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/sections/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Shield, Zap, Repeat, FileCode2, Terminal, CheckCircle, AlertTriangle,
  ArrowRight, Database, Code2, Activity, Layers, Sparkles, Server,
  Users2, Lock, Globe2, Cpu, Settings, ListTodo, FileJson, FileText,
  Workflow, Boxes, GitBranch, Network, KeyRound, Webhook
} from 'lucide-react';

type SimulatorTab =
  | 'import' | 'variables' | 'fuzz' | 'load' | 'mock'
  | 'mcp' | 'ai' | 'audit' | 'agent-byok';

/* ---------- Reusable: section header ---------- */
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
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.12 }}
      className="text-text-secondary text-base md:text-lg mt-4 leading-relaxed"
    >
      {desc}
    </motion.p>
  </div>
);

/* ---------- Reusable: ambient backdrop ---------- */
const AmbientBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
        backgroundSize: '44px 44px',
      }}
    />
    <motion.div
      className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full blur-3xl"
      style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%)' }}
      animate={{ opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

const TAB_ORDER: SimulatorTab[] = ['import','variables','fuzz','load','mock','mcp','agent-byok','ai','audit'];

export const SolutionsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SimulatorTab>('import');
  const [autoPlay, setAutoPlay] = useState(true);

  /* ---------------- state (unchanged behavior) ---------------- */
  const [importFormat, setImportFormat] = useState<'openapi' | 'postman' | 'har' | 'insomnia' | 'curl' | 'graphql'>('openapi');
  const [resolvedVar, setResolvedVar] = useState<'local' | 'env' | 'collection' | 'project' | 'global'>('local');

  const [isFuzzing, setIsFuzzing] = useState(false);
  const [fuzzProgress, setFuzzProgress] = useState(0);
  const [fuzzLogs, setFuzzLogs] = useState<string[]>([]);
  const [fuzzVulns, setFuzzVulns] = useState<string[]>([]);

  const [vuCount, setVuCount] = useState(250);
  const [isRunningLoad, setIsRunningLoad] = useState(false);
  const [loadMetrics, setLoadMetrics] = useState({ rps: 0, latency: 0, errors: 0 });

  const [mockLatency, setMockLatency] = useState(150);
  const [mockStatus, setMockStatus] = useState<200 | 429 | 500>(200);
  const [mockEmails, setMockEmails] = useState<string[]>(['beta@partner.com']);
  const [mockEmailInput, setMockEmailInput] = useState('');
  const [mockProxy, setMockProxy] = useState(false);

  const [mcpMode, setMcpMode] = useState<'bridge' | 'mock' | 'inspect'>('bridge');

  const [byokMode, setByokMode] = useState<'single' | 'seq' | 'parallel' | 'supervisor'>('single');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  /* ---------------- fuzz runner ---------------- */
  useEffect(() => {
    if (!isFuzzing) return;
    setFuzzProgress(0);
    setFuzzLogs(['[FUZZ] Initializing parameter mutation scan...']);
    setFuzzVulns([]);
    const steps = [
      { log: '[MUTATION] Testing Local variable swaps on /v1/user/{{id}}', time: 400 },
      { log: '[MUTATION] Injecting SQLi payloads: `id=999 OR 1=1` on /v1/auth', time: 800 },
      { log: '[WARNING] BOLA: Swapped user token A → B on PUT /v1/billing', time: 1200, vuln: 'Broken Object Level Authorization (IDOR) detected' },
      { log: '[MUTATION] Checking CORS policies on Origin headers', time: 1600 },
      { log: '[MUTATION] Injecting XSS payloads into search params', time: 2000 },
      { log: '[SUCCESS] Mutator run completed. Swapped 380 states.', time: 2400 },
    ];
    const t = steps.map(s => setTimeout(() => {
      setFuzzLogs(p => [...p, s.log]);
      if (s.vuln) setFuzzVulns(p => [...p, s.vuln]);
      setFuzzProgress(p => Math.min(p + 20, 100));
    }, s.time));
    const f = setTimeout(() => { setIsFuzzing(false); setFuzzProgress(100); }, 2600);
    return () => { t.forEach(clearTimeout); clearTimeout(f); };
  }, [isFuzzing]);

  /* ---------------- load runner ---------------- */
  useEffect(() => {
    if (!isRunningLoad) return;
    const i = setInterval(() => {
      setLoadMetrics({
        rps: Math.floor(vuCount * 7.5 + Math.random() * 40),
        latency: Math.floor(75 + (vuCount / 12) + Math.random() * 18),
        errors: Math.random() > 0.95 ? 1 : 0,
      });
    }, 450);
    return () => clearInterval(i);
  }, [isRunningLoad, vuCount]);

  const handleRunAgent = () => {
    setIsTestingAgent(true);
    setAgentLogs(['[BYOK] Model initialized using client-provided API key...']);
    const steps = [
      { log: `[BYOK] Mode: ${byokMode.toUpperCase()}`, time: 300 },
      { log: '[AGENT] Executing prompt: "Verify contract parameters & mock endpoints"', time: 800 },
      { log: '[AGENT] Tool call: get_mock_schema("checkout-v2")', time: 1300 },
      { log: '[AGENT] ReAct loop: mock schema matches spec.', time: 1800 },
      { log: '[SUCCESS] Agent run completed with 100% assertion matches.', time: 2300 },
    ];
    steps.forEach(s => setTimeout(() => setAgentLogs(p => [...p, s.log]), s.time));
    setTimeout(() => setIsTestingAgent(false), 2500);
  };

  const handleAddMockEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (mockEmailInput.trim() && !mockEmails.includes(mockEmailInput)) {
      setMockEmails([...mockEmails, mockEmailInput.trim()]);
      setMockEmailInput('');
    }
  };

  /* ---------------- AUTO-PLAY: cycle tabs + trigger per-step demos ---------------- */
  useEffect(() => {
    if (!autoPlay) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let nextDelay = 5000;

    if (activeTab === 'import') {
      const keys = ['openapi','postman','insomnia','har','curl','graphql'] as const;
      keys.forEach((k, i) => timers.push(setTimeout(() => setImportFormat(k), 200 + i * 900)));
      nextDelay = 200 + keys.length * 900 + 600;
    } else if (activeTab === 'variables') {
      const levels = ['local','env','collection','project','global'] as const;
      levels.forEach((k, i) => timers.push(setTimeout(() => setResolvedVar(k), 200 + i * 700)));
      nextDelay = 200 + levels.length * 700 + 500;
    } else if (activeTab === 'fuzz') {
      timers.push(setTimeout(() => setIsFuzzing(true), 300));
      nextDelay = 4200;
    } else if (activeTab === 'load') {
      timers.push(setTimeout(() => setIsRunningLoad(true), 200));
      [120, 380, 640, 880].forEach((v, i) => timers.push(setTimeout(() => setVuCount(v), 500 + i * 900)));
      timers.push(setTimeout(() => setIsRunningLoad(false), 4600));
      nextDelay = 5200;
    } else if (activeTab === 'mock') {
      const statuses = [200, 429, 500, 200] as const;
      statuses.forEach((s, i) => timers.push(setTimeout(() => setMockStatus(s), 200 + i * 800)));
      [80, 450, 1100, 300].forEach((v, i) => timers.push(setTimeout(() => setMockLatency(v), 300 + i * 800)));
      timers.push(setTimeout(() => setMockProxy(true), 1600));
      timers.push(setTimeout(() => setMockProxy(false), 3600));
      nextDelay = 4600;
    } else if (activeTab === 'mcp') {
      const modes = ['bridge','mock','inspect'] as const;
      modes.forEach((m, i) => timers.push(setTimeout(() => setMcpMode(m), 200 + i * 1100)));
      nextDelay = 200 + modes.length * 1100 + 500;
    } else if (activeTab === 'agent-byok') {
      const modes = ['single','seq','parallel','supervisor'] as const;
      modes.forEach((m, i) => timers.push(setTimeout(() => setByokMode(m), 200 + i * 700)));
      timers.push(setTimeout(() => setApiKeySet(true), 1500));
      timers.push(setTimeout(() => handleRunAgent(), 1800));
      nextDelay = 5400;
    } else {
      nextDelay = 4500;
    }

    const advance = setTimeout(() => {
      setActiveTab(prev => {
        const idx = TAB_ORDER.indexOf(prev);
        return TAB_ORDER[(idx + 1) % TAB_ORDER.length];
      });
    }, nextDelay);

    return () => { timers.forEach(clearTimeout); clearTimeout(advance); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, autoPlay]);

  /* ---------------- import formats meta ---------------- */
  const importFormats = [
    { key: 'openapi',  label: 'OpenAPI / Swagger', icon: FileJson,  ext: '.yaml · .json', desc: 'OpenAPI 3.x & Swagger 2.0 — auto-maps endpoints, generates request/response JSON schemas, infers auth.' },
    { key: 'postman',  label: 'Postman Collection', icon: Boxes,    ext: 'v2.0 · v2.1',   desc: 'Drop a Postman export — folder auth headers, pre-request scripts, and environments resolve cleanly.' },
    { key: 'insomnia', label: 'Insomnia Export',    icon: FileText, ext: '.json · .yaml', desc: 'Full Insomnia v4 import including workspaces, environment groups, and base environments.' },
    { key: 'har',      label: 'HAR Browser Dump',   icon: Network,  ext: '.har',          desc: 'Drop a DevTools HAR — cookies, redirect chains and request bodies become reusable requests.' },
    { key: 'curl',     label: 'Raw cURL',           icon: Terminal, ext: 'paste string',  desc: 'Paste any cURL line from a terminal or browser copy — parsed into a structured request.' },
    { key: 'graphql',  label: 'GraphQL Schema',     icon: GitBranch,ext: '.graphql · SDL',desc: 'Introspect a GraphQL endpoint or import SDL — queries, mutations & fragments scaffold automatically.' },
  ] as const;

  const tabs = [
    { id: 'import',     label: '1. Specs Import',         icon: FileCode2 },
    { id: 'variables',  label: '2. Variable Resolution',  icon: Database },
    { id: 'fuzz',       label: '3. Security (OWASP)',     icon: Shield },
    { id: 'load',       label: '4. Stress & SLA',         icon: Zap },
    { id: 'mock',       label: '5. Mock Sandbox',         icon: Server },
    { id: 'mcp',        label: '6. MCP Studio',           icon: Terminal },
    { id: 'agent-byok', label: '7. AI Agents (BYOK)',     icon: Cpu },
    { id: 'ai',         label: '8. Assistant & Chatbot',  icon: Sparkles },
    { id: 'audit',      label: '9. Audit Trails',         icon: ListTodo },
  ] as const;
  
  const integrations = useMemo(()=>[
    { name:'OpenAPI',     desc:'Spec parser',           key:'openapi',       brandColor:'#6BA539' },
    { name:'Postman',     desc:'Collection import',     key:'postman',       brandColor:'#FF6C37' },
    { name:'Insomnia',    desc:'Environment import',    key:'insomnia',      brandColor:'#5849BE' },
    { name:'Swagger',     desc:'OAS reader',            key:'swagger',       brandColor:'#85EA2D' },
    { name:'GraphQL',     desc:'SDL introspection',     key:'graphql',       brandColor:'#E10098' },
    { name:'GitHub',      desc:'Actions CI step',       key:'github',        brandColor:'#181717' },
    { name:'GitLab',      desc:'Pipeline runner',       key:'gitlab',        brandColor:'#FC6D26' },
    { name:'Jira',        desc:'Bug ticketing',         key:'jira',          brandColor:'#0052CC' },
    { name:'Slack',       desc:'Incident channel',      key:'slack',         brandColor:'#4A154B' },
    { name:'PagerDuty',   desc:'SRE alert route',       key:'pagerduty',     brandColor:'#06AC38' },
    { name:'Datadog',     desc:'Metrics forwarder',     key:'datadog',       brandColor:'#632CA6' },
    { name:'Okta',        desc:'SSO provider',          key:'okta',          brandColor:'#007DC1' },
    { name:'OpenAI',      desc:'LLM testing key',       key:'openai',        brandColor:'#412991' },
    { name:'Anthropic',   desc:'Claude evaluator',      key:'anthropic',     brandColor:'#D97757' },
    { name:'Vercel',      desc:'Preview deploy hooks',  key:'vercel',        brandColor:'#000000' },
    { name:'Cloudflare',  desc:'Edge worker mocks',     key:'cloudflare',    brandColor:'#F38020' },
  ],[]);

  /* ============================================================
   INTEGRATION CARD
   ============================================================ */
const IntegrationCard: React.FC<{ name:string; desc:string; keyName:string; brandColor:string; delay:number }> = ({ name, desc, keyName, brandColor, delay }) => {
  const [hover, setHover] = useState(false);
  const color = hover ? brandColor.replace('#','') : '8a8f98';
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={hover ? { boxShadow: `0 8px 30px -10px ${brandColor}55`, borderColor: `${brandColor}66` } : undefined}
      className="rounded-xl border border-border bg-card/40 backdrop-blur p-4 transition-all flex items-center gap-3 cursor-pointer hover:bg-card/60"
    >
      <img
        src={`https://cdn.simpleicons.org/${keyName}/${color}`}
        alt={`${name} logo`}
        className="w-6 h-6 shrink-0 transition-all duration-300"
      />
      <div>
        <div className="text-sm font-bold text-text-primary">{name}</div>
        <div className="text-[11px] text-text-secondary mt-0.5">{desc}</div>
      </div>
    </motion.div>
  );
};


  return (
    <div className="min-h-screen bg-background text-text-primary">
      <LandingNavbar />

      <main className="relative">
        {/* ===================== HERO ===================== */}
        <section className="relative overflow-hidden pt-32 pb-24">
          <AmbientBackdrop />
          <div className="relative max-w-6xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold tracking-wider uppercase"
            >
              <Layers className="w-3.5 h-3.5" /> Solutions Suite
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]"
            >
              The Unified API Testing &{' '}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent">
                Observability Console
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-text-secondary text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            >
              Design mock servers, run functional contract validation, generate load profiles,
              and trigger OWASP security audits — all under unified collaborative Projects.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                onClick={() => navigate('/projects/collections')}
                style={{ boxShadow: '0 10px 40px -10px color-mix(in oklab, var(--primary) 60%, transparent)' }}
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-white font-semibold text-sm hover:opacity-90 transition-all"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#simulator"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border bg-card/40 backdrop-blur text-text-primary text-sm font-semibold hover:border-primary/40 transition-all"
              >
                Try the live simulator
              </a>
            </motion.div>
          </div>
        </section>

        {/* ===================== INTERACTIVE SIMULATOR ===================== */}
        <section id="simulator" className="relative py-20">
          <div className="max-w-8xl mx-auto px-20">
            <SectionHeader
              chip="What you actually click. Not a render."
              title={<>See the Workflow <span className="text-primary">in Action</span></>}
              desc="Click through the pipeline panels below to inspect ForgeFuzz's real-time testing capabilities."
            />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl border border-border bg-card/40 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.4)]"
            >
              {/* console chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/60">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-[11px] font-mono text-text-secondary">forgefuzz · runner stage</span>
                <button
                  onClick={() => setAutoPlay(p => !p)}
                  className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                    autoPlay
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-card/40 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <motion.span
                    className={`w-1.5 h-1.5 rounded-full ${autoPlay ? 'bg-primary' : 'bg-text-secondary'}`}
                    animate={autoPlay ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  {autoPlay ? 'AUTO-PLAY' : 'PAUSED'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
                {/* sidebar tabs */}
                <aside className="border-b lg:border-b-0 lg:border-r border-border p-3 bg-card/30 max-h-[520px] overflow-y-auto">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as SimulatorTab); setAutoPlay(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold mb-1 transition-all ${
                          active
                            ? 'bg-primary/10 text-primary border-l-2 border-primary'
                            : 'text-text-secondary hover:bg-surface/60 border-l-2 border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </aside>

                {/* main panel */}
                <div className="p-6 md:p-8 min-h-[520px] relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >

                      {/* === 1. IMPORT === */}
                      {activeTab === 'import' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 01</div>
                            <h3 className="text-2xl font-bold mb-2">Import any spec, any collection, any format</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              ForgeFuzz is format-agnostic — just like Postman, but broader. Drop an OpenAPI/Swagger
                              file, a Postman collection, Insomnia export, HAR dump, raw cURL or GraphQL SDL.
                              We auto-detect, parse, map endpoints, generate JSON schemas, and seed your environments
                              in seconds. No retyping. No manual conversion. Bring whatever your team already uses.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                            {importFormats.map(f => {
                              const Icon = f.icon;
                              const active = importFormat === f.key;
                              return (
                                <button
                                  key={f.key}
                                  onClick={() => { setImportFormat(f.key as any); setAutoPlay(false); }}
                                  style={active ? { boxShadow: '0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent)' } : undefined}
                                  className={`relative p-3 rounded-xl border text-left transition-all ${
                                    active
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:border-primary/40 hover:bg-surface/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-text-secondary'}`} />
                                    <span className="text-[10px] font-mono text-text-secondary">{f.ext}</span>
                                  </div>
                                  <div className={`text-sm font-semibold ${active ? 'text-primary' : 'text-text-primary'}`}>
                                    {f.label}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <motion.div
                            key={importFormat}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-surface/40 p-4"
                          >
                            <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                              {importFormats.find(f => f.key === importFormat)?.desc}
                            </p>
                            <div className="font-mono text-[11px] text-success flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              {importFormat === 'openapi'  && <span>[OK] Mapped 14 endpoints · generated JSON schemas for PUT/POST payloads · resolved 3 securitySchemes.</span>}
                              {importFormat === 'postman'  && <span>[OK] Imported 24 requests across 4 folders · resolved Bearer auth · linked 2 environments.</span>}
                              {importFormat === 'insomnia' && <span>[OK] Insomnia collection loaded · 5 environment scope constants · 12 requests normalized.</span>}
                              {importFormat === 'har'      && <span>[OK] Decoded HAR · extracted 38 XHRs · cookies & headers preserved · noise filtered.</span>}
                              {importFormat === 'curl'     && <span>[OK] Parsed cURL · method, URL, headers and body promoted into a reusable request.</span>}
                              {importFormat === 'graphql'  && <span>[OK] Introspected schema · 47 queries · 12 mutations · 3 subscriptions scaffolded.</span>}
                            </div>
                          </motion.div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {['Auto-detect', 'Schema inference', 'Auth mapping', 'Env extraction', 'Bulk URL rewrite'].map(t => (
                              <span key={t} className="text-[10px] px-2 py-1 rounded-full border border-border bg-card/40 text-text-secondary">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* === 2. VARIABLES === */}
                      {activeTab === 'variables' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 02</div>
                            <h3 className="text-2xl font-bold mb-2">5-Level Scope Resolution Order</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              No more hardcoded parameters. Variables resolve through a strict precedence tree —
                              Local overrides Environment, which overrides Collection, Project, and finally Global.
                              Click any scope below to preview how a token resolves at runtime.
                            </p>
                          </div>

                          <div className="space-y-2">
                            {[
                              { level: 'local',      title: 'Local (Highest Override)', desc: 'Payload swaps, JWT injections, fuzzer mutants.' },
                              { level: 'env',        title: 'Environment',              desc: 'Staging, sandbox, dev hostnames, proxy URLs.' },
                              { level: 'collection', title: 'Collection',               desc: 'Auth strings & folder-level configurations.' },
                              { level: 'project',    title: 'Project',                  desc: 'Project-wide secrets, team DB keys, API keys.' },
                              { level: 'global',     title: 'Global (Lowest Priority)', desc: 'System-wide fallback values.' },
                            ].map(item => (
                              <button
                                key={item.level}
                                onClick={() => setResolvedVar(item.level as any)}
                                className={`w-full p-3 rounded-lg border text-left flex justify-between items-center transition-all ${
                                  resolvedVar === item.level
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-surface/40'
                                }`}
                              >
                                <div>
                                  <div className="text-sm font-semibold">{item.title}</div>
                                  <div className="text-[11px] text-text-secondary mt-0.5">{item.desc}</div>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border text-text-secondary">
                                  SCOPE
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* === 3. FUZZ === */}
                      {activeTab === 'fuzz' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 03</div>
                            <h3 className="text-2xl font-bold mb-2">OWASP Security Mutator Scan</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              Auto-fuzz parameters across every endpoint to surface CORS leaks, SQL injection paths,
                              and BOLA authorization gaps. Live trace below.
                            </p>
                          </div>

                          <div className="flex items-center gap-3 mb-4">
                            <button
                              onClick={() => setIsFuzzing(true)}
                              disabled={isFuzzing}
                              className="px-4 py-2 bg-success hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-md"
                            >
                              {isFuzzing ? 'Fuzzing…' : 'Trigger Mutator Engine'}
                            </button>
                            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-primary to-success"
                                animate={{ width: `${fuzzProgress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-text-secondary w-10 text-right">{fuzzProgress}%</span>
                          </div>

                          <div className="rounded-lg border border-border bg-black/40 p-4 font-mono text-[11px] max-h-[280px] overflow-y-auto">
                            {fuzzLogs.map((log, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-text-secondary"
                              >
                                {log}
                              </motion.div>
                            ))}
                            {fuzzVulns.map((v, i) => (
                              <motion.div
                                key={`v-${i}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-danger mt-1 flex items-center gap-2"
                              >
                                <AlertTriangle className="w-3 h-3" /> [ALERT] {v}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* === 4. LOAD === */}
                      {activeTab === 'load' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 04</div>
                            <h3 className="text-2xl font-bold mb-2">Multi-VU Concurrent Performance SLA</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              Stress-profile endpoints under virtual user spikes. Slide to adjust VUs and run.
                            </p>
                          </div>

                          <div className="mb-5">
                            <div className="flex justify-between text-[11px] font-mono text-text-secondary mb-2">
                              <span>CONCURRENT VIRTUAL USERS (VUs)</span>
                              <span className="text-primary font-bold">{vuCount} VUs</span>
                            </div>
                            <input
                              type="range" min={10} max={1000} step={10}
                              value={vuCount}
                              onChange={e => setVuCount(Number(e.target.value))}
                              className="w-full h-1 bg-surface border border-border rounded-lg accent-primary"
                            />
                          </div>

                          <button
                            onClick={() => setIsRunningLoad(!isRunningLoad)}
                            className={`px-4 py-2 text-xs font-bold rounded-md mb-5 ${
                              isRunningLoad ? 'bg-danger text-white' : 'bg-primary text-white'
                            }`}
                          >
                            {isRunningLoad ? 'Stop Load Runner' : 'Launch SLA Load Test'}
                          </button>

                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'THROUGHPUT', val: isRunningLoad ? `${loadMetrics.rps} RPS` : '0 RPS' },
                              { label: 'LATENCY (p95)', val: isRunningLoad ? `${loadMetrics.latency} ms` : '--' },
                              { label: 'ERRORS', val: isRunningLoad ? loadMetrics.errors : 0 },
                            ].map(m => (
                              <div key={m.label} className="rounded-lg border border-border bg-surface/40 p-4">
                                <div className="text-[10px] font-mono text-text-secondary">{m.label}</div>
                                <div className="text-xl font-bold text-primary mt-1">{m.val}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* === 5. MOCK === */}
                      {activeTab === 'mock' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 05</div>
                            <h3 className="text-2xl font-bold mb-2">Mock Sandbox Server Settings</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              Spin up mock servers with proxy fallbacks, custom error overrides, and email
                              whitelists for secure partner access.
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <div>
                                <div className="flex justify-between text-[11px] font-mono text-text-secondary mb-2">
                                  <span>CHAOS LATENCY OVERRIDE</span>
                                  <span className="text-primary font-bold">{mockLatency} ms</span>
                                </div>
                                <input
                                  type="range" min={0} max={2000} step={50}
                                  value={mockLatency}
                                  onChange={e => setMockLatency(Number(e.target.value))}
                                  className="w-full h-1 bg-surface border border-border rounded-lg accent-primary"
                                />
                              </div>

                              <div>
                                <div className="text-[11px] font-mono text-text-secondary mb-2">STATUS OVERRIDES</div>
                                <div className="flex gap-2">
                                  {([200, 429, 500] as const).map(c => (
                                    <button
                                      key={c}
                                      onClick={() => setMockStatus(c)}
                                      className={`px-3 py-1 rounded text-[11px] border font-mono ${
                                        mockStatus === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'
                                      }`}
                                    >
                                      {c}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface/40">
                                <span className="text-xs font-semibold">Proxy fallback → upstream</span>
                                <button
                                  onClick={() => setMockProxy(!mockProxy)}
                                  className={`w-9 h-5 rounded-full relative transition-colors ${mockProxy ? 'bg-success' : 'bg-surface border border-border'}`}
                                >
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${mockProxy ? 'left-[18px]' : 'left-0.5'}`} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] font-mono text-text-secondary mb-2">EMAIL WHITELIST (PRIVATE ACCESS)</div>
                              <form onSubmit={handleAddMockEmail} className="flex gap-2 mb-2">
                                <input
                                  placeholder="email@partner.com"
                                  value={mockEmailInput}
                                  onChange={e => setMockEmailInput(e.target.value)}
                                  className="flex-1 bg-surface border border-border px-2 py-1 rounded text-xs"
                                />
                                <button type="submit" className="px-3 py-1 bg-primary text-white text-xs rounded font-bold">Add</button>
                              </form>
                              <div className="flex flex-wrap gap-2">
                                {mockEmails.map((e, i) => (
                                  <span key={i} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] border border-primary/20">{e}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* === 6. MCP === */}
                      {activeTab === 'mcp' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 06</div>
                            <h3 className="text-2xl font-bold mb-2">Model Context Protocol (MCP) Studio</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              Connect & inspect MCP servers. Bridge MCP↔REST, run mock MCP servers, and audit
                              schema parameters in real time.
                            </p>
                          </div>

                          <div className="flex gap-2 mb-4">
                            {[
                              { key: 'bridge', label: 'MCP-REST Bridge' },
                              { key: 'mock',   label: 'Mock MCP Server' },
                              { key: 'inspect',label: 'MCP Inspector' },
                            ].map(i => (
                              <button
                                key={i.key}
                                onClick={() => setMcpMode(i.key as any)}
                                className={`px-3 py-1.5 rounded text-[11px] font-bold border ${
                                  mcpMode === i.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'
                                }`}
                              >
                                {i.label}
                              </button>
                            ))}
                          </div>

                          <div className="rounded-lg border border-border bg-black/40 p-4 font-mono text-[11px] space-y-1">
                            {mcpMode === 'bridge' && (
                              <>
                                <div className="text-text-secondary">// Spawning MCP REST bridge on http://localhost:8085/api/mcp</div>
                                <div className="text-success">✓ REST endpoint mapped: POST /api/mcp/tools/filesystem_read</div>
                              </>
                            )}
                            {mcpMode === 'mock' && (
                              <>
                                <div className="text-text-secondary">// Mocking MCP server capabilities...</div>
                                <div className="text-success">✓ Injected 4 simulated prompts and 6 resources.</div>
                              </>
                            )}
                            {mcpMode === 'inspect' && (
                              <>
                                <div className="text-text-secondary">// MCP Inspector log trail:</div>
                                <div className="text-success">[INSPECT] Connected to MCP host · Tool: filesystem_write · Status: OK</div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* === 7. BYOK === */}
                      {activeTab === 'agent-byok' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 07</div>
                            <h3 className="text-2xl font-bold mb-2">Bring Your Own Key — Agentic Testing</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              Supply your own LLM API key to run agentic tests, sequential workflows, parallel
                              runs, or supervisor agents over your test plans.
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 mb-4">
                            {[
                              { key: 'single', label: 'Single Agent' },
                              { key: 'seq', label: 'Sequential' },
                              { key: 'parallel', label: 'Parallel' },
                              { key: 'supervisor', label: 'Supervisor' },
                            ].map(i => (
                              <button
                                key={i.key}
                                onClick={() => setByokMode(i.key as any)}
                                className={`p-2.5 rounded-lg border text-sm font-bold ${
                                  byokMode === i.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'
                                }`}
                              >
                                {i.label}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 mb-4">
                            <KeyRound className="w-4 h-4 text-text-secondary" />
                            <span className="text-xs text-text-secondary">API KEY STATUS:</span>
                            <button
                              onClick={() => setApiKeySet(!apiKeySet)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                apiKeySet ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                              }`}
                            >
                              {apiKeySet ? 'KEY ACTIVE (BYOK)' : 'NO KEY SET'}
                            </button>
                          </div>

                          <div className="rounded-lg border border-border bg-black/40 p-4 font-mono text-[11px] max-h-[180px] overflow-y-auto mb-3">
                            {agentLogs.map((log, i) => (
                              <div key={i} className="text-text-secondary">{log}</div>
                            ))}
                          </div>
                          <button
                            onClick={handleRunAgent}
                            disabled={isTestingAgent || !apiKeySet}
                            className="px-4 py-2 bg-primary disabled:opacity-50 text-white text-xs font-bold rounded-md"
                          >
                            {isTestingAgent ? 'Agent active…' : 'Execute Agent Scenario'}
                          </button>
                        </div>
                      )}

                      {/* === 8. AI === */}
                      {activeTab === 'ai' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 08</div>
                            <h3 className="text-2xl font-bold mb-2">AI Request Assistant & Error Chatbot</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              When a runner fails, an AI chatbot pops up to auto-debug your logs and explain
                              the root cause in plain English.
                            </p>
                          </div>

                          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 mb-3 flex items-center gap-2 text-sm text-danger">
                            <AlertTriangle className="w-4 h-4" /> Error 401 — Unauthorized on POST /v1/orders
                          </div>
                          <div className="rounded-lg border border-border bg-surface/40 p-4">
                            <div className="text-[10px] font-mono text-text-secondary mb-2">// AI Chatbot analysis</div>
                            <p className="text-sm text-text-primary leading-relaxed">
                              "Your request failed because the Authorization header was missing a valid Bearer
                              prefix. ForgeFuzz resolves the local token <code className="text-primary">bearer_local_fuzz_auth</code> which
                              is currently empty. Initialize a Local variable to resolve."
                            </p>
                          </div>
                        </div>
                      )}

                      {/* === 9. AUDIT === */}
                      {activeTab === 'audit' && (
                        <div>
                          <div className="mb-6">
                            <div className="text-[10px] font-bold tracking-widest text-primary mb-2">STEP 09</div>
                            <h3 className="text-2xl font-bold mb-2">Enterprise Audit Trails & Logs</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                              Every workspace action is recorded for security compliance, categorized by
                              severity threshold.
                            </p>
                          </div>

                          <div className="space-y-2">
                            {[
                              { time: '17:15:34', action: 'Project Owner transferred ownership to admin@company.com', sev: 'CRITICAL', color: 'bg-danger/20 text-danger border-danger/40' },
                              { time: '17:12:12', action: 'Whitelisted developer email partner@acme.com on mock sandbox', sev: 'HIGH', color: 'bg-warning/20 text-warning border-warning/40' },
                              { time: '17:09:45', action: 'Imported new OpenAPI schema checkout-spec.json', sev: 'INFO', color: 'bg-success/20 text-success border-success/40' },
                            ].map((l, i) => (
                              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface/40">
                                <div className="text-xs text-text-secondary">
                                  <span className="font-mono text-text-primary">{l.time}</span> · {l.action}
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${l.color}`}>{l.sev}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/60 text-[10px] font-mono text-text-secondary">
                <span>https://forgefuzz.com/capabilities</span>
                <span>INTELLIGENT RUNNER STAGE</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===================== PLATFORM AT A GLANCE ===================== */}
        <section className="relative py-24">
          <AmbientBackdrop />
          <div className="relative max-w-8xl mx-auto px-20">
            <SectionHeader
              chip="Platform At A Glance"
              title={<>Six foundational <span className="text-primary">testing pipelines</span></>}
              desc="Verify structural contract compliance, performance SLAs, and security postures — all from one workspace."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Users2,   title: 'Projects & Member Access',     desc: 'Group endpoints, environments and mocks under collaborative projects with granular role-based permissions.' },
                { icon: FileCode2,title: 'cURL, Postman & HAR Imports',  desc: 'Import directly from Swagger/OpenAPI, HAR dumps, Postman collections, or raw cURL — no retyping.' },
                { icon: Terminal, title: 'Command Line Runner',          desc: 'Run testing suites from your terminal or trigger fuzz checks inside GitHub Actions and GitLab pipelines.' },
                { icon: Database, title: 'Five-Level Variable Scopes',   desc: 'Hierarchical parameters: Local → Env → Collection → Project → Global resolution precedence.' },
                { icon: Shield,   title: 'OWASP Security Fuzzing',       desc: 'Active mutations to discover BOLA, SQL injection, CORS misconfigurations and auth loopholes.' },
                { icon: Cpu,      title: 'Agentic AI Testing',           desc: 'Deploy your own LLM keys to auto-generate assertions, explain incidents and adapt to spec changes.' },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="group relative rounded-2xl border border-border bg-card/40 backdrop-blur p-6 hover:border-primary/40 transition-all overflow-hidden"
                  >
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{c.title}</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{c.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== INTEGRATIONS ===================== */}
        <section className="relative py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              chip="Enterprise Ecosystem"
              title={<>Integrates with <span className="text-primary">everything</span> you ship</>}
              desc="Hover each logo to see the brand come alive. Every tool in your stack — wired in one click."
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {integrations.map((p,i)=>(
  <IntegrationCard
    key={p.key}
    name={p.name}
    desc={p.desc}
    keyName={p.key}
    brandColor={p.brandColor}
    delay={i*0.025}
  />
))}
            </div>
          </div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <section className="relative py-28 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 25%, transparent), transparent 60%)' }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                backgroundSize: '44px 44px',
              }}
            />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl font-bold tracking-tight"
            >
              Start verifying your API contracts <span className="text-primary">today</span>
            </motion.h2>
            <p className="mt-5 text-text-secondary text-lg">
              Create cooperative projects, run fuzz scans, and align team schemas inside the ultimate dev environment.
            </p>
            <button
              onClick={() => navigate('/projects/collections')}
              style={{ boxShadow: '0 18px 60px -10px color-mix(in oklab, var(--primary) 70%, transparent)' }}
              className="group mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90 transition-all"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default SolutionsPage;
