/**
 * MarketplacePage – `/api-hub`
 *
 * Main container with two tabs:
 * - APIs Hub  (renders PublicApisHub)
 * - AI Agents (renders PublicAiAgents)
 *
 * Hero is a split layout:
 *  - LEFT  : tab pills + dynamic headline / copy / CTAs / stats
 *  - RIGHT : tab-aware animated visual (API list / orbiting agent logos)
 * Both tabs auto-rotate every 4s. Carousel dots include a play/pause toggle.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Compass,
  Bot,
  Search,
  Globe,
  Code2,
  Sparkles,
  Workflow,
  Brain,
  MessageSquare,
  ArrowRight,
  Download,
  Pause,
  Play,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/utils/cn";
import { PublicApisHub } from "./PublicApisHub";
import { PublicAiAgents } from "./PublicAiAgents";

export const MarketplacePage = () => {
  // ── URL-synced tab state
  const [params, setParams] = useSearchParams();
  const urlTab = params.get("tab");
  const initial: "apis" | "agents" = urlTab === "agents" ? "agents" : "apis";
  const [activeTab, setActiveTab] = useState<"apis" | "agents">(initial);

  useEffect(() => {
    if (urlTab === "agents" && activeTab !== "agents") setActiveTab("agents");
    else if (urlTab !== "agents" && urlTab !== null && activeTab !== "apis")
      setActiveTab("apis");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const writeTabToUrl = (next: "apis" | "agents") => {
    const sp = new URLSearchParams(params);
    sp.set("tab", next);
    setParams(sp, { replace: true });
  };

  const switchTab = (next: "apis" | "agents") => {
    setActiveTab(next);
    writeTabToUrl(next);
  };

  // ── Auto-rotate carousel (pausable)
  const [isPlaying, setIsPlaying] = useState(false);
  const tickRef = useRef(0);
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setActiveTab((t) => {
        const next = t === "apis" ? "agents" : "apis";
        writeTabToUrl(next);
        return next;
      });
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, tickRef.current]);

  const handleDotClick = (next: "apis" | "agents") => {
    switchTab(next);
    tickRef.current += 1;
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Header – second code wala (sticky, gradient text) */}
      <header className="sticky top-0 z-20 flex h-17 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
        <Link
          to="/"
          data-testid="app-header-logo"
          className="flex items-center gap-1"
        >
          <Logo variant="mark" className="h-12 w-10" />
          <div className="text-left">
            <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
              ProbeStack
            </div>
            <div className="font-bold text-2xl tracking-normal leading-tight gradient-text">
              ForgeFuzz
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Hero with Tabs — split layout (first design) + second code's background */}
      <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent">
        {/* Grid pattern – exactly like second code */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            color: "var(--color-text-muted)",
            maskImage:
              "radial-gradient(ellipse at top, black 25%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at top, black 25%, transparent 70%)",
          }}
        />

        {/* Split hero content */}
        <div className="relative z-10 mx-auto max-w-8xl px-30 pt-14 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* LEFT — text + tabs */}
            <div className="space-y-7">
              {/* Toggle Buttons (pill style from second design) */}
              <div className="inline-flex rounded-full border border-border bg-surface/50 p-1">
                <button
                  onClick={() => handleDotClick("apis")}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                    activeTab === "apis"
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:bg-elevated hover:text-text-primary"
                  )}
                  data-testid="hub-tab-apis"
                >
                  <Compass className="inline h-4 w-4 mr-2 -mt-0.5" />
                  APIs Hub
                </button>
                <button
                  onClick={() => handleDotClick("agents")}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                    activeTab === "agents"
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:bg-elevated hover:text-text-primary"
                  )}
                  data-testid="hub-tab-agents"
                >
                  <Bot className="inline h-4 w-4 mr-2 -mt-0.5" />
                  AI Agents
                </button>
              </div>

              <div key={activeTab} className="animate-fade-in space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-elevated/70 backdrop-blur px-3 py-1 text-xs text-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {activeTab === "apis"
                    ? "2,400+ public APIs "
                    : "Public agents "}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                  {activeTab === "apis" ? (
                    <>
                      Browse the world's{" "}
                      <span className="bg-gradient-to-r from-primary via-primary to-text-primary bg-clip-text text-transparent">
                        public APIs
                      </span>
                    </>
                  ) : (
                    <>
                      Discover{" "}
                      <span className="bg-gradient-to-r from-primary via-primary to-text-primary bg-clip-text text-transparent">
                        AI Agents
                      </span>{" "}
                      for testing
                    </>
                  )}
                </h1>

                <p className="text-base md:text-lg text-text-secondary max-w-xl leading-relaxed">
                  {activeTab === "apis"
                    ? "Discover ForgeFuzz docs and 2,400+ free APIs. Search, read, and tap Try It to clone any API into your project as a runnable collection — no account needed to browse."
                    : "Browse public AI agents from multiple ecosystems, explore their capabilities, and import them into your project as ready-to-use collections for testing and integration."}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-white text-sm font-semibold hover:opacity-90 transition shadow-sm">
                    <Search className="h-4 w-4" />
                    {activeTab === "apis" ? "Browse APIs" : "Browse Agents"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated/70 backdrop-blur px-5 py-3 text-sm font-semibold hover:bg-elevated transition">
                    How import works
                  </button>
                </div>

                <div className="flex gap-8 pt-4">
                  <Stat
                    label={activeTab === "apis" ? "Public APIs" : "Agents"}
                    value={activeTab === "apis" ? "2.4k+" : "180+"}
                  />
                  <Stat
                    label="Providers"
                    value={activeTab === "apis" ? "640" : "32"}
                  />
                  <Stat label="One-click import" value="✓" />
                </div>

                {/* Carousel dots + play/pause */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    aria-label="Show APIs Hub"
                    onClick={() => handleDotClick("apis")}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      activeTab === "apis" ? "w-8 bg-primary" : "w-2 bg-border"
                    )}
                  />
                  <button
                    aria-label="Show AI Agents"
                    onClick={() => handleDotClick("agents")}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      activeTab === "agents" ? "w-8 bg-primary" : "w-2 bg-border"
                    )}
                  />
                  <button
                    aria-label={isPlaying ? "Pause auto-rotate" : "Resume auto-rotate"}
                    onClick={() => setIsPlaying((p) => !p)}
                    className="ml-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-elevated/70 backdrop-blur text-text-secondary hover:text-text-primary hover:bg-elevated transition"
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT — tab-aware visual */}
            <div className="relative  h-[450px]">
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  activeTab === "apis"
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3 pointer-events-none"
                )}
              >
                <ApisVisual />
              </div>
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  activeTab === "agents"
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3 pointer-events-none"
                )}
              >
                <AgentsVisual />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="relative z-10 px-6 py-20">
        {activeTab === "apis" ? <PublicApisHub /> : <PublicAiAgents />}
      </div>

      {/* Footer – second code wala */}
      <footer className="border-t border-border bg-surface/40 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-text-muted sm:flex-row">
          <span>Powered by ProbeStack · Public APIs</span>
          <Link
            to="/projects/home"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            data-testid="hub-footer-cta"
          >
            <Compass className="h-3 w-3" /> Publish your own API doc
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default MarketplacePage;

/* ───────── Local helpers ───────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}

function ApisVisual() {
  const apis = [
    { name: "Stripe", method: "POST", path: "/v1/charges" },
    { name: "GitHub", method: "GET", path: "/repos/{owner}/{repo}" },
    { name: "OpenAI", method: "POST", path: "/v1/chat/completions" },
    { name: "Twilio", method: "POST", path: "/Messages.json" },
  ];
  return (
    <div className="absolute inset-0">
      <div className="absolute top-10 left-20 w-[92%] rounded-2xl border border-border bg-surface backdrop-blur shadow-2xl p-4">
        <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-sm text-text-secondary">
          <Search className="h-4 w-4" />
          <span>Search 2,400+ APIs…</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-background border border-border">
            ⌘K
          </kbd>
        </div>
        <div className="mt-3 space-y-2">
          {apis.map((a, i) => (
            <div
              key={a.name}
              className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 hover:border-primary/50 hover:bg-background transition-all"
              style={{ animation: `fade-in 0.5s ease-out ${i * 0.08}s both` }}
            >
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                <Globe className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{a.name}</div>
                <div className="text-xs text-text-secondary font-mono truncate">
                  <span className="text-primary mr-1">{a.method}</span>
                  {a.path}
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">
                Try it
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 left-0 w-[78%] rounded-xl border border-border bg-surface backdrop-blur shadow-2xl p-3 flex items-center gap-3 animate-fade-in">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Code2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold">Imported to workspace</div>
          <div className="text-[11px] text-text-secondary">
            Stripe collection · 47 endpoints ready to test
          </div>
        </div>
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
      </div>
    </div>
  );
}

function AgentsVisual() {
  const orbitLogos = [
    { name: "OpenAI", url: "https://cdn.simpleicons.org/openai" },
    { name: "Anthropic", url: "https://cdn.simpleicons.org/anthropic" },
    { name: "Google Gemini", url: "https://cdn.simpleicons.org/googlegemini" },
    { name: "Mistral AI", url: "https://cdn.simpleicons.org/mistralai" },
    { name: "Hugging Face", url: "https://cdn.simpleicons.org/huggingface" },
    { name: "Perplexity", url: "https://cdn.simpleicons.org/perplexity" },
  ];

  const agents = [
    { name: "Schema Auditor", desc: "Validates OpenAPI specs", icon: Workflow },
    { name: "Fuzz Generator", desc: "Edge-case payloads", icon: Sparkles },
    { name: "Chat QA", desc: "Conversational test runs", icon: MessageSquare },
  ];

  return (
    <div className="absolute inset-0">
      <div className="absolute -top-20 left-60 w-[82%] aspect-square">
        <div className="absolute inset-0 rounded-full " />
        <div className="absolute inset-10 rounded-full " />
        <div className="absolute inset-20 rounded-full " />

        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary/40 text-white shadow-2xl ring-4 ring-primary/20">
            <Brain className="h-10 w-10" />
          </div>
        </div>

        {orbitLogos.map((logo, i) => {
          const dur = i % 2 === 0 ? "26s" : "20s";
          const dir = i % 2 === 0 ? "normal" : "reverse";
          const radiusInset = i < 3 ? "4%" : "16%";
          return (
            <div
              key={logo.name}
              className="absolute inset-0"
              style={{
                animation: `spin ${dur} linear infinite ${dir}`,
                animationDelay: `${i * -3}s`,
              }}
            >
              <div
                className="absolute"
                style={{ top: radiusInset, left: "50%", transform: "translateX(-50%)"}}
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-elevated border border-border shadow-lg">
                  <img
                    src={logo.url}
                    alt={logo.name}
                    className="h-6 w-6 dark:invert"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-0 -left-40 right-70 space-y-2">
        {agents.map((a, i) => (
          <div
            key={a.name}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface backdrop-blur p-3 shadow-lg hover:border-primary/50 transition"
            style={{ animation: `fade-in 0.5s ease-out ${i * 0.1}s both` }}
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <a.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{a.name}</div>
              <div className="text-xs text-text-secondary">{a.desc}</div>
            </div>
            <button className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold hover:bg-elevated transition">
              <Download className="h-3 w-3" />
              Import
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}