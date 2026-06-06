import React, { useState, useEffect, useRef } from "react";
import "@/styles/landing.css";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/sections/LandingFooter";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Shield,
  FileCode,
  Layers,
  Calendar,
  Download,
  GitCompare,
  Bell,
  Bug,
  ShieldAlert,
  Globe,
  Timer,
  TrendingUp,
  Flame,
  ChevronRight,
  XCircle,
  Clock,
  Workflow,
  Eye,
  Hash,
  Radio,
  Crosshair,
  Loader2,
  Code2,
  CircleDot,
  Upload,
  Settings2,
  PlayCircle,
  FileText,
  GaugeCircle,
  BellRing,
  Repeat,
} from "lucide-react";
import { GiCheckMark } from "react-icons/gi";

/* ---------- Tab registry ---------- */
type TabId = "load" | "functional" | "security";
const TABS: {
  id: TabId;
  label: string;
  sub: string;
  icon: React.ElementType;
  badge: string;
}[] = [
  {
    id: "load",
    label: "Load Tests",
    sub: "Throughput · p95 · SLA",
    icon: TrendingUp,
    badge: "Performance",
  },
  {
    id: "functional",
    label: "Functional Tests",
    sub: "Suites · assertions · regions",
    icon: Workflow,
    badge: "Correctness",
  },
  {
    id: "security",
    label: "Security Scan",
    sub: "OWASP · PII · rate-limit",
    icon: Shield,
    badge: "OWASP API 2023",
  },
];
const TAB_ADVANCE_MS = 8500;

/* ---------- Helpers ---------- */
const primary = (pct: number) =>
  `color-mix(in oklab, var(--primary) ${pct}%, transparent)`;

const Glow: React.FC<{ className?: string; intensity?: number }> = ({
  className = "",
  intensity = 30,
}) => (
  <div
    className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
    style={{ background: primary(intensity) }}
  />
);

const GridBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    />
    {/* <Glow className="-top-40 -left-24 h-[560px] w-[560px]" intensity={18} /> */}
    {/* <Glow className="top-1/4 -right-28 h-[580px] w-[580px]" intensity={14} /> */}
    <Glow className="top-2 left-5  h-[520px] w-[520px]" intensity={10} />
  </div>
);

const Pulse: React.FC<{ active?: boolean }> = ({ active = true }) => (
  <span className="relative inline-flex h-2 w-2">
    {active && (
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ background: primary(80) }}
      />
    )}
    <span
      className="relative inline-flex h-2 w-2 rounded-full"
      style={{ background: "var(--primary)" }}
    />
  </span>
);

/* ---------- LOAD stage ---------- */
const LOAD_PRESETS = ["Smoke", "Load", "Stress", "Spike"] as const;
const LOAD_SOURCES = ["Test Spec", "Collection", "Inline"] as const;
const LOAD_SPECS = [
  "ForgeQ Monitor · POSTMAN · 30 cases",
  "ForgeQ Load · POSTMAN · 36 cases",
  "ForgeQ Functional · POSTMAN · 81 cases",
  "Checkout & Orders API · OPENAPI · 35 cases",
  "User Management API · OPENAPI · 37 cases",
];

const LoadStage: React.FC<{ play: boolean }> = ({ play }) => {
  const [sourceIdx, setSourceIdx] = useState(0);
  const [presetIdx, setPresetIdx] = useState(1);
  const [specIdx, setSpecIdx] = useState(0);
  const [vu, setVu] = useState(50);
  const [phase, setPhase] = useState<
    "config" | "running" | "report" | "schedule"
  >("config");
  const [series, setSeries] = useState<number[]>([]);
  const [metrics, setMetrics] = useState({ rps: 0, lat: 0, err: 0, total: 0 });

  useEffect(() => {
    if (!play) return;
    setPhase("config");
    setSeries([]);
    setMetrics({ rps: 0, lat: 0, err: 0, total: 0 });
    const ts = [
      setTimeout(() => setSourceIdx(1), 700),
      setTimeout(() => setSourceIdx(2), 1400),
      setTimeout(() => setSourceIdx(0), 2000),
      setTimeout(() => setPresetIdx(2), 2400),
      setTimeout(() => setPresetIdx(3), 3000),
      setTimeout(() => setSpecIdx((i) => (i + 1) % LOAD_SPECS.length), 3400),
      setTimeout(() => setVu(220), 3900),
      setTimeout(() => setPhase("running"), 4400),
      setTimeout(() => setPhase("report"), 7200),
      setTimeout(() => setPhase("schedule"), 8000),
    ];
    return () => ts.forEach(clearTimeout);
  }, [play]);

  useEffect(() => {
    if (phase !== "running") return;
    const iv = setInterval(() => {
      const rps = Math.floor(vu * 7.4 + (Math.random() * 30 - 15));
      const lat = Math.floor(80 + vu / 6 + Math.random() * 25);
      setMetrics((m) => ({
        rps,
        lat,
        err: m.err + (Math.random() > 0.92 ? 1 : 0),
        total: m.total + rps,
      }));
      setSeries((s) => {
        const n = [...s, lat];
        if (n.length > 28) n.shift();
        return n;
      });
    }, 220);
    return () => clearInterval(iv);
  }, [phase, vu]);

  return (
    <div className="relative h-full w-full p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            forgefuzz / load runner
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Pulse active={phase === "running"} />
          <span className="uppercase tracking-wider">
            {phase === "running" ? "streaming" : phase}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "config" && (
          <motion.div
            key="cfg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Source
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LOAD_SOURCES.map((s, i) => (
                  <button
                    key={s}
                    className="rounded-lg border px-3 py-2.5 text-left text-xs transition-all"
                    style={{
                      borderColor:
                        sourceIdx === i ? "var(--primary)" : "var(--border)",
                      background: sourceIdx === i ? primary(10) : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {i === 0 ? (
                        <FileCode className="h-3.5 w-3.5" />
                      ) : i === 1 ? (
                        <Layers className="h-3.5 w-3.5" />
                      ) : (
                        <Code2 className="h-3.5 w-3.5" />
                      )}
                      <span className="font-medium">{s}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {i === 0
                        ? "Saved spec"
                        : i === 1
                          ? "Request set"
                          : "Paste raw"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Test spec
              </div>
              <motion.div
                key={specIdx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border px-3 py-2.5 text-xs font-mono"
                style={{ borderColor: "var(--border)", background: primary(4) }}
              >
                <span style={{ color: "var(--primary)" }}>▸</span>{" "}
                {LOAD_SPECS[specIdx]}
              </motion.div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Preset
              </div>
              <div className="flex flex-wrap gap-2">
                {LOAD_PRESETS.map((p, i) => (
                  <div
                    key={p}
                    className="rounded-full border px-3 py-1 text-xs flex items-center gap-1.5 transition-all"
                    style={{
                      borderColor:
                        presetIdx === i ? "var(--primary)" : "var(--border)",
                      background: presetIdx === i ? primary(15) : "transparent",
                      color: presetIdx === i ? "var(--primary)" : undefined,
                    }}
                  >
                    {i === 2 && <Zap className="h-3 w-3" />}
                    {i === 3 && <Flame className="h-3 w-3" />}
                    {p}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="text-[10px] uppercase text-muted-foreground">
                  Concurrency
                </div>
                <motion.div
                  key={vu}
                  initial={{ scale: 1.1, color: "var(--primary)" }}
                  animate={{ scale: 1 }}
                  className="text-lg font-semibold mt-1"
                >
                  {vu} VU
                </motion.div>
              </div>
              <div
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="text-[10px] uppercase text-muted-foreground">
                  Duration
                </div>
                <div className="text-lg font-semibold mt-1">30s</div>
              </div>
              <div
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="text-[10px] uppercase text-muted-foreground">
                  Ramp-up
                </div>
                <div className="text-lg font-semibold mt-1">5s</div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "running" && (
          <motion.div
            key="run"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: "RPS", v: metrics.rps, icon: TrendingUp },
                { l: "p95 ms", v: metrics.lat, icon: Timer },
                { l: "Errors", v: metrics.err, icon: AlertTriangle },
                { l: "Total", v: metrics.total, icon: Hash },
              ].map((m) => (
                <div
                  key={m.l}
                  className="rounded-lg border p-3"
                  style={{
                    borderColor: "var(--border)",
                    background: primary(4),
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {m.l}
                    </span>
                    <m.icon
                      className="h-3 w-3"
                      style={{ color: "var(--primary)" }}
                    />
                  </div>
                  <div className="text-base font-semibold mt-1 tabular-nums">
                    {m.v}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="relative h-40 rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--border)", background: primary(3) }}
            >
              <div className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Radio
                  className="h-3 w-3"
                  style={{ color: "var(--primary)" }}
                />{" "}
                live p95 latency · global-sla-runner
              </div>
              <svg
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 280 160"
              >
                <defs>
                  <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primary(60)} />
                    <stop offset="100%" stopColor={primary(0)} />
                  </linearGradient>
                </defs>
                {series.length > 1 && (
                  <>
                    <polyline
                      fill="url(#latGrad)"
                      stroke="none"
                      points={`0,160 ${series.map((v, i) => `${(i / (series.length - 1)) * 280},${160 - Math.min(140, (v / 250) * 140)}`).join(" ")} 280,160`}
                    />
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="1.5"
                      points={series
                        .map(
                          (v, i) =>
                            `${(i / (series.length - 1)) * 280},${160 - Math.min(140, (v / 250) * 140)}`,
                        )
                        .join(" ")}
                    />
                  </>
                )}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-2">
                <Loader2
                  className="h-3 w-3 animate-spin"
                  style={{ color: "var(--primary)" }}
                />{" "}
                Running in background — toast on completion
              </span>
              <span>Region: us-central1 · eu-west1</span>
            </div>
          </motion.div>
        )}

        {phase === "report" && (
          <motion.div
            key="rep"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div
              className="rounded-lg border p-3 flex items-center justify-between"
              style={{ borderColor: "var(--border)", background: primary(6) }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className="h-5 w-5"
                  style={{ color: "var(--primary)" }}
                />
                <div>
                  <div className="text-sm font-semibold">
                    Load run 1780148880161
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    INLINE_IMPORT · concurrency {vu} · 30s · ramp 5s
                  </div>
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: primary(20), color: "var(--primary)" }}
              >
                SUCCESS
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                ["Total", "317"],
                ["Success", "309"],
                ["Failed", "8"],
                ["Actual RPS", "8.7"],
                ["Avg lat", "908ms"],
                ["p95", "2325ms"],
                ["p99", "2915ms"],
                ["200", "309"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded border p-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="text-[9px] uppercase text-muted-foreground">
                    {k}
                  </div>
                  <div className="font-mono mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {["HTML", "JSON", "JUnit"].map((f) => (
                <button
                  key={f}
                  className="text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Download className="h-3 w-3" /> {f}
                </button>
              ))}
              <button
                className="text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5 ml-auto"
                style={{
                  borderColor: "var(--primary)",
                  color: "var(--primary)",
                }}
              >
                <GitCompare className="h-3 w-3" /> Compare runs
              </button>
            </div>
          </motion.div>
        )}

        {phase === "schedule" && (
          <motion.div
            key="sch"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar
                className="h-4 w-4"
                style={{ color: "var(--primary)" }}
              />{" "}
              New load schedule
            </div>
            {[
              ["Name", "Nightly checkout SLA"],
              ["Source", "Test Spec · ForgeQ Load"],
              ["Schedule", "Every 30 minutes"],
              ["Timezone", "Asia/Kolkata"],
              ["Concurrency", "100 VU · 60s"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded border px-3 py-2 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-muted-foreground">{k}</span>
                <span className="font-mono">{v}</span>
              </div>
            ))}
            <div
              className="rounded border px-3 py-2 text-[11px] flex items-center gap-2"
              style={{ borderColor: "var(--primary)", background: primary(8) }}
            >
              <Pulse /> Next fire in 14m · cron: <code>0 */30 * * * *</code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------- FUNCTIONAL stage ---------- */
const FUNC_STEPS = [
  {
    m: "POST",
    n: "Create a post · Body validation",
    code: 201,
    ok: true,
    ms: 188,
  },
  {
    m: "GET",
    n: "List first 3 posts · p95 < 5000ms",
    code: 200,
    ok: true,
    ms: 109,
  },
  {
    m: "GET",
    n: "Get post 1 comments · Happy path",
    code: 200,
    ok: true,
    ms: 111,
  },
  { m: "DELETE", n: "Wrong HTTP method", code: 404, ok: false, ms: 129 },
  { m: "GET", n: "Get user by id · Happy path", code: 200, ok: true, ms: 118 },
  {
    m: "POST",
    n: "Create a post · Negative cases",
    code: 400,
    ok: false,
    ms: 131,
  },
];

const FuncStage: React.FC<{ play: boolean }> = ({ play }) => {
  const [phase, setPhase] = useState<"config" | "running" | "report">("config");
  const [activeStep, setActiveStep] = useState(-1);
  const [regions, setRegions] = useState<number[]>([0]);

  useEffect(() => {
    if (!play) return;
    setPhase("config");
    setActiveStep(-1);
    setRegions([0]);
    const tr = [
      setTimeout(() => setRegions([0, 1]), 800),
      setTimeout(() => setRegions([0, 1, 3]), 1400),
      setTimeout(() => setRegions([0, 1, 3, 4]), 2000),
      setTimeout(() => setPhase("running"), 2700),
    ];
    const steps = FUNC_STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i), 3000 + i * 650),
    );
    const tend = setTimeout(
      () => setPhase("report"),
      3000 + FUNC_STEPS.length * 650 + 400,
    );
    return () => {
      [...tr, tend, ...steps].forEach(clearTimeout);
    };
  }, [play]);

  const REGIONS = [
    "us-central1",
    "us-east1",
    "europe-west1",
    "asia-south1",
    "asia-southeast1",
    "australia-southeast1",
  ];

  return (
    <div className="relative h-full w-full p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            forgefuzz / functional runner
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Pulse active={phase === "running"} />
          <span className="uppercase tracking-wider">{phase}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "config" && (
          <motion.div
            key="cfg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Test Spec", s: "Run saved spec", i: FileCode },
                { l: "Collection", s: "Run request set", i: Layers },
                { l: "Inline", s: "Paste raw content", i: Code2 },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className="rounded-lg border px-3 py-2.5 text-xs"
                  style={{
                    borderColor: i === 0 ? "var(--primary)" : "var(--border)",
                    background: i === 0 ? primary(10) : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <s.i className="h-3.5 w-3.5" />
                    <span className="font-medium">{s.l}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {s.s}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Advanced · parallelism · retries · iterations
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ["Max parallel", "4"],
                  ["Retry count", "0"],
                  ["Retry delay", "500ms"],
                  ["Step timeout", "30000ms"],
                  ["Req timeout", "15000ms"],
                  ["Iterations", "1"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded border px-2 py-1.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="text-[9px] uppercase text-muted-foreground">
                      {k}
                    </div>
                    <div className="font-mono">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Globe className="h-3 w-3" /> Regions — fan-out per region
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map((r, i) => {
                  const active = regions.includes(i);
                  return (
                    <motion.span
                      key={r}
                      animate={{ scale: active ? 1 : 0.95 }}
                      className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5"
                      style={{
                        borderColor: active
                          ? "var(--primary)"
                          : "var(--border)",
                        background: active ? primary(12) : "transparent",
                        color: active
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      {active && <CircleDot className="h-2.5 w-2.5" />}
                      {r}
                    </motion.span>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              {[
                ["Fail fast", false],
                ["Validate schema", true],
                ["Capture body", true],
              ].map(([k, on]) => (
                <div
                  key={k as string}
                  className="rounded border px-2 py-1.5 flex items-center gap-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className="h-3 w-3 rounded border flex items-center justify-center"
                    style={{
                      borderColor: on ? "var(--primary)" : "var(--border)",
                      background: on ? "var(--primary)" : "transparent",
                    }}
                  >
                    {on && (
                      <CheckCircle2 className="h-2.5 w-2.5 text-background" />
                    )}
                  </span>
                  {k}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "running" && (
          <motion.div
            key="run"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
              <Workflow
                className="h-3 w-3"
                style={{ color: "var(--primary)" }}
              />{" "}
              executing steps · spec 88bd6538
            </div>
            {FUNC_STEPS.map((s, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep || phase !== "running";
              return (
                <motion.div
                  key={i}
                  animate={{
                    borderColor: isActive ? "var(--primary)" : "var(--border)",
                    background: isActive ? primary(8) : "transparent",
                  }}
                  className="rounded border px-3 py-2 flex items-center gap-3 text-xs"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className="font-mono text-[10px] w-12 px-1.5 py-0.5 rounded text-center"
                    style={{ background: primary(15), color: "var(--primary)" }}
                  >
                    {s.m}
                  </span>
                  <span className="flex-1 truncate">
                    #{i + 1} {s.n}
                  </span>
                  {isDone || isActive ? (
                    s.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">
                    {isDone || isActive ? `${s.ms}ms` : "—"}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {phase === "report" && (
          <motion.div
            key="rep"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--border)", background: primary(5) }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">
                  Functional run 1780283663066
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "color-mix(in oklab, #ef4444 18%, transparent)",
                    color: "#ef4444",
                  }}
                >
                  FAILED
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Source TEST_SPEC · Spec 88bd6538 · Region default
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 text-xs">
              {[
                ["Steps", "28"],
                ["Passed", "4"],
                ["Failed", "24"],
                ["Skipped", "0"],
                ["Pass %", "14%"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded border p-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="text-[9px] uppercase text-muted-foreground">
                    {k}
                  </div>
                  <div className="font-mono mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            <div
              className="rounded border p-3 text-[11px] space-y-1"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 text-muted-foreground uppercase tracking-wider text-[10px]">
                <Eye className="h-3 w-3" /> Step #7 timings
              </div>
              {[
                ["dns", "0ms"],
                ["connect", "44ms"],
                ["tls", "31ms"],
                ["send", "0ms"],
                ["ttfb", "84ms"],
                ["total", "131ms"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between font-mono">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div
                className="mt-2 pt-2 border-t text-red-500 flex items-center gap-1.5"
                style={{ borderColor: "var(--border)" }}
              >
                <XCircle className="h-3 w-3" /> expected HTTP status 2xx
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["HTML", "JSON", "JUnit", "Allure"].map((f) => (
                <button
                  key={f}
                  className="text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Download className="h-3 w-3" /> {f}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------- SECURITY stage ---------- */
const PROBES = [
  { n: "Missing Auth enforcement", tag: "API2:2023", sev: "HIGH", ok: false },
  {
    n: "Weak/forged token rejection",
    tag: "API2:2023",
    sev: "HIGH",
    ok: false,
  },
  { n: "SQL Injection probe", tag: "API8:2023", sev: "LOW", ok: false },
  { n: "NoSQL Injection probe", tag: "API8:2023", sev: "HIGH", ok: false },
  { n: "Rate-limit enforcement", tag: "API4:2023", sev: "MED", ok: false },
  { n: "HTTPS enforcement", tag: "API8:2023", sev: "MED", ok: false },
  { n: "Security headers", tag: "API8:2023", sev: "MED", ok: false },
  { n: "PII in response body", tag: "API3:2023", sev: "OK", ok: true },
  { n: "Broken Access (IDOR)", tag: "API1:2023", sev: "OK", ok: true },
  { n: "Vulnerable components", tag: "API8:2023", sev: "MED", ok: false },
];

const SecStage: React.FC<{ play: boolean }> = ({ play }) => {
  const [phase, setPhase] = useState<"select" | "running" | "report">("select");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!play) return;
    setPhase("select");
    setProgress(0);
    const t1 = setTimeout(() => setPhase("running"), 1800);
    const t2 = setTimeout(() => setPhase("report"), 6800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [play]);

  useEffect(() => {
    if (phase !== "running") return;
    const iv = setInterval(
      () => setProgress((p) => (p >= PROBES.length ? p : p + 1)),
      300,
    );
    return () => clearInterval(iv);
  }, [phase]);

  const sevColor = (s: string) =>
    s === "HIGH"
      ? "#ef4444"
      : s === "MED"
        ? "#f59e0b"
        : s === "LOW"
          ? "#3b82f6"
          : "var(--primary)";

  return (
    <div className="relative h-full w-full p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
          <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            forgefuzz / owasp probe runner
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Pulse active={phase === "running"} />
          <span className="uppercase tracking-wider">{phase}</span>
        </div>
      </div>

      <div
        className="rounded border px-3 py-2 mb-4 font-mono text-xs flex items-center gap-2"
        style={{ borderColor: "var(--border)", background: primary(4) }}
      >
        <Crosshair
          className="h-3.5 w-3.5"
          style={{ color: "var(--primary)" }}
        />{" "}
        https://api.checkout.example.com/v1/orders
      </div>

      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div
            key="sel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Probes (10 / 16) · selecting
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PROBES.map((p, i) => (
                <motion.div
                  key={p.n}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded border px-2 py-1.5 text-[11px] flex items-center justify-between gap-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <CircleDot
                      className="h-2.5 w-2.5"
                      style={{ color: "var(--primary)" }}
                    />
                    {p.n}
                  </span>
                  <span className="font-mono text-[9px] opacity-60">
                    {p.tag}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "running" && (
          <motion.div
            key="run"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
              <span className="flex items-center gap-2">
                <Loader2
                  className="h-3 w-3 animate-spin"
                  style={{ color: "var(--primary)" }}
                />{" "}
                probing {progress} / {PROBES.length}
              </span>
              <span className="font-mono">
                {Math.round((progress / PROBES.length) * 100)}%
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: primary(8) }}
            >
              <motion.div
                animate={{ width: `${(progress / PROBES.length) * 100}%` }}
                transition={{ ease: "linear" }}
                className="h-full"
                style={{ background: "var(--primary)" }}
              />
            </div>
            <div className="space-y-1 mt-3 max-h-[280px] overflow-hidden">
              {PROBES.slice(0, progress).map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded border px-2 py-1.5 text-[11px] flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="flex items-center gap-2">
                    {p.ok ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <XCircle
                        className="h-3 w-3"
                        style={{ color: sevColor(p.sev) }}
                      />
                    )}
                    {p.n}
                  </span>
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      background: `color-mix(in oklab, ${sevColor(p.sev)} 15%, transparent)`,
                      color: sevColor(p.sev),
                    }}
                  >
                    {p.sev}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "report" && (
          <motion.div
            key="rep"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div
              className="rounded border p-3"
              style={{
                borderColor: "color-mix(in oklab, #ef4444 40%, transparent)",
                background: "color-mix(in oklab, #ef4444 8%, transparent)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-semibold">
                    Missing Auth enforcement
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">
                  HIGH · 266ms
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                No-auth request returned HTTP 200. Sensitive endpoint publicly
                readable.
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  className="text-[10px] px-2 py-1 rounded border flex items-center gap-1"
                  style={{
                    borderColor: "var(--primary)",
                    color: "var(--primary)",
                  }}
                >
                  <Bug className="h-3 w-3" /> Create bug
                </button>
                <button
                  className="text-[10px] px-2 py-1 rounded border flex items-center gap-1"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Bell className="h-3 w-3" /> Slack / Teams
                </button>
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              OWASP coverage
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[
                "API1",
                "API2",
                "API3",
                "API4",
                "API5",
                "API6",
                "API7",
                "API8",
                "API9",
                "API10",
              ].map((a, i) => {
                const failed = [1, 3, 4, 7].includes(i);
                return (
                  <div
                    key={a}
                    className="text-[9px] text-center py-1 rounded font-mono"
                    style={{
                      background: failed
                        ? "color-mix(in oklab, #ef4444 15%, transparent)"
                        : primary(10),
                      color: failed ? "#ef4444" : "var(--primary)",
                    }}
                  >
                    {a}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {["JSON", "CSV", "SARIF", "PDF"].map((f) => (
                <button
                  key={f}
                  className="text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Download className="h-3 w-3" /> {f}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------- HOW IT WORKS (new split-pane stepper) ---------- */
type StepDef = {
  id: string;
  icon: React.ElementType;
  label: string;
  short: string;
  body: string;
  bullets: string[];
  visual:
    | "import"
    | "configure"
    | "run"
    | "observe"
    | "gate"
    | "report"
    | "alert"
    | "schedule";
};

const WORKFLOW: StepDef[] = [
  {
    id: "import",
    icon: Upload,
    label: "Import any spec",
    short: "OpenAPI · Postman · cURL · HAR · Inline",
    body: "Bring your existing source of truth. Drop in an OpenAPI 3 file, a Postman collection, a cURL block from DevTools, an HAR capture, or paste raw JSON inline. The runner normalizes everything into a single ForgeFuzz spec — same schema, same engine.",
    bullets: [
      "Auto-detects format from file or pasted text",
      "Variables, auth, environments are preserved",
      "Diffs new versions against the previous spec",
      "Versioned per project, sharable across teams",
    ],
    visual: "import",
  },
  {
    id: "configure",
    icon: Settings2,
    label: "Pick a runner & shape the load",
    short: "Smoke · Load · Stress · Spike · Multi-region fan-out",
    body: "Choose Load, Functional, or Security. Tune concurrency, ramp-up, iterations, retries, per-request timeouts. Pick one or more of six regions for global fan-out — each region executes the same spec in parallel and reports independently.",
    bullets: [
      "4 load presets with sensible defaults",
      "6 regions: US, EU, Asia, AU",
      "Per-step timeout · request timeout · retry policy",
      "Fail-fast, schema validation, body capture toggles",
    ],
    visual: "configure",
  },
  {
    id: "run",
    icon: PlayCircle,
    label: "Background execution",
    short: "Async runs · live streaming · toast on done",
    body: "Runs execute on managed workers, not your laptop. Close the tab — the run continues. You get a toast (and optional webhook) when it completes. Live telemetry streams to the console while it runs: RPS, p95, errors, per-step assertions.",
    bullets: [
      "Workers in 6 regions, isolated per run",
      "Live metric stream over WebSocket",
      "Cancellable mid-run, with partial reports",
      "Cost-aware: pause / resume on long jobs",
    ],
    visual: "run",
  },
  {
    id: "observe",
    icon: GaugeCircle,
    label: "Per-step timings & assertions",
    short: "dns · connect · tls · send · ttfb · download",
    body: "Every request is broken down into network phases so you can pinpoint exactly where time is spent. Assertions (status, JSONPath, schema, headers, response time) run inline and fail with a precise diff against expected values.",
    bullets: [
      "Full timing breakdown per step",
      "JSONPath, schema, regex assertions",
      "Captured bodies stored for replay",
      "Step-level retry with backoff",
    ],
    visual: "observe",
  },
  {
    id: "gate",
    icon: Shield,
    label: "OWASP API:2023 probes",
    short: "15 built-in probes · severity scored",
    body: "Security scans cover OWASP API Top 10 (2023) — Broken Auth, IDOR, Rate limit, Injection (SQL / NoSQL / SSRF), PII leaks, weak headers, outdated TLS. Each finding carries severity, an evidence trail (request/response pair), and an auto-generated remediation hint.",
    bullets: [
      "15 probes, mapped to API1–API10",
      "AI-authored custom probes from a prompt",
      "Evidence preserved as raw req/res pairs",
      "Severity-weighted score per endpoint",
    ],
    visual: "gate",
  },
  {
    id: "report",
    icon: FileText,
    label: "Export anywhere",
    short: "HTML · JSON · JUnit · Allure · SARIF · PDF",
    body: "Every run produces a portable report. JUnit and Allure plug straight into CI dashboards. SARIF feeds GitHub Code Scanning. PDF and HTML are for stakeholders. JSON is for your own pipelines. Reports are immutable and shareable by URL.",
    bullets: [
      "6 export formats, one click",
      "Direct GitHub Code Scanning integration",
      "Compare any two runs side-by-side",
      "Immutable shareable URLs, ACL-aware",
    ],
    visual: "report",
  },
  {
    id: "alert",
    icon: BellRing,
    label: "Auto-create bugs & alerts",
    short: "Jira · Linear · GitHub · Slack · Teams · Webhooks",
    body: "A failed assertion or HIGH-sev finding can auto-open a ticket in Jira / Linear / GitHub with full reproduction steps and curl command. Slack and Teams notifications fire on threshold breach. Webhooks let you wire anything custom.",
    bullets: [
      "Issue tracker integrations with templates",
      "Reproduction cURL auto-attached",
      "Threshold-based alerting (p95, error %)",
      "Webhook signing for trusted delivery",
    ],
    visual: "alert",
  },
  {
    id: "schedule",
    icon: Repeat,
    label: "Schedule & monitor continuously",
    short: "Cron · every 15m / hourly / nightly",
    body: "Promote any spec into a recurring monitor. Cron-style or simple presets, per-region scheduling, time-zone aware. SLA monitors track p95 over rolling windows and page on regressions before customers notice.",
    bullets: [
      "Cron syntax or human presets",
      "Per-region, per-timezone scheduling",
      "Rolling SLA windows (1h / 24h / 7d)",
      "Pause / resume / one-off override",
    ],
    visual: "schedule",
  },
];

/* Visual previews — one micro-illustration per step, swapped on selection */
const StepVisual: React.FC<{ kind: StepDef["visual"] }> = ({ kind }) => {
  const Box = (children: React.ReactNode) => (
    <div
      className="relative h-full w-full rounded-xl border overflow-hidden p-4"
      style={{
        borderColor: primary(18),
        background: `linear-gradient(160deg, ${primary(6)}, ${primary(1)} 60%, transparent)`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full blur-3xl"
        style={{ background: primary(20) }}
      />
      {children}
    </div>
  );

  if (kind === "import")
    return Box(
      <div className="relative space-y-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Source inputs
        </div>
        {[
          "OpenAPI 3.json",
          "postman_collection.json",
          "curl-checkout.sh",
          "session.har",
          "inline-paste.txt",
        ].map((f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-2 rounded border px-2.5 py-1.5 text-[11px] font-mono"
            style={{ borderColor: "var(--border)" }}
          >
            <FileCode className="h-3 w-3" style={{ color: "var(--primary)" }} />{" "}
            {f}
            <span
              className="ml-auto text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: primary(15), color: "var(--primary)" }}
            >
              parsed
            </span>
          </motion.div>
        ))}
        <div className="text-[10px] text-muted-foreground pt-1">
          → normalized into{" "}
          <span className="font-mono" style={{ color: "var(--primary)" }}>
            forgefuzz.spec.json
          </span>
        </div>
      </div>,
    );

  if (kind === "configure")
    return Box(
      <div className="relative space-y-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Run shape
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Smoke", "Load", "Stress", "Spike"].map((p, i) => (
            <motion.span
              key={p}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="text-[10px] px-2 py-1 rounded-full border"
              style={{
                borderColor: i === 2 ? "var(--primary)" : "var(--border)",
                background: i === 2 ? primary(12) : "transparent",
                color: i === 2 ? "var(--primary)" : undefined,
              }}
            >
              {p}
            </motion.span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          {[
            ["VU", "220"],
            ["Dur", "60s"],
            ["Ramp", "5s"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded border px-2 py-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="text-muted-foreground">{k}</div>
              <div className="font-mono mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground pt-1">
          Regions
        </div>
        <div className="flex flex-wrap gap-1">
          {["us-c1", "us-e1", "eu-w1", "ap-s1", "ap-se1"].map((r, i) => (
            <motion.span
              key={r}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: primary(10), color: "var(--primary)" }}
            >
              {r}
            </motion.span>
          ))}
        </div>
      </div>,
    );

  if (kind === "run")
    return Box(
      <div className="relative space-y-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>worker pool</span>
          <span className="flex items-center gap-1.5">
            <Pulse /> live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.2 }}
              animate={{ opacity: [0.2, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 }}
              className="h-8 rounded"
              style={{
                background: primary(20),
                border: `1px solid ${primary(30)}`,
              }}
            />
          ))}
        </div>
        <div
          className="rounded border p-2 text-[10px] font-mono space-y-0.5"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <span style={{ color: "var(--primary)" }}>▸</span> worker-3 · 200 OK
            · 142ms
          </div>
          <div>
            <span style={{ color: "var(--primary)" }}>▸</span> worker-7 · 201 OK
            · 188ms
          </div>
          <div className="text-red-500">▸ worker-5 · 500 ERR · 1.2s</div>
        </div>
      </div>,
    );

  if (kind === "observe")
    return Box(
      <div className="relative space-y-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Step timings · GET /orders
        </div>
        {[
          ["dns", 12, 8],
          ["connect", 28, 18],
          ["tls", 41, 26],
          ["send", 4, 3],
          ["ttfb", 84, 54],
          ["download", 6, 4],
        ].map(([k, v, w], i) => (
          <motion.div
            key={k as string}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className="text-[10px]"
          >
            <div className="flex justify-between font-mono">
              <span className="text-muted-foreground">{k}</span>
              <span>{v as number}ms</span>
            </div>
            <div
              className="h-1 rounded mt-0.5"
              style={{ background: primary(8) }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${w as number}%` }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.6 }}
                className="h-full rounded"
                style={{ background: "var(--primary)" }}
              />
            </div>
          </motion.div>
        ))}
        <div className="pt-2 text-[10px] flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> assertion $.id
          matches /^ord_/
        </div>
      </div>,
    );

  if (kind === "gate")
    return Box(
      <div className="relative space-y-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          OWASP API:2023
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[
            "API1",
            "API2",
            "API3",
            "API4",
            "API5",
            "API6",
            "API7",
            "API8",
            "API9",
            "API10",
          ].map((a, i) => {
            const fail = [1, 3, 4].includes(i);
            return (
              <motion.div
                key={a}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="text-[9px] text-center py-1.5 rounded font-mono"
                style={{
                  background: fail
                    ? "color-mix(in oklab, #ef4444 18%, transparent)"
                    : primary(12),
                  color: fail ? "#ef4444" : "var(--primary)",
                }}
              >
                {a}
              </motion.div>
            );
          })}
        </div>
        <div
          className="rounded border p-2 text-[10px] mt-1"
          style={{
            borderColor: "color-mix(in oklab, #ef4444 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-1.5 text-red-500 font-semibold">
            <AlertTriangle className="h-3 w-3" /> 3 HIGH · 4 MEDIUM
          </div>
          <div className="text-muted-foreground mt-1">
            Top: Missing Auth enforcement on{" "}
            <span className="font-mono">/v1/orders</span>
          </div>
        </div>
      </div>,
    );

  if (kind === "report")
    return Box(
      <div className="relative space-y-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Exports
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {["HTML", "JSON", "JUnit", "Allure", "SARIF", "PDF"].map((f, i) => (
            <motion.div
              key={f}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="rounded border px-2 py-2 text-[10px] flex items-center gap-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              <Download
                className="h-3 w-3"
                style={{ color: "var(--primary)" }}
              />{" "}
              {f}
            </motion.div>
          ))}
        </div>
        <div
          className="rounded border p-2 text-[10px] font-mono mt-1"
          style={{ borderColor: "var(--border)", background: primary(4) }}
        >
          forge.sh/r/1780148880161.sarif
        </div>
      </div>,
    );

  if (kind === "alert")
    return Box(
      <div className="relative space-y-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Notifications
        </div>
        {[
          { ic: Bug, t: "Jira QA-4821 created · 3 HIGH", c: "var(--primary)" },
          { ic: Bell, t: "Slack #api-alerts pinged", c: "var(--primary)" },
          {
            ic: GitCompare,
            t: "GitHub issue #142 opened",
            c: "var(--primary)",
          },
        ].map((n, i) => (
          <motion.div
            key={n.t}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="rounded border px-2 py-1.5 text-[11px] flex items-center gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            <n.ic className="h-3 w-3" style={{ color: n.c }} /> {n.t}
          </motion.div>
        ))}
        <div
          className="rounded border p-2 text-[10px] font-mono mt-1"
          style={{ borderColor: "var(--border)", background: primary(4) }}
        >
          curl -X POST https://api.example.com/v1/orders
          <br /> -H "Content-Type: application/json"
        </div>
      </div>,
    );

  return Box(
    <div className="relative space-y-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Schedule
      </div>
      <div
        className="rounded border p-2 text-[11px]"
        style={{ borderColor: "var(--primary)", background: primary(8) }}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" style={{ color: "var(--primary)" }} />{" "}
          Nightly checkout SLA
        </div>
        <div className="font-mono text-[10px] mt-1">cron: 0 */30 * * * *</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.04, type: "spring", damping: 12 }}
            className="h-8 rounded origin-bottom"
            style={{
              background: i === 9 || i === 12 ? "#ef4444" : primary(20),
            }}
          />
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground flex justify-between">
        <span>last 14 runs</span>
        <span>2 SLA breaches</span>
      </div>
    </div>,
  );
};

const HowItWorks: React.FC = () => {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState(0);
  const active = hover ?? pinned;
  const step = WORKFLOW[active];

  return (
    <section className="relative py-24 px-6">
      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-2xl mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] uppercase tracking-[0.18em] mb-4"
            style={{
              borderColor: primary(20),
              color: "var(--primary)",
              background: primary(6),
            }}
          >
            <Workflow className="h-3 w-3" /> How it works
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            From spec to scheduled monitor — in 8 deliberate moves
          </h2>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Hover or tap a step to inspect what the runner is doing under the
            hood. The right panel rewrites itself in place — full English, no
            fluff.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-10">
          {/* Left rail: numbered stepper */}
          <div className="relative">
            {/* spine */}
            <div
              className="absolute left-[19px] top-2 bottom-2 w-px"
              style={{
                background: `linear-gradient(180deg, ${primary(30)}, ${primary(4)})`,
              }}
            />
            <div
              className="absolute left-[19px] top-2 w-px transition-all duration-500"
              style={{
                height: `${((active + 1) / WORKFLOW.length) * 100}%`,
                background: "var(--primary)",
                boxShadow: `0 0 12px ${primary(60)}`,
              }}
            />

            <ul className="space-y-1.5">
              {WORKFLOW.map((s, i) => {
                const isActive = i === active;
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setPinned(i)}
                      className="w-full text-left rounded-xl px-3 py-3 transition-all flex items-center gap-3 group"
                      style={{
                        background: isActive
                          ? `linear-gradient(90deg, ${primary(10)}, transparent)`
                          : "transparent",
                      }}
                    >
                      <span
                        className="relative z-10 h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-mono transition-all"
                        style={{
                          background: isActive ? "var(--primary)" : primary(8),
                          color: isActive
                            ? "var(--primary-foreground)"
                            : "var(--primary)",
                          border: `1px solid ${isActive ? "var(--primary)" : primary(20)}`,
                          boxShadow: isActive
                            ? `0 0 0 4px ${primary(15)}, 0 8px 24px -12px ${primary(60)}`
                            : "none",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono opacity-50">
                            0{i + 1}
                          </span>
                          <span
                            className={`text-sm font-semibold ${isActive ? "" : "text-foreground/80"}`}
                          >
                            {s.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {s.short}
                        </div>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 transition-all"
                        style={{
                          color: isActive ? "var(--primary)" : "transparent",
                          transform: isActive
                            ? "translateX(0)"
                            : "translateX(-6px)",
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right sticky panel */}
          <div className="lg:sticky lg:top-24 self-start">
            <div
              className="relative rounded-2xl border overflow-hidden"
              style={{
                borderColor: primary(20),
                background: `linear-gradient(160deg, ${primary(6)}, transparent 60%)`,
                boxShadow: `0 30px 80px -50px ${primary(40)}, 0 0 0 1px ${primary(8)} inset`,
                minHeight: 540,
              }}
            >
              <div
                className="absolute -top-20 -right-16 h-56 w-56 rounded-full blur-3xl pointer-events-none"
                style={{ background: primary(20) }}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative p-6 sm:p-8 flex flex-col gap-5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-mono uppercase tracking-[0.2em]"
                      style={{ color: "var(--primary)" }}
                    >
                      Step 0{active + 1} / 0{WORKFLOW.length}
                    </span>
                    <span
                      className="h-px flex-1"
                      style={{ background: primary(20) }}
                    />
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {step.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.short}
                    </p>
                  </div>

                  <div className="h-[200px]">
                    <StepVisual kind={step.visual} />
                  </div>

                  <p className="text-sm leading-relaxed text-foreground/90">
                    {step.body}
                  </p>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                    {step.bullets.map((b, i) => (
                      <motion.li
                        key={b}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex items-start gap-2 rounded-lg border px-2.5 py-2"
                        style={{
                          borderColor: primary(12),
                          background: primary(3),
                        }}
                      >
                        <CheckCircle2
                          className="h-3.5 w-3.5 mt-0.5 shrink-0"
                          style={{ color: "var(--primary)" }}
                        />
                        <span className="text-muted-foreground">{b}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>

              {/* Footer pager dots */}
              <div
                className="relative border-t flex items-center justify-between px-6 py-3"
                style={{ borderColor: primary(10) }}
              >
                <div className="flex gap-1.5">
                  {WORKFLOW.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPinned(i)}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: i === active ? 24 : 8,
                        background:
                          i === active ? "var(--primary)" : primary(15),
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Pulse /> click to pin · hover to preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Page ---------- */
export const TestingSuitePage = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState<TabId>("load");
  const [autoPlay, setAutoPlay] = useState(true);
  const primaryProbeRef = useRef<HTMLSpanElement>(null);
  const primaryForegroundProbeRef = useRef<HTMLSpanElement>(null);
  const [resolvedPrimary, setResolvedPrimary] = useState("rgb(99, 102, 241)");
  const [resolvedPrimaryForeground, setResolvedPrimaryForeground] =
    useState("rgb(255, 255, 255)");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = primaryProbeRef.current
      ? window.getComputedStyle(primaryProbeRef.current).color
      : "";
    const pf = primaryForegroundProbeRef.current
      ? window.getComputedStyle(primaryForegroundProbeRef.current).color
      : "";
    if (p) setResolvedPrimary(p);
    if (pf) setResolvedPrimaryForeground(pf);
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const iv = setInterval(() => {
      setActive((cur) => {
        const idx = TABS.findIndex((t) => t.id === cur);
        return TABS[(idx + 1) % TABS.length].id;
      });
    }, TAB_ADVANCE_MS);
    return () => clearInterval(iv);
  }, [autoPlay]);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        ["--primary" as string]: resolvedPrimary,
        ["--primary-foreground" as string]: resolvedPrimaryForeground,
      }}
    >
      <span
        ref={primaryProbeRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0 text-primary"
      >
        .
      </span>
      <span
        ref={primaryForegroundProbeRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0 bg-primary text-primary-foreground"
      >
        .
      </span>
      <LandingNavbar />

      {/* HERO */}
      <section className="relative pt-32 pb-12 px-6">
        <GridBackdrop />
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs mb-6"
              style={{
                borderColor: primary(22),
                boxShadow: `0 0 18px -8px ${primary(20)}`,
              }}
            >
              <Pulse />
              <Activity
                className="h-3.5 w-3.5"
                style={{ color: "var(--primary)" }}
              />
              <span
                className="uppercase tracking-[0.18em] font-semibold"
                style={{ color: "var(--primary)" }}
              >
                Unified Testing Console
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              One console for{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(90deg, var(--primary), color-mix(in oklab, var(--primary) 60%, white))`,
                }}
              >
                load
              </span>
              ,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(90deg, var(--primary), color-mix(in oklab, var(--primary) 55%, white))`,
                }}
              >
                functional
              </span>{" "}
              &{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(90deg, var(--primary), color-mix(in oklab, var(--primary) 50%, white))`,
                }}
              >
                security
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-2xl">
              Spin up SLA stress runs, regression suites, and OWASP-mapped
              probes from the same spec. Background execution, schedulable, with
              HTML / JSON / JUnit / SARIF exports.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { l: "3 runners", s: "load · func · sec" },
                { l: "15 OWASP probes", s: "API:2023 mapped" },
                { l: "6 regions", s: "multi-region fan-out" },
                { l: "4 exports", s: "HTML · JSON · JUnit · SARIF" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="px-3 py-2 rounded-lg border text-xs"
                  style={{
                    borderColor: primary(14),
                    background: `linear-gradient(135deg, ${primary(5)}, transparent)`,
                  }}
                >
                  <div
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {s.l}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {s.s}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* DEMO CONSOLE */}
      <section className="relative pb-20 p-10">
        <div className="relative max-w-8xl mx-auto px-20">
          <div
            className="relative rounded-2xl border overflow-hidden backdrop-blur-sm"
            style={{
              borderColor: primary(16),
              background: `linear-gradient(180deg, ${primary(5)}, ${primary(2)} 50%, transparent)`,
              boxShadow: `0 30px 90px -50px ${primary(35)}, 0 0 0 1px ${primary(8)} inset`,
            }}
          >
            <div
              className="pointer-events-none absolute -top-24 left-1 h-48 w-[40%] rounded-full blur-3xl"
              style={{ background: primary(18) }}
            />
            <div className="relative grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[640px]">
              <aside
                className="border-r p-4 relative"
                style={{
                  borderColor: primary(10),
                  background: `linear-gradient(180deg, ${primary(4)}, ${primary(2)})`,
                }}
              >
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Testing
                  </div>
                  <button
                    onClick={() => setAutoPlay((v) => !v)}
                    className="text-[10px] px-2 py-1 rounded border flex items-center gap-1.5"
                    style={{
                      borderColor: autoPlay
                        ? "var(--primary)"
                        : "var(--border)",
                      color: autoPlay ? "var(--primary)" : undefined,
                    }}
                  >
                    {autoPlay ? (
                      <>
                        <Pulse /> Auto
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3" /> Paused
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const isActive = t.id === active;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActive(t.id);
                          setAutoPlay(false);
                        }}
                        className="w-full text-left rounded-lg px-3 py-2.5 transition-all relative overflow-hidden group"
                        style={{
                          background: isActive
                            ? `linear-gradient(135deg, ${primary(14)}, ${primary(4)})`
                            : "transparent",
                          border: `1px solid ${isActive ? primary(30) : primary(8)}`,
                          boxShadow: isActive
                            ? `0 8px 24px -16px ${primary(40)}`
                            : "none",
                        }}
                      >
                        {isActive && autoPlay && (
                          <motion.div
                            key={t.id + "-bar"}
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{
                              duration: TAB_ADVANCE_MS / 1000,
                              ease: "linear",
                            }}
                            className="absolute bottom-0 left-0 h-0.5"
                            style={{ background: "var(--primary)" }}
                          />
                        )}
                        <div className="flex items-center gap-3">
                          <span
                            className="h-8 w-8 rounded-lg flex items-center justify-center"
                            style={{
                              background: isActive ? primary(20) : primary(8),
                              color: isActive
                                ? "var(--primary)"
                                : "var(--muted-foreground)",
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium flex items-center gap-1.5">
                              {t.label}
                              {isActive && <ChevronRight className="h-3 w-3" />}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {t.sub}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div
                  className="mt-6 rounded-lg border p-3 text-[10px]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="uppercase tracking-wider text-muted-foreground mb-2">
                    Run sources
                  </div>
                  <div className="space-y-1">
                    {["OpenAPI", "Postman", "cURL", "HAR", "Inline"].map(
                      (s) => (
                        <div key={s} className="flex items-center gap-1.5">
                          <CheckCircle2
                            className="h-3 w-3"
                            style={{ color: "var(--primary)" }}
                          />
                          {s}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </aside>

              <div className="relative min-h-[600px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="h-full"
                  >
                    {active === "load" && (
                      <LoadStage play={autoPlay || active === "load"} />
                    )}
                    {active === "functional" && (
                      <FuncStage play={autoPlay || active === "functional"} />
                    )}
                    {active === "security" && (
                      <SecStage play={autoPlay || active === "security"} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Tab descriptors */}
          <div className="grid md:grid-cols-3 gap-4 mt-18">
            {[
              {
                id: "load",
                icon: TrendingUp,
                title: "Load & SLA stress",
                pts: [
                  "OpenAPI · Postman · Inline sources",
                  "Smoke / Load / Stress / Spike presets",
                  "Background runs · toast on complete",
                  "HTML · JSON · JUnit exports + diff",
                  "Schedule cron · 15m / hourly / custom",
                ],
              },
              {
                id: "functional",
                icon: Workflow,
                title: "Functional regression",
                pts: [
                  "Multi-region fan-out (6 regions)",
                  "Per-step timings: dns / tls / ttfb",
                  "Pre/post scripts + CSV data files",
                  "Schema validation · capture bodies",
                  "HTML · JSON · JUnit · Allure exports",
                ],
              },
              {
                id: "security",
                icon: Shield,
                title: "OWASP security scan",
                pts: [
                  "15 OWASP API:2023 probes built-in",
                  "AI custom probe via natural language",
                  "Severity: HIGH · MEDIUM · LOW",
                  "One-click bug create + Slack notify",
                  "JSON · CSV · SARIF · PDF reports",
                ],
              },
            ].map((c, cardIdx) => {
              const Icon = c.icon;
              const isActive = c.id === active;
              return (
                <motion.div
                  key={c.id}
                  onClick={() => {
                    setActive(c.id as TabId);
                    setAutoPlay(false);
                  }}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.6,
                    delay: cardIdx * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -3 }}
                  className="cursor-pointer rounded-xl border p-5 relative overflow-hidden"
                  style={{
                    borderColor: isActive ? primary(28) : primary(10),
                    background: isActive
                      ? `linear-gradient(150deg, ${primary(8)}, ${primary(2)})`
                      : `linear-gradient(150deg, ${primary(3)}, transparent)`,
                    boxShadow: isActive
                      ? `0 18px 50px -28px ${primary(35)}`
                      : `0 8px 24px -22px ${primary(15)}`,
                    transition:
                      "background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease",
                  }}
                >
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8 }}
                      className="absolute -top-16 -right-10 h-40 w-40 rounded-full blur-3xl pointer-events-none"
                      style={{ background: primary(18) }}
                    />
                  )}
                  <div className="relative flex items-center gap-3 mb-3">
                    <span
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${primary(16)}, ${primary(5)})`,
                        color: "var(--primary)",
                        boxShadow: `0 4px 12px -8px ${primary(25)}`,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="font-semibold">{c.title}</h3>
                  </div>
                  <ul className="relative space-y-1.5 text-xs text-muted-foreground">
                    {c.pts.map((p, i) => (
                      <motion.li
                        key={p}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-20px" }}
                        transition={{
                          duration: 0.5,
                          delay: cardIdx * 0.12 + 0.25 + i * 0.12,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex items-start gap-2"
                      >
                        <GiCheckMark
                          className="h-3 w-3 mt-0.5 shrink-0"
                          style={{ color: "var(--primary)" }}
                        />
                        {p}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — split-pane stepper */}
      <HowItWorks />

      {/* CTA */}
      <section className="relative pb-24 px-6">
        <div className="relative max-w-7xl mx-auto">
          <div
            className="relative rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden"
            style={{
              borderColor: primary(16),
              background: `linear-gradient(120deg, ${primary(10)}, ${primary(3)} 60%, transparent)`,
              boxShadow: `0 20px 60px -40px ${primary(30)}`,
            }}
          >
            <div
              className="pointer-events-none absolute -top-20 -right-10 h-64 w-64 rounded-full blur-3xl"
              style={{ background: primary(16) }}
            />
            <div className="relative">
              <h3 className="text-xl sm:text-2xl font-semibold">
                One spec.{" "}
                <span style={{ color: "var(--primary)" }}>Three runners.</span>{" "}
                Zero setup.
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Import once. Run load, functional and security from the same
                source.
              </p>
            </div>
            <button
              onClick={() => navigate("/projects/collections")}
              className="relative inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-[1.03]"
              style={{
                background: `linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 70%, white))`,
                color: "var(--primary-foreground)",
                boxShadow: `0 10px 30px -14px ${primary(45)}`,
              }}
            >
              Launch Testing Console <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default TestingSuitePage;
