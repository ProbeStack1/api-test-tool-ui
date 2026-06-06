import React, { useEffect, useRef, useState } from "react";
import "@/styles/landing.css";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/sections/LandingFooter";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ArrowRight,
  Sparkles,
  Activity,
  Globe2,
  Settings,
  Share2,
  Sliders,
  Shield,
  Plus,
  Copy,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Zap,
  GitCompare,
  FileJson,
  PlayCircle,
  Layers,
  CircleDot,
  Check,
  Webhook,
  Clock,
  AlertTriangle,
  Filter,
  KeyRound,
  ChevronRight,
  Code2,
  Loader2,
  Download,
  FileCode,
  FileText,
  Package,
  Variable,
  Bot,
  MessageSquare,
  Wand2,
  ListChecks,
  Network,
  Database,
  X,
  Terminal,
  Wifi,
  ShieldCheck,
  Server,
  Boxes,
  Workflow,
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

const CountUp: React.FC<{
  value: number;
  duration?: number;
  trigger: number;
  className?: string;
  suffix?: string;
}> = ({ value, duration = 1200, trigger, className, suffix = "" }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, trigger]);
  return (
    <span className={className}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
};

/** Types out a string character by character. */
const TypeOut: React.FC<{
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
  trigger?: number;
}> = ({ text, speed = 22, className, onDone, trigger = 0 }) => {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, trigger]);
  return (
    <span className={className}>
      {out}
      <span className="inline-block w-[2px] h-[0.9em] bg-primary align-[-2px] ml-[1px] animate-pulse" />
    </span>
  );
};

/* ============================================================== *
 *  HERO URL CARD                                                 *
 * ============================================================== */
const HeroRequestCard: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const url = "{{Base_URL}}/users";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative w-full max-w-3xl mx-auto mt-10 rounded-2xl border border-primary/25 bg-card/60 backdrop-blur-xl p-3 overflow-hidden"
      style={{
        boxShadow:
          "0 30px 90px -50px color-mix(in oklab, var(--primary) 45%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="px-3 py-2 rounded-md border border-success/40 bg-success/10 text-success text-xs font-mono font-bold">
          GET
        </span>
        <code className="flex-1 font-mono text-sm text-text-primary truncate px-2">
          {url}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border hover:border-primary/50 text-xs"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-xs font-semibold hover:opacity-90">
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </div>
    </motion.div>
  );
};

/* ============================================================== *
 *  INTERACTIVE CONSOLE                                           *
 * ============================================================== */
type ConsoleTab =
  | "builder"
  | "variables"
  | "response"
  | "debug"
  | "snippets"
  | "ai";
const TAB_ORDER: ConsoleTab[] = [
  "builder",
  "variables",
  "response",
  "debug",
  "snippets",
  "ai",
];

const Console: React.FC = () => {
  const [tab, setTab] = useState<ConsoleTab>("builder");
  const [autoPlay, setAutoPlay] = useState(true);

  const tabs: { id: ConsoleTab; label: string; icon: React.ElementType }[] = [
    { id: "builder", label: "Builder", icon: Send },
    { id: "variables", label: "Variables", icon: Variable },
    { id: "response", label: "Response", icon: FileJson },
    { id: "debug", label: "Debug Info", icon: Terminal },
    { id: "snippets", label: "Code", icon: Code2 },
    { id: "ai", label: "AI Assist", icon: Bot },
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
          "0 40px 120px -60px color-mix(in oklab, var(--color-primary) 40%, transparent), 0 0 0 1px color-mix(in oklab, var(--primary) 8%, transparent) inset",
      }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="ml-3 text-[11px] font-mono text-text-secondary truncate">
          forgefuzz.com / projects / collections / list-users
        </span>
      </div>

      <div className="grid grid-cols-12 min-h-[640px]">
        {/* Left rail — Collections */}
        <aside className="col-span-12 lg:col-span-3 border-r border-border bg-card/40 p-3">
          <div className="flex items-center justify-between mb-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5" /> Collections
            </span>
            <ChevronRight className="w-3.5 h-3.5 rotate-180 opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-border hover:border-primary/50 text-xs">
              <Plus className="w-3.5 h-3.5" /> Create
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-border hover:border-primary/50 text-xs">
              <Download className="w-3.5 h-3.5 rotate-180" /> Import
            </button>
          </div>
          <input
            placeholder="Search collections"
            className="w-full bg-surface/60 border border-border rounded-md px-2.5 py-1.5 text-xs mb-3 focus:border-primary outline-none"
          />
          <div className="space-y-1.5">
            <div className="px-2 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-xs font-semibold flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> collection
              </span>
              <span className="text-[10px] text-success">6</span>
            </div>
            {[
              { m: "GET", p: "List Users", tone: "text-success" },
              { m: "GET", p: "Get User By Id", tone: "text-success" },
              { m: "POST", p: "Create Post", tone: "text-yellow-300" },
              { m: "PUT", p: "Update Post", tone: "text-blue-300" },
              { m: "DELETE", p: "Delete Post", tone: "text-danger" },
              { m: "GET", p: "req", tone: "text-success" },
            ].map((r, i) => (
              <motion.div
                key={r.p}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] font-mono hover:bg-surface/60 ${i === 0 ? "bg-primary/5" : ""}`}
              >
                <span className={`${r.tone} font-bold w-12`}>{r.m}</span>
                <span className="text-text-secondary">{r.p}</span>
              </motion.div>
            ))}
          </div>
        </aside>

        {/* Main pane */}
        <section className="col-span-12 lg:col-span-9 p-5">
          {/* Request header */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-2 py-1 rounded text-[10px] font-bold bg-success/15 text-success border border-success/30">
              GET
            </span>
            <code className="text-sm font-mono text-text-primary">
              List Users
            </code>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] ml-2">
              <CircleDot className="w-3 h-3" /> 200 OK
            </span>
            <span className="ml-auto text-[10px] text-text-secondary font-mono">
              853 ms · 5.51 KB
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
                      layoutId="req-tab-underline"
                      className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setAutoPlay((a) => !a)}
              className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider transition ${autoPlay ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-primary/40"}`}
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
              {tab === "builder" && <BuilderPanel onComplete={onComplete} />}
              {tab === "variables" && (
                <VariablesPanel onComplete={onComplete} />
              )}
              {tab === "response" && <ResponsePanel onComplete={onComplete} />}
              {tab === "debug" && <DebugPanel onComplete={onComplete} />}
              {tab === "snippets" && <SnippetsPanel onComplete={onComplete} />}
              {tab === "ai" && <AiPanel onComplete={onComplete} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
};

type PanelProps = { onComplete?: () => void };

/* ============================================================== *
 *  BUILDER PANEL                                                 *
 * ============================================================== */
const BUILDER_SUBS = ["Params", "Headers", "Body", "Auth", "Tests"] as const;
type BSub = (typeof BUILDER_SUBS)[number];

const BuilderPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [sub, setSub] = useState<BSub>("Params");
  const [phase, setPhase] = useState<"loading" | "done">("loading");

  useEffect(() => {
    setPhase("loading");
    const t1 = setTimeout(() => setPhase("done"), 700);
    const t2 = setTimeout(() => {
      const i = BUILDER_SUBS.indexOf(sub);
      if (i < BUILDER_SUBS.length - 1) setSub(BUILDER_SUBS[i + 1]);
      else onComplete?.();
    }, 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [sub, onComplete]);

  return (
    <div className="space-y-4">
      {/* URL bar */}
      <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-surface/40">
        <button className="px-3 py-2 rounded-md border border-success/40 bg-success/10 text-success text-xs font-mono font-bold">
          GET ▾
        </button>
        <div className="flex-1 px-3 py-2 rounded-md bg-card/60 border border-border font-mono text-sm overflow-hidden">
          <TypeOut
            text="{{Base_URL}}/users"
            speed={28}
            trigger={Date.now()}
            className="text-primary"
          />
        </div>
        <button className="px-4 py-2 rounded-md bg-primary text-white text-xs font-semibold inline-flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" /> Send
        </button>
        <button className="px-3 py-2 rounded-md border border-border text-xs">
          Save
        </button>
      </div>

      {/* Subtabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {BUILDER_SUBS.map((t) => {
          const active = sub === t;
          return (
            <button
              key={t}
              onClick={() => setSub(t)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-t-md transition relative inline-flex items-center gap-1.5 ${active ? "text-primary" : "text-text-secondary hover:text-text-primary"}`}
            >
              {active && phase === "loading" && <Spinner className="w-3 h-3" />}
              {t}
              {active && (
                <motion.span
                  layoutId="builder-sub-underline"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-[280px]">
        <AnimatePresence mode="wait">
          {phase === "loading" ? (
            <motion.div
              key={`${sub}-load`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-3 text-xs text-text-secondary"
            >
              <Spinner className="w-5 h-5" />
              <span className="font-mono">Opening {sub.toLowerCase()}…</span>
            </motion.div>
          ) : (
            <motion.div
              key={`${sub}-done`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <BuilderSub sub={sub} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const BuilderSub: React.FC<{ sub: BSub }> = ({ sub }) => {
  if (sub === "Params") {
    return (
      <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border">
          Query parameters for the request URL
        </div>
        <table className="w-full text-xs font-mono">
          <thead className="text-[10px] uppercase tracking-wider text-text-secondary">
            <tr>
              <th className="text-left px-3 py-2 w-8"></th>
              <th className="text-left px-3 py-2">Key</th>
              <th className="text-left px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {[
              { k: "_limit", v: "20" },
              { k: "_sort", v: "name" },
              { k: "_order", v: "asc" },
            ].map((r, i) => (
              <motion.tr
                key={r.k}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className="border-t border-border/60"
              >
                <td className="px-3 py-2">
                  <div className="w-3 h-3 rounded-sm border border-success/40 bg-success/10" />
                </td>
                <td className="px-3 py-2 text-text-primary">{r.k}</td>
                <td className="px-3 py-2 text-primary">{r.v}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (sub === "Headers") {
    return (
      <div className="rounded-xl border border-border bg-surface/40 p-3 space-y-1.5 text-xs font-mono">
        {[
          { k: "Accept", v: "application/json" },
          { k: "User-Agent", v: "ForgeFuzz/1.0" },
          { k: "Authorization", v: "Bearer {{token}}", hl: true },
          { k: "X-Trace-Id", v: "{{$randomUUID}}", hl: true },
        ].map((h, i) => (
          <motion.div
            key={h.k}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 px-2 py-1.5 rounded border border-border/40"
          >
            <span className="text-text-primary w-40">{h.k}</span>
            <span className={h.hl ? "text-primary" : "text-text-secondary"}>
              {h.v}
            </span>
          </motion.div>
        ))}
      </div>
    );
  }
  if (sub === "Body") {
    const body = `{\n  "name": "{{$randomName}}",\n  "email": "{{userEmail}}",\n  "role": "user"\n}`;
    return (
      <div className="rounded-xl border border-border bg-[#0a0a0f]/60 p-3">
        <div className="flex items-center gap-3 text-[11px] mb-2">
          {["none", "form-data", "x-www-form-urlencoded", "raw", "graphql"].map(
            (o) => (
              <span
                key={o}
                className={
                  o === "raw"
                    ? "text-primary font-semibold"
                    : "text-text-secondary"
                }
              >
                ● {o}
              </span>
            ),
          )}
          <span className="ml-auto px-2 py-0.5 rounded border border-border text-text-secondary">
            JSON
          </span>
        </div>
        <pre className="text-[11px] font-mono leading-relaxed text-text-secondary whitespace-pre">
          {body}
        </pre>
      </div>
    );
  }
  if (sub === "Auth") {
    return (
      <div className="rounded-xl border border-border bg-surface/40 p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
          Auth type
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "No auth",
            "Bearer",
            "Basic",
            "API Key",
            "OAuth 2.0",
            "AWS Sig v4",
          ].map((a, i) => (
            <span
              key={a}
              className={`px-2.5 py-1 rounded-md border text-[11px] ${i === 1 ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-text-secondary"}`}
            >
              {a}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 items-center text-xs font-mono pt-2">
          <span className="text-text-secondary">Token</span>
          <input
            readOnly
            value="{{token}}"
            className="px-2 py-1.5 rounded border border-border bg-card/60 text-primary"
          />
        </div>
        <div className="text-[10px] text-text-secondary inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> Resolved from{" "}
          <span className="text-primary">Local</span> scope at send time.
        </div>
      </div>
    );
  }
  // Tests
  const test = `pm.test("Status code is 200", () =>\n  pm.response.to.have.status(200));\n\npm.test("Response time < 500ms", () =>\n  pm.expect(pm.response.responseTime).to.be.below(500));`;
  return (
    <div className="rounded-xl border border-border bg-[#0a0a0f]/60 p-3">
      <pre className="text-[11px] font-mono leading-relaxed text-text-secondary whitespace-pre">
        {test}
      </pre>
    </div>
  );
};

/* ============================================================== *
 *  VARIABLES PANEL  — 5-scope resolution                         *
 * ============================================================== */
const SCOPES = [
  {
    level: 1,
    name: "Local",
    priority: "highest",
    value: "bearer_runtime_eyJh...",
    desc: "Runtime-only · highest priority",
    source: "Pre-request Script",
    tone: "border-primary/50 bg-primary/10 text-primary",
  },
  {
    level: 2,
    name: "Environment",
    priority: "",
    value: "staging_auth_key_v2",
    desc: "Switchable per request — beats Project + Global",
    source: "Staging env",
    tone: "border-blue-400/40 bg-blue-400/5 text-blue-300",
  },
  {
    level: 3,
    name: "Collection",
    priority: "",
    value: "common_folder_secret",
    desc: "Scoped to one collection",
    source: "collection vars",
    tone: "border-violet-400/40 bg-violet-400/5 text-violet-300",
  },
  {
    level: 4,
    name: "Project",
    priority: "",
    value: "workspace_lead_token",
    desc: "Applies to every collection in this project",
    source: "Project vars",
    tone: "border-amber-400/40 bg-amber-400/5 text-amber-300",
  },
  {
    level: 5,
    name: "Global",
    priority: "lowest",
    value: "default_auth_fallback",
    desc: "Org-wide · lowest priority",
    source: "Globals (org)",
    tone: "border-border text-text-secondary",
  },
];

const VariablesPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0..5 reveals each scope; 5 = winner resolved
  useEffect(() => {
    if (step < SCOPES.length) {
      const t = setTimeout(() => setStep(step + 1), 520);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => onComplete?.(), 2200);
    return () => clearTimeout(t);
  }, [step, onComplete]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <div className="flex items-center gap-2 text-[11px] text-text-secondary mb-3">
          <Variable className="w-3.5 h-3.5 text-primary" />
          <span>Resolving</span>
          <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
            {"{{token}}"}
          </code>
          <span>across 5 scopes — top of the list wins.</span>
        </div>

        <div className="space-y-2">
          {SCOPES.map((s, i) => {
            const visible = step > i;
            const winner = step >= SCOPES.length && s.level === 1;
            const overridden = step >= SCOPES.length && s.level !== 1;
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -10 }}
                transition={{ duration: 0.3 }}
                className={`relative grid grid-cols-12 items-center gap-3 px-3 py-2.5 rounded-lg border ${s.tone} ${winner ? "ring-2 ring-primary/40" : ""}`}
              >
                <div className="col-span-2 md:col-span-1 text-center">
                  <div className="text-[10px] uppercase tracking-wider opacity-70">
                    Lv
                  </div>
                  <div className="text-lg font-bold leading-none">
                    {s.level}
                  </div>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <div className="text-xs font-semibold inline-flex items-center gap-1.5">
                    {s.name}
                    {winner && <Check className="w-3.5 h-3.5 text-success" />}
                  </div>
                  <div className="text-[10px] opacity-70">{s.desc}</div>
                </div>
                <div
                  className={`col-span-6 md:col-span-6 font-mono text-[11px] truncate ${overridden ? "line-through opacity-50" : ""}`}
                >
                  {"{{token}}"} ={" "}
                  <span className="text-text-primary">"{s.value}"</span>
                </div>
                <div className="hidden md:block col-span-2 text-[10px] uppercase tracking-wider text-right">
                  {winner ? (
                    <span className="text-success">RESOLVED ✓</span>
                  ) : overridden ? (
                    <span className="opacity-60">overridden</span>
                  ) : (
                    s.priority || ""
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {step >= SCOPES.length && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-success/30 bg-success/5 p-4"
        >
          <div className="text-[11px] uppercase tracking-wider text-success font-semibold mb-2 inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Resolved request preview
          </div>
          <pre className="text-[11px] font-mono leading-relaxed text-text-secondary whitespace-pre overflow-x-auto">
            {`GET /users HTTP/1.1
Host: jsonplaceholder.typicode.com
Authorization: Bearer bearer_runtime_eyJh...   ← Local scope won`}
          </pre>
        </motion.div>
      )}
    </div>
  );
};

/* ============================================================== *
 *  RESPONSE PANEL                                                *
 * ============================================================== */
const ResponsePanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [view, setView] = useState<
    "Body" | "Headers" | "Cookies" | "Test results"
  >("Body");
  const [trigger] = useState(() => Date.now());

  useEffect(() => {
    const seq: (typeof view)[] = ["Body", "Headers", "Test results"];
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i >= seq.length) {
        clearInterval(id);
        setTimeout(() => onComplete?.(), 900);
        return;
      }
      setView(seq[i]);
    }, 1400);
    return () => clearInterval(id);
  }, [onComplete]);

  const json = `[
  {
    "id": 1,
    "name": "Leanne Graham",
    "username": "Bret",
    "email": "Sincere@april.biz",
    "address": {
      "street": "Kulas Light",
      "suite": "Apt. 556",
      "city": "Gwenborough",
      "zipcode": "92998-3874"
    },
    "phone": "1-770-736-8031 x56442",
    "website": "hildegard.org"
  }
]`;

  return (
    <div className="space-y-3">
      {/* Status strip with countup */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-xl border border-border bg-surface/40 text-[11px]">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-success/30 bg-success/10 text-success font-mono font-bold">
          200 OK
        </span>
        <span className="text-text-secondary">Time:</span>
        <span className="font-mono text-primary tabular-nums">
          <CountUp value={853} trigger={trigger} suffix=" ms" />
        </span>
        <span className="text-text-secondary">Size:</span>
        <span className="font-mono text-primary tabular-nums">
          <CountUp value={5} trigger={trigger} suffix=".51 KB" />
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-text-secondary">
          <ShieldCheck className="w-3.5 h-3.5 text-success" /> TLSv1.3
        </span>
      </div>

      {/* Sub view tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["Body", "Headers", "Cookies", "Test results"] as const).map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1.5 text-[11px] font-medium relative ${active ? "text-primary" : "text-text-secondary hover:text-text-primary"}`}
            >
              {v}
              {active && (
                <motion.span
                  layoutId="resp-underline"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary"
                />
              )}
            </button>
          );
        })}
        <span className="ml-auto px-2 py-0.5 rounded border border-border text-text-secondary text-[10px] font-mono">
          JSON ▾
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {view === "Body" && (
            <pre className="rounded-xl border border-border bg-[#0a0a0f]/60 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-text-secondary max-h-[300px]">
              {json}
            </pre>
          )}
          {view === "Headers" && (
            <div className="rounded-xl border border-border bg-surface/40 p-3 space-y-1 text-[11px] font-mono">
              {[
                ["content-type", "application/json; charset=utf-8"],
                ["cache-control", "max-age=43200"],
                ["etag", 'W/"a18-i+xMpem...PuXKZQ"'],
                ["x-ratelimit-remaining", "999"],
                ["cf-cache-status", "HIT"],
                ["server", "cloudflare"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-text-secondary w-48">{k}</span>
                  <span className="text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          )}
          {view === "Cookies" && (
            <div className="rounded-xl border border-border bg-surface/40 p-6 text-center text-xs text-text-secondary">
              No cookies set on this response.
            </div>
          )}
          {view === "Test results" && (
            <div className="rounded-xl border border-border bg-surface/40 p-3 space-y-1.5 text-xs">
              {[
                "Status code is 2xx",
                "No server error (status < 500)",
                "Response body is not empty",
                "Response is valid JSON",
                "CORS headers present",
                "TLS 1.2 or higher",
              ].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-success" />{" "}
                  <span className="text-text-secondary">{t}</span>
                </motion.div>
              ))}
              <div className="flex items-center gap-2 text-yellow-300">
                <AlertTriangle className="w-3.5 h-3.5" /> Response time {"<"}{" "}
                500 ms —{" "}
                <span className="text-text-secondary">
                  WARN (actual 853 ms)
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ============================================================== *
 *  DEBUG PANEL  — full pipeline trace                            *
 * ============================================================== */
const TRACE = [
  {
    name: "Prepare",
    ms: 11,
    desc: "Building request line, resolving variables and assembling headers and body before any network IO.",
  },
  {
    name: "DNS Lookup",
    ms: 142,
    desc: "Resolving the host name to an IP address through the system resolver.",
  },
  {
    name: "TCP Handshake",
    ms: 141,
    desc: "3-way handshake (SYN → SYN-ACK → ACK) to open the TCP connection.",
  },
  {
    name: "SSL Handshake",
    ms: 0,
    desc: "TLS handshake — exchanging certificates, deriving session keys, agreeing on cipher and ALPN.",
  },
  {
    name: "REQUEST_SENT",
    ms: 834,
    desc: "Sending headers and request body over the established connection.",
  },
  {
    name: "Waiting (TTFB)",
    ms: 0,
    desc: "Server processing — time elapsed until the first response byte arrives.",
  },
  {
    name: "Download",
    ms: 6,
    desc: "Receiving the response body bytes from the wire.",
  },
];

const DebugPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const total = TRACE.reduce((a, b) => a + b.ms, 0);

  useEffect(() => {
    if (step < TRACE.length) {
      const t = setTimeout(() => setStep(step + 1), 380);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => onComplete?.(), 2400);
    return () => clearTimeout(t);
  }, [step, onComplete]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold inline-flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> Execution Trace
          </div>
          <span className="text-[11px] text-text-secondary font-mono">
            total {total.toFixed(1)} ms
          </span>
        </div>
        <div className="space-y-2">
          {TRACE.map((row, i) => {
            const visible = step > i;
            const pct = total > 0 ? (row.ms / total) * 100 : 0;
            return (
              <motion.div
                key={row.name}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: visible ? 1 : 0.25, x: visible ? 0 : -6 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-12 items-center gap-3 px-2 py-1.5 rounded border border-border/40"
              >
                <div className="col-span-1 flex justify-center">
                  {visible ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  )}
                </div>
                <div className="col-span-4">
                  <div className="text-xs font-semibold">{row.name}</div>
                  <div className="text-[10px] text-text-secondary leading-snug">
                    {row.desc}
                  </div>
                </div>
                <div className="col-span-5 h-1.5 rounded-full bg-border/40 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: visible ? `${pct}%` : 0 }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-primary"
                  />
                </div>
                <div className="col-span-2 text-right text-[11px] font-mono text-text-secondary">
                  {row.ms.toFixed(2)} ms
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {step >= TRACE.length && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-surface/40 p-4"
        >
          <div className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold mb-2 inline-flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-primary" /> Network snapshot
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
            {[
              ["Local", "/10.48.3.26:57030"],
              ["Remote", "jsonplaceholder.typicode.com/104.21.59.19:443"],
              ["HTTP", "HTTP/1.1"],
              ["TLS", "TLSv1.3"],
              ["Cipher", "TLS_AES_256_GCM_SHA384"],
              ["ALPN", "http/1.1"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="text-text-secondary w-20">{k}</span>
                <span className="text-text-primary truncate">{v}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

/* ============================================================== *
 *  CODE SNIPPETS PANEL — 10+ langs, masked vs raw toggle         *
 * ============================================================== */
type Lang = { id: string; label: string; ext: string };
const LANGS: Lang[] = [
  { id: "curl", label: "cURL", ext: "sh" },
  { id: "python", label: "Python", ext: "py" },
  { id: "node", label: "Node.js", ext: "js" },
  { id: "go", label: "Go", ext: "go" },
  { id: "java", label: "Java", ext: "java" },
  { id: "csharp", label: "C#", ext: "cs" },
  { id: "php", label: "PHP", ext: "php" },
  { id: "ruby", label: "Ruby", ext: "rb" },
  { id: "swift", label: "Swift", ext: "swift" },
  { id: "rust", label: "Rust", ext: "rs" },
  { id: "kotlin", label: "Kotlin", ext: "kt" },
];

const snippetFor = (id: string, masked: boolean) => {
  const tok = masked ? "{{token}}" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
  const url = "https://jsonplaceholder.typicode.com/users";
  switch (id) {
    case "curl":
      return `curl -X GET '${url}' \\\n  -H 'Authorization: Bearer ${tok}' \\\n  -H 'Accept: application/json'`;
    case "python":
      return `import requests\n\nr = requests.get(\n  "${url}",\n  headers={"Authorization": "Bearer ${tok}"},\n)\nprint(r.status_code, r.json())`;
    case "node":
      return `const res = await fetch("${url}", {\n  headers: { Authorization: "Bearer ${tok}" },\n});\nconsole.log(res.status, await res.json());`;
    case "go":
      return `req, _ := http.NewRequest("GET", "${url}", nil)\nreq.Header.Set("Authorization", "Bearer ${tok}")\nres, _ := http.DefaultClient.Do(req)`;
    case "java":
      return `HttpRequest req = HttpRequest.newBuilder()\n  .uri(URI.create("${url}"))\n  .header("Authorization", "Bearer ${tok}")\n  .GET().build();`;
    case "csharp":
      return `var req = new HttpRequestMessage(HttpMethod.Get, "${url}");\nreq.Headers.Add("Authorization", "Bearer ${tok}");\nvar res = await client.SendAsync(req);`;
    case "php":
      return `$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer ${tok}"]);\n$res = curl_exec($ch);`;
    case "ruby":
      return `require 'net/http'\nuri = URI("${url}")\nreq = Net::HTTP::Get.new(uri)\nreq['Authorization'] = "Bearer ${tok}"\nres = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }`;
    case "swift":
      return `var req = URLRequest(url: URL(string: "${url}")!)\nreq.setValue("Bearer ${tok}", forHTTPHeaderField: "Authorization")\nlet (data, _) = try await URLSession.shared.data(for: req)`;
    case "rust":
      return `let res = reqwest::Client::new()\n  .get("${url}")\n  .bearer_auth("${tok}")\n  .send().await?;`;
    case "kotlin":
      return `val req = Request.Builder()\n  .url("${url}")\n  .header("Authorization", "Bearer ${tok}")\n  .build()\nval res = client.newCall(req).execute()`;
    default:
      return "";
  }
};

const SnippetsPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [idx, setIdx] = useState(0);
  const [masked, setMasked] = useState(true);
  const [copied, setCopied] = useState(false);
  const lang = LANGS[idx];
  const code = snippetFor(lang.id, masked);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((prev) => {
        if (prev >= LANGS.length - 1) {
          clearInterval(id);
          setTimeout(() => onComplete?.(), 1200);
          return prev;
        }
        return prev + 1;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [onComplete]);

  // halfway through, demo the unmask toggle
  useEffect(() => {
    if (idx === 5) setMasked(false);
    if (idx === 8) setMasked(true);
  }, [idx]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {LANGS.map((l, i) => {
          const active = i === idx;
          return (
            <button
              key={l.id}
              onClick={() => setIdx(i)}
              className={`px-2.5 py-1 rounded-md border text-[11px] transition ${active ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-primary/40"}`}
            >
              {l.label}
            </button>
          );
        })}
        <span className="ml-auto inline-flex items-center gap-2">
          <button
            onClick={() => setMasked((m) => !m)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${masked ? "border-border text-text-secondary" : "border-yellow-400/40 bg-yellow-400/5 text-yellow-300"}`}
          >
            {masked ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {masked ? "Placeholder" : "Raw secret"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-[11px]"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-[11px]">
            <Download className="w-3.5 h-3.5" /> request.{lang.ext}
          </button>
        </span>
      </div>

      {!masked && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-yellow-400/30 bg-yellow-400/5 text-yellow-300 px-3 py-2 text-[11px] inline-flex items-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Sensitive values embedded —
          share only with trusted recipients.
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.pre
          key={lang.id + (masked ? "m" : "r")}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-border bg-[#0a0a0f]/60 p-4 text-[11px] font-mono leading-relaxed overflow-x-auto text-text-secondary min-h-[180px]"
        >
          {code}
        </motion.pre>
      </AnimatePresence>
    </div>
  );
};

/* ============================================================== *
 *  AI ASSISTANT PANEL                                            *
 * ============================================================== */
const AI_PROMPTS = [
  "Why this status?",
  "Validate request",
  "Suggest tests",
  "Explain response",
  "Detect leaks",
];
const AI_ANSWER = `The endpoint returned 200 OK in 853 ms — healthy, but the bulk of the time (834 ms) was spent in REQUEST_SENT, suggesting upload-side buffering rather than server latency.\n\nThe payload is a 10-item array of users with nested address + geo objects. Schema is stable vs the last 7 captures.\n\nSuggested follow-ups:\n  • Add a test asserting every item has a non-empty email\n  • Snapshot the JSON shape into a contract test\n  • Add ?_limit=20 to params — current call pulls full collection`;

const AiPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<"context" | "pick" | "streaming" | "done">(
    "context",
  );
  const [picked, setPicked] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (stage === "context") {
      const t = setTimeout(() => setStage("pick"), 700);
      return () => clearTimeout(t);
    }
    if (stage === "pick") {
      const t = setTimeout(() => setStage("streaming"), 900);
      return () => clearTimeout(t);
    }
    if (stage === "streaming") {
      const id = setInterval(() => {
        setChars((c) => {
          const next = c + 8;
          if (next >= AI_ANSWER.length) {
            clearInterval(id);
            setStage("done");
            return AI_ANSWER.length;
          }
          return next;
        });
      }, 22);
      return () => clearInterval(id);
    }
    if (stage === "done") {
      const t = setTimeout(() => onComplete?.(), 1800);
      return () => clearTimeout(t);
    }
  }, [stage, onComplete]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      {/* Context */}
      <div className="rounded-xl border border-border bg-surface/40 p-3 h-fit">
        <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-2 inline-flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-primary" /> Request context
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-success/30 bg-success/10 text-success font-mono">
            GET
          </div>
          <code className="block text-text-secondary font-mono break-all">
            jsonplaceholder.typicode.com/users
          </code>
          <div className="text-text-secondary leading-relaxed pt-1">
            Ask anything about this request. The assistant only answers
            questions scoped to it.
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {AI_PROMPTS.map((p, i) => (
            <button
              key={p}
              onClick={() => {
                setPicked(i);
                setStage("streaming");
                setChars(0);
              }}
              className={`w-full text-left px-2 py-1.5 rounded-md border text-[11px] transition ${picked === i && stage !== "context" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-primary/40"}`}
            >
              <Sparkles className="w-3 h-3 inline mr-1.5" /> {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="rounded-xl border border-border bg-[#0a0a0f]/60 p-4 min-h-[280px] flex flex-col">
        <div className="flex items-center gap-2 text-[11px] text-text-secondary border-b border-border pb-2 mb-3">
          <Wand2 className="w-3.5 h-3.5 text-primary" />
          <span>Request-aware AI · Lovable AI gateway</span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <CircleDot className="w-3 h-3 text-success" /> Ready
          </span>
        </div>

        <AnimatePresence mode="wait">
          {stage === "context" && (
            <motion.div
              key="ctx"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-text-secondary"
            >
              Loading request context…
            </motion.div>
          )}
          {(stage === "pick" || stage === "streaming" || stage === "done") && (
            <motion.div
              key="msg"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 text-xs"
            >
              <div className="self-end max-w-[80%] ml-auto px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary inline-block">
                {AI_PROMPTS[picked]}
              </div>
              <div className="px-3 py-2 rounded-lg bg-surface/60 border border-border text-text-secondary whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                {stage === "pick" ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Inspecting request, headers, response & test
                    results…
                  </span>
                ) : (
                  <>
                    {AI_ANSWER.slice(0, chars)}
                    {stage === "streaming" && (
                      <span className="inline-block w-[2px] h-[0.9em] bg-primary align-[-2px] ml-[1px] animate-pulse" />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-3 flex items-center gap-2">
          <input
            placeholder="Ask anything about this request…"
            className="flex-1 bg-surface/60 border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <button className="px-3 py-2 rounded-md bg-primary text-white text-xs font-semibold inline-flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Ask
          </button>
        </div>
      </div>
    </div>
  );
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
    icon: Send,
    title: "Visual request builder",
    tagline: "method · URL · params · body",
    desc: "Compose any HTTP or GraphQL request with a method picker, URL bar with variable autocomplete, key-value editors for params and headers, and a raw/form/multipart body editor.",
    bullets: [
      "HTTP & GraphQL in one builder",
      "Variable autocomplete on every field",
      "Pre-request scripts & tests",
    ],
  },
  {
    icon: Variable,
    title: "5-scope variable resolution",
    tagline: "local → env → collection → project → global",
    desc: "Reference any value as {{KEY}}. At send-time, ForgeFuzz resolves through Local → Environment → Collection → Project → Global. Top hit wins, downstream definitions are shown overridden.",
    bullets: [
      "Switchable environments per request",
      "Secret values masked at rest",
      "Live preview of resolved request",
    ],
  },
  {
    icon: FileJson,
    title: "Rich response inspector",
    tagline: "body · headers · cookies · tests",
    desc: "Pretty-printed body with format detection, full header table, cookie jar, and a test-results panel that runs your pm.test scripts against each response.",
    bullets: [
      "JSON / XML / HTML / image preview",
      "Diff vs last saved response",
      "Save-as-example for mocks",
    ],
  },
  {
    icon: Terminal,
    title: "Full pipeline trace",
    tagline: "DNS · TCP · TLS · TTFB · download",
    desc: "Every send produces a millisecond-accurate timeline: Prepare, DNS, TCP, SSL, Request Sent, Waiting (TTFB) and Download — plus a network snapshot with TLS cipher, ALPN and remote IP.",
    bullets: [
      "Per-phase timings with bars",
      "Wire-level sent/received frames",
      "Network metadata & error traces",
    ],
  },
  {
    icon: Code2,
    title: "Code snippets in 10+ languages",
    tagline: "cURL, Python, Go, Rust, Swift…",
    desc: "Generate ready-to-paste client code in cURL, Python, Node, Go, Java, C#, PHP, Ruby, Swift, Rust and Kotlin. Toggle between placeholder-safe and raw-secret variants before sharing.",
    bullets: [
      "Two-way sync with the builder",
      "Mask or embed secrets per copy",
      "Download as a runnable file",
    ],
  },
  {
    icon: Bot,
    title: "Request-aware AI assistant",
    tagline: "scoped to this request only",
    desc: "The assistant sees the request, response, headers and test results of the open tab — and nothing else. Ask why a status fired, get suggested tests, or explain a payload in plain English.",
    bullets: [
      "Why this status? / Validate request",
      "Suggest tests · Explain response",
      "Detect leaked secrets in body",
    ],
  },
];

/* ============================================================== *
 *  HOW IT WORKS  — cards with hover drawer                       *
 * ============================================================== */
type Step = {
  icon: React.ElementType;
  title: string;
  short: string;
  long: string;
  bullets: string[];
};
const STEPS: Step[] = [
  {
    icon: Plus,
    title: "1 · Create or import",
    short:
      "Start blank, clone, or import OpenAPI / Postman / Insomnia / HAR / cURL / ForgeFuzz native.",
    long: "Spin up a new collection in a click, or pull in an existing spec. ForgeFuzz auto-detects the format (Postman v2.1, OpenAPI 3.x, Insomnia v4, HAR 1.2, cURL command, ForgeFuzz native) and previews the parsed tree before you commit the import.",
    bullets: [
      "Auto-detect 6 import formats",
      "Preview before commit",
      "Folder structure preserved",
    ],
  },
  {
    icon: Send,
    title: "2 · Compose the request",
    short:
      "Method, URL, params, headers, body and auth — with variable autocomplete on every field.",
    long: "The builder accepts any method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, plus custom verbs). Body editor supports raw, x-www-form-urlencoded, form-data, GraphQL and binary. Pre-request scripts and tests are written in JS with a pm-compatible sandbox.",
    bullets: [
      "HTTP & GraphQL",
      "pm.* compatible sandbox",
      "Snippets for common assertions",
    ],
  },
  {
    icon: Variable,
    title: "3 · Resolve variables",
    short:
      "Reference {{KEY}} anywhere — Local beats Environment beats Collection beats Project beats Global.",
    long: "Every placeholder is resolved at send-time through the 5-scope hierarchy. The runtime overlay shows which scope won and which were overridden so secrets never surprise you. Mask values are stored encrypted and never sent to the browser logs.",
    bullets: [
      'Live "resolved request" preview',
      "Encrypted secret values",
      "Per-request environment switcher",
    ],
  },
  {
    icon: Send,
    title: "4 · Execute & inspect",
    short:
      "One Send hits the wire — response body, headers, cookies and test results stream in.",
    long: "Responses are streamed and parsed progressively. JSON gets a virtualized tree view, XML/HTML get a pretty preview, images render inline. Test results run pm.test assertions in a sandboxed iframe and surface pass/fail badges in the tab strip.",
    bullets: [
      "Streaming JSON / XML / images",
      "Per-tab pass-fail badges",
      "Diff against last saved response",
    ],
  },
  {
    icon: Terminal,
    title: "5 · Debug the pipeline",
    short:
      "DNS, TCP, TLS, TTFB, download — millisecond timings and a wire trace for every send.",
    long: "When a request misbehaves, open Debug Info: per-phase timings (Prepare → Download), a network snapshot (remote IP, ALPN, TLS cipher), and the full wire-level frames sent and received. Errors include a stack-style trace pointing at the exact phase that failed.",
    bullets: [
      "Per-phase ms with timeline bars",
      "TLS cipher + ALPN + remote IP",
      "Stack-style error attribution",
    ],
  },
  {
    icon: Code2,
    title: "6 · Share or generate code",
    short:
      "Copy as cURL in one click, or pick from 10+ languages — masked or raw, your call.",
    long: "Generate Python, Node, Go, Java, C#, PHP, Ruby, Swift, Rust or Kotlin equivalents. Toggle between placeholder-safe ({{token}}) and raw-secret variants depending on whether you are sharing publicly or with a trusted teammate. Two-way sync — edits to the snippet rebuild the request.",
    bullets: [
      "10+ language targets",
      "Masked vs raw secret toggle",
      "Two-way snippet ↔ builder sync",
    ],
  },
  {
    icon: Bot,
    title: "7 · Ask the AI",
    short:
      "Request-scoped assistant — explains statuses, drafts tests, validates payloads.",
    long: "The assistant only ever sees the open request, its response and test results — no other tabs, no other collections. Use it to explain why a 401 fired, draft a suite of pm.test assertions, validate a body shape, or detect tokens accidentally embedded in the response.",
    bullets: [
      "Scoped to the open request only",
      "Drafts pm.test assertions",
      "Flags accidental secret leaks",
    ],
  },
  {
    icon: Activity,
    title: "8 · Replay from history",
    short:
      "Every send is captured — replay, edit and try, or promote to a saved request.",
    long: "History keeps the full payload, headers, timing and response of every send. Hit Try to replay verbatim, Edit & Try to tweak first, or save the captured response back into the collection as the canonical example for mock servers and contract tests.",
    bullets: [
      "Full payload + response capture",
      "Try / Edit & Try / Promote",
      "Filter by collection, status or text",
    ],
  },
];

const StepCard: React.FC<{
  step: Step;
  index: number;
  openIndex: number | null;
  setOpenIndex: (i: number | null) => void;
}> = ({ step, index, openIndex, setOpenIndex }) => {
  const Icon = step.icon;
  const open = openIndex === index;
  return (
    <div
      onMouseEnter={() => setOpenIndex(index)}
      onMouseLeave={() => setOpenIndex(null)}
      onClick={() => setOpenIndex(open ? null : index)}
      className="relative"
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: index * 0.04 }}
        whileHover={{ y: -2 }}
        className={`relative rounded-2xl border shadow-md bg-card/40 backdrop-blur-xl p-5 cursor-pointer transition ${open ? "border-primary/50" : "border-border hover:border-primary/30"}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {step.short}
            </p>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-text-secondary transition ${open ? "rotate-90 text-primary" : ""}`}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-xl p-5 ml-13">
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                {step.long}
              </p>
              <ul className="space-y-1.5">
                {step.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-[11px] text-text-secondary"
                  >
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================== *
 *  PAGE                                                          *
 * ============================================================== */
export const ApiFuzzingPage: React.FC = () => {
  const navigate = useNavigate();
  const [openStep, setOpenStep] = useState<number | null>(null);

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

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-6">
        <Backdrop />
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold tracking-wider uppercase mb-6"
          >
            <Send className="w-3.5 h-3.5" /> Request Builder · Variables · AI
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
          >
            Build, send and debug any API request
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-6 max-w-2xl mx-auto text-text-secondary leading-relaxed mb-10"
          >
            Compose requests with variable placeholders that resolve across 5
            scopes, inspect responses with a millisecond-accurate pipeline
            trace, export to 10+ languages with secret masking, and chat with a
            request-aware AI that only sees the tab you have open.
          </motion.p>

          {/* <HeroRequestCard />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/projects/collections')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> New request
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border hover:border-primary/50 text-sm">
              <Download className="w-4 h-4 rotate-180" /> Import Postman / OpenAPI
            </button>
          </div> */}
        </div>
        <div className="relative max-w-8xl mx-auto px-20">
          <Console />
        </div>
      </section>

      {/* INTERACTIVE CONSOLE */}
      {/* <section className="relative px-6 py-20 border-t border-border/60">
        <div className="relative max-w-7xl mx-auto">
          <SectionHeader
            chip="Live console"
            title={<>The exact builder, mid-flight</>}
            desc="Six workspace tabs — Builder, Variables, Response, Debug, Code and AI — cycle through their real lifecycle. Field-by-field typing, scope-by-scope resolution, streaming responses, per-phase trace, language switcher with masked/raw toggle, and a request-scoped assistant streaming an answer."
          />
          <Console />
        </div>
      </section> */}

      {/* FEATURE PILLARS */}
      <section className="relative px-6 py-20 border-t border-border/60">
        <div className="relative max-w-8xl mx-auto px-20">
          <SectionHeader
            chip="What the builder gives you"
            title={<>A request workspace, not a form</>}
            desc="Each pillar is a first-class part of every send — wired together so a tweak in one surface updates the others automatically."
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
                  className="group relative rounded-2xl shadow-md border border-border bg-card/40 backdrop-blur-xl p-5 hover:border-primary/40 transition overflow-hidden"
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

      {/* HOW IT WORKS */}
      <section className="relative px-6 py-20 border-t border-border/60">
        <div className="relative max-w-8xl mx-auto px-20">
          <SectionHeader
            chip="How it works"
            title={<>From blank tab to shipped curl</>}
            desc="Hover or click any step to expand a side-drawer with the full English explanation, what happens under the hood, and the small details that matter."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STEPS.map((s, i) => (
              <StepCard
                key={s.title}
                step={s}
                index={i}
                openIndex={openStep}
                setOpenIndex={setOpenStep}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative px-6 py-24 border-t border-border/60">
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
          >
            One workspace for compose, send and debug
          </motion.h2>
          <p className="mt-5 text-text-secondary">
            Stop juggling Postman, a terminal and a docs tab. Build the request
            once, resolve variables safely, share as code, and let the AI
            explain anything you missed.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/projects/collections")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90"
            >
              Open the request builder <ArrowRight className="w-4 h-4" />
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

export default ApiFuzzingPage;
