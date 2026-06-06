import React, { useEffect, useRef, useState } from "react";
import "@/styles/landing.css";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/sections/LandingFooter";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  ArrowRight,
  Sparkles,
  Activity,
  Globe2,
  Settings,
  Share2,
  Sliders,
  Shield,
  Send,
  Plus,
  Copy,
  ExternalLink,
  Lock,
  Users2,
  Zap,
  GitCompare,
  FileJson,
  PlayCircle,
  Layers,
  CircleDot,
  Check,
  Upload,
  FolderPlus,
  Webhook,
  Clock,
  AlertTriangle,
  Filter,
  Eye,
  Code2,
  ListChecks,
  KeyRound,
  ChevronRight,
  Loader2,
  Download,
  FileCode,
  FileText,
  Package,
} from "lucide-react";

/* ============================================================== *
 *  AMBIENT BACKDROP (hero only)                                  *
 * ============================================================== */
const Backdrop: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
  >
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    />
    <motion.div
      className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full blur-3xl"
      style={{
        background:
          "radial-gradient(circle, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%)",
      }}
      animate={{ opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
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
 *  TINY PRIMITIVES                                               *
 * ============================================================== */
const Spinner: React.FC<{ className?: string }> = ({
  className = "w-3.5 h-3.5",
}) => <Loader2 className={`${className} animate-spin text-primary`} />;

/** Animated count from 0 → target. Re-runs on `trigger` change. */
const CountUp: React.FC<{
  value: number;
  duration?: number;
  trigger: number;
  className?: string;
}> = ({ value, duration = 1200, trigger, className }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, trigger]);
  return <span className={className}>{n.toLocaleString()}</span>;
};

/* ============================================================== *
 *  FEATURE PILLARS                                               *
 * ============================================================== */
type Feature = {
  icon: React.ElementType;
  title: string;
  tagline: string;
  desc: string;
  bullets: string[];
};

const FEATURES: Feature[] = [
  {
    icon: Sliders,
    title: "Endpoint rules & matchers",
    tagline: "method + path + variants",
    desc: "Configure a mock as a list of rules — method + path pattern + response. Resolve variants by query string, header, JSONPath body assertions, or weighted first-match strategies.",
    bullets: [
      "Query / header / JSONPath matchers",
      "Weighted & first-match strategies",
      "Multiple response variants per rule",
    ],
  },
  {
    icon: Shield,
    title: "Real-server-grade validation",
    tagline: "auth · content-type · schema",
    desc: "Validate incoming requests like a production server. Enforce auth tokens, content-type, JSON Schema and JSONPath assertions before any handler runs.",
    bullets: [
      "Bearer / API key / Basic auth",
      "JSON Schema request validation",
      "JSONPath assertions on body",
    ],
  },
  {
    icon: Zap,
    title: "Inject chaos & latency",
    tagline: "error rate · spikes · jitter",
    desc: "Test retries, timeouts and circuit breakers by injecting realistic failure modes — fixed or jittered latency, error-rate percentages, and override status codes.",
    bullets: [
      "Error rate slider with status override",
      "Fixed or jittered latency",
      "Active windows for A/B rollouts",
    ],
  },
  {
    icon: GitCompare,
    title: "Contract diff vs upstream",
    tagline: "catch drift before it ships",
    desc: "Compare mock responses against your real upstream and surface schema drift — added, removed and type-mismatched fields — before the contract breaks frontend clients.",
    bullets: [
      "Field-level add / remove / drift",
      "Type & enum compatibility checks",
      "Promote mock when diff is clean",
    ],
  },
  {
    icon: Webhook,
    title: "Proxy fallback & record mode",
    tagline: "capture once, replay forever",
    desc: "When no rule matches, transparently proxy to a real upstream and (optionally) record the response as a new endpoint draft — perfect for record-replay testing.",
    bullets: [
      "Forward unmatched to upstream",
      "Auto-capture as endpoint draft",
      "Pair record + proxy for replay",
    ],
  },
  {
    icon: Lock,
    title: "Zero-trust grant access",
    tagline: "Public · Org · Private",
    desc: "Toggle visibility per mock. Keep private mocks locked to project members and whitelist specific emails for partner integrations without leaking the runtime URL.",
    bullets: [
      "Public, Org or Private visibility",
      "Email-level share grants",
      "Quick-grant from project members",
    ],
  },
];

/* ============================================================== *
 *  HOSTED-URL HERO MOCK CARD                                     *
 * ============================================================== */
const UrlCard: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const url = "https://forgefuzz.com/api/v1/mocks/products-api-v1-3770bf";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative w-full max-w-3xl mx-auto mt-10 rounded-2xl border border-primary/25 bg-card/60 backdrop-blur-xl p-5 overflow-hidden"
      style={{
        boxShadow:
          "0 30px 90px -50px color-mix(in oklab, var(--primary) 45%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
        <Activity className="w-3.5 h-3.5 text-primary" /> Hosted mock base URL
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px]">
          <CircleDot className="w-3 h-3" /> Public
        </span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-sm text-text-primary truncate">
          {url}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:border-primary/50 text-xs"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:opacity-90">
          <ExternalLink className="w-3.5 h-3.5" /> Open
        </button>
      </div>
    </motion.div>
  );
};

/* ============================================================== *
 *  INTERACTIVE CONSOLE                                           *
 * ============================================================== */
type ConsoleTab =
  | "overview"
  | "endpoints"
  | "runner"
  | "settings"
  | "sharing"
  | "export";

const STATS = [
  { label: "TOTAL", value: 1284, tone: "primary" },
  { label: "MATCHED", value: 1259, tone: "success" },
  { label: "UNMATCHED", value: 17, tone: "danger" },
  { label: "PROXIED", value: 42, tone: "info" },
  { label: "RATE-LIMITED", value: 8, tone: "warning" },
  { label: "AVG LATENCY", value: 142, tone: "muted", suffix: " ms" },
];

const toneClass = (t: string) => {
  switch (t) {
    case "success":
      return "border-success/30 text-success";
    case "danger":
      return "border-danger/30 text-danger";
    case "info":
      return "border-primary/30 text-primary";
    case "warning":
      return "border-yellow-400/30 text-yellow-300";
    case "muted":
      return "border-border text-text-secondary";
    default:
      return "border-primary/30 text-primary";
  }
};

const TAB_ORDER: ConsoleTab[] = [
  "overview",
  "endpoints",
  "runner",
  "settings",
  "sharing",
  "export",
];

const Console: React.FC = () => {
  const [tab, setTab] = useState<ConsoleTab>("overview");
  const [autoPlay, setAutoPlay] = useState(true);

  const tabs: { id: ConsoleTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "endpoints", label: "Endpoints", icon: Layers },
    { id: "runner", label: "Runner", icon: Send },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "sharing", label: "Sharing", icon: Share2 },
    { id: "export", label: "Export", icon: Download },
  ];

  const advance = () => {
    setTab((prev) => {
      const i = TAB_ORDER.indexOf(prev);
      return TAB_ORDER[(i + 1) % TAB_ORDER.length];
    });
  };
  const onComplete = autoPlay ? advance : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-3xl border border-primary/15 bg-card/50 backdrop-blur-xl overflow-hidden"
      style={{
        boxShadow:
          "0 40px 120px -60px color-mix(in oklab, var(--primary) 40%, transparent), 0 0 0 1px color-mix(in oklab, var(--primary) 8%, transparent) inset",
      }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="ml-3 text-[11px] font-mono text-text-secondary truncate">
          forgefuzz.com / projects / mocks / products-api
        </span>
      </div>

      <div className="grid grid-cols-12 min-h-[600px]">
        {/* Left rail */}
        <aside className="col-span-12 lg:col-span-3 border-r border-border bg-card/40 p-3">
          <div className="flex items-center justify-between mb-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> Mock
            </span>
            <ChevronRight className="w-3.5 h-3.5 rotate-180 opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-border hover:border-primary/50 text-xs">
              <FolderPlus className="w-3.5 h-3.5" /> Create
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-border hover:border-primary/50 text-xs">
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
          </div>
          <input
            placeholder="Search mock servers"
            className="w-full bg-surface/60 border border-border rounded-md px-2.5 py-1.5 text-xs mb-3 focus:border-primary outline-none"
          />
          <div className="space-y-1.5">
            <div className="px-2 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-xs font-semibold flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Products API
              </span>
              <span className="text-[10px] text-success inline-flex items-center gap-1">
                <Globe2 className="w-3 h-3" />3
              </span>
            </div>
            {[
              { m: "GET", p: "/products", s: 200 },
              { m: "GET", p: "/products/A1", s: 200 },
              { m: "GET", p: "/products/XX", s: 404 },
            ].map((r, i) => (
              <motion.div
                key={r.p}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-mono text-text-secondary hover:bg-surface/60"
              >
                <span>
                  <span className="text-success">{r.m}</span> {r.p}
                </span>
                <span
                  className={r.s === 200 ? "text-success" : "text-yellow-300"}
                >
                  {r.s}
                </span>
              </motion.div>
            ))}
            <div className="px-2 py-1.5 mt-2 rounded-md border border-border text-xs flex items-center justify-between text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Users API
              </span>
              <span className="text-[10px] inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />4
              </span>
            </div>
          </div>
        </aside>

        {/* Main pane */}
        <section className="col-span-12 lg:col-span-9 p-5">
          {/* Mock header */}
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Products API Mock</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px]">
                  <Globe2 className="w-3 h-3" /> Public
                </span>
              </div>
              <code className="block text-[11px] font-mono text-text-secondary mt-1">
                https://forgefuzz.com/api/v1/mocks/products-api-v1-3770bf
              </code>
            </div>
            <span className="ml-auto text-[11px] text-text-secondary">
              3 endpoints
            </span>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-border mb-5">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setAutoPlay(false);
                    setTab(t.id);
                  }}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${active ? "text-primary" : "text-text-secondary hover:text-text-primary"}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                  {active && (
                    <motion.span
                      layoutId="mock-tab-underline"
                      className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setAutoPlay((a) => !a)}
              className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider transition ${autoPlay ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-primary/40"}`}
              title={autoPlay ? "Pause auto demo" : "Resume auto demo"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${autoPlay ? "bg-primary animate-pulse" : "bg-text-secondary"}`}
              />
              {autoPlay ? "Auto" : "Paused"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {tab === "overview" && <OverviewPanel onComplete={onComplete} />}
              {tab === "endpoints" && (
                <EndpointsPanel onComplete={onComplete} />
              )}
              {tab === "runner" && <RunnerPanel onComplete={onComplete} />}
              {tab === "settings" && <SettingsPanel onComplete={onComplete} />}
              {tab === "sharing" && <SharingPanel onComplete={onComplete} />}
              {tab === "export" && <ExportPanel onComplete={onComplete} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
};

type PanelProps = { onComplete?: () => void };

/* ---------- OVERVIEW (animated counters) ---------- */
const OverviewPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [trigger] = useState(() => Date.now());
  useEffect(() => {
    if (!onComplete) return;
    const id = setTimeout(onComplete, 4200);
    return () => clearTimeout(id);
  }, [onComplete]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <div className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold mb-2 inline-flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-primary" /> Mock base URL
        </div>
        <code className="block font-mono text-sm text-text-primary truncate">
          https://forgefuzz.com/api/v1/mocks/products-api-v1-3770bf
        </code>
        <p className="text-xs text-text-secondary mt-2">
          Live stats aggregated over the last 24 hours of traffic.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-lg border ${toneClass(s.tone)} bg-card/40 p-3`}
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
              {s.label}
            </div>
            <div className="text-xl font-bold mt-1 tabular-nums">
              <CountUp value={s.value} duration={1400} trigger={trigger} />
              {(s as any).suffix ?? ""}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold inline-flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Endpoints{" "}
            <span className="text-text-secondary">3</span>
          </span>
          <button className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Manage all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {[
            { m: "GET", p: "/products", s: 200 },
            { m: "GET", p: "/products/A1", s: 200 },
            { m: "GET", p: "/products/XX", s: 404 },
          ].map((r, i) => (
            <motion.div
              key={r.p}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center justify-between px-3 py-2 rounded-md border border-border bg-card/30 text-xs font-mono"
            >
              <span className="inline-flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success border border-success/30">
                  {r.m}
                </span>
                {r.p}
              </span>
              <span
                className={r.s === 200 ? "text-success" : "text-yellow-300"}
              >
                {r.s}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- ENDPOINTS (each subtab runs spinner → content) ---------- */
const EP_TABS = [
  "Response",
  "Variants",
  "Matchers",
  "Validation",
  "Chaos",
  "Active window",
] as const;
type EpTab = (typeof EP_TABS)[number];

const EndpointsPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [epTab, setEpTab] = useState<EpTab>("Response");
  const [phase, setPhase] = useState<"loading" | "done">("loading");

  // Cycle through subtabs: loading (1.1s) → done (1.4s) → next
  useEffect(() => {
    setPhase("loading");
    const t1 = setTimeout(() => setPhase("done"), 1100);
    const t2 = setTimeout(() => {
      const i = EP_TABS.indexOf(epTab);
      if (i < EP_TABS.length - 1) {
        setEpTab(EP_TABS[i + 1]);
      } else if (onComplete) {
        onComplete();
      }
    }, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [epTab, onComplete]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold inline-flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Endpoints{" "}
          <span className="text-text-secondary">3</span>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add endpoint
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/40">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success border border-success/30">
            GET
          </span>
          <code className="text-xs font-mono">/products</code>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">
            200
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 px-3 pt-2 border-b border-border">
          {EP_TABS.map((t) => {
            const active = epTab === t;
            return (
              <button
                key={t}
                onClick={() => setEpTab(t)}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-t-md transition relative inline-flex items-center gap-1.5 ${active ? "text-primary" : "text-text-secondary hover:text-text-primary"}`}
              >
                {active && phase === "loading" && (
                  <Spinner className="w-3 h-3" />
                )}
                {t}
                {active && (
                  <motion.span
                    layoutId="ep-underline"
                    className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 min-h-[260px]">
          <AnimatePresence mode="wait">
            {phase === "loading" ? (
              <motion.div
                key={`${epTab}-load`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3 text-xs text-text-secondary"
              >
                <Spinner className="w-5 h-5" />
                <span className="font-mono">
                  Loading {epTab.toLowerCase()}…
                </span>
                <div className="w-48 h-0.5 bg-border/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1 }}
                    className="h-full bg-primary"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`${epTab}-done`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <EpSubContent tab={epTab} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const EpSubContent: React.FC<{ tab: EpTab }> = ({ tab }) => {
  if (tab === "Response") {
    const json = `[
  { "sku": "A1", "name": "T-Shirt", "price": 19.99, "stock": 412 },
  { "sku": "A2", "name": "Mug",     "price":  9.99, "stock": 1083 }
]`;
    return (
      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4">
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1">
              Status code
            </div>
            <div className="px-2 py-1.5 rounded border border-success/30 bg-success/10 text-success text-sm font-mono">
              200
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1">
              Body
            </div>
            <div className="px-2 py-1.5 rounded border border-border bg-surface/60 text-sm font-mono">
              json
            </div>
          </div>
        </div>
        <motion.pre
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-md border border-border bg-[#0a0a0f]/60 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-text-secondary"
        >
          {json}
        </motion.pre>
      </div>
    );
  }

  if (tab === "Variants") {
    const variants = [
      { name: "found", code: 200, w: 1 },
      { name: "not found", code: 404, w: 1 },
      { name: "flash sale", code: 200, w: 2 },
      { name: "server err", code: 500, w: 1 },
    ];
    return (
      <div className="space-y-2">
        <div className="text-[11px] text-text-secondary mb-2">
          Selection strategy:{" "}
          <span className="text-text-primary">First match (default)</span>
        </div>
        {variants.map((v, i) => (
          <motion.div
            key={v.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.18 }}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/40 text-xs"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: i * 0.18 + 0.1,
                type: "spring",
                stiffness: 240,
              }}
              className="w-4 h-4 rounded-full bg-success/20 border border-success/40 inline-flex items-center justify-center"
            >
              <Check className="w-2.5 h-2.5 text-success" />
            </motion.span>
            <span className="flex-1 font-mono">{v.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] border font-mono ${
                v.code === 200
                  ? "border-success/30 text-success"
                  : v.code === 404
                    ? "border-yellow-300/30 text-yellow-300"
                    : "border-danger/30 text-danger"
              }`}
            >
              {v.code}
            </span>
            <span className="text-text-secondary">w {v.w}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (tab === "Matchers") {
    const ms = [
      { label: "Query", key: "sku", op: "eq", val: "A1" },
      { label: "Header", key: "X-Api-Version", op: "startsWith", val: "2." },
      { label: "JSONPath", key: "$.cart.items[*].qty", op: "gte", val: "1" },
    ];
    return (
      <div className="space-y-3 text-xs">
        <p className="text-text-secondary">
          Endpoint fires only when every matcher passes.
        </p>
        {ms.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/40 font-mono"
          >
            <span className="px-1.5 py-0.5 rounded text-[10px] border border-primary/30 text-primary">
              {m.label}
            </span>
            <span>{m.key}</span>
            <span className="text-text-secondary">{m.op}</span>
            <span className="text-text-primary">{m.val}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (tab === "Validation") {
    const vs = [
      {
        i: KeyRound,
        t: "Auth",
        d: "Bearer token required · audience: products-api",
      },
      {
        i: FileJson,
        t: "Content-Type",
        d: "application/json (reject mismatched payloads)",
      },
      {
        i: ListChecks,
        t: "JSON Schema",
        d: "products.schema.json · 14 properties · 3 required",
      },
      {
        i: Filter,
        t: "JSONPath asserts",
        d: "$.items[*].sku ∈ /^[A-Z][0-9]+$/",
      },
    ];
    return (
      <div className="space-y-2 text-xs">
        {vs.map((v, i) => {
          const Icon = v.i;
          return (
            <motion.div
              key={v.t}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card/40"
            >
              <Icon className="w-4 h-4 text-primary" />
              <span className="font-semibold w-40">{v.t}</span>
              <span className="text-text-secondary font-mono">{v.d}</span>
              <Check className="ml-auto w-3.5 h-3.5 text-success" />
            </motion.div>
          );
        })}
      </div>
    );
  }

  if (tab === "Chaos") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
            <span>Error rate</span>
            <span>12%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "12%" }}
              transition={{ duration: 1 }}
              className="h-full bg-danger"
            />
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
            Error status
          </div>
          <div className="px-2 py-1.5 mt-1 rounded border border-danger/30 bg-danger/10 text-danger font-mono w-24 text-center">
            500
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
            Latency (ms)
          </div>
          <div className="px-2 py-1.5 mt-1 rounded border border-border bg-surface/60 font-mono">
            250
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
            Jitter ± (ms)
          </div>
          <div className="px-2 py-1.5 mt-1 rounded border border-border bg-surface/60 font-mono">
            80
          </div>
        </div>
        <p className="md:col-span-2 text-text-secondary">
          Inject realistic failure modes — perfect for testing retries, timeouts
          and circuit breakers.
        </p>
      </div>
    );
  }

  // Active window
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
          Starts at (ISO)
        </div>
        <div className="px-2 py-1.5 mt-1 rounded border border-border bg-surface/60 font-mono">
          2026-06-10 09:00
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
          Ends at (ISO)
        </div>
        <div className="px-2 py-1.5 mt-1 rounded border border-border bg-surface/60 font-mono">
          2026-06-12 18:00
        </div>
      </div>
      <p className="md:col-span-2 text-text-secondary">
        Endpoint is only active during this window — perfect for maintenance
        windows or scheduled A/B rollouts.
      </p>
    </div>
  );
};

/* ---------- RUNNER (auto-click Send → spinner → JSON) ---------- */
const RunnerPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"idle" | "sending" | "done">("idle");

  useEffect(() => {
    setPhase("idle");
    const t1 = setTimeout(() => setPhase("sending"), 600);
    const t2 = setTimeout(() => setPhase("done"), 2100);
    const t3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const json = `[
  { "sku": "A1", "name": "T-Shirt", "price": 19.99, "stock":  412 },
  { "sku": "A2", "name": "Mug",     "price":  9.99, "stock": 1083 },
  { "sku": "A3", "name": "Sticker", "price":  2.49, "stock": 9120 }
]`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
          Endpoint
        </span>
        <div className="px-3 py-1.5 rounded-md border border-border bg-surface/60 text-xs font-mono">
          GET /products
        </div>
        <span className="ml-auto text-[11px] text-text-secondary">
          Status: <span className="text-success">enabled</span>
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
        <span className="px-2 py-1 rounded bg-success/15 text-success text-[10px] font-bold border border-success/30">
          GET
        </span>
        <code className="flex-1 text-xs font-mono text-text-secondary truncate">
          https://forgefuzz.com/api/v1/mocks/products-api-v1-3770bf/products
        </code>
        <motion.button
          animate={phase === "sending" ? { scale: [1, 0.92, 1] } : {}}
          transition={{ duration: 0.4 }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            phase === "idle"
              ? "bg-primary text-white"
              : phase === "sending"
                ? "bg-primary/70 text-white"
                : "bg-success/20 text-success border border-success/40"
          }`}
        >
          {phase === "sending" ? (
            <Spinner className="w-3.5 h-3.5 text-white" />
          ) : phase === "done" ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {phase === "sending"
            ? "Sending…"
            : phase === "done"
              ? "Sent"
              : "Send"}
        </motion.button>
      </div>

      <div className="rounded-xl border border-border bg-surface/40 overflow-hidden min-h-[220px]">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-card/40 text-[11px] font-mono">
          <span className="text-text-secondary">RESPONSE</span>
          <AnimatePresence mode="wait">
            {phase === "done" ? (
              <motion.div
                key="meta"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <span className="px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">
                  200
                </span>
                <span className="text-text-secondary">142 ms</span>
                <span className="text-text-secondary">339 B</span>
              </motion.div>
            ) : (
              <span className="text-text-secondary inline-flex items-center gap-2">
                <Spinner className="w-3 h-3" />
                {phase === "sending" ? "awaiting response…" : "idle"}
              </span>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {phase === "done" ? (
            <motion.pre
              key="json"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-3 text-[11px] font-mono leading-relaxed text-text-secondary overflow-x-auto"
            >
              {json}
            </motion.pre>
          ) : (
            <motion.div
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-3 text-xs text-text-secondary"
            >
              {phase === "sending" && <Spinner className="w-5 h-5" />}
              <span className="font-mono">
                {phase === "idle"
                  ? "Click Send to fire a real request →"
                  : "Receiving JSON…"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ---------- SETTINGS (toggles animate in) ---------- */
const SettingsPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [proxy, setProxy] = useState(false);
  const [rate, setRate] = useState(true);
  const [record, setRecord] = useState(false);

  // Auto-flip a toggle mid-demo so it feels alive
  useEffect(() => {
    const t1 = setTimeout(() => setProxy(true), 1100);
    const t2 = setTimeout(() => setRecord(true), 1900);
    const t3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const Row: React.FC<{
    icon: React.ElementType;
    title: string;
    desc: string;
    idx: number;
    children?: React.ReactNode;
  }> = ({ icon: Icon, title, desc, idx, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="rounded-xl border border-border bg-card/40 p-4"
    >
      <div className="flex items-start gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-text-secondary">{desc}</div>
        </div>
      </div>
      {children}
    </motion.div>
  );
  const Toggle: React.FC<{
    on: boolean;
    onClick: () => void;
    label: string;
  }> = ({ on, onClick, label }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-xs"
    >
      <span
        className={`w-8 h-4 rounded-full relative transition ${on ? "bg-primary" : "bg-surface border border-border"}`}
      >
        <motion.span
          animate={{ x: on ? 16 : 2 }}
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
        />
      </span>
      {label}
    </button>
  );
  return (
    <div className="space-y-3">
      <Row
        icon={Clock}
        title="Latency"
        desc="Inject artificial delay before responding."
        idx={0}
      >
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="px-2 py-1.5 rounded border border-border bg-surface/60 font-mono">
            Fixed
          </div>
          <div className="px-2 py-1.5 rounded border border-border bg-surface/60 font-mono">
            250 ms
          </div>
        </div>
      </Row>
      <Row
        icon={Webhook}
        title="Proxy fallback"
        desc="Forward unmatched requests to a real upstream."
        idx={1}
      >
        <Toggle
          on={proxy}
          onClick={() => setProxy(!proxy)}
          label="Enable proxy"
        />
      </Row>
      <Row
        icon={AlertTriangle}
        title="Rate limit"
        desc="Token-bucket per IP — exceeds return 429."
        idx={2}
      >
        <Toggle
          on={rate}
          onClick={() => setRate(!rate)}
          label="Enable rate-limit"
        />
      </Row>
      <Row
        icon={Eye}
        title="Record mode"
        desc="Auto-capture unmatched real requests as endpoint drafts."
        idx={3}
      >
        <Toggle
          on={record}
          onClick={() => setRecord(!record)}
          label="Record unmatched as new endpoints"
        />
      </Row>
    </div>
  );
};

/* ---------- SHARING (cycles public → org → private, reveals grants) ---------- */
const SHARE_OPTS: {
  id: "public" | "org" | "private";
  icon: React.ElementType;
  label: string;
  desc: string;
}[] = [
  {
    id: "public",
    icon: Globe2,
    label: "Public",
    desc: "Anyone with the URL can hit this mock — no auth, no org restriction.",
  },
  {
    id: "org",
    icon: Users2,
    label: "Org",
    desc: "Only authenticated users in your organisation can hit this mock.",
  },
  {
    id: "private",
    icon: Lock,
    label: "Private",
    desc: "Only project members and explicit share grants. Most restrictive.",
  },
];

const SharingPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [vis, setVis] = useState<"public" | "org" | "private">("public");

  useEffect(() => {
    const t1 = setTimeout(() => setVis("org"), 1200);
    const t2 = setTimeout(() => setVis("private"), 2400);
    const t3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold mb-1">Visibility</div>
        <div className="text-[11px] text-text-secondary mb-3">
          Who can call this mock's runtime URL. Changes apply immediately.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SHARE_OPTS.map((o) => {
            const Icon = o.icon;
            const active = vis === o.id;
            return (
              <motion.button
                key={o.id}
                onClick={() => setVis(o.id)}
                animate={active ? { scale: [1, 1.03, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={`text-left rounded-xl border p-3 transition ${active ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={`w-4 h-4 ${active ? "text-primary" : "text-text-secondary"}`}
                  />
                  <span className="text-sm font-semibold">{o.label}</span>
                  {active && (
                    <span className="ml-auto text-[10px] text-primary uppercase">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-secondary leading-relaxed">
                  {o.desc}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {vis === "private" && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/30 bg-card/40 p-4">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <Users2 className="w-4 h-4 text-primary" /> Share grants{" "}
                <span className="text-text-secondary text-xs">2</span>
              </div>
              <div className="text-[11px] text-text-secondary mt-1 mb-3">
                Whitelist specific emails. They'll be able to hit this mock URL
                even when visibility is PRIVATE.
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  placeholder="user@example.com"
                  className="flex-1 bg-surface/60 border border-border rounded-md px-3 py-2 text-xs focus:border-primary outline-none"
                />
                <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-white text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Grant
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["partner@acme.com", "mobile-dev@forgefuzz.io"].map((e, i) => (
                  <motion.div
                    key={e}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.12 }}
                    className="flex items-center justify-between rounded-md border border-border bg-surface/60 px-3 py-2 text-xs font-mono"
                  >
                    <span>{e}</span>
                    <span className="text-[10px] text-success inline-flex items-center gap-1">
                      <CircleDot className="w-2.5 h-2.5" /> active
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------- EXPORT (cycle through formats) ---------- */
const EXPORT_FORMATS: {
  id: string;
  label: string;
  ext: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  {
    id: "forgefuzz",
    label: "ForgeFuzz",
    ext: ".ff.json",
    icon: Package,
    desc: "Native export — full fidelity for re-import into ForgeFuzz.",
  },
  {
    id: "postman",
    label: "Postman",
    ext: ".postman.json",
    icon: Send,
    desc: "Postman Collection v2.1 — open straight in Postman.",
  },
  {
    id: "insomnia",
    label: "Insomnia",
    ext: ".insomnia.json",
    icon: FileJson,
    desc: "Insomnia v4 export — endpoints + environments.",
  },
  {
    id: "openapi-json",
    label: "OpenAPI 3 (JSON)",
    ext: ".openapi.json",
    icon: FileCode,
    desc: "Standards-compliant OpenAPI 3.1 specification.",
  },
  {
    id: "openapi-yml",
    label: "OpenAPI 3 (YAML)",
    ext: ".openapi.yml",
    icon: FileText,
    desc: "Same OpenAPI 3.1 spec, YAML formatting for VCS diffs.",
  },
  {
    id: "har",
    label: "HAR archive",
    ext: ".har",
    icon: Activity,
    desc: "HTTP Archive — recorded request/response pairs.",
  },
];

const ExportPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSel((s) => {
        if (s >= EXPORT_FORMATS.length - 1) {
          clearInterval(id);
          if (onComplete) setTimeout(onComplete, 1200);
          return s;
        }
        return s + 1;
      });
    }, 750);
    return () => clearInterval(id);
  }, [onComplete]);

  const active = EXPORT_FORMATS[sel];
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold mb-1">Export mock</div>
        <div className="text-[11px] text-text-secondary">
          Download this mock's full definition — endpoints, variants, matchers,
          validation, chaos & windows — in any standard format.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {EXPORT_FORMATS.map((f, i) => {
          const Icon = f.icon;
          const isActive = i === sel;
          return (
            <motion.button
              key={f.id}
              onClick={() => setSel(i)}
              animate={isActive ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.35 }}
              className={`text-left rounded-lg border p-3 transition flex items-start gap-3 ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card/40 hover:border-primary/40"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                  isActive
                    ? "bg-primary/20 border border-primary/40"
                    : "bg-surface/60 border border-border"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-primary" : "text-text-secondary"}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">
                    {f.label}
                  </span>
                  <span className="text-[10px] font-mono text-text-secondary">
                    {f.ext}
                  </span>
                  {isActive && (
                    <Check className="ml-auto w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                  {f.desc}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="rounded-xl border border-primary/20 bg-card/40 p-4 flex flex-wrap items-center gap-3">
        <Download className="w-4 h-4 text-primary" />
        <div className="text-xs">
          <div className="font-semibold">products-api-mock{active.ext}</div>
          <div className="text-[11px] text-text-secondary font-mono">
            Format: {active.label}
          </div>
        </div>
        <button className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold">
          <Download className="w-3.5 h-3.5" /> Download
        </button>
      </div>
    </div>
  );
};

/* ============================================================== *
 *  PAGE                                                          *
 * ============================================================== */
export const MockSandboxPage: React.FC = () => {
  const navigate = useNavigate();

  const probeRef = useRef<HTMLSpanElement>(null);
  const [resolvedPrimary, setResolvedPrimary] = useState("rgb(99, 102, 241)");
  useEffect(() => {
    if (probeRef.current) {
      const c = window.getComputedStyle(probeRef.current).color;
      if (c) setResolvedPrimary(c);
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-text-primary"
      style={{ ["--primary" as string]: resolvedPrimary }}
    >
      <span ref={probeRef} className="text-primary sr-only" aria-hidden>
        .
      </span>
      <LandingNavbar />

      {/* HERO — combined: mock servers + create-a-mock */}
      <section className="relative pt-32 pb-20 px-6">
        <Backdrop />
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold tracking-wider uppercase mb-6"
          >
            <Server className="w-3.5 h-3.5" /> Mock servers · Create mocks
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
          >
            Spin up hosted fake APIs in seconds
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-6 max-w-2xl mx-auto text-text-secondary leading-relaxed mb-10"
          >
            Start blank, clone a collection, or import an OpenAPI/Postman spec.
            Define endpoint rules, validate like a real server, inject chaos,
            and run contract diff against upstream — all behind one stable
            public URL.
          </motion.p>

          {/* <UrlCard /> */}

          {/* <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/projects/mocks')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Create a mock server
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border hover:border-primary/50 text-sm">
              <Upload className="w-4 h-4" /> Import OpenAPI / Postman
            </button>
          </div> */}
        </div>
        <div className="relative max-w-8xl mx-auto px-20">
          <Console />
        </div>
      </section>

      {/* Three starting points  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-8xl mx-auto px-20">
        {[
          {
            icon: FolderPlus,
            t: "Start blank",
            d: "Empty mock with one stub endpoint. Configure rules, variants and chaos as you go.",
          },
          {
            icon: Layers,
            t: "Clone a collection",
            d: "Seed every saved request as an endpoint with its last successful response baked in.",
          },
          {
            icon: Upload,
            t: "Import a spec",
            d: "OpenAPI 2/3, Postman, Insomnia, HAR or ForgeFuzz export — every operation becomes a live endpoint.",
          },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.t}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5 hover:border-primary/40 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm font-semibold mb-1">{c.t}</div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {c.d}
              </p>
            </motion.div>
          );
        })}
      </div>
      {/* INTERACTIVE CONSOLE */}
      {/* <section className="relative px-6 py-20 border-border/60">
        <div className="relative max-w-7xl mx-auto">
          <SectionHeader
            chip="Live console"
            title={<>What you actually click. Not a render.</>}
            desc="Six workspace tabs — Overview, Endpoints, Runner, Settings, Sharing and Export — mirror the real ForgeFuzz mock console. The demo auto-plays each tab through its real lifecycle: counters tick up, endpoint subtabs load their content, the runner fires an actual Send, sharing toggles through visibility tiers, and export cycles every format."
          />
          <Console />
        </div>
      </section> */}

      {/* FEATURE PILLARS */}
      <section className="relative px-6 py-20 border-border/60">
        <div className="relative max-w-8xl mx-auto px-20">
          <SectionHeader
            chip="What a mock can do"
            title={<>Production-grade mocks, not toy stubs</>}
            desc="Every mock is backed by a real validator, chaos engine and visibility layer — the same primitives the rest of ForgeFuzz uses for live testing."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="group relative shadow-md rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5 hover:border-primary/40 transition overflow-hidden"
                >
                  <motion.div
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition"
                    style={{
                      background:
                        "color-mix(in oklab, var(--primary) 30%, transparent)",
                    }}
                  />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">
                      {f.tagline}
                    </div>
                    <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed mb-3">
                      {f.desc}
                    </p>
                    <ul className="space-y-1.5">
                      {f.bullets.map((b, i) => (
                        <motion.li
                          key={b}
                          initial={{ opacity: 0, x: -6 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.05 + i * 0.1 + 0.2 }}
                          className="flex items-start gap-2 text-[11px] text-text-secondary"
                        >
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{b}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RUNTIME URL strip */}
      <section className="relative px-6 border-border/60">
        <div className="relative max-w-5xl shadow-xs mx-auto rounded-2xl border border-primary/20 bg-card/40 backdrop-blur-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2 inline-flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" /> Runtime URL
              </div>
              <h3 className="text-xl font-semibold mb-1">
                Hit endpoints at a stable URL
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Every mock gets a persistent runtime URL — point your frontend,
                mobile app, or CI tests at it and the rules, validators, chaos
                and visibility settings apply automatically.
              </p>
            </div>
            <code className="block md:max-w-sm font-mono text-xs bg-surface/60 border border-border rounded-md p-3 text-text-secondary">
              http://localhost:8085/api/v1/
              <br />
              mocks/&#123;slug&#125;/...
            </code>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative px-6 py-24 border-border/60">
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
          >
            Decouple client and server teams. Ship faster.
          </motion.h2>
          <p className="mt-5 text-text-secondary">
            Build frontends without waiting on a backend. Run contract tests
            without staging. Demo features before they exist.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/projects/mocks")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90"
            >
              Launch mock console <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/features")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border hover:border-primary/50 text-sm"
            >
              <PlayCircle className="w-4 h-4" /> See all features
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default MockSandboxPage;
