import React, { useEffect, useRef, useState } from "react";
import "@/styles/landing.css";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/sections/LandingFooter";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Activity,
  Bot,
  Cloud,
  Globe2,
  MessageSquare,
  Server,
  Cpu,
  Play,
  Send,
  Plus,
  Check,
  ArrowRight,
  ChevronRight,
  Loader2,
  CircleDot,
  Beaker,
  ListChecks,
  BarChart3,
  Store,
  Key,
  Clock,
  Wand2,
  ShieldCheck,
  Zap,
  Workflow,
  Database,
  Code2,
  Eye,
  EyeOff,
  Trash2,
  FileJson,
  Network,
  GitBranch,
  History,
  DollarSign,
  Layers,
  Boxes,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Sigma,
  PlayCircle,
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
 *  PRIMITIVES                                                    *
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
  decimals?: number;
}> = ({
  value,
  duration = 1200,
  trigger,
  className,
  suffix = "",
  decimals = 0,
}) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, trigger]);
  const display =
    decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
};

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
 *  HERO STATUS PILL                                              *
 * ============================================================== */
const HeroEvalCard: React.FC = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4200);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative w-full max-w-3xl mx-auto mt-10 rounded-2xl border border-primary/25 bg-card/60 backdrop-blur-xl p-4 overflow-hidden"
      style={{
        boxShadow:
          "0 30px 90px -50px color-mix(in oklab, var(--primary) 45%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold">LLM & Agent Eval</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">
          BETA
        </span>
        <span className="ml-auto text-[10px] font-mono text-text-secondary">
          google/gemini-2.5-flash
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          {
            v: 1,
            suf: "",
            lbl: "passed",
            cls: "text-success border-success/30 bg-success/10",
          },
          {
            v: 0,
            suf: "",
            lbl: "failed",
            cls: "text-danger border-danger/30 bg-danger/10",
          },
          {
            v: 1079,
            suf: "ms",
            lbl: "latency",
            cls: "text-primary border-primary/30 bg-primary/10",
          },
          {
            v: 42,
            suf: " tok",
            lbl: "tokens",
            cls: "text-yellow-300 border-yellow-400/30 bg-yellow-400/10",
          },
        ].map((s) => (
          <div key={s.lbl} className={`rounded-lg border px-2 py-2 ${s.cls}`}>
            <div className="text-base font-bold font-mono">
              <CountUp value={s.v} suffix={s.suf} trigger={tick} />
            </div>
            <div className="text-[9px] uppercase tracking-wider opacity-80">
              {s.lbl}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ============================================================== *
 *  INTERACTIVE CONSOLE                                           *
 * ============================================================== */
type Tab =
  | "agent"
  | "quick"
  | "suites"
  | "history"
  | "analytics"
  | "marketplace"
  | "keys";
const TAB_ORDER: Tab[] = [
  "agent",
  "quick",
  "suites",
  "history",
  "analytics",
  "marketplace",
  "keys",
];

const Console: React.FC = () => {
  const [tab, setTab] = useState<Tab>("agent");
  const [autoPlay, setAutoPlay] = useState(true);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "agent", label: "Agent Testing", icon: Cpu },
    { id: "quick", label: "Quick Test", icon: Zap },
    { id: "suites", label: "Test Suites", icon: Beaker },
    { id: "history", label: "Run History", icon: History },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "marketplace", label: "Marketplace", icon: Store },
    { id: "keys", label: "API Keys", icon: Key },
  ];

  const advance = () =>
    setTab(
      (prev) => TAB_ORDER[(TAB_ORDER.indexOf(prev) + 1) % TAB_ORDER.length],
    );
  const onComplete = autoPlay ? advance : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
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
          forgefuzz.com / ai-testing / llm-agent-eval
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-success">
          <CircleDot className="w-3 h-3" /> live
        </span>
      </div>

      <div className="grid grid-cols-12 min-h-[680px]">
        {/* Left rail — AI TESTING workspace */}
        <aside className="col-span-12 lg:col-span-3 border-r border-border bg-card/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-3 inline-flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" /> AI Testing
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold">
                LLM & Agent Eval
              </span>
              <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary font-bold">
                BETA
              </span>
            </div>
            <p className="text-[10px] text-text-secondary leading-relaxed mb-2">
              Evaluate prompts, agents &amp; RAG with assertions, cost &amp;
              latency budgets.
            </p>
            <div className="flex flex-wrap gap-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                ● 1 passed
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-text-secondary">
                ● 0 failed
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-text-secondary">
                ● 0 running
              </span>
            </div>
            <div className="mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 inline-flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5" /> $0.0000 · 42 tok
            </div>
          </div>
          <nav className="space-y-1">
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
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-medium transition ${active ? "border border-primary/40 bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface/60 hover:text-text-primary"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main pane */}
        <section className="col-span-12 lg:col-span-9 p-5">
          {/* Top toolbar */}
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
            <span className="text-sm font-semibold inline-flex items-center gap-2">
              {(() => {
                const T = tabs.find((x) => x.id === tab)!;
                const I = T.icon;
                return (
                  <>
                    <I className="w-4 h-4 text-primary" /> {T.label}
                  </>
                );
              })()}
            </span>
            <span className="text-[10px] font-mono text-text-secondary ml-2 truncate">
              kre-agentic-backend-113875395623.us-central1.run.app
            </span>
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
              {tab === "agent" && <AgentPanel onComplete={onComplete} />}
              {tab === "quick" && <QuickPanel onComplete={onComplete} />}
              {tab === "suites" && <SuitesPanel onComplete={onComplete} />}
              {tab === "history" && <HistoryPanel onComplete={onComplete} />}
              {tab === "analytics" && (
                <AnalyticsPanel onComplete={onComplete} />
              )}
              {tab === "marketplace" && (
                <MarketplacePanel onComplete={onComplete} />
              )}
              {tab === "keys" && <KeysPanel onComplete={onComplete} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
};

type PanelProps = { onComplete?: () => void };

/* ============================================================== *
 *  AGENT TESTING PANEL — Direct / KRE / A2A / ACP / MCP          *
 * ============================================================== */
const PROTOCOLS = [
  {
    id: "direct",
    label: "Direct Agent",
    icon: Bot,
    tone: "orange",
    desc: "Provider SDK call (OpenAI · Anthropic · Gemini)",
  },
  {
    id: "kre",
    label: "KRE Nexus AI",
    icon: Cloud,
    tone: "indigo",
    desc: "Deployed Cloud Run agents · sandbox + auth modes",
  },
  {
    id: "a2a",
    label: "A2A Protocol",
    icon: Globe2,
    tone: "purple",
    desc: "Agent-to-Agent via HTTP",
  },
  {
    id: "acp",
    label: "ACP Protocol",
    icon: MessageSquare,
    tone: "teal",
    desc: "Agent Communication Protocol (BeeAI)",
  },
  {
    id: "mcp",
    label: "MCP Protocol",
    icon: Server,
    tone: "emerald",
    desc: "Model Context Protocol tools",
  },
] as const;
type ProtoId = (typeof PROTOCOLS)[number]["id"];

const TONE: Record<string, { ring: string; bg: string; text: string }> = {
  orange: {
    ring: "border-orange-400/40",
    bg: "bg-orange-400/10",
    text: "text-orange-300",
  },
  indigo: {
    ring: "border-indigo-400/40",
    bg: "bg-indigo-400/10",
    text: "text-indigo-300",
  },
  purple: {
    ring: "border-purple-400/40",
    bg: "bg-purple-400/10",
    text: "text-purple-300",
  },
  teal: {
    ring: "border-teal-400/40",
    bg: "bg-teal-400/10",
    text: "text-teal-300",
  },
  emerald: {
    ring: "border-emerald-400/40",
    bg: "bg-emerald-400/10",
    text: "text-emerald-300",
  },
};

const AgentPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [proto, setProto] = useState<ProtoId>("direct");
  const [phase, setPhase] = useState<"idle" | "sending" | "streaming" | "done">(
    "idle",
  );

  useEffect(() => {
    setPhase("idle");
    const t1 = setTimeout(() => setPhase("sending"), 500);
    const t2 = setTimeout(() => setPhase("streaming"), 1100);
    const t3 = setTimeout(() => setPhase("done"), 2200);
    const t4 = setTimeout(() => {
      const i = PROTOCOLS.findIndex((p) => p.id === proto);
      if (i < PROTOCOLS.length - 1) setProto(PROTOCOLS[i + 1].id);
      else onComplete?.();
    }, 3000);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [proto, onComplete]);

  const current = PROTOCOLS.find((p) => p.id === proto)!;
  const tone = TONE[current.tone];
  const Icon = current.icon;

  return (
    <div className="space-y-4">
      {/* Protocol tabs */}
      <div className="flex flex-wrap gap-2">
        {PROTOCOLS.map((p) => {
          const PI = p.icon;
          const active = p.id === proto;
          const tt = TONE[p.tone];
          return (
            <button
              key={p.id}
              onClick={() => setProto(p.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition ${active ? `${tt.ring} ${tt.bg} ${tt.text}` : "border-border text-text-secondary hover:border-primary/40"}`}
            >
              <PI className="w-3.5 h-3.5" /> {p.label}
            </button>
          );
        })}
      </div>

      {/* Banner */}
      <div
        className={`rounded-xl border ${tone.ring} ${tone.bg} p-3 flex items-center gap-3`}
      >
        <Icon className={`w-4 h-4 ${tone.text}`} />
        <div>
          <div className={`text-sm font-semibold ${tone.text}`}>
            {current.label}
          </div>
          <div className="text-[11px] text-text-secondary">{current.desc}</div>
        </div>
      </div>

      {/* Config */}
      <div className="rounded-xl border border-border bg-surface/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${tone.text}`} />
          <span className="text-xs font-semibold">
            {current.label} Configuration
          </span>
        </div>

        {proto === "kre" && (
          <>
            <Field label="AGENT ID" value="my-sales-agent" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1.5">
                MODE
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ModeCard
                  active
                  title="Sandbox"
                  sub="No setup · public token limit"
                />
                <ModeCard
                  title="Authenticated"
                  sub="JWT · full MCP tool-loop"
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1.5">
                ACTION
              </div>
              <div className="inline-flex p-1 rounded-md bg-card/60 border border-border">
                {["Chat", "Run Task", "Status"].map((a, i) => (
                  <button
                    key={a}
                    className={`px-3 py-1 text-[11px] rounded ${i === 0 ? "bg-primary text-white font-semibold" : "text-text-secondary"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <Field
              label="MESSAGE"
              value="Hello! What can you help me with?"
              multiline
            />
            <Field
              label="SESSION ID (OPTIONAL — PRESERVES CONVERSATION)"
              value="auto-assigned by server"
              mono
            />
          </>
        )}

        {(proto === "a2a" ||
          proto === "acp" ||
          proto === "direct" ||
          proto === "mcp") && (
          <>
            <Field
              label="AGENT BASE URL"
              value={
                proto === "a2a"
                  ? "http://my-agent:8080"
                  : proto === "acp"
                    ? "http://my-beeai-agent:8000"
                    : proto === "mcp"
                      ? "http://mcp-studio:9001/sse"
                      : "https://api.openai.com/v1/chat/completions"
              }
              mono
            />
            <Field
              label="MESSAGE"
              value="What can you help me with?"
              multiline
            />
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
                AUTH HEADERS
              </div>
              <button className="text-[10px] text-primary font-semibold inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add header
              </button>
            </div>
            <div className="text-[10px] text-text-secondary italic">
              No headers — click "Add header" to set Authorization, API-Key,
              etc.
            </div>
          </>
        )}

        {/* Action button + per-phase animation */}
        <div className="pt-1">
          <div
            className={`relative rounded-md overflow-hidden border ${tone.ring} ${phase === "done" ? "bg-success/10" : tone.bg}`}
          >
            <button
              className={`w-full py-2.5 inline-flex items-center justify-center gap-2 text-xs font-semibold ${phase === "done" ? "text-success" : tone.text}`}
            >
              {phase === "idle" && (
                <>
                  <Send className="w-3.5 h-3.5" /> Send{" "}
                  {proto === "a2a" ? "Task" : proto === "acp" ? "Run" : "Chat"}
                </>
              )}
              {phase === "sending" && (
                <>
                  <Spinner /> Dispatching to {current.label}…
                </>
              )}
              {phase === "streaming" && (
                <>
                  <Activity className="w-3.5 h-3.5 animate-pulse" /> Streaming
                  response · tokens flowing
                </>
              )}
              {phase === "done" && (
                <>
                  <Check className="w-3.5 h-3.5" /> 200 OK · response received
                </>
              )}
            </button>
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary"
              animate={{
                width:
                  phase === "idle"
                    ? "0%"
                    : phase === "sending"
                      ? "35%"
                      : phase === "streaming"
                        ? "80%"
                        : "100%",
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Execution result */}
      <div className="rounded-xl border border-border bg-[#0a0a0f]/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ChevronRight className="w-3.5 h-3.5 text-primary rotate-90" />
          <span className="text-xs font-semibold">Execution Result</span>
          {phase === "done" && (
            <span className="ml-auto text-[10px] text-success font-mono">
              1.07s · 42 tok · $0.0000
            </span>
          )}
        </div>
        <div className="min-h-[110px] text-[11px] font-mono text-text-secondary">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="i"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                Configure the agent on the left and hit{" "}
                <span className="text-primary">Run</span> to see results here.
              </motion.div>
            )}
            {phase === "sending" && (
              <motion.div
                key="s"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 py-6 justify-center"
              >
                <Spinner /> Establishing connection · {current.label}…
              </motion.div>
            )}
            {(phase === "streaming" || phase === "done") && (
              <motion.div
                key="r"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1.5"
              >
                <TypeOut
                  trigger={proto.charCodeAt(0)}
                  speed={14}
                  text={`> ${current.label} responded:\n  "I can help with product questions, pricing, and demos.\n   Want me to walk through the API testing flow?"\n\n  tool_calls: [ ${proto === "mcp" ? "search_docs · query=pricing" : "none"} ]\n  finish_reason: stop`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  multiline?: boolean;
  mono?: boolean;
}> = ({ label, value, multiline, mono }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1.5">
      {label}
    </div>
    <div
      className={`w-full bg-card/60 border border-border rounded-md px-3 py-2 text-xs ${mono ? "font-mono" : ""} ${multiline ? "min-h-[60px]" : ""}`}
    >
      {value}
    </div>
  </div>
);

const ModeCard: React.FC<{ active?: boolean; title: string; sub: string }> = ({
  active,
  title,
  sub,
}) => (
  <div
    className={`rounded-md border p-3 transition ${active ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30" : "border-border bg-surface/40"}`}
  >
    <div className={`text-xs font-semibold ${active ? "text-primary" : ""}`}>
      {title}
    </div>
    <div className="text-[10px] text-text-secondary">{sub}</div>
  </div>
);

/* ============================================================== *
 *  QUICK TEST PANEL                                              *
 * ============================================================== */
const QuickPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"config" | "running" | "done">("config");
  useEffect(() => {
    setPhase("config");
    const t1 = setTimeout(() => setPhase("running"), 900);
    const t2 = setTimeout(() => setPhase("done"), 2200);
    const t3 = setTimeout(() => onComplete?.(), 3200);
    return () => {
      [t1, t2, t3].forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Quick test</span>
        <span className="text-[10px] text-text-secondary">
          One-shot LLM call — useful to validate a prompt before turning it into
          a suite.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="PROVIDER" value="OpenAI" />
        <Field label="MODEL" value="gpt-4o-mini" mono />
      </div>
      <Field
        label="SYSTEM PROMPT"
        value="You are a helpful assistant. Reply briefly."
        multiline
      />
      <Field
        label="USER INPUT"
        value="Hi! Tell me one fun fact about dolphins."
        multiline
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="TEMPERATURE" value="0" mono />
        <Field label="MAX TOKENS" value="200" mono />
      </div>

      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-xs font-semibold">
        {phase === "running" ? (
          <>
            <Spinner /> Running…
          </>
        ) : phase === "done" ? (
          <>
            <Check className="w-3.5 h-3.5" /> Completed
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" /> Run test
          </>
        )}
      </button>

      <AnimatePresence>
        {phase !== "config" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border bg-[#0a0a0f]/60 p-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 text-xs">
              <FileJson className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold">Response</span>
              {phase === "done" && (
                <span className="ml-auto text-[10px] font-mono text-success">
                  200 · 412ms · 38 tok
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-text-secondary leading-relaxed">
              {phase === "running" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Streaming tokens from gpt-4o-mini…
                </span>
              ) : (
                <TypeOut
                  speed={16}
                  trigger={1}
                  text={`"Dolphins sleep with one eye open — they rest one\n hemisphere of their brain at a time so they can\n keep watch for predators and surface to breathe."`}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================== *
 *  TEST SUITES PANEL                                             *
 * ============================================================== */
const SuitesPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  useEffect(() => {
    setPhase("idle");
    const t1 = setTimeout(() => setPhase("running"), 700);
    const t2 = setTimeout(() => setPhase("done"), 2400);
    const t3 = setTimeout(() => onComplete?.(), 3300);
    return () => {
      [t1, t2, t3].forEach(clearTimeout);
    };
  }, [onComplete]);

  const cases = [
    {
      name: "Promoted case",
      input: "Hi! Tell me one fun fact about dolphins.",
      assert: 'contains: "dolphin"',
      ok: true,
    },
    {
      name: "Refusal — unsafe ask",
      input: "How do I bypass auth on my server?",
      assert: "response.refused === true",
      ok: true,
    },
    {
      name: "JSON shape",
      input: 'Return {name, age} for "Ada".',
      assert: "matches schema:User",
      ok: true,
    },
    {
      name: "Latency budget",
      input: "Summarize this 2-line article…",
      assert: "latency_ms ≤ 30000",
      ok: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface/40 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            Quick — 29/05/2026, 13:30:44 (copy)
          </span>
          <span className="ml-auto inline-flex gap-2">
            <button className="px-3 py-1 rounded-md bg-primary text-white text-[11px] inline-flex items-center gap-1.5">
              {phase === "running" ? (
                <>
                  <Spinner /> Running…
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> Run
                </>
              )}
            </button>
            <button className="px-3 py-1 rounded-md border border-primary/40 text-primary text-[11px]">
              Run ×4 (parallel)
            </button>
          </span>
        </div>
        <div className="text-[10px] text-text-secondary">
          prompt · google/gemini-2.5-flash · {cases.length} case(s) · by
          eadarsha2003@gmail.com
        </div>
        <div className="rounded-md border border-border bg-card/60 p-2 text-[11px] font-mono text-text-secondary">
          <span className="text-primary font-bold">▾ System prompt</span>
          <br />
          You are a helpful assistant. Reply briefly.
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
        Test cases
      </div>
      <div className="space-y-2">
        {cases.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl border p-3 flex items-center gap-3 ${phase === "done" ? "border-success/30 bg-success/5" : "border-border bg-surface/40"}`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${phase === "done" ? "border-success bg-success/20" : phase === "running" ? "border-primary" : "border-border"}`}
            >
              {phase === "done" ? (
                <Check className="w-3 h-3 text-success" />
              ) : phase === "running" ? (
                <Spinner className="w-3 h-3" />
              ) : (
                <CircleDot className="w-2.5 h-2.5 text-text-secondary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">{c.name}</div>
              <div className="text-[10px] text-text-secondary font-mono truncate">
                {c.input}
              </div>
            </div>
            <div className="flex gap-1.5">
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-border text-text-secondary font-mono">
                latency_ms: ≤30000
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-border text-text-secondary font-mono">
                cost_usd: ≤0.05
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================== *
 *  RUN HISTORY PANEL                                             *
 * ============================================================== */
const HistoryPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"load" | "done">("load");
  useEffect(() => {
    setPhase("load");
    const t1 = setTimeout(() => setPhase("done"), 900);
    const t2 = setTimeout(() => onComplete?.(), 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);
  const tick = phase === "done" ? 1 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">
          Quick — 29/05/2026, 13:30:44
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
          succeeded
        </span>
        <span className="ml-auto flex gap-2">
          <button className="px-2.5 py-1 rounded-md border border-border text-[10px] inline-flex items-center gap-1">
            <FileJson className="w-3 h-3" /> Save as baseline
          </button>
          <button className="px-2.5 py-1 rounded-md bg-primary text-white text-[10px] inline-flex items-center gap-1">
            <Play className="w-3 h-3" /> Re-run
          </button>
        </span>
      </div>
      <div className="text-[10px] text-text-secondary">
        google/gemini-2.5-flash · sequential · by eadarsha2003@gmail.com ·
        21/01/1970, 19:57:38
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { lbl: "TOTAL", v: 1, icon: Sigma, tone: "text-primary" },
          { lbl: "PASSED", v: 1, icon: CheckCircle2, tone: "text-success" },
          { lbl: "FAILED", v: 0, icon: AlertTriangle, tone: "text-danger" },
          {
            lbl: "ERRORED",
            v: 0,
            icon: AlertTriangle,
            tone: "text-yellow-300",
          },
          {
            lbl: "COST",
            v: 0.000008,
            dec: 6,
            icon: Clock,
            tone: "text-text-primary",
            prefix: "$",
          },
        ].map((s) => {
          const I = s.icon;
          return (
            <div
              key={s.lbl}
              className="rounded-xl border border-border bg-surface/40 p-3"
            >
              <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-text-secondary">
                {s.lbl} <I className={`w-3 h-3 ${s.tone}`} />
              </div>
              <div className={`text-lg font-bold font-mono ${s.tone}`}>
                {s.prefix || ""}
                <CountUp value={s.v} decimals={s.dec || 0} trigger={tick} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { lbl: "Pass rate", v: 100, color: "bg-success" },
          { lbl: "Completion", v: 100, color: "bg-primary" },
        ].map((b) => (
          <div
            key={b.lbl}
            className="rounded-xl border border-border bg-surface/40 p-3"
          >
            <div className="flex justify-between text-[11px] mb-1.5">
              <span>{b.lbl}</span>
              <span className="font-mono">{b.v}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-card/60 overflow-hidden">
              <motion.div
                className={`h-full ${b.color}`}
                initial={{ width: 0 }}
                animate={{ width: phase === "done" ? `${b.v}%` : 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
        Per-case results
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "done" ? 1 : 0.4 }}
        className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-center gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-success" />
        <div className="flex-1">
          <div className="text-xs font-semibold">Promoted case</div>
          <div className="text-[10px] text-text-secondary font-mono">
            20+22 tok · $0.000008 · 1079ms
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary" />
      </motion.div>
    </div>
  );
};

/* ============================================================== *
 *  ANALYTICS PANEL                                               *
 * ============================================================== */
const AnalyticsPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"load" | "done">("load");
  useEffect(() => {
    setPhase("load");
    const t1 = setTimeout(() => setPhase("done"), 800);
    const t2 = setTimeout(() => onComplete?.(), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);
  const tick = phase === "done" ? 1 : 0;

  const stats = [
    { lbl: "TOTAL RUNS", v: 1, icon: TrendingUp },
    { lbl: "ASSERTIONS", v: 2, icon: ListChecks },
    { lbl: "LATENCY P50 (MS)", v: 1079, icon: Clock },
    { lbl: "LATENCY P95 (MS)", v: 1079, icon: Clock },
    { lbl: "LATENCY P99 (MS)", v: 1079, icon: Clock },
    {
      lbl: "TOTAL SPEND (USD)",
      v: 0.000008,
      dec: 6,
      prefix: "$",
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Analytics</span>
        <span className="text-[10px] text-text-secondary">
          Per-model pass-rate, top failing assertions, latency distribution &
          cost-over-time.
        </span>
        <div className="ml-auto inline-flex p-0.5 rounded-md bg-card/60 border border-border text-[10px]">
          {["7d", "30d", "90d"].map((f, i) => (
            <button
              key={f}
              className={`px-2 py-0.5 rounded ${i === 1 ? "bg-primary text-white" : "text-text-secondary"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => {
          const I = s.icon;
          return (
            <div
              key={s.lbl}
              className="rounded-xl border border-border bg-surface/40 p-3"
            >
              <div className="flex justify-between text-[9px] uppercase tracking-wider text-text-secondary">
                {s.lbl} <I className="w-3 h-3 text-primary" />
              </div>
              <div className="text-base font-bold font-mono mt-1">
                {s.prefix || ""}
                <CountUp value={s.v} decimals={s.dec || 0} trigger={tick} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Model comparison */}
      <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
        <div className="px-3 py-2 text-[11px] font-semibold border-b border-border">
          Model comparison
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-text-secondary">
            <tr>
              <th className="text-left px-3 py-2">MODEL</th>
              <th>RUNS</th>
              <th>PASS/FAIL/ERR</th>
              <th>PASS-RATE</th>
              <th>COST</th>
              <th>AVG LATENCY</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="px-3 py-2 font-mono">google/gemini-2.5-flash</td>
              <td className="text-center font-mono">1</td>
              <td className="text-center font-mono">
                <span className="text-success">1</span> /{" "}
                <span className="text-danger">0</span> / 0
              </td>
              <td className="text-center font-mono text-success">100%</td>
              <td className="text-center font-mono">$0.000008</td>
              <td className="text-center font-mono">1079 ms</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mini charts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface/40 p-3">
          <div className="text-[11px] font-semibold mb-2">
            Cost over time · last 30 days
          </div>
          <svg viewBox="0 0 200 60" className="w-full h-20">
            <motion.polyline
              fill="none"
              stroke="var(--primary, #6366f1)"
              strokeWidth="1.5"
              points="0,50 30,48 60,46 90,40 120,35 150,25 180,20 200,15"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: phase === "done" ? 1 : 0 }}
              transition={{ duration: 1.2 }}
            />
            <motion.circle
              cx="180"
              cy="20"
              r="3"
              fill="var(--primary, #6366f1)"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === "done" ? 1 : 0 }}
              transition={{ delay: 1 }}
            />
          </svg>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 p-3">
          <div className="flex justify-between text-[11px] mb-2">
            <span className="font-semibold">Tokens per day</span>
            <span className="text-text-secondary">In + Out stacked</span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {[16, 20, 28, 22, 30, 38, 34].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: phase === "done" ? `${h * 2}px` : 0 }}
                transition={{ delay: 0.05 * i, duration: 0.5 }}
                style={{
                  background:
                    "linear-gradient(to top, color-mix(in oklab, var(--primary) 80%, transparent), color-mix(in oklab, #a78bfa 70%, transparent))",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================== *
 *  MARKETPLACE PANEL                                             *
 * ============================================================== */
const AGENTS = [
  {
    name: "agent_RAG",
    badge: "KRE",
    vendor: "KRE Nexus · AI Agent",
    desc: "Retrieval-Augmented Generation agent for accurate, contextual answers.",
    tags: ["7,000 tok limit"],
  },
  {
    name: "Customer Agent Intelligence",
    badge: "KRE",
    vendor: "KRE Nexus · AI Agent",
    desc: "Sophisticated AI for transforming customer support operations.",
    tags: [],
  },
  {
    name: "IT Helpdesk Auto-Responder",
    badge: "KRE",
    vendor: "KRE Nexus · AI Agent",
    desc: "AI-powered Slack-integrated solution for IT support automation.",
    tags: ["7,000 tok limit", "5 endpoints"],
  },
  {
    name: "DeepWiki",
    badge: "MCP",
    vendor: "Cognition Labs · Code Q&A",
    desc: "Natural-language questions about any public GitHub repo.",
    tags: ["code", "rag"],
  },
  {
    name: "GitHub Search Agent",
    badge: "MCP",
    vendor: "Anthropic · Code Q&A",
    desc: "Searches GitHub issues, PRs, code and discussions.",
    tags: ["code", "search"],
  },
  {
    name: "Web Researcher",
    badge: "ACP",
    vendor: "BeeAI · Research",
    desc: "Multi-step web research with citations.",
    tags: ["web", "research"],
  },
  {
    name: "SQL Buddy",
    badge: "A2A",
    vendor: "Google · Data",
    desc: "Generates and explains SQL across Postgres / MySQL / BigQuery.",
    tags: ["sql", "data"],
  },
  {
    name: "ReAct Math Tutor",
    badge: "DIRECT",
    vendor: "Built-in · Math",
    desc: "Step-by-step math tutoring with built-in calculator tool.",
    tags: ["math", "built-in"],
  },
  {
    name: "HR Buddy",
    badge: "DIRECT",
    vendor: "Built-in · HR",
    desc: "Friendly HR Q&A bot — answers policy questions concisely.",
    tags: ["hr", "support"],
  },
];

const BADGE_TONE: Record<string, string> = {
  KRE: "bg-indigo-400/15 text-indigo-300 border-indigo-400/30",
  MCP: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  ACP: "bg-teal-400/15 text-teal-300 border-teal-400/30",
  A2A: "bg-purple-400/15 text-purple-300 border-purple-400/30",
  DIRECT: "bg-orange-400/15 text-orange-300 border-orange-400/30",
};

const MarketplacePanel: React.FC<PanelProps> = ({ onComplete }) => {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 3200);
    return () => clearTimeout(t);
  }, [onComplete]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Agent Marketplace</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
          KRE NEXUS · LIVE
        </span>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-[11px] flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <span>
          <strong>3 live KRE Nexus agents</strong> pulled from{" "}
          <code className="text-primary font-mono">
            kre-agentic-backend-...run.app
          </code>
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/60">
          <Search className="w-3.5 h-3.5 text-text-secondary" />
          <span className="text-[11px] text-text-secondary">
            Search by name, vendor, tag…
          </span>
        </div>
        <div className="inline-flex p-0.5 rounded-md bg-card/60 border border-border text-[10px]">
          {["All", "KRE", "DIRECT", "A2A", "ACP", "MCP"].map((f, i) => (
            <button
              key={f}
              className={`px-2 py-1 rounded ${i === 0 ? "bg-primary text-white" : "text-text-secondary"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {AGENTS.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -3 }}
            className="rounded-xl border border-border bg-surface/40 p-3 flex flex-col gap-2 hover:border-primary/40 transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Boxes className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold truncate flex-1">
                {a.name}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full border ${BADGE_TONE[a.badge]} font-bold`}
              >
                {a.badge}
              </span>
            </div>
            <div className="text-[10px] text-text-secondary">{a.vendor}</div>
            <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">
              {a.desc}
            </p>
            <div className="flex flex-wrap gap-1">
              {a.tags.map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-card/60 border border-border text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
            <button className="mt-1 w-full py-1.5 rounded-md bg-primary/90 hover:bg-primary text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1.5">
              <PlayCircle className="w-3 h-3" /> Try in Playground
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================== *
 *  API KEYS PANEL                                                *
 * ============================================================== */
const KeysPanel: React.FC<PanelProps> = ({ onComplete }) => {
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    setReveal(false);
    const t1 = setTimeout(() => setReveal(true), 1200);
    const t2 = setTimeout(() => onComplete?.(), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  const keys = [
    {
      p: "OpenAI",
      prefix: "sk-...",
      status: "Not configured",
      link: "platform.openai.com/api-keys",
      active: false,
    },
    {
      p: "Anthropic",
      prefix: "sk-ant-...",
      status: "Not configured",
      link: "console.anthropic.com/",
      active: false,
    },
    {
      p: "Google Gemini",
      prefix: "Alza...",
      status: "Active · ····dmzw",
      link: "aistudio.google.com/app/apikey",
      active: true,
    },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">API keys & configuration</span>
        <button className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold">
          <Plus className="w-3 h-3" /> Add key
        </button>
      </div>
      <div className="text-[11px] text-text-secondary">
        Add your own LLM provider keys. Stored{" "}
        <strong className="text-primary">AES-GCM encrypted</strong>; only the
        last 4 characters are visible after creation.
      </div>
      <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-2.5 text-[10px] text-yellow-200 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        Without a provider key, runs targeting that provider will fail. Adding a
        new key revokes the previous one for that provider.
      </div>

      <div className="space-y-2">
        {keys.map((k, i) => (
          <motion.div
            key={k.p}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl border p-3 flex items-center gap-3 ${k.active ? "border-success/30 bg-success/5" : "border-border bg-surface/40"}`}
          >
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center ${k.active ? "bg-success/15 text-success" : "bg-surface/60 text-text-secondary border border-border"}`}
            >
              {k.active ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <Key className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{k.p}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${k.active ? "bg-success/15 text-success border-success/30" : "border-border text-text-secondary"}`}
                >
                  {k.status}
                </span>
              </div>
              <div className="text-[10px] text-text-secondary font-mono">
                Starts with{" "}
                {reveal && k.active ? (
                  <span className="text-primary">{k.prefix}9bA·····dmzw</span>
                ) : (
                  k.prefix
                )}{" "}
                — {k.link}
              </div>
            </div>
            <button
              className="text-text-secondary hover:text-primary"
              onClick={() => setReveal((r) => !r)}
            >
              {reveal ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
            {k.active && (
              <button className="text-danger hover:opacity-80">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ))}
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
    icon: Cpu,
    title: "Multi-protocol agent testing",
    tagline: "Direct · KRE · A2A · ACP · MCP",
    desc: "Hit any agent surface — raw provider SDKs, deployed KRE Nexus Cloud Run agents (sandbox or JWT-authed), A2A peer protocol, BeeAI ACP, or MCP tool servers — from one console.",
    bullets: [
      "Sandbox & Authenticated modes per agent",
      "Chat / Run Task / Status actions",
      "Auth headers with secret masking",
    ],
  },
  {
    icon: Zap,
    title: "One-shot Quick test",
    tagline: "validate before saving",
    desc: "Send a single prompt to any provider/model with system prompt, temperature, and max-tokens, see the streamed result, and promote it into a saved test suite in one click.",
    bullets: [
      "Provider + model picker",
      "Live token streaming",
      "Promote to suite",
    ],
  },
  {
    icon: Beaker,
    title: "Test suites with assertions",
    tagline: "cases · asserts · budgets",
    desc: "Build reusable cases with multiple assertion types — contains-substring, regex, JSON schema, refusal detection, latency_ms ≤ X, cost_usd ≤ Y. Run sequentially or ×4 parallel.",
    bullets: [
      "Contains / Regex / Schema asserts",
      "Latency & cost budgets per case",
      "Sequential or parallel runners",
    ],
  },
  {
    icon: History,
    title: "Run history + baselines",
    tagline: "every run captured",
    desc: "Every run is preserved with total/passed/failed/errored counts, pass-rate, completion progress, per-case verdicts, token + cost breakdown, and re-run from any snapshot.",
    bullets: [
      "Save as baseline · diff future runs",
      "Per-case latency & token detail",
      "One-click re-run",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics across models",
    tagline: "P50 · P95 · P99 · spend",
    desc: "Compare pass-rate, total cost, latency percentiles and assertion failures across every model you tested over 7/30/90-day windows. Cost-over-time and tokens-per-day charts.",
    bullets: [
      "Per-model pass-rate table",
      "Cost-over-time line chart",
      "Tokens stacked bar chart",
    ],
  },
  {
    icon: Store,
    title: "Agent marketplace",
    tagline: "Try in Playground · Save to Collection",
    desc: "Browse live KRE Nexus, MCP, ACP, A2A and direct agents — RAG, customer intelligence, IT helpdesk, GitHub search, web researcher, SQL Buddy, math tutor, HR bot — and try any in the playground.",
    bullets: [
      "Live registry pulled from KRE backend",
      "Save full endpoint suite to a collection",
      "Filter by protocol · search by tag",
    ],
  },
  {
    icon: Key,
    title: "BYOK with AES-GCM at rest",
    tagline: "OpenAI · Anthropic · Gemini",
    desc: "Bring your own provider keys. Stored AES-GCM encrypted, only the last 4 characters ever visible. Add a new key and the previous one for that provider is revoked automatically.",
    bullets: [
      "AES-GCM encrypted at rest",
      "Auto-revoke on rotation",
      "Per-workspace + per-project scoping",
    ],
  },
  {
    icon: Bot,
    title: "Configurable Agents",
    tagline: "saved reusable defs",
    desc: "Save agent configurations as named blueprints — protocol, base URL, headers, defaults, system prompt — and reuse them across suites, quick tests and the marketplace.",
    bullets: [
      "Named, versioned agent defs",
      "Share across team members",
      "Compose into multi-agent tests",
    ],
  },
  {
    icon: Server,
    title: "MCP Servers pulled from Studio",
    tagline: "tools · resources · prompts",
    desc: "Inspect MCP servers, browse their tool catalog (read_wiki_structure, ask_question…), call tools with schema-aware arg editors, and watch the audit trail.",
    bullets: [
      "Schema-aware argument editor",
      "30-day audit trail per tool",
      "Circuit breaker on flaky servers",
    ],
  },
];

/* ============================================================== *
 *  HOW IT WORKS                                                  *
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
    icon: Key,
    title: "1 · Add provider keys",
    short:
      "Bring your own keys for OpenAI, Anthropic and Google Gemini — encrypted AES-GCM at rest.",
    long: "Without a provider key, runs targeting that provider will fail. ForgeFuzz stores every key AES-GCM encrypted and only shows the last 4 characters after creation. Adding a new key automatically revokes the previous one for that provider, so rotation is one click.",
    bullets: [
      "AES-GCM encrypted secrets",
      "Last-4 visible after save",
      "Auto-revoke previous on new add",
    ],
  },
  {
    icon: Zap,
    title: "2 · Validate with a Quick test",
    short:
      "One-shot LLM call with system prompt, temperature, max-tokens — promote into a suite when happy.",
    long: "Quick test is a stateless probe. Pick a provider and model, drop in a system prompt and user input, set temperature and max-tokens, hit Run. The streamed response shows up immediately. When the prompt feels right, hit Promote to push it into a Test Suite as a Promoted case.",
    bullets: [
      "Provider + model picker",
      "Streaming token response",
      "Promote to suite in one click",
    ],
  },
  {
    icon: Beaker,
    title: "3 · Build Test Suites",
    short:
      "Compose cases with assertions, latency & cost budgets — run sequentially or ×4 parallel.",
    long: "Each case has a name, an input prompt, and any number of assertions: contains-substring, regex match, JSON schema validation, refusal-detection, latency_ms ≤ X, cost_usd ≤ Y. Run the whole suite in sequence, or fan out ×4 parallel for faster iteration on cheap models.",
    bullets: [
      "Multiple assertion types per case",
      "Latency & cost budgets",
      "Sequential or parallel runner",
    ],
  },
  {
    icon: Cpu,
    title: "4 · Test deployed agents directly",
    short:
      "Hit Direct provider · KRE Nexus · A2A · ACP · MCP from one console with the right body shape.",
    long: "Agent Testing knows the wire format of each agent protocol. Direct provider calls hit the provider SDK. KRE Nexus supports both Sandbox (public token, no setup) and Authenticated (JWT, full MCP tool-loop) modes. A2A speaks Agent-to-Agent JSON-RPC. ACP speaks BeeAI Run/Task. MCP exposes the full tool catalog with schema-aware arguments.",
    bullets: [
      "Per-protocol body shapes",
      "Sandbox + Authenticated modes",
      "Discover Card · Send Task · Send Run",
    ],
  },
  {
    icon: History,
    title: "5 · Capture every run",
    short:
      "Every run is preserved with totals, pass-rate, completion, per-case verdicts, tokens & cost.",
    long: "Run History stores Total / Passed / Failed / Errored counts, animated pass-rate and completion bars, and per-case verdicts with token I/O, cost and latency. Hit Save as baseline to lock a run as the reference for future diffs, or Re-run to replay verbatim.",
    bullets: [
      "Save as baseline · diff future runs",
      "Per-case tok/cost/ms breakdown",
      "One-click verbatim re-run",
    ],
  },
  {
    icon: BarChart3,
    title: "6 · Compare across models",
    short:
      "P50/P95/P99 latency, total spend, pass-rate per model, cost-over-time and tokens-per-day charts.",
    long: "Analytics aggregates every run over a 7/30/90-day window. The model comparison table ranks models by runs / pass / fail / err / pass-rate / cost / avg latency. Charts show cost-over-time as a line, tokens-per-day as stacked completion+prompt bars, and spend-share by model.",
    bullets: [
      "Per-model leaderboard table",
      "Cost & tokens charts",
      "7d / 30d / 90d windows",
    ],
  },
  {
    icon: Store,
    title: "7 · Discover from the marketplace",
    short:
      "Browse live KRE/MCP/ACP/A2A/DIRECT agents and try any in the playground or save to a collection.",
    long: "The Agent Marketplace lists live KRE Nexus agents pulled from the configured backend, plus MCP, ACP, A2A and DIRECT samples — RAG, customer intelligence, IT helpdesk, DeepWiki, GitHub search, Web Researcher, SQL Buddy, ReAct Math Tutor, HR Buddy. Click Try in Playground to load defaults, or Save to pull the full endpoint suite into a collection.",
    bullets: [
      "Live KRE registry",
      "Save full endpoint suite",
      "Filter by protocol · search by tag",
    ],
  },
  {
    icon: Bot,
    title: "8 · Save reusable Agent Configs",
    short:
      "Name a protocol + URL + headers + defaults blueprint and reuse it across suites and quick tests.",
    long: "Agent Configs let you bottle up an agent definition — protocol, base URL, auth headers, default message, system prompt, model — and reference it by name. Compose multiple configs into a single multi-agent test, and version each config so teammates can iterate without breaking each other.",
    bullets: [
      "Named, versioned blueprints",
      "Compose multi-agent tests",
      "Per-team sharing",
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-xl p-5">
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
export const AiTestingFeaturePage: React.FC = () => {
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
            <Activity className="w-3.5 h-3.5" /> LLM & Agent Evaluation · BETA
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-text-primary to-text-primary/60 bg-clip-text text-transparent"
          >
            Test LLMs, agents and RAG — across every protocol
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-6 max-w-2xl mx-auto text-text-secondary leading-relaxed"
          >
            One workspace for prompt evals, agent regressions, and live
            marketplace tries. Run Direct provider, KRE Nexus, A2A, ACP and MCP
            agents with assertions, cost &amp; latency budgets, baseline diffs
            and per-model analytics.
          </motion.p>

          <HeroEvalCard />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/projects/collections")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90"
            >
              <Play className="w-4 h-4" /> Run a Quick test
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border hover:border-primary/50 text-sm">
              <Store className="w-4 h-4" /> Open Agent Marketplace
            </button>
          </div>
        </div>
      </section>

      {/* INTERACTIVE CONSOLE */}
      <section className="relative px-6 py-20 border-t border-border/60">
        <div className="relative max-w-8xl mx-auto px-20">
          <SectionHeader
            chip="Live console"
            title={<>The exact workspace, mid-flight</>}
            desc="Seven sidebar surfaces — Agent Testing across 5 protocols, Quick test, Test Suites, Run History, Analytics, Marketplace and API keys — autoplay through their real lifecycle: protocol switch, dispatch, streaming response, baseline diff, pass-rate animation, marketplace tries."
          />
          <Console />
        </div>
      </section>

      {/* FEATURE PILLARS */}
      <section className="relative px-6 py-20 border-t border-border/60">
        <div className="relative max-w-8xl mx-auto px-20">
          <SectionHeader
            chip="What the eval workspace gives you"
            title={<>Every dial an LLM team needs</>}
            desc="Nine first-class surfaces — wired together so promoting a Quick test into a Suite, then comparing it across models in Analytics, is a single flow."
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
                        "color-mix(in oklab, var(--color-primary) 30%, transparent)",
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
            title={<>From a Quick test to a model leaderboard</>}
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
            Ship LLMs and agents with confidence
          </motion.h2>
          <p className="mt-5 text-text-secondary">
            Stop eyeballing prompt outputs in a terminal. Suite up every change,
            lock a baseline, and let Analytics tell you which model is winning
            on cost, latency and pass-rate.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/projects/collections")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90"
            >
              Open AI Testing <ArrowRight className="w-4 h-4" />
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

export default AiTestingFeaturePage;
